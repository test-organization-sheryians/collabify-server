import DataLoader from "dataloader";
import { db } from "@/infra/db";
import { Project } from "@prisma/client";

export const createProjectByIdLoader = () =>
  new DataLoader<string, Project | null>(async (ids) => {
    const projects = await db.project.findMany({
      where: { id: { in: [...ids] } },
    });
    const map = new Map(projects.map((p) => [p.id, p]));
    return ids.map((id) => map.get(id) || null);
  });
