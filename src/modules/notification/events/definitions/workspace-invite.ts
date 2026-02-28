import { NotificationChannel } from "../../core/types";
import { EventRegistry } from "../registry";

EventRegistry.register({
  type: "workspace.invite",
  channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],

  transformers: {
    // 1. Email Transformer
    [NotificationChannel.EMAIL]: (payload) => ({
      subject: `You've been invited to ${payload.workspaceName}`,
      html: `
        <div style="font-family: sans-serif;">
          <h2>Hello,</h2>
          <p>You have been invited to join the workspace <strong>${payload.workspaceName}</strong> by ${payload.inviterName}.</p>
          <br/>
          <a href="${payload.inviteUrl}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Join Workspace
          </a>
        </div>
      `,
    }),

    // 2. In-App Transformer
    [NotificationChannel.IN_APP]: (payload) => ({
      message: `You were invited to ${payload.workspaceName} by ${payload.inviterName}`,
      link: payload.inviteUrl, // Or a local route like `/workspace/accept?token=...`
    }),
  },
});
