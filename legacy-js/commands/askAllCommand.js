
const anthropicClient = require('../lib/anthropicClient');
const knowledgeLoader = require('../lib/knowledgeLoader');
const rateLimiter = require('../lib/rateLimiter');
const profileManager = require('../lib/profileManager');
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

      // Get active profile settings
      const activeProfile = profileManager.getActiveProfile();
      
      // Add conversation context if enabled
      let enhancedQuestion = question;
      if (activeProfile.includeConversationContext) {
        const conversationContext = await getConversationContext(message);
        if (conversationContext) {
          enhancedQuestion = `Previous conversation context:\n${conversationContext}\n\nCurrent question: ${question}`;
          console.log(`📝 Added conversation context (${conversationContext.length} chars)`);
        }
      }
      
      // Only build context if in Context Passing mode
      let context = '';
      if (anthropicClient.isContextPassing()) {
        // Use ALL context (no filtering)
        context = buildAllContext(knowledgeBase);
        
        if (context.length === 0) {
          return message.reply('I don\'t have information about that topic in my current knowledge base. Try asking about game mechanics, lore, or community topics.');
        }
      }

      // Debug logging
      console.log(`Question: "${question}"`);
      console.log(`Using --all flag: true`);
      console.log(`Active profile: ${activeProfile.name} (${profileManager.activeProfile})`);
      console.log(`Context mode: ${anthropicClient.isContextPassing() ? 'Context Passing' : 'File Usage'}`);
      
      if (anthropicClient.isContextPassing()) {
        console.log(`Context length: ${context.length} characters`);
        console.log(`Estimated tokens: ${Math.ceil(context.length / 4)}`);
        console.log(`Documents included: ${context.split('---').length - 1}`);
      } else {
        console.log(`File mode: Using uploaded files, no context building`);
      }

      // Use system prompt from active profile
      const systemPrompt = activeProfile.systemPrompt;

      // Call Anthropic API
      const response = await anthropicClient.ask(systemPrompt, context, enhancedQuestion);
      
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

// Get the last reply to this user (contains their original message)
async function getConversationContext(message) {
  try {
    // Fetch recent messages in this channel
    const messages = await message.channel.messages.fetch({ limit: 50 });
    
    // Find the last message where the bot replied to this user
    const userMessages = messages.filter(msg => msg.author.id === message.author.id);
    const botMessages = messages.filter(msg => msg.author.bot && msg.author.id !== message.author.id);
    
    // Look for bot replies that mention or reference this user
    for (const botMsg of botMessages.values()) {
      // Check if this bot message is a reply to a message from our user
      if (botMsg.reference && botMsg.reference.messageId) {
        const referencedMsg = messages.get(botMsg.reference.messageId);
        if (referencedMsg && referencedMsg.author.id === message.author.id) {
          // Found a bot reply to this user - return the context
          const context = `Bot's last response: "${botMsg.content}"\nUser's previous question: "${referencedMsg.content}"`;
          console.log(`🔍 Found conversation context from ${botMsg.createdAt}`);
          return context;
        }
      }
    }
    
    console.log('📝 No previous conversation context found');
    return null;
  } catch (error) {
    console.error('Error fetching conversation context:', error);
    return null;
  }
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
