# OpenArva

<p align="center">
  <img src="https://img.shields.io/badge/version-v17.6.14-blue" alt="OpenArva version 17.6.14" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS%20%7C%20Android-lightgrey" alt="Cross-platform support" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT license" />
</p>

OpenArva is a universal, multi-platform Personal AI Agent built for coding, automation, research, workflow orchestration, and remote mobile-to-PC control.

It is designed for a top-tier developer experience: fast onboarding, multi-provider fallback, safe diffs, consistent CLI commands, and a clean cross-platform runtime.

Repository: https://github.com/fekerulegese10-arch/openarva
Issues: https://github.com/fekerulegese10-arch/openarva/issues
Telegram Channel: https://t.me/openrva177
WhatsApp Channel: https://whatsapp.com/channel/0029Vb8TDKr72WTmtjfWju2s

---

## Why OpenArva

- Works across Windows, Linux, macOS, and Android/Termux
- Connects to OpenAI, Gemini, Anthropic Claude, Groq, DeepSeek, and local Ollama
- Detects project stack automatically: Node.js/TypeScript, Flutter/Dart, Python, Go, Rust
- Provides safe dry-run previews before changes are applied
- Exposes a remote gateway for mobile access and Telegram-based interaction
- Gives a polished, developer-friendly command-line workflow

---

## 1-Minute Quickstart

### Install

```bash
npm install -g openarva
```

### Show CLI help

```bash
openarva --help
```

### Initialize OpenArva

```bash
openarva init
```

### Run a demo without API keys

```bash
openarva demo
```

### Start a local gateway and remote bridge

```bash
openarva serve --port 3000
```

### Run a task

```bash
openarva run --domain coding --instruction "Build a simple API"
```

### Fix repository issues safely

```bash
openarva fix "Resolve TypeScript issues and validate the build"
```

---

## Command Reference

```bash
openarva --help
openarva init
openarva setup
openarva demo
openarva update --models
openarva mode design "Create a dashboard wireframe"
openarva mode edu "Build a lesson plan"
openarva mode dev "Scan this API for vulnerabilities"
openarva tasks
openarva service install
openarva serve --port 3000
openarva run --domain coding --instruction "Build a simple API"
openarva fix "Resolve TypeScript issues"
openarva commit "feat: improve AI workflow"
openarva gateway
```

### Command documentation

- `openarva init`: interactive setup wizard for provider selection, model choice, and config persistence
- `openarva update --models`: discovers current provider catalogs, pulls configured Ollama models, and benchmarks the local endpoint
- `openarva mode design|edu|dev`: activates specialized workflows for design, education, or developer and enterprise work
- `openarva tasks`: shows persistent task memory stored under `~/.openarva/state.db`
- `openarva service install`: registers Windows Task Scheduler or Linux systemd user startup
- `openarva commit`: prepares a commit-style message for task summaries and workflow updates
- `openarva serve`: starts the HTTP/WebSocket gateway and optional Telegram bot bridge
- `openarva fix`: safe repository repair flow using the agent with approval prompts
- `openarva --help`: prints the supported commands and environment-aware help text

---

## Multi-Provider AI Engine

OpenArva supports a layered provider strategy with automatic fallback.

Supported providers:
- Google Gemini
- OpenAI
- Anthropic Claude
- Groq
- DeepSeek
- Ollama / Local AI
- LM Studio
- Generic local fallback

Example configuration:

```bash
OPENARVA_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1

OPENARVA_PROVIDER=gemini
GEMINI_API_KEY=your_key

OPENARVA_PROVIDER=ollama
LOCAL_AI_BASE_URL=http://localhost:11434/v1
```

Fallback behavior:
- If the preferred provider fails, times out, or returns a rate-limit error, OpenArva automatically tries the next configured provider.
- This provides resilience for local-only setups and cloud-based deployments.

---

## Developer Experience and Visual Design

OpenArva uses interactive prompts and rich terminal output to keep the experience polished.

- `@clack/prompts` for arrow-key interactive setup
- `chalk` for clear status, success, and warning output
- `ora` powered progress feedback for background work
- environment auto-detection for project scaffolding and automation suggestions

Example setup flow:

```bash
openarva init
```

Users can choose a provider, model, and optional API endpoint from a guided interactive form.

---

## Dry Run and Safe Execution

Before file edits or commands are executed, OpenArva shows a git-style diff preview.

- additions are shown in green
- deletions are shown in red
- confirmation prompt appears as: `Apply these changes? (y/N)`
- use `--yes` to skip the prompt when needed

Example:

```bash
openarva run --domain coding --instruction "EXEC_CMD: node -v"
```

This builds trust by showing exactly what would change before action is taken.

---

## Cross-Platform and Mobile Connectivity

### Local server

```bash
openarva serve --port 3000
```

This launches:
- HTTP health endpoint: `http://localhost:3000/health`
- status endpoint: `http://localhost:3000/api/status`
- WebSocket endpoint: `ws://localhost:3000/ws`

### Connecting Mobile to PC/Linux OpenArva Server

1. Run OpenArva on your PC or Linux machine:

```bash
openarva serve --port 3000
```

2. On the same network, open the status page from your phone or browser:

```text
http://<your-pc-ip>:3000/api/status
```

3. Connect via WebSocket or Telegram gateway for remote prompts.

4. Optional Telegram bot mode:

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
openarva serve --port 3000
```

Once enabled, the bot can receive messages from Telegram and relay them to the local OpenArva service.

This is a simple but effective bridge for phone-driven automation and remote command requests.

---

## Project Stack Detection

OpenArva detects common project types and offers tailored automation suggestions.

Supported stacks:
- Flutter / Dart
- Node.js / TypeScript
- Python
- Go
- Rust

This helps the agent choose the right actions for a repository or workspace.

---

## VS Code Integration

Use OpenArva directly from the terminal or add tasks in `.vscode/tasks.json`.

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "OpenArva: Init",
      "type": "shell",
      "command": "openarva init",
      "problemMatcher": []
    },
    {
      "label": "OpenArva: Fix",
      "type": "shell",
      "command": "openarva fix \"Resolve TypeScript issues\"",
      "problemMatcher": []
    }
  ]
}
```

---

## Package and Build

The package is configured for CLI installation with a Node entrypoint.

- version: `17.6.14`
- bin: `openarva -> ./bin/openarva.js`
- entrypoint expects the compiled TypeScript output in `dist/`

Build validation:

```bash
npm run build
```

This project is expected to compile cleanly with zero TypeScript errors.

---

## 💬 Direct Support & Community Channels

If the installation commands or instructions fail, or if you need direct technical assistance:

* Telegram Channel: https://t.me/openrva177
* WhatsApp Channel: https://whatsapp.com/channel/0029Vb8TDKr72WTmtjfWju2s
* GitHub Issues: https://github.com/fekerulegese10-arch/openarva/issues

---

## 💖 Sponsor / Donate

Support openarva development and help fund private, secure, enterprise-grade AI automation for individuals, institutions, and public-sector organizations.

* GitHub Sponsors: https://github.com/sponsors/fekerulegese10-arch
* Open Collective / Custom Donations: Contact us through Telegram or WhatsApp for institutional sponsorship arrangements.

### Payment & Donation Details

* USDT (TRC20): `TNfDCVCZ11PTrQRTXzoAPhQPBuQetf1MSQ`
* CBE Account: `1000706450622` (Fekru Negese)
* Visa Card: `4410290147318359`

---

## Issues and Feedback

Please report bugs or feature ideas here:
https://github.com/fekerulegese10-arch/openarva/issues

---

## License

MIT