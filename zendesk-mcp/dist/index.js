import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ZodError } from "zod/v4";
import { addCommentInputSchema, createTicketInputSchema, getTicketInputSchema, handleAddComment, handleCreateTicket, handleGetTicket, handleListTicketComments, handleListTickets, handleUpdateTicket, listTicketCommentsInputSchema, listTicketsInputSchema, updateTicketInputSchema } from "./tools/tickets.js";
import { getUserInputSchema, handleGetUser } from "./tools/users.js";
import { handleSearchTickets, searchTicketsInputSchema } from "./tools/search.js";
import { formatToolError, ZendeskClient } from "./zendesk-client.js";
const server = new McpServer({
    name: "zendesk-mcp",
    version: "1.0.0"
});
const zendeskClient = new ZendeskClient();
function toToolResult(payload) {
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(payload, null, 2)
            }
        ]
    };
}
function toToolError(error) {
    if (error instanceof ZodError) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        error: {
                            code: "VALIDATION_ERROR",
                            message: error.message
                        }
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
    const formatted = formatToolError(error);
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify({
                    error: {
                        code: formatted.code,
                        status: formatted.status,
                        message: formatted.message
                    }
                }, null, 2)
            }
        ],
        isError: true
    };
}
server.registerTool("get_ticket", {
    description: "Get a Zendesk ticket by id",
    inputSchema: getTicketInputSchema
}, async (input) => {
    try {
        return toToolResult(await handleGetTicket(zendeskClient, input));
    }
    catch (error) {
        return toToolError(error);
    }
});
server.registerTool("list_tickets", {
    description: "List Zendesk tickets with optional status filter",
    inputSchema: listTicketsInputSchema
}, async (input) => {
    try {
        return toToolResult(await handleListTickets(zendeskClient, input));
    }
    catch (error) {
        return toToolError(error);
    }
});
server.registerTool("create_ticket", {
    description: "Create a new Zendesk ticket",
    inputSchema: createTicketInputSchema
}, async (input) => {
    try {
        return toToolResult(await handleCreateTicket(zendeskClient, input));
    }
    catch (error) {
        return toToolError(error);
    }
});
server.registerTool("update_ticket", {
    description: "Update ticket status, priority, and optional comment",
    inputSchema: updateTicketInputSchema
}, async (input) => {
    try {
        return toToolResult(await handleUpdateTicket(zendeskClient, input));
    }
    catch (error) {
        return toToolError(error);
    }
});
server.registerTool("add_comment", {
    description: "Add a comment to a ticket",
    inputSchema: addCommentInputSchema
}, async (input) => {
    try {
        return toToolResult(await handleAddComment(zendeskClient, input));
    }
    catch (error) {
        return toToolError(error);
    }
});
server.registerTool("search_tickets", {
    description: "Search tickets using Zendesk query syntax",
    inputSchema: searchTicketsInputSchema
}, async (input) => {
    try {
        return toToolResult(await handleSearchTickets(zendeskClient, input));
    }
    catch (error) {
        return toToolError(error);
    }
});
server.registerTool("get_user", {
    description: "Get a Zendesk user by id",
    inputSchema: getUserInputSchema
}, async (input) => {
    try {
        return toToolResult(await handleGetUser(zendeskClient, input));
    }
    catch (error) {
        return toToolError(error);
    }
});
server.registerTool("list_ticket_comments", {
    description: "List all comments for a ticket",
    inputSchema: listTicketCommentsInputSchema
}, async (input) => {
    try {
        return toToolResult(await handleListTicketComments(zendeskClient, input));
    }
    catch (error) {
        return toToolError(error);
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Failed to start Zendesk MCP server", error);
    process.exit(1);
});
