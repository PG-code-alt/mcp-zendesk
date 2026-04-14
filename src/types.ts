export type TicketStatus = "open" | "pending" | "solved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export interface ZendeskUser {
  id: number;
  name: string;
  email: string | null;
  role: string;
}

export interface ZendeskRequester {
  name: string | null;
  email: string | null;
}

export interface ZendeskTicket {
  id: number;
  subject: string | null;
  status: string;
  priority: string | null;
  description: string | null;
  requester_id: number | null;
  url: string;
}

export interface TicketSummary {
  id: number;
  subject: string | null;
  status: string;
  priority: string | null;
  requester_id: number | null;
  url: string;
}

export interface TicketComment {
  id: number;
  author_id: number;
  body: string;
  created_at: string;
  public: boolean;
}

export interface ToolErrorOutput {
  code: string;
  status?: number;
  message: string;
}
