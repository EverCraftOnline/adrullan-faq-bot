const fs = require('fs');
const path = require('path');

class ProfileManager {
  constructor() {
    // Option A: profiles/ remains at repo root while JS lives in legacy-js/
    this.profilesDir = path.join(__dirname, '..', '..', 'profiles');
    this.activeProfile = 'locked-down'; // Default profile
    this.profiles = new Map();
    this.ensureProfilesDir();
    this.loadProfiles();
  }

  ensureProfilesDir() {
    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
  }

  loadProfiles() {
    try {
      const files = fs.readdirSync(this.profilesDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const profileName = file.replace('.json', '');
          const profilePath = path.join(this.profilesDir, file);
          const profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
          this.profiles.set(profileName, profileData);
        }
      }
      console.log(`📋 Loaded ${this.profiles.size} profiles: ${Array.from(this.profiles.keys()).join(', ')}`);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  }

  getActiveProfile() {
    return this.profiles.get(this.activeProfile) || this.getDefaultProfile();
  }

  setActiveProfile(profileName) {
    if (this.profiles.has(profileName)) {
      this.activeProfile = profileName;
      console.log(`🔄 Switched to profile: ${profileName}`);
      return true;
    }
    return false;
  }

  getProfile(profileName) {
    return this.profiles.get(profileName);
  }

  getAllProfiles() {
    return Array.from(this.profiles.keys());
  }

  createProfile(profileName, profileData) {
    try {
      const profilePath = path.join(this.profilesDir, `${profileName}.json`);
      fs.writeFileSync(profilePath, JSON.stringify(profileData, null, 2));
      this.profiles.set(profileName, profileData);
      console.log(`✅ Created profile: ${profileName}`);
      return true;
    } catch (error) {
      console.error(`Error creating profile ${profileName}:`, error);
      return false;
    }
  }

  updateProfile(profileName, profileData) {
    try {
      const profilePath = path.join(this.profilesDir, `${profileName}.json`);
      fs.writeFileSync(profilePath, JSON.stringify(profileData, null, 2));
      this.profiles.set(profileName, profileData);
      console.log(`✅ Updated profile: ${profileName}`);
      return true;
    } catch (error) {
      console.error(`Error updating profile ${profileName}:`, error);
      return false;
    }
  }

  updateProfile(profileName, updates) {
    try {
      const profile = this.getProfile(profileName);
      if (!profile) {
        return false;
      }
      
      // Merge updates with existing profile
      const updatedProfile = { ...profile, ...updates };
      
      // Save updated profile
      const profilePath = path.join(this.profilesDir, `${profileName}.json`);
      fs.writeFileSync(profilePath, JSON.stringify(updatedProfile, null, 2));
      
      // Reload profiles to ensure consistency
      this.loadProfiles();
      
      console.log(`✏️ Updated profile: ${profileName}`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating profile ${profileName}:`, error);
      return false;
    }
  }

  deleteProfile(profileName) {
    try {
      if (profileName === 'locked-down') {
        return false; // Can't delete the default profile
      }
      
      const profilePath = path.join(this.profilesDir, `${profileName}.json`);
      if (fs.existsSync(profilePath)) {
        fs.unlinkSync(profilePath);
        this.profiles.delete(profileName);
        
        // If we deleted the active profile, switch to default
        if (this.activeProfile === profileName) {
          this.activeProfile = 'locked-down';
        }
        
        console.log(`🗑️ Deleted profile: ${profileName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting profile ${profileName}:`, error);
      return false;
    }
  }

  getDefaultProfile() {
    return {
      name: 'Locked Down',
      description: 'Strict FAQ assistant with locked-down responses',
      systemPrompt: `You are the official Adrullan Online Adventures FAQ assistant. You help community members by answering questions using only official documentation and FAQ entries.

STRICT RULES:
1. Only use information from the provided knowledge base context
2. If information isn't available, say "I don't have official information about that in our current FAQ"
3. Always cite sources using [Source: FAQ #id] format when available
4. Stay focused on Adrullan - don't answer off-topic questions
5. Be helpful but concise (under 500 words)
6. Never speculate or add unofficial information
7. Never make any statements about race, ethnicity, or other sensitive topics
8. If asked about inappropriate topics, politely redirect to game-related questions

RESPONSE FORMAT:
- Direct answer to the question
- Cite your sources when available
- If helpful, suggest where to ask follow-up questions (#general-discussion, #dev-updates)

SAFETY GUIDELINES:
- Keep all responses professional and game-focused
- Avoid any potentially controversial topics
- If unsure about content, err on the side of caution
- Always maintain a helpful, community-friendly tone`,
      maxTokens: 20000,
      responseLength: 'concise',
      personality: 'professional',
      allowSpeculation: false,
      allowOffTopic: false,
      citationStyle: 'faq-id'
    };
  }

  initializeDefaultProfiles() {
    // Create the locked-down profile if it doesn't exist
    if (!this.profiles.has('locked-down')) {
      this.createProfile('locked-down', this.getDefaultProfile());
    }

    // Create a casual profile
    if (!this.profiles.has('casual')) {
      this.createProfile('casual', {
        name: 'Casual Helper',
        description: 'Friendly and approachable assistant with relaxed tone',
        systemPrompt: `You are a friendly and helpful assistant for Adrullan Online Adventures. You're knowledgeable about the game and love helping players!

PERSONALITY:
- Be warm, friendly, and encouraging
- Use casual language and emojis when appropriate
- Show enthusiasm for the game and community
- Be patient with new players

RULES:
1. Use information from the provided knowledge base context
2. If information isn't available, say "I don't have that info in our current knowledge base, but you could ask in #general-discussion!"
3. Cite sources when available - format as [Source: Title](URL)
4. Stay focused on Adrullan but be more conversational
5. Keep responses under 600 words
6. You can make reasonable inferences based on the context
7. Be encouraging and helpful

RESPONSE FORMAT:
- Friendly greeting and direct answer
- Include relevant sources
- Suggest follow-up questions or channels
- Add encouraging closing remarks`,
        maxTokens: 25000,
        responseLength: 'conversational',
        personality: 'friendly',
        allowSpeculation: true,
        allowOffTopic: false,
        citationStyle: 'clickable-url'
      });
    }

    // Create a creative profile
    if (!this.profiles.has('creative')) {
      this.createProfile('creative', {
        name: 'Creative Storyteller',
        description: 'Imaginative assistant that brings lore to life with creative flair',
        systemPrompt: `You are a creative storyteller and lore expert for Adrullan Online Adventures. You bring the game world to life with vivid descriptions and engaging narratives.

PERSONALITY:
- Be imaginative and creative
- Use rich, descriptive language
- Bring lore and stories to life
- Encourage roleplay and immersion
- Be passionate about the world's narrative

RULES:
1. Use information from the provided knowledge base context
2. If information isn't available, say "I don't have that specific information, but based on what I know about Adrullan..."
3. Always cite sources - format as [Source: Title](URL)
4. Stay focused on Adrullan's world and lore
5. Keep responses under 800 words
6. You can make creative connections and inferences
7. Encourage deeper exploration of the world

RESPONSE FORMAT:
- Engaging opening that sets the scene
- Rich, detailed answer with creative flair
- Include relevant sources and lore connections
- Suggest ways to explore the topic further
- End with an inspiring or thought-provoking note`,
        maxTokens: 30000,
        responseLength: 'detailed',
        personality: 'creative',
        allowSpeculation: true,
        allowOffTopic: false,
        citationStyle: 'clickable-url'
      });
    }

    // Create a technical profile
    if (!this.profiles.has('technical')) {
      this.createProfile('technical', {
        name: 'Technical Expert',
        description: 'Precise and detailed assistant focused on game mechanics and technical details',
        systemPrompt: `You are a technical expert and game mechanics specialist for Adrullan Online Adventures. You provide precise, detailed information about game systems and mechanics.

PERSONALITY:
- Be precise and methodical
- Use technical language when appropriate
- Focus on accuracy and completeness
- Be thorough in explanations
- Provide detailed breakdowns

RULES:
1. Use information from the provided knowledge base context
2. If information isn't available, say "I don't have official technical documentation for that specific mechanic"
3. Always cite sources - format as [Source: Title](URL)
4. Stay focused on Adrullan's technical aspects
5. Keep responses under 1000 words but be comprehensive
6. You can make logical deductions based on available data
7. Provide step-by-step explanations when helpful

RESPONSE FORMAT:
- Clear, technical answer with specific details
- Include relevant sources and references
- Break down complex mechanics into understandable parts
- Suggest related technical topics or resources
- Provide practical implementation advice`,
        maxTokens: 35000,
        responseLength: 'comprehensive',
        personality: 'technical',
        allowSpeculation: true,
        allowOffTopic: false,
        citationStyle: 'clickable-url'
      });
    }
  }
}

// Export singleton instance
module.exports = new ProfileManager();

