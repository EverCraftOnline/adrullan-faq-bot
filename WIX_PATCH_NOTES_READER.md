# Wix Patch Notes Reader

This module allows reading patch notes from your Wix CMS collection **without requiring API keys**. It's designed to work with public Wix collections.

## Setup

### 1. Make Your Wix Collection Public

1. Go to your Wix site dashboard
2. Navigate to **CMS** → Select your collection (`Import1`)
3. Click the **More Actions** icon (⋮) → **Permissions & privacy**
4. Set **Read** permission to **Everyone** (public access)

⚠️ **Important**: Only make collections public if they don't contain sensitive data.

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# Required: Your Wix Site ID (same one used for publishing)
WIX_SITE_ID=your-site-id-here

# Optional: Custom domain if your Wix site uses a custom domain
# Example: account.adrullan.online
WIX_CUSTOM_DOMAIN=account.adrullan.online

# Optional: Public page URL for scraping fallback
# This is the URL where patch notes are displayed on your Wix site
# Example: https://account.adrullan.online/patch-notes
WIX_PATCH_NOTES_PAGE_URL=https://your-wix-site.com/patch-notes
```

### 3. How It Works

The reader tries two methods in order:

1. **Public Data API** (preferred)
   - Attempts to query Wix's public data API endpoint
   - Works if collection is set to public read permissions
   - Format: `https://{domain}/_api/wix-data/v2/items/query`

2. **Page Scraping** (fallback)
   - If API doesn't work, scrapes the public page URL
   - Requires `WIX_PATCH_NOTES_PAGE_URL` to be set

## Endpoint

The FAQ bot now exposes a `/patchNotes` endpoint that:

- Reads from your Wix collection (no API keys needed)
- Returns HTML formatted with `<!--PATCH NOTES START-->` and `<!--PATCH NOTES END-->` markers
- Compatible with your launcher's `PatchNotesService`

### Usage

If your FAQ bot is hosted at `https://account.adrullan.online`, the launcher can fetch from:
```
https://account.adrullan.online/patchNotes
```

### Query Parameters

- `pageUrl` - Override the public page URL for scraping
- `domain` - Override the custom domain for API access

Example:
```
https://account.adrullan.online/patchNotes?domain=account.adrullan.online&pageUrl=https://account.adrullan.online/patch-notes
```

## Troubleshooting

### "Patch notes service not configured"
- Make sure `WIX_SITE_ID` is set in your `.env` file

### "No patch notes available"
- Check that your Wix collection is set to public read permissions
- Verify that patch notes have been published to Wix
- Try setting `WIX_PATCH_NOTES_PAGE_URL` for scraping fallback

### API returns 401/403
- Ensure collection permissions are set to **Everyone** (public)
- Check that you're using the correct site ID

### API returns 404
- Verify the collection ID is correct (`Import1` by default)
- Check that the API endpoint format matches your Wix site type (custom domain vs wixsite.com)

## Testing

You can test the endpoint directly:

```bash
curl https://account.adrullan.online/patchNotes
```

Or visit it in a browser to see the HTML output.

## Notes

- The reader uses the same `WIX_SITE_ID` as your publishing setup
- No API keys are required for reading (only for writing/publishing)
- The endpoint is public and doesn't require authentication
- HTML is formatted to match your launcher's expected format

