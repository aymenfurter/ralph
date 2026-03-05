# Ralph — Telegram Bot Integration Example

This project (Ralph) optionally integrates with Telegram to provide remote control, notifications, and on-demand session stats.

Quick start

1. Set up your environment variables:

   ```bash
   source setup_env.sh
   ```

   If `.env` is missing, this script will create `.env.template`.
   Copy `.env.template` to `.env` and fill in your values (e.g., Telegram Bot Token, Chat ID, etc.).

   ```bash
   cp .env.template .env
   # Edit .env with your secrets
   ```

2. Load the environment variables:

   ```bash
   source setup_env.sh
   ```

   Unlike previous versions, Ralph now reads configuration directly from environment variables. You must have these variables exported in your shell or environment before starting the extension.

3. Start Ralph as usual. When `RALPH_TELEGRAM_BOT_TOKEN` is present in the environment, Telegram features (commands, notifications) will be enabled.

Common commands

- `/start` — Start a Ralph session
- `/pause` — Pause current session
- `/stop` — Stop Ralph session
- `/status` or `/stats` — Get current session status
- `/help` — Show available commands

Notes

- Telegram integration is optional: Ralph runs normally without the token.
- Use `.env` to keep secrets out of version control.

For more details see `PRD.md` under "Ralph Telegram Bot Integration".
<p align="center">
  <img src="assets/demo.gif" alt="Ralph Demo" width="100%">
</p>

<p align="center">
  <a href="https://github.com/aymenfurter/ralph/releases"><img src="https://img.shields.io/github/v/release/aymenfurter/ralph?style=flat-square" alt="GitHub Release"></a>
  <a href="https://github.com/aymenfurter/ralph/blob/main/LICENSE"><img src="https://img.shields.io/github/license/aymenfurter/ralph?style=flat-square" alt="License"></a>
  <a href="https://github.com/aymenfurter/ralph/stargazers"><img src="https://img.shields.io/github/stars/aymenfurter/ralph?style=flat-square" alt="GitHub Stars"></a>
  <a href="https://github.com/aymenfurter/ralph/issues"><img src="https://img.shields.io/github/issues/aymenfurter/ralph?style=flat-square" alt="GitHub Issues"></a>
</p>

> [!WARNING]
> **UNOFFICIAL & EXPERIMENTAL** - This extension relies on internal VS Code workbench commands (`workbench.action.chat.newEditSession`, `workbench.action.chat.open`) that are **not part of the official public API**. These commands may change or be removed in any VS Code update.

An implementation of [Geoffrey Huntley's Ralph technique](https://ghuntley.com/ralph/) for GitHub Copilot.

Ralph runs AI coding agents in a loop. It reads a PRD, picks tasks, implements them one at a time, and continues until everything is done.

## Features

- **Autonomous Task Execution** - Automatically works through your PRD task list
- **Visual Control Panel** - Start, pause, stop, and monitor progress
- **Progress Timeline** - Watch tasks complete with timing visualization
- **PRD Generation** - Describe what you want to build and Ralph creates the task list
- **Acceptance Criteria** - Optionally require tests, linting, type checking before moving on
- **Fresh Chat Mode** - Start each task with a clean context

## Quick Start

### Generate a PRD from a Description

1. Open the Ralph Control Panel (click the Ralph icon in the Activity Bar)
2. Describe what you want to build in the text area
3. Click **Generate PRD & Tasks**
4. Click **Start** to begin autonomous development

### Use an Existing PRD

Create a `PRD.md` file in your workspace root:

```markdown
# My Project

## Overview
Brief description of what you're building.

## Tasks
- [ ] Set up project structure with dependencies
- [ ] Create core data models and types
- [ ] Implement main application logic
- [ ] Add user interface and styling
- [ ] Write tests and documentation
```

Then open the Control Panel and click **Start**.

## How It Works

1. Read PRD.md
2. Find next unchecked task
3. Send task to Copilot Agent Mode
4. Copilot implements the task
5. Copilot marks task complete
6. Repeat until all tasks done

## Configuration

### Copilot Settings

If you encounter the "Continue" button repeatedly during task execution (when hitting max iterations), you can configure VS Code Copilot settings to allow more requests:

1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for `chat.agent.maxRequests`
3. Set to a higher value (e.g., 100 or more). The default is 25.

**Note:** There is no enforced maximum, but consider your use case and the complexity of your tasks when setting this value.

For more information on available Copilot settings and autonomy levels, see the [VS Code Copilot Settings documentation](https://code.visualstudio.com/docs/copilot/reference/copilot-settings).

## Requirements

- VS Code 1.93 or later
- GitHub Copilot Chat extension

## License

MIT
