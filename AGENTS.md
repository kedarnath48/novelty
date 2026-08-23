# AGENTS.md

## Commands

- `npm run dev` - Run electrobun dev in watch mode
- `npm run dev:hmr` - Run both Vite HMR (port 5173) and electrobun concurrently
- `npm run start` - Build then run electrobun dev
- `npm run build:canary` - Build for canary environment

## Architecture

- **Framework**: Electrobun (Electron-based) with React 18 + TypeScript + Vite 6
- **Database**: Drizzle ORM
- **Entry points**: Two separate React apps in `src/mainview/` and `src/projectsview/`
- **Vite root**: `src/` (not project root)

## Key Quirks

- Vite config `root: "src"` means config references relative to `src/`
- Build outputs to `dist/` with no code splitting (manualChunks disabled)
- The `fix-electrobun-paths` plugin rewrites relative paths in output HTML
- No lint/test/typecheck scripts - run them manually if added

## Dependencies

Run `npm install` (or `bun install`) after pulling changes.
