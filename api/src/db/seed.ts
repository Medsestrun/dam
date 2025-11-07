import { db } from "./index";
import { assets, assetVersions } from "./schema";

const seed = async () => {
  console.log("Seeding database...");

  // Create a test asset
  const [asset] = await db
    .insert(assets)
    .values({
      title: "Test Asset",
      description: "A test asset for development",
      type: "image",
      status: "approved",
      tags: ["test", "sample"],
      createdBy: "00000000-0000-0000-0000-000000000000",
    })
    .returning();

  console.log("Created test asset:", asset.id);

  console.log("Seeding completed!");
  process.exit(0);
};

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});

