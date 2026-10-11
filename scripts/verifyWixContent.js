const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Verify what was published to Wix CMS
 */

async function getItem(version) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      dataCollectionId: 'Import1',
      query: {
        filter: {
          version: version
        },
        paging: {
          limit: 1
        }
      }
    });
    
    const options = {
      hostname: 'www.wixapis.com',
      path: '/wix-data/v2/items/query',
      method: 'POST',
      headers: {
        'Authorization': process.env.WIX_API_KEY,
        'wix-site-id': process.env.WIX_SITE_ID,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(data);
            resolve(response.dataItems && response.dataItems[0]);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`Query failed (${res.statusCode}): ${data}`));
        }
      });
    });
    
    req.on('error', (error) => reject(error));
    req.write(payload);
    req.end();
  });
}

async function main() {
  const version = process.argv[2] || '0.10.43';
  
  console.log(`\n🔍 Verifying Wix CMS content for version ${version}...\n`);
  
  try {
    const item = await getItem(version);
    
    if (!item) {
      console.log('❌ Item not found in Wix CMS');
      return;
    }
    
    const data = item.data;
    
    console.log('✅ Item found in Wix CMS\n');
    console.log(`📋 Version: ${data.version}`);
    console.log(`📅 Release Date: ${data.releaseDate}`);
    console.log(`📅 Display Date: ${data.displayDate}`);
    console.log(`📄 Body Length: ${data.body?.length || 0} characters`);
    console.log('');
    
    // Check for images in body
    const imageCount = (data.body?.match(/<img/g) || []).length;
    console.log(`📸 Images in HTML: ${imageCount}`);
    
    if (imageCount > 0) {
      console.log('\n🖼️  Sample image URLs:');
      const imgMatches = data.body?.match(/src="([^"]+)"/g) || [];
      imgMatches.slice(0, 3).forEach((match, idx) => {
        const url = match.replace('src="', '').replace('"', '');
        console.log(`   ${idx + 1}. ${url.substring(0, 80)}...`);
      });
    }
    
    console.log('\n✅ Verification complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

