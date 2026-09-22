import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/errorHandler";

export const reportsRouter = Router();

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

// GET /api/reports/stock.csv - one row per flavour, one column per container, quantity in each
reportsRouter.get(
  "/stock.csv",
  asyncHandler(async (req, res) => {
    const { search, category, brand } = req.query as Record<string, string | undefined>;

    const [containers, flavours] = await Promise.all([
      prisma.container.findMany({ orderBy: { name: "asc" } }),
      prisma.flavour.findMany({
        where: {
          product: {
            ...(category ? { category } : {}),
            ...(brand ? { brand } : {}),
          },
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
        include: {
          product: true,
          stockItems: { include: { container: true } },
        },
        orderBy: [{ product: { name: "asc" } }, { nameEn: "asc" }],
      }),
    ]);

    const header = [
      "Product",
      "Brand",
      "Category",
      "Flavour (EN)",
      "Flavour (RU)",
      "Code",
      ...containers.map((c) => c.name),
      "Total",
    ];

    const rows: (string | number)[][] = [header];

    for (const f of flavours) {
      const qtyByContainer = new Map(f.stockItems.map((si) => [si.containerId, si.quantity]));
      const containerValues = containers.map((c) => qtyByContainer.get(c.id) ?? 0);
      const total = containerValues.reduce((a, b) => a + b, 0);

      // Skip flavours with zero stock everywhere to keep the report focused, unless there are no containers at all
      if (containers.length > 0 && total === 0) continue;

      rows.push([
        f.product.name,
        f.product.brand ?? "",
        f.product.category ?? "",
        f.nameEn,
        f.nameRu ?? "",
        f.code ?? "",
        ...containerValues,
        total,
      ]);
    }

    const csv = toCsv(rows);
    const filename = `stock-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    // BOM so Excel opens UTF-8 (Cyrillic flavour names) correctly
    res.send("﻿" + csv);
  })
);

// GET /api/reports/transactions.csv - transaction history export
reportsRouter.get(
  "/transactions.csv",
  asyncHandler(async (req, res) => {
    const { type, containerId, productId, from, to } = req.query as Record<string, string | undefined>;

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(productId ? { flavour: { productId } } : {}),
        ...(containerId ? { OR: [{ sourceContainerId: containerId }, { destContainerId: containerId }] } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { flavour: { include: { product: true } }, sourceContainer: true, destContainer: true },
      orderBy: { createdAt: "desc" },
    });

    const header = [
      "Date",
      "Type",
      "Product",
      "Flavour",
      "Quantity",
      "Source container",
      "Destination container",
      "Previous (source)",
      "New (source)",
      "Previous (dest)",
      "New (dest)",
      "Note",
      "Reference",
    ];

    const rows: (string | number)[][] = [header];
    for (const t of transactions) {
      rows.push([
        t.createdAt.toISOString(),
        t.type,
        t.flavour.product.name,
        t.flavour.nameEn,
        t.quantity,
        t.sourceContainer?.name ?? "",
        t.destContainer?.name ?? "",
        t.previousStockSource ?? "",
        t.newStockSource ?? "",
        t.previousStockDest ?? "",
        t.newStockDest ?? "",
        t.note ?? "",
        t.reference ?? "",
      ]);
    }

    const csv = toCsv(rows);
    const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("﻿" + csv);
  })
);
