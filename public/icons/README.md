# App icons — organized by platform

Every icon here is the **same SLF logo**, exported at the size and shape each
platform needs. They are all generated from one master image:

- **Master logo:** `public/slf_logo.jpeg` (square, white background, 1600×1600)

## Folders

| Folder | File | Size | Used by |
|---|---|---|---|
| `ios/` | `apple-touch-icon.png` | 180×180 | iPhone / iPad home screen (Add to Home Screen). iOS reads only this, not the manifest. |
| `android/` | `pwa-192.png` | 192×192 | Android/Chrome installed PWA (standard) |
| `android/` | `pwa-512.png` | 512×512 | Android/Chrome installed PWA (large / splash) |
| `android/` | `pwa-maskable-512.png` | 512×512 | Android adaptive icon (the launcher may crop it to a circle/squircle) |
| `browser/` | `favicon-16.png` | 16×16 | Browser tab (small) |
| `browser/` | `favicon-32.png` | 32×32 | Browser tab (standard) |
| `notifications/` | `notification-logo.png` | 192×192 | Push notification tray icon |

> Not here on purpose: `public/icons.svg` is the UI icon **sprite** (bell, search,
> arrows…), not a logo. `public/slf-logo.png` is the general in-app/share logo.

## To change the logo later

1. Replace the master `public/slf_logo.jpeg` with your new logo.
   Keep it **square** with a **white (or solid) background** — no transparency,
   or iOS will fill the corners with black.
2. Regenerate every size into these folders. On Windows (PowerShell), the script
   used to build these lives in the project history; the sizes to produce are the
   ones in the table above. Then bump the `?v=` number on the
   `apple-touch-icon` link in `index.html` so iPhones re-download it.
3. On phones, **remove and re-add** the home-screen icon — both iOS and Android
   cache the installed icon aggressively and won't refresh it in place.

## Where these paths are wired

- `index.html` — favicons + apple-touch-icon `<link>` tags
- `vite.config.ts` — PWA manifest `icons` + `includeAssets`
- `public/firebase-messaging-sw.js` and `src/notifications/NotificationService.ts`
  — notification `icon`
