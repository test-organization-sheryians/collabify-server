import { env } from "@/shared/config/env";
import { sendToConsole } from "./console.adapter";
import { sendWithFCM } from "./fcm.adapter";

export interface PushProvider {
  send: (
    to: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ) => Promise<void>;
}

export const pushProvider: PushProvider = {
  send: async (to, title, body, data) => {
    if (env.PUSH_PROVIDER === "fcm") return sendWithFCM(to, title, body, data);
    return sendToConsole(to, title, body, data); // explicit console fallback
  },
};

