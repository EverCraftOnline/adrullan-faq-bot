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
    if (updates.rawNoteToFormattedNote) {
      // Allow manual mapping updates from editor
      draft.rawNoteToFormattedNote = updates.rawNoteToFormattedNote;
    }
    if (updates.categories) {
      // Smart mapping update: preserve existing mappings where possible
      const oldCategories = draft.categories || {};
      const newCategories = updates.categories;
      
      // Create a mapping from old note text to new note text (for edited notes)
      const noteTextMapping = {};
      const allOldNotes = [];
      const allNewNotes = [];
      
      // Collect all old and new notes
      for (const category in oldCategories) {
        for (const note of oldCategories[category]) {
          allOldNotes.push(note);
        }
      }
      for (const category in newCategories) {
        for (const note of newCategories[category]) {
          allNewNotes.push(note);
        }
      }
      
      // Try to match old notes to new notes (to preserve mappings for edited notes)
      for (const oldNote of allOldNotes) {
        let bestMatch = null;
        let bestScore = 0;
        
        for (const newNote of allNewNotes) {
          const oldLower = oldNote.toLowerCase().trim();
          const newLower = newNote.toLowerCase().trim();
          
          // Check similarity
          const oldWords = oldLower.split(/\s+/).filter(w => w.length > 2);
          let score = 0;
          for (const word of oldWords.slice(0, 6)) {
            if (newLower.includes(word)) {
              score++;
            }
          }
          
          // Strong match if substantial overlap
          if (oldLower.includes(newLower.substring(0, 30)) || 
              newLower.includes(oldLower.substring(0, 30))) {
            score += 5;
          }
          
          // Lower threshold - even 2 matching words is enough for edited notes
          if (score > bestScore && score >= 2) {
            bestScore = score;
            bestMatch = newNote;
          }
        }
        
        if (bestMatch) {
          noteTextMapping[oldNote] = bestMatch;
        }
      }
      
      // Update categories
      draft.categories = newCategories;
      
      // Update mapping: preserve mappings for notes that still exist (even if edited)
      if (draft.rawNoteToFormattedNote && draft.rawNotes && draft.rawNotes.length > 0) {
        const newMapping = {};
        
        // First, try to preserve existing mappings by matching old note text to new note text
        for (const oldNoteText in draft.rawNoteToFormattedNote) {
          const rawNoteIndices = draft.rawNoteToFormattedNote[oldNoteText];
          
          // Check if this old note maps to a new note
          if (noteTextMapping[oldNoteText]) {
            const newNoteText = noteTextMapping[oldNoteText];
            newMapping[newNoteText] = rawNoteIndices;
          } else {
            // Old note doesn't exist anymore, but raw notes might still match new notes
            // We'll regenerate for unmatched notes below
          }
        }
        
        // Now regenerate mapping for any new notes that don't have mappings yet
        const regeneratedMapping = this.createRawToFormattedMapping(draft.rawNotes, newCategories);
        
        // Merge: use preserved mappings where available, otherwise use regenerated
        for (const formattedNote in regeneratedMapping) {
          // Only add if we don't already have a mapping for this note
          if (!newMapping[formattedNote]) {
            newMapping[formattedNote] = regeneratedMapping[formattedNote];
          }
        }
        
        draft.rawNoteToFormattedNote = newMapping;
      } else if (draft.rawNotes && draft.rawNotes.length > 0) {
        // No existing mapping, create new one
        draft.rawNoteToFormattedNote = this.createRawToFormattedMapping(draft.rawNotes, draft.categories);
      }
    }
    if (updates.version) {
      draft.version = updates.version;
    }

    // Regenerate HTML and Discord formats
    // Check if images should be included (default to false for updates)
    const includeImages = updates.includeImages !== undefined ? updates.includeImages : (draft.withImages || false);
    draft.html = this.generateHTML(draft.categories, includeImages, draft.downloadedImages || [], draft.rawNotes || []);
    draft.discord = this.generateDiscord(draft.categories);

    // Save updated draft
    this.saveDraft(version, draft);
    return draft;
  },

  /**
   * Generate HTML from categories
   */
  generateHTML(categories, includeImages = false, downloadedImages = [], rawNotes = []) {
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
    
    // Create a map of note content to images (for matching)
    const noteToImages = {};
    if (includeImages && downloadedImages && rawNotes) {
      for (const image of downloadedImages) {
        const noteIndex = image.noteIndex;
        if (rawNotes[noteIndex]) {
          const noteContent = rawNotes[noteIndex].content;
          if (!noteToImages[noteContent]) {
            noteToImages[noteContent] = [];
          }
          noteToImages[noteContent].push(image);
        }
      }
    }
    
    for (const category in orderedCategories) {
      const notes = orderedCategories[category];
      
      sections.push(`<div class="patch-header2">${category}</div>`);
      sections.push(`<div class="spacer-10"></div>`);
      
      for (const note of notes) {
        sections.push(`<div class="patch-note">- ${note}</div>`);
        
        // Add images if enabled and available (use Discord CDN URL for now)
        if (includeImages && noteToImages[note] && noteToImages[note].length > 0) {
          for (const image of noteToImages[note]) {
            // Use Discord CDN URL (originalUrl) - we'll update to local paths later
            sections.push(`<div class="patch-image"><img src="${image.originalUrl}" alt="Patch note image" style="max-width: 100%; height: auto;" /></div>`);
          }
        }
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
  },

  /**
   * Create mapping from raw note indices to formatted notes
   * Same logic as in patchNotesCommand.js
   */
  createRawToFormattedMapping(rawNotes, categories) {
    const mapping = {};
    const usedRawIndices = new Set();
    const usedFormattedNotes = new Set();
    
    const allFormattedNotes = [];
    for (const category in categories) {
      for (const note of categories[category]) {
        allFormattedNotes.push({ category, note });
      }
    }
    
    // First pass: one-to-one mapping
    for (let i = 0; i < rawNotes.length; i++) {
      if (usedRawIndices.has(i)) continue;
      
      const rawNote = rawNotes[i];
      const rawContent = rawNote.content.toLowerCase().trim();
      
      if (!rawContent) continue;
      
      let bestMatch = null;
      let bestScore = 0;
      
      for (const formatted of allFormattedNotes) {
        if (usedFormattedNotes.has(formatted.note)) {
          continue;
        }
        
        const formattedContent = formatted.note.toLowerCase().trim();
        const rawWords = rawContent.split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'was', 'were'].includes(w));
        
        let score = 0;
        for (const word of rawWords.slice(0, 6)) {
          if (formattedContent.includes(word)) {
            score++;
          }
        }
        
        if (formattedContent.includes(rawContent.substring(0, 50)) || 
            rawContent.includes(formattedContent.substring(0, 50))) {
          score += 10;
        } else if (formattedContent.includes(rawContent.substring(0, 30)) || 
                   rawContent.includes(formattedContent.substring(0, 30))) {
          score += 5;
        }
        
        const distinctiveWords = rawWords.filter(w => w.length > 4);
        for (const word of distinctiveWords) {
          if (formattedContent.includes(word)) {
            score += 2;
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = formatted;
        }
      }
      
      if (bestMatch && bestScore >= 4) {
        if (!mapping[bestMatch.note]) {
          mapping[bestMatch.note] = [];
        }
        mapping[bestMatch.note].push(i);
        usedRawIndices.add(i);
        usedFormattedNotes.add(bestMatch.note);
      }
    }
    
    // Second pass: allow duplicates with higher threshold
    for (let i = 0; i < rawNotes.length; i++) {
      if (usedRawIndices.has(i)) continue;
      
      const rawNote = rawNotes[i];
      const rawContent = rawNote.content.toLowerCase().trim();
      
      if (!rawContent) continue;
      
      let bestMatch = null;
      let bestScore = 0;
      
      for (const formatted of allFormattedNotes) {
        const formattedContent = formatted.note.toLowerCase().trim();
        const rawWords = rawContent.split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'for', 'was', 'were'].includes(w));
        
        let score = 0;
        for (const word of rawWords.slice(0, 6)) {
          if (formattedContent.includes(word)) {
            score++;
          }
        }
        
        if (formattedContent.includes(rawContent.substring(0, 50)) || 
            rawContent.includes(formattedContent.substring(0, 50))) {
          score += 10;
        } else if (formattedContent.includes(rawContent.substring(0, 30)) || 
                   rawContent.includes(formattedContent.substring(0, 30))) {
          score += 5;
        }
        
        const distinctiveWords = rawWords.filter(w => w.length > 4);
        for (const word of distinctiveWords) {
          if (formattedContent.includes(word)) {
            score += 2;
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = formatted;
        }
      }
      
      if (bestMatch && bestScore >= 6) {
        if (!mapping[bestMatch.note]) {
          mapping[bestMatch.note] = [];
        }
        mapping[bestMatch.note].push(i);
        usedRawIndices.add(i);
      }
    }
    
    return mapping;
  }
};

