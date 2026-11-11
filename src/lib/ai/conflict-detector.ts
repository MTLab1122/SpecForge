export interface DetectedAnomaly {
  id: string;
  conflictType:
    | "CONTRADICTION"
    | "DUPLICATE_FEATURE"
    | "MISSING_ACCEPTANCE_CRITERIA"
    | "UNCLEAR_USER_ROLE"
    | "MISSING_CONSTRAINT"
    | "CONFLICTING_ASSUMPTION";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  affectedItemIds: string[];
  suggestedAction: string;
}

export class ConflictDetector {
  /**
   * Scans a requirements and scope bundle to identify commercial and technical risks
   */
  public static analyze(data: {
    requirements: any[];
    features: any[];
    userStories: any[];
    assumptions: any[];
  }): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    // 1. Detect Duplicate or Overlapping Features
    const featureTitles = data.features.map((f) => ({ id: f.id, title: f.title.toLowerCase() }));
    for (let i = 0; i < featureTitles.length; i++) {
      for (let j = i + 1; j < featureTitles.length; j++) {
        const wordsA = new Set<string>(featureTitles[i].title.split(" "));
        const wordsB = new Set<string>(featureTitles[j].title.split(" "));
        const intersection = [...wordsA].filter((w: string) => wordsB.has(w) && w.length > 3);

        if (intersection.length >= 2) {
          anomalies.push({
            id: `anom_dup_${i}_${j}`,
            conflictType: "DUPLICATE_FEATURE",
            severity: "MEDIUM",
            title: `Potential Duplicate Feature: "${data.features[i].title}" & "${data.features[j].title}"`,
            description: `Both features appear to target the same capability (shared keywords: ${intersection.join(", ")}). Consider merging to avoid duplicate estimation.`,
            affectedItemIds: [data.features[i].id, data.features[j].id],
            suggestedAction: "Merge duplicate features into a single consolidated item."
          });
        }
      }
    }

    // 2. Detect Missing Acceptance Criteria on User Stories
    data.userStories.forEach((story) => {
      if (!story.acceptanceCriteria || story.acceptanceCriteria.length === 0) {
        anomalies.push({
          id: `anom_mac_${story.id}`,
          conflictType: "MISSING_ACCEPTANCE_CRITERIA",
          severity: "HIGH",
          title: `Missing Acceptance Criteria on Story: "${story.asA} I want to ${story.iWantTo}"`,
          description: "This user story does not specify verifiable acceptance criteria (Given/When/Then). Unverified scope leads to client disputes during UAT.",
          affectedItemIds: [story.id],
          suggestedAction: "Add at least 2 clear acceptance criteria before finalizing scope."
        });
      }
    });

    // 3. Detect Unclear User Roles (e.g. Generic "As a user")
    data.userStories.forEach((story) => {
      const role = story.asA.trim().toLowerCase();
      if (role === "user" || role === "a user" || role === "customer") {
        anomalies.push({
          id: `anom_role_${story.id}`,
          conflictType: "UNCLEAR_USER_ROLE",
          severity: "LOW",
          title: `Generic Persona Specified: "${story.asA}"`,
          description: `User role is too generic. Specify the exact persona (e.g. "Unauthenticated Visitor", "Registered Vendor", "Tenant Administrator") to clarify permissions.`,
          affectedItemIds: [story.id],
          suggestedAction: "Refine user persona to a specific domain role."
        });
      }
    });

    // 4. Detect Contradictions between Mobile / Web or Scope Timing
    const allText = [
      ...data.requirements.map((r) => r.title + " " + r.description),
      ...data.features.map((f) => f.title + " " + f.description)
    ].join(" ").toLowerCase();

    if (
      (allText.includes("ios only") || allText.includes("native ios")) &&
      (allText.includes("android") || allText.includes("cross-platform"))
    ) {
      anomalies.push({
        id: "anom_platform_contradiction",
        conflictType: "CONTRADICTION",
        severity: "CRITICAL",
        title: "Platform Contradiction Detected (iOS-Only vs Cross-Platform)",
        description: "Source documents mention both 'iOS Native' and 'Android/Cross-Platform'. This creates a 2x variance in mobile development estimation.",
        affectedItemIds: [],
        suggestedAction: "Clarify target mobile operating systems with client."
      });
    }

    // 5. Detect Missing Constraints for Sensitive Domains
    if (
      (allText.includes("payment") || allText.includes("checkout") || allText.includes("stripe")) &&
      !allText.includes("pci") &&
      !allText.includes("currency")
    ) {
      anomalies.push({
        id: "anom_payment_constraint",
        conflictType: "MISSING_CONSTRAINT",
        severity: "HIGH",
        title: "Missing Payment Processing Constraints",
        description: "Payment capabilities are included in scope, but no currency, gateway (Stripe/PayPal), or refund constraints are specified.",
        affectedItemIds: [],
        suggestedAction: "Add an explicit constraint regarding supported payment gateways and currencies."
      });
    }

    // 6. Detect Conflicting Assumptions
    const unconfirmedAssumptions = data.requirements.filter(
      (r) => r.isAssumption && !r.assumptionConfirmed
    );
    if (unconfirmedAssumptions.length > 0) {
      anomalies.push({
        id: "anom_unconfirmed_assumptions",
        conflictType: "CONFLICTING_ASSUMPTION",
        severity: "HIGH",
        title: `${unconfirmedAssumptions.length} Unconfirmed Assumption(s) in Scope`,
        description: "Items without supporting source citations have been marked as ASSUMPTION. They must be explicitly reviewed and confirmed before freezing scope.",
        affectedItemIds: unconfirmedAssumptions.map((a) => a.id),
        suggestedAction: "Review and confirm assumptions in the AI Review panel."
      });
    }

    return anomalies;
  }
}
