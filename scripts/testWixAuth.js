const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Debug script to test Wix API authentication and see actual error messages
 */

async function testGenerateUploadUrl() {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      mimeType: 'image/png',
      fileName: 'test.png'
    });
    
    console.log('Testing Wix API authentication...\n');
    console.log('API Key (first 50 chars):', process.env.WIX_API_KEY?.substring(0, 50) + '...');
    console.log('Site ID:', process.env.WIX_SITE_ID);
    console.log('\nCalling: POST https://www.wixapis.com/site-media/v1/files/generate-upload-url\n');
    console.log('Body:', payload);
    
    const options = {
      hostname: 'www.wixapis.com',
      path: '/site-media/v1/files/generate-upload-url',
      method: 'POST',
      headers: {
        'Authorization': process.env.WIX_API_KEY,
        'wix-site-id': process.env.WIX_SITE_ID,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    
    console.log('Request headers:');
    console.log(JSON.stringify(options.headers, null, 2));
    console.log('\n---\n');
    
    const req = https.request(options, (res) => {
      let data = '';
      
      console.log(`Response Status: ${res.statusCode}`);
      console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
      console.log('\n---\n');
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response Body:');
        
        // Try to parse as JSON first
        try {
          const json = JSON.parse(data);
          console.log(JSON.stringify(json, null, 2));
        } catch (e) {
          // If not JSON, show first 500 chars of HTML
          console.log(data.substring(0, 500));
        }
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('\n✅ SUCCESS! API authentication working.');
          resolve(JSON.parse(data));
        } else {
          console.log('\n❌ FAILED with status', res.statusCode);
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });
    
    req.write(payload);
    req.end();
  });
}

async function main() {
  if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID) {
    console.error('❌ Error: WIX_API_KEY and WIX_SITE_ID must be set in .env file');
    process.exit(1);
  }
  
  try {
    await testGenerateUploadUrl();
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();

