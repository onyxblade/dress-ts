# Repository Guidelines

## Project Structure & Module Organization

`dress-ts` explores rendering TypeScript ASTs as readable HTML using Preact.

- `src/core/`: shared rendering, layout, comments, node identity, and compiler services.
- `src/themes/<name>/`: self-contained themes; Ruby includes its own README and `test/` directory. Register new themes in `src/themes/index.ts`.
- `src/samples/`: small programs available in the demo's file menu.
- `src/app.tsx`, `src/main.tsx`, and `src/style.css`: demo UI, initialization, and styling.
- `test/core/`: shared infrastructure tests. `dist/` is generated build output.

## Build, Test, and Development Commands

Use pnpm `12.11.2`, pinned in `package.json`; CI uses Node.js 26.

- `pnpm install --frozen-lockfile`: install the locked dependencies.
- `pnpm dev`: start the Vite demo server.
- `pnpm typecheck`: run strict TypeScript checking without emitting files.
- `pnpm lint`: check demo samples against the TypeScript theme's switch contract and strict equality rule.
- `pnpm test`: run the Vitest suite once.
- `pnpm exec vitest run src/themes/ruby/test/function.test.tsx`: run one test file.
- `pnpm build`: build the production demo into `dist/`.
- `pnpm preview`: serve the production build locally.

Run typechecking, lint, tests, and the build before submitting code changes. CI runs these checks before deploying pushes to `main`; `GITHUB_PAGES=1 pnpm build` sets the `/dress-ts/` base path.

## Coding Style & Naming Conventions

Follow existing TypeScript/TSX: two-space indentation, single-quoted strings, no statement-ending semicolons, and trailing commas in multiline structures. Use PascalCase for components and types, camelCase for functions and variables, and descriptive filenames such as `quickInfo.tsx`. Use type-only imports where appropriate and Preact's `class` attribute in JSX. No formatter or general style lint is configured; ESLint enforces the TypeScript theme's switch contract and strict equality rule in demo samples.

## Architecture Rules

Keep rendering one-way: never mutate the AST. Designed components read semantic node fields and delegate children through `Render`; use core layout primitives for structure. Preserve every comment, including dangling comments via `Lines`'s `within` prop. Keep theme decisions inside their theme folder and document new readings in its README.

## Testing Guidelines

Vitest runs in Node. Name tests `*.test.tsx` and place them with the relevant core or theme suite. Use `renderText`, `renderHtml`, and `lostComments` from `src/core/testing.tsx` to verify visible output, markup, and comment preservation. Cover rendering edge cases and fallback behavior. No numeric coverage threshold is configured.

## Commit & Pull Request Guidelines

After completing requested changes and passing the required checks, create a local commit.

History uses descriptive subjects, often prefixed by area: `Ruby:`, `App:`, or `Samples:`. Describe the observable behavior changed. Keep PRs focused; explain the change, include validation results, link relevant issues, and provide before/after rendering examples or screenshots for visual changes.
