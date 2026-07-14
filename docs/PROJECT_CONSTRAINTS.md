# PROJECT_CONSTRAINTS

Claude MUST NOT install additional dependencies unless explicitly approved.
If a new dependency could simplify development:
Explain why.
Wait for approval.
Do not install it automatically.

## Business

- The project must be profitable.
- Operational costs before monetization must be as close to €0/month as possible.
- No paid APIs.
- No AI dependencies.
- The MVP must be buildable by a single developer.

## Technical

- Next.js 15
- App Router
- TypeScript
- PostgreSQL
- Supabase Free
- Vercel Free

## Performance

- Dashboard <500ms
- Mobile responsive
- Lighthouse >90

## Architecture

- Feature-first architecture
- Repository pattern
- Server Actions preferred
- No Redux

## Security

- RLS mandatory
- Zod validation
- Never expose Service Role Key

## Product

- No AI
- No Chat
- No Browser Extension
- No Mobile App
- No LinkedIn integration
