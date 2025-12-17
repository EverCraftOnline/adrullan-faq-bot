const https = require('https');

class WixCMSPublisher {
  constructor(apiKey, siteId) {
    this.apiKey = apiKey;
    this.siteId = siteId;
    
    if (!this.apiKey || !this.siteId) {
      throw new Error('WIX_API_KEY and WIX_SITE_ID must be set');
    }
  }
  
  /**
   * Publish patch notes to Wix CMS
   * @param {string} version - Patch version (e.g., "0.10.43")
   * @param {string} htmlBody - HTML content of patch notes
   * @param {object} options - Additional options (releaseDate, displayDate, etc.)
   * @returns {Promise<object>} - Result with success status and item ID
   */
  async publishPatchNotes(version, htmlBody, options = {}) {
    try {
      // Check if version already exists
      const existing = await this._findByVersion(version);
      
      if (existing) {
        console.log(`Version ${version} already exists in CMS. Updating...`);
        return await this._updateItem(existing._id, version, htmlBody, options);
      } else {
        console.log(`Version ${version} not found. Creating new item...`);
        return await this._insertItem(version, htmlBody, options);
      }
      
    } catch (error) {
      console.error('Failed to publish to Wix CMS:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Find existing patch note by version
   */
  async _findByVersion(version) {
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
          'Authorization': this.apiKey,
          'wix-site-id': this.siteId,
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
              const item = response.dataItems && response.dataItems[0];
              resolve(item ? item.data : null);
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
  
  /**
   * Insert new patch note item
   */
  async _insertItem(version, htmlBody, options) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      const payload = JSON.stringify({
        dataCollectionId: 'Import1',
        dataItem: {
          data: {
            version: version,
            body: htmlBody,
            releaseDate: options.releaseDate || now,
            displayDate: options.displayDate || now,
            versionOrder: options.versionOrder || this._parseVersionOrder(version)
          }
        }
      });
      
      const opts = {
        hostname: 'www.wixapis.com',
        path: '/wix-data/v2/items',
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'wix-site-id': this.siteId,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      
      const req = https.request(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const response = JSON.parse(data);
              resolve({
                success: true,
                action: 'inserted',
                itemId: response.dataItem?.id,
                version: version
              });
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error.message}`));
            }
          } else {
            reject(new Error(`Insert failed (${res.statusCode}): ${data}`));
          }
        });
      });
      
      req.on('error', (error) => reject(error));
      req.write(payload);
      req.end();
    });
  }
  
  /**
   * Update existing patch note item
   */
  async _updateItem(itemId, version, htmlBody, options) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      const payload = JSON.stringify({
        dataCollectionId: 'Import1',
        dataItem: {
          data: {
            version: version,
            body: htmlBody,
            releaseDate: options.releaseDate || now,
            displayDate: options.displayDate || now,
            versionOrder: options.versionOrder || this._parseVersionOrder(version)
          }
        }
      });
      
      const opts = {
        hostname: 'www.wixapis.com',
        path: `/wix-data/v2/items/${itemId}`,
        method: 'PUT',
        headers: {
          'Authorization': this.apiKey,
          'wix-site-id': this.siteId,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };
      
      const req = https.request(opts, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const response = JSON.parse(data);
              resolve({
                success: true,
                action: 'updated',
                itemId: itemId,
                version: version
              });
            } catch (error) {
              reject(new Error(`Failed to parse response: ${error.message}`));
            }
          } else {
            reject(new Error(`Update failed (${res.statusCode}): ${data}`));
          }
        });
      });
      
      req.on('error', (error) => reject(error));
      req.write(payload);
      req.end();
    });
  }
  
  /**
   * Parse version string to sortable number
   * e.g., "0.10.43" -> 1043
   */
  _parseVersionOrder(version) {
    const parts = version.split('.').map(p => parseInt(p, 10));
    if (parts.length === 3) {
      return parts[0] * 10000 + parts[1] * 100 + parts[2];
    }
    return 0;
  }
}

module.exports = WixCMSPublisher;

