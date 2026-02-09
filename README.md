# Hogium

A PostHog-themed Chromium browser built with Electron.

## What is Hogium?

Hogium is essentially Chromium under the hood (same engine as Chrome, VS Code, Slack) with PostHog branding and custom features. Built with Electron for rapid iteration and experimentation.

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Or just start it
npm start
```

## Current Features

- Custom PostHog-themed toolbar with hedgehog mascot
- Basic navigation (back, forward, refresh)
- Address bar for URL navigation
- PostHog blue color scheme

## Architecture

- **Electron** - Provides Chromium rendering engine + Node.js
- **BrowserWindow** - Main window with custom toolbar
- **BrowserView** - Embedded Chromium view for web content
- **IPC** - Communication between toolbar and browser view

## Next Steps

Potential PostHog-specific features to explore:

- [ ] Built-in PostHog SDK integration
- [ ] Session replay recording controls
- [ ] Custom DevTools panels for PostHog debugging
- [ ] Privacy controls and GDPR compliance features
- [ ] PostHog event inspector
- [ ] Feature flag testing tools

## Development

The main entry point is `src/main.js`. The custom toolbar UI is in `src/toolbar.html`.

To enable more verbose logging:
```bash
npm run dev
```

## Why Electron?

Electron gives us:
- Full Chromium browser (not a wrapper)
- Easy UI customization
- Fast iteration for research/spike
- Cross-platform (macOS, Windows, Linux)
- Same engine used by Chrome, just with custom chrome (UI)

If we need deeper Chromium modifications later, we can always move to a true Chromium fork, but Electron is perfect for prototyping PostHog-specific browser features.
