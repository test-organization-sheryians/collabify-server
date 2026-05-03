export type GetNotificationSummaryInput = import("./schema").GetNotificationSummaryInput;

export interface NotificationSummaryOutput {
  globalMode:   "ALL" | "MENTIONS_ONLY" | "NOTHING";
  emailEnabled: boolean;
  pushEnabled:  boolean;
  isDndActive:  boolean;
  dndUntil:     string | null;
  categories:   Array<{ category: string; email: boolean; push: boolean; inApp: boolean }>;
}
