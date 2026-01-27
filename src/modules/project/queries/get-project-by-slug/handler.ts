import { db } from "@/infra/db";
import { SlugUtil } from "@/shared/utils/slug.util";
import { Project } from "@prisma/client";
import { GetProjectBySlugInput } from "./types";

export const getProjectBySlug = async (
  input: GetProjectBySlugInput
): Promise<Project | null> => {
  const { workspaceId, slug, userId } = input;

  const normalizedSlug = SlugUtil.sanitize(slug).toLowerCase();

  const project = await db.project.findFirst({
    where: {
      workspaceId,
      key: normalizedSlug,
      // members: {
      //   some: {
      //     userId,
      //   },
      // },
    },
  });

  return project;
};
