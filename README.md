# gtask

> Google Tasks CLI with multi-account support and a unified merged view.

`gtask` lets you manage tasks across multiple Google accounts (e.g., personal + work) from a single command line. Tasks from all accounts are merged into one view with origin labels, and you can act on any task by its displayed numeric index.

## Features

- **Multi-account** — register any number of Google accounts under short aliases.
- **Merged view** — `gtask list` shows tasks from every account at once, labeled by origin (`[P]`, `[W]`, etc.).
- **Numeric refs** — `gtask done 3` completes the third task in the last list output.
- **Per-account filtering** — `gtask list -a work` to focus on one account.
- **Safe credentials** — OAuth tokens stored locally with strict file permissions (`chmod 600`).

## Prerequisites

- **Node.js 18+**
- A **Google Cloud project** with an OAuth client (see [Setup](#setup) below).

## Installation

```bash
npm install -g @doranhwang/gtask
```

Or from source:

```bash
git clone https://github.com/doranhwang/gtask.git
cd gtask
npm install
npm run build
npm link
```

## Setup

### 1. Create a Google Cloud project

Go to [Google Cloud Console](https://console.cloud.google.com), create a new project (any name, e.g., `gtask-cli`).

### 2. Enable Google Tasks API

In your project: **APIs & Services → Library → Google Tasks API → Enable**.

### 3. Configure OAuth consent screen

**APIs & Services → OAuth consent screen**:

- User Type: **External**
- App name, support email, developer contact: your own
- Scopes: skip (requested at runtime)
- Test users: **add every Google account you want to register** (e.g., personal Gmail + work email)

Then click **Publish App** to move out of Testing mode. (Refresh tokens are valid for 7 days in Testing mode, indefinitely in Production. Personal-use apps generally do not require verification.)

### 4. Create OAuth Client credentials

**APIs & Services → Credentials → Create Credentials → OAuth client ID**:

- Application type: **Desktop app**
- Name: anything (e.g., `gtask`)

Download the JSON file.

### 5. Place credentials

```bash
mkdir -p ~/.config/gtask
mv ~/Downloads/client_secret_*.json ~/.config/gtask/credentials.json
chmod 600 ~/.config/gtask/credentials.json
```

### 6. Authenticate accounts

```bash
gtask auth add personal -e you@gmail.com -l P
gtask auth add work     -e you@company.com -l W
```

A browser opens for each. After consent, refresh tokens are saved under `~/.config/gtask/tokens/`.

## Usage

```bash
# Merged view across all accounts (default task list only)
gtask list

# Include all task lists per account
gtask list --all-lists

# Filter to one account
gtask list -a work

# Include completed tasks
gtask list --completed

# Add a task to the default account
gtask add "Buy coffee"

# Add to a specific account with a due date
gtask add "Sprint review prep" -a work -d 2026-05-30 -n "Slides + demo"

# Add to a specific task list by name (no need to look up list IDs)
gtask add "Buy milk" -a personal -l "Shopping list"

# Show all task lists with full IDs
gtask lists --full

# Create a new task list
gtask lists create "Writing list" -a personal

# Delete a task list (by name or ID)
gtask lists rm "Writing list" -a personal

# Mark task #3 (from last list output) as done
gtask done 3

# Delete task #5
gtask rm 5

# Update title and clear due date
gtask update 2 -t "New title" -d ""

# Show all task lists across accounts
gtask lists

# Manage accounts
gtask auth list
gtask auth default work
gtask auth rm personal
```

The numeric index resolves against the most recent `gtask list` output (cached in `~/.config/gtask/last-list.json`). You can also pass a full ref `alias:listId:taskId` to any command that takes `<ref>`.

## Configuration

Files in `~/.config/gtask/`:

| File | Purpose | Permissions |
|---|---|---|
| `credentials.json` | OAuth client (from Google Cloud Console) | `600` |
| `config.json` | Account aliases, labels, default | `600` |
| `tokens/<alias>.json` | Per-account OAuth refresh tokens | `600` |
| `last-list.json` | Numeric index cache for `done`/`rm`/`update` | `600` |

The directory itself is `chmod 700`.

## Commands

| Command | Description |
|---|---|
| `gtask auth add <alias>` | Authenticate and register an account |
| `gtask auth list` | List registered accounts |
| `gtask auth rm <alias>` | Remove an account |
| `gtask auth default <alias>` | Set default account |
| `gtask lists` | Show all task lists |
| `gtask lists create <name>` | Create a task list |
| `gtask lists rm <name>` | Delete a task list (by name or ID) |
| `gtask list` (alias: `ls`) | Show tasks (merged across accounts) |
| `gtask add <title>` | Add a task |
| `gtask done <ref>` | Mark task completed |
| `gtask rm <ref>` | Delete task |
| `gtask update <ref>` | Update task |

Run `gtask <command> --help` for full options.

## Troubleshooting

**"This app isn't verified" during OAuth** — expected for self-built personal-use apps. Click **Advanced → Go to gtask (unsafe)** to proceed.

**Workspace account blocked** — corporate Google Workspace admins can block External OAuth apps. If your work account can't authenticate, that account is unavailable; others still work.

**Token expired after 7 days** — your OAuth consent screen is in Testing mode. Publish the app in the OAuth consent screen settings.

**Wrong task index** — numeric refs are based on the last `gtask list` output. Run `gtask list` again to refresh the cache before using `done`/`rm`/`update`.

## License

MIT © Doran Hwang
