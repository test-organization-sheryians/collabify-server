import { NotificationChannel } from "../../core/types";
import { EventRegistry } from "../registry";

EventRegistry.register({
  type: "workspace.created",
  channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],

  // Optimization: Allow batching if multiple workspaces created quickly ?
  // Unlikely for creation, but good for testing types.
  strategy: {
    batching: {
      enabled: false, // Rare event, immediate delivery preferred
    },
    skipPreferences: true, // Critical event? maybe not, but let's say yes for owner confirmation
  },

  transformers: {
    // 1. In-App Transformer
    [NotificationChannel.IN_APP]: (payload) => ({
      message: `You successfully created workspace: ${payload.name}`,
      link: `/workspace/${payload.slug}`,
    }),

    // 2. Push Transformer
    [NotificationChannel.PUSH]: (payload) => ({
      title: "Workspace Created",
      body: `Your new workspace ${payload.name} is ready!`,
      data: {
        slug: payload.slug,
        workspaceId: payload.workspaceId,
      },
    }),
  },
});
