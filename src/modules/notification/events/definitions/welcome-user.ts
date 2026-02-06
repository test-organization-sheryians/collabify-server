import { NotificationChannel } from "../../core/types";
import { EventRegistry } from "../registry";

EventRegistry.register({
  type: "welcome.user",
  channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],

  // OPTIMIZATION: Critical onboarding event. Overrides preferences.
  strategy: {
    skipPreferences: true,
  },

  transformers: {
    // 1. Email Transformer
    [NotificationChannel.EMAIL]: (payload) => ({
      subject: `Welcome to Collabify, ${payload.userName}!`,
      html: `
        <div style="font-family: sans-serif;">
          <h1>Welcome aboard! 🚀</h1>
          <p>Hi ${payload.userName},</p>
          <p>We are thrilled to have you join Collabify. Your journey to better collaboration starts here.</p>
          <br/>
          <a href="${process.env.APP_URL}/onboarding" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Get Started
          </a>
        </div>
      `,
    }),

    // 2. In-App Transformer
    [NotificationChannel.IN_APP]: (_payload) => ({
      message: `Welcome to Collabify! Let's get you set up.`,
      link: `/onboarding`,
    }),
  },
});
