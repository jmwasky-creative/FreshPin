# Local Space Preview Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `/spaces` an honest browser-only prototype for selecting a space image and placing named location markers.

**Architecture:** A client component owns an object URL and in-memory location list, then passes the image and normalized coordinates to the existing `SpaceCanvas`. The UI explicitly says that state is local and resets on refresh; it creates no API, storage, authentication, or persistence substitute.

**Tech Stack:** Next.js App Router, React client component, TypeScript, Tailwind CSS, Vitest, Testing Library.

---

### Task 1: Specify the browser-only interaction in a failing test

**Files:**
- Create: `src/components/local-space-preview.test.tsx`

**Step 1: Write failing tests**

Test that selecting a valid local image reveals the space canvas and local-only notice, then clicking the canvas exposes a named-location form. Test that submitting a non-empty name renders a selectable marker.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/components/local-space-preview.test.tsx`

Expected: FAIL because the component does not exist.

### Task 2: Implement the minimal local preview component

**Files:**
- Create: `src/components/local-space-preview.tsx`

**Step 1: Implement browser-only state**

Use a file input that accepts JPEG, PNG, and WebP. Create an object URL only in the input-change handler, revoke replaced URLs, and reset pending/created markers when a new image is selected.

**Step 2: Implement marker creation**

Pass the selected image and local locations to `SpaceCanvas`. A canvas click opens a named-location form; saving a trimmed non-empty name adds a local marker. Selecting an existing marker announces the selection.

**Step 3: Run targeted tests**

Run: `npm.cmd run test -- src/components/local-space-preview.test.tsx src/components/space-canvas.test.tsx`

Expected: PASS.

### Task 3: Connect the prototype to the space page

**Files:**
- Modify: `src/app/spaces/page.tsx`
- Modify: `src/app/spaces/page.test.tsx`

**Step 1: Extend the page test**

Assert the local-preview section and its refresh-reset disclosure are present alongside the return-home link.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/app/spaces/page.test.tsx`

Expected: FAIL because the section is absent.

**Step 3: Mount `LocalSpacePreview`**

Keep the server page as the composition boundary and delegate browser state to the client component.

**Step 4: Re-run targeted tests**

Run: `npm.cmd run test -- src/app/spaces/page.test.tsx src/components/local-space-preview.test.tsx`

Expected: PASS.

### Task 4: Verify and commit

**Files:**
- Create: `src/components/local-space-preview.tsx`, `src/components/local-space-preview.test.tsx`
- Modify: `src/app/spaces/page.tsx`, `src/app/spaces/page.test.tsx`
- Create: `docs/plans/2026-07-30-local-space-preview-implementation-plan.md`

**Step 1: Run quality checks**

Run targeted ESLint, `npm.cmd run typecheck`, and `npm.cmd run test`.

**Step 2: Exercise the page manually**

Choose a JPEG, PNG, or WebP image on `/spaces`, click it, name a location, and confirm the marker appears. Refresh and confirm the local-only disclosure remains true.

**Step 3: Commit and push**

Review the diff, commit only the listed files, and push the feature branch.
