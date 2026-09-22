import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/errorHandler";

export const transactionsRouter = Router();

transactionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      type,
      containerId,
      productId,
      flavourId,
      from,
      to,
      search,
      page = "1",
      pageSize = "50",
    } = req.query as Record<string, string | undefined>;

    const where: any = {
      ...(type ? { type } : {}),
      ...(flavourId ? { flavourId } : {}),
      ...(containerId ? { OR: [{ sourceContainerId: containerId }, { destContainerId: containerId }] } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(productId ? { flavour: { productId } } : {}),
      ...(search
        ? {
            OR: [
              { note: { contains: search } },
              { reference: { contains: search } },
              { flavour: { nameEn: { contains: search } } },
              { flavour: { nameRu: { contains: search } } },
              { flavour: { code: { contains: search } } },
              { flavour: { product: { name: { contains: search } } } },
            ],
          }
        : {}),
    };

    const take = Math.min(Number(pageSize) || 50, 200);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [total, transactions] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: {
          flavour: { include: { product: true } },
          sourceContainer: true,
          destContainer: true,
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
    ]);

    res.json({ total, page: Number(page) || 1, pageSize: take, transactions });
  })
);
