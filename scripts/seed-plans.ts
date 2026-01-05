import { db } from "../src/infra/db";

async function main() {
  console.warn("--> Seeding Plans...");

  // FREE PLAN
  const _free = await db.plan.upsert({
    where: { slug: "free" },
    update: {},
    create: {
      slug: "free",
      name: "Free Tier",
      description: "For personal use",
      limits: {
        create: [
          { resourceKey: "MAX_OWNED_WORKSPACES", limitValue: 10 },
          { resourceKey: "MAX_MEMBERS_PER_WORKSPACE", limitValue: 10 },
        ],
      },
    },
  });
  console.warn("   -> Seeded: Free Plan");
  console.warn("--> Done.");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await db.$disconnect();
  });
