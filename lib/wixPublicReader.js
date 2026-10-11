const https = require('https');
const http = require('http');

/**
 * Reads patch notes from Wix public data API (no authentication required)
 * Requires the collection to be set to public read permissions
 */
class WixPublicReader {
  constructor(siteId, collectionId = 'Import1') {
    this.siteId = siteId;
    this.collectionId = collectionId;
    
    if (!this.siteId) {
      throw new Error('Wix site ID must be provided');
    }
  }

  /**
   * Fetch latest patch notes from Wix public data API
   * @param {string} customDomain - Optional custom domain (e.g., "account.adrullan.online")
   * @returns {Promise<object|null>} Latest patch note item or null
   */
  async getLatestPatchNotes(customDomain = null) {
    return new Promise((resolve, reject) => {
      // Wix public data API endpoint
      // Format options:
      // 1. Custom domain: https://{custom-domain}/_api/wix-data/v2/items/query
      // 2. Wixsite: https://{site-id}.wixsite.com/_api/wix-data/v2/items/query
      
      const payload = JSON.stringify({
        dataCollectionId: this.collectionId,
        query: {
          sort: [{
            fieldName: 'versionOrder',
            order: 'DESC'
          }],
          paging: {
            limit: 1
          }
        }
      });

      // Determine hostname and path
      let hostname, apiPath;
      if (customDomain) {
        hostname = customDomain;
        apiPath = '/_api/wix-data/v2/items/query';
      } else {
        // Try wixsite.com format (UUID site ID)
        hostname = `${this.siteId}.wixsite.com`;
        apiPath = '/_api/wix-data/v2/items/query';
      }
      
      const options = {
        hostname: hostname,
        path: apiPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
              if (item && item.data) {
                resolve(item.data);
              } else {
                resolve(null);
              }
            } catch (error) {
              // If JSON parsing fails, try scraping approach
              console.log('Public API response not valid JSON, will try scraping...');
              resolve(null);
            }
          } else {
            // API not accessible (might need authentication or wrong endpoint)
            console.log(`Public API returned ${res.statusCode}, will try scraping...`);
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        console.log('Public API error, will try scraping:', error.message);
        resolve(null);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        console.log('Public API timeout, will try scraping...');
        resolve(null);
      });

      req.write(payload);
      req.end();
    });
  }

  /**
   * Scrape patch notes from public Wix page
   * @param {string} pageUrl - URL of the public Wix page displaying patch notes
   * @returns {Promise<string|null>} HTML content or null
   */
  async scrapeFromPublicPage(pageUrl) {
    return new Promise((resolve, reject) => {
      const url = new URL(pageUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Failed to fetch page: ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  /**
   * Get patch notes HTML formatted for launcher
   * Tries public API first, falls back to scraping if needed
   * @param {string} pageUrl - Optional public page URL for scraping fallback
   * @param {string} customDomain - Optional custom domain for Wix site (e.g., "account.adrullan.online")
   * @returns {Promise<string>} Formatted HTML with markers
   */
  async getPatchNotesHTML(pageUrl = null, customDomain = null) {
    try {
      // Try public API first
      const patchNote = await this.getLatestPatchNotes(customDomain);
      
      if (patchNote && patchNote.body) {
        // Format with markers for launcher compatibility
        return `<!--PATCH NOTES START-->${patchNote.body}<!--PATCH NOTES END-->`;
      }

      // Fallback to scraping if API doesn't work
      if (pageUrl) {
        const html = await this.scrapeFromPublicPage(pageUrl);
        // Try to extract patch notes content from the page
        // Look for common Wix CMS content patterns
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          return `<!--PATCH NOTES START-->${bodyMatch[1]}<!--PATCH NOTES END-->`;
        }
        // If no body tag found, return full HTML
        return `<!--PATCH NOTES START-->${html}<!--PATCH NOTES END-->`;
      }

      return '<!--PATCH NOTES START--><p>No patch notes available. Please configure WIX_PATCH_NOTES_PAGE_URL or ensure collection is public.</p><!--PATCH NOTES END-->';
    } catch (error) {
      console.error('Error fetching patch notes from Wix:', error);
      return `<!--PATCH NOTES START--><p>Error loading patch notes: ${error.message}</p><!--PATCH NOTES END-->`;
    }
  }
}

module.exports = WixPublicReader;

