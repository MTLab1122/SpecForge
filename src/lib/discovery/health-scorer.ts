export interface ScopeHealthBreakdown {
  completenessScore: number; // 0 - 100
  clarityScore: number;      // 0 - 100
  conflictsScore: number;    // 0 - 100
  acceptanceCriteriaScore: number; // 0 - 100
  assumptionsScore: number;  // 0 - 100
  dependencyScore: number;   // 0 - 100
  overallScore: number;      // 0 - 100
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  status: "EXCELLENT" | "COMMERCIALLY_SAFE" | "NEEDS_ATTENTION" | "HIGH_RISK";
  actionableRecommendations: string[];
}

export class ScopeHealthScorer {
  /**
   * Computes multi-factor scope health score based on completeness, clarity, conflicts, ACs, assumptions, and dependencies
   */
  public static calculate(data: {
    questionnaireAnswersCount: number; // out of 12
    featuresCount: number;
    userStoriesCount: number;
    storiesWithCriteriaCount: number;
    openConflictsCount: number;
    totalAssumptionsCount: number;
    confirmedAssumptionsCount: number;
    hasTimelineAndBudget: boolean;
    hasMappedDependencies: boolean;
  }): ScopeHealthBreakdown {
    // 1. Completeness Score (Weight: 20%)
    const questionnaireRatio = Math.min(data.questionnaireAnswersCount / 12, 1);
    const featuresRatio = Math.min(data.featuresCount / 5, 1); // at least 5 features
    const budgetTimelineRatio = data.hasTimelineAndBudget ? 1 : 0.4;
    const completenessScore = Math.round(
      (questionnaireRatio * 0.4 + featuresRatio * 0.4 + budgetTimelineRatio * 0.2) * 100
    );

    // 2. Clarity Score (Weight: 20%)
    // Base clarity on whether stories are defined for features
    const storyFeatureRatio = data.featuresCount > 0 
      ? Math.min(data.userStoriesCount / (data.featuresCount * 1.5), 1) 
      : 0;
    const clarityScore = Math.round(storyFeatureRatio * 100);

    // 3. Conflicts Score (Weight: 20%)
    // Each open conflict docks 25 points
    const conflictsScore = Math.max(100 - data.openConflictsCount * 25, 0);

    // 4. Acceptance Criteria Score (Weight: 15%)
    const acceptanceCriteriaScore = data.userStoriesCount > 0
      ? Math.round((data.storiesWithCriteriaCount / data.userStoriesCount) * 100)
      : 0;

    // 5. Assumptions Score (Weight: 15%)
    let assumptionsScore = 100;
    if (data.totalAssumptionsCount > 0) {
      assumptionsScore = Math.round((data.confirmedAssumptionsCount / data.totalAssumptionsCount) * 100);
    }

    // 6. Dependency Coverage Score (Weight: 10%)
    const dependencyScore = data.hasMappedDependencies ? 100 : 50;

    // Weighted Overall Score
    const overallScore = Math.round(
      completenessScore * 0.20 +
      clarityScore * 0.20 +
      conflictsScore * 0.20 +
      acceptanceCriteriaScore * 0.15 +
      assumptionsScore * 0.15 +
      dependencyScore * 0.10
    );

    // Grade Assignment
    let grade: "A+" | "A" | "B" | "C" | "D" | "F" = "F";
    let status: "EXCELLENT" | "COMMERCIALLY_SAFE" | "NEEDS_ATTENTION" | "HIGH_RISK" = "HIGH_RISK";

    if (overallScore >= 95) {
      grade = "A+";
      status = "EXCELLENT";
    } else if (overallScore >= 85) {
      grade = "A";
      status = "COMMERCIALLY_SAFE";
    } else if (overallScore >= 70) {
      grade = "B";
      status = "NEEDS_ATTENTION";
    } else if (overallScore >= 55) {
      grade = "C";
      status = "NEEDS_ATTENTION";
    } else if (overallScore >= 40) {
      grade = "D";
      status = "HIGH_RISK";
    }

    // Generate Actionable Recommendations
    const recommendations: string[] = [];
    if (data.openConflictsCount > 0) {
      recommendations.push(`Resolve ${data.openConflictsCount} open technical or platform contradiction(s).`);
    }
    if (data.totalAssumptionsCount > data.confirmedAssumptionsCount) {
      recommendations.push(
        `Confirm ${data.totalAssumptionsCount - data.confirmedAssumptionsCount} pending assumption(s) with your client.`
      );
    }
    if (data.storiesWithCriteriaCount < data.userStoriesCount) {
      recommendations.push(
        `Add acceptance criteria to ${data.userStoriesCount - data.storiesWithCriteriaCount} user stor(ies).`
      );
    }
    if (data.questionnaireAnswersCount < 10) {
      recommendations.push("Complete missing discovery questionnaire categories (constraints, integrations).");
    }
    if (!data.hasTimelineAndBudget) {
      recommendations.push("Set target project budget and launch deadline in project settings.");
    }
    if (!data.hasMappedDependencies) {
      recommendations.push("Map requirement dependencies to clarify build order.");
    }

    return {
      completenessScore,
      clarityScore,
      conflictsScore,
      acceptanceCriteriaScore,
      assumptionsScore,
      dependencyScore,
      overallScore,
      grade,
      status,
      actionableRecommendations: recommendations
    };
  }
}

