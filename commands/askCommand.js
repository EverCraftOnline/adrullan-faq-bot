const anthropicClient = require('../lib/anthropicClient');
const knowledgeLoader = require('../lib/knowledgeLoader');
const fs = require('fs');
const path = require('path');

module.exports = {
  buildComprehensiveContext,
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

      // Build comprehensive context based on question type
      const context = buildComprehensiveContext(question, knowledgeBase);
      
      if (context.length === 0) {
        return message.reply('I don\'t have information about that topic in my current knowledge base. Try asking about game mechanics, lore, or community topics.');
      }

      // Debug logging
      console.log(`Question: "${question}"`);
      console.log(`Context length: ${context.length} characters`);
      console.log(`Estimated tokens: ${Math.ceil(context.length / 4)}`);
      console.log(`Documents included: ${context.split('---').length - 1}`);
      console.log(`Contains lore content: ${context.includes('Six Aspects')}`);
      console.log(`Contains central conflict: ${context.includes('Age of Heroism')}`);

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
      console.error('Ask command error:', error);
      await message.reply('Sorry, I encountered an error processing your question. Please try again later.');
    }
  }
};

function buildComprehensiveContext(question, knowledgeBase) {
  const query = question.toLowerCase();
  
  // Determine question type and build appropriate context
  const isStoryQuery = ['story', 'lore', 'narrative', 'plot', 'background', 'history', 'world', 'setting', 'conflict', 'gods', 'champions', 'aspects'].some(keyword => query.includes(keyword));
  const isGameplayQuery = ['gameplay', 'mechanics', 'combat', 'crafting', 'classes', 'races', 'how to', 'how do'].some(keyword => query.includes(keyword));
  const isPhilosophyQuery = ['design', 'philosophy', 'vision', 'approach', 'why', 'purpose'].some(keyword => query.includes(keyword));
  
  let selectedDocs = [];
  
  if (isStoryQuery) {
    // For story queries, prioritize lore content but include some philosophy for context
    selectedDocs = [
      ...knowledgeBase.filter(doc => doc.category === 'lore'),
      ...knowledgeBase.filter(doc => doc.category === 'philosophy' && doc.id.includes('introduction'))
    ];
  } else if (isGameplayQuery) {
    // For gameplay queries, include guides, FAQ, and relevant philosophy
    selectedDocs = [
      ...knowledgeBase.filter(doc => doc.category === 'faq' || doc.category === 'alpha'),
      ...knowledgeBase.filter(doc => doc.category === 'guides'),
      ...knowledgeBase.filter(doc => doc.category === 'philosophy' && (doc.id.includes('combat') || doc.id.includes('gameplay')))
    ];
  } else if (isPhilosophyQuery) {
    // For philosophy queries, focus on philosophy content
    selectedDocs = knowledgeBase.filter(doc => doc.category === 'philosophy');
  } else {
    // For general queries, use a balanced approach
    selectedDocs = [
      ...knowledgeBase.filter(doc => doc.priority === 'high'),
      ...knowledgeBase.filter(doc => doc.category === 'faq').slice(0, 10) // Top 10 FAQ entries
    ];
  }
  
  // Remove duplicates and limit to reasonable size (still well under token limit)
  const uniqueDocs = selectedDocs.filter((doc, index, self) => 
    index === self.findIndex(d => d.id === doc.id)
  ).slice(0, 20); // Increased from 5 to 20 for better context
  
  // Build context with better formatting
  return uniqueDocs.map(doc => {
    const source = doc.source_url ? `[${doc.title}](${doc.source_url})` : doc.title;
    return `[${doc.id}] ${doc.title}\n${doc.content}\nSource: ${source}`;
  }).join('\n\n---\n\n');
}

function findRelevantDocs(question, knowledgeBase, limit) {
  const query = question.toLowerCase();
  const keywords = query.split(' ').filter(word => word.length > 2);
  
  // Enhanced keyword mapping for better story/lore matching
  const storyKeywords = ['story', 'lore', 'narrative', 'plot', 'background', 'history', 'world', 'setting', 'conflict', 'gods', 'champions', 'aspects'];
  const isStoryQuery = storyKeywords.some(keyword => query.includes(keyword));
  
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
    
    // Special scoring for story-related content
    if (isStoryQuery) {
      if (doc.category === 'lore') {
        score += 5; // High priority for lore content
      }
      if (doc.tags?.some(tag => ['story', 'lore', 'narrative', 'conflict', 'gods', 'champions', 'aspects', 'pantheon'].includes(tag))) {
        score += 3;
      }
      // Boost central conflict and timeline entries for story queries
      if (doc.id === 'central_conflict' || doc.id === 'timeline_reference') {
        score += 2;
      }
    }
    
    // Boost philosophy content for general game questions
    if (query.includes('game') && doc.category === 'philosophy') {
      score += 2;
    }
    
    return { doc, score };
  });
  
  return scoredDocs
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => ({ ...item.doc, score: item.score }));
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
