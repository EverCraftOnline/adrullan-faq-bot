# Testing Wix Upload with 0.10.43

Quick guide to test the Wix image upload with your existing patch notes.

## Pre-Test Checklist

1. ✅ WIX_API_KEY added to `.env`
2. ✅ WIX_ACCOUNT_ID added to `.env`
3. ✅ Images exist in `data/patch-notes-images/0.10.43/` (10 images)
4. ✅ Draft exists at `data/patch-notes-drafts/draft-0.10.43.json`

## Test Steps

### Step 1: Dry Run (Check what will happen)

```bash
cd adrullan-faq-bot
node scripts/uploadExistingImagesToWix.js
```

This shows available versions without doing anything.

### Step 2: Upload Images to Wix

```bash
node scripts/uploadExistingImagesToWix.js 0.10.43
```

Expected output:
```
🔄 Processing version 0.10.43...
📸 Found 10 image(s) to upload

🚀 Starting upload to Wix...

[1/10] Uploading 1448056210321309747.png...
  ✅ Success! URL: https://static.wixstatic.com/media/...
[2/10] Uploading 1448144560353185964.png...
  ✅ Success! URL: https://static.wixstatic.com/media/...
...

📊 Upload Summary:
   ✅ Successful: 10

💾 Draft updated: data/patch-notes-drafts/draft-0.10.43.json

🔗 Sample Wix URLs:
   https://static.wixstatic.com/media/...
   https://static.wixstatic.com/media/...
```

### Step 3: Verify Draft Updated

Check that `draft-0.10.43.json` now has `wixUrl` fields:

```bash
# On Windows PowerShell
Get-Content data/patch-notes-drafts/draft-0.10.43.json | Select-String "wixUrl"

# Or just open the file and search for "wixUrl"
```

You should see entries like:
```json
"wixUrl": "https://static.wixstatic.com/media/abc123...",
"wixFileId": "xxx",
"uploadedToWix": "2025-12-16T..."
```

### Step 4: Check Images in Wix

1. Go to your Wix Dashboard
2. Navigate to **Media Manager** (usually in left sidebar or under Settings)
3. Look for your uploaded images
4. They should be organized in folders or at the root

### Step 5: Test the URLs

Copy one of the Wix URLs from the draft and paste it in your browser. The image should load instantly from Wix's CDN.

## Troubleshooting

### "WIX_API_KEY and WIX_ACCOUNT_ID must be set"

Your `.env` file isn't being loaded. Make sure:
1. File is named exactly `.env` (not `.env.txt`)
2. Located in `adrullan-faq-bot/` root directory
3. No spaces around the `=` sign

Example `.env`:
```env
WIX_API_KEY=your_key_here
WIX_ACCOUNT_ID=your_id_here
```

### Script fails with API errors

Check the error message:
- **401 Unauthorized** - Wrong API key
- **403 Forbidden** - Wrong Account ID or missing permissions
- **404 Not Found** - Check the API endpoints haven't changed

### "Draft not found"

Make sure you're running from the `adrullan-faq-bot` directory:
```bash
cd adrullan-faq-bot
pwd  # Should show: .../adrullan-faq-bot
```

## What Happens Next?

Once this works:

1. **Future patch notes** will automatically upload to Wix when you use:
   ```
   !patchnotes -withimages
   ```

2. **HTML exports** will use Wix URLs instead of Discord CDN URLs

3. **Local backups** are still kept in `data/patch-notes-images/`

4. **Images never expire** - they're permanently on your Wix CDN

## Force Re-upload

If you need to re-upload images (e.g., to test again):

```bash
node scripts/uploadExistingImagesToWix.js 0.10.43 --force
```

This will upload even if `wixUrl` already exists in the draft.

