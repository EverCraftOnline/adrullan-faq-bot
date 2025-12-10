/**
 * Patch Notes Formatter
 * Formats Discord patch notes according to the formatting guide
 */

class PatchNotesFormatter {
  constructor() {
    this.categories = ['Content', 'Class', 'Systems', 'Interface', 'Crafting', 'Guilds', 'Bug Fixes'];
  }

  /**
   * Formats raw Discord messages into structured patch notes
   */
  formatPatchNotes(messages, version) {
    const notes = this.parseMessages(messages);
    const categorized = this.categorizeNotes(notes);
    const formatted = this.formatCategories(categorized);
    
    return {
      version,
      discord: this.formatDiscord(formatted),
      html: this.formatHTML(formatted),
      raw: categorized
    };
  }

  /**
   * Parse messages and extract patch note content
   */
  parseMessages(messages) {
    const notes = [];
    let currentCategory = 'Content'; // Default category
    
    for (const msg of messages) {
      // Skip version posts and "reserve" messages
      if (this.isVersionPost(msg.content) || msg.content.toLowerCase().trim() === 'reserve') {
        continue;
      }
      
      const content = msg.content.trim();
      if (!content) continue;
      
      // Check if this is a category header (e.g., "Content:", "Crafting:", "Bug Fixes:")
      const categoryMatch = content.match(/^([A-Za-z\s/]+):\s*$/);
      if (categoryMatch) {
        // This is a category header, update current category
        currentCategory = this.normalizeCategory(categoryMatch[1].trim());
        continue;
      }
      
      // Check if line contains category and note (e.g., "Content: Some note")
      const categoryWithNoteMatch = content.match(/^([A-Za-z\s/]+):\s*(.+)$/);
      if (categoryWithNoteMatch) {
        const category = this.normalizeCategory(categoryWithNoteMatch[1].trim());
        const noteText = categoryWithNoteMatch[2].trim();
        
        if (noteText) {
          notes.push({
            category,
            text: noteText,
            author: msg.author.username
          });
        }
        currentCategory = category; // Update for subsequent notes
        continue;
      }
      
      // Check if it's a class change (e.g., "Warrior: ...")
      const classMatch = content.match(/^([A-Za-z]+):\s*(.+)$/);
      if (classMatch) {
        notes.push({
          category: 'Class',
          text: content,
          author: msg.author.username
        });
        continue;
      }
      
      // Regular note - use current category
      // Handle multi-line notes
      const lines = content.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          notes.push({
            category: currentCategory,
            text: trimmed,
            author: msg.author.username
          });
        }
      }
    }
    
    return notes;
  }

  /**
   * Categorize notes and apply formatting rules
   */
  categorizeNotes(notes) {
    const categorized = {};
    
    for (const note of notes) {
      const category = note.category || 'Content';
      
      if (!categorized[category]) {
        categorized[category] = [];
      }
      
      // Format the note text
      const formatted = this.formatNoteText(note.text, category);
      
      // Split multi-line notes if needed
      const lines = formatted.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        if (line.trim()) {
          categorized[category].push(line.trim());
        }
      }
    }
    
    return categorized;
  }

  /**
   * Format note text according to rules
   */
  formatNoteText(text, category) {
    // Remove author mentions, timestamps, etc.
    let formatted = text
      .replace(/<@!?\d+>/g, '') // Remove user mentions
      .replace(/<#[!?]\d+>/g, '') // Remove channel mentions
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs (keep text)
      .trim();
    
    // Apply Headline Case
    formatted = this.toHeadlineCase(formatted);
    
    // Remove unnecessary words and make brief
    formatted = this.makeBrief(formatted);
    
    // Fix common typos
    formatted = formatted
      .replace(/incomming/gi, 'Incoming')
      .replace(/to high/gi, 'Too High')
      .replace(/it's/gi, "It's")
      .replace(/won't/gi, "Won't");
    
    return formatted;
  }

  /**
   * Convert to Headline Case
   */
  toHeadlineCase(text) {
    // Don't change if it starts with a class name (e.g., "Warrior: ...")
    if (text.match(/^[A-Z][a-z]+:\s/)) {
      const parts = text.split(':');
      const className = parts[0];
      const rest = parts.slice(1).join(':').trim();
      return className + ': ' + this.toHeadlineCase(rest);
    }
    
    // Split into words
    const words = text.split(/\s+/);
    const articles = ['a', 'an', 'the'];
    const conjunctions = ['and', 'but', 'or', 'nor', 'for', 'so', 'yet'];
    const prepositions = ['in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is'];
    const lowercaseWords = [...articles, ...conjunctions, ...prepositions];
    
    return words.map((word, index) => {
      // Always capitalize first word
      if (index === 0) {
        return this.capitalizeWord(word);
      }
      
      // Lowercase articles, conjunctions, prepositions (unless they're important)
      if (lowercaseWords.includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      
      return this.capitalizeWord(word);
    }).join(' ');
  }

  /**
   * Capitalize a single word
   */
  capitalizeWord(word) {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  /**
   * Make text brief - remove unnecessary words
   */
  makeBrief(text) {
    // Remove common filler phrases
    const removals = [
      /^the\s+/i,
      /^a\s+/i,
      /^an\s+/i,
      /\s+that\s+was\s+/gi,
      /\s+that\s+is\s+/gi,
      /\s+that\s+are\s+/gi,
      /\s+which\s+was\s+/gi,
      /\s+which\s+is\s+/gi,
    ];
    
    let brief = text;
    for (const pattern of removals) {
      brief = brief.replace(pattern, ' ');
    }
    
    // Clean up extra spaces
    brief = brief.replace(/\s+/g, ' ').trim();
    
    return brief;
  }

  /**
   * Normalize category names
   */
  normalizeCategory(category) {
    const normalized = category.trim();
    
    // Map variations to standard categories
    const categoryMap = {
      'UI/Chat': 'Interface',
      'UI': 'Interface',
      'Chat': 'Interface',
      'Bugs': 'Bug Fixes',
      'Bug': 'Bug Fixes',
      'System': 'Systems',
      'Content': 'Content',
      'Class': 'Class',
      'Crafting': 'Crafting',
      'Guilds': 'Guilds',
      'Guild': 'Guilds'
    };
    
    return categoryMap[normalized] || normalized;
  }

  /**
   * Format categories in order
   */
  formatCategories(categorized) {
    const ordered = {};
    
    // Add categories in standard order
    for (const category of this.categories) {
      if (categorized[category] && categorized[category].length > 0) {
        ordered[category] = categorized[category];
      }
    }
    
    // Add any remaining categories
    for (const category in categorized) {
      if (!ordered[category] && categorized[category].length > 0) {
        ordered[category] = categorized[category];
      }
    }
    
    return ordered;
  }

  /**
   * Format for Discord (with markdown)
   */
  formatDiscord(categorized) {
    const sections = [];
    
    for (const category in categorized) {
      const notes = categorized[category];
      
      // Sort class notes alphabetically
      if (category === 'Class') {
        notes.sort((a, b) => {
          const aClass = a.match(/^([A-Za-z]+):/)?.[1] || '';
          const bClass = b.match(/^([A-Za-z]+):/)?.[1] || '';
          return aClass.localeCompare(bClass);
        });
      }
      
      sections.push(`**${category}**`);
      
      for (const note of notes) {
        sections.push(`- ${note}`);
      }
      
      sections.push(''); // Empty line between categories
    }
    
    return sections.join('\n');
  }

  /**
   * Format for HTML (Wix import)
   */
  formatHTML(categorized) {
    const sections = [];
    
    for (const category in categorized) {
      const notes = categorized[category];
      
      // Sort class notes alphabetically
      if (category === 'Class') {
        notes.sort((a, b) => {
          const aClass = a.match(/^([A-Za-z]+):/)?.[1] || '';
          const bClass = b.match(/^([A-Za-z]+):/)?.[1] || '';
          return aClass.localeCompare(bClass);
        });
      }
      
      sections.push(`<div class="patch-header2">${category}</div>`);
      sections.push(`<div class="spacer-10"></div>`);
      
      for (const note of notes) {
        sections.push(`<div class="patch-note">- ${note}</div>`);
      }
      
      sections.push(`<div class="spacer-30"></div>`);
    }
    
    return sections.join('\n');
  }

  /**
   * Check if message is a version post
   */
  isVersionPost(content) {
    // Match version patterns like "0.10.43", "Patch 0.10.43", etc.
    return /^(patch\s+)?\d+\.\d+\.\d+/i.test(content.trim());
  }

  /**
   * Split Discord message if too long (2000 char limit)
   */
  splitDiscordMessage(formattedText, maxLength = 1900) {
    const sections = formattedText.split('\n\n');
    const messages = [];
    let currentMessage = '';
    
    for (const section of sections) {
      if (currentMessage.length + section.length + 2 > maxLength) {
        if (currentMessage) {
          messages.push(currentMessage.trim());
          currentMessage = '';
        }
        
        // If single section is too long, split it
        if (section.length > maxLength) {
          const lines = section.split('\n');
          let currentChunk = '';
          
          for (const line of lines) {
            if (currentChunk.length + line.length + 1 > maxLength) {
              if (currentChunk) {
                messages.push(currentChunk.trim());
                currentChunk = '';
              }
            }
            currentChunk += (currentChunk ? '\n' : '') + line;
          }
          
          if (currentChunk) {
            currentMessage = currentChunk;
          }
        } else {
          currentMessage = section;
        }
      } else {
        currentMessage += (currentMessage ? '\n\n' : '') + section;
      }
    }
    
    if (currentMessage) {
      messages.push(currentMessage.trim());
    }
    
    return messages;
  }
}

module.exports = new PatchNotesFormatter();

