# AGENTS.md

## Setup commands

- Install deps: `npm install`
- Start dev server: `npx turbo dev`
- Lint code: `npx turbo lint`

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
- Run `npx turbo lint` to verify we have no linting issues
- Update the `README.md` when new functionality is added, or behaviours are changed

## Environments

- Developer environment started with `npx turbo dev`, url is http://localhost:5173
- Storybook environment started with `npm run -w ui storybook`, url is http://localhost:6006
