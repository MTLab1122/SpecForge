import crypto from "node:crypto";

export interface FeatureFlagAuditRecord {
  id: string;
  flagKey: string;
  action: "CREATED" | "UPDATED" | "KILL_SWITCH" | "ROLLOUT_CHANGED" | "OVERRIDE_CHANGED";
  operatorUserId: string;
  reason: string;
  timestamp: string;
  diff?: Record<string, any>;
}

export interface FeatureFlagDefinition {
  id: string;
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number; // 0 - 100
  targetTiers: string[];     // e.g. ["AGENCY", "ENTERPRISE", "FREE", "PRO"]
  targetOrgIds: string[];    // legacy / specific tenant whitelist overrides
  workspaceOverrides?: Record<string, boolean>; // explicit true/false overrides per workspace
  targetRegions?: string[];  // e.g. ["us-east-1", "eu-central-1", "ap-south-1"]
  isABTest: boolean;
  variants?: Record<string, number>; // { control: 50, variantA: 50 }
  updatedAt: string;
}

export interface FlagEvaluationContext {
  userId?: string;
  organizationId?: string;
  subscriptionTier?: string;
  region?: string;
}

export interface FlagEvaluationResult {
  key: string;
  isEnabled: boolean;
  variant?: string;
  reason: string;
}

export class FeatureFlagsEngine {
  private static auditTrail: FeatureFlagAuditRecord[] = [];

  private static flags: Map<string, FeatureFlagDefinition> = new Map([
    [
      "ai_claude_37_sonnet",
      {
        id: "flag_1",
        key: "ai_claude_37_sonnet",
        name: "Anthropic Claude 3.7 Sonnet Model",
        description: "Enables latest high-reasoning model for complex technical discovery extraction.",
        isEnabled: true,
        rolloutPercentage: 100,
        targetTiers: ["AGENCY", "ENTERPRISE"],
        targetOrgIds: [],
        workspaceOverrides: {},
        targetRegions: ["us-east-1", "eu-central-1"],
        isABTest: false,
        updatedAt: "2026-11-01T00:00:00Z"
      }
    ],
    [
      "multi_currency_rate_cards",
      {
        id: "flag_2",
        key: "multi_currency_rate_cards",
        name: "Multi-Currency Rate Cards (PKR/USD/EUR)",
        description: "Allows mixed role pricing and international cross-currency conversions.",
        isEnabled: true,
        rolloutPercentage: 50, // 50% gradual rollout
        targetTiers: ["PROFESSIONAL", "AGENCY", "ENTERPRISE"],
        targetOrgIds: ["org_apex_digital"], // Specific tenant override
        workspaceOverrides: { org_apex_digital: true },
        targetRegions: [],
        isABTest: false,
        updatedAt: "2026-11-05T00:00:00Z"
      }
    ],
    [
      "ab_proposal_layout_v2",
      {
        id: "flag_3",
        key: "ab_proposal_layout_v2",
        name: "A/B Experiment: Interactive Scope Pricing Slider",
        description: "Tests whether an interactive deliverables slider increases client approval velocity.",
        isEnabled: true,
        rolloutPercentage: 100,
        targetTiers: [],
        targetOrgIds: [],
        workspaceOverrides: {},
        targetRegions: [],
        isABTest: true,
        variants: { control: 50, variantA: 50 },
        updatedAt: "2026-11-08T00:00:00Z"
      }
    ],
    [
      "slack_interactive_approval_buttons",
      {
        id: "flag_4",
        key: "slack_interactive_approval_buttons",
        name: "Slack Direct Interactive Approvals",
        description: "Allows stakeholders to approve proposals directly from Slack Block Kit actions.",
        isEnabled: false, // Kill-switch off
        rolloutPercentage: 0,
        targetTiers: ["ENTERPRISE"],
        targetOrgIds: [],
        workspaceOverrides: {},
        targetRegions: [],
        isABTest: false,
        updatedAt: "2026-10-20T00:00:00Z"
      }
    ],
    [
      "modular_plugin_extensibility",
      {
        id: "flag_5",
        key: "modular_plugin_extensibility",
        name: "Modular Platform Plugins & Extensions",
        description: "Allows workspaces to install third-party modular plugins and sandboxed extension points.",
        isEnabled: true,
        rolloutPercentage: 100,
        targetTiers: ["AGENCY", "ENTERPRISE"],
        targetOrgIds: [],
        workspaceOverrides: {},
        targetRegions: [],
        isABTest: false,
        updatedAt: "2026-11-09T00:00:00Z"
      }
    ]
  ]);

  /**
   * Deterministically evaluates whether a feature flag is enabled for a given context.
   */
  public static evaluate(key: string, context: FlagEvaluationContext = {}): FlagEvaluationResult {
    const flag = this.flags.get(key);
    if (!flag) {
      return { key, isEnabled: false, reason: "Flag not found in registry" };
    }

    // 1. Master Kill-Switch Check
    if (!flag.isEnabled) {
      return { key, isEnabled: false, reason: "Master flag is disabled" };
    }

    // 2. Specific Workspace Override Check (High Priority)
    if (context.organizationId) {
      if (flag.workspaceOverrides && context.organizationId in flag.workspaceOverrides) {
        const isExplicitlyAllowed = flag.workspaceOverrides[context.organizationId];
        return {
          key,
          isEnabled: isExplicitlyAllowed,
          reason: isExplicitlyAllowed
            ? "Explicit organization override (enabled)"
            : "Explicit organization override (disabled)"
        };
      }
      if (flag.targetOrgIds && flag.targetOrgIds.includes(context.organizationId)) {
        return { key, isEnabled: true, reason: "Explicit organization override" };
      }
    }

    // 3. Region Targeting Check
    if (flag.targetRegions && flag.targetRegions.length > 0) {
      if (context.region && !flag.targetRegions.includes(context.region)) {
        return {
          key,
          isEnabled: false,
          reason: `Requires region in [${flag.targetRegions.join(", ")}], but current region is '${context.region || "UNKNOWN"}'`
        };
      }
    }

    // 4. Subscription Tier Whitelist
    if (flag.targetTiers && flag.targetTiers.length > 0) {
      if (!context.subscriptionTier || !flag.targetTiers.includes(context.subscriptionTier)) {
        return {
          key,
          isEnabled: false,
          reason: `Requires tier in [${flag.targetTiers.join(", ")}], but current tier is '${context.subscriptionTier || "NONE"}'`
        };
      }
    }

    // 5. Percentage Rollout Evaluation (Deterministic Hash)
    const seed = `${context.userId || context.organizationId || "anonymous"}_${key}`;
    const hash = crypto.createHash("md5").update(seed).digest("hex");
    const bucket = parseInt(hash.slice(0, 4), 16) % 100;

    if (bucket >= flag.rolloutPercentage) {
      return {
        key,
        isEnabled: false,
        reason: `User bucket ${bucket}% is outside rollout threshold ${flag.rolloutPercentage}%`
      };
    }

    // 6. A/B Variant Assignment
    let variant: string | undefined = undefined;
    if (flag.isABTest && flag.variants) {
      const variantBucket = parseInt(hash.slice(4, 8), 16) % 100;
      let cumulative = 0;
      for (const [varName, varPct] of Object.entries(flag.variants)) {
        cumulative += varPct;
        if (variantBucket < cumulative) {
          variant = varName;
          break;
        }
      }
    }

    return {
      key,
      isEnabled: true,
      variant,
      reason: "Rollout conditions and targeting rules satisfied"
    };
  }

  /**
   * Updates or toggles a feature flag in the system registry with audit trail recording.
   */
  public static updateFlag(
    key: string,
    updates: Partial<FeatureFlagDefinition>,
    operatorUserId: string = "system_operator",
    reason: string = "Routine update"
  ): FeatureFlagDefinition {
    const existing = this.flags.get(key);
    if (!existing) {
      throw new Error(`Flag '${key}' not found.`);
    }

    const updated: FeatureFlagDefinition = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.flags.set(key, updated);

    this.recordAudit({
      flagKey: key,
      action: "UPDATED",
      operatorUserId,
      reason,
      diff: updates
    });

    return updated;
  }

  /**
   * Emergency Kill-Switch: Instantly turns off a risky flag with zero deployment and records audit.
   */
  public static killSwitch(
    key: string,
    reason: string,
    operatorUserId: string = "sre_operator"
  ): FeatureFlagDefinition {
    const flag = this.flags.get(key);
    if (!flag) {
      throw new Error(`Cannot kill-switch: Feature flag '${key}' not found.`);
    }

    flag.isEnabled = false;
    flag.rolloutPercentage = 0;
    flag.updatedAt = new Date().toISOString();

    this.recordAudit({
      flagKey: key,
      action: "KILL_SWITCH",
      operatorUserId,
      reason,
      diff: { isEnabled: false, rolloutPercentage: 0 }
    });

    console.warn(`[KILL SWITCH ACTIVATED] Feature flag '${key}' disabled by ${operatorUserId}. Reason: ${reason}`);
    return flag;
  }

  /**
   * Sets percentage rollout (0 - 100) with audit logging.
   */
  public static setRolloutPercentage(
    key: string,
    percentage: number,
    operatorUserId: string = "product_manager",
    reason: string = "Gradual rollout adjustment"
  ): FeatureFlagDefinition {
    const clamped = Math.max(0, Math.min(100, percentage));
    return this.updateFlag(
      key,
      { rolloutPercentage: clamped, isEnabled: clamped > 0 },
      operatorUserId,
      reason
    );
  }

  /**
   * Sets workspace-level explicit override.
   */
  public static setWorkspaceOverride(
    key: string,
    organizationId: string,
    enabled: boolean,
    operatorUserId: string = "admin_user",
    reason: string = "Workspace override configured"
  ): FeatureFlagDefinition {
    const flag = this.flags.get(key);
    if (!flag) {
      throw new Error(`Flag '${key}' not found.`);
    }

    if (!flag.workspaceOverrides) {
      flag.workspaceOverrides = {};
    }
    flag.workspaceOverrides[organizationId] = enabled;

    // Maintain backwards compatibility with targetOrgIds
    const orgs = new Set(flag.targetOrgIds || []);
    if (enabled) {
      orgs.add(organizationId);
    } else {
      orgs.delete(organizationId);
    }
    flag.targetOrgIds = Array.from(orgs);
    flag.updatedAt = new Date().toISOString();

    this.recordAudit({
      flagKey: key,
      action: "OVERRIDE_CHANGED",
      operatorUserId,
      reason: `${reason} (Workspace: ${organizationId}, Enabled: ${enabled})`,
      diff: { organizationId, enabled }
    });

    return flag;
  }

  /**
   * Overrides flag status for a specific workspace/organization (backwards-compatible alias).
   */
  public static overrideWorkspace(key: string, organizationId: string, enabled: boolean): FeatureFlagDefinition {
    return this.setWorkspaceOverride(key, organizationId, enabled, "system_admin", "Workspace override");
  }

  /**
   * Registers a new feature flag definition.
   */
  public static registerFlag(
    definition: Omit<FeatureFlagDefinition, "id" | "updatedAt">,
    operatorUserId: string = "system_operator"
  ): FeatureFlagDefinition {
    const id = `flag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fullFlag: FeatureFlagDefinition = {
      ...definition,
      id,
      targetRegions: definition.targetRegions || [],
      workspaceOverrides: definition.workspaceOverrides || {},
      updatedAt: new Date().toISOString()
    };

    this.flags.set(definition.key, fullFlag);

    this.recordAudit({
      flagKey: definition.key,
      action: "CREATED",
      operatorUserId,
      reason: "Initial registration"
    });

    return fullFlag;
  }

  /**
   * Records an audit event for flag governance.
   */
  private static recordAudit(data: Omit<FeatureFlagAuditRecord, "id" | "timestamp">): void {
    const auditRecord: FeatureFlagAuditRecord = {
      ...data,
      id: `ffaudit_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      timestamp: new Date().toISOString()
    };
    this.auditTrail.unshift(auditRecord);
    // Keep max 500 records
    if (this.auditTrail.length > 500) {
      this.auditTrail.pop();
    }
  }

  /**
   * Retrieves the governance audit trail.
   */
  public static getAuditTrail(flagKey?: string): FeatureFlagAuditRecord[] {
    if (flagKey) {
      return this.auditTrail.filter((a) => a.flagKey === flagKey);
    }
    return [...this.auditTrail];
  }

  /**
   * Lists all feature flags.
   */
  public static listFlags(): FeatureFlagDefinition[] {
    return Array.from(this.flags.values());
  }

  public static clear(): void {
    this.flags.set("ai_claude_37_sonnet", {
      id: "flag_1",
      key: "ai_claude_37_sonnet",
      name: "Anthropic Claude 3.7 Sonnet Model",
      description: "Enables latest high-reasoning model for complex technical discovery extraction.",
      isEnabled: true,
      rolloutPercentage: 100,
      targetTiers: ["AGENCY", "ENTERPRISE"],
      targetOrgIds: [],
      workspaceOverrides: {},
      targetRegions: ["us-east-1", "eu-central-1"],
      isABTest: false,
      updatedAt: "2026-11-01T00:00:00Z"
    });

    this.flags.set("multi_currency_rate_cards", {
      id: "flag_2",
      key: "multi_currency_rate_cards",
      name: "Multi-Currency Rate Cards (PKR/USD/EUR)",
      description: "Allows mixed role pricing and international cross-currency conversions.",
      isEnabled: true,
      rolloutPercentage: 50,
      targetTiers: ["PROFESSIONAL", "AGENCY", "ENTERPRISE"],
      targetOrgIds: ["org_apex_digital"],
      workspaceOverrides: { org_apex_digital: true },
      targetRegions: [],
      isABTest: false,
      updatedAt: "2026-11-05T00:00:00Z"
    });

    this.flags.set("ab_proposal_layout_v2", {
      id: "flag_3",
      key: "ab_proposal_layout_v2",
      name: "A/B Experiment: Interactive Scope Pricing Slider",
      description: "Tests whether an interactive deliverables slider increases client approval velocity.",
      isEnabled: true,
      rolloutPercentage: 100,
      targetTiers: [],
      targetOrgIds: [],
      workspaceOverrides: {},
      targetRegions: [],
      isABTest: true,
      variants: { control: 50, variantA: 50 },
      updatedAt: "2026-11-08T00:00:00Z"
    });

    this.flags.set("slack_interactive_approval_buttons", {
      id: "flag_4",
      key: "slack_interactive_approval_buttons",
      name: "Slack Direct Interactive Approvals",
      description: "Allows stakeholders to approve proposals directly from Slack Block Kit actions.",
      isEnabled: false,
      rolloutPercentage: 0,
      targetTiers: ["ENTERPRISE"],
      targetOrgIds: [],
      workspaceOverrides: {},
      targetRegions: [],
      isABTest: false,
      updatedAt: "2026-10-20T00:00:00Z"
    });

    this.flags.set("modular_plugin_extensibility", {
      id: "flag_5",
      key: "modular_plugin_extensibility",
      name: "Modular Platform Plugins & Extensions",
      description: "Allows workspaces to install third-party modular plugins and sandboxed extension points.",
      isEnabled: true,
      rolloutPercentage: 100,
      targetTiers: ["AGENCY", "ENTERPRISE"],
      targetOrgIds: [],
      workspaceOverrides: {},
      targetRegions: [],
      isABTest: false,
      updatedAt: "2026-11-09T00:00:00Z"
    });

    this.auditTrail = [];
  }
}
