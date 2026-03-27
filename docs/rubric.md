# World-Class React + VTT Application Rubric

A reference standard for evaluating and evolving this codebase. Each dimension defines what "world-class" looks like, broken into scored criteria. Use this alongside periodic [review snapshots](./review-2026-03-27.md) to track progress.

---

## Dimension 1: Accessibility (WCAG AA)

World-class means every user — regardless of assistive technology — can fully use the application.

### 1.1 Semantic HTML

- Correct landmark regions: `<header>`, `<main>`, `<nav>`, `<footer>` used consistently
- Logical heading hierarchy (no skipping levels)
- Lists use `<ul>`/`<ol>`, not styled `<div>` stacks
- Interactive controls use native elements (`<button>`, `<a>`, `<input>`) not divs with click handlers
- Dialogs use `<dialog>` element (or `role="dialog"` + `aria-modal="true"` if polyfilling)

### 1.2 ARIA

- ARIA used only where native semantics are insufficient
- All custom widgets have the correct role (`menu`, `menuitem`, `application`, `region`, etc.)
- All interactive elements have an accessible name (via label, `aria-label`, or `aria-labelledby`)
- Dynamic regions use `aria-live` appropriately (`polite` for status, `assertive` for errors)
- `aria-hidden="true"` used on decorative and backdrop elements

### 1.3 Keyboard Navigation

- Every interactive element reachable via Tab in a logical order
- Focus is never lost or sent to an invisible element
- Modal dialogs trap focus; Tab cycles within the dialog
- Focus returns to the trigger element when a modal closes
- All drag-and-drop operations have a keyboard equivalent
- Context menus accessible via keyboard shortcut (e.g. Shift+F10 or application key)
- Visible focus indicators on all focusable elements (not relying solely on browser defaults)

### 1.4 Color & Visual

- Normal text: ≥ 4.5:1 contrast ratio against background
- Large text (≥ 18pt or 14pt bold): ≥ 3:1 contrast ratio
- UI components and graphical objects: ≥ 3:1 contrast ratio
- Information is never conveyed by color alone
- Reduced motion respected via `prefers-reduced-motion` media query

### 1.5 Screen Reader Support

- Canvas-rendered content has an off-screen semantic equivalent (e.g. a live-updated token list)
- Form errors are announced via `aria-live` or by association with `aria-describedby`
- `aria-invalid="true"` set on inputs with validation errors
- `aria-required="true"` on required fields
- Status changes (token added, turn changed) announced via live regions
- Screen reader-only text uses a `.sr-only` utility class (not `display: none`)

### 1.6 Testing & Enforcement

- Automated axe-core scan runs in CI — zero violations to merge
- Storybook a11y addon set to `"error"` mode (not `"todo"`)
- Manual keyboard walkthrough for each new interactive feature
- At least one screen reader test per release (VoiceOver or NVDA)

---

## Dimension 2: Application Architecture

World-class means the codebase is predictable, extendable, and resistant to accidental complexity.

### 2.1 SOLID Principles

**Single Responsibility**

- Each module (component, hook, utility, store) has exactly one reason to change
- Components render UI; hooks manage behavior; stores manage persistent state; utils are pure

**Open/Closed**

- Core types and schemas are extendable without modification (registry patterns, not literal unions)
- New game system features don't require touching unrelated modules

**Liskov Substitution**

- Abstractions are consistent — swapping implementations doesn't break consumers
- Context providers and hooks have stable contracts

**Interface Segregation**

- Components don't receive props they don't use
- Hook return types expose only what callers need

**Dependency Inversion**

- High-level orchestration depends on abstractions (callbacks, contexts), not concrete implementations
- PixiJS dependencies isolated behind hooks/components so the React layer doesn't import PixiJS directly

### 2.2 Composability & Reusability

- Primitive components (`Modal`, `Button`, `Input`) are domain-agnostic and reused widely
- Hooks compose cleanly — hooks can call other hooks without circular dependencies
- Utilities are pure functions with no side effects
- No logic is duplicated across components

### 2.3 Error Handling

- Error Boundaries wrap every subsystem that can fail independently (canvas, image loading, routing)
- Async errors surface to users with meaningful feedback (not silent nulls or console.error)
- Failed persistence/rehydration has a graceful fallback
- All promises have rejection handling

### 2.4 Data Persistence

- Store schemas are versioned with migration functions for each version bump
- Corrupt or outdated localStorage data is detected and handled (not silently ignored)
- Export/import allows users to back up and restore sessions

### 2.5 State Management Clarity

- Global state is minimal — only data that genuinely crosses feature boundaries
- Derived state is computed (useMemo / selectors), not stored
- State mutations have one canonical location; no scattered setState calls for shared data
- Clear boundary between domain state (stores) and UI state (local/context)

### 2.6 Performance at Scale

- Rendering is O(tokens-on-screen), not O(all-tokens)
- Canvas redraws are batched and minimized via PixiJS scene graph
- No unnecessary React re-renders on parent updates (memoization applied to heavy subtrees)
- Large datasets (maps, token libraries) don't block the main thread

---

## Dimension 3: React Best Practices

World-class means idiomatic, predictable React that is easy to reason about and test.

### 3.1 Component Design

- Components are small, focused, and have a single visual/behavioral concern
- No component exceeds ~200 lines without clear justification
- Presentational and container concerns are separated
- Props are typed exhaustively; no `any`, no implicit `children` without explicit type

### 3.2 Custom Hooks

- Each hook encapsulates a single behavior or piece of state
- Hooks are independently testable without rendering a component
- All effects in hooks have correct dependency arrays (lint-enforced)
- All effects clean up subscriptions, listeners, and timers on unmount

### 3.3 State

- State lives at the lowest level that satisfies all consumers
- No state duplication between store and local state
- Server/async state (future) uses a dedicated library (React Query / SWR), not useEffect+useState

### 3.4 Performance

- `useMemo` applied to expensive computations (geometry, pathfinding, PixiJS objects)
- `useCallback` applied where referential stability prevents re-registration of event handlers
- `React.memo` applied to pure, heavy presentational subtrees
- No unnecessary object/array creation in render (stable references)

### 3.5 TypeScript

- `strict: true` with all ancillary flags enabled
- No `as` type casts except at verified system boundaries
- Domain types are narrow and accurate (no `string` where a union type is correct)
- Zod schemas are the single source of truth for runtime-validated shapes; types are inferred from them

### 3.6 Testing

- Coverage targets are meaningful (behavioral scenarios, not line counts)
- Custom hooks tested with `renderHook` + `act`
- Components tested via user-visible behavior (RTL `getByRole`, `getByLabelText`)
- Integration/E2E tests cover critical user flows end-to-end
- No tests that assert implementation details (internal state, private functions)

---

## Dimension 4: VTT-Specific Excellence

World-class means the application is a genuinely excellent tool for running tabletop combat.

### 4.1 Undo/Redo

- All state-mutating actions (add, move, delete, edit token) are undoable
- Multi-step undo/redo stack (≥ 20 actions)
- Undo/redo accessible via keyboard (Ctrl/Cmd+Z / Shift+Ctrl/Cmd+Z)

### 4.2 Selection Model

- Single token selection via click
- Multi-select via Shift+click or lasso drag
- Group move of selected tokens
- Select-all (Ctrl/Cmd+A)
- Clear selection on empty-space click or Escape

### 4.3 Input Handling

- Camera pan: right-click drag, middle-click drag, two-finger trackpad pan
- Camera zoom: scroll wheel, pinch gesture, keyboard shortcuts
- Token interaction: left-click drag, keyboard arrow nudge
- All interactions work with mouse, trackpad, and touch (tablet-friendly)

### 4.4 Persistence & Sessions

- Auto-save to localStorage on every change
- Explicit save/load to JSON file (export/import)
- Schema versioning with migration path for stored data
- No data loss on accidental page close

### 4.5 Game System Extensibility

- Token sizes, conditions, and stats are configurable without code changes
- Map grid can support square and hex layouts
- System-specific rules (flanking, facing, movement types) are additive, not hardcoded

### 4.6 Real-Time Readiness

- Store actions are serializable (no functions or DOM references in state)
- State mutations are described as discrete operations (compatible with CRDT/event-sourcing)
- Architecture doesn't assume single-client — no singleton patterns that block multiplayer

### 4.7 Visual Clarity

- Tokens are visually distinct at a glance (name, size, color/image)
- Turn order / initiative is visible
- Movement range, reach, and areas of effect can be visualized
- Grid supports measurement overlays

---

## Scoring Guide

Each dimension is scored 0–100. Use these bands to assess each criterion:

| Score  | Meaning                                                     |
| ------ | ----------------------------------------------------------- |
| 90–100 | World-class — sets the bar                                  |
| 75–89  | Strong — minor gaps only                                    |
| 60–74  | Adequate — functional but notable room to improve           |
| 40–59  | Developing — meaningful gaps affecting users or maintainers |
| 0–39   | Critical gaps — foundational work needed                    |
