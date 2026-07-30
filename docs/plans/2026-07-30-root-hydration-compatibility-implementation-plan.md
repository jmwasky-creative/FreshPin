# Root Hydration Compatibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent a browser extension's pre-hydration mutations of the document root from causing a development hydration overlay.

**Architecture:** Keep server markup authoritative and add React's one-level suppression only at the root `<html>` boundary. Do not reproduce extension-owned attributes in application code.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library.

---

### Task 1: Lock the root compatibility contract with a test

**Files:**
- Modify: `src/app/layout.test.tsx`

**Step 1: Write the failing test**

Call `RootLayout` directly and assert its root React element is `html` with `suppressHydrationWarning: true`.

**Step 2: Run test to verify it fails**

Run: `npm.cmd run test -- src/app/layout.test.tsx`

Expected: the new assertion fails because the property is absent.

### Task 2: Apply the smallest compatible implementation

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Add the root-only property**

```tsx
<html lang="zh-CN" suppressHydrationWarning>
```

**Step 2: Run the targeted test**

Run: `npm.cmd run test -- src/app/layout.test.tsx`

Expected: PASS.

### Task 3: Verify the application boundary

**Files:**
- Verify: `src/app/layout.tsx`, `src/app/layout.test.tsx`

**Step 1: Run static and production checks**

Run: `npm.cmd run typecheck` and `npm.cmd run build`

Expected: both commands exit successfully.

**Step 2: Verify external cause manually**

Refresh `/spaces` in a browser profile without the Tongyi design extension. The root mismatch overlay must be absent; with the extension active, the root-level warning is suppressed without adding extension attributes to source.

### Task 4: Commit the verified fix

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/layout.test.tsx`
- Create: `docs/plans/2026-07-30-root-hydration-compatibility-design.md`, `docs/plans/2026-07-30-root-hydration-compatibility-implementation-plan.md`

**Step 1: Inspect the staged diff and commit**

Run: `git diff --check`, then commit only the four listed files with a focused message.
