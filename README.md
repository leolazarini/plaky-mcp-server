# Plaky MCP Server

Remote MCP server that lets Claude Code create and manage Plaky tickets directly from the editor.

## Quick start (local)

**Prerequisites:** Node.js 20+, a Plaky API key ([Plaky → Settings → API](https://app.plaky.com))

```bash
# 1. Install dependencies
npm ci

# 2. Configure environment
cp .env.example .env
```

Edit `.env` and fill in your Plaky IDs (Hangar Digital values below):

```env
PLAKY_DEFAULT_SPACE_ID=YOUR_SPACE_ID          # your Plaky workspace
PLAKY_DEFAULT_BOARD_ID=YOUR_BOARD_ID          # your default board (or YOUR_BOARD_ID_2 for your secondary board)
```

```bash
# 3. Start the server
npm run dev
# Server running at http://localhost:3000
```

**4. Connect Claude Code** — add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "plaky": {
      "type": "http",
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer <your-plaky-api-key>"
      }
    }
  }
}
```

Restart Claude Code. The 8 Plaky tools will appear in the tool list.

> The `Bearer` token is your personal Plaky API key — it is forwarded directly to the Plaky API and never stored by this server.

---

## Available tools

| Tool | What it does |
|---|---|
| `plaky_list_boards` | List all boards visible to your API key |
| `plaky_get_board` | Full board structure (fields, groups, members) |
| `plaky_list_users` | List workspace users (supports search by name/email) |
| `plaky_list_items` | List items with optional query/status/assignee filters |
| `plaky_get_item` | Get a single item with all fields resolved |
| `plaky_create_item` | Create an item (resolves assignees by email automatically) |
| `plaky_update_item` | Update status, assignee, due date, or description |
| `plaky_add_comment` | Add a comment to an item |

---

## Full documentation

- **[docs/INSTALL.md](docs/INSTALL.md)** — environment variables, test commands, AWS deployment, architecture overview

---

## Development

```bash
npm run dev            # start in watch mode
npm test               # run tests
npm run test:coverage  # tests + coverage report
npm run typecheck      # TypeScript strict check
npm run lint           # ESLint
```
