# FilePizza Development Guide

A peer-to-peer file transfer application built with modern web technologies.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (preferred package manager)

## Quick Start

```bash
git clone https://github.com/kern/filepizza.git
cd filepizza
pnpm install
pnpm dev
```

## Available Commands

### Development
- `pnpm dev` - Start development server
- `pnpm dev:full` - Start with Redis and COTURN for full WebRTC testing

### Building & Testing
- `pnpm build` - Build for production
- `pnpm test` - Run unit tests with Vitest
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:e2e` - Run E2E tests with Playwright

### Code Quality
- `pnpm lint:check` - Check ESLint rules
- `pnpm lint:fix` - Fix ESLint issues
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting
- `pnpm type:check` - TypeScript type checking

### Docker
- `pnpm docker:build` - Build Docker image
- `pnpm docker:up` - Start containers
- `pnpm docker:down` - Stop containers

### CI Pipeline
- `pnpm ci` - Run full CI pipeline (lint, format, type-check, test, build, e2e, docker)

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI**: React 19 + Tailwind CSS v4
- **Language**: TypeScript
- **Testing**: Vitest (unit) + Playwright (E2E)
- **WebRTC**: PeerJS
- **State Management**: TanStack Query
- **Themes**: next-themes with View Transitions
- **Storage**: Redis (optional)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/             # React components
├── hooks/                  # Custom React hooks
├── utils/                  # Utility functions
└── types.ts               # TypeScript definitions
```

## Development Tips

### Using pnpm

This project uses pnpm as the package manager. Benefits include:
- Faster installs and smaller disk usage
- Strict dependency resolution
- Built-in workspace support

Always use `pnpm` instead of `npm` or `yarn`:
```bash
pnpm install package-name
pnpm remove package-name
pnpm update
```

### Code Style

- ESLint + TypeScript ESLint for linting
- Prettier for formatting
- Husky + lint-staged for pre-commit hooks
- Prefer TypeScript over JavaScript
- Use kebab-case for files, PascalCase for components

### Testing Strategy

- Unit tests for components and utilities (`tests/unit/`)
- E2E tests for critical user flows (`tests/e2e/`)
- Test files follow `*.test.ts[x]` naming convention

### WebRTC Development

For full WebRTC testing with TURN/STUN:
```bash
pnpm dev:full
```

This starts Redis and COTURN containers for testing peer connections behind NAT.

## Key Dependencies

- `next` - React framework
- `tailwindcss` - CSS framework
- `@tanstack/react-query` - Server state management
- `peerjs` - WebRTC abstraction
- `next-themes` - Theme switching
- `zod` - Schema validation
- `vitest` - Testing framework
- `playwright` - E2E testing

Run `pnpm ci` before submitting PRs to ensure all checks pass.