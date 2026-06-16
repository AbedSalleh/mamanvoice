# MamanVoice

An offline-first AAC (Augmentative and Alternative Communication) board for children.

## Features

- Works 100% offline (IndexedDB + service worker), with persistent-storage opt-in
- Stores images and audio locally; uploaded images are downscaled/compressed automatically
- Backup/restore to a JSON file (schema-validated on import)
- Text-to-speech fallback with adjustable speed, pitch, volume and voice (English / Bahasa Melayu)
- Folder organization with drag-and-drop reordering
- Child-safe mode toggle (triple-tap or long-press), with confirm-before-delete

## Development

```bash
npm install
npm run check   # type check
npm test        # unit tests (Vitest)
npm run build   # production build (client + service worker)
npm run dev:client   # Vite dev server
```

### Project layout

- `client/` — the offline PWA (the actual app). `client/src/lib/db.ts` is the IndexedDB
  data layer and `shared/aac.ts` holds the shared card/backup schema.
- `android/` + `capacitor.config.ts` — Capacitor wrapper for the Android build.
- `server/` — a small optional Express server used only for local development/hosting;
  the deployed app is fully static and does not require it.
