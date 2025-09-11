# Bot Profile System

The bot now supports multiple personality profiles that can be switched on the fly by administrators. This allows you to adjust the bot's behavior, tone, and response style without modifying code.

## Available Commands

### `!profile list`
Lists all available profiles with their descriptions and shows which one is currently active.

### `!profile current`
Shows detailed information about the currently active profile.

### `!profile switch <name>`
Switches to a different profile. Changes take effect immediately for all future `!ask` and `!askall` commands.

### `!profile info <name>`
Shows detailed information about a specific profile.

### `!profile create <name> <description>`
Creates a new custom profile (basic implementation).

### `!profile delete <name>`
Deletes a custom profile (cannot delete the default "locked-down" profile).

### `!profile init`
Initializes all default profiles if they don't exist.

## Default Profiles

### 1. **Locked Down** (Default)
- **Description**: Strict FAQ assistant with locked-down responses
- **Personality**: Professional, strict, safety-focused
- **Use Case**: Official support, when you need very controlled responses
- **Features**: 
  - Only uses official information
  - No speculation allowed
  - Concise responses (under 500 words)
  - FAQ-style citations

### 2. **Casual Helper**
- **Description**: Friendly and approachable assistant with relaxed tone
- **Personality**: Warm, encouraging, enthusiastic
- **Use Case**: Community interaction, helping new players
- **Features**:
  - Casual language and emojis
  - Encouraging tone
  - Allows reasonable inferences
  - Conversational responses (under 600 words)

### 3. **Creative Storyteller**
- **Description**: Imaginative assistant that brings lore to life with creative flair
- **Personality**: Imaginative, passionate, engaging
- **Use Case**: Lore discussions, roleplay, world-building
- **Features**:
  - Rich, descriptive language
  - Creative connections and inferences
  - Detailed responses (under 800 words)
  - Encourages deeper exploration

### 4. **Technical Expert**
- **Description**: Precise and detailed assistant focused on game mechanics
- **Personality**: Methodical, precise, thorough
- **Use Case**: Game mechanics, technical questions, detailed explanations
- **Features**:
  - Technical language when appropriate
  - Step-by-step explanations
  - Comprehensive responses (under 1000 words)
  - Logical deductions based on data

## Profile Structure

Each profile contains:
- **name**: Display name for the profile
- **description**: Brief description of the profile's purpose
- **systemPrompt**: The AI system prompt that defines behavior
- **maxTokens**: Maximum token limit for context
- **responseLength**: Target response length (concise, conversational, detailed, comprehensive)
- **personality**: Personality type (professional, friendly, creative, technical, custom)
- **allowSpeculation**: Whether the bot can make inferences beyond strict facts
- **allowOffTopic**: Whether the bot can answer non-game questions
- **citationStyle**: How to format citations (faq-id, clickable-url)

## Usage Examples

```
!profile switch casual
!ask What's the best way to level up?

!profile switch creative
!ask Tell me about the world of Adrullan

!profile switch technical
!ask How does the combat system work?

!profile switch locked-down
!ask What are the server rules?
```

## Admin Permissions

The profile system is restricted to administrators only, using the same permission system as the `!stats` command:
- Users with Administrator permission
- User ID: 146495555760160769
- Users with "Designer" role

## File Structure

- `lib/profileManager.js` - Core profile management system
- `commands/profileCommand.js` - Discord command handler
- `profiles/` - Directory containing profile JSON files
  - `locked-down.json` - Default strict profile
  - `casual.json` - Friendly profile
  - `creative.json` - Storytelling profile
  - `technical.json` - Technical expert profile

## Creating Custom Profiles

You can create custom profiles by:
1. Using `!profile create <name> <description>` for a basic profile
2. Manually editing the JSON file in the `profiles/` directory
3. Restarting the bot to load the new profile

The profile system will automatically load all `.json` files from the `profiles/` directory on startup.

