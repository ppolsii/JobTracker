# JobTracker Insights

A job search analytics platform that turns application history into actionable insights. See [`docs/`](docs/README.md) for the full product and technical specification.

## Tech Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript (strict mode)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) + [Lucide](https://lucide.dev) icons
- [Supabase](https://supabase.com) (PostgreSQL, Auth, Row Level Security)
- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) validation
- ESLint + Prettier
- [Vitest](https://vitest.dev)

## Requirements

- Node.js 22.x (see `.nvmrc`)
- npm
- A Supabase project (configured in Phase 2)

## Installation

```bash
npm install
```

Copy the environment template and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

Other useful commands during development:

```bash
npm run lint          # run ESLint
npm run format        # format the codebase with Prettier
npm run format:check  # check formatting without writing changes
npm run typecheck     # run the TypeScript compiler without emitting output
npm run test          # run the test suite (Vitest)
```

## Build

```bash
npm run build
npm run start   # serve the production build locally
```

## Continuous Integration

Every push and pull request against `main` runs type checking, linting, the production build, and the test suite (`.github/workflows/ci.yml`) - see `docs/DEPLOYMENT.md`. This requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to be configured as repository secrets.
