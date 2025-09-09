const anthropicClient = require('../lib/anthropicClient');
const knowledgeLoader = require('../lib/knowledgeLoader');
const fs = require('fs');
const path = require('path');

module.exports = {
  async execute(message) {
    const question = message.content.replace('!ask', '').trim();
    
    if (!question) {
      return message.reply('Usage: `!ask <your question>`\nExample: `!ask What is the death penalty system?`');
    }

    try {
      // Show typing indicator
      await message.channel.sendTyping();

      // Load knowledge base
      const knowledgeBase = await knowledgeLoader.loadAll();
      
      if (knowledgeBase.length === 0) {
        return message.reply('❌ No knowledge base found. Please add some data files to the `data/` folder first.');
      }

      // Find relevant documents (simple keyword matching for now)
      const relevantDocs = findRelevantDocs(question, knowledgeBase, 5);
      
      if (relevantDocs.length === 0) {
        return message.reply('I don\'t have information about that topic in my current knowledge base. Try asking about game mechanics, lore, or community topics.');
      }

      // Build context from matching docs
      const context = relevantDocs.map(doc => 
        `[${doc.id}] ${doc.title}\n${doc.content}\nSource: ${doc.source_url || 'Knowledge Base'}`
      ).join('\n\n---\n\n');

      // Load system prompt
      const systemPromptPath = path.join(__dirname, '..', 'prompts', 'systemPrompt.txt');
      let systemPrompt = 'You are a helpful FAQ assistant for Adrullan Online Adventures.';
      
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
      console.error('Ask command error:', error);
      await message.reply('Sorry, I encountered an error processing your question. Please try again later.');
    }
  }
};

function findRelevantDocs(question, knowledgeBase, limit) {
  const query = question.toLowerCase();
  const keywords = query.split(' ').filter(word => word.length > 2);
  
  const scoredDocs = knowledgeBase.map(doc => {
    let score = 0;
    const searchText = `${doc.title} ${doc.content} ${doc.tags?.join(' ')}`.toLowerCase();
    
    // Exact phrase match
    if (searchText.includes(query)) {
      score += 10;
    }
    
    // Keyword matches
    keywords.forEach(keyword => {
      if (searchText.includes(keyword)) {
        score += 1;
      }
    });
    
    // Title matches are worth more
    if (doc.title.toLowerCase().includes(query)) {
      score += 5;
    }
    
    return { doc, score };
  });
  
  return scoredDocs
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.doc);
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
