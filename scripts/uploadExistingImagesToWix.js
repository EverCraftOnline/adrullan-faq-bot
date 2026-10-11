const path = require('path');
const fs = require('fs');
const WixMediaUploader = require('../lib/wixMediaUploader');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Script to retroactively upload existing patch notes images to Wix
 * Updates the draft JSON with Wix URLs
 */

const DRAFTS_DIR = path.join(__dirname, '..', 'data', 'patch-notes-drafts');
const IMAGES_DIR = path.join(__dirname, '..', 'data', 'patch-notes-images');

async function processVersion(version) {
  console.log(`\n🔄 Processing version ${version}...`);
  
  // Load draft
  const draftPath = path.join(DRAFTS_DIR, `draft-${version}.json`);
  if (!fs.existsSync(draftPath)) {
    console.error(`❌ Draft not found: ${draftPath}`);
    return;
  }
  
  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf-8'));
  
  if (!draft.downloadedImages || draft.downloadedImages.length === 0) {
    console.log('ℹ️  No images to upload in this draft');
    return;
  }
  
  console.log(`📸 Found ${draft.downloadedImages.length} image(s) to upload`);
  
  // Initialize Wix uploader
  const uploader = new WixMediaUploader(
    process.env.WIX_API_KEY,
    process.env.WIX_SITE_ID
  );
  
  // Prepare images for upload with organized folder structure
  const imagesToUpload = draft.downloadedImages.map(img => {
    const fullPath = path.join(__dirname, '..', 'data', img.localPath);
    return {
      localPath: fullPath,
      filename: img.filename,
      folder: `patch-notes/${version}`, // Will create /patch-notes/0.10.43/ folder structure
      imageData: img
    };
  });
  
  // Check if images already have Wix URLs (already uploaded)
  const alreadyUploaded = draft.downloadedImages.filter(img => img.wixUrl).length;
  if (alreadyUploaded > 0) {
    console.log(`⚠️  ${alreadyUploaded} image(s) already have Wix URLs`);
    const proceed = process.argv.includes('--force');
    if (!proceed) {
      console.log('💡 Use --force flag to re-upload images that already have Wix URLs');
      return;
    }
  }
  
  // Upload images
  console.log('\n🚀 Starting upload to Wix...\n');
  const results = [];
  
  for (let i = 0; i < imagesToUpload.length; i++) {
    const image = imagesToUpload[i];
    
    // Skip if already uploaded (unless --force)
    if (image.imageData.wixUrl && !process.argv.includes('--force')) {
      console.log(`⏭️  Skipping ${image.filename} (already uploaded)`);
      results.push({
        success: true,
        skipped: true,
        wixUrl: image.imageData.wixUrl,
        originalPath: image.localPath
      });
      continue;
    }
    
    console.log(`[${i + 1}/${imagesToUpload.length}] Uploading ${image.filename}...`);
    
    const result = await uploader.uploadImage(image.localPath, image.folder);
    results.push(result);
    
    if (result.success) {
      console.log(`  ✅ Success! URL: ${result.wixUrl}`);
    } else {
      console.log(`  ❌ Failed: ${result.error}`);
    }
    
    // Small delay between uploads
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Update draft with Wix URLs
  console.log('\n📝 Updating draft with Wix URLs...');
  
  for (let i = 0; i < draft.downloadedImages.length; i++) {
    const result = results[i];
    if (result.success) {
      draft.downloadedImages[i].wixUrl = result.wixUrl;
      draft.downloadedImages[i].wixFileId = result.wixFileId;
      draft.downloadedImages[i].uploadedToWix = new Date().toISOString();
    }
  }
  
  // Mark draft as updated
  draft.updated = new Date().toISOString();
  draft.wixImagesUploaded = true;
  
  // Save updated draft
  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));
  
  // Print summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const skipped = results.filter(r => r.skipped).length;
  
  console.log('\n📊 Upload Summary:');
  console.log(`   ✅ Successful: ${successful - skipped}`);
  if (skipped > 0) console.log(`   ⏭️  Skipped: ${skipped}`);
  if (failed > 0) console.log(`   ❌ Failed: ${failed}`);
  console.log(`\n💾 Draft updated: ${draftPath}`);
  
  // Show sample Wix URLs
  if (successful > 0) {
    console.log('\n🔗 Sample Wix URLs:');
    results.filter(r => r.success && !r.skipped).slice(0, 3).forEach(r => {
      console.log(`   ${r.wixUrl}`);
    });
  }
}

async function main() {
  const version = process.argv[2];
  
  if (!version) {
    console.log('Usage: node uploadExistingImagesToWix.js <version> [--force]');
    console.log('Example: node uploadExistingImagesToWix.js 0.10.43');
    console.log('\nOptions:');
    console.log('  --force    Re-upload images that already have Wix URLs');
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
  
  // Check environment variables
  if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID) {
    console.error('❌ Error: WIX_API_KEY and WIX_SITE_ID must be set in .env file');
    process.exit(1);
  }
  
  await processVersion(version);
  console.log('\n✨ Done!\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

