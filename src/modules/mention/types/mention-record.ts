export type MentionTier = "TIER_1" | "TIER_2" | "TIER_3";
export type MentionStatus = "ACTIVE" | "ORPHANED" | "REMOVED";

export interface MentionRecord {
  id: string;
  sourceEntityId: string;
  sourceEntityType: string;
  targetEntityId: string;
  targetEntityType: string;
  displayText: string;
  sourceLocation: Record<string, unknown> | null;
  tier: MentionTier;
  status: MentionStatus;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}
