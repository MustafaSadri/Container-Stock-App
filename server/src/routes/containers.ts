import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler, AppError } from "../middleware/errorHandler";

export const containersRouter = Router();

containersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const containers = await prisma.container.findMany({
      orderBy: { name: "asc" },
      include: { stockItems: { select: { quantity: true } } },
    });

    const result = containers.map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      notes: c.notes,
      createdAt: c.createdAt,
      totalStock: c.stockItems.reduce((sum, s) => sum + s.quantity, 0),
      skuCount: c.stockItems.filter((s) => s.quantity !== 0).length,
    }));

    res.json(result);
  })
);

containersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, location, notes } = req.body;
    if (!name || typeof name !== "string") throw new AppError("Container name is required.");

    const container = await prisma.container.create({
      data: { name: name.trim(), location: location?.trim() || null, notes: notes?.trim() || null },
    });
    res.status(201).json(container);
  })
);

containersRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const container = await prisma.container.findUnique({
      where: { id: req.params.id },
      include: {
        stockItems: {
          where: { quantity: { not: 0 } },
          include: { flavour: { include: { product: true } } },
          orderBy: { quantity: "desc" },
        },
      },
    });
    if (!container) throw new AppError("Container not found.", 404);

    const totalStock = container.stockItems.reduce((sum, s) => sum + s.quantity, 0);

    res.json({
      id: container.id,
      name: container.name,
      location: container.location,
      notes: container.notes,
      createdAt: container.createdAt,
      totalStock,
      stock: container.stockItems.map((s) => ({
        stockItemId: s.id,
        quantity: s.quantity,
        flavourId: s.flavour.id,
        flavourNameEn: s.flavour.nameEn,
        flavourNameRu: s.flavour.nameRu,
        code: s.flavour.code,
        productId: s.flavour.product.id,
        productName: s.flavour.product.name,
        brand: s.flavour.product.brand,
        category: s.flavour.product.category,
        lowStockThreshold: s.flavour.lowStockThreshold,
      })),
    });
  })
);

containersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { name, location, notes } = req.body;
    const container = await prisma.container.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(location !== undefined ? { location: location?.trim() || null } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
      },
    });
    res.json(container);
  })
);

containersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const stockCount = await prisma.stockItem.count({
      where: { containerId: req.params.id, quantity: { not: 0 } },
    });
    if (stockCount > 0) {
      throw new AppError("Cannot delete a container that still holds stock. Transfer or remove stock first.", 409);
    }
    await prisma.container.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
