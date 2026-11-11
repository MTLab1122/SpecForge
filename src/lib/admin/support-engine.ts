import { AuditLogger } from "../reliability/observability.ts";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_ON_CUSTOMER" | "RESOLVED" | "CLOSED";

export interface SupportTicketMessageItem {
  id: string;
  ticketId: string;
  authorUserId: string;
  authorName: string;
  isInternalNote: boolean; // Staff-only private note vs customer reply
  message: string;
  createdAt: string;
}

export interface SupportTicketHistoryItem {
  id: string;
  ticketId: string;
  actorUserId: string;
  changeType: "STATUS_CHANGE" | "ASSIGNMENT" | "PRIORITY_CHANGE";
  fromValue: string;
  toValue: string;
  createdAt: string;
}

export interface SupportTicketItem {
  id: string;
  ticketNumber: string; // e.g. "SF-1042"
  organizationId: string;
  creatorUserId: string;
  creatorEmail: string;
  assignedUserId: string | null;
  assignedName: string | null;
  subject: string;
  description: string;
  category: "BILLING" | "AI_EXTRACTION" | "INTEGRATIONS" | "ESTIMATION" | "BUG" | "GENERAL";
  priority: TicketPriority;
  status: TicketStatus;
  slaTargetHours: number;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messages: SupportTicketMessageItem[];
  history: SupportTicketHistoryItem[];
}

export class SupportEngine {
  public static readonly SLA_HOURS_MAP: Record<TicketPriority, number> = {
    URGENT: 1,
    HIGH: 4,
    MEDIUM: 24,
    LOW: 48
  };

  private static ticketsStore: Map<string, SupportTicketItem> = new Map([
    [
      "tick_1",
      {
        id: "tick_1",
        ticketNumber: "SF-1042",
        organizationId: "org_apex_digital",
        creatorUserId: "usr_lead",
        creatorEmail: "founder@apexdigital.com",
        assignedUserId: "usr_admin_1",
        assignedName: "Alex Vance (Founder Support)",
        subject: "Jira Cloud Export sync error on custom issue types",
        description: "When exporting to Jira Cloud, custom subtasks fail with code 400. Need assistance configuring issue mapping.",
        category: "INTEGRATIONS",
        priority: "HIGH",
        status: "IN_PROGRESS",
        slaTargetHours: 4,
        slaBreached: false,
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        resolvedAt: null,
        messages: [
          {
            id: "msg_1",
            ticketId: "tick_1",
            authorUserId: "usr_lead",
            authorName: "Marcus Vance",
            isInternalNote: false,
            message: "Our team is trying to sync sprint tasks to Jira Cloud project KEY 'SPEC' but subtask IDs throw validation errors.",
            createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
          },
          {
            id: "msg_2",
            ticketId: "tick_1",
            authorUserId: "usr_admin_1",
            authorName: "Alex Vance (Support)",
            isInternalNote: true,
            message: "Verified tenant token in Atlassian adapter. Looks like Jira schema requires Epic link field. Preparing patch.",
            createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
          }
        ],
        history: [
          {
            id: "hist_1",
            ticketId: "tick_1",
            actorUserId: "usr_admin_1",
            changeType: "ASSIGNMENT",
            fromValue: "UNASSIGNED",
            toValue: "Alex Vance",
            createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString()
          }
        ]
      }
    ]
  ]);

  /**
   * Creates a new support ticket.
   */
  public static createTicket(params: {
    organizationId: string;
    creatorUserId: string;
    creatorEmail: string;
    subject: string;
    description: string;
    category: SupportTicketItem["category"];
    priority?: TicketPriority;
  }): SupportTicketItem {
    const priority = params.priority || "MEDIUM";
    const slaTargetHours = this.SLA_HOURS_MAP[priority];
    const ticketId = `tick_${Date.now()}`;
    const ticketNumber = `SF-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTicket: SupportTicketItem = {
      id: ticketId,
      ticketNumber,
      organizationId: params.organizationId,
      creatorUserId: params.creatorUserId,
      creatorEmail: params.creatorEmail,
      assignedUserId: null,
      assignedName: null,
      subject: params.subject,
      description: params.description,
      category: params.category,
      priority,
      status: "OPEN",
      slaTargetHours,
      slaBreached: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      resolvedAt: null,
      messages: [
        {
          id: `msg_${Date.now()}`,
          ticketId,
          authorUserId: params.creatorUserId,
          authorName: params.creatorEmail,
          isInternalNote: false,
          message: params.description,
          createdAt: new Date().toISOString()
        }
      ],
      history: []
    };

    this.ticketsStore.set(ticketId, newTicket);
    return newTicket;
  }

  /**
   * Assigns a ticket to a support staff member.
   */
  public static assignTicket(ticketId: string, assignedUserId: string, assignedName: string, actorUserId: string): SupportTicketItem {
    const ticket = this.ticketsStore.get(ticketId);
    if (!ticket) throw new Error(`Ticket '${ticketId}' not found.`);

    const prev = ticket.assignedName || "UNASSIGNED";
    ticket.assignedUserId = assignedUserId;
    ticket.assignedName = assignedName;
    ticket.updatedAt = new Date().toISOString();

    ticket.history.push({
      id: `hist_${Date.now()}`,
      ticketId,
      actorUserId,
      changeType: "ASSIGNMENT",
      fromValue: prev,
      toValue: assignedName,
      createdAt: new Date().toISOString()
    });

    return ticket;
  }

  /**
   * Updates status of a ticket.
   */
  public static updateStatus(ticketId: string, newStatus: TicketStatus, actorUserId: string): SupportTicketItem {
    const ticket = this.ticketsStore.get(ticketId);
    if (!ticket) throw new Error(`Ticket '${ticketId}' not found.`);

    const prev = ticket.status;
    ticket.status = newStatus;
    ticket.updatedAt = new Date().toISOString();
    if (newStatus === "RESOLVED" || newStatus === "CLOSED") {
      ticket.resolvedAt = new Date().toISOString();
    }

    ticket.history.push({
      id: `hist_${Date.now()}`,
      ticketId,
      actorUserId,
      changeType: "STATUS_CHANGE",
      fromValue: prev,
      toValue: newStatus,
      createdAt: new Date().toISOString()
    });

    return ticket;
  }

  /**
   * Appends a message or internal note to a ticket.
   */
  public static addMessage(params: {
    ticketId: string;
    authorUserId: string;
    authorName: string;
    isInternalNote: boolean;
    message: string;
  }): SupportTicketMessageItem {
    const ticket = this.ticketsStore.get(params.ticketId);
    if (!ticket) throw new Error(`Ticket '${params.ticketId}' not found.`);

    const msg: SupportTicketMessageItem = {
      id: `msg_${Date.now()}`,
      ticketId: params.ticketId,
      authorUserId: params.authorUserId,
      authorName: params.authorName,
      isInternalNote: params.isInternalNote,
      message: params.message,
      createdAt: new Date().toISOString()
    };

    ticket.messages.push(msg);
    ticket.updatedAt = new Date().toISOString();
    return msg;
  }

  /**
   * Evaluates if SLA is breached based on elapsed hours.
   */
  public static isSlaBreached(ticket: SupportTicketItem, now: Date = new Date()): boolean {
    if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
      return false;
    }
    const elapsedHours = (now.getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
    return elapsedHours > ticket.slaTargetHours;
  }

  public static listTickets(filter?: { status?: TicketStatus; priority?: TicketPriority }): SupportTicketItem[] {
    const all = Array.from(this.ticketsStore.values());
    return all.filter((t) => {
      if (filter?.status && t.status !== filter.status) return false;
      if (filter?.priority && t.priority !== filter.priority) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public static getTicketById(id: string): SupportTicketItem | null {
    return this.ticketsStore.get(id) || null;
  }
}

