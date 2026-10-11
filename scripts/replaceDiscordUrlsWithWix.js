const fs = require('fs');
const path = require('path');

/**
 * Script to replace Discord CDN URLs in HTML with Wix URLs
 * Run after uploading images to Wix
 */

const DRAFTS_DIR = path.join(__dirname, '..', 'data', 'patch-notes-drafts');

function replaceDiscordUrlsInHtml(version) {
  console.log(`\n🔄 Processing version ${version}...`);
  
  // Load draft
  const draftPath = path.join(DRAFTS_DIR, `draft-${version}.json`);
  if (!fs.existsSync(draftPath)) {
    console.error(`❌ Draft not found: ${draftPath}`);
    return false;
  }
  
  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf-8'));
  
  // Check if we have Wix URLs
  const imagesWithWixUrls = draft.downloadedImages?.filter(img => img.wixUrl) || [];
  if (imagesWithWixUrls.length === 0) {
    console.log('⚠️  No Wix URLs found. Run uploadExistingImagesToWix.js first.');
    return false;
  }
  
  console.log(`📸 Found ${imagesWithWixUrls.length} image(s) with Wix URLs`);
  
  // Create mapping from Discord URL to Wix URL
  const urlMap = {};
  for (const img of imagesWithWixUrls) {
    if (img.originalUrl && img.wixUrl) {
      // Strip query parameters from Discord URL for matching
      const discordUrlBase = img.originalUrl.split('?')[0];
      urlMap[discordUrlBase] = img.wixUrl;
      // Also map with query params in case HTML has full URL
      urlMap[img.originalUrl] = img.wixUrl;
    }
  }
  
  console.log(`🔗 Created URL mapping for ${Object.keys(urlMap).length} URL(s)`);
  
  // Replace URLs in HTML
  let updatedHtml = draft.html;
  let replacementCount = 0;
  
  for (const [discordUrl, wixUrl] of Object.entries(urlMap)) {
    // Replace both with and without query parameters
    const regex = new RegExp(discordUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\?[^"]*)?', 'g');
    const beforeLength = updatedHtml.length;
    updatedHtml = updatedHtml.replace(regex, wixUrl);
    if (updatedHtml.length !== beforeLength) {
      replacementCount++;
      console.log(`  ✅ Replaced: ${path.basename(discordUrl)} → Wix`);
    }
  }
  
  if (replacementCount === 0) {
    console.log('⚠️  No Discord URLs found in HTML to replace');
    return false;
  }
  
  // Update draft
  draft.html = updatedHtml;
  draft.updated = new Date().toISOString();
  draft.wixUrlsApplied = true;
  
  // Save draft
  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));
  
  console.log(`\n✅ Updated ${replacementCount} URL(s) in HTML`);
  console.log(`💾 Draft saved: ${draftPath}`);
  
  // Show a sample of the updated HTML
  const sampleMatch = updatedHtml.match(/https:\/\/static\.wixstatic\.com\/media\/[^"]+/);
  if (sampleMatch) {
    console.log(`\n📝 Sample updated URL in HTML:`);
    console.log(`   ${sampleMatch[0]}`);
  }
  
  return true;
}

function main() {
  const version = process.argv[2];
  
  if (!version) {
    console.log('Usage: node replaceDiscordUrlsWithWix.js <version>');
    console.log('Example: node replaceDiscordUrlsWithWix.js 0.10.43');
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
  
  const success = replaceDiscordUrlsInHtml(version);
  
  if (success) {
    console.log('\n✨ Done! Refresh your dashboard to see the changes.\n');
    process.exit(0);
  } else {
    console.log('\n❌ Failed to update URLs.\n');
    process.exit(1);
  }
}

main();

