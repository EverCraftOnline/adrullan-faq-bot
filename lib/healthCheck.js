const express = require('express');
const fs = require('fs');
const path = require('path');
const monitor = require('./monitor');
const profileManager = require('./profileManager');
const anthropicClient = require('./anthropicClient');
const { syncPatchFeed } = require('./syncPatchFeed');

// Discord client for notifications (will be set by bot.js)
let discordClient = null;

class HealthCheckServer {
  constructor() {
    this.app = express();
    this.port = process.env.HEALTH_CHECK_PORT || 3000;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Large JSON only for CAT screenshot paste (base64); global parser stays small for other APIs
    this.app.use('/api/cat-screenshots', express.json({ limit: '50mb' }));
    this.app.use(express.json());
    
    // Basic authentication middleware for dashboard
    this.app.use((req, res, next) => {
      // Skip auth for health checks (needed for monitoring)
      if (req.path === '/health' || req.path === '/api') {
        return next();
      }
      
      // Check for basic auth
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Adrullan Bot Dashboard"');
        return res.status(401).send('Authentication required');
      }
      
      // Decode credentials
      const credentials = Buffer.from(auth.slice(6), 'base64').toString();
      const [username, password] = credentials.split(':');
      
      // Check against environment variables
      const validUsername = process.env.DASHBOARD_USERNAME || 'admin';
      const validPassword = process.env.DASHBOARD_PASSWORD || 'admin123';
      
      if (username === validUsername && password === validPassword) {
        return next();
      }
      
      res.setHeader('WWW-Authenticate', 'Basic realm="Adrullan Bot Dashboard"');
      return res.status(401).send('Invalid credentials');
    });
    
    // Patch notes draft API endpoints (before auth)
    const draftManager = require('./patchNotesDraft');
    
    // List all drafts
    this.app.get('/api/patch-notes/drafts', (req, res) => {
      try {
        const drafts = draftManager.listDrafts();
        res.json({ drafts });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get a specific draft
    this.app.get('/api/patch-notes/drafts/:version', (req, res) => {
      try {
        const { version } = req.params;
        const draft = draftManager.loadDraft(version);
        if (!draft) {
          return res.status(404).json({ error: `Draft for version ${version} not found` });
        }
        res.json(draft);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Update a draft
    this.app.put('/api/patch-notes/drafts/:version', (req, res) => {
      try {
        const { version } = req.params;
        const updates = req.body;
        const updated = draftManager.updateDraft(version, updates);
        if (!updated) {
          return res.status(404).json({ error: `Draft for version ${version} not found` });
        }
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Serve patch note images
    this.app.get('/api/patch-notes/images/*', (req, res) => {
      try {
        const imagePath = req.params[0];
        const fullPath = path.join(__dirname, '..', 'data', imagePath);
        
        // Security check - ensure path is within data directory
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fullPath.startsWith(dataDir)) {
          return res.status(403).json({ error: 'Access denied' });
        }
        
        if (!fs.existsSync(fullPath)) {
          return res.status(404).json({ error: 'Image not found' });
        }
        
        // Determine content type from extension
        const ext = path.extname(fullPath).toLowerCase();
        const contentTypeMap = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        
        res.setHeader('Content-Type', contentTypeMap[ext] || 'image/png');
        res.sendFile(fullPath);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    const catScreenshotsStore = require('./catScreenshotsStore');
    const WixMediaUploaderCat = require('./wixMediaUploader');

    const catScreenshotsRouter = express.Router();

    catScreenshotsRouter.post('/:session/save', async (req, res) => {
      try {
        const { session } = req.params;
        const { prefix = 'AOA_CAT7_', imageBase64, mimeType, uploadWix } = req.body || {};

        if (!catScreenshotsStore.safeSessionId(session)) {
          return res.status(400).json({ error: 'Invalid session id' });
        }

        if (!imageBase64 || typeof imageBase64 !== 'string') {
          return res.status(400).json({ error: 'imageBase64 required (paste image as base64 or data URL)' });
        }

        let b64 = imageBase64.trim();
        const dataUrlMatch = b64.match(/^data:image\/\w+;base64,(.+)$/);
        if (dataUrlMatch) {
          b64 = dataUrlMatch[1];
        }

        let buffer;
        try {
          buffer = Buffer.from(b64, 'base64');
        } catch {
          return res.status(400).json({ error: 'Invalid base64' });
        }

        if (!buffer.length) {
          return res.status(400).json({ error: 'Empty image' });
        }

        let ext = 'png';
        if (mimeType) {
          const mt = String(mimeType).toLowerCase();
          if (mt.includes('jpeg') || mt.includes('jpg')) ext = 'jpg';
          else if (mt.includes('png')) ext = 'png';
          else if (mt.includes('webp')) ext = 'webp';
          else if (mt.includes('gif')) ext = 'gif';
        }

        const { entry, fullPath, localPath, filename, seq } = catScreenshotsStore.saveScreenshot(
          session,
          prefix,
          buffer,
          ext
        );

        const result = {
          success: true,
          entry,
          localPath,
          filename,
          seq,
          localUrl: `/api/cat-screenshots/images/${encodeURIComponent(session)}/${encodeURIComponent(filename)}`
        };

        const wantsWix = Boolean(uploadWix);
        if (wantsWix) {
          if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID) {
            result.wixSkipped = 'Wix credentials not configured';
          } else {
            try {
              const uploader = new WixMediaUploaderCat(process.env.WIX_API_KEY, process.env.WIX_SITE_ID);
              const wixFolder = `cat-tests/${session}`;
              const up = await uploader.uploadImage(fullPath, wixFolder);
              if (up.success) {
                catScreenshotsStore.updateEntryWix(session, seq, {
                  wixUrl: up.wixUrl,
                  wixFileId: up.wixFileId
                });
                result.wix = {
                  success: true,
                  wixUrl: up.wixUrl,
                  wixFileId: up.wixFileId,
                  folder: wixFolder
                };
                result.entry = {
                  ...entry,
                  wixUrl: up.wixUrl,
                  wixFileId: up.wixFileId
                };
              } else {
                result.wix = { success: false, error: up.error };
              }
            } catch (wixErr) {
              result.wix = { success: false, error: wixErr.message };
            }
          }
        }

        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    catScreenshotsRouter.patch('/:session/entry/:seq', (req, res) => {
      try {
        const { session, seq: seqRaw } = req.params;
        const seq = parseInt(seqRaw, 10);
        if (!catScreenshotsStore.safeSessionId(session) || Number.isNaN(seq)) {
          return res.status(400).json({ error: 'Invalid session or seq' });
        }
        const { title, note, tags } = req.body || {};
        const updated = catScreenshotsStore.updateEntryMeta(session, seq, { title, note, tags });
        if (!updated) {
          const st = catScreenshotsStore.loadState(session);
          return res.status(404).json({
            error: 'Entry not found',
            hint: 'Wrong session folder, or seq not in session-state.json for this folder.',
            session,
            seq,
            knownSeqs: (st.entries || []).map((e) => e.seq).slice(-15)
          });
        }
        res.json({ success: true, entry: updated });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    catScreenshotsRouter.delete('/:session/entry/:seq', (req, res) => {
      try {
        const { session, seq: seqRaw } = req.params;
        const seq = parseInt(seqRaw, 10);
        if (!catScreenshotsStore.safeSessionId(session) || Number.isNaN(seq)) {
          return res.status(400).json({ error: 'Invalid session or seq' });
        }
        const ok = catScreenshotsStore.deleteEntry(session, seq);
        if (!ok) {
          return res.status(404).json({ error: 'Entry not found' });
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    catScreenshotsRouter.post('/:session/bulk-upload-wix', async (req, res) => {
      try {
        const { session } = req.params;
        const { seqs } = req.body || {};
        if (!catScreenshotsStore.safeSessionId(session)) {
          return res.status(400).json({ error: 'Invalid session id' });
        }
        if (!Array.isArray(seqs) || seqs.length === 0) {
          return res.status(400).json({ error: 'seqs must be a non-empty array' });
        }
        if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID) {
          return res.status(500).json({ error: 'Wix credentials not configured' });
        }
        const state = catScreenshotsStore.loadState(session);
        const wixFolder = `cat-tests/${session}`;
        const uploader = new WixMediaUploaderCat(process.env.WIX_API_KEY, process.env.WIX_SITE_ID);
        const results = [];
        const uniqueSeqs = [...new Set(seqs.map((s) => parseInt(s, 10)).filter((n) => !Number.isNaN(n)))];
        for (const seq of uniqueSeqs) {
          const entry = state.entries.find((x) => Number(x.seq) === seq);
          if (!entry) {
            results.push({ seq, success: false, error: 'not found' });
            continue;
          }
          if (entry.wixUrl) {
            results.push({ seq, success: false, skipped: true, reason: 'already on Wix' });
            continue;
          }
          const fullPath = catScreenshotsStore.entryFullPath(session, entry);
          if (!fs.existsSync(fullPath)) {
            results.push({ seq, success: false, error: 'file missing' });
            continue;
          }
          try {
            const up = await uploader.uploadImage(fullPath, wixFolder);
            if (up.success) {
              catScreenshotsStore.updateEntryWix(session, seq, {
                wixUrl: up.wixUrl,
                wixFileId: up.wixFileId
              });
              results.push({
                seq,
                success: true,
                wixUrl: up.wixUrl,
                wixFileId: up.wixFileId
              });
            } else {
              results.push({ seq, success: false, error: up.error || 'upload failed' });
            }
          } catch (err) {
            results.push({ seq, success: false, error: err.message });
          }
          await new Promise((r) => setTimeout(r, 600));
        }
        const ok = results.filter((r) => r.success).length;
        res.json({ success: true, folder: wixFolder, uploaded: ok, total: results.length, results });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    catScreenshotsRouter.get('/:session/state', (req, res) => {
      try {
        const { session } = req.params;
        if (!catScreenshotsStore.safeSessionId(session)) {
          return res.status(400).json({ error: 'Invalid session id' });
        }
        const state = catScreenshotsStore.loadState(session);
        const entries = state.entries || [];
        const onWix = entries.filter((e) => Boolean(e.wixUrl)).length;
        res.json({
          ...state,
          stats: {
            total: entries.length,
            onWix,
            localOnly: entries.length - onWix
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    catScreenshotsRouter.get('/images/:session/:filename', (req, res) => {
      try {
        const { session, filename } = req.params;
        if (!catScreenshotsStore.safeSessionId(session)) {
          return res.status(403).json({ error: 'Invalid session' });
        }
        if (!filename || filename.includes('..')) {
          return res.status(400).json({ error: 'Invalid filename' });
        }
        const baseDir = path.resolve(catScreenshotsStore.sessionDir(session));
        const fullPath = path.resolve(path.join(baseDir, path.basename(filename)));
        const rel = path.relative(baseDir, fullPath);
        if (rel.startsWith('..') || path.isAbsolute(rel) || !fs.existsSync(fullPath)) {
          return res.status(404).json({ error: 'Not found' });
        }
        const ext = path.extname(fullPath).toLowerCase();
        const contentTypeMap = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        };
        res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
        res.sendFile(fullPath);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.use('/api/cat-screenshots', catScreenshotsRouter);
    
    // Delete a draft
    this.app.delete('/api/patch-notes/drafts/:version', (req, res) => {
      try {
        const { version } = req.params;
        const deleted = draftManager.deleteDraft(version);
        if (!deleted) {
          return res.status(404).json({ error: `Draft for version ${version} not found` });
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Publish draft to Discord
    this.app.post('/api/patch-notes/drafts/:version/publish', async (req, res) => {
      try {
        const { version } = req.params;
        const draft = draftManager.loadDraft(version);
        if (!draft) {
          return res.status(404).json({ error: `Draft for version ${version} not found` });
        }
        
        // Publish to Discord
        const publishResult = await publishToDiscord(draft, discordClient);
        
        // Mark as published
        draft.status = 'published';
        draft.publishedAt = new Date().toISOString();
        draftManager.saveDraft(version, draft);
        
        res.json({ success: true, ...publishResult });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Publish draft to Wix CMS
    this.app.post('/api/patch-notes/drafts/:version/publish-web', async (req, res) => {
      try {
        const { version } = req.params;
        const draft = draftManager.loadDraft(version);
        if (!draft) {
          return res.status(404).json({ error: `Draft for version ${version} not found` });
        }
        
        // Check if Wix credentials are configured
        if (!process.env.WIX_API_KEY || !process.env.WIX_SITE_ID) {
          return res.status(500).json({ error: 'Wix credentials not configured' });
        }
        
        // Generate HTML with images if available
        const patchNotesFormatter = require('./patchNotesFormatter');
        const htmlWithImages = patchNotesFormatter.generateHTMLWithImages(draft);
        
        // Format dates properly
        const releaseDate = draft.publishedAt || draft.generated;
        const releaseDateObj = new Date(releaseDate);
        
        // Format: "Dec 5, 2025 6:00 PM"
        const formattedReleaseDate = releaseDateObj.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        // Format: "December 6, 2025"
        const formattedDisplayDate = releaseDateObj.toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
        
        // Publish to Wix CMS
        const WixCMSPublisher = require('./wixCMSPublisher');
        const publisher = new WixCMSPublisher(
          process.env.WIX_API_KEY,
          process.env.WIX_SITE_ID
        );
        
        const result = await publisher.publishPatchNotes(
          draft.version,
          htmlWithImages,
          {
            releaseDate: formattedReleaseDate,
            displayDate: formattedDisplayDate
          }
        );
        
        if (result.success) {
          draft.status = 'published';
          draft.publishedAt = draft.publishedAt || new Date().toISOString();
          draft.publishedToWix = true;
          draft.wixItemId = result.itemId;
          draftManager.saveDraft(version, draft);

          res.json(result);
        } else {
          res.status(500).json({ error: result.error || 'Failed to publish to Wix' });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Sync draft into aoa-web's data/patch-notes/patch-notes-feed.json
    this.app.post('/api/patch-notes/drafts/:version/publish-local-feed', async (req, res) => {
      try {
        const { version } = req.params;
        const draft = draftManager.loadDraft(version);
        if (!draft) {
          return res.status(404).json({ error: `Draft for version ${version} not found` });
        }

        const result = syncPatchFeed(draft, { version });
        draft.syncedToLocalFeedAt = new Date().toISOString();
        draftManager.saveDraft(version, draft);

        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Public endpoint for launcher to fetch patch notes from Wix
    // This endpoint reads from Wix public data (no API keys needed)
    // The Wix collection must be set to public read permissions
    this.app.get('/patchNotes', async (req, res) => {
      try {
        const WixPublicReader = require('./wixPublicReader');
        
        // Get Wix site ID from environment (same one used for publishing)
        const siteId = process.env.WIX_SITE_ID;
        if (!siteId) {
          return res.status(500).send('<!--PATCH NOTES START--><p>Patch notes service not configured. WIX_SITE_ID not set.</p><!--PATCH NOTES END-->');
        }

        // Optional: Get public page URL from query param or env var for scraping fallback
        const publicPageUrl = req.query.pageUrl || process.env.WIX_PATCH_NOTES_PAGE_URL;
        
        // Optional: Get custom domain (e.g., "account.adrullan.online") for custom Wix domains
        const customDomain = req.query.domain || process.env.WIX_CUSTOM_DOMAIN;
        
        const reader = new WixPublicReader(siteId);
        const html = await reader.getPatchNotesHTML(publicPageUrl, customDomain);
        
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
      } catch (error) {
        console.error('Error fetching patch notes from Wix:', error);
        res.status(500).send(`<!--PATCH NOTES START--><p>Error loading patch notes: ${error.message}</p><!--PATCH NOTES END-->`);
      }
    });
    
    // Legacy endpoints for HTML access
    this.app.get('/api/patch-notes/latest', (req, res) => {
      const fs = require('fs');
      const dataPath = path.join(__dirname, '..', 'data', 'patch-notes-latest.html');
      
      if (fs.existsSync(dataPath)) {
        const html = fs.readFileSync(dataPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.status(404).json({ error: 'No patch notes found' });
      }
    });
    
    this.app.get('/api/patch-notes/:version', (req, res) => {
      const fs = require('fs');
      const { version } = req.params;
      const dataPath = path.join(__dirname, '..', 'data', `patch-notes-${version}.html`);
      
      if (fs.existsSync(dataPath)) {
        const html = fs.readFileSync(dataPath, 'utf-8');
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.status(404).json({ error: `Patch notes for version ${version} not found` });
      }
    });
    
    this.app.get('/api/patch-notes', (req, res) => {
      const fs = require('fs');
      const metadataPath = path.join(__dirname, '..', 'data', 'patch-notes-metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        res.json(metadata);
      } else {
        res.json({ latest: null, versions: {} });
      }
    });
    
    // Helper function to publish to Discord
    async function publishToDiscord(draft, client) {
      if (!client || !client.isReady()) {
        throw new Error('Discord client not available or not ready');
      }
      
      const PATCH_NOTES_CHANNEL_ID = '988344772701863936';
      const channel = await client.channels.fetch(PATCH_NOTES_CHANNEL_ID);
      
      if (!channel) {
        throw new Error('Could not find patch notes channel');
      }
      
      // Split Discord message if too long
      const messages = splitDiscordMessage(draft.discord);
      
      // Post version header first
      await channel.send(`**${draft.version}**\n\n${messages[0]}`);
      
      // Post remaining messages if split
      for (let i = 1; i < messages.length; i++) {
        await channel.send(messages[i]);
      }
      
      return {
        channelId: PATCH_NOTES_CHANNEL_ID,
        messageCount: messages.length
      };
    }
    
    function splitDiscordMessage(text, maxLength = 1900) {
      const sections = text.split('\n\n');
      const messages = [];
      let currentMessage = '';
      
      for (const section of sections) {
        if (currentMessage.length + section.length + 2 > maxLength) {
          if (currentMessage) {
            messages.push(currentMessage.trim());
            currentMessage = '';
          }
          
          if (section.length > maxLength) {
            const lines = section.split('\n');
            let currentChunk = '';
            
            for (const line of lines) {
              if (currentChunk.length + line.length + 1 > maxLength) {
                if (currentChunk) {
                  messages.push(currentChunk.trim());
                  currentChunk = '';
                }
              }
              currentChunk += (currentChunk ? '\n' : '') + line;
            }
            
            if (currentChunk) {
              currentMessage = currentChunk;
            }
          } else {
            currentMessage = section;
          }
        } else {
          currentMessage += (currentMessage ? '\n\n' : '') + section;
        }
      }
      
      if (currentMessage) {
        messages.push(currentMessage.trim());
      }
      
      return messages;
    }
    
    // Serve static files from public directory (after auth)
    this.app.use(express.static(path.join(__dirname, '..', 'public')));
    
    // CORS headers for development
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }

  setupRoutes() {
    // Dashboard route
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
    });

    // Dashboard API endpoint
    this.app.get('/dashboard', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    // Patch notes editor route
    this.app.get('/dashboard/patchnotes/:version', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'patchnotes-editor.html'));
    });

    this.app.get('/dashboard/cat-screenshots', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'cat-screenshots.html'));
    });

    // Basic health check
    this.app.get('/health', (req, res) => {
      const health = monitor.isHealthy();
      const status = health.healthy ? 200 : 503;
      
      res.status(status).json({
        status: health.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: monitor.getUptime(),
        checks: health.checks,
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Detailed status
    this.app.get('/status', (req, res) => {
      const status = monitor.getStatus();
      res.json(status);
    });

    // System metrics
    this.app.get('/metrics', (req, res) => {
      const metrics = monitor.getSystemMetrics();
      res.json(metrics);
    });

    // Cost metrics
    this.app.get('/costs', (req, res) => {
      const costMetrics = monitor.getCostMetrics();
      res.json(costMetrics);
    });

    // Bot-specific status
    this.app.get('/bot/status', (req, res) => {
      const status = {
        ...monitor.getStatus(),
        activeProfile: profileManager.activeProfile,
        contextMode: anthropicClient.isContextPassing() ? 'Context Passing' : 'File Usage',
        availableProfiles: profileManager.getAllProfiles(),
        environment: process.env.NODE_ENV || 'development'
      };
      res.json(status);
    });

    // Profile management endpoints
    this.app.get('/bot/profiles', (req, res) => {
      const profiles = profileManager.getAllProfiles().map(name => {
        const profile = profileManager.getProfile(name);
        return {
          name,
          displayName: profile.name,
          description: profile.description,
          maxTokens: profile.maxTokens,
          responseLength: profile.responseLength,
          personality: profile.personality,
          allowSpeculation: profile.allowSpeculation,
          allowOffTopic: profile.allowOffTopic,
          includeConversationContext: profile.includeConversationContext,
          citationStyle: profile.citationStyle,
          systemPrompt: profile.systemPrompt,
          active: name === profileManager.activeProfile
        };
      });
      res.json(profiles);
    });

    this.app.post('/bot/profiles/:name/switch', (req, res) => {
      const { name } = req.params;
      const success = profileManager.setActiveProfile(name);
      
      if (success) {
        monitor.trackProfileSwitch(profileManager.activeProfile, name);
        
        // Send Discord notification
        sendDiscordNotification(`🔄 **Profile Switched via Dashboard**\n\n**New Active Profile:** ${name}\n**Previous Profile:** ${profileManager.activeProfile}\n\n*Profile switched from web dashboard*`);
        
        res.json({ success: true, message: `Switched to profile: ${name}` });
      } else {
        res.status(404).json({ success: false, message: `Profile not found: ${name}` });
      }
    });

    // File upload status
    this.app.get('/bot/files', async (req, res) => {
      try {
        const files = await anthropicClient.listWorkspaceFiles();
        res.json({
          count: files.length,
          files: files.map(file => ({
            id: file.id,
            filename: file.filename,
            size: file.size_bytes,
            created: file.created_at
          }))
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Logs endpoint (last 100 lines)
    this.app.get('/bot/logs', (req, res) => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const logFile = require('path').join(__dirname, '..', 'logs', `${today}.log`);
        
        if (require('fs').existsSync(logFile)) {
          const logs = require('fs').readFileSync(logFile, 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .slice(-100)
            .map(line => {
              try {
                return JSON.parse(line);
              } catch {
                return { message: line, timestamp: new Date().toISOString() };
              }
            });
          
          res.json({ logs });
        } else {
          res.json({ logs: [] });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Error logs
    this.app.get('/bot/logs/errors', (req, res) => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const errorLogFile = require('path').join(__dirname, '..', 'logs', `${today}-errors.log`);
        
        if (require('fs').existsSync(errorLogFile)) {
          const errors = require('fs').readFileSync(errorLogFile, 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .slice(-50)
            .map(line => {
              try {
                return JSON.parse(line);
              } catch {
                return { message: line, timestamp: new Date().toISOString() };
              }
            });
          
          res.json({ errors });
        } else {
          res.json({ errors: [] });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Restart endpoint (for PM2)
    this.app.post('/bot/restart', (req, res) => {
      monitor.log('INFO', 'Restart requested via health check endpoint');
      
      // Send Discord notification
      sendDiscordNotification(`🔄 **Bot Restart via Dashboard**\n\n*Bot restart initiated from web dashboard*`);
      
      res.json({ message: 'Restart initiated' });
      
      // Graceful shutdown
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });

    // Profile management endpoints
    this.app.post('/bot/profiles', (req, res) => {
      try {
        const { name, displayName, description, systemPrompt, maxTokens, responseLength, personality, allowSpeculation, allowOffTopic, includeConversationContext, citationStyle } = req.body;
        
        const profileData = {
          name: displayName,
          description,
          systemPrompt,
          maxTokens,
          responseLength,
          personality,
          allowSpeculation,
          allowOffTopic,
          includeConversationContext,
          citationStyle
        };
        
        const success = profileManager.createProfile(name, profileData);
        
        if (success) {
          sendDiscordNotification(`✨ **New Profile Created via Dashboard**\n\n**Profile:** ${displayName} (${name})\n**Description:** ${description}\n\n*Profile created from web dashboard*`);
          res.json({ success: true, message: `Profile "${name}" created successfully` });
        } else {
          res.status(400).json({ success: false, message: `Profile "${name}" already exists` });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    this.app.put('/bot/profiles/:name', (req, res) => {
      try {
        const { name } = req.params;
        const updates = req.body;
        
        const profile = profileManager.getProfile(name);
        if (!profile) {
          return res.status(404).json({ success: false, message: `Profile "${name}" not found` });
        }
        
        // Update profile (you'll need to add an update method to profileManager)
        const success = profileManager.updateProfile(name, updates);
        
        if (success) {
          sendDiscordNotification(`✏️ **Profile Updated via Dashboard**\n\n**Profile:** ${name}\n\n*Profile updated from web dashboard*`);
          res.json({ success: true, message: `Profile "${name}" updated successfully` });
        } else {
          res.status(400).json({ success: false, message: `Failed to update profile "${name}"` });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    this.app.delete('/bot/profiles/:name', (req, res) => {
      try {
        const { name } = req.params;
        
        if (name === 'locked-down') {
          return res.status(400).json({ success: false, message: 'Cannot delete the default profile' });
        }
        
        const success = profileManager.deleteProfile(name);
        
        if (success) {
          sendDiscordNotification(`🗑️ **Profile Deleted via Dashboard**\n\n**Profile:** ${name}\n\n*Profile deleted from web dashboard*`);
          res.json({ success: true, message: `Profile "${name}" deleted successfully` });
        } else {
          res.status(404).json({ success: false, message: `Profile "${name}" not found` });
        }
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // API info endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Adrullan FAQ Bot',
        version: process.env.npm_package_version || '1.0.0',
        status: 'running',
        dashboard: '/dashboard',
        endpoints: [
          'GET /health - Basic health check',
          'GET /status - Detailed status',
          'GET /metrics - System metrics',
          'GET /costs - Cost metrics and usage',
          'GET /bot/status - Bot-specific status',
          'GET /bot/profiles - List profiles',
          'POST /bot/profiles/:name/switch - Switch profile',
          'POST /bot/profiles - Create profile',
          'PUT /bot/profiles/:name - Update profile',
          'DELETE /bot/profiles/:name - Delete profile',
          'GET /bot/files - List uploaded files',
          'GET /bot/logs - Recent logs',
          'GET /bot/logs/errors - Error logs',
          'POST /bot/restart - Restart bot'
        ]
      });
    });
  }

  start() {
    this.server = this.app.listen(this.port, () => {
      monitor.log('SUCCESS', `Health check server started on port ${this.port}`);
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      monitor.log('INFO', 'Health check server stopped');
    }
  }

  // Set Discord client for notifications
  setDiscordClient(client) {
    discordClient = client;
  }
}

// Discord notification function
async function sendDiscordNotification(message) {
  if (!discordClient) {
    monitor.log('WARN', 'Discord client not available for notifications');
    return;
  }

  try {
    // Find the first text channel where the bot can send messages
    const channel = discordClient.channels.cache.find(channel => 
      channel.type === 0 && channel.permissionsFor(discordClient.user).has('SendMessages')
    );

    if (channel) {
      await channel.send(message);
      monitor.log('INFO', 'Discord notification sent');
    } else {
      monitor.log('WARN', 'No suitable channel found for Discord notification');
    }
  } catch (error) {
    monitor.log('ERROR', `Failed to send Discord notification: ${error.message}`);
  }
}

module.exports = HealthCheckServer;

