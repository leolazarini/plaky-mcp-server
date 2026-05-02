# Plaky MCP Server — Developer Guide

## Prerequisites

- Node.js 20+
- npm 10+
- A Plaky workspace with API access


## Local Development

```bash
# Install dependencies
npm ci

# Copy and fill in environment variables
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Description |
|---|---|---|
| `PLAKY_DEFAULT_SPACE_ID` | Yes | Plaky space ID (found in the workspace URL) |
| `PLAKY_DEFAULT_BOARD_ID` | Yes | Default board ID used when tools omit `board_id` |
| `PLAKY_BASE_URL` | No | Defaults to `https://api.plaky.com/v1/public` |
| `PORT` | No | HTTP port (default: 3000) |
| `REDIS_URL` | No | Redis connection URL; omit to use in-memory cache |
| `LOG_LEVEL` | No | `debug` / `info` / `warn` / `error` (default: `info`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | OpenTelemetry collector endpoint |

### Get your Plaky API key

1. Go to your Plaky workspace → **Settings → API**.
2. Generate a personal API token.
3. Provide it as a `Bearer` token on every MCP request (the server reads it from the `Authorization` header; it is never stored).

### Start the server

```bash
npm run dev        # watch mode (tsx)
# or
npm run build && node dist/server.js
```

The server listens on `http://localhost:3000`. Check health:

```bash
curl http://localhost:3000/health
# {"status":"ok","version":"0.1.0"}
```

### Run tests

```bash
npm test                  # all tests
npm run test:coverage     # with coverage report
npm run typecheck         # TypeScript strict check
npm run lint              # ESLint
```

---

## Available MCP Tools

All tools accept `space_id` and `board_id` — if omitted they fall back to `PLAKY_DEFAULT_SPACE_ID` / `PLAKY_DEFAULT_BOARD_ID`.

| Tool | Description |
|---|---|
| `plaky_list_boards` | List all boards visible to the API key |
| `plaky_get_board` | Full board structure (fields, groups, members) |
| `plaky_list_users` | List workspace users with optional search query |
| `plaky_list_items` | List items with optional query/status/assignee filter |
| `plaky_get_item` | Get a single item by ID (with all fields) |
| `plaky_create_item` | Create a new item (resolves assignees by email) |
| `plaky_update_item` | Update item fields (status, assignee, due date, description) |
| `plaky_add_comment` | Add a comment to an item |

**Rate limiting:** 60 requests per minute per API token. Exceeding the limit returns HTTP 429 with a `Retry-After` header.

---

## Connect Claude Code (local)

Add to `~/.claude.json` (or your MCP config file):

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

---

## Architecture

```
Claude Code
    │  Authorization: Bearer <plaky-api-key>
    │  POST /mcp  (Streamable HTTP MCP transport)
    ▼
Hono server (src/server.ts)
    │  per-token rate limit (60 req/min)
    │  stateful MCP sessions (Map<sessionId, Session>)
    ▼
registerTools (src/tools/index.ts)
    │  8 MCP tools
    ▼
PlakyClient (src/plaky/client.ts)
    │  X-API-Key header
    ▼
Plaky REST API (api.plaky.com/v1/public)
```

Cache (in-memory or Redis) is used for boards (5 min TTL) and user lists (15 min TTL) to reduce Plaky API calls.
