const anthropicClient = require('../lib/anthropicClient');
const knowledgeLoader = require('../lib/knowledgeLoader');
const rateLimiter = require('../lib/rateLimiter');
const fs = require('fs');
const path = require('path');

module.exports = {
  buildComprehensiveContext,
  async execute(message) {
    const fullContent = message.content.replace('!ask', '').trim();
    
    if (!fullContent) {
      return message.reply('Usage: `!ask <your question>`\nExample: `!ask What is the death penalty system?`\n\n**Flags:**\n`--all` or `--full` - Use all available context (no token limits)');
    }

    // Parse flags and question
    const parts = fullContent.split(' ');
    const flags = parts.filter(part => part.startsWith('--'));
    const question = parts.filter(part => !part.startsWith('--')).join(' ');
    
    const useAllContext = flags.includes('--all') || flags.includes('--full');

    try {
      // Determine question complexity for rate limiting
      const query = question.toLowerCase();
      const isStoryQuery = ['story', 'lore', 'narrative', 'plot', 'background', 'history', 'world', 'setting', 'conflict', 'gods', 'champions', 'aspects'].some(keyword => query.includes(keyword));
      const isGameplayQuery = ['gameplay', 'mechanics', 'combat', 'crafting', 'classes', 'races', 'how to', 'how do', 'what happens', 'die', 'death', 'penalty', 'level', 'xp', 'experience', 'bind', 'respawn', 'corpse', 'gear', 'equipment', 'inventory', 'skills', 'abilities', 'spells', 'magic', 'weapons', 'armor', 'items', 'loot', 'drops', 'rewards', 'quests', 'missions', 'dungeons', 'raids', 'pvp', 'pve', 'guild', 'group', 'party', 'trade', 'economy', 'gold', 'money', 'cost', 'price', 'buy', 'sell', 'shop', 'vendor', 'npc', 'mob', 'monster', 'boss', 'enemy', 'friendly', 'neutral', 'hostile', 'faction', 'reputation', 'honor', 'karma', 'alignment', 'good', 'evil', 'neutral', 'lawful', 'chaotic', 'lawful good', 'lawful evil', 'chaotic good', 'chaotic evil', 'true neutral', 'lawful neutral', 'chaotic neutral', 'neutral good', 'neutral evil'].some(keyword => query.includes(keyword));
      const isPhilosophyQuery = ['design', 'philosophy', 'vision', 'approach', 'why', 'purpose'].some(keyword => query.includes(keyword));
      
      // Simple queries are short OR basic gameplay questions (not complex story/philosophy)
      // Much more lenient - most questions under 100 chars are simple
      const isSimpleQuery = (query.length < 100) || 
                           (isGameplayQuery && !isStoryQuery && !isPhilosophyQuery);
      
      // Use appropriate command type for rate limiting
      const commandType = isSimpleQuery ? 'ask_simple' : 'ask';
      
      // Check rate limits
      const rateLimitCheck = rateLimiter.canMakeRequest(message.author.id, commandType);
      if (!rateLimitCheck.allowed) {
        return message.reply(`⏰ **Rate Limited:** ${rateLimitCheck.message}`);
      }

      // Show typing indicator
      await message.channel.sendTyping();

      // Load knowledge base
      const knowledgeBase = await knowledgeLoader.loadAll();
      
      if (knowledgeBase.length === 0) {
        return message.reply('❌ No knowledge base found. Please add some data files to the `data/` folder first.');
      }

      // Build comprehensive context based on question type
      const maxTokens = useAllContext ? 50000 : 20000; // Increased default limit for better answers
      const context = buildComprehensiveContext(question, knowledgeBase, maxTokens);
      
      if (context.length === 0) {
        return message.reply('I don\'t have information about that topic in my current knowledge base. Try asking about game mechanics, lore, or community topics.');
      }

      // Debug logging
      console.log(`Question: "${question}"`);
      console.log(`Using --all flag: ${useAllContext}`);
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

function buildComprehensiveContext(question, knowledgeBase, maxTokens = 12000) {
  const query = question.toLowerCase();
  
  // Check if we want ALL context (--all flag)
  const useAllContext = maxTokens > 20000; // If token limit is very high, use all docs
  
  let selectedDocs = [];
  
  if (useAllContext) {
    // Use ALL documents when --all flag is used
    selectedDocs = knowledgeBase;
  } else {
    // Determine question type and build appropriate context
    const isStoryQuery = ['story', 'lore', 'narrative', 'plot', 'background', 'history', 'world', 'setting', 'conflict', 'gods', 'champions', 'aspects'].some(keyword => query.includes(keyword));
    const isGameplayQuery = ['gameplay', 'mechanics', 'combat', 'crafting', 'classes', 'races', 'how to', 'how do', 'die', 'death', 'penalty', 'level', 'xp', 'experience', 'bind', 'respawn', 'corpse', 'gear', 'equipment', 'inventory', 'skills', 'abilities', 'spells', 'magic', 'weapons', 'armor', 'items', 'loot', 'drops', 'rewards', 'quests', 'missions', 'dungeons', 'raids', 'pvp', 'pve', 'guild', 'group', 'party', 'trade', 'economy', 'gold', 'money', 'cost', 'price', 'buy', 'sell', 'shop', 'vendor', 'npc', 'mob', 'monster', 'boss', 'enemy', 'friendly', 'neutral', 'hostile', 'faction', 'reputation', 'honor', 'karma', 'alignment', 'good', 'evil', 'neutral', 'lawful', 'chaotic', 'lawful good', 'lawful evil', 'chaotic good', 'chaotic evil', 'true neutral', 'lawful neutral', 'chaotic neutral', 'neutral good', 'neutral evil'].some(keyword => query.includes(keyword));
    const isPhilosophyQuery = ['design', 'philosophy', 'vision', 'approach', 'why', 'purpose', 'team', 'developers', 'who is', 'who are', 'staff', 'people', 'working on', 'made by', 'created by'].some(keyword => query.includes(keyword));
    const isSimpleQuery = query.length < 20 && !isStoryQuery && !isGameplayQuery && !isPhilosophyQuery;
    
    if (isStoryQuery) {
      // For story queries, prioritize lore content but include philosophy for context
      selectedDocs = [
        ...knowledgeBase.filter(doc => doc.category === 'lore'),
        ...knowledgeBase.filter(doc => doc.category === 'philosophy'),
        ...knowledgeBase.filter(doc => doc.category === 'faq').slice(0, 5) // Some FAQ for context
      ];
    } else if (isGameplayQuery) {
      // For gameplay queries, include guides, FAQ, philosophy, and lore
      selectedDocs = [
        ...knowledgeBase.filter(doc => doc.category === 'faq' || doc.category === 'alpha'),
        ...knowledgeBase.filter(doc => doc.category === 'guides'),
        ...knowledgeBase.filter(doc => doc.category === 'philosophy'),
        ...knowledgeBase.filter(doc => doc.category === 'lore').slice(0, 10) // Some lore for context
      ];
    } else if (isPhilosophyQuery) {
      // For philosophy queries, focus on philosophy but include lore and FAQ
      selectedDocs = [
        ...knowledgeBase.filter(doc => doc.category === 'philosophy'),
        ...knowledgeBase.filter(doc => doc.category === 'lore').slice(0, 5),
        ...knowledgeBase.filter(doc => doc.category === 'faq').slice(0, 5)
      ];
    } else if (isSimpleQuery) {
      // For simple queries, still include philosophy and lore for better answers
      selectedDocs = [
        ...knowledgeBase.filter(doc => doc.priority === 'high'),
        ...knowledgeBase.filter(doc => doc.category === 'faq').slice(0, 10),
        ...knowledgeBase.filter(doc => doc.category === 'philosophy').slice(0, 5),
        ...knowledgeBase.filter(doc => doc.category === 'lore').slice(0, 5)
      ];
    } else {
      // For general queries, use a balanced approach
      selectedDocs = [
        ...knowledgeBase.filter(doc => doc.category === 'faq').slice(0, 20),
        ...knowledgeBase.filter(doc => doc.category === 'philosophy').slice(0, 10),
        ...knowledgeBase.filter(doc => doc.category === 'lore').slice(0, 8),
        ...knowledgeBase.filter(doc => doc.category === 'guides').slice(0, 5)
      ];
    }
  }
  
  // Remove duplicates and sort by priority
  const uniqueDocs = selectedDocs.filter((doc, index, self) => 
    index === self.findIndex(d => d.id === doc.id)
  );
  
  // Smart context trimming based on token limit
  let context = '';
  let currentTokens = 0;
  const maxChars = maxTokens * 4; // Rough estimate: 4 chars per token
  
  for (const doc of uniqueDocs) {
    const docContent = `[${doc.id}] ${doc.title}\n${doc.content}\nSource: ${doc.source_url ? `[${doc.title}](${doc.source_url})` : doc.title}`;
    const docTokens = docContent.length / 4;
    
    if (currentTokens + docTokens > maxTokens) {
      // If adding this doc would exceed limit, try to add a truncated version
      const remainingTokens = maxTokens - currentTokens;
      if (remainingTokens > 100) { // Only add if we have meaningful space left
        const truncatedContent = docContent.substring(0, remainingTokens * 4 - 50) + '...';
        context += (context ? '\n\n---\n\n' : '') + truncatedContent;
      }
      break;
    }
    
    context += (context ? '\n\n---\n\n' : '') + docContent;
    currentTokens += docTokens;
  }
  
  return context;
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
