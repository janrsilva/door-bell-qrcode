# Doorbell

Aplicacao Next.js da campainha eletronica.

## Desenvolvimento

Execute a partir da raiz do repositorio:

```bash
pnpm install
cp apps/doorbell/.env.example apps/doorbell/.env.local
pnpm env:check
pnpm dev:doorbell
```

URL local:

```text
http://localhost:3333
```

Rotas principais:

- `/resident`: painel do morador
- `/v/[addressUuid]`: URL impressa no QR code
- `/visitor/[visitId]`: pagina de visita de uso unico

## Build

```bash
pnpm build:doorbell
```

O build executa `prisma generate` antes do `next build`, para funcionar igual no ambiente da Vercel.

Na Vercel, o script `build` executa `prisma migrate deploy` antes do `next build` em deploys de producao, aplicando migrations automaticamente quando houver deploy por push para `VERCEL_ENV=production`.

Deploys Preview nao executam migrations por padrao. Para forcar migrations fora de producao, configure `RUN_MIGRATIONS_ON_BUILD=1` junto com `DATABASE_URL`.

## Vercel

O deploy deve ser criado/linkado pela raiz do monorepo. Use os scripts da raiz:

```bash
pnpm vercel:link
pnpm vercel:pull
pnpm vercel:build
pnpm vercel:deploy
```

Configuracao esperada:

- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --filter doorbell build`
- Output Directory: `.next`

## Variaveis

Use `.env.example` como contrato de variaveis. O arquivo real `.env.local` nao deve ser commitado.
