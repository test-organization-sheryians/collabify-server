import DataLoader from "dataloader";
import { db } from "@/infra/db";
import type { ConversationMember } from "@/graphql/generated";

/**
 * DataLoader for fetching conversation members.
 * Member role is resolved from ProjectMember.projectRole (project-level RBAC).
 * Falls back to "MEMBER" for users without a project-scoped role.
 */
export const createMembersByChannelIdLoader = () =>
  new DataLoader<string, ConversationMember[]>(async (channelIds) => {
    const HARD_LIMIT_PER_CHANNEL = 50;

    const results = await Promise.all(
      channelIds.map(async (id) => {
        const members = await db.chatMember.findMany({
          where: { conversationId: id },
          take: HARD_LIMIT_PER_CHANNEL,
          orderBy: { joinedAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                projectMembers: {
                  select: {
                    projectRole: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        });

        return members.map((m) => ({
          userId: m.userId,
          role: m.user.projectMembers?.[0]?.projectRole?.name ?? "MEMBER",
          isMuted: m.isMuted,
          joinedAt: m.joinedAt,
          user: {
            id: m.user.id,
            fullName: m.user.fullName || "Unknown",
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
          },
        }));
      })
    );

    return results;
  });
