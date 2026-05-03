import type { MentionRecord } from "./mention-record";

export interface BacklinkRecord {
  id: string;
  sourceEntityId: string;
  sourceEntityType: string;
  targetEntityId: string;
  targetEntityType: string;
  mentionId: string;
  context: string | null;
  createdAt: Date;
}

export interface BacklinkWithMention extends BacklinkRecord {
  sourceMention: MentionRecord;
}

export interface BacklinkResult {
  backlinks: BacklinkWithMention[];
  total: number;
  hasMore: boolean;
}
