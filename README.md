# Grok-Code Enterprise Mobile Factory

Nx20 monorepo: Next15 web + Expo53 mobile + shared libs (UI/DB/TRPC). Clerk RBAC, Drizzle PostgreSQL, tRPC typesafe APIs.

## Quickstart
```bash
npm i
nx graph  # Visualize monorepo
nx dev web    # localhost:3000
nx start mobile  # Expo Go
npx drizzle-kit push  # DB migrate
```

## Swarm Agents
`/swarm enterprise-crm` → Auto-generate full CRM (web+mobile).

## Deploy
- Web: Vercel (live: grok-code-v1.vercel.app)
- Mobile: `eas build --platform all`
- DB: Railway/Drizzle (`npx drizzle-kit push`)

## Stack
| Layer | Tech |
|-------|------|
| Web | Next15 React19 Tailwind |
| Mobile | Expo53 RN TS |
| Data | Drizzle Postgres TRPC |
| Auth | Clerk RBAC |
| Monorepo | Nx20 |
| Swarm | AI agent orchestration |

Prod-ready (CI/CD). Recent: webpack/security PRs.

⭐ Star | [Live](https://grok-code-v1.vercel.app)