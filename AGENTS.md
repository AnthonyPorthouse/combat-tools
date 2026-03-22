# AGENTS.md

## Setup commands

- Install deps: `npm install`
- Start dev server: `npm run dev`
- Lint code: `npm run lint`

## Code style

- TypeScript strict mode
- Single quotes, no semicolons
- Use functional patterns where possible
- JSDoc docblocks must be used, describe what and why. A\* quality only
- Prefer single exports per file, except for barrel files.

## Functionality considerations

- Prefer existing well used and actively maintained packages over rolling our own behaviour
- Follow SOLID principles

## Review Tasks

- Run `npx tsc --noEmit` to verify there are no build errors
- Run `npm run lint` to verify we have no eslint issues
- Update the `README.md` when new functionality is added, or behaviours are changed
