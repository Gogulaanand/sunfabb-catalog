# Sunfabb Catalog

[![CI](https://github.com/Gogulaanand/sunfabb-catalog/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Gogulaanand/sunfabb-catalog/actions/workflows/ci.yml)
[![Frontend on Vercel](https://img.shields.io/badge/frontend-vercel-black)](https://sunfabb.com)
[![Backend on Render](https://img.shields.io/badge/backend-render-46e3b7)](https://sunfabb-backend.onrender.com)

A product catalog website for a home-textiles brand (bedspreads, towels, napkins, table linen) in
India (INR only). A monorepo with a separate NestJS backend and Next.js frontend, built as a
frontend → full-stack learning project.

- **Live site:** [sunfabb.com](https://sunfabb.com)
- **API:** [sunfabb-backend.onrender.com](https://sunfabb-backend.onrender.com)

## Tech stack

Frontend: Next.js (App Router) · TypeScript · Tailwind · Chakra UI v3 (admin only)
Backend: NestJS · TypeScript · Prisma · PostgreSQL (Neon)
Infra: Vercel (frontend) · Render (backend) · Cloudinary (images) · GitHub Actions (CI)

## Where to look

- **`CLAUDE.md`** — context for contributors/AI tooling, hard rules, repo layout.
- **`HANDOFF.md`** — current project state and next steps.
- **`docs/PLAN.md`** — full build plan: architecture, schema, API design, roadmap.
- **`docs/DECISIONS.md`** — decision log (the "why" behind technical choices).

## Local development

```bash
# Backend (backend/)
npm run start:dev
npx prisma migrate dev
npm test

# Frontend (frontend/)
npm run dev
npm test
```
