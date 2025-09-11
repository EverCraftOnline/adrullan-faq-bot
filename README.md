# Adrullan FAQ Bot - Complete Technical Spec

A Discord bot that answers Adrullan Online Adventures questions using a comprehensive knowledge base + Anthropic API with intelligent context filtering.

## Project Structure
```
adrullan-faq-bot/
├── bot.js                    # Main bot entry — handles all commands
├── .env                      # ANTHROPIC_API_KEY & DISCORD_TOKEN
├── .gitignore
├── .cursorignore             # Keeps Cursor lean
├── README.md
│
├── commands/                 # Bot commands
│   ├── indexCommand.js       # Forum indexer (existing code)
│   ├── askCommand.js         # Smart LLM responder (!ask)
│   ├── askAllCommand.js      # Full context responder (!askall)
│   ├── quizCommand.js        # Interactive quiz system (!quiz)
│   ├── statsCommand.js       # Usage statistics (!stats)
│   ├── refreshFAQ.js         # FAQ data generation (!refreshfaq)
│   └── uploadDataCommand.js  # Data upload & toggle management (!uploaddata)
│
├── data/                     # Knowledge base
│   ├── forum_faq.json        # Scraped FAQ threads (33 entries)
│   ├── philosophy.json       # Design philosophy & team info (13 entries)
│   ├── guides.json           # System/feature guides (11 entries)
│   └── lore.json             # Lore, gods, champions, story (19 entries)
│
├── lib/                      # Core utilities
│   ├── anthropicClient.js    # Anthropic API wrapper
│   ├── knowledgeLoader.js    # Load/format data files
│   └── rateLimiter.js        # Rate limiting & cost protection
│
├── prompts/                  # Reusable prompts
│   └── systemPrompt.txt      # Core behavior rules (optional)
│
├── package.json
└── package-lock.json
```

## Knowledge Base Format

### `/data/*.json` Structure
```json
[
  {
    "id": "death_penalty_v2",
    "title": "Death Penalty System", 
    "content": "In Adrullan, death results in a soul tether mechanic and light XP loss (5%). No corpse runs required. Players respawn at nearest shrine with temporary stat debuff for 2 minutes.",
    "category": "mechanics",
    "tags": ["death", "pvp", "pve", "penalties"],
    "source_url": "https://discord.com/channels/123/456/789",
    "last_updated": "2025-01-15",
    "priority": "high"
  }
]
```

### Data Categories
- **forum_faq.json** - Community Q&A from Discord forums (33 entries)
- **philosophy.json** - Design vision, team info, development history (13 entries)
- **guides.json** - Combat, progression, crafting, monetization (11 entries)
- **lore.json** - World building, gods, champions, story, races (19 entries)

## Core Implementation

### `bot.js` - Entry Point
```javascript
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const indexCommand = require('./commands/indexCommand');
const askCommand = require('./commands/askCommand');
const askAllCommand = require('./commands/askAllCommand');
const refreshFAQ = require('./commands/refreshFAQ');
const quizCommand = require('./commands/quizCommand');
const statsCommand = require('./commands/statsCommand');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Bot is ready! Commands: !index, !ask, !askall, !refreshfaq, !quiz, !stats');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Handle !askall command (uses all context) - MUST come before !ask
  if (message.content.startsWith('!askall')) {
    await askAllCommand.execute(message);
  }
  
  // Handle !ask command (new AI functionality)
  else if (message.content.startsWith('!ask')) {
    await askCommand.execute(message);
  }
  
  // Handle other commands...
  if (message.content.startsWith('!index')) {
    await indexCommand.execute(message);
  }
  if (message.content.startsWith('!refreshfaq')) {
    await refreshFAQ.execute(message);
  }
  if (message.content.startsWith('!quiz')) {
    await quizCommand.execute(message);
  }
  if (message.content.startsWith('!stats')) {
    await statsCommand.execute(message);
  }
});

client.login(process.env.DISCORD_TOKEN);
```

### `commands/askCommand.js` - Smart Context Filtering
```javascript
const anthropicClient = require('../lib/anthropicClient');
const knowledgeLoader = require('../lib/knowledgeLoader');
const rateLimiter = require('../lib/rateLimiter');

module.exports = {
  async execute(message) {
    const fullContent = message.content.replace('!ask', '').trim();
    
    // Parse flags and question
    const parts = fullContent.split(' ');
    const flags = parts.filter(part => part.startsWith('--'));
    const question = parts.filter(part => !part.startsWith('--')).join(' ');
    const useAllContext = flags.includes('--all') || flags.includes('--full');

    // Check rate limits
    const rateLimitCheck = rateLimiter.canMakeRequest(message.author.id, 'ask');
    if (!rateLimitCheck.allowed) {
      return message.reply(`⏰ **Rate Limited:** ${rateLimitCheck.message}`);
    }

    // Load knowledge base
    const knowledgeBase = await knowledgeLoader.loadAll();
    
    // Build context with intelligent filtering
    const maxTokens = useAllContext ? 50000 : 20000;
    const context = buildComprehensiveContext(question, knowledgeBase, maxTokens);
    
    // Call Anthropic API
    const response = await anthropicClient.ask(systemPrompt, context, question);
    await message.reply(`**Question:** ${question}\n\n${response}`);
  }
};

function buildComprehensiveContext(question, knowledgeBase, maxTokens = 20000) {
  const query = question.toLowerCase();
  
  // Determine question type and select appropriate documents
  const isStoryQuery = ['story', 'lore', 'narrative', 'plot', 'background', 'history', 'world', 'setting', 'conflict', 'gods', 'champions', 'aspects'].some(keyword => query.includes(keyword));
  const isGameplayQuery = ['gameplay', 'mechanics', 'combat', 'crafting', 'classes', 'races', 'how to', 'how do', 'die', 'death', 'penalty', 'level', 'xp', 'experience', 'bind', 'respawn', 'corpse', 'gear', 'equipment', 'inventory', 'skills', 'abilities', 'spells', 'magic', 'weapons', 'armor', 'items', 'loot', 'drops', 'rewards', 'quests', 'missions', 'dungeons', 'raids', 'pvp', 'pve', 'guild', 'group', 'party', 'trade', 'economy', 'gold', 'money', 'cost', 'price', 'buy', 'sell', 'shop', 'vendor', 'npc', 'mob', 'monster', 'boss', 'enemy', 'friendly', 'neutral', 'hostile', 'faction', 'reputation', 'honor', 'karma', 'alignment', 'good', 'evil', 'neutral', 'lawful', 'chaotic', 'lawful good', 'lawful evil', 'chaotic good', 'chaotic evil', 'true neutral', 'lawful neutral', 'chaotic neutral', 'neutral good', 'neutral evil'].some(keyword => query.includes(keyword));
  const isPhilosophyQuery = ['design', 'philosophy', 'vision', 'approach', 'why', 'purpose', 'team', 'developers', 'who is', 'who are', 'staff', 'people', 'working on', 'made by', 'created by'].some(keyword => query.includes(keyword));
  
  let selectedDocs = [];
  
  if (isStoryQuery) {
    selectedDocs = [
      ...knowledgeBase.filter(doc => doc.category === 'lore'),
      ...knowledgeBase.filter(doc => doc.category === 'philosophy'),
      ...knowledgeBase.filter(doc => doc.category === 'faq').slice(0, 5)
    ];
  } else if (isGameplayQuery) {
    selectedDocs = [
      ...knowledgeBase.filter(doc => doc.category === 'faq' || doc.category === 'alpha'),
      ...knowledgeBase.filter(doc => doc.category === 'guides'),
      ...knowledgeBase.filter(doc => doc.category === 'philosophy'),
      ...knowledgeBase.filter(doc => doc.category === 'lore').slice(0, 10)
    ];
  } else if (isPhilosophyQuery) {
    selectedDocs = [
      ...knowledgeBase.filter(doc => doc.category === 'philosophy'),
      ...knowledgeBase.filter(doc => doc.category === 'lore').slice(0, 5),
      ...knowledgeBase.filter(doc => doc.category === 'faq').slice(0, 5)
    ];
  } else {
    // General queries - balanced approach
    selectedDocs = [
      ...knowledgeBase.filter(doc => doc.category === 'faq').slice(0, 20),
      ...knowledgeBase.filter(doc => doc.category === 'philosophy').slice(0, 10),
      ...knowledgeBase.filter(doc => doc.category === 'lore').slice(0, 8),
      ...knowledgeBase.filter(doc => doc.category === 'guides').slice(0, 5)
    ];
  }
  
  // Build context with token limiting
  let context = '';
  let currentTokens = 0;
  const maxChars = maxTokens * 4;
  
  for (const doc of selectedDocs) {
    const docContent = `[${doc.id}] ${doc.title}\n${doc.content}\nSource: ${doc.source_url ? `[${doc.title}](${doc.source_url})` : doc.title}`;
    const docTokens = docContent.length / 4;
    
    if (currentTokens + docTokens > maxTokens) {
      const remainingTokens = maxTokens - currentTokens;
      if (remainingTokens > 100) {
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
```

### `lib/anthropicClient.js` - API Wrapper
```javascript
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

module.exports = {
  async ask(systemPrompt, context, question) {
    const userPrompt = `KNOWLEDGE BASE CONTEXT:
${context}

USER QUESTION: ${question}

Respond using only the provided context. If the answer isn't in the context, say "I don't have official information about that in our current knowledge base."`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      });
      
      return response.content[0].text;
    } catch (error) {
      console.error('Anthropic API error:', error);
      return 'Sorry, I encountered an error processing your question.';
    }
  }
};
```

### `lib/knowledgeLoader.js` - Data Loading
```javascript
const fs = require('fs');
const path = require('path');

module.exports = {
  async loadAll() {
    const dataDir = path.join(__dirname, '..', 'data');
    
    if (!fs.existsSync(dataDir)) {
      console.log('Data directory not found, creating it...');
      fs.mkdirSync(dataDir, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(dataDir);
    const allData = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const filePath = path.join(dataDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (Array.isArray(data)) {
          allData.push(...data);
        } else {
          console.warn(`File ${file} does not contain a JSON array`);
        }
      } catch (error) {
        console.error(`Error loading ${file}:`, error.message);
      }
    }

    console.log(`Loaded ${allData.length} knowledge entries from ${files.length} files`);
    return allData;
  },

  async loadByCategory(category) {
    const allData = await this.loadAll();
    return allData.filter(item => item.category === category);
  },

  async loadByPriority(priority) {
    const allData = await this.loadAll();
    return allData.filter(item => item.priority === priority);
  }
};
```

### `lib/rateLimiter.js` - Cost Protection
```javascript
// Simple rate limiting and cost protection
const userLimits = new Map();
const DAILY_LIMIT = 20; // requests per day per user
const COOLDOWN_MS = 30000; // 30 seconds between requests
const COOLDOWN_MS_HEAVY = 120000; // 2 minutes for heavy context

// Estimated costs (rough estimates)
const COST_PER_REQUEST = {
  'ask': 0.01,
  'ask_simple': 0.003,
  'quiz': 0.005,
  'refresh': 0.001
};

module.exports = {
  canMakeRequest(userId, commandType = 'ask') {
    const now = Date.now();
    const userKey = `${userId}_${commandType}`;
    
    if (!userLimits.has(userId)) {
      userLimits.set(userId, {
        dailyCount: 0,
        lastReset: now,
        lastRequest: 0
      });
    }
    
    const userData = userLimits.get(userId);
    
    // Reset daily count if it's a new day
    if (now - userData.lastReset > 24 * 60 * 60 * 1000) {
      userData.dailyCount = 0;
      userData.lastReset = now;
    }
    
    // Check daily limit
    if (userData.dailyCount >= DAILY_LIMIT) {
      const nextReset = new Date(userData.lastReset + 24 * 60 * 60 * 1000);
      return {
        allowed: false,
        message: `Daily limit reached (${DAILY_LIMIT} requests). Resets at ${nextReset.toLocaleTimeString()}`
      };
    }
    
    // Check cooldown
    const cooldown = commandType === 'ask_simple' ? COOLDOWN_MS : COOLDOWN_MS_HEAVY;
    const timeSinceLastRequest = now - userData.lastRequest;
    
    if (timeSinceLastRequest < cooldown) {
      const remainingTime = Math.ceil((cooldown - timeSinceLastRequest) / 1000);
      return {
        allowed: false,
        message: `Please wait ${remainingTime} seconds before making another request`
      };
    }
    
    // Allow request
    userData.dailyCount++;
    userData.lastRequest = now;
    
    return { allowed: true };
  }
};
```

## Discord Commands

- `!ask <question>` - Get AI-powered answer with smart context filtering
- `!ask --all <question>` - Get comprehensive answer using all available context
- `!askall <question>` - Same as `!ask --all` (convenience command)
- `!quiz` - Start an interactive quiz from the knowledge base
- `!stats` - View usage statistics and costs (admin only)
- `!index <channel_id>` - Generate clickable FAQ index from forum
- `!refreshfaq <channel_id>` - Regenerate FAQ data from Discord channels and upload to Anthropic
- `!uploaddata upload` - Upload all data files to Anthropic workspace
- `!uploaddata toggle on/off` - Toggle between context passing and file usage modes
- `!uploaddata status` - Show current mode and uploaded files
- `!uploaddata clear` - Clear uploaded files cache


## Key Features

### Anthropic File Upload System
- **Dual Mode Operation**: Toggle between context passing and file usage modes
- **Automatic Uploads**: `!refreshfaq` now uploads files to Anthropic workspace after local save
- **File Management**: Upload all data files with `!uploaddata upload`
- **Cost Optimization**: File usage mode provides better quality answers without token limits
- **Console Feedback**: Comprehensive logging for all upload operations

### Smart Context Filtering
- **Question Type Detection**: Automatically detects story, gameplay, philosophy, or general queries
- **Intelligent Document Selection**: Chooses relevant documents based on question type
- **Token Management**: Limits context to 20k tokens (50k for `!askall`) for cost efficiency
- **Comprehensive Coverage**: Includes philosophy, lore, FAQ, and guides content

### Rate Limiting & Cost Protection
- **Daily Limits**: 20 requests per user per day
- **Cooldowns**: 30 seconds for simple queries, 2 minutes for complex queries
- **Cost Tracking**: Estimated costs per request type
- **Admin Controls**: Usage statistics and monitoring

### Multiple Answer Modes
- **`!ask`**: Smart filtering for efficient, relevant answers
- **`!askall`**: Full context for comprehensive answers
- **Flag Support**: `--all` or `--full` flags for maximum context

## Workflow

1. **Setup**: Bot loads 76 knowledge entries from 4 JSON files
2. **Question Processing**: User asks question via `!ask` or `!askall`
3. **Context Building**: Bot selects relevant documents based on question type
4. **AI Processing**: Anthropic Claude 3.5 Sonnet generates response
5. **Response**: Formatted answer sent to Discord with source citations

## Environment & Dependencies

### `.env`
```env
DISCORD_TOKEN=your_discord_bot_token
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### `package.json`
```json
{
  "name": "adrullan-faq-bot",
  "version": "1.0.0",
  "dependencies": {
    "discord.js": "^14.14.1",
    "@anthropic-ai/sdk": "^0.17.1",
    "dotenv": "^16.3.1"
  }
}
```

## Performance & Costs

### Context Usage
- **`!ask`**: ~40-50 documents, ~20k tokens, ~$0.01 per request
- **`!askall`**: All 76 documents, ~50k tokens, ~$0.015 per request
- **Daily Limit**: 20 requests per user (cost protection)

### Knowledge Base
- **Total Entries**: 76 documents across 4 categories
- **File Sizes**: ~500KB total knowledge base
- **Load Time**: <1 second on startup
- **Memory Usage**: ~10MB for full knowledge base

## Advanced Features

### Quiz System (`!quiz`)
- Generates questions from knowledge base
- Multiple choice format
- Timer-based gameplay
- Celebration for correct answers
- Covers lore, philosophy, and gameplay topics

### Admin Tools (`!stats`)
- Usage statistics per user
- Cost tracking and estimates
- Top users by request count
- Rate limit monitoring

### Error Handling
- Graceful API failure handling
- Network timeout protection
- Unhandled promise rejection catching
- Discord client error recovery