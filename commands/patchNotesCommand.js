const anthropicClient = require('../lib/anthropicClient');
const configLoader = require('../lib/configLoader');
const monitor = require('../lib/monitor');
const draftManager = require('../lib/patchNotesDraft');
const WixMediaUploader = require('../lib/wixMediaUploader');
const fs = require('fs');
const path = require('path');

const PATCH_NOTES_CHANNEL_ID = '988344623028137995';
const ENIGMAFACTORY_USER_ID = '146495555760160769'; // Use user ID instead of username
const BOT_USER_ID = '1394144920826023956'; // Senan bot - filter out its messages

module.exports = {
  async execute(message) {
    try {
      await message.channel.send('🔍 Processing patch notes...');
      
      // Fetch the patch notes channel
      const channel = await message.client.channels.fetch(PATCH_NOTES_CHANNEL_ID);
      if (!channel) {
        return message.reply('❌ Could not find patch notes channel.');
      }
      
      // Find the last version post by EnigmaFactory
      await message.channel.send('🔍 Searching for version post...');
      const versionPost = await findLastVersionPost(channel);
      if (!versionPost) {
        return message.reply(`❌ Could not find a version post by EnigmaFactory (User ID: ${ENIGMAFACTORY_USER_ID}). Make sure you've posted a version number (e.g., "0.10.43") in the channel.`);
      }
      
      await message.channel.send(`✅ Found version post: ${versionPost.content.substring(0, 50)}...`);
      
      // Extract version from the post
      const version = extractVersion(versionPost.content);
      if (!version) {
        return message.reply('❌ Could not extract version number from the post.');
      }
      
      await message.channel.send(`📋 Found version ${version}, collecting messages...`);
      
      // Fetch all messages after the version post
      const messages = await fetchMessagesAfter(channel, versionPost.id);
      
      if (messages.length === 0) {
        return message.reply('ℹ️ No new patch notes found after the last version post.');
      }
      
      // Check for -withimages flag
      const withImages = message.content.includes('-withimages') || message.content.includes('--with-images');
      
      // Prepare raw messages for AI formatting
      const rawNotes = [];
      const imagesToDownload = [];
      
      for (const msg of messages) {
        // Skip bot's own messages (Senan)
        if (msg.author.id === BOT_USER_ID) {
          continue;
        }
        
        // Skip commands (messages starting with !)
        const content = msg.content.trim();
        if (content.startsWith('!')) {
          continue;
        }
        
        // Skip version posts and "reserve" messages
        const contentLower = content.toLowerCase().trim();
        if (contentLower === 'reserve' || isVersionPost(content)) {
          continue;
        }
        
        // Skip empty messages
        if (!content && (!msg.attachments || msg.attachments.size === 0)) {
          continue;
        }
        
        // Collect note data
        const noteData = {
          author: msg.author.username,
          authorId: msg.author.id,
          content: content,
          timestamp: msg.createdTimestamp,
          messageId: msg.id,
          attachments: []
        };
        
        // Handle image attachments if flag is set
        if (withImages && msg.attachments && msg.attachments.size > 0) {
          for (const attachment of msg.attachments.values()) {
            // Only process images
            if (attachment.contentType && attachment.contentType.startsWith('image/')) {
              const imageData = {
                url: attachment.url,
                filename: attachment.name,
                contentType: attachment.contentType,
                size: attachment.size,
                width: attachment.width,
                height: attachment.height
              };
              
              noteData.attachments.push(imageData);
              imagesToDownload.push({
                ...imageData,
                messageId: msg.id,
                noteIndex: rawNotes.length
              });
            }
          }
        }
        
        rawNotes.push(noteData);
      }
      
      if (rawNotes.length === 0) {
        return message.reply('ℹ️ No patch notes found to format.');
      }
      
      // Check if draft already exists
      const existingDraft = draftManager.loadDraft(version);
      const isUpdate = existingDraft && existingDraft.status === 'draft';
      
      if (isUpdate) {
        await message.channel.send(`⚠️ Draft for ${version} already exists. Regenerating with all current messages...\n💡 **Note:** This will replace the draft. If you've made manual edits, they'll be overwritten.`);
      }
      
      // Download images if requested
      let downloadedImages = [];
      if (withImages && imagesToDownload.length > 0) {
        await message.channel.send(`📸 Downloading ${imagesToDownload.length} image(s)...`);
        downloadedImages = await downloadImages(imagesToDownload, version);
        
        // Upload to Wix if API keys are configured
        if (process.env.WIX_API_KEY && process.env.WIX_SITE_ID) {
          await message.channel.send(`☁️ Uploading images to Wix Media Manager...`);
          const wixResults = await uploadImagesToWix(downloadedImages, version);
          
          // Update downloaded images with Wix URLs
          for (let i = 0; i < downloadedImages.length; i++) {
            if (wixResults[i] && wixResults[i].success) {
              downloadedImages[i].wixUrl = wixResults[i].wixUrl;
              downloadedImages[i].wixFileId = wixResults[i].wixFileId;
              downloadedImages[i].uploadedToWix = new Date().toISOString();
            }
          }
          
          const successCount = wixResults.filter(r => r.success).length;
          await message.channel.send(`✅ Uploaded ${successCount}/${downloadedImages.length} image(s) to Wix`);
        }
      }
      
      // Format using AI (don't send image URLs to AI, just note content)
      await message.channel.send('🤖 Formatting patch notes with AI...');
      const notesForAI = rawNotes.map(note => ({
        author: note.author,
        content: note.content,
        timestamp: note.timestamp
      }));
      
      const formatted = await formatWithAI(notesForAI, version);
      
      if (!formatted) {
        return message.reply('❌ Failed to format patch notes. Check logs for details.');
      }
      
      // Parse formatted output into structured categories
      const categories = parseFormattedToCategories(formatted);
      
      // Create a mapping from raw note indices to formatted notes for better image matching
      // This helps us track which raw notes contributed to which formatted notes
      const rawNoteToFormattedNote = createRawToFormattedMapping(rawNotes, categories);
      
      // Store/update draft
      const draft = {
        version,
        categories,
        rawNotes, // Includes attachment metadata
        downloadedImages, // Local file paths
        rawNoteToFormattedNote, // Mapping for image matching
        discord: formatted.discord,
        html: formatted.html,
        generated: isUpdate ? existingDraft.generated : new Date().toISOString(),
        updated: new Date().toISOString(),
        status: 'draft',
        messageCount: rawNotes.length,
        imageCount: downloadedImages.length,
        withImages: withImages
      };
      
      draftManager.saveDraft(version, draft);
      
      // Get dashboard URL from config or env
      const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
      
      await message.reply(`✅ Patch notes ${isUpdate ? 'updated' : 'formatted and saved'} as draft!\n\n📝 **Edit & Review:** ${dashboardUrl}/dashboard/patchnotes/${version}\n\n📊 Processed ${rawNotes.length} message(s)\n⚠️ Review and edit before publishing!`);
      
      monitor.log('INFO', `Patch notes processed for version ${formatted.version}`, {
        messageCount: messages.length,
        aiFormatted: true
      });
      
    } catch (error) {
      monitor.trackError(error, 'Patch notes command error');
      await message.reply('❌ An error occurred while processing patch notes. Check logs for details.');
    }
  }
};

/**
 * Find the last version post by EnigmaFactory
 */
async function findLastVersionPost(channel) {
  let lastMessage = null;
  let found = null;
  
  // Fetch messages in batches
  while (!found) {
    const options = { limit: 100 };
    if (lastMessage) {
      options.before = lastMessage.id;
    }
    
    const messages = await channel.messages.fetch(options);
    
    if (messages.size === 0) break;
    
    // Look for version post by EnigmaFactory (by user ID)
    for (const [id, msg] of messages) {
      if (msg.author.id === ENIGMAFACTORY_USER_ID) {
        const content = msg.content.trim();
        // Check if it's a version post - look for version number anywhere in the message
        if (isVersionPost(content)) {
          found = msg;
          break;
        }
      }
      lastMessage = msg;
    }
    
    if (!found) {
      lastMessage = messages.last();
    }
  }
  
  return found;
}

/**
 * Extract version number from post content
 * Handles markdown formatting like "**0.10.43**"
 */
function extractVersion(content) {
  if (!content) return null;
  
  // Remove markdown formatting
  const cleaned = content.replace(/\*\*/g, '').replace(/#/g, '').trim();
  
  // Match patterns like "0.10.43", "Patch 0.10.43", "Version 0.10.43", etc.
  const match = cleaned.match(/(?:patch\s+|version\s+)?(\d+\.\d+\.\d+)/i);
  return match ? match[1] : null;
}

/**
 * Check if message is a version post
 * Matches patterns like "0.10.43", "Patch 0.10.43", "**0.10.43**", etc.
 */
function isVersionPost(content) {
  if (!content || !content.trim()) return false;
  
  // Remove markdown formatting
  const cleaned = content.replace(/\*\*/g, '').replace(/#/g, '').trim();
  
  // Match version patterns: "0.10.43", "Patch 0.10.43", "Version 0.10.43", etc.
  return /^(patch\s+|version\s+)?\d+\.\d+\.\d+/i.test(cleaned);
}

/**
 * Format patch notes using AI
 */
async function formatWithAI(rawNotes, version) {
  try {
    // Load formatting guide - try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'eco-web', 'PATCH_NOTES_FORMATTING_GUIDE.md'),
      path.join(__dirname, '..', '..', '..', 'eco-web', 'PATCH_NOTES_FORMATTING_GUIDE.md'),
      path.join(__dirname, '..', 'PATCH_NOTES_FORMATTING_GUIDE.md')
    ];
    
    let formattingGuide = '';
    for (const guidePath of possiblePaths) {
      if (fs.existsSync(guidePath)) {
        formattingGuide = fs.readFileSync(guidePath, 'utf-8');
        break;
      }
    }
    
    // Fallback: use embedded guide summary if file not found
    if (!formattingGuide) {
      formattingGuide = `# Patch Notes Formatting Guide

## Core Rules:
1. Headline Case (Title Case) - capitalize major words, lowercase articles/conjunctions/prepositions
2. Brevity - keep concise, 5-15 words when possible
3. Punctuation - only exclamation marks for exciting content, no periods unless needed
4. Light humor only - keep professional
5. Categories in order: Content, Class, Systems, Interface, Crafting, Guilds, Bug Fixes
6. Class names alphabetical within Class section
7. Each change gets its own line, even if same class
8. HTML format: <div class="patch-header2">Category</div><div class="spacer-10"></div><div class="patch-note">- Note</div><div class="spacer-30"></div>`;
    }
    
    // Prepare raw notes text
    const rawNotesText = rawNotes.map((note, idx) => {
      return `${idx + 1}. [${note.author}] ${note.content}`;
    }).join('\n');
    
    // System prompt for AI
    const systemPrompt = `You are a patch notes formatter. Format Discord patch notes according to the formatting guide provided. Return ONLY valid JSON with two fields: "discord" (Discord markdown format) and "html" (HTML div format for Wix CMS).`;
    
    // User prompt
    const userPrompt = `Format these patch notes for version ${version} according to the formatting guide:

${formattingGuide}

---

RAW PATCH NOTES:
${rawNotesText}

---

Return JSON with this exact structure:
{
  "discord": "**Category**\n- Note 1\n- Note 2\n\n**Next Category**\n- Note 3",
  "html": "<div class=\"patch-header2\">Category</div><div class=\"spacer-10\"></div><div class=\"patch-note\">- Note 1</div><div class=\"patch-note\">- Note 2</div><div class=\"spacer-30\"></div>"
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
    
    // Call AI directly with a known working model
    // The model name in anthropicClient might be outdated, so we'll call directly
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    // Use the newest active model: claude-sonnet-4-5-20250929
    // Fallback to claude-sonnet-4-20250514 if needed
    let response;
    try {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      });
    } catch (error) {
      // Try fallback model
      console.log('Trying fallback model name...');
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      });
    }
    
    // Track API usage
    if (response.usage) {
      monitor.trackAPIUsage(
        response.usage.input_tokens,
        response.usage.output_tokens,
        response.model
      );
    }
    
    return parseAIResponse(response.content[0].text, version);
    
  } catch (error) {
    monitor.trackError(error, 'AI patch notes formatting error');
    console.error('AI formatting error:', error);
    return null;
  }
}

/**
 * Parse AI response and extract formatted patch notes
 */
function parseAIResponse(response, version) {
  try {
    // Parse JSON from response
    // AI might wrap JSON in markdown code blocks
    let jsonText = typeof response === 'string' ? response : response.content[0].text;
    jsonText = jsonText.trim();
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }
    
    const formatted = JSON.parse(jsonMatch[0]);
    
    return {
      version,
      discord: formatted.discord,
      html: formatted.html
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Response was:', typeof response === 'string' ? response.substring(0, 500) : JSON.stringify(response).substring(0, 500));
    throw error;
  }
}

/**
 * Split Discord message if too long (2000 char limit)
 */
function splitDiscordMessage(text, maxLength = 1900) {
  const sections = text.split('\n\n');
  const messages = [];
  let currentMessage = '';
  
  for (const section of sections) {
    if (currentMessage.length + section.length + 2 > maxLength) {
      if (currentMessage) {
        messages.push(currentMessage.trim());
        currentMessage = '';
      }
      
      // If single section is too long, split it
      if (section.length > maxLength) {
        const lines = section.split('\n');
        let currentChunk = '';
        
        for (const line of lines) {
          if (currentChunk.length + line.length + 1 > maxLength) {
            if (currentChunk) {
              messages.push(currentChunk.trim());
              currentChunk = '';
            }
          }
          currentChunk += (currentChunk ? '\n' : '') + line;
        }
        
        if (currentChunk) {
          currentMessage = currentChunk;
        }
      } else {
        currentMessage = section;
      }
    } else {
      currentMessage += (currentMessage ? '\n\n' : '') + section;
    }
  }
  
  if (currentMessage) {
    messages.push(currentMessage.trim());
  }
  
  return messages;
}

/**
 * Fetch all messages after a given message ID
 */
async function fetchMessagesAfter(channel, afterId) {
  const messages = [];
  
  // First, fetch the version post to get its timestamp
  const versionPost = await channel.messages.fetch(afterId);
  if (!versionPost) {
    return [];
  }
  
  const versionTimestamp = versionPost.createdTimestamp;
  
  // Fetch messages starting from newest
  // We'll collect all messages newer than the version post
  let lastMessage = null;
  let foundVersionPost = false;
  
  while (true) {
    const options = { limit: 100 };
    if (lastMessage) {
      options.before = lastMessage.id;
    }
    
    const batch = await channel.messages.fetch(options);
    
    if (batch.size === 0) break;
    
    // Process messages (newest to oldest in batch)
    for (const [id, msg] of batch) {
      // Check if this is the version post
      if (msg.id === afterId) {
        foundVersionPost = true;
        // Don't include the version post itself
        continue;
      }
      
      // If message is newer than version post, collect it
      if (msg.createdTimestamp > versionTimestamp) {
        messages.push(msg);
      }
      
      // If we've found the version post and gone past it, we're done
      if (foundVersionPost && msg.createdTimestamp <= versionTimestamp) {
        break;
      }
    }
    
    // If we found the version post, we're done collecting
    if (foundVersionPost) {
      break;
    }
    
    // Continue fetching older messages
    lastMessage = batch.last();
    if (!lastMessage) break;
  }
  
  // Reverse to get chronological order (oldest first)
  return messages.reverse();
}

/**
 * Download images from Discord attachments
 * Uses Discord attachment ID as filename for consistency
 */
async function downloadImages(imagesToDownload, version) {
  const https = require('https');
  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  
  const imagesDir = path.join(__dirname, '..', 'data', 'patch-notes-images', version);
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  const downloaded = [];
  
  for (const image of imagesToDownload) {
    try {
      // Extract attachment ID from Discord CDN URL
      // URL format: https://cdn.discordapp.com/attachments/{channel_id}/{attachment_id}/{filename}?{query}
      const urlMatch = image.url.match(/\/attachments\/\d+\/(\d+)\//);
      const attachmentId = urlMatch ? urlMatch[1] : image.messageId;
      
      // Use attachment ID as filename (Discord CDN URLs are immutable)
      const ext = path.extname(image.filename) || '.png';
      const filename = `${attachmentId}${ext}`;
      const filepath = path.join(imagesDir, filename);
      
      // Skip if file already exists (already downloaded)
      if (fs.existsSync(filepath)) {
        console.log(`Image ${filename} already exists, skipping download`);
        downloaded.push({
          originalUrl: image.url,
          localPath: `patch-notes-images/${version}/${filename}`,
          filename: filename,
          messageId: image.messageId,
          attachmentId: attachmentId,
          noteIndex: image.noteIndex,
          width: image.width,
          height: image.height,
          skipped: true
        });
        continue;
      }
      
      // Download image
      const protocol = image.url.startsWith('https') ? https : http;
      
      await new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        protocol.get(image.url, (response) => {
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(filepath, () => {}); // Delete file on error
          reject(err);
        });
      });
      
      downloaded.push({
        originalUrl: image.url,
        localPath: `patch-notes-images/${version}/${filename}`,
        filename: filename,
        messageId: image.messageId,
        attachmentId: attachmentId,
        noteIndex: image.noteIndex,
        width: image.width,
        height: image.height
      });
    } catch (error) {
      console.error(`Failed to download image ${image.filename}:`, error);
      // Continue with other images
    }
  }
  
  return downloaded;
}

/**
 * Create mapping from raw note indices to formatted notes
 * This helps match images to the correct formatted notes
 * Exported so it can be used by draft manager
 */
function createRawToFormattedMapping(rawNotes, categories) {
  const mapping = {};
  const usedRawIndices = new Set(); // Track which raw notes have been mapped
  const usedFormattedNotes = new Set(); // Track which formatted notes have been mapped
  
  // Flatten all formatted notes with their categories
  const allFormattedNotes = [];
  for (const category in categories) {
    for (const note of categories[category]) {
      allFormattedNotes.push({ category, note });
    }
  }
  
  // First pass: Try to match each raw note to a formatted note (one-to-one preferred)
  for (let i = 0; i < rawNotes.length; i++) {
    if (usedRawIndices.has(i)) continue;
    
    const rawNote = rawNotes[i];
    const rawContent = rawNote.content.toLowerCase().trim();
    
    if (!rawContent) continue;
    
    // Find best matching formatted note that hasn't been used yet
    let bestMatch = null;
    let bestScore = 0;
    
    for (const formatted of allFormattedNotes) {
      // Prefer one-to-one mapping - skip if already mapped
      if (usedFormattedNotes.has(formatted.note)) {
        continue;
      }
      
      const formattedContent = formatted.note.toLowerCase().trim();
      
      // Extract key words (filter out common words)
      const rawWords = rawContent.split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'was', 'were'].includes(w));
      const formattedWords = formattedContent.split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'was', 'were'].includes(w));
      
      // Calculate match score
      let score = 0;
      for (const word of rawWords.slice(0, 6)) {
        if (formattedContent.includes(word)) {
          score++;
        }
      }
      
      // Strong bonus for substring overlap (exact or near-exact match)
      if (formattedContent.includes(rawContent.substring(0, 50)) || 
          rawContent.includes(formattedContent.substring(0, 50))) {
        score += 10; // Strong match
      } else if (formattedContent.includes(rawContent.substring(0, 30)) || 
                 rawContent.includes(formattedContent.substring(0, 30))) {
        score += 5; // Medium match
      }
      
      // Bonus for matching unique/distinctive words
      const distinctiveWords = rawWords.filter(w => w.length > 4);
      for (const word of distinctiveWords) {
        if (formattedContent.includes(word)) {
          score += 2; // Distinctive word match
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = formatted;
      }
    }
    
    // Only map if we have a strong match (score >= 4 for one-to-one, >= 6 for duplicates)
    if (bestMatch && bestScore >= 4) {
      if (!mapping[bestMatch.note]) {
        mapping[bestMatch.note] = [];
      }
      mapping[bestMatch.note].push(i);
      usedRawIndices.add(i);
      usedFormattedNotes.add(bestMatch.note);
    }
  }
  
  // Second pass: For remaining raw notes, allow mapping to already-used formatted notes
  // but require higher score threshold
  for (let i = 0; i < rawNotes.length; i++) {
    if (usedRawIndices.has(i)) continue;
    
    const rawNote = rawNotes[i];
    const rawContent = rawNote.content.toLowerCase().trim();
    
    if (!rawContent) continue;
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const formatted of allFormattedNotes) {
      const formattedContent = formatted.note.toLowerCase().trim();
      const rawWords = rawContent.split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'was', 'were'].includes(w));
      
      let score = 0;
      for (const word of rawWords.slice(0, 6)) {
        if (formattedContent.includes(word)) {
          score++;
        }
      }
      
      // Require stronger match for duplicates
      if (formattedContent.includes(rawContent.substring(0, 50)) || 
          rawContent.includes(formattedContent.substring(0, 50))) {
        score += 10;
      } else if (formattedContent.includes(rawContent.substring(0, 30)) || 
                 rawContent.includes(formattedContent.substring(0, 30))) {
        score += 5;
      }
      
      const distinctiveWords = rawWords.filter(w => w.length > 4);
      for (const word of distinctiveWords) {
        if (formattedContent.includes(word)) {
          score += 2;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = formatted;
      }
    }
    
    // Higher threshold for duplicates (score >= 6)
    if (bestMatch && bestScore >= 6) {
      if (!mapping[bestMatch.note]) {
        mapping[bestMatch.note] = [];
      }
      mapping[bestMatch.note].push(i);
      usedRawIndices.add(i);
    }
  }
  
  return mapping;
}

/**
 * Parse formatted Discord/HTML output into structured categories
 */
function parseFormattedToCategories(formatted) {
  const categories = {};
  
  // Parse Discord format to extract categories and notes
  const lines = formatted.discord.split('\n');
  let currentCategory = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if it's a category header (bold text)
    const categoryMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    if (categoryMatch) {
      currentCategory = categoryMatch[1];
      if (!categories[currentCategory]) {
        categories[currentCategory] = [];
      }
      continue;
    }
    
    // Check if it's a note (starts with -)
    if (trimmed.startsWith('-') && currentCategory) {
      const note = trimmed.substring(1).trim();
      categories[currentCategory].push(note);
    }
  }
  
  return categories;
}

/**
 * Upload images to Wix Media Manager
 */
async function uploadImagesToWix(downloadedImages, version) {
  const results = [];
  
  try {
    const uploader = new WixMediaUploader(
      process.env.WIX_API_KEY,
      process.env.WIX_SITE_ID
    );
    
    for (const image of downloadedImages) {
      try {
        const fullPath = path.join(__dirname, '..', 'data', image.localPath);
        const result = await uploader.uploadImage(fullPath, `patch-notes/${version}`);
        results.push(result);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 800));
        
      } catch (error) {
        console.error(`Failed to upload ${image.filename}:`, error);
        results.push({
          success: false,
          error: error.message,
          originalPath: image.localPath
        });
      }
    }
    
  } catch (error) {
    console.error('Wix uploader initialization failed:', error);
    return downloadedImages.map(() => ({ success: false, error: 'Wix uploader not initialized' }));
  }
  
  return results;
}

