/**
 * Fetch projects in a workspace for a given user.
 *
 * - Workspace admins/owners (isAdmin=true): return all projects.
 * - Regular members: return only projects they are a member of.
 */
import type { PrismaClient } from "@prisma/client";

export async function fetchProjects(
  workspaceId: string,
  userId: string,
  isAdmin: boolean,
  db: PrismaClient
) {
  const projects = await db.project.findMany({
    where: {
      workspaceId,
      ...(isAdmin ? {} : { members: { some: { userId } } }),
    },
    orderBy: { createdAt: "desc" },
  });

  if (projects.length === 0) return projects;

  const projectIds = projects.map((p) => p.id);
  const pluginRows = await db.projectPlugin.findMany({
    where: { projectId: { in: projectIds } },
    select: { projectId: true, type: true },
  });

  const pluginsByProject = new Map<string, string[]>();
  for (const row of pluginRows) {
    const existing = pluginsByProject.get(row.projectId) ?? [];
    existing.push(row.type as string);
    pluginsByProject.set(row.projectId, existing);
  }

  return projects.map((project) => ({
    ...project,
    activePlugins: pluginsByProject.get(project.id) ?? [],
  }));
}
