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

// Seeds the product/flavour catalog only — no containers, no stock, no transactions.
// Quantities from the original stock report are intentionally not imported: stock starts
// at zero everywhere, and containers are created and stocked by the user from the app.
async function main() {
  const dataPath = path.join(__dirname, "seed-data", "initial-stock.json");
  const rows: SeedRow[] = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  const existingProducts = await prisma.product.count();
  if (existingProducts > 0) {
    console.log("Database already has products — skipping catalog seed.");
    return;
  }

  const productCache = new Map<string, string>();
  let flavourCount = 0;

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
    if (existingFlavour) continue;

    await prisma.flavour.create({
      data: {
        productId,
        nameEn: row.flavourEn,
        nameRu: row.flavourRu ?? undefined,
        code: row.code,
      },
    });

    flavourCount++;
  }

  console.log(
    `Catalog seed complete: ${productCache.size} products, ${flavourCount} flavours. No containers or stock were created — add your own from the app.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
