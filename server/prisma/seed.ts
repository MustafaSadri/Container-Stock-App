import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface SeedRow {
  code: string;
  group: string | null;
  product: string;
  category: string;
  flavourEn: string;
  flavourRu: string | null;
  qty: number;
}

const BRAND_PREFIXES: [string, string][] = [
  ["ELFBAR", "ELFBAR"],
  ["TOMORO", "TOMORO"],
  ["LOST MARY", "LOST MARY"],
  ["Pod Monster", "Pod Monster"],
  ["Bad Company Wolfpack", "Bad Company"],
  ["Bad Company", "Bad Company"],
  ["Bad Drip", "Bad Drip"],
  ["Frozen Fruit Monster", "Frozen Fruit Monster"],
  ["Fruit Monster", "Fruit Monster"],
  ["Lemonade Monster", "Lemonade Monster"],
  ["Lemon Aid", "Lemon Aid"],
  ["Zenith", "Zenith"],
];

function inferBrand(productName: string): string {
  for (const [prefix, brand] of BRAND_PREFIXES) {
    if (productName.startsWith(prefix)) return brand;
  }
  return productName.split(" ")[0];
}

async function main() {
  const dataPath = path.join(__dirname, "seed-data", "initial-stock.json");
  const rows: SeedRow[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const existingContainers = await prisma.container.count();
  if (existingContainers > 0) {
    console.log("Database already has containers — skipping seed to avoid duplicate import.");
    console.log("Delete server/prisma/dev.db and re-run `npm run db:migrate && npm run db:seed` to reseed from scratch.");
    return;
  }

  const container = await prisma.container.create({
    data: {
      name: "Platina - Main Store",
      location: "Main warehouse (set actual address)",
      notes: "Default container created from initial stock import.",
    },
  });

  console.log(`Created default container: ${container.name}`);

  const productCache = new Map<string, string>();
  let flavourCount = 0;
  let skippedDuplicates = 0;

  for (const row of rows) {
    let productId = productCache.get(row.product);
    if (!productId) {
      const product = await prisma.product.upsert({
        where: { name: row.product },
        update: {},
        create: {
          name: row.product,
          brand: inferBrand(row.product),
          category: row.category,
          group: row.group ?? undefined,
          unit: "pcs",
        },
      });
      productId = product.id;
      productCache.set(row.product, productId);
    }

    const existingFlavour = await prisma.flavour.findUnique({
      where: { productId_nameEn: { productId, nameEn: row.flavourEn } },
    });
    if (existingFlavour) {
      skippedDuplicates++;
      continue;
    }

    const flavour = await prisma.flavour.create({
      data: {
        productId,
        nameEn: row.flavourEn,
        nameRu: row.flavourRu ?? undefined,
        code: row.code,
      },
    });

    await prisma.stockItem.create({
      data: {
        flavourId: flavour.id,
        containerId: container.id,
        quantity: row.qty,
      },
    });

    await prisma.transaction.create({
      data: {
        type: "IMPORT",
        flavourId: flavour.id,
        quantity: row.qty,
        destContainerId: container.id,
        previousStockDest: 0,
        newStockDest: row.qty,
        note: "Initial stock import from existing inventory report",
        reference: row.code,
      },
    });

    flavourCount++;
  }

  console.log(`Seed complete: ${productCache.size} products, ${flavourCount} flavours imported${skippedDuplicates ? `, ${skippedDuplicates} duplicates skipped` : ""}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
