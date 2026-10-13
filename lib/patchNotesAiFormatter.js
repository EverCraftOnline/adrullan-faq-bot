/**
 * AI formatting for patch notes — single-call, two-pass, and batched modes.
 */

const fs = require('fs');
const path = require('path');
const monitor = require('./monitor');
const {
  mergeBatchDiscordOutputs,
  countNotes
} = require('./patchNotesMerge');

const EMBEDDED_GUIDE = `# Patch Notes Formatting Guide

## Core Rules:
1. Headline Case (Title Case) - capitalize major words, lowercase articles/conjunctions/prepositions
2. Brevity - keep concise, 5-15 words when possible
3. Punctuation - only exclamation marks for exciting content, no periods unless needed
4. Light humor only - keep professional
5. Categories in order: Content, Class, Systems, Interface, Crafting, Guilds, Bug Fixes
6. Class names alphabetical within Class section
7. Each change gets its own line, even if same class
8. HTML format: <div class="patch-header2">Category</div><div class="spacer-10"></div><div class="patch-note">- Note</div><div class="spacer-30"></div>`;

function loadFormattingGuide() {
  const possiblePaths = [
    path.join(__dirname, '..', 'PATCH_NOTES_FORMATTING_GUIDE.md')
  ];

  for (const guidePath of possiblePaths) {
    if (fs.existsSync(guidePath)) {
      return fs.readFileSync(guidePath, 'utf-8');
    }
  }

  return EMBEDDED_GUIDE;
}

function getConfig() {
  return {
    batchThreshold: Math.max(
      1,
      parseInt(process.env.PATCH_NOTES_BATCH_THRESHOLD || '150', 10) || 150
    ),
    batchSize: Math.max(
      10,
      parseInt(process.env.PATCH_NOTES_BATCH_SIZE || '50', 10) || 50
    ),
    batchConcurrency: Math.max(
      1,
      parseInt(process.env.PATCH_NOTES_BATCH_CONCURRENCY || '2', 10) || 2
    ),
    maxTokens: Math.min(
      64000,
      Math.max(4096, parseInt(process.env.PATCH_NOTES_MAX_TOKENS || '32000', 10) || 32000)
    ),
    legacySingleCall:
      process.env.PATCH_NOTES_LEGACY_SINGLE_CALL === '1' ||
      process.env.PATCH_NOTES_LEGACY_SINGLE_CALL === 'true',
    useAiHtml:
      process.env.PATCH_NOTES_AI_HTML === '1' ||
      process.env.PATCH_NOTES_AI_HTML === 'true'
  };
}

function shouldUseBatching(rawNotes, config = getConfig()) {
  return rawNotes.length >= config.batchThreshold;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function completeMessagesStream(anthropic, params) {
  const stream = anthropic.messages.stream(params);
  return stream.finalMessage();
}

function getMessageText(message) {
  if (!message?.content?.length) return '';
  const parts = [];
  for (const block of message.content) {
    if (block.type === 'text' && block.text) parts.push(block.text);
  }
  return parts.join('');
}

function parseAIResponse(response, version, options = {}) {
  const required = options.required;

  let jsonText =
    typeof response === 'string'
      ? response
      : response.content?.find((b) => b.type === 'text')?.text ?? '';
  jsonText = jsonText.trim();
  jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  const openBraces = (jsonText.match(/\{/g) || []).length;
  const closeBraces = (jsonText.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    const missingBraces = openBraces - closeBraces;
    throw new Error(
      `AI response contains incomplete JSON (missing ${missingBraces} closing brace${missingBraces > 1 ? 's' : ''}). The response may have been truncated. Try increasing max_tokens or reducing the input size.`
    );
  }

  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    if (jsonText.includes('{') || jsonText.includes('discord') || jsonText.includes('html')) {
      throw new Error(
        'AI response appears to contain JSON but it is incomplete or malformed. The response may have been truncated. Try increasing max_tokens or reducing the input size.'
      );
    }
    throw new Error('AI response did not contain valid JSON. The response may not be in the expected format.');
  }

  let formatted;
  try {
    formatted = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    if (parseError.message.includes('Unexpected end') || parseError.message.includes('end of JSON')) {
      throw new Error(
        `AI response contains incomplete JSON (parse error: ${parseError.message}). The response may have been truncated. Try increasing max_tokens or reducing the input size.`
      );
    }
    throw new Error(`Failed to parse JSON: ${parseError.message}. Response may be malformed.`);
  }

  if (required === 'discord') {
    if (!formatted.discord || !String(formatted.discord).trim()) {
      throw new Error('AI response JSON is missing a non-empty "discord" field.');
    }
  } else if (required === 'html') {
    if (!formatted.html || !String(formatted.html).trim()) {
      throw new Error('AI response JSON is missing a non-empty "html" field.');
    }
  } else if (!formatted.discord && !formatted.html) {
    throw new Error('AI response JSON is missing required fields (discord, html). The response may be incomplete.');
  }

  return {
    version,
    discord: formatted.discord || '',
    html: formatted.html || ''
  };
}

function createAnthropicClient() {
  const Anthropic = require('@anthropic-ai/sdk');
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
}

function createStreamPatchNotesModel(anthropic, maxTokens) {
  return async function streamPatchNotesModel(body) {
    try {
      return await completeMessagesStream(anthropic, {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: maxTokens,
        ...body
      });
    } catch (error) {
      console.log('Trying fallback model name...');
      return await completeMessagesStream(anthropic, {
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        ...body
      });
    }
  };
}

function trackResponse(response) {
  if (response.stop_reason === 'max_tokens') {
    throw new Error(
      'AI response was truncated due to max_tokens limit. Consider increasing PATCH_NOTES_MAX_TOKENS or enabling batch processing.'
    );
  }
  if (response.usage) {
    monitor.trackAPIUsage(
      response.usage.input_tokens,
      response.usage.output_tokens,
      response.model
    );
  }
}

function buildRawNotesText(rawNotes, startIndex = 0) {
  return rawNotes
    .map((note, idx) => `${startIndex + idx + 1}. [${note.author}] ${note.content}`)
    .join('\n');
}

function buildDiscordBatchPrompt(rawNotes, version, formattingGuide, batchMeta) {
  const { batchIndex, batchCount, globalStartIndex } = batchMeta;
  const rawNotesText = buildRawNotesText(rawNotes, globalStartIndex);

  const batchContext =
    batchCount > 1
      ? `\nBATCH CONTEXT:\n- This is batch ${batchIndex} of ${batchCount}.\n- Format ONLY the numbered notes below.\n- Do not invent notes from other batches.\n- Use standard categories (Content, Class, Systems, Interface, Crafting, Guilds, Bug Fixes).\n`
      : '';

  return {
    system: `You are a patch notes formatter. Format Discord patch notes according to the formatting guide provided. Return ONLY valid JSON with one field: "discord" (Discord markdown format). Do not include "html".`,
    user: `Format these patch notes for version ${version} according to the formatting guide:
${batchContext}
${formattingGuide}

---

RAW PATCH NOTES:
${rawNotesText}

---

Return JSON with this exact structure (only the discord field):
{
  "discord": "**Category**\\n- Note 1\\n- Note 2\\n\\n**Next Category**\\n- Note 3"
}

Important:
- Use Headline Case throughout
- Keep notes brief and concise
- Categorize properly (Content, Class, Systems, Interface, Crafting, Guilds, Bug Fixes)
- Class names must be alphabetical in Class section (within this batch)
- Each change gets its own line
- Remove author names, timestamps, "reserve" text
- Fix typos (incomming -> Incoming, to high -> Too High)
- Discord format uses **bold** for category headers`
  };
}

async function formatDiscordBatch(rawNotes, version, formattingGuide, batchMeta, streamPatchNotesModel) {
  const prompt = buildDiscordBatchPrompt(rawNotes, version, formattingGuide, batchMeta);
  const response = await streamPatchNotesModel({
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }]
  });
  trackResponse(response);
  const parsed = parseAIResponse(getMessageText(response), version, { required: 'discord' });
  if (!parsed.discord.trim()) {
    throw new Error(`Batch ${batchMeta.batchIndex}/${batchMeta.batchCount} returned empty discord content.`);
  }
  return parsed.discord;
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

async function formatHtmlWithAI(discordText, version, formattingGuide, streamPatchNotesModel) {
  const userHtmlPrompt = `Use the HTML rules and examples from this formatting guide:

${formattingGuide}

---

FINAL_DISCORD_PATCH_NOTES (verbatim body to wrap in HTML):

<<<DISCORD
${discordText}
DISCORD>>>

---

Return JSON with this exact structure (only the html field):
{
  "html": "<div class='patch-header2'>Category</div><div class='spacer-10'></div><div class='patch-note'>- Note 1</div><div class='patch-note'>- Note 2</div><div class='spacer-30'></div>"
}

Rules:
- Single quotes for every class attribute (class='patch-header2', class='patch-note', class='spacer-10', class='spacer-30')
- Each Discord bullet line (a line starting with "- ") becomes exactly one <div class='patch-note'>...</div> containing the same text
- Each **Category** section: <div class='patch-header2'>Category</div> then <div class='spacer-10'></div>, then the bullet divs for that section, then <div class='spacer-30'></div> before the next category
- Escape &, <, > in note text as HTML entities when needed for valid HTML`;

  const systemHtmlOnly = `You convert finalized Discord patch notes into Wix CMS HTML. Return ONLY valid JSON with one field: "html". Treat this as a mechanical layout task: preserve every category title and bullet line exactly as written (same words, same order). Do not merge, split, reorder, rephrase, or add/remove bullets. Category lines use **bold** in Discord—use the same words without asterisks inside the header div.`;

  const htmlPass = await streamPatchNotesModel({
    system: systemHtmlOnly,
    messages: [{ role: 'user', content: userHtmlPrompt }]
  });
  trackResponse(htmlPass);
  const htmlParsed = parseAIResponse(getMessageText(htmlPass), version, { required: 'html' });
  return htmlParsed.html || '';
}

async function formatSinglePass(rawNotes, version, formattingGuide, config, streamPatchNotesModel) {
  const rawNotesText = buildRawNotesText(rawNotes);

  if (config.legacySingleCall) {
    const systemPrompt = `You are a patch notes formatter. Format Discord patch notes according to the formatting guide provided. Return ONLY valid JSON with two fields: "discord" (Discord markdown format) and "html" (HTML div format for Wix CMS).`;
    const userPrompt = `Format these patch notes for version ${version} according to the formatting guide:

${formattingGuide}

---

RAW PATCH NOTES:
${rawNotesText}

---

Return JSON with this exact structure:
{
  "discord": "**Category**\\n- Note 1\\n- Note 2\\n\\n**Next Category**\\n- Note 3",
  "html": "<div class=\\"patch-header2\\">Category</div><div class=\\"spacer-10\\"></div><div class=\\"patch-note\\">- Note 1</div><div class=\\"patch-note\\">- Note 2</div><div class=\\"spacer-30\\"></div>"
}

Important:
- Use Headline Case throughout
- Keep notes brief and concise
- Categorize properly (Content, Class, Systems, Interface, Crafting, Guilds, Bug Fixes)
- Class names must be alphabetical in Class section
- Each change gets its own line
- Remove author names, timestamps, "reserve" text
- Fix typos (incomming -> Incoming, to high -> Too High)
- HTML must use single quotes for attributes (class='patch-header2')
- Discord format uses **bold** for category headers`;

    const response = await streamPatchNotesModel({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });
    trackResponse(response);
    return {
      ...(await parseAIResponse(getMessageText(response), version)),
      batchMeta: null
    };
  }

  const prompt = buildDiscordBatchPrompt(rawNotes, version, formattingGuide, {
    batchIndex: 1,
    batchCount: 1,
    globalStartIndex: 0
  });

  const discordPass = await streamPatchNotesModel({
    system: prompt.system,
    messages: [{ role: 'user', content: prompt.user }]
  });
  trackResponse(discordPass);
  const discordParsed = parseAIResponse(getMessageText(discordPass), version, { required: 'discord' });
  const discordText = discordParsed.discord;
  if (!discordText.trim()) {
    throw new Error('Discord formatting pass returned empty content.');
  }

  let html;
  if (config.useAiHtml) {
    html = await formatHtmlWithAI(discordText, version, formattingGuide, streamPatchNotesModel);
  } else {
    html = mergeBatchDiscordOutputs([discordText], { dedupe: false }).html;
  }

  return {
    version,
    discord: discordText,
    html,
    batchMeta: null
  };
}

async function formatBatched(rawNotes, version, formattingGuide, config, streamPatchNotesModel, onProgress) {
  const batches = chunkArray(rawNotes, config.batchSize);
  const batchCount = batches.length;

  if (onProgress) {
    await onProgress(`📦 Large patch detected — processing ${rawNotes.length} notes in ${batchCount} batch(es)...`);
  }

  const batchDiscordTexts = await runWithConcurrency(batches, config.batchConcurrency, async (batch, index) => {
    const batchIndex = index + 1;
    if (onProgress) {
      await onProgress(`🤖 Batch ${batchIndex}/${batchCount} formatting...`);
    }

    return formatDiscordBatch(
      batch,
      version,
      formattingGuide,
      {
        batchIndex,
        batchCount,
        globalStartIndex: index * config.batchSize
      },
      streamPatchNotesModel
    );
  });

  if (onProgress) {
    await onProgress(`🔗 Merging ${rawNotes.length} notes from ${batchCount} batch(es)...`);
  }

  const merged = mergeBatchDiscordOutputs(batchDiscordTexts);

  if (merged.mergedNoteCount === 0) {
    throw new Error('Merged batch output contains no formatted notes.');
  }

  const ratio = merged.mergedNoteCount / rawNotes.length;
  if (ratio < 0.5) {
    console.warn(
      `⚠️ Merged note count (${merged.mergedNoteCount}) is less than 50% of raw notes (${rawNotes.length}). Some notes may have been dropped.`
    );
    monitor.log('WARN', 'Patch notes batch merge low note ratio', {
      version,
      mergedNoteCount: merged.mergedNoteCount,
      rawNoteCount: rawNotes.length,
      ratio
    });
  }

  if (merged.removedCount > 0) {
    console.log(`Removed ${merged.removedCount} duplicate note(s) during merge.`);
  }

  return {
    version,
    discord: merged.discord,
    html: merged.html,
    categories: merged.categories,
    batchMeta: {
      batchCount,
      batchSize: config.batchSize,
      rawNoteCount: rawNotes.length,
      mergedNoteCount: merged.mergedNoteCount,
      removedDuplicates: merged.removedCount
    }
  };
}

/**
 * Format patch notes with AI — auto-batches when rawNotes.length >= threshold.
 * @param {Array} rawNotes
 * @param {string} version
 * @param {{ onProgress?: (message: string) => Promise<void> }} options
 */
async function formatPatchNotes(rawNotes, version, options = {}) {
  const onProgress = options.onProgress;
  const config = getConfig();
  const formattingGuide = loadFormattingGuide();
  const anthropic = createAnthropicClient();
  const streamPatchNotesModel = createStreamPatchNotesModel(anthropic, config.maxTokens);

  try {
    if (shouldUseBatching(rawNotes, config)) {
      return await formatBatched(
        rawNotes,
        version,
        formattingGuide,
        config,
        streamPatchNotesModel,
        onProgress
      );
    }

    return await formatSinglePass(
      rawNotes,
      version,
      formattingGuide,
      config,
      streamPatchNotesModel
    );
  } catch (error) {
    monitor.trackError(error, 'AI patch notes formatting error');
    console.error('AI formatting error:', error);
    return null;
  }
}

module.exports = {
  loadFormattingGuide,
  getConfig,
  shouldUseBatching,
  chunkArray,
  parseAIResponse,
  formatDiscordBatch,
  formatPatchNotes,
  mergeBatchDiscordOutputs,
  countNotes
};
