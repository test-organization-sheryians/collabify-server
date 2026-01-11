import { sendToConsole } from "./console.adapter";

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
    // Logic to switch providers would go here (e.g. check env.PUSH_PROVIDER)
    // For Phase 1, strictly console/mock
    return sendToConsole(to, title, body, data);
  },
};
