# Boards

A local-first new-tab bookmark manager built with Vite, React, TypeScript, and dnd-kit.

## Development

```bash
cd web
npm install
npm run dev
```

The development server runs at `http://localhost:5173`.

Use `http://localhost:5173/?demo=1` for a seeded, memory-only workspace that never writes browser storage.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

## Current implementation

Phase 5 completes the MVP implementation. It adds the exact TECH-SPEC §6 service worker, production-only registration, deterministic warm-up of hashed assets and all four wallpapers, and the five-file MV3 new-tab extension. A real Chromium production-build check confirms that the complete seeded workspace and its wallpaper reload offline after one online visit.

The final interaction pass covers local persistence, import/export/reset, immediate link deletion with five-second Undo, pointer and keyboard link sorting, board reordering and cross-page board movement, search, appearance persistence, favicon fallback, all four empty states, and memory-only `?demo=1` behavior.

The extension target is configured on first use (or from its popup). Set `extension/newtab.js`'s `DEFAULT_URL` after a permanent production deployment exists. See `../PHASE-5-REPORT.md` for the final QA matrix and the remaining external/deployment gaps.
