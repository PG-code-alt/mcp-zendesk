import * as z from "zod/v4";
import { ZendeskClient } from "../zendesk-client.js";

export const searchTicketsInputSchema = z.object({
  query: z.string().min(1)
});

export async function handleSearchTickets(client: ZendeskClient, input: unknown) {
  const { query } = searchTicketsInputSchema.parse(input);
  return client.searchTickets(query);
}
