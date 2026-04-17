export type { MentionRecord, MentionTier, MentionStatus } from "./mention-record";
export type {
  BacklinkRecord,
  BacklinkWithMention,
  BacklinkResult,
} from "./backlink-record";

export interface MentionEventRecord {
  id: string;
  mentionId: string;
  eventType: "CREATED" | "UPDATED" | "REMOVED" | "ORPHANED";
  payload: Record<string, unknown>;
  actorId: string | null;
  createdAt: Date;
}
