export type AnnouncementType = "BANNER" | "MODAL" | "EMAIL" | "CHANGELOG";

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  targetPlan?: string | null; // e.g. "AGENCY", "PROFESSIONAL", null = ALL
  targetRole?: string | null; // e.g. "OWNER", null = ALL
  actionUrl?: string | null;
  actionLabel?: string | null;
  isActive: boolean;
  startsAt: string;
  expiresAt?: string | null;
  createdAt: string;
}

export class AnnouncementsEngine {
  private static announcements: Map<string, AnnouncementItem> = new Map([
    [
      "ann_1",
      {
        id: "ann_1",
        title: "🚀 SpecForge 2.0 Released: Real-Time Handover to Jira & Linear",
        content: "You can now export approved user stories directly to external issue trackers with deterministic idempotency keys and error retry handling.",
        type: "BANNER",
        targetPlan: null, // ALL users
        targetRole: null,
        actionUrl: "/integrations",
        actionLabel: "Configure Integrations",
        isActive: true,
        startsAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      }
    ],
    [
      "ann_2",
      {
        id: "ann_2",
        title: "Exclusive Agency Tier Update: Custom Subdomains Available",
        content: "Agency and Enterprise workspaces can now configure custom CNAME client portals with SSL encryption.",
        type: "MODAL",
        targetPlan: "AGENCY",
        targetRole: "OWNER",
        actionUrl: "/settings/branding",
        actionLabel: "Set Up Custom Domain",
        isActive: true,
        startsAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      }
    ]
  ]);

  /**
   * Filters and returns active announcements matching user context.
   */
  public static getActiveForUser(params: {
    plan?: string | null;
    role?: string | null;
    currentTime?: Date;
  }): AnnouncementItem[] {
    const now = params.currentTime || new Date();

    return Array.from(this.announcements.values()).filter((ann) => {
      if (!ann.isActive) return false;
      if (new Date(ann.startsAt) > now) return false;
      if (ann.expiresAt && new Date(ann.expiresAt) < now) return false;

      // Plan matching
      if (ann.targetPlan && params.plan && ann.targetPlan !== params.plan) {
        return false;
      }

      // Role matching
      if (ann.targetRole && params.role && ann.targetRole !== params.role) {
        return false;
      }

      return true;
    });
  }

  /**
   * Creates and broadcasts a new announcement.
   */
  public static createAnnouncement(params: {
    title: string;
    content: string;
    type: AnnouncementType;
    targetPlan?: string | null;
    targetRole?: string | null;
    actionUrl?: string | null;
    actionLabel?: string | null;
    expiresAt?: string | null;
  }): AnnouncementItem {
    const id = `ann_${Date.now()}`;
    const item: AnnouncementItem = {
      id,
      title: params.title,
      content: params.content,
      type: params.type,
      targetPlan: params.targetPlan || null,
      targetRole: params.targetRole || null,
      actionUrl: params.actionUrl || null,
      actionLabel: params.actionLabel || null,
      isActive: true,
      startsAt: new Date().toISOString(),
      expiresAt: params.expiresAt || null,
      createdAt: new Date().toISOString()
    };

    this.announcements.set(id, item);
    return item;
  }

  /**
   * Toggles active state of an announcement.
   */
  public static toggleActive(id: string, active: boolean): AnnouncementItem {
    const ann = this.announcements.get(id);
    if (!ann) throw new Error(`Announcement '${id}' not found.`);
    ann.isActive = active;
    return ann;
  }

  public static listAll(): AnnouncementItem[] {
    return Array.from(this.announcements.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

