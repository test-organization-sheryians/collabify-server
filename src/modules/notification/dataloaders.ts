import DataLoader from "dataloader";
import { db } from "../../infra/db";
import {
  User,
  Page,
  Issue,
  ChatMessage,
  Workspace,
  Project,
} from "@prisma/client";

export const createNotificationLoaders = () => ({
  actorById: new DataLoader<string, User | null>(async (ids) => {
    const users = await db.user.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(users.map((u) => [u.id, u]));
    return ids.map((id) => map.get(id) || null);
  }),

  pageById: new DataLoader<string, Page | null>(async (ids) => {
    const pages = await db.page.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(pages.map((p) => [p.id, p]));
    return ids.map((id) => map.get(id) || null);
  }),

  issueById: new DataLoader<string, Issue | null>(async (ids) => {
    const issues = await db.issue.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(issues.map((i) => [i.id, i]));
    return ids.map((id) => map.get(id) || null);
  }),

  chatMessageById: new DataLoader<string, ChatMessage | null>(async (ids) => {
    const messages = await db.chatMessage.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(messages.map((m) => [m.id, m]));
    return ids.map((id) => map.get(id) || null);
  }),

  workspaceById: new DataLoader<string, Workspace | null>(async (ids) => {
    const workspaces = await db.workspace.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(workspaces.map((w) => [w.id, w]));
    return ids.map((id) => map.get(id) || null);
  }),

  projectById: new DataLoader<string, Project | null>(async (ids) => {
    const projects = await db.project.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(projects.map((p) => [p.id, p]));
    return ids.map((id) => map.get(id) || null);
  }),
});

export type NotificationLoaders = ReturnType<typeof createNotificationLoaders>;
