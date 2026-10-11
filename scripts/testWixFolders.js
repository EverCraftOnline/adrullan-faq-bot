const path = require('path');
const WixMediaUploader = require('../lib/wixMediaUploader');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Test script to verify Wix folder creation
 */

async function testFolderUpload() {
  console.log('\n🧪 Testing Wix folder creation...\n');
  
  if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID) {
    console.error('❌ Error: WIX_API_KEY and WIX_SITE_ID must be set in .env file');
    process.exit(1);
  }
  
  // Initialize uploader
  const uploader = new WixMediaUploader(
    process.env.WIX_API_KEY,
    process.env.WIX_SITE_ID
  );
  
  // Find first image from 0.10.43
  const testImagePath = path.join(__dirname, '..', 'data', 'patch-notes-images', '0.10.43', '1448056210321309747.png');
  
  console.log(`📸 Test image: ${testImagePath}`);
  console.log(`📁 Target folder: /patch-notes/0.10.43`);
  console.log('\n🚀 Uploading...\n');
  
  try {
    const result = await uploader.uploadImage(testImagePath, 'patch-notes/0.10.43');
    
    if (result.success) {
      console.log('✅ Upload successful!\n');
      console.log('📊 Result:');
      console.log(`   URL: ${result.wixUrl}`);
      console.log(`   File ID: ${result.wixFileId}`);
      console.log('\n💡 Check your Wix Media Manager to verify the folder structure!');
      console.log('   You should see: Site Files > patch-notes > 0.10.43 > [image]');
    } else {
      console.error('❌ Upload failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFolderUpload();

