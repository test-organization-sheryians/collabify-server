import { db } from "./src/infra/db";

const invites = await db.workspaceInvite.findMany({
  where: { email: "selfmadedeveloper@gmail.com" },
  include: { workspace: { select: { name: true } } },
  orderBy: { createdAt: "desc" },
});
console.log("Invites for selfmadedeveloper@gmail.com:", JSON.stringify(invites, null, 2));
