import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler, AppError } from "../middleware/errorHandler";

export const productsRouter = Router();

productsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, category, brand } = req.query as Record<string, string | undefined>;

    const products = await prisma.product.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(brand ? { brand } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { brand: { contains: search } },
                { flavours: { some: { nameEn: { contains: search } } } },
                { flavours: { some: { nameRu: { contains: search } } } },
                { flavours: { some: { code: { contains: search } } } },
              ],
            }
          : {}),
      },
      include: {
        flavours: {
          include: { stockItems: { select: { quantity: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = products.map((p) => {
      const totalStock = p.flavours.reduce(
        (sum, f) => sum + f.stockItems.reduce((s, si) => s + si.quantity, 0),
        0
      );
      return {
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        group: p.group,
        unit: p.unit,
        flavourCount: p.flavours.length,
        totalStock,
      };
    });

    res.json(result);
  })
);

productsRouter.get(
  "/meta/brands-categories",
  asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({ select: { brand: true, category: true } });
    const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort();
    const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
    res.json({ brands, categories });
  })
);

productsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, brand, category, group, unit } = req.body;
    if (!name || typeof name !== "string") throw new AppError("Product name is required.");

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        brand: brand?.trim() || null,
        category: category?.trim() || null,
        group: group?.trim() || null,
        unit: unit?.trim() || "pcs",
      },
    });
    res.status(201).json(product);
  })
);

productsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        flavours: {
          include: {
            stockItems: { include: { container: true } },
          },
          orderBy: { nameEn: "asc" },
        },
      },
    });
    if (!product) throw new AppError("Product not found.", 404);

    const flavours = product.flavours.map((f) => {
      const totalStock = f.stockItems.reduce((s, si) => s + si.quantity, 0);
      return {
        id: f.id,
        nameEn: f.nameEn,
        nameRu: f.nameRu,
        code: f.code,
        costPrice: f.costPrice,
        salePrice: f.salePrice,
        lowStockThreshold: f.lowStockThreshold,
        totalStock,
        byContainer: f.stockItems
          .filter((si) => si.quantity !== 0)
          .map((si) => ({
            containerId: si.container.id,
            containerName: si.container.name,
            location: si.container.location,
            quantity: si.quantity,
          })),
      };
    });

    res.json({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      group: product.group,
      unit: product.unit,
      totalStock: flavours.reduce((s, f) => s + f.totalStock, 0),
      flavours,
    });
  })
);

productsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { name, brand, category, group, unit } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(brand !== undefined ? { brand: brand?.trim() || null } : {}),
        ...(category !== undefined ? { category: category?.trim() || null } : {}),
        ...(group !== undefined ? { group: group?.trim() || null } : {}),
        ...(unit !== undefined ? { unit: unit?.trim() || "pcs" } : {}),
      },
    });
    res.json(product);
  })
);

productsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const stockCount = await prisma.stockItem.count({
      where: { flavour: { productId: req.params.id }, quantity: { not: 0 } },
    });
    if (stockCount > 0) {
      throw new AppError("Cannot delete a product that still has stock. Remove stock first.", 409);
    }
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

productsRouter.post(
  "/:id/flavours",
  asyncHandler(async (req, res) => {
    const { nameEn, nameRu, code, costPrice, salePrice, lowStockThreshold } = req.body;
    if (!nameEn || typeof nameEn !== "string") throw new AppError("Flavour name is required.");

    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new AppError("Product not found.", 404);

    const flavour = await prisma.flavour.create({
      data: {
        productId: product.id,
        nameEn: nameEn.trim(),
        nameRu: nameRu?.trim() || null,
        code: code?.trim() || null,
        costPrice: costPrice !== undefined && costPrice !== null && costPrice !== "" ? Number(costPrice) : null,
        salePrice: salePrice !== undefined && salePrice !== null && salePrice !== "" ? Number(salePrice) : null,
        lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : 50,
      },
    });
    res.status(201).json(flavour);
  })
);

productsRouter.patch(
  "/flavours/:flavourId",
  asyncHandler(async (req, res) => {
    const { nameEn, nameRu, code, costPrice, salePrice, lowStockThreshold } = req.body;
    const flavour = await prisma.flavour.update({
      where: { id: req.params.flavourId },
      data: {
        ...(nameEn !== undefined ? { nameEn: nameEn.trim() } : {}),
        ...(nameRu !== undefined ? { nameRu: nameRu?.trim() || null } : {}),
        ...(code !== undefined ? { code: code?.trim() || null } : {}),
        ...(costPrice !== undefined ? { costPrice: costPrice === "" || costPrice === null ? null : Number(costPrice) } : {}),
        ...(salePrice !== undefined ? { salePrice: salePrice === "" || salePrice === null ? null : Number(salePrice) } : {}),
        ...(lowStockThreshold !== undefined ? { lowStockThreshold: Number(lowStockThreshold) } : {}),
      },
    });
    res.json(flavour);
  })
);

productsRouter.delete(
  "/flavours/:flavourId",
  asyncHandler(async (req, res) => {
    const stockCount = await prisma.stockItem.count({
      where: { flavourId: req.params.flavourId, quantity: { not: 0 } },
    });
    if (stockCount > 0) {
      throw new AppError("Cannot delete a flavour that still has stock. Remove stock first.", 409);
    }
    await prisma.flavour.delete({ where: { id: req.params.flavourId } });
    res.status(204).send();
  })
);

productsRouter.get(
  "/flavours/:flavourId/history",
  asyncHandler(async (req, res) => {
    const transactions = await prisma.transaction.findMany({
      where: { flavourId: req.params.flavourId },
      include: { sourceContainer: true, destContainer: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(transactions);
  })
);
