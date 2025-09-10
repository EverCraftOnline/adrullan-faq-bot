
const anthropicClient = require('../lib/anthropicClient');
const knowledgeLoader = require('../lib/knowledgeLoader');
const rateLimiter = require('../lib/rateLimiter');
const fs = require('fs');
const path = require('path');

module.exports = {
  async execute(message) {
    const question = message.content.replace('!askall', '').trim();
    
    if (!question) {
      return message.reply('Usage: `!askall <your question>`\nExample: `!askall What is the complete story of Adrullan?`\n\nThis command uses ALL available context for comprehensive answers.');
    }

    try {
      // Skip rate limiting for askall - it's a premium command
      // const rateLimitCheck = rateLimiter.canMakeRequest(message.author.id, 'ask');
      // if (!rateLimitCheck.allowed) {
      //   return message.reply(`⏰ **Rate Limited:** ${rateLimitCheck.message}`);
      // }

      // Show typing indicator
      await message.channel.sendTyping();

      // Load knowledge base
      const knowledgeBase = await knowledgeLoader.loadAll();
      
      if (knowledgeBase.length === 0) {
        return message.reply('❌ No knowledge base found. Please add some data files to the `data/` folder first.');
      }

      // Use ALL context (no filtering)
      const context = buildAllContext(knowledgeBase);
      
      if (context.length === 0) {
        return message.reply('I don\'t have information about that topic in my current knowledge base. Try asking about game mechanics, lore, or community topics.');
      }

      // Debug logging
      console.log(`Question: "${question}"`);
      console.log(`Using --all flag: true`);
      console.log(`Context length: ${context.length} characters`);
      console.log(`Estimated tokens: ${Math.ceil(context.length / 4)}`);
      console.log(`Documents included: ${context.split('---').length - 1}`);

      // Load system prompt
      const systemPromptPath = path.join(__dirname, '..', 'prompts', 'systemPrompt.txt');
      let systemPrompt = `You are a helpful FAQ assistant for Adrullan Online Adventures. You have access to comprehensive knowledge about the game including lore, philosophy, gameplay mechanics, and community information.

STRICT RULES:
1. Only use information from the provided knowledge base context
2. If information isn't available, say "I don't have official information about that in our current knowledge base"
3. Always cite sources using clickable URLs when available - format as [Source: Title](URL)
4. Stay focused on Adrullan - don't answer off-topic questions
5. Be helpful and comprehensive but concise (under 800 words)
6. Never speculate or add unofficial information
7. Synthesize information across multiple sources when relevant

RESPONSE FORMAT:
- Direct answer to the question, drawing from all relevant sources
- Cite your sources using clickable links when available
- If helpful, suggest where to ask follow-up questions (#general-discussion, #dev-updates)
- For story/lore questions, provide rich context about the world and narrative`;
      
      if (fs.existsSync(systemPromptPath)) {
        systemPrompt = fs.readFileSync(systemPromptPath, 'utf8');
      }

      // Call Anthropic API
      const response = await anthropicClient.ask(systemPrompt, context, question);
      
      // Format and send response
      const formattedResponse = `**Question:** ${question}\n\n${response}`;
      
      // Split long responses
      if (formattedResponse.length > 2000) {
        const chunks = chunkString(formattedResponse, 1900);
        for (const chunk of chunks) {
          await message.reply(chunk);
        }
      } else {
        await message.reply(formattedResponse);
      }

    } catch (error) {
      console.error('AskAll command error:', error);
      await message.reply('Sorry, I encountered an error processing your question. Please try again later.');
    }
  }
};

function buildAllContext(knowledgeBase) {
  // Use ALL documents - no filtering
  const selectedDocs = knowledgeBase;
  
  // Remove duplicates
  const uniqueDocs = selectedDocs.filter((doc, index, self) => 
    index === self.findIndex(d => d.id === doc.id)
  );
  
  // Build context with all documents
  let context = '';
  
  for (const doc of uniqueDocs) {
    const docContent = `[${doc.id}] ${doc.title}\n${doc.content}\nSource: ${doc.source_url ? `[${doc.title}](${doc.source_url})` : doc.title}`;
    context += (context ? '\n\n---\n\n' : '') + docContent;
  }
  
  return context;
}

function chunkString(str, maxLength) {
  const chunks = [];
  let currentChunk = '';
  
  const lines = str.split('\n');
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}
