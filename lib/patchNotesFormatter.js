/**
 * Patch Notes Formatter
 * Generates HTML with images for publishing to Wix CMS
 * 
 * IMPORTANT: This uses the rawNoteToFormattedNote mapping as the source of truth
 * for which images belong to which notes. When images are moved in the editor,
 * the mapping is updated, and this function respects those changes.
 */

function generateHTMLWithImages(draft) {
  const sections = [];
  
  // Create mapping from formatted note text to images
  // This MUST respect the rawNoteToFormattedNote mapping as the source of truth
  const noteToImages = buildNoteToImagesMapping(draft);
  
  // Generate HTML sections
  for (const category in draft.categories) {
    sections.push(`<div class="patch-header2">${category}</div>`);
    sections.push(`<div class="spacer-10"></div>`);
    
    for (const note of draft.categories[category]) {
      sections.push(`<div class="patch-note">- ${note}</div>`);
      
      // Add images if available
      if (noteToImages[note] && noteToImages[note].length > 0) {
        for (const image of noteToImages[note]) {
          const imageUrl = image.wixUrl || image.originalUrl;
          sections.push(`<div class="patch-image"><img src="${imageUrl}" alt="Patch note image" style="max-width: 100%; height: auto;" /></div>`);
        }
      }
    }
    
    sections.push(`<div class="spacer-30"></div>`);
  }
  
  return sections.join('\n');
}

/**
 * Build a mapping from formatted notes to images
 * Uses rawNoteToFormattedNote as the authoritative source
 */
function buildNoteToImagesMapping(draft) {
  const noteToImages = {};
  
  if (!draft.downloadedImages || !draft.rawNotes || !draft.rawNoteToFormattedNote) {
    return noteToImages;
  }
  
  // Build a map: rawNoteIndex -> images
  const rawNoteIndexToImages = {};
  for (const image of draft.downloadedImages) {
    const rawNoteIndex = image.noteIndex;
    if (!rawNoteIndexToImages[rawNoteIndex]) {
      rawNoteIndexToImages[rawNoteIndex] = [];
    }
    rawNoteIndexToImages[rawNoteIndex].push(image);
  }
  
  // Use rawNoteToFormattedNote mapping as source of truth
  // This mapping is updated when images are moved in the editor
  for (const formattedNote in draft.rawNoteToFormattedNote) {
    const rawNoteIndices = draft.rawNoteToFormattedNote[formattedNote];
    
    for (const rawNoteIndex of rawNoteIndices) {
      // Add images from this raw note
      if (rawNoteIndexToImages[rawNoteIndex]) {
        if (!noteToImages[formattedNote]) {
          noteToImages[formattedNote] = [];
        }
        noteToImages[formattedNote].push(...rawNoteIndexToImages[rawNoteIndex]);
      }
      
      // Also check next raw note for image-only messages
      const nextRawNoteIndex = rawNoteIndex + 1;
      if (rawNoteIndexToImages[nextRawNoteIndex]) {
        const nextRawNote = draft.rawNotes[nextRawNoteIndex];
        // If next message has no content (image-only), it belongs to this note
        if (nextRawNote && (!nextRawNote.content || !nextRawNote.content.trim())) {
          if (!noteToImages[formattedNote]) {
            noteToImages[formattedNote] = [];
          }
          noteToImages[formattedNote].push(...rawNoteIndexToImages[nextRawNoteIndex]);
        }
      }
    }
  }
  
  // Deduplicate images per note
  for (const formattedNote in noteToImages) {
    const uniqueImages = [];
    const seenUrls = new Set();
    
    for (const image of noteToImages[formattedNote]) {
      const imageUrl = image.wixUrl || image.originalUrl;
      if (!seenUrls.has(imageUrl)) {
        seenUrls.add(imageUrl);
        uniqueImages.push(image);
      }
    }
    
    noteToImages[formattedNote] = uniqueImages;
  }
  
  return noteToImages;
}

module.exports = {
  generateHTMLWithImages
};
