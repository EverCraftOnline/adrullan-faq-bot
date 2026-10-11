const path = require('path');
const fs = require('fs');
const WixCMSPublisher = require('../lib/wixCMSPublisher');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Test publishing patch notes to Wix CMS
 */

async function testPublish() {
  console.log('\n🧪 Testing Wix CMS Publish...\n');
  
  if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID) {
    console.error('❌ Error: WIX_API_KEY and WIX_SITE_ID must be set in .env file');
    process.exit(1);
  }
  
  // Load draft
  const draftPath = path.join(__dirname, '..', 'data', 'patch-notes-drafts', 'draft-0.10.43.json');
  if (!fs.existsSync(draftPath)) {
    console.error('❌ Draft not found:', draftPath);
    process.exit(1);
  }
  
  const draft = JSON.parse(fs.readFileSync(draftPath, 'utf-8'));
  
  console.log(`📄 Loaded draft: ${draft.version}`);
  console.log(`   HTML length: ${draft.html.length} characters`);
  console.log(`   Generated: ${draft.generated}`);
  console.log('');
  
  // Initialize publisher
  const publisher = new WixCMSPublisher(
    process.env.WIX_API_KEY,
    process.env.WIX_SITE_ID
  );
  
  // Generate HTML with images (like the dashboard does)
  const patchNotesFormatter = require('../lib/patchNotesFormatter');
  const htmlWithImages = patchNotesFormatter.generateHTMLWithImages(draft);
  
  console.log(`📄 Generated HTML with images: ${htmlWithImages.length} characters`);
  const imageCount = (htmlWithImages.match(/<img/g) || []).length;
  console.log(`📸 Images found: ${imageCount}`);
  console.log('');
  
  // Format dates properly
  const releaseDate = draft.publishedAt || draft.generated;
  const releaseDateObj = new Date(releaseDate);
  
  const formattedReleaseDate = releaseDateObj.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  const formattedDisplayDate = releaseDateObj.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  console.log(`📅 Formatted Release Date: ${formattedReleaseDate}`);
  console.log(`📅 Formatted Display Date: ${formattedDisplayDate}`);
  console.log('');
  
  // Publish to Wix
  console.log('🚀 Publishing to Wix CMS...\n');
  
  try {
    const result = await publisher.publishPatchNotes(
      draft.version,
      htmlWithImages,
      {
        releaseDate: formattedReleaseDate,
        displayDate: formattedDisplayDate
      }
    );
    
    if (result.success) {
      console.log(`✅ Success! Patch notes ${result.action} in Wix CMS`);
      console.log(`   Version: ${result.version}`);
      console.log(`   Item ID: ${result.itemId}`);
      console.log('\n💡 Check your Wix CMS to see the published patch notes!');
      console.log('   Collection: Import1');
      console.log('   Version: 0.10.43');
    } else {
      console.error(`❌ Failed: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testPublish();

