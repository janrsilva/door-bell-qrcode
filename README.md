# QR Code Door Bell

A Turbo monorepo for electronic doorbell applications.

## Structure

```
qrcode-door-bell/
├─ apps/
│  └─ doorbell/          # Next.js SSR doorbell application
├─ turbo.json            # Turbo configuration
└─ package.json          # Root workspace configuration
```

## Apps

### Doorbell (`apps/doorbell`)

A lean, SSR-first Next.js application for electronic doorbell functionality.

- **SSR-first**: Minimal JavaScript payload with server-side rendering
- **Edge Runtime**: Low latency API endpoints
- **Single Client Component**: Only the ring button is client-side rendered
- **Geolocation**: Optional location tracking for security
- **Modern UI**: Built with Tailwind CSS and shadcn/ui components

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm

### Installation

```bash
# Install dependencies for all apps
npm install

# Install dependencies for specific app
cd apps/doorbell && npm install
```

### Development

```bash
# Run all apps in development mode
npm run dev

# Run specific app
cd apps/doorbell && npm run dev
```

### Building

```bash
# Build all apps
npm run build

# Build specific app
cd apps/doorbell && npm run build
```

### Other Commands

```bash
# Lint all apps
npm run lint

# Type check all apps
npm run type-check

# Clean all build artifacts
npm run clean
```

## Tech Stack

- **Turbo**: Monorepo build system
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Re-usable component library

## Contributing

1. Make changes in the appropriate app directory
2. Run `npm run lint` to check code quality
3. Run `npm run type-check` to verify TypeScript
4. Test your changes with `npm run dev`
