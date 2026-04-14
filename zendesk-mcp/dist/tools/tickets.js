import * as z from "zod/v4";
const statusSchema = z.enum(["open", "pending", "solved", "closed"]);
const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export const getTicketInputSchema = z.object({
    ticket_id: z.number().int().positive()
});
export const listTicketsInputSchema = z.object({
    status: statusSchema.optional(),
    per_page: z.number().int().positive().max(100).default(25)
});
export const createTicketInputSchema = z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
    priority: prioritySchema.optional(),
    requester_email: z.string().email(),
    requester_name: z.string().min(1)
});
export const updateTicketInputSchema = z
    .object({
    ticket_id: z.number().int().positive(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    comment: z.string().min(1).optional()
})
    .refine((value) => value.status || value.priority || value.comment, {
    message: "At least one of status, priority, or comment must be provided"
});
export const addCommentInputSchema = z.object({
    ticket_id: z.number().int().positive(),
    body: z.string().min(1),
    public: z.boolean().default(true)
});
export const listTicketCommentsInputSchema = z.object({
    ticket_id: z.number().int().positive()
});
export async function handleGetTicket(client, input) {
    const { ticket_id } = getTicketInputSchema.parse(input);
    const ticket = await client.getTicket(ticket_id);
    const requester = ticket.requester_id ? await client.getRequester(ticket.requester_id) : { name: null, email: null };
    return {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        description: ticket.description,
        requester
    };
}
export async function handleListTickets(client, input) {
    const { status, per_page } = listTicketsInputSchema.parse(input ?? {});
    return client.listTickets(status, per_page);
}
export async function handleCreateTicket(client, input) {
    const parsed = createTicketInputSchema.parse(input);
    const ticket = await client.createTicket({
        subject: parsed.subject,
        body: parsed.body,
        priority: parsed.priority,
        requester_email: parsed.requester_email,
        requester_name: parsed.requester_name
    });
    return {
        id: ticket.id,
        url: ticket.url
    };
}
export async function handleUpdateTicket(client, input) {
    const parsed = updateTicketInputSchema.parse(input);
    return client.updateTicket({
        ticket_id: parsed.ticket_id,
        status: parsed.status,
        priority: parsed.priority,
        comment: parsed.comment
    });
}
export async function handleAddComment(client, input) {
    const parsed = addCommentInputSchema.parse(input);
    await client.addComment(parsed.ticket_id, parsed.body, parsed.public);
    const comments = await client.listTicketComments(parsed.ticket_id);
    const latestComment = comments.at(-1);
    return {
        id: latestComment?.id ?? null,
        created_at: latestComment?.created_at ?? null
    };
}
export async function handleListTicketComments(client, input) {
    const { ticket_id } = listTicketCommentsInputSchema.parse(input);
    const comments = await client.listTicketComments(ticket_id);
    return comments.map((comment) => ({
        author: comment.author_id,
        body: comment.body,
        created_at: comment.created_at,
        public: comment.public
    }));
}
