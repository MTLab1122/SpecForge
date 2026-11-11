export interface QueryPaginationOptions {
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface QueryFilterOptions {
  status?: string;
  clientId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export class QueryOptimizer {
  private static readonly MAX_LIMIT = 100;
  private static readonly DEFAULT_LIMIT = 20;

  /**
   * Sanitizes and bounds pagination options to prevent unconstrained full-table scans.
   */
  public static sanitizePagination(options: QueryPaginationOptions = {}): {
    limit: number;
    cursor?: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
  } {
    const rawLimit = Number(options.limit) || this.DEFAULT_LIMIT;
    const limit = Math.max(1, Math.min(this.MAX_LIMIT, rawLimit));
    const sortOrder = options.sortOrder?.toLowerCase() === "asc" ? "asc" : "desc";
    
    // Whitelist permitted sorting columns
    const allowedSortFields = ["createdAt", "updatedAt", "dueDate", "targetDeadline", "status", "name", "title"];
    const sortBy = allowedSortFields.includes(options.sortBy || "") ? (options.sortBy as string) : "createdAt";

    return {
      limit,
      cursor: options.cursor || undefined,
      sortBy,
      sortOrder
    };
  }

  /**
   * Selects only required fields for list/table views to reduce payload size and memory footprint.
   */
  public static projectSelectiveFields<T extends Record<string, any>>(
    entity: T,
    fields: (keyof T)[]
  ): Partial<T> {
    const projected: Partial<T> = {};
    for (const f of fields) {
      if (f in entity) {
        projected[f] = entity[f];
      }
    }
    return projected;
  }

  /**
   * Batch Loader to eliminate N+1 queries.
   * Loads multiple related child items (e.g. tasks by projectIds) in a single batch pass.
   */
  public static async batchLoadChildren<TParentKey extends string | number, TChild>(
    parentKeys: TParentKey[],
    fetcher: (keys: TParentKey[]) => Promise<TChild[]>,
    groupByKey: (child: TChild) => TParentKey
  ): Promise<Map<TParentKey, TChild[]>> {
    const grouped = new Map<TParentKey, TChild[]>();
    for (const k of parentKeys) {
      grouped.set(k, []);
    }

    if (parentKeys.length === 0) {
      return grouped;
    }

    const uniqueKeys = Array.from(new Set(parentKeys));
    const allChildren = await fetcher(uniqueKeys);

    for (const child of allChildren) {
      const parentId = groupByKey(child);
      const list = grouped.get(parentId);
      if (list) {
        list.push(child);
      } else {
        grouped.set(parentId, [child]);
      }
    }

    return grouped;
  }
}

