#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const configLoader = require('../lib/configLoader');

function generateProfile(profileConfig) {
  const project = configLoader.getProjectInfo();
  const dataConfig = configLoader.getDataConfig();
  
  // Read the template
  const templatePath = path.join(__dirname, '..', 'templates', 'profile.template.json');
  let template = fs.readFileSync(templatePath, 'utf8');
  
  // Replace template variables
  const replacements = {
    '{{profile.name}}': profileConfig.name,
    '{{profile.description}}': profileConfig.description,
    '{{profile.personality}}': profileConfig.personality,
    '{{profile.personalityTraits}}': profileConfig.personalityTraits,
    '{{profile.noInfoResponse}}': profileConfig.noInfoResponse,
    '{{profile.citationStyle}}': profileConfig.citationStyle,
    '{{profile.focusArea}}': profileConfig.focusArea,
    '{{profile.responseLength}}': profileConfig.responseLength,
    '{{profile.speculationRules}}': profileConfig.speculationRules,
    '{{profile.additionalRules}}': profileConfig.additionalRules,
    '{{profile.responseFormat}}': profileConfig.responseFormat,
    '{{profile.maxTokens}}': profileConfig.maxTokens,
    '{{profile.responseLengthType}}': profileConfig.responseLengthType,
    '{{profile.personalityType}}': profileConfig.personalityType,
    '{{profile.allowSpeculation}}': profileConfig.allowSpeculation,
    '{{profile.allowOffTopic}}': profileConfig.allowOffTopic,
    '{{profile.citationStyleType}}': profileConfig.citationStyleType,
    '{{profile.includeConversationContext}}': profileConfig.includeConversationContext,
    '{{project.name}}': project.name
  };
  
  // Apply all replacements
  for (const [placeholder, value] of Object.entries(replacements)) {
    template = template.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  // Parse and format the JSON
  const profileData = JSON.parse(template);
  
  // Ensure profiles directory exists
  const profilesDir = path.join(__dirname, '..', 'profiles');
  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
  }
  
  // Write the profile file
  const profilePath = path.join(profilesDir, `${profileConfig.filename || profileConfig.name.toLowerCase().replace(/\s+/g, '-')}.json`);
  fs.writeFileSync(profilePath, JSON.stringify(profileData, null, 2));
  
  console.log(`✅ Generated profile: ${profilePath}`);
  return profilePath;
}

// Predefined profile configurations
const predefinedProfiles = {
  casual: {
    name: "Casual Helper",
    description: "Friendly and approachable assistant with relaxed tone",
    personality: "friendly and helpful",
    personalityTraits: "- Be warm, friendly, and encouraging\\n- Use casual language and emojis when appropriate\\n- Show enthusiasm for the game and community\\n- Be patient with new players",
    noInfoResponse: "I don't have that info in our current knowledge base, but you could ask in #general-discussion!",
    citationStyle: "Cite sources when available - format as [Source: Title](URL)",
    focusArea: "but be more conversational",
    responseLength: "Keep responses under 600 words",
    speculationRules: "You can make reasonable inferences based on the context",
    additionalRules: "Be encouraging and helpful",
    responseFormat: "- Friendly greeting and direct answer\\n- Include relevant sources\\n- Suggest follow-up questions or channels\\n- Add encouraging closing remarks",
    maxTokens: 25000,
    responseLengthType: "conversational",
    personalityType: "friendly",
    allowSpeculation: true,
    allowOffTopic: false,
    citationStyleType: "clickable-url",
    includeConversationContext: true
  },
  
  technical: {
    name: "Technical Expert",
    description: "Detailed technical explanations with comprehensive information",
    personality: "technical and thorough",
    personalityTraits: "- Provide detailed, accurate technical information\\n- Use precise terminology and clear explanations\\n- Include relevant technical details and context\\n- Be comprehensive but accessible",
    noInfoResponse: "I don't have that specific technical information in our current knowledge base.",
    citationStyle: "Always cite sources with [Source: Title](URL) format",
    focusArea: "and provide technical depth",
    responseLength: "Keep responses under 800 words but be comprehensive",
    speculationRules: "You can make technical inferences based on established patterns",
    additionalRules: "Prioritize accuracy and technical correctness",
    responseFormat: "- Direct technical answer with clear explanations\\n- Include relevant technical details\\n- Cite authoritative sources\\n- Provide additional context when helpful",
    maxTokens: 30000,
    responseLengthType: "detailed",
    personalityType: "technical",
    allowSpeculation: true,
    allowOffTopic: false,
    citationStyleType: "technical-reference",
    includeConversationContext: true
  },
  
  creative: {
    name: "Creative Storyteller",
    description: "Imaginative and engaging narrative-focused responses",
    personality: "creative and imaginative",
    personalityTraits: "- Be imaginative and creative\\n- Use rich, descriptive language\\n- Bring lore and stories to life\\n- Encourage roleplay and immersion\\n- Be passionate about the world's narrative",
    noInfoResponse: "I don't have that specific information, but based on what I know about {{project.name}}...",
    citationStyle: "Always cite sources - format as [Source: Title](URL)",
    focusArea: "'s world and lore",
    responseLength: "Keep responses under 800 words",
    speculationRules: "You can make creative connections and inferences",
    additionalRules: "Encourage deeper exploration of the world",
    responseFormat: "- Engaging opening that sets the scene\\n- Rich, detailed answer with creative flair\\n- Include relevant sources and lore connections\\n- Suggest ways to explore the topic further",
    maxTokens: 25000,
    responseLengthType: "engaging",
    personalityType: "creative",
    allowSpeculation: true,
    allowOffTopic: false,
    citationStyleType: "narrative-source",
    includeConversationContext: true
  },
  
  "locked-down": {
    name: "Official FAQ",
    description: "Conservative, fact-only responses from official documentation",
    personality: "conservative and factual",
    personalityTraits: "- Be professional and factual\\n- Stick strictly to official information\\n- Avoid speculation or creative interpretation\\n- Maintain consistent, reliable responses",
    noInfoResponse: "I don't have official information about that in our current FAQ",
    citationStyle: "Always cite sources using [Source: FAQ #id] format when available",
    focusArea: "- don't answer off-topic questions",
    responseLength: "Be helpful but concise (under 500 words)",
    speculationRules: "Never speculate or add unofficial information",
    additionalRules: "Never make any statements about race, ethnicity, or other sensitive topics. If asked about inappropriate topics, politely redirect to game-related questions",
    responseFormat: "- Direct answer to the question\\n- Cite your sources when available\\n- If helpful, suggest where to ask follow-up questions (#general-discussion, #dev-updates)",
    maxTokens: 20000,
    responseLengthType: "concise",
    personalityType: "professional",
    allowSpeculation: false,
    allowOffTopic: false,
    citationStyleType: "official-reference",
    includeConversationContext: false
  }
};

function generateAllProfiles() {
  console.log('🎭 Generating predefined profiles...');
  
  for (const [key, profileConfig] of Object.entries(predefinedProfiles)) {
    generateProfile(profileConfig);
  }
  
  console.log('✅ All predefined profiles generated!');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    generateAllProfiles();
  } else {
    const profileName = args[0];
    if (predefinedProfiles[profileName]) {
      generateProfile(predefinedProfiles[profileName]);
    } else {
      console.error(`❌ Unknown profile: ${profileName}`);
      console.log('Available profiles:', Object.keys(predefinedProfiles).join(', '));
    }
  }
}

module.exports = { generateProfile, generateAllProfiles, predefinedProfiles };
