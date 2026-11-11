import type { InternalTask } from "../../validations/delivery-handover";

export interface NotionPageBlock {
  object: "block";
  type: string;
  [key: string]: any;
}

export interface NotionDatabaseRow {
  properties: Record<string, any>;
  children?: NotionPageBlock[];
}

export interface NotionExportResult {
  format: "DATABASE" | "PAGE" | "JSON_BLOCKS";
  pageTitle: string;
  databaseRows?: NotionDatabaseRow[];
  blocks?: NotionPageBlock[];
  markdownContent: string;
}

export class NotionExportAdapter {
  public static exportToNotion(params: {
    projectTitle: string;
    scopeSummary: string;
    estimateTotal: number;
    currency: string;
    tasks: InternalTask[];
    format?: "DATABASE" | "PAGE" | "JSON_BLOCKS";
  }): NotionExportResult {
    const { projectTitle, scopeSummary, estimateTotal, currency, tasks, format = "DATABASE" } = params;

    // Database row representation
    const databaseRows: NotionDatabaseRow[] = tasks.map((task) => ({
      properties: {
        Name: { title: [{ text: { content: task.title } }] },
        Status: { select: { name: task.status } },
        Priority: { select: { name: task.priority } },
        "Estimated Hours": { number: task.estimatedHours },
        "Milestone / Phase": { select: { name: task.milestoneTitle || "General Delivery" } },
        "Due Date": task.dueDate ? { date: { start: task.dueDate } } : null,
        Labels: { multi_select: task.labels.map((l) => ({ name: l })) }
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: task.description || "No description provided." } }]
          }
        }
      ]
    }));

    // Notion Page Block representation
    const blocks: NotionPageBlock[] = [
      {
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: [{ type: "text", text: { content: projectTitle } }] }
      },
      {
        object: "block",
        type: "callout",
        callout: {
          icon: { emoji: "📦" },
          rich_text: [
            {
              type: "text",
              text: {
                content: `Commercial Scope Baseline: ${currency} ${estimateTotal.toLocaleString()} · ${tasks.length} Executable Tasks`
              }
            }
          ]
        }
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ type: "text", text: { content: scopeSummary } }] }
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ type: "text", text: { content: "Deliverable Work Breakdown" } }] }
      }
    ];

    tasks.forEach((t) => {
      blocks.push({
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: [
            {
              type: "text",
              text: { content: `[${t.priority}] ${t.title} (${t.estimatedHours}h) - ${t.status}` }
            }
          ],
          checked: t.status === "DONE"
        }
      });
    });

    const markdownContent = `# ${projectTitle}
> **Commercial Investment:** ${currency} ${estimateTotal.toLocaleString()} · **Total Tasks:** ${tasks.length}

## Scope Summary
${scopeSummary}

## Approved Development Tasks
| Task Title | Priority | Status | Est. Hours | Milestone |
| :--- | :--- | :--- | :--- | :--- |
${tasks.map((t) => `| ${t.title} | ${t.priority} | ${t.status} | ${t.estimatedHours}h | ${t.milestoneTitle || "Phase 1"} |`).join("\n")}
`;

    return {
      format,
      pageTitle: projectTitle,
      databaseRows,
      blocks,
      markdownContent
    };
  }
}
