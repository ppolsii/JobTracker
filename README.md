# JobTracker Insights

A job search analytics platform that turns application history into actionable insights. See [`docs/`](docs/README.md) for the full product and technical specification.

## Tech Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript (strict mode)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com) + [Lucide](https://lucide.dev) icons
- [Supabase](https://supabase.com) (PostgreSQL, Auth, Row Level Security)
- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) validation
- ESLint + Prettier

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
```

## Build

```bash
npm run build
npm run start   # serve the production build locally
```
