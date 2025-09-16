# Documento Técnico — Campainha Eletrônica

## Stack
- **Next.js 14 (App Router, SSR-first, TS)**
- **TailwindCSS** + **shadcn/ui** (componentes acessíveis, tree-shaken)
- **Edge Runtime** (baixa latência)
- **API Routes (Next.js)** para eventos de campainha
- **Armazenamento futuro**: Redis/Postgres/S3 (quando entrar gravação e histórico)

---

## Arquitetura Inicial (MVP)
### Fluxo do Visitante
1. Escaneia o QR → abre `/v/[id]` (SSR).
2. Página SSR mostra:
   - Título “Campainha Eletrônica”.
   - Explicação curta.
   - Botão central “TOCAR CAMPANHA AGORA”.
3. Ao clicar no botão:
   - Envia `POST /api/ring` com `visitId` + geolocalização (opcional).
   - Backend registra tentativa e dispara notificação ao morador (MVP: log).
   - Feedback imediato ao visitante (✅ sucesso ou ❌ falha).

### Fluxo do Morador (Futuro)
- App/PWA recebe push ou WebSocket.
- Opção de iniciar conversa ao vivo (WebRTC).

---

## Estrutura de Pastas

```
src/
├─ app/
│  ├─ layout.tsx
│  ├─ v/[id]/page.tsx   # Página SSR da campainha
│  └─ api/ring/route.ts # Endpoint da campainha
└─ components/
└─ ring-button.tsx   # Único Client Component (botão)
docs/
├─ business.md
└─ technical.md
```

---

## Componentes shadcn usados no MVP
- `button`
- `card`
- `separator`

(mais serão adicionados conforme fluxos avançam: toast, alert, etc.)

---

## Critérios de Aceitação do MVP
- ✅ Página `/v/[id]` deve carregar **SSR-only**, com mínimo JS no cliente.
- ✅ Visitante enxerga **botão claro** “TOCAR CAMPANHA AGORA” + explicação curta.
- ✅ Clicar no botão dispara `POST /api/ring` com `visitId`.
- ✅ Backend responde sucesso/falha em JSON.
- ✅ Visitante recebe feedback visual imediato.
- ✅ Layout responsivo (mobile-first).
- ✅ Nenhum JS desnecessário fora do botão.

---

## Evoluções planejadas
- **Segurança**: Captcha, rate limiting, tokens efêmeros.
- **Cadastro de imóveis**: vídeo da fachada, prova de acesso.
- **Unicidade**: apenas 1 imóvel por endereço.
- **Conversa ao vivo**: WebRTC + gravação (via SFU).
- **Placas físicas premium**: QR exclusivo + NFC.