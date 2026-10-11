const path = require('path');
const fs = require('fs');

/**
 * Script to recover lost image references in patch notes drafts
 * Matches existing image files to messages and reconstructs downloadedImages array
 */

const DRAFTS_DIR = path.join(__dirname, '..', 'data', 'patch-notes-drafts');
const IMAGES_DIR = path.join(__dirname, '..', 'data', 'patch-notes-images');

async function recoverImages(version) {
  console.log(`\n🔄 Recovering image references for version ${version}...\n`);
  
  // Load draft
  const draftPath = path.join(DRAFTS_DIR, `draft-${version}.json`);
  if (!fs.existsSync(draftPath)) {
    console.error(`❌ Draft not found: ${draftPath}`);
    return;
  }
  
  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf-8'));
  
  // Check if images directory exists
  const versionImagesDir = path.join(IMAGES_DIR, version);
  if (!fs.existsSync(versionImagesDir)) {
    console.log(`ℹ️  No images directory found for version ${version}`);
    return;
  }
  
  // Get all image files
  const imageFiles = fs.readdirSync(versionImagesDir)
    .filter(file => /\.(png|jpg|jpeg|gif|webp)$/i.test(file))
    .map(file => ({
      filename: file,
      fullPath: path.join(versionImagesDir, file),
      attachmentId: file.replace(/\.[^.]+$/, '') // Remove extension
    }));
  
  if (imageFiles.length === 0) {
    console.log(`ℹ️  No image files found in ${versionImagesDir}`);
    return;
  }
  
  console.log(`📸 Found ${imageFiles.length} image file(s) on disk\n`);
  
  // Find messages with empty content (likely image-only messages)
  const emptyMessages = draft.rawNotes
    .map((note, index) => ({ ...note, noteIndex: index }))
    .filter(note => !note.content || note.content.trim() === '');
  
  console.log(`📝 Found ${emptyMessages.length} message(s) with empty content\n`);
  
  // Match images to messages
  const recoveredImages = [];
  
  for (const imageFile of imageFiles) {
    // Try to match by messageId (attachment IDs share the same timestamp prefix)
    let matchedMessage = null;
    let bestMatch = null;
    let bestScore = Infinity;
    
    // Discord IDs are snowflakes - first ~10 digits are the timestamp
    // Attachment IDs and message IDs from the same time share this prefix
    const attachmentPrefix = imageFile.attachmentId.substring(0, 10);
    
    for (const msg of emptyMessages) {
      const msgPrefix = msg.messageId.substring(0, 10);
      
      // If prefixes match, they're from the same time period
      if (msgPrefix === attachmentPrefix) {
        matchedMessage = msg;
        break;
      }
      
      // Also try numeric difference as fallback
      const msgIdNum = parseInt(msg.messageId);
      const attachmentIdNum = parseInt(imageFile.attachmentId);
      const diff = Math.abs(msgIdNum - attachmentIdNum);
      
      // Discord IDs are usually within a reasonable range of each other
      if (diff < 1000000 && diff < bestScore) {
        bestScore = diff;
        bestMatch = msg;
      }
    }
    
    // Use prefix match if found, otherwise use best numeric match
    if (!matchedMessage && bestMatch) {
      matchedMessage = bestMatch;
    }
    
    if (!matchedMessage) {
      console.log(`⚠️  Could not match image ${imageFile.filename} to any message`);
      continue;
    }
    
    // Image dimensions - will be null since we don't have the original metadata
    // These can be filled in later if needed, but aren't critical for recovery
    const width = null;
    const height = null;
    
    // Reconstruct image entry
    const imageEntry = {
      originalUrl: `https://cdn.discordapp.com/attachments/988344623028137995/${imageFile.attachmentId}/${imageFile.filename}`, // Reconstructed URL
      localPath: `patch-notes-images/${version}/${imageFile.filename}`,
      filename: imageFile.filename,
      messageId: matchedMessage.messageId,
      attachmentId: imageFile.attachmentId,
      noteIndex: matchedMessage.noteIndex,
      width: width,
      height: height,
      recovered: true // Flag to indicate this was recovered
    };
    
    recoveredImages.push(imageEntry);
    console.log(`✅ Matched ${imageFile.filename} to message ${matchedMessage.messageId} (noteIndex: ${matchedMessage.noteIndex})`);
  }
  
  if (recoveredImages.length === 0) {
    console.log('\n❌ No images could be matched to messages');
    return;
  }
  
  // Update draft
  console.log(`\n📝 Updating draft with ${recoveredImages.length} recovered image reference(s)...`);
  
  // Merge with existing images (if any) to avoid duplicates
  const existingImages = draft.downloadedImages || [];
  const existingAttachmentIds = new Set(existingImages.map(img => img.attachmentId));
  
  for (const recovered of recoveredImages) {
    if (!existingAttachmentIds.has(recovered.attachmentId)) {
      existingImages.push(recovered);
    }
  }
  
  draft.downloadedImages = existingImages;
  draft.imageCount = draft.downloadedImages.length;
  draft.withImages = draft.downloadedImages.length > 0;
  draft.updated = new Date().toISOString();
  
  // Save updated draft
  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));
  
  console.log(`\n✅ Draft updated successfully!`);
  console.log(`   📸 Total images: ${draft.downloadedImages.length}`);
  console.log(`   💾 Draft saved: ${draftPath}\n`);
}

async function main() {
  const version = process.argv[2];
  
  if (!version) {
    console.log('Usage: node recoverImageReferences.js <version>');
    console.log('Example: node recoverImageReferences.js 0.10.44');
    console.log('\nAvailable versions:');
    
    const drafts = fs.readdirSync(DRAFTS_DIR);
    drafts.forEach(file => {
      if (file.startsWith('draft-') && file.endsWith('.json')) {
        const v = file.replace('draft-', '').replace('.json', '');
        console.log(`  - ${v}`);
      }
    });
    
    process.exit(0);
  }
  
  try {
    await recoverImages(version);
    console.log('✨ Done!\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

