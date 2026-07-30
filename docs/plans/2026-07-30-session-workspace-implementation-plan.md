# Session Workspace Prototype Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a clearly session-only, locally verifiable interaction flow for creating a space image, naming locations, recording an item, and showing its expiry state without installing or depending on Supabase.

**Architecture:** Keep all product rules in pure `src/lib` modules and keep browser-only concerns in one client workspace component. The workspace stores nothing in `localStorage`, IndexedDB, a Route Handler, or a server database: selected image object URLs and domain records live only for the active browser session. Future Supabase-backed APIs can replace the workspace command handlers without changing item validation, normalized coordinates, or expiry rules.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

---

### Task 1: Define and validate an item-recording input contract

**Files:**
- Create: `src/lib/items/item-input.ts`
- Create: `src/lib/items/item-input.test.ts`

**Step 1: Write the failing tests.**

Cover the smallest facts needed to make an item record trustworthy before persistence exists:

- whitespace is trimmed and an item name of 1–100 characters is accepted;
- an empty/non-text/overlong name is rejected with a stable error code;
- a missing or whitespace-only `locationId` is rejected, so an item can never be recorded without a location;
- a direct expiry date is optional, but when supplied it must be a real `YYYY-MM-DD` calendar date;
- unknown object shapes never throw.

**Step 2: Run the focused test and verify it fails.**

Run: `npx vitest run src/lib/items/item-input.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism`

Expected: FAIL because `validateItemInput` does not exist.

**Step 3: Write the minimal implementation.**

Export `ItemInput`, `ValidatedItemInput`, an explicit union of validation error codes, and `validateItemInput(input: unknown)`. Do not inject a current date, database ID, or user ID: those are ownership/persistence concerns that remain outside this prototype.

**Step 4: Re-run the focused test and verify it passes.**

Run: `npx vitest run src/lib/items/item-input.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism`

Expected: PASS.

**Step 5: Commit this isolated contract.**

```bash
git add src/lib/items/item-input.ts src/lib/items/item-input.test.ts
git commit -m "feat: validate prototype item input"
```

### Task 2: Create a pure in-session workspace state machine

**Files:**
- Create: `src/lib/spaces/workspace-state.ts`
- Create: `src/lib/spaces/workspace-state.test.ts`

**Step 1: Write failing reducer/command tests.**

Define tests for an explicit state transition model:

- `createWorkspaceSpace` creates one space from already validated name/image data;
- `addWorkspaceLocation` only accepts a valid normalized coordinate and trims a non-empty location name;
- `addWorkspaceItem` only adds an already validated item to an existing location in the active space;
- an unknown location or malformed command leaves state unchanged and returns a stable failure;
- `getWorkspaceItemsForLocation` returns only items attached to that location.

Pass deterministic IDs into each command rather than using `Date.now()` or `Math.random()`; tests and hydration must not depend on unstable values.

**Step 2: Run the focused test and verify it fails.**

Run: `npx vitest run src/lib/spaces/workspace-state.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism`

Expected: FAIL because the workspace state module does not exist.

**Step 3: Implement the minimal pure state module.**

Keep only `WorkspaceSpace`, `WorkspaceLocation`, `WorkspaceItem`, and command result types. Reuse `isNormalizedLocation` and consume `ValidatedItemInput`; do not implement browser storage, fake user IDs, persistence, or a mock API.

**Step 4: Re-run the focused test and verify it passes.**

Run: `npx vitest run src/lib/spaces/workspace-state.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism`

Expected: PASS.

**Step 5: Commit this isolated state machine.**

```bash
git add src/lib/spaces/workspace-state.ts src/lib/spaces/workspace-state.test.ts
git commit -m "feat: add session workspace state"
```

### Task 3: Build the session-only space workspace UI

**Files:**
- Modify: `src/components/local-space-preview.tsx`
- Modify: `src/components/local-space-preview.test.tsx`
- Modify: `src/app/spaces/page.test.tsx`

**Step 1: Write the failing component tests.**

Use real user interactions to prove this visible flow:

1. The page tells users that records remain only in the current browser session.
2. Selecting a legal image and entering a space name enables creating the workspace; invalid metadata shows a validation error.
3. Clicking the rendered image opens/activates a named-location form and saves a marker at the normalized click coordinate.
4. Selecting a marker exposes the item form; missing location or invalid item data is rejected.
5. Recording an item shows its name and the state returned by `getExpiryDisplayState`.

Mock only browser primitives such as `URL.createObjectURL`/`URL.revokeObjectURL` and image intrinsic dimensions; do not mock the domain state or validators.

**Step 2: Run the focused component test and verify it fails.**

Run: `npx vitest run src/components/spaces-workspace.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism`

Expected: FAIL because the existing local preview cannot yet record session-only items.

**Step 3: Implement the smallest accessible client UI.**

- Use `SpaceCanvas` for normalized coordinate interaction and marker selection.
- Use `validateSpaceInput` for client-side UX validation only; do not claim it is a server security boundary.
- Create object URLs only after a selected `File` is accepted, record intrinsic image dimensions after load, and revoke URLs on replacement/unmount.
- Require a chosen marker before saving an item.
- Compute expiry display from a client-only, explicitly passed calendar date; do not place `Date.now()` in server-rendered JSX.
- Render concise Chinese labels, status feedback, and a visible “本地原型：关闭或刷新页面后数据会丢失” notice.

**Step 4: Extend the mounted local preview.**

`/spaces` already mounts `LocalSpacePreview` and preserves the existing `AppHeader` and its accessible return-home link. Extend that component in place rather than create a parallel workspace shell, keeping all browser-only state in this one client boundary.

**Step 5: Re-run the focused UI test and verify it passes.**

Run: `npx vitest run src/components/local-space-preview.test.tsx --pool=threads --maxWorkers=1 --no-file-parallelism`

Expected: PASS.

**Step 6: Commit the UI slice.**

```bash
git add src/components/local-space-preview.tsx src/components/local-space-preview.test.tsx src/app/spaces/page.test.tsx
git commit -m "feat: add session-only space workspace"
```

### Task 4: Review and run the prototype verification gate

**Files:**
- Review only: all files changed by Tasks 1–3
- Do not modify unrelated `README.md` or `docs/verification/` worktree changes.

**Step 1: Perform an independent code review.**

Verify the component does not present itself as saved/authenticated, does not add a fake backend, does not leak object URLs, and cannot record an item without a valid location.

**Step 2: Run all quality gates.**

Run each command after stopping any development server that shares `.next`:

```bash
npm run lint
npm run typecheck
npx vitest run --pool=threads --maxWorkers=1 --no-file-parallelism
npm run build
```

Expected: all commands pass.

**Step 3: Start the app and perform a manual browser acceptance pass.**

Run: `npm run dev`

Verify `/spaces` can complete image → location → item → expiry status in one active session, and confirm refresh drops data as labelled.

**Step 4: Commit and push only the feature files.**

```bash
git add docs/plans/2026-07-30-session-workspace-implementation-plan.md
git commit -m "docs: plan session workspace prototype"
git push origin feat/mvp-bootstrap
```
