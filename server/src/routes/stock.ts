import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler, AppError } from "../middleware/errorHandler";
import { addStock, removeStock, transferStock, adjustStock } from "../services/stockService";

export const stockRouter = Router();

// GET /api/stock - search/filter stock across containers
stockRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      search,
      containerId,
      location,
      category,
      brand,
      productId,
      minQty,
      maxQty,
      lowStockOnly,
      includeZero,
    } = req.query as Record<string, string | undefined>;

    const stockItems = await prisma.stockItem.findMany({
      where: {
        ...(containerId ? { containerId } : {}),
        ...(includeZero === "true" ? {} : { quantity: { not: 0 } }),
        ...(location ? { container: { location: { contains: location } } } : {}),
        flavour: {
          ...(productId ? { productId } : {}),
          ...(category || brand ? { product: { ...(category ? { category } : {}), ...(brand ? { brand } : {}) } } : {}),
          ...(search
            ? {
                OR: [
                  { nameEn: { contains: search } },
                  { nameRu: { contains: search } },
                  { code: { contains: search } },
                  { product: { name: { contains: search } } },
                  { product: { brand: { contains: search } } },
                ],
              }
            : {}),
        },
      },
      include: {
        container: true,
        flavour: { include: { product: true } },
      },
      orderBy: [{ quantity: "desc" }],
    });

    let result = stockItems.map((s) => ({
      stockItemId: s.id,
      quantity: s.quantity,
      containerId: s.container.id,
      containerName: s.container.name,
      location: s.container.location,
      flavourId: s.flavour.id,
      flavourNameEn: s.flavour.nameEn,
      flavourNameRu: s.flavour.nameRu,
      code: s.flavour.code,
      productId: s.flavour.product.id,
      productName: s.flavour.product.name,
      brand: s.flavour.product.brand,
      category: s.flavour.product.category,
      lowStockThreshold: s.flavour.lowStockThreshold,
      isLowStock: s.quantity <= s.flavour.lowStockThreshold,
    }));

    if (minQty !== undefined) result = result.filter((r) => r.quantity >= Number(minQty));
    if (maxQty !== undefined) result = result.filter((r) => r.quantity <= Number(maxQty));
    if (lowStockOnly === "true") result = result.filter((r) => r.isLowStock);

    res.json(result);
  })
);

stockRouter.post(
  "/add",
  asyncHandler(async (req, res) => {
    const { flavourId, containerId, quantity, note, reference } = req.body;
    if (!flavourId || !containerId) throw new AppError("flavourId and containerId are required.");
    const tx = await addStock({ flavourId, containerId, quantity: Number(quantity), note, reference });
    res.status(201).json(tx);
  })
);

stockRouter.post(
  "/remove",
  asyncHandler(async (req, res) => {
    const { flavourId, containerId, quantity, note, reference, allowNegative } = req.body;
    if (!flavourId || !containerId) throw new AppError("flavourId and containerId are required.");
    const tx = await removeStock({
      flavourId,
      containerId,
      quantity: Number(quantity),
      note,
      reference,
      allowNegative: Boolean(allowNegative),
    });
    res.status(201).json(tx);
  })
);

stockRouter.post(
  "/transfer",
  asyncHandler(async (req, res) => {
    const { flavourId, sourceContainerId, destContainerId, quantity, note, reference, allowNegative } = req.body;
    if (!flavourId || !sourceContainerId || !destContainerId) {
      throw new AppError("flavourId, sourceContainerId and destContainerId are required.");
    }
    const tx = await transferStock({
      flavourId,
      sourceContainerId,
      destContainerId,
      quantity: Number(quantity),
      note,
      reference,
      allowNegative: Boolean(allowNegative),
    });
    res.status(201).json(tx);
  })
);

stockRouter.post(
  "/adjust",
  asyncHandler(async (req, res) => {
    const { flavourId, containerId, newQuantity, note, reference } = req.body;
    if (!flavourId || !containerId) throw new AppError("flavourId and containerId are required.");
    if (newQuantity === undefined || newQuantity === null) throw new AppError("newQuantity is required.");
    const tx = await adjustStock({ flavourId, containerId, newQuantity: Number(newQuantity), note, reference });
    res.status(201).json(tx);
  })
);

// POST /api/stock/bulk - one product/model, many flavours, one operation type, one container (or container pair for transfer)
interface BulkLine {
  flavourId: string;
  quantity: number;
}

stockRouter.post(
  "/bulk",
  asyncHandler(async (req, res) => {
    const { type, containerId, sourceContainerId, destContainerId, lines, note, reference, allowNegative } = req.body as {
      type: "ADD" | "REMOVE" | "TRANSFER";
      containerId?: string;
      sourceContainerId?: string;
      destContainerId?: string;
      lines: BulkLine[];
      note?: string;
      reference?: string;
      allowNegative?: boolean;
    };

    if (!type || !Array.isArray(lines) || lines.length === 0) {
      throw new AppError("type and a non-empty lines array are required.");
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const results = [];
    const errors: { flavourId: string; error: string }[] = [];

    for (const line of lines) {
      if (!line.flavourId || !line.quantity || line.quantity <= 0) continue;
      try {
        if (type === "ADD") {
          if (!containerId) throw new AppError("containerId is required for bulk add.");
          results.push(await addStock({ flavourId: line.flavourId, containerId, quantity: line.quantity, note, reference, batchId }));
        } else if (type === "REMOVE") {
          if (!containerId) throw new AppError("containerId is required for bulk remove.");
          results.push(
            await removeStock({
              flavourId: line.flavourId,
              containerId,
              quantity: line.quantity,
              note,
              reference,
              allowNegative: Boolean(allowNegative),
              batchId,
            })
          );
        } else if (type === "TRANSFER") {
          if (!sourceContainerId || !destContainerId) {
            throw new AppError("sourceContainerId and destContainerId are required for bulk transfer.");
          }
          results.push(
            await transferStock({
              flavourId: line.flavourId,
              sourceContainerId,
              destContainerId,
              quantity: line.quantity,
              note,
              reference,
              allowNegative: Boolean(allowNegative),
              batchId,
            })
          );
        } else {
          throw new AppError(`Unknown bulk operation type: ${type}`);
        }
      } catch (e) {
        errors.push({ flavourId: line.flavourId, error: e instanceof Error ? e.message : "Unknown error" });
      }
    }

    res.status(errors.length && !results.length ? 409 : 201).json({ batchId, succeeded: results.length, failed: errors.length, errors, results });
  })
);
