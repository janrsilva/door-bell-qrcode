# Doorbell - Electronic Doorbell

A lean, SSR-first Next.js application for electronic doorbell functionality.

## Features

- **SSR-first**: Minimal JavaScript payload with server-side rendering
- **Edge Runtime**: Low latency API endpoints
- **Single Client Component**: Only the ring button is client-side rendered
- **Geolocation**: Optional location tracking for security
- **Modern UI**: Built with Tailwind CSS and shadcn/ui components

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Edge Runtime for API routes

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000/v/teste123](http://localhost:3000/v/teste123)

## Project Structure

```
doorbell/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              # SSR layout without global hydration
│  │  ├─ globals.css             # Tailwind CSS with shadcn/ui variables
│  │  ├─ v/
│  │  │  └─ [id]/
│  │  │     └─ page.tsx          # SSR doorbell page
│  │  └─ api/
│  │     └─ ring/
│  │        └─ route.ts          # Edge API endpoint for ringing
│  └─ components/
│     ├─ ui/                     # shadcn/ui components
│     └─ ring-button.tsx         # ONLY client component
├─ tailwind.config.ts
├─ tsconfig.json
└─ package.json
```

## Why It Loads Super Fast

- **SSR + Server Components by default**: Almost no JavaScript hydrates on the client
- **Only 1 small client component**: The ring button
- **Edge runtime** on endpoint for low latency
- **No heavy external libraries**: UI via shadcn/ui (tree-shaken, Tailwind)

## Future Enhancements

- Rate limiting + captcha (Cloudflare Turnstile)
- Ephemeral token linked to QR/id
- Push notifications to resident app (Web Push/FCM)
- Permission gates (mic/cam/geo) and WebRTC call flow
- Gate paper branding and text
