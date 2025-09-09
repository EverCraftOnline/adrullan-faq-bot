# Adrullan FAQ Bot - Complete Technical Spec

A Discord bot that answers Adrullan Online Adventures questions using embedded knowledge base + Anthropic API.

## Project Structure
```
adrullan-faq-bot/
├── bot.js                    # Main bot entry — handles !ask and !index
├── .env                      # ANTHROPIC_API_KEY & DISCORD_TOKEN
├── .gitignore
├── .cursorignore             # Keeps Cursor lean
├── README.md
│
├── commands/                 # Bot commands
│   ├── indexCommand.js       # Forum indexer (existing code)
│   └── askCommand.js         # Smart LLM responder (!ask)
│
├── data/                     # Embedded knowledge base
│   ├── faq.json              # Scraped FAQ threads
│   ├── philosophy.json       # Design philosophy doc(s)
│   ├── guides.json           # System/feature design guides
│   └── lore.json             # Lore, regions, factions, history, etc.
│
├── lib/                      # Core utilities
│   ├── anthropicClient.js    # API wrapper
│   ├── vectorStore.js        # Chroma DB interface
│   └── knowledgeLoader.js    # Load/format data files
│
├── prompts/                  # Reusable prompts
│   ├── systemPrompt.txt      # Core behavior rules
│   └── faqTemplate.txt       # Response formatting
│
├── embed_faq.js              # One-time embed builder (OpenAI -> chroma)
├── vector_store/             # Local vector DB (output from embed step)
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
- **faq.json** - Community Q&A from Discord forums
- **philosophy.json** - Design vision, core principles, dev philosophy
- **guides.json** - Combat, progression, crafting, monetization
- **lore.json** - World building, factions, timeline, races, regions

## Core Implementation

### `bot.js` - Entry Point
```javascript
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const indexCommand = require('./commands/indexCommand');
const askCommand = require('./commands/askCommand');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  if (message.content.startsWith('!index')) {
    await indexCommand.execute(message);
  }
  
  if (message.content.startsWith('!ask')) {
    await askCommand.execute(message);
  }
});

client.login(process.env.DISCORD_TOKEN);
```

### `commands/askCommand.js` - LLM Integration
```javascript
const anthropicClient = require('../lib/anthropicClient');
const vectorStore = require('../lib/vectorStore');
const fs = require('fs');

module.exports = {
  async execute(message) {
    const question = message.content.replace('!ask', '').trim();
    
    // 1. Search vector store for relevant docs
    const relevantDocs = await vectorStore.search(question, 5);
    
    // 2. Build context from matching docs
    const context = relevantDocs.map(doc => 
      `[${doc.id}] ${doc.title}\n${doc.content}\nSource: ${doc.source_url}`
    ).join('\n\n---\n\n');
    
    // 3. Load system prompt
    const systemPrompt = fs.readFileSync('./prompts/systemPrompt.txt', 'utf8');
    
    // 4. Call Anthropic API
    const response = await anthropicClient.ask(systemPrompt, context, question);
    
    // 5. Format and send response
    await message.reply(response);
  }
};
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

Respond using only the provided context. If the answer isn't in the context, say "I don't have official information about that in our current FAQ."`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
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

### `lib/vectorStore.js` - Vector Search
```javascript
const { ChromaClient } = require('chromadb');
const OpenAI = require('openai');

const chroma = new ChromaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = {
  async search(query, limit = 5) {
    // Generate embedding for user question
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    
    // Search vector store
    const collection = await chroma.getCollection({ name: 'adrullan_faq' });
    const results = await collection.query({
      queryEmbeddings: [embedding.data[0].embedding],
      nResults: limit
    });
    
    // Return formatted results with metadata
    return results.documents[0].map((doc, index) => ({
      content: doc,
      ...results.metadatas[0][index]
    }));
  }
};
```

### `embed_faq.js` - Knowledge Base Builder
```javascript
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { ChromaClient } = require('chromadb');

async function buildEmbeddings() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const chroma = new ChromaClient();
  
  // Create/get collection
  const collection = await chroma.getOrCreateCollection({ name: 'adrullan_faq' });
  
  // Load all data files
  const dataDir = './data/';
  const files = fs.readdirSync(dataDir);
  
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    
    for (const item of data) {
      // Generate embedding
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: `${item.title}\n${item.content}`
      });
      
      // Store in vector DB
      await collection.add({
        ids: [item.id],
        embeddings: [embedding.data[0].embedding],
        documents: [`${item.title}\n${item.content}`],
        metadatas: [item]
      });
    }
  }
  
  console.log('Embeddings built successfully!');
}

buildEmbeddings().catch(console.error);
```

## Prompt Templates

### `prompts/systemPrompt.txt`
```
You are the official Adrullan Online Adventures FAQ assistant. You help community members by answering questions using only official documentation and FAQ entries.

STRICT RULES:
1. Only use information from the provided knowledge base context
2. If information isn't available, say "I don't have official information about that"
3. Always cite sources using [Source: FAQ #id] format
4. Stay focused on Adrullan - don't answer off-topic questions
5. Be helpful but concise
6. Never speculate or add unofficial information

RESPONSE FORMAT:
- Direct answer to the question
- Cite your sources
- If helpful, suggest where to ask follow-up questions (#general-discussion, #dev-updates)
```

## Environment & Dependencies

### `.env`
```env
DISCORD_TOKEN=your_discord_bot_token
ANTHROPIC_API_KEY=your_anthropic_api_key  
OPENAI_API_KEY=your_openai_key_for_embeddings
```

### `package.json`
```json
{
  "name": "adrullan-faq-bot",
  "version": "1.0.0",
  "dependencies": {
    "discord.js": "^14.14.1",
    "@anthropic-ai/sdk": "^0.17.1",
    "openai": "^4.26.0", 
    "chromadb": "^1.7.3",
    "dotenv": "^16.3.1"
  }
}
```

## Discord Commands

- `!ask <question>` - Get AI-powered answer from knowledge base
- `!index <channel_id>` - Generate clickable FAQ index from forum
- `!pinindex <channel_id>` - Generate and pin FAQ index

## Workflow

1. **Setup**: Run `node embed_faq.js` to build vector store from `/data/` files
2. **Runtime**: Bot monitors Discord for `!ask` commands
3. **Search**: User question gets embedded and searched against vector store  
4. **Context**: Top 5 relevant docs become context for Anthropic API
5. **Response**: API returns answer citing only provided sources
6. **Output**: Formatted response sent to Discord with source links

## Key Features

- **Locked Down**: Only answers from official knowledge base
- **Source Attribution**: Always cites where info comes from
- **Graceful Fallbacks**: Says "I don't know" instead of hallucinating  
- **Category Aware**: Understands mechanics vs lore vs systems
- **Community Friendly**: Suggests where to ask follow-ups