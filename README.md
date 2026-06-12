# QR Code Door Bell

Monorepo pnpm/Turbo para a campainha eletrônica por QR code.

## Estrutura

```text
qrcode-door-bell/
├─ apps/
│  └─ doorbell/          # Aplicacao Next.js
├─ docs/                 # Documentacao de produto/tecnica
├─ pnpm-workspace.yaml
├─ turbo.json
├─ vercel.json           # Configuracao de deploy na Vercel
└─ package.json
```

## Requisitos

- Node.js 22.x
- pnpm 10.x
- Vercel CLI, para publicar pelo terminal

```bash
corepack enable
pnpm install
```

## Ambiente Local

1. Copie o exemplo de variaveis:

```bash
cp apps/doorbell/.env.example apps/doorbell/.env.local
```

2. Preencha `apps/doorbell/.env.local`.

3. Valide o ambiente:

```bash
pnpm env:check
```

4. Rode o app:

```bash
pnpm dev:doorbell
```

O app local usa `http://localhost:3333`.

## Comandos

```bash
pnpm dev:doorbell       # Next dev na porta 3333
pnpm build:doorbell     # prisma generate + next build
pnpm lint               # lint via Turbo
pnpm type-check         # TypeScript via Turbo
pnpm env:check          # valida variaveis do app
```

## Vercel

Este repositorio ainda nao precisa existir previamente na Vercel. A configuracao local esta preparada para criar/linkar um unico projeto apontando para o app `doorbell`.

### Criar ou Linkar Projeto

```bash
pnpm vercel:link
```

Quando a CLI perguntar:

- Framework: `Next.js`
- Root Directory: `apps/doorbell`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --filter doorbell build`
- Output Directory: `.next`

Esses valores tambem estao em `vercel.json`.

Em deploys de producao por push, o script `build` do app executa `prisma migrate deploy` antes do `next build` quando detecta `VERCEL=1` e `VERCEL_ENV=production`. Por isso `DATABASE_URL` precisa estar configurada no ambiente de producao.

Deploys Preview nao executam migrations por padrao. Para forcar migrations fora de producao, configure `RUN_MIGRATIONS_ON_BUILD=1` junto com `DATABASE_URL`.

### Sincronizar Variaveis

Depois de configurar as variaveis no painel da Vercel:

```bash
pnpm vercel:pull
pnpm env:check
```

### Testar Build Igual a Vercel

```bash
pnpm vercel:build
```

Build local de producao, usando `apps/doorbell/.env.local` e o dominio do projeto linkado:

```bash
pnpm vercel:build:prod
```

### Publicar

Preview:

```bash
pnpm vercel:deploy
```

Producao:

```bash
pnpm vercel:deploy:prod
```

Producao usando o build local ja gerado:

```bash
pnpm vercel:deploy:prebuilt:prod
```

Depois do primeiro deploy de producao, atualize estas variaveis na Vercel:

```text
NEXT_PUBLIC_BASE_URL=https://seu-dominio.vercel.app
NEXTAUTH_URL=https://seu-dominio.vercel.app
```

## Variaveis Obrigatorias

Veja [apps/doorbell/.env.example](apps/doorbell/.env.example).

Principais grupos:

- Banco Postgres: `DATABASE_URL`
- Auth: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- URL publica: `NEXT_PUBLIC_BASE_URL`
- Web Push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- Firebase client: `NEXT_PUBLIC_FIREBASE_*`
- Firebase Admin: `FIREBASE_ADMIN_SA_JSON`
- Google Maps: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

Para gerar `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

Para gerar `FIREBASE_ADMIN_SA_JSON` a partir do JSON de service account:

```bash
base64 -i service-account.json | tr -d '\n'
```
