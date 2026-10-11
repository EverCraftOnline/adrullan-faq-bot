# ✅ Wix Image Upload - SUCCESS!

## What We Accomplished

Successfully integrated Wix Media Manager API to upload patch notes images, solving the Discord CDN link expiration problem.

### Test Results (0.10.43)

✅ **10/10 images uploaded successfully**

Sample URLs:
- https://static.wixstatic.com/media/c148e5_08a2a045832e41b8983ca7fb5a350b73~mv2.png
- https://static.wixstatic.com/media/c148e5_2d087c03425b4aa89ec1bcfc30b00c58~mv2.png
- https://static.wixstatic.com/media/c148e5_3086c2d9fb7344afa8647a4447c384e8~mv2.png

## Configuration

### Environment Variables Required

```env
WIX_API_KEY=IST.eyJ...
WIX_SITE_ID=72045a41-0989-4e3b-b696-7a6d9de97170
```

### Key Discoveries

1. **Site ID vs Account ID**: The API requires `wix-site-id` header with the site's `metaSiteId`, NOT the account ID
2. **Request Body Required**: Must include `mimeType` and `fileName` in the generate-upload-url request
3. **Query Parameter**: Must add `filename` query parameter when uploading to the upload URL
4. **Direct Upload**: Files upload directly and return full metadata - no separate import step needed

## How It Works

### For Future Patch Notes

When using `!patchnotes -withimages`:
1. Downloads images from Discord → saves locally
2. Automatically uploads to Wix Media Manager
3. Stores both local path and Wix URL in draft
4. HTML export uses permanent Wix URLs

### For Existing Drafts

```bash
node scripts/uploadExistingImagesToWix.js <version>
```

Example:
```bash
node scripts/uploadExistingImagesToWix.js 0.10.43
```

## Files Created/Modified

### New Files
- `lib/wixMediaUploader.js` - Wix upload client
- `scripts/uploadExistingImagesToWix.js` - Batch upload script for existing drafts
- `scripts/testWixAuth.js` - Debug/test script for API authentication
- `WIX_MEDIA_UPLOAD.md` - Complete documentation
- `TEST_WIX_UPLOAD.md` - Testing guide

### Modified Files
- `commands/patchNotesCommand.js` - Integrated Wix upload into patch notes flow
- Draft JSON structure now includes:
  ```json
  {
    "wixUrl": "https://static.wixstatic.com/media/...",
    "wixFileId": "c148e5_...",
    "uploadedToWix": "2025-12-16T18:42:05.000Z"
  }
  ```

## Benefits

✅ **Permanent URLs** - No more 24-hour expiration  
✅ **Professional CDN** - Wix's global infrastructure  
✅ **Centralized** - All images in one place with marketing content  
✅ **Local Backup** - Still keeps local copies for safety  
✅ **Automatic** - Uploads happen automatically with `-withimages` flag

## API Details

### Endpoint
```
POST https://www.wixapis.com/site-media/v1/files/generate-upload-url
```

### Headers
```
Authorization: {API_KEY}
wix-site-id: {SITE_ID}
Content-Type: application/json
```

### Body
```json
{
  "mimeType": "image/png",
  "fileName": "filename.png"
}
```

### Response
```json
{
  "uploadUrl": "https://upload.wixmp.com/upload/..."
}
```

### Upload File
```
PUT {uploadUrl}?filename={filename}
Content-Type: image/png

{file_content}
```

### Upload Response
```json
{
  "file": {
    "id": "c148e5_...",
    "url": "https://static.wixstatic.com/media/...",
    "displayName": "filename.png",
    ...
  }
}
```

## Next Steps

1. ✅ Images are now permanently on Wix
2. Update your patch notes editor/dashboard to use `wixUrl` field
3. Future patch notes will automatically upload with `-withimages` flag
4. Can delete local images if needed (but keep them as backup!)

## Troubleshooting

If uploads fail in the future:
1. Check API key hasn't expired
2. Verify Site ID is correct (it's in your editor URL)
3. Run test script: `node scripts/testWixAuth.js`
4. Check API permissions include "Manage Media Manager"

