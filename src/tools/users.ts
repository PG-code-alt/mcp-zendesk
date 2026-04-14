import * as z from "zod/v4";
import { ZendeskClient } from "../zendesk-client.js";

export const getUserInputSchema = z.object({
  user_id: z.number().int().positive()
});

export async function handleGetUser(client: ZendeskClient, input: unknown) {
  const { user_id } = getUserInputSchema.parse(input);
  const user = await client.getUser(user_id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}
