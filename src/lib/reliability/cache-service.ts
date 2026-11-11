export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export interface HttpCacheHeaderOptions {
  type: "PUBLIC_LANDING" | "DASHBOARD" | "MUTABLE_RESOURCE" | "STATIC_TEMPLATE";
  etag?: string;
}

export class CacheService {
  private static store: Map<string, CacheEntry<any>> = new Map();
  private static hits: number = 0;
  private static misses: number = 0;
  private static readonly MAX_ENTRIES: number = 5000;

  /**
   * Cache-aside pattern: retrieves cached item or executes fetcher and populates cache.
   */
  public static async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  public static get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses += 1;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses += 1;
      return null;
    }

    this.hits += 1;
    return entry.value as T;
  }

  public static set<T>(key: string, value: T, ttlSeconds: number = 60): void {
    if (this.store.size >= this.MAX_ENTRIES && !this.store.has(key)) {
      // LRU Eviction: remove oldest inserted entry
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  public static delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix (e.g. "org:org_123:*")
   */
  public static invalidatePrefix(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count += 1;
      }
    }
    return count;
  }

  // --------------------------------------------------------------------------
  // DOMAIN-SPECIFIC CACHING HELPERS
  // --------------------------------------------------------------------------

  /**
   * Caches user authorization permissions with safe TTL (5 minutes).
   */
  public static cacheUserPermissions(
    userId: string,
    organizationId: string,
    permissions: string[],
    ttlSeconds: number = 300
  ): void {
    const key = `perm:${organizationId}:${userId}`;
    this.set(key, permissions, ttlSeconds);
  }

  public static getUserPermissions(userId: string, organizationId: string): string[] | null {
    const key = `perm:${organizationId}:${userId}`;
    return this.get<string[]>(key);
  }

  public static invalidateUserPermissions(userId: string, organizationId?: string): number {
    if (organizationId) {
      this.delete(`perm:${organizationId}:${userId}`);
      return 1;
    }
    return this.invalidatePrefix(`perm:`);
  }

  /**
   * Caches workspace dashboard aggregate metrics with short TTL (60 seconds).
   */
  public static cacheDashboardAggregates<T>(
    organizationId: string,
    aggregates: T,
    ttlSeconds: number = 60
  ): void {
    const key = `dash:${organizationId}:aggregates`;
    this.set(key, aggregates, ttlSeconds);
  }

  public static getDashboardAggregates<T>(organizationId: string): T | null {
    return this.get<T>(`dash:${organizationId}:aggregates`);
  }

  public static invalidateDashboard(organizationId: string): void {
    this.delete(`dash:${organizationId}:aggregates`);
  }

  /**
   * Caches public template metadata with long TTL (1 hour).
   */
  public static cacheTemplateMetadata<T>(templateId: string, metadata: T, ttlSeconds: number = 3600): void {
    this.set(`template:${templateId}`, metadata, ttlSeconds);
  }

  public static getTemplateMetadata<T>(templateId: string): T | null {
    return this.get<T>(`template:${templateId}`);
  }

  /**
   * Generates standard HTTP Cache-Control and ETag headers.
   */
  public static generateHttpCacheHeaders(options: HttpCacheHeaderOptions): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (options.type) {
      case "PUBLIC_LANDING":
        headers["Cache-Control"] = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";
        break;
      case "STATIC_TEMPLATE":
        headers["Cache-Control"] = "public, max-age=86400, immutable";
        break;
      case "DASHBOARD":
        headers["Cache-Control"] = "private, max-age=60, stale-while-revalidate=120";
        headers["Vary"] = "x-org-id, x-user-id, Accept-Encoding";
        break;
      case "MUTABLE_RESOURCE":
      default:
        headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        headers["Pragma"] = "no-cache";
        break;
    }

    if (options.etag) {
      headers["ETag"] = `"${options.etag}"`;
    }

    return headers;
  }

  public static getStats() {
    const total = this.hits + this.misses;
    const hitRatePercent = total > 0 ? Number(((this.hits / total) * 100).toFixed(1)) : 0;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRatePercent
    };
  }

  public static clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// ----------------------------------------------------------------------------
// CURSOR-BASED PAGINATION HELPER
// ----------------------------------------------------------------------------

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export class PaginationHelper {
  public static paginate<T extends { id: string }>(
    items: T[],
    limit: number = 20,
    cursor?: string
  ): PaginatedResult<T> {
    const safeLimit = Math.max(1, Math.min(100, limit));
    let startIndex = 0;

    if (cursor) {
      const foundIdx = items.findIndex((i) => i.id === cursor);
      if (foundIdx !== -1) {
        startIndex = foundIdx + 1;
      }
    }

    const paginatedItems = items.slice(startIndex, startIndex + safeLimit);
    const hasMore = startIndex + safeLimit < items.length;
    const nextCursor = hasMore && paginatedItems.length > 0
      ? paginatedItems[paginatedItems.length - 1].id
      : null;

    return {
      items: paginatedItems,
      nextCursor,
      hasMore,
      totalCount: items.length
    };
  }
}
