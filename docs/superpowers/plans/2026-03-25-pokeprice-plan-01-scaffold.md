# PokéPrice Implementation Plan — Part 1: Project Scaffolding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Initialize a Next.js App Router project with TypeScript and all dependencies.

**Tech Stack:** Next.js 14, TypeScript, Vercel KV

---

### Task 1.1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.js`, `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Create Next.js app**

Run:
```bash
npx create-next-app@latest . --typescript --app --eslint --no-tailwind --no-src-dir --import-alias "@/*"
```

Accept defaults. This creates the base project structure.

- [ ] **Step 2: Verify it runs**

Run: `npm run dev`
Expected: Dev server starts on localhost:3000

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js project with App Router"
```

### Task 1.2: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install production dependencies**

```bash
npm install @vercel/kv
```

- [ ] **Step 2: Verify install succeeded**

Run: `npm ls @vercel/kv`
Expected: Shows installed version with no errors

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add Vercel KV dependency"
```

### Task 1.3: Create .env.local template

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create env example file**

```
# eBay Developer Credentials
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=

# Vercel KV (auto-set by Vercel when KV store is connected)
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

- [ ] **Step 2: Verify .env.local is in .gitignore**

Check `.gitignore` contains `.env.local` and `.env*.local` — it already does per the spec.

- [ ] **Step 3: Commit**

```bash
git add .env.example .gitignore
git commit -m "feat: add environment variable template"
```

### Task 1.4: Create project directory structure

**Files:**
- Create: `lib/sources/`, `lib/`, `components/`, `app/api/search/`, `app/api/prices/`, `app/api/refresh/`

- [ ] **Step 1: Create directories with .gitkeep files**

```bash
mkdir -p lib/sources components app/api/search app/api/prices app/api/refresh
touch lib/sources/.gitkeep lib/.gitkeep components/.gitkeep
```

- [ ] **Step 2: Commit**

```bash
git add lib/ components/ app/api/
git commit -m "feat: create project directory structure"
```
