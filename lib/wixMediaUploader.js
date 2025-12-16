const fs = require('fs');
const path = require('path');
const https = require('https');

const WIX_API_BASE = 'https://www.wixapis.com';

class WixMediaUploader {
  constructor(apiKey, siteId) {
    this.apiKey = apiKey;
    this.siteId = siteId;
    
    if (!this.apiKey || !this.siteId) {
      throw new Error('WIX_API_KEY and WIX_SITE_ID must be set in environment variables');
    }
  }
  
  /**
   * Upload a single image file to Wix Media Manager
   * @param {string} filePath - Local path to the image file
   * @param {string} folder - Optional folder path in Wix (e.g., "patch-notes/0.10.43")
   * @returns {Promise<object>} - Upload result with Wix URL and file details
   */
  async uploadImage(filePath, folder = 'patch-notes') {
    try {
      const fileName = path.basename(filePath);
      const mimeType = this._getContentType(fileName);
      
      // Create folder path like "/patch-notes/0.10.43"
      // Wix will automatically create the folders if they don't exist
      const folderPath = folder ? `/${folder}` : undefined;
      
      // Step 1: Get upload URL from Wix
      const uploadUrlData = await this._getUploadUrl(fileName, mimeType, folderPath);
      
      // Step 2: Upload file to the upload URL (with filename query param)
      const uploadResult = await this._uploadFile(filePath, uploadUrlData.uploadUrl, fileName, mimeType);
      
      // The upload response should contain the file info directly
      return {
        success: true,
        wixUrl: uploadResult.file?.url,
        wixFileId: uploadResult.file?.id,
        originalPath: filePath,
        folder: folder,
        width: uploadResult.file?.media?.image?.image?.width,
        height: uploadResult.file?.media?.image?.image?.height,
        size: uploadResult.file?.sizeInBytes
      };
      
    } catch (error) {
      console.error(`Failed to upload ${filePath} to Wix:`, error.message);
      return {
        success: false,
        error: error.message,
        originalPath: filePath
      };
    }
  }
  
  /**
   * Upload multiple images in batch
   * @param {Array<object>} images - Array of {localPath, folder} objects
   * @returns {Promise<Array<object>>} - Array of upload results
   */
  async uploadBatch(images) {
    const results = [];
    
    for (const image of images) {
      console.log(`Uploading ${image.filename || path.basename(image.localPath)} to Wix...`);
      const result = await this.uploadImage(image.localPath, image.folder);
      results.push(result);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }
  
  /**
   * Step 1: Get upload URL from Wix
   */
  async _getUploadUrl(fileName, mimeType, folderPath) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        mimeType: mimeType,
        fileName: fileName,
        filePath: folderPath || undefined
      });
      
      const options = {
        hostname: 'www.wixapis.com',
        path: '/site-media/v1/files/generate-upload-url',
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'wix-site-id': this.siteId,
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
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error(`Failed to parse Wix response: ${error.message}`));
            }
          } else {
            reject(new Error(`Wix API error (${res.statusCode}): ${data}`));
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
  
  /**
   * Step 2: Upload file to Wix's upload URL
   * Uses PUT request with file content and filename query param as per Wix Upload API
   */
  async _uploadFile(filePath, uploadUrl, fileName, mimeType) {
    return new Promise((resolve, reject) => {
      const fileContent = fs.readFileSync(filePath);
      
      // Parse upload URL and add filename query param
      const url = new URL(uploadUrl);
      url.searchParams.append('filename', fileName);
      
      const protocol = url.protocol === 'https:' ? https : require('http');
      
      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileContent.length
        }
      };
      
      const req = protocol.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // Parse response - should contain file info
            try {
              const response = JSON.parse(data);
              resolve(response);
            } catch (e) {
              // If no JSON response, that's ok too
              resolve({ success: true });
            }
          } else {
            reject(new Error(`Upload failed (${res.statusCode}): ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`Upload request failed: ${error.message}`));
      });
      
      req.write(fileContent);
      req.end();
    });
  }
  
  
  /**
   * Get content type based on file extension
   */
  _getContentType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const types = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return types[ext] || 'application/octet-stream';
  }
}

module.exports = WixMediaUploader;

