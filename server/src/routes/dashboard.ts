import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/errorHandler";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [containers, stockItems, recentTransactions, productCount, flavourCount] = await Promise.all([
      prisma.container.findMany({ include: { stockItems: { select: { quantity: true } } } }),
      prisma.stockItem.findMany({
        where: { quantity: { not: 0 } },
        include: { flavour: { include: { product: true } }, container: true },
      }),
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { flavour: { include: { product: true } }, sourceContainer: true, destContainer: true },
      }),
      prisma.product.count(),
      prisma.flavour.count(),
    ]);

    const totalStock = stockItems.reduce((sum, s) => sum + s.quantity, 0);

    const byContainer = containers.map((c) => ({
      containerId: c.id,
      containerName: c.name,
      location: c.location,
      totalStock: c.stockItems.reduce((sum, s) => sum + s.quantity, 0),
    }));

    const lowStockItems = stockItems
      .filter((s) => s.quantity <= s.flavour.lowStockThreshold)
      .map((s) => ({
        flavourId: s.flavour.id,
        productName: s.flavour.product.name,
        flavourNameEn: s.flavour.nameEn,
        containerName: s.container.name,
        quantity: s.quantity,
        threshold: s.flavour.lowStockThreshold,
      }))
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 25);

    const byCategory = new Map<string, number>();
    for (const s of stockItems) {
      const cat = s.flavour.product.category ?? "Uncategorized";
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + s.quantity);
    }

    const topProductsMap = new Map<string, number>();
    for (const s of stockItems) {
      const name = s.flavour.product.name;
      topProductsMap.set(name, (topProductsMap.get(name) ?? 0) + s.quantity);
    }
    const topProducts = Array.from(topProductsMap.entries())
      .map(([productName, totalStock]) => ({ productName, totalStock }))
      .sort((a, b) => b.totalStock - a.totalStock)
      .slice(0, 10);

    res.json({
      totalStock,
      totalContainers: containers.length,
      totalProducts: productCount,
      totalFlavours: flavourCount,
      byContainer,
      byCategory: Array.from(byCategory.entries()).map(([category, quantity]) => ({ category, quantity })),
      lowStockItems,
      topProducts,
      recentTransactions,
    });
  })
);
