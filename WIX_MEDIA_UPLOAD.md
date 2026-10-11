# Wix Media Upload Integration

This integration allows patch notes images to be automatically uploaded to Wix Media Manager, providing permanent CDN-hosted URLs instead of expiring Discord CDN links.

## Setup

### 1. Get Wix API Credentials

**API Key:**
1. Go to https://manage.wix.com/account/api-keys
2. Click "Generate API Key"
3. Give it a name like "Patch Notes Image Upload"
4. **Permissions needed:**
   - ✅ Media Manager → Upload Media
   - ✅ Media Manager → Manage Media
5. Copy the API key (you can't see it again!)

**Site ID (metaSiteId):**
1. Go to your Wix Site Editor
2. Look at the URL bar
3. Find the `metaSiteId` parameter in the URL
4. Example URL: `https://editor.wix.com/html/editor/web/renderer/edit/{site-id}?metaSiteId={YOUR_SITE_ID}`
5. Copy the `metaSiteId` value (UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### 2. Add to .env file

```env
# Wix Media Manager API
WIX_API_KEY=your_api_key_here
WIX_SITE_ID=your_site_id_here
```

**Example:**
```env
WIX_API_KEY=IST.eyJ...
WIX_SITE_ID=72045a41-0989-4e3b-b696-7a6d9de97170
```

## Usage

### Automatic Upload (Discord Command)

When using the patch notes command with images:

```
!patchnotes -withimages
```

The bot will:
1. Download images from Discord to local storage
2. Upload images to Wix Media Manager
3. Store both local paths and Wix URLs in the draft
4. Use Wix URLs in the HTML export

### Retroactive Upload (Existing Drafts)

To upload images from existing drafts:

```bash
cd adrullan-faq-bot
node scripts/uploadExistingImagesToWix.js 0.10.43
```

Options:
- `--force` - Re-upload images that already have Wix URLs

The script will:
- Load the draft JSON
- Upload all downloaded images to Wix
- Update the draft with Wix URLs
- Preserve local backups

### Example Output

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
   ❌ Failed: 0

💾 Draft updated: data/patch-notes-drafts/draft-0.10.43.json
```

## Technical Details

### Wix API Flow

Based on the [official Wix Media Manager API documentation](https://dev.wix.com/docs/api-reference/assets/media/media-manager/files/update-file-descriptor):

1. **Generate Upload URL** - Request temporary upload URL from Wix
   - `POST https://www.wixapis.com/site-media/v1/files/generate-upload-url`
   - Returns: `{ uploadUrl, uploadToken }`
   
2. **Upload File** - Upload file to temporary URL
   - `PUT {uploadUrl}` with file content and correct Content-Type header
   
3. **Import to Media Manager** - Move file to permanent storage
   - `POST https://www.wixapis.com/site-media/v1/files/import`
   - Body: `{ file_name, upload_token, parent_folder_id }`

### Draft JSON Structure

Images in drafts now include both local and Wix URLs:

```json
{
  "downloadedImages": [
    {
      "originalUrl": "https://cdn.discordapp.com/...",
      "localPath": "patch-notes-images/0.10.43/1448056210321309747.png",
      "filename": "1448056210321309747.png",
      "wixUrl": "https://static.wixstatic.com/media/...",
      "wixFileId": "xxx",
      "uploadedToWix": "2025-12-16T...",
      "messageId": "1448056210619109426",
      "attachmentId": "1448056210321309747",
      "noteIndex": 22,
      "width": 701,
      "height": 359
    }
  ]
}
```

## Benefits

✅ **Permanent URLs** - Wix CDN URLs don't expire like Discord links
✅ **Professional hosting** - Images served from your Wix site's infrastructure
✅ **Local backups** - Still keeps local copies for safety
✅ **Centralized media** - All images in one place with your other marketing content
✅ **Flexible usage** - Can use images in both website and Discord

## Troubleshooting

### "WIX_API_KEY and WIX_SITE_ID must be set"
- Make sure you've added both variables to your `.env` file
- Restart the bot after adding environment variables

### "Wix API error (401)"
- Check that your API key is correct
- Verify the API key has Media Manager permissions

### "Wix API error (400)" or HTML error pages
- Check that your Site ID (metaSiteId) is correct
- Make sure you're using `WIX_SITE_ID` not `WIX_ACCOUNT_ID`
- The Site ID is different from the Account ID

### Upload fails silently
- Check console logs for detailed error messages
- Verify images exist in local storage
- Check file permissions on image files

### Rate limiting
- The script includes 800ms delays between uploads
- If you get rate limited, wait a few minutes and try again

