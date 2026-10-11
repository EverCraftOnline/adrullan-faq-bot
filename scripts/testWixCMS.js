const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * Test script to verify Wix CMS access
 */

async function listCollections() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.wixapis.com',
      path: '/wix-data/v2/schemas',
      method: 'GET',
      headers: {
        'Authorization': process.env.WIX_API_KEY,
        'wix-site-id': process.env.WIX_SITE_ID
      }
    };
    
    console.log('📚 Fetching CMS collections...\n');
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`API error (${res.statusCode}): ${data.substring(0, 500)}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.end();
  });
}

async function getCollectionSchema(collectionId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.wixapis.com',
      path: `/wix-data/v2/schemas/${collectionId}`,
      method: 'GET',
      headers: {
        'Authorization': process.env.WIX_API_KEY,
        'wix-site-id': process.env.WIX_SITE_ID
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`API error (${res.statusCode}): ${data.substring(0, 500)}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.end();
  });
}

async function queryItems(collectionId, limit = 10) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      dataCollectionId: collectionId,
      returnTotalCount: true,
      includeReferencedItems: [],
      query: {
        paging: {
          limit: limit
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
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        } else {
          reject(new Error(`API error (${res.statusCode}): ${data.substring(0, 500)}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('🧪 Testing Wix CMS Access...\n');
  
  if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID) {
    console.error('❌ Error: WIX_API_KEY and WIX_SITE_ID must be set in .env file');
    process.exit(1);
  }
  
  try {
    // Try to query Import1 directly
    console.log('Step 1: Trying to query Import1 collection directly...');
    const items = await queryItems('Import1', 5);
    
    console.log(`✅ CMS Access Working!`);
    console.log(`📊 Total items in Import1: ${items.totalCount || 0}`);
    
    if (items.dataItems && items.dataItems.length > 0) {
      console.log(`   Showing first ${items.dataItems.length} items:\n`);
      items.dataItems.forEach((item, idx) => {
        console.log(`   ${idx + 1}. Item ID: ${item.id}`);
        const data = item.data || {};
        console.log(`      Fields: ${Object.keys(data).join(', ')}`);
        // Show a sample of the data
        if (data.title || data.version || data._id) {
          console.log(`      Sample: ${JSON.stringify({ title: data.title, version: data.version, _id: data._id }, null, 2).substring(0, 100)}`);
        }
      });
    } else {
      console.log('   (Collection is empty - ready for patch notes!)');
    }
    
    console.log('\n💡 Collection "Import1" is accessible!');
    console.log('   Next: We can push patch notes to this collection\n');
    
    return;
    
    // OLD CODE: List all collections (doesn't work with current endpoint)
    console.log('Step 1: Listing all CMS collections...');
    const collections = await listCollections();
    
    if (collections.schemas && collections.schemas.length > 0) {
      console.log(`✅ Found ${collections.schemas.length} collection(s):\n`);
      
      collections.schemas.forEach((schema, idx) => {
        console.log(`${idx + 1}. ${schema.displayName || schema.id}`);
        console.log(`   ID: ${schema.id}`);
        console.log(`   Fields: ${schema.fields?.length || 0}`);
        console.log('');
      });
      
      // Look for Import1
      const import1 = collections.schemas.find(s => 
        s.id === 'Import1' || 
        s.displayName === 'Import1' ||
        s.id.toLowerCase().includes('import')
      );
      
      if (import1) {
        console.log('\n✅ Found Import1 collection!');
        console.log(`   ID: ${import1.id}`);
        console.log(`   Display Name: ${import1.displayName}`);
        
        // Get detailed schema
        console.log('\nStep 2: Getting Import1 schema details...');
        const schema = await getCollectionSchema(import1.id);
        
        console.log('\n📋 Collection Fields:');
        if (schema.schema?.fields) {
          schema.schema.fields.forEach(field => {
            console.log(`   - ${field.key} (${field.type})${field.displayName ? ` - "${field.displayName}"` : ''}`);
          });
        }
        
        // Query existing items
        console.log('\nStep 3: Querying existing items...');
        const items = await queryItems(import1.id, 5);
        
        console.log(`\n📊 Total items: ${items.totalCount || 0}`);
        if (items.dataItems && items.dataItems.length > 0) {
          console.log(`   Showing first ${items.dataItems.length}:\n`);
          items.dataItems.forEach((item, idx) => {
            console.log(`   ${idx + 1}. Item ID: ${item.id}`);
            console.log(`      Data keys: ${Object.keys(item.data || {}).join(', ')}`);
          });
        } else {
          console.log('   (Collection is empty)');
        }
        
        console.log('\n✅ CMS Access Working!');
        console.log('\n💡 Next steps:');
        console.log('   1. You can now push patch notes to this collection');
        console.log('   2. Use the field names above to map your patch note data');
        
      } else {
        console.log('\n⚠️  Import1 collection not found!');
        console.log('   Available collections listed above.');
        console.log('   Please check the collection name in your Wix CMS.');
      }
      
    } else {
      console.log('⚠️  No collections found in CMS');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

