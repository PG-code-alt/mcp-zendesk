import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
export class ZendeskApiError extends Error {
    status;
    zendeskError;
    constructor(message, status, zendeskError) {
        super(message);
        this.name = "ZendeskApiError";
        this.status = status;
        this.zendeskError = zendeskError;
    }
}
function readConfig() {
    const subdomain = process.env.ZENDESK_SUBDOMAIN;
    const email = process.env.ZENDESK_EMAIL;
    const apiToken = process.env.ZENDESK_API_TOKEN;
    if (!subdomain || !email || !apiToken) {
        throw new Error("Missing Zendesk config. Required: ZENDESK_SUBDOMAIN, ZENDESK_EMAIL, ZENDESK_API_TOKEN");
    }
    return { subdomain, email, apiToken };
}
export class ZendeskClient {
    http;
    constructor(config) {
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
    async requestWithErrorHandling(config) {
        try {
            const response = await this.http.request(config);
            return response.data;
        }
        catch (error) {
            const axiosError = error;
            const status = axiosError.response?.status;
            const payload = axiosError.response?.data;
            const zendeskMessage = payload?.description ?? payload?.error ?? payload?.message;
            const message = zendeskMessage ?? axiosError.message ?? "Zendesk request failed";
            throw new ZendeskApiError(message, status, payload?.error);
        }
    }
    async getTicket(ticketId) {
        const data = await this.requestWithErrorHandling({
            method: "GET",
            url: `/tickets/${ticketId}.json`
        });
        return data.ticket;
    }
    async listTickets(status, perPage = 25) {
        const data = await this.requestWithErrorHandling({
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
    async createTicket(input) {
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
        const data = await this.requestWithErrorHandling({
            method: "POST",
            url: "/tickets.json",
            data: payload
        });
        return data.ticket;
    }
    async updateTicket(input) {
        const payload = {
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
        const data = await this.requestWithErrorHandling({
            method: "PUT",
            url: `/tickets/${input.ticket_id}.json`,
            data: payload
        });
        return data.ticket;
    }
    async addComment(ticketId, body, isPublic = true) {
        const data = await this.requestWithErrorHandling({
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
    async searchTickets(query) {
        const data = await this.requestWithErrorHandling({
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
    async getUser(userId) {
        const data = await this.requestWithErrorHandling({
            method: "GET",
            url: `/users/${userId}.json`
        });
        return data.user;
    }
    async getRequester(requesterId) {
        const data = await this.requestWithErrorHandling({
            method: "GET",
            url: `/users/${requesterId}.json`
        });
        return {
            name: data.user.name,
            email: data.user.email
        };
    }
    async listTicketComments(ticketId) {
        const data = await this.requestWithErrorHandling({
            method: "GET",
            url: `/tickets/${ticketId}/comments.json`
        });
        return data.comments;
    }
}
export function formatToolError(error) {
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
