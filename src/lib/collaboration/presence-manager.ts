export interface ActiveUserSession {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  activeSection: string;
  lockedItemId?: string | null;
  lastHeartbeatAt: number; // Unix timestamp ms
}

// In-memory presence registry (can be backed by Redis in production)
const PRESENCE_REGISTRY = new Map<string, Map<string, ActiveUserSession>>();

export class PresenceManager {
  private static HEARTBEAT_TIMEOUT_MS = 45000; // 45 seconds TTL
  private static IDLE_LOCK_TIMEOUT_MS = 90000; // 90 seconds idle release

  /**
   * Records or updates a user's presence heartbeat and active section
   */
  public static updateHeartbeat(
    projectId: string,
    user: { userId: string; name: string; email: string; avatarUrl?: string },
    activeSection: string,
    lockedItemId?: string | null
  ): ActiveUserSession[] {
    if (!PRESENCE_REGISTRY.has(projectId)) {
      PRESENCE_REGISTRY.set(projectId, new Map());
    }

    const projectSessions = PRESENCE_REGISTRY.get(projectId)!;
    const now = Date.now();

    const existing = projectSessions.get(user.userId);
    const session: ActiveUserSession = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      activeSection,
      lockedItemId: lockedItemId !== undefined ? lockedItemId : existing?.lockedItemId || null,
      lastHeartbeatAt: now
    };

    projectSessions.set(user.userId, session);

    // Prune stale sessions
    PresenceManager.pruneStaleSessions(projectId);

    return Array.from(projectSessions.values());
  }

  /**
   * Attempts to acquire an exclusive edit lock on an item
   */
  public static acquireLock(
    projectId: string,
    userId: string,
    itemId: string
  ): { success: boolean; lockedBy?: string; lockOwnerId?: string } {
    const projectSessions = PRESENCE_REGISTRY.get(projectId);
    if (!projectSessions) return { success: true };

    const now = Date.now();

    // Check if another active user currently holds the lock
    for (const [otherUserId, session] of projectSessions.entries()) {
      if (otherUserId !== userId && session.lockedItemId === itemId) {
        // Check if the lock is stale (> 90s idle)
        if (now - session.lastHeartbeatAt > PresenceManager.IDLE_LOCK_TIMEOUT_MS) {
          session.lockedItemId = null; // Release stale lock
        } else {
          return {
            success: false,
            lockedBy: session.name,
            lockOwnerId: otherUserId
          };
        }
      }
    }

    // Assign lock to requesting user
    const currentSession = projectSessions.get(userId);
    if (currentSession) {
      currentSession.lockedItemId = itemId;
      currentSession.lastHeartbeatAt = now;
    }

    return { success: true };
  }

  /**
   * Releases an edit lock
   */
  public static releaseLock(projectId: string, userId: string, itemId: string): boolean {
    const projectSessions = PRESENCE_REGISTRY.get(projectId);
    if (!projectSessions) return true;

    const session = projectSessions.get(userId);
    if (session && session.lockedItemId === itemId) {
      session.lockedItemId = null;
      return true;
    }
    return false;
  }

  /**
   * Retrieves all active users for a project
   */
  public static getActiveUsers(projectId: string): ActiveUserSession[] {
    PresenceManager.pruneStaleSessions(projectId);
    const projectSessions = PRESENCE_REGISTRY.get(projectId);
    if (!projectSessions) return [];
    return Array.from(projectSessions.values());
  }

  /**
   * Cleans up stale sessions where heartbeat exceeded TTL
   */
  private static pruneStaleSessions(projectId: string): void {
    const projectSessions = PRESENCE_REGISTRY.get(projectId);
    if (!projectSessions) return;

    const now = Date.now();
    for (const [userId, session] of projectSessions.entries()) {
      if (now - session.lastHeartbeatAt > PresenceManager.HEARTBEAT_TIMEOUT_MS) {
        projectSessions.delete(userId);
      }
    }
  }
}

