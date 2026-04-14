import * as z from "zod/v4";
export const searchTicketsInputSchema = z.object({
    query: z.string().min(1)
});
export async function handleSearchTickets(client, input) {
    const { query } = searchTicketsInputSchema.parse(input);
    return client.searchTickets(query);
}
