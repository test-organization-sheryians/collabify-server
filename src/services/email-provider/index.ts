import { env } from "@/shared/config/env";
import { sendWithSES } from "./ses.adapter";
import { sendToConsole } from "./console.adapter";
import { sendWithSendGrid } from "./sendgrid.adapter";
import { sendWithNodemailer } from "./nodemailer.adapter";

export interface EmailProvider {
  send: (to: string, subject: string, html: string) => Promise<void>;
}

export const emailProvider: EmailProvider = {
  send: async (to, subject, html) => {
    if (env.EMAIL_PROVIDER === "ses") return sendWithSES(to, subject, html);
    if (env.EMAIL_PROVIDER === "sendgrid") return sendWithSendGrid(to, subject, html);
    if (env.EMAIL_PROVIDER === "nodemailer") return sendWithNodemailer(to, subject, html);
    return sendToConsole(to, subject, html);
  },
};
