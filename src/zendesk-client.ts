import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import dotenv from "dotenv";
import {
  TicketComment,
  TicketPriority,
  TicketStatus,
  TicketSummary,
  ZendeskRequester,
  ZendeskTicket,
  ZendeskUser
} from "./types.js";

dotenv.config();

interface ZendeskConfig {
  subdomain: string;
  email: string;
  apiToken: string;
}

export class ZendeskApiError extends Error {
  status?: number;
  zendeskError?: string;

  constructor(message: string, status?: number, zendeskError?: string) {
    super(message);
    this.name = "ZendeskApiError";
    this.status = status;
    this.zendeskError = zendeskError;
  }
}

function readConfig(): ZendeskConfig {
  const subdomain = process.env.ZENDESK_SUBDOMAIN;
  const email = process.env.ZENDESK_EMAIL;
  const apiToken = process.env.ZENDESK_API_TOKEN;

  if (!subdomain || !email || !apiToken) {
    throw new Error(
      "Missing Zendesk config. Required: ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN"
    );
  }

  return { subdomain, email, apiToken };
}

interface ZendeskTicketApiResponse {
  ticket: ZendeskTicket;
}

interface ZendeskTicketsApiResponse {
  tickets: ZendeskTicket[];
}

interface ZendeskCommentsApiResponse {
  comments: TicketComment[];
}

interface ZendeskSearchApiResponse {
  results: ZendeskTicket[];
}

interface ZendeskUserApiResponse {
  user: ZendeskUser;
}

interface ZendeskRequesterApiResponse {
  user: {
    id: number;
    name: string;
    email: string | null;
  };
}

export class ZendeskClient {
  private readonly http: AxiosInstance;

  constructor(config?: ZendeskConfig) {
    const resolved = config ?? readConfig();
    const baseURL = `https://${resolved.subdomain}.zendesk.com/api/v2`;
    const token = Buffer.from(`${resolved.email}/token:${resolved.apiToken}`).toString("base64");

    this.http = axios.create({
      baseURL,
      timeout: 15000
    });

    this.http.interceptors.request.use((requestConfig) => {
      requestConfig.headers = requestConfig.headers ?? {};
      requestConfig.headers.Authorization = `Basic ${token}`;
      requestConfig.headers["Content-Type"] = "application/json";
      return requestConfig;
    });
  }

  private async requestWithErrorHandling<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.http.request<T>(config);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string; description?: string; message?: string }>;
      const status = axiosError.response?.status;
      const payload = axiosError.response?.data;
      const zendeskMessage = payload?.description ?? payload?.error ?? payload?.message;
      const message = zendeskMessage ?? axiosError.message ?? "Zendesk request failed";
      throw new ZendeskApiError(message, status, payload?.error);
    }
  }

  async getTicket(ticketId: number): Promise<ZendeskTicket> {
    const data = await this.requestWithErrorHandling<ZendeskTicketApiResponse>({
      method: "GET",
      url: `/tickets/${ticketId}.json`
    });
    return data.ticket;
  }

  async listTickets(status?: TicketStatus, perPage = 25): Promise<TicketSummary[]> {
    const data = await this.requestWithErrorHandling<ZendeskTicketsApiResponse>({
      method: "GET",
      url: "/tickets.json",
      params: { per_page: perPage }
    });

    const tickets = status ? data.tickets.filter((ticket) => ticket.status === status) : data.tickets;
    return tickets.map((ticket) => ({
      id: ticket.id,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      requester_id: ticket.requester_id,
      url: ticket.url
    }));
  }

  async createTicket(input: {
    subject: string;
    body: string;
    priority?: TicketPriority;
    requester_email: string;
    requester_name: string;
  }): Promise<ZendeskTicket> {
    const payload = {
      ticket: {
        subject: input.subject,
        comment: { body: input.body, public: true },
        priority: input.priority,
        requester: {
          name: input.requester_name,
          email: input.requester_email
        }
      }
    };

    const data = await this.requestWithErrorHandling<ZendeskTicketApiResponse>({
      method: "POST",
      url: "/tickets.json",
      data: payload
    });
    return data.ticket;
  }

  async updateTicket(input: {
    ticket_id: number;
    status?: TicketStatus;
    priority?: TicketPriority;
    comment?: string;
  }): Promise<ZendeskTicket> {
    const payload: {
      ticket: {
        status?: TicketStatus;
        priority?: TicketPriority;
        comment?: { body: string; public: boolean };
      };
    } = {
      ticket: {}
    };

    if (input.status) {
      payload.ticket.status = input.status;
    }
    if (input.priority) {
      payload.ticket.priority = input.priority;
    }
    if (input.comment) {
      payload.ticket.comment = { body: input.comment, public: true };
    }

    const data = await this.requestWithErrorHandling<ZendeskTicketApiResponse>({
      method: "PUT",
      url: `/tickets/${input.ticket_id}.json`,
      data: payload
    });
    return data.ticket;
  }

  async addComment(ticketId: number, body: string, isPublic = true): Promise<TicketComment> {
    const data = await this.requestWithErrorHandling<ZendeskTicketApiResponse>({
      method: "PUT",
      url: `/tickets/${ticketId}.json`,
      data: {
        ticket: {
          comment: {
            body,
            public: isPublic
          }
        }
      }
    });

    return {
      id: data.ticket.id,
      author_id: 0,
      body,
      created_at: new Date().toISOString(),
      public: isPublic
    };
  }

  async searchTickets(query: string): Promise<TicketSummary[]> {
    const data = await this.requestWithErrorHandling<ZendeskSearchApiResponse>({
      method: "GET",
      url: "/search.json",
      params: { query }
    });

    return data.results
      .filter((item) => typeof item.id === "number")
      .map((ticket) => ({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        requester_id: ticket.requester_id,
        url: ticket.url
      }));
  }

  async getUser(userId: number): Promise<ZendeskUser> {
    const data = await this.requestWithErrorHandling<ZendeskUserApiResponse>({
      method: "GET",
      url: `/users/${userId}.json`
    });
    return data.user;
  }

  async getRequester(requesterId: number): Promise<ZendeskRequester> {
    const data = await this.requestWithErrorHandling<ZendeskRequesterApiResponse>({
      method: "GET",
      url: `/users/${requesterId}.json`
    });
    return {
      name: data.user.name,
      email: data.user.email
    };
  }

  async listTicketComments(ticketId: number): Promise<TicketComment[]> {
    const data = await this.requestWithErrorHandling<ZendeskCommentsApiResponse>({
      method: "GET",
      url: `/tickets/${ticketId}/comments.json`
    });
    return data.comments;
  }
}

export function formatToolError(error: unknown): { code: string; message: string; status?: number } {
  if (error instanceof ZendeskApiError) {
    return {
      code: "ZENDESK_API_ERROR",
      status: error.status,
      message: error.message
    };
  }

  if (error instanceof Error) {
    return {
      code: "INTERNAL_ERROR",
      message: error.message
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Unknown error"
  };
}
