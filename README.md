<p align="center">
  <img alt="hogium" src="https://raw.githubusercontent.com/PostHog/posthog/master/frontend/public/hedgehog/space-hog.png" width="200">
</p>

<h1 align="center">hogium</h1>

<p align="center">
  It's a browser. Kind of.
</p>

## 🦔 What is hogium?

hogium is a fun side project to answer one question: what would a PostHog browser look like?

Turns out building Chromium from scratch is a nightmare, so we did the next best (worst?) thing — slapped React into an Electron shell and called it a browser. Yes, there's React in your browser rendering engine. No, we're not sorry.

## 🚀 Quick Start

```bash
pnpm install
pnpm start
```

## 🛠️ Development

```bash
# Run in development mode with hot reload
pnpm start

# Type check
pnpm typecheck

# Lint
pnpm lint

# Package for distribution
pnpm package
```

## 🤝 Contributing

PRs welcome. See [PostHog's contributing guide](https://posthog.com/docs/contribute) for general guidelines.

## 📄 License

MIT
