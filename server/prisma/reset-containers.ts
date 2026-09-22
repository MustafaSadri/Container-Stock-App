import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [txCount, stockCount, containerCount] = await Promise.all([
    prisma.transaction.count(),
    prisma.stockItem.count(),
    prisma.container.count(),
  ]);

  await prisma.transaction.deleteMany({});
  await prisma.stockItem.deleteMany({});
  await prisma.container.deleteMany({});

  console.log(
    `Cleared ${containerCount} container(s), ${stockCount} stock item(s), ${txCount} transaction(s).`
  );
  console.log("Products and flavours were left untouched. Create new containers and add stock from the app.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
