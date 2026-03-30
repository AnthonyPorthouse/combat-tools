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

- Run `npx tsc -b --noEmit` to verify there are no build errors
- Run `npm run lint` to verify we have no linting issues
- Update the `README.md` when new functionality is added, or behaviours are changed

## Environments

- Developer environment started with `npm run dev`, url is http://localhost:5173
- Storybook environment started with `npm run storybook`, url is http://localhost:6006
