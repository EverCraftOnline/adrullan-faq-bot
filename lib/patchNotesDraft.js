/**
 * Patch Notes Draft Manager
 * Handles saving, loading, and updating draft patch notes
 */

const fs = require('fs');
const path = require('path');

const DRAFTS_DIR = path.join(__dirname, '..', 'data', 'patch-notes-drafts');

// Ensure drafts directory exists
if (!fs.existsSync(DRAFTS_DIR)) {
  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
}

module.exports = {
  /**
   * Save a draft patch note
   */
  saveDraft(version, data) {
    const draftPath = path.join(DRAFTS_DIR, `draft-${version}.json`);
    fs.writeFileSync(draftPath, JSON.stringify(data, null, 2), 'utf-8');
    return data;
  },

  /**
   * Load a draft by version
   */
  loadDraft(version) {
    const draftPath = path.join(DRAFTS_DIR, `draft-${version}.json`);
    if (!fs.existsSync(draftPath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(draftPath, 'utf-8'));
  },

  /**
   * List all drafts
   */
  listDrafts() {
    const files = fs.readdirSync(DRAFTS_DIR).filter(f => f.startsWith('draft-') && f.endsWith('.json'));
    return files.map(file => {
      const version = file.replace('draft-', '').replace('.json', '');
      const draft = this.loadDraft(version);
      return {
        version,
        ...draft
      };
    }).sort((a, b) => {
      // Sort by version (newest first)
      return b.version.localeCompare(a.version);
    });
  },

  /**
   * Delete a draft
   */
  deleteDraft(version) {
    const draftPath = path.join(DRAFTS_DIR, `draft-${version}.json`);
    if (fs.existsSync(draftPath)) {
      fs.unlinkSync(draftPath);
      return true;
    }
    return false;
  },

  /**
   * Update draft categories/notes
   */
  updateDraft(version, updates) {
    const draft = this.loadDraft(version);
    if (!draft) {
      return null;
    }

    // Update fields
    if (updates.categories) {
      draft.categories = updates.categories;
    }
    if (updates.version) {
      draft.version = updates.version;
    }

    // Regenerate HTML and Discord formats
    draft.html = this.generateHTML(draft.categories);
    draft.discord = this.generateDiscord(draft.categories);

    // Save updated draft
    this.saveDraft(version, draft);
    return draft;
  },

  /**
   * Generate HTML from categories
   */
  generateHTML(categories) {
    const sections = [];
    
    // Sort class notes alphabetically
    const processedCategories = { ...categories };
    if (processedCategories['Class']) {
      processedCategories['Class'].sort((a, b) => {
        const aClass = a.match(/^([A-Za-z]+):/)?.[1] || '';
        const bClass = b.match(/^([A-Za-z]+):/)?.[1] || '';
        return aClass.localeCompare(bClass);
      });
    }
    
    const categoryOrder = ['Content', 'Class', 'Systems', 'Interface', 'Crafting', 'Guilds', 'Bug Fixes'];
    const orderedCategories = {};
    
    // Add categories in order
    for (const cat of categoryOrder) {
      if (processedCategories[cat] && processedCategories[cat].length > 0) {
        orderedCategories[cat] = processedCategories[cat];
      }
    }
    
    // Add any remaining categories
    for (const cat in processedCategories) {
      if (!orderedCategories[cat] && processedCategories[cat].length > 0) {
        orderedCategories[cat] = processedCategories[cat];
      }
    }
    
    for (const category in orderedCategories) {
      const notes = orderedCategories[category];
      
      sections.push(`<div class="patch-header2">${category}</div>`);
      sections.push(`<div class="spacer-10"></div>`);
      
      for (const note of notes) {
        sections.push(`<div class="patch-note">- ${note}</div>`);
      }
      
      sections.push(`<div class="spacer-30"></div>`);
    }
    
    return sections.join('\n');
  },

  /**
   * Generate Discord markdown from categories
   */
  generateDiscord(categories) {
    const sections = [];
    
    // Sort class notes alphabetically
    const processedCategories = { ...categories };
    if (processedCategories['Class']) {
      processedCategories['Class'].sort((a, b) => {
        const aClass = a.match(/^([A-Za-z]+):/)?.[1] || '';
        const bClass = b.match(/^([A-Za-z]+):/)?.[1] || '';
        return aClass.localeCompare(bClass);
      });
    }
    
    const categoryOrder = ['Content', 'Class', 'Systems', 'Interface', 'Crafting', 'Guilds', 'Bug Fixes'];
    const orderedCategories = {};
    
    // Add categories in order
    for (const cat of categoryOrder) {
      if (processedCategories[cat] && processedCategories[cat].length > 0) {
        orderedCategories[cat] = processedCategories[cat];
      }
    }
    
    // Add any remaining categories
    for (const cat in processedCategories) {
      if (!orderedCategories[cat] && processedCategories[cat].length > 0) {
        orderedCategories[cat] = processedCategories[cat];
      }
    }
    
    for (const category in orderedCategories) {
      const notes = orderedCategories[category];
      
      sections.push(`**${category}**`);
      
      for (const note of notes) {
        sections.push(`- ${note}`);
      }
      
      sections.push(''); // Empty line between categories
    }
    
    return sections.join('\n');
  }
};

