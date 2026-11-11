import type { SlackNotificationInput } from "../../validations/delivery-handover";

export interface SlackBlockKitMessage {
  text: string;
  blocks: any[];
}

export class SlackAdapter {
  public static formatMessage(input: SlackNotificationInput): SlackBlockKitMessage {
    const { notificationType, title, summary, metadata = {} } = input;

    let emoji = "";
    let headerText = title;

    switch (notificationType) {
      case "APPROVAL_REQUEST":
        emoji = "📋";
        headerText = `*Proposal Approval Requested*: ${title}`;
        break;
      case "CHANGE_REQUEST_ALERT":
        emoji = "⚠️";
        headerText = `*Scope Change Request Raised*: ${title}`;
        break;
      case "MILESTONE_REMINDER":
        emoji = "🎯";
        headerText = `*Milestone Delivery Reminder*: ${title}`;
        break;
      case "PROJECT_UPDATE":
      default:
        emoji = "🚀";
        headerText = `*Project Delivery Update*: ${title}`;
        break;
    }

    const blocks: any[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${emoji} ${headerText}\n\n${summary}`
        }
      }
    ];

    if (Object.keys(metadata).length > 0) {
      const fields = Object.entries(metadata).map(([key, val]) => ({
        type: "mrkdwn",
        text: `*${key}*:\n${val}`
      }));

      blocks.push({
        type: "section",
        fields: fields.slice(0, 8)
      });
    }

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Sent via *SpecForge Reliable Delivery Handover* · ${new Date().toUTCString()}`
        }
      ]
    });

    return {
      text: `${emoji} ${headerText.replace(/\*/g, "")}: ${summary}`,
      blocks
    };
  }

  public static async sendNotification(input: SlackNotificationInput): Promise<{ success: boolean; error?: string }> {
    try {
      const message = this.formatMessage(input);
      // In production, fetch(input.channelWebhookUrl, { method: "POST", body: JSON.stringify(message) })
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to dispatch Slack message" };
    }
  }
}
