# Zendesk MCP Server

Node.js + TypeScript MCP server that exposes Zendesk Support API operations as MCP tools over stdio transport.

## Requirements

- Node.js 18+
- Zendesk Support account with API token access

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment template and fill values:

```bash
cp .env.example .env
```

Environment variables:

- `ZENDESK_SUBDOMAIN=yoursubdomain`
- `ZENDESK_EMAIL=agent@example.com`
- `ZENDESK_API_TOKEN=your_api_token`

3. Build:

```bash
npm run build
```

4. Start server:

```bash
npm start
```

## Claude Desktop MCP Configuration

Add this to your Claude Desktop MCP config (adjust absolute path):

```json
{
  "mcpServers": {
    "zendesk": {
      "command": "node",
      "args": ["C:/absolute/path/to/zendesk-mcp/dist/index.js"],
      "env": {
        "ZENDESK_SUBDOMAIN": "yoursubdomain",
        "ZENDESK_EMAIL": "agent@example.com",
        "ZENDESK_API_TOKEN": "your_api_token"
      }
    }
  }
}
```

## Tools

| Tool | Inputs | Description |
|---|---|---|
| `get_ticket` | `ticket_id: number` | Fetch ticket details (id, subject, status, priority, description, requester). |
| `list_tickets` | `status?: "open" \| "pending" \| "solved" \| "closed"`, `per_page?: number (default 25, max 100)` | List ticket summaries. |
| `create_ticket` | `subject: string`, `body: string`, `priority?: "low" \| "normal" \| "high" \| "urgent"`, `requester_email: string`, `requester_name: string` | Create a new ticket and return id + url. |
| `update_ticket` | `ticket_id: number`, `status?: "open" \| "pending" \| "solved" \| "closed"`, `priority?: "low" \| "normal" \| "high" \| "urgent"`, `comment?: string` | Update a ticket and return the updated object. |
| `add_comment` | `ticket_id: number`, `body: string`, `public?: boolean (default true)` | Add comment to a ticket and return comment id + created timestamp. |
| `search_tickets` | `query: string` | Search tickets using Zendesk query syntax. |
| `get_user` | `user_id: number` | Get a Zendesk user (id, name, email, role). |
| `list_ticket_comments` | `ticket_id: number` | List comments (author, body, created_at, public). |

## Notes

- This project uses raw `axios` calls only (no Zendesk SDK).
- Transport is stdio only using `StdioServerTransport`.
- Input validation is implemented with zod schemas for every tool.
