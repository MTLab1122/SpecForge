export interface ScopeDiffResult {
  versionA: number;
  versionB: number;
  addedItems: { id: string; title: string; category: string; estimatedHours: number }[];
  removedItems: { id: string; title: string; category: string; estimatedHours: number }[];
  modifiedItems: {
    id: string;
    title: string;
    oldDescription: string;
    newDescription: string;
    hoursDelta: number;
  }[];
  impactSummary: {
    netFeaturesDelta: number;
    netHoursDelta: number;
    netCostDelta: number;
    timelineDaysDelta: number;
    hourlyRate: number;
    currency: string;
  };
}

export class ScopeComparator {
  /**
   * Compares two scope versions and calculates cost, effort, and timeline impacts
   */
  public static compare(
    versionAData: { versionNumber: number; items: any[]; hourlyRate?: number; currency?: string },
    versionBData: { versionNumber: number; items: any[]; hourlyRate?: number; currency?: string }
  ): ScopeDiffResult {
    const hourlyRate = versionBData.hourlyRate || versionAData.hourlyRate || 65;
    const currency = versionBData.currency || versionAData.currency || "USD";

    const mapA = new Map<string, any>(versionAData.items.map((i) => [i.id || i.title, i]));
    const mapB = new Map<string, any>(versionBData.items.map((i) => [i.id || i.title, i]));

    const addedItems: { id: string; title: string; category: string; estimatedHours: number }[] = [];
    const removedItems: { id: string; title: string; category: string; estimatedHours: number }[] = [];
    const modifiedItems: {
      id: string;
      title: string;
      oldDescription: string;
      newDescription: string;
      hoursDelta: number;
    }[] = [];

    // Find added and modified
    for (const [key, itemB] of mapB.entries()) {
      const itemA = mapA.get(key);
      if (!itemA) {
        addedItems.push({
          id: itemB.id || key,
          title: itemB.title,
          category: itemB.category || "CORE_FEATURE",
          estimatedHours: Number(itemB.estimatedHours) || 8
        });
      } else {
        if (itemA.description !== itemB.description || itemA.title !== itemB.title) {
          const oldHours = Number(itemA.estimatedHours) || 8;
          const newHours = Number(itemB.estimatedHours) || 8;
          modifiedItems.push({
            id: itemB.id || key,
            title: itemB.title,
            oldDescription: itemA.description,
            newDescription: itemB.description,
            hoursDelta: newHours - oldHours
          });
        }
      }
    }

    // Find removed
    for (const [key, itemA] of mapA.entries()) {
      if (!mapB.has(key)) {
        removedItems.push({
          id: itemA.id || key,
          title: itemA.title,
          category: itemA.category || "CORE_FEATURE",
          estimatedHours: Number(itemA.estimatedHours) || 8
        });
      }
    }

    const addedHours = addedItems.reduce((acc, i) => acc + i.estimatedHours, 0);
    const removedHours = removedItems.reduce((acc, i) => acc + i.estimatedHours, 0);
    const modifiedHoursDelta = modifiedItems.reduce((acc, i) => acc + i.hoursDelta, 0);

    const netHoursDelta = addedHours - removedHours + modifiedHoursDelta;
    const netCostDelta = netHoursDelta * hourlyRate;
    // Heuristic: 6 billable hours per engineering day
    const timelineDaysDelta = Math.ceil(netHoursDelta / 6);

    return {
      versionA: versionAData.versionNumber,
      versionB: versionBData.versionNumber,
      addedItems,
      removedItems,
      modifiedItems,
      impactSummary: {
        netFeaturesDelta: addedItems.length - removedItems.length,
        netHoursDelta,
        netCostDelta,
        timelineDaysDelta,
        hourlyRate,
        currency
      }
    };
  }
}

