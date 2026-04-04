# PWA Setup Guide

This Vi-Notes app is now a Progressive Web App (PWA)! Here's how to complete the setup and add custom icons.

## What's Already Configured

✅ Service Worker (`/public/sw.js`) - Handles offline functionality and caching
✅ Manifest (`/public/manifest.json`) - Defines app metadata
✅ PWA Hooks & Components - UI for install prompts and offline indicators
✅ Vite PWA Plugin - Optimizes build and generates service worker

## Required: Add App Icons

The PWA needs two icon sizes in `/public/`:

- **icon-192x192.png** (192x192 pixels)
- **icon-512x512.png** (512x512 pixels)

### Quick Icon Generation Options

#### Option 1: Using ImageMagick (Windows/WSL)

```bash
# From a source image (e.g., 512px square PNG)
convert source-icon.png -resize 192x192 icon-192x192.png
convert source-icon.png -resize 512x512 icon-512x512.png
```

#### Option 2: Using Online Tool

1. Go to [favicon-generator.org](https://www.favicon-generator.org/)
2. Upload your 512x512 icon image
3. Download the generated files
4. Copy `icon-192x192.png` and `icon-512x512.png` to `/client/public/`

#### Option 3: Design a Custom Icon

- Use Figma, Adobe XD, or Photoshop
- Export as PNG at 512x512 (high quality)
- Use ImageMagick or an online tool to generate 192x192 version

## Features Now Available

### 1. Install Prompt

Users see a prompt to install the app:

- Shows automatically when the app is installable
- Includes "Install" and "Later" buttons
- Can be dismissed

### 2. Offline Support

- Service Worker caches static assets and recent API responses
- Offline indicator shows users when they lose connection
- Network-first caching for API calls (5-minute cache)
- Cache-first for images (30-day cache)

### 3. App Shortcuts

The installed app shows a app drawer shortcut:

- "New Session" shortcut for quick access

## Testing PWA Locally

### 1. Build the app

```bash
cd client
npm run build
```

### 2. Serve production build locally

```bash
npm install -g http-server
http-server dist -p 8080
```

### 3. Open in browser

- Go to `http://localhost:8080`
- Open DevTools → Application tab
- Check "Manifest" and "Service Workers" tabs
- Should see registered service worker

### 4. Install the PWA

- Click the install prompt (or address bar should show install button)
- App installs to your device/OS

## Configuration

### Service Worker Cache Strategy

Edit `/public/sw.js` to customize:

- Cache version: `CACHE_VERSION = 'v1.0.0'`
- URLs to cache on install: `urlsToCache = [...]`

### Manifest Customization

Edit `/public/manifest.json` or `client/vite.config.ts` for:

- App name, colors, icons
- Start URL, display mode
- App shortcuts

### Vite Plugin Settings

Edit `client/vite.config.ts` `VitePWA` config:

- Workbox strategies (cache/network first)
- Cache expiration rules
- Asset patterns to include

## Deployment Considerations

### HTTPS Required

PWA only works on:

- `https://` domains (production)
- `localhost` (development)
- Not on plain `http://`

### Service Worker Scope

Currently scoped to `/` - serves entire domain.
Change in `manifest.json` or `/public/sw.js` if needed.

### Cache Busting

On new deployments, increment `CACHE_VERSION` in `sw.js`:

```javascript
const CACHE_VERSION = "v1.0.1"; // Update this
```

## Troubleshooting

**Icons not showing:**

- Ensure 192x192 and 512x512 PNGs exist in `/public/`
- Check file names match manifest exactly
- Images must be valid PNG format

**Service Worker not registering:**

- Check DevTools → Application → Service Workers
- Verify `/public/sw.js` exists and is valid
- Check console for registration errors
- PWA only works on https or localhost

**Install prompt not showing:**

- HTTPS required (except localhost)
- App must meet Chrome PWA criteria (manifest, icons, service worker)
- Some browsers require specific criteria
- Check browser console for errors

**Offline mode not working:**

- Service Worker might need HTTPS to update
- Hard refresh (Ctrl+Shift+R) to clear old cache
- Check Network tab in DevTools → see if requests are being cached

## Next Steps

1. **Add custom icons** (see "Required" section above)
2. **Deploy with HTTPS** to enable full PWA features
3. **Test on mobile** - install on iOS/Android devices
4. **Monitor cache** - review Service Worker cache in DevTools periodically
5. **Update strategy** - plan cache invalidation for new releases

## Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Vite PWA Plugin Docs](https://vite-pwa-org.netlify.app/)
- [Web App Manifest Spec](https://www.w3.org/TR/appmanifest/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
