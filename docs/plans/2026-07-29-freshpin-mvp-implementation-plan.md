# FreshPin MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the FreshPin web MVP for tracking household item locations and expiry dates.

**Architecture:** Build a Next.js App Router application on Vercel, with Supabase for authentication, relational data, and image storage. Route handlers keep third-party keys server-side; a daily cron endpoint sends deduplicated expiry emails.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Supabase, Drizzle ORM, Angus API, Vercel Cron, Resend.

---

### Task 1: Bootstrap the application and configuration

**Files:**
- Create: `package.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `.env.example`

**Step 1: Create the Next.js TypeScript application.**

**Step 2: Add environment-variable placeholders for Supabase, Angus, Resend, and cron authentication.**

**Step 3: Run the production build.**

Run: `npm run build`

Expected: successful Next.js production build.

**Step 4: Commit.**

```bash
git add package.json src/app .env.example
git commit -m "feat: bootstrap FreshPin application"
```

### Task 2: Implement authentication and data storage

**Files:**
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/db/schema.ts`
- Create: `src/app/login/page.tsx`
- Create: `supabase/migrations/0001_initial_schema.sql`

**Step 1: Write access-control tests for user-owned spaces, locations, and items.**

**Step 2: Run the tests and verify unauthorized access fails.**

**Step 3: Implement Supabase email OTP login, tables, RLS policies, and schema mappings.**

Configure short-lived access tokens with refresh-token rotation and a 30-day (`720h`) maximum session lifetime. Add a shared protected-page header whose accessible “返回首页” link targets `/`.

**Step 4: Re-run the tests and verify each user can access only their own records.**

Verify a session remains valid before its 30-day time-box and requires email re-authentication after it; verify every protected route renders the return-home link.

**Step 5: Commit.**

### Task 3: Implement spaces, locations, and item recording

**Files:**
- Create: `src/app/spaces/new/page.tsx`
- Create: `src/app/spaces/[spaceId]/page.tsx`
- Create: `src/components/SpaceCanvas.tsx`
- Create: `src/components/LocationMarker.tsx`
- Create: `src/app/api/spaces/route.ts`
- Create: `src/app/api/spaces/[spaceId]/locations/route.ts`

**Step 1: Write tests for normalized location coordinates and mandatory item location selection.**

**Step 2: Run the tests and verify they fail.**

**Step 3: Implement image upload, marker placement using `xRatio`/`yRatio`, and location selection.**

Every upload Route Handler must call `validateImageForStorage` before Storage writes so both the container preflight and the server-side real decode are enforced.

**Step 4: Re-run the tests and verify responsive placement remains correct.**

**Step 5: Commit.**

### Task 4: Add recognition and expiry-date rules

**Files:**
- Create: `src/app/api/recognition/item/route.ts`
- Create: `src/lib/angus/client.ts`
- Create: `src/lib/date/expiry.ts`
- Create: `src/app/items/confirm/page.tsx`

**Step 1: Write failing tests for date precedence, month-end calculations, and recognition fallback.**

**Step 2: Run the tests and verify they fail.**

**Step 3: Implement server-side recognition, editable confirmation, and expiry-date calculation.**

**Step 4: Re-run tests and verify recognition failure still permits manual entry.**

**Step 5: Commit.**

### Task 5: Add email reminders and release checks

**Files:**
- Create: `src/app/api/cron/reminders/route.ts`
- Create: `src/lib/email/reminders.ts`
- Create: `vercel.json`
- Test: `src/app/api/cron/reminders/route.test.ts`

**Step 1: Write failing tests for reminder selection, cron authentication, and same-day deduplication.**

**Step 2: Run the tests and verify they fail.**

**Step 3: Implement the scheduled endpoint, reminder log uniqueness, and Resend messages.**

**Step 4: Run unit tests and `npm run build`.**

**Step 5: Commit.**
