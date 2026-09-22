import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { AppError } from "../middleware/errorHandler";

export const TransactionType = {
  ADD: "ADD",
  REMOVE: "REMOVE",
  TRANSFER: "TRANSFER",
  ADJUST: "ADJUST",
  IMPORT: "IMPORT",
} as const;

type Tx = Prisma.TransactionClient;

async function getOrCreateStockItem(tx: Tx, flavourId: string, containerId: string) {
  const existing = await tx.stockItem.findUnique({
    where: { flavourId_containerId: { flavourId, containerId } },
  });
  if (existing) return existing;
  return tx.stockItem.create({ data: { flavourId, containerId, quantity: 0 } });
}

export interface AddStockInput {
  flavourId: string;
  containerId: string;
  quantity: number;
  note?: string;
  reference?: string;
  batchId?: string;
}

export async function addStock(input: AddStockInput) {
  if (input.quantity <= 0) throw new AppError("Quantity must be greater than zero.");

  return prisma.$transaction(async (tx) => {
    const stockItem = await getOrCreateStockItem(tx, input.flavourId, input.containerId);
    const previous = stockItem.quantity;
    const updated = previous + input.quantity;

    await tx.stockItem.update({ where: { id: stockItem.id }, data: { quantity: updated } });

    return tx.transaction.create({
      data: {
        type: TransactionType.ADD,
        flavourId: input.flavourId,
        quantity: input.quantity,
        destContainerId: input.containerId,
        previousStockDest: previous,
        newStockDest: updated,
        note: input.note,
        reference: input.reference,
        batchId: input.batchId,
      },
      include: { flavour: { include: { product: true } }, destContainer: true, sourceContainer: true },
    });
  });
}

export interface RemoveStockInput {
  flavourId: string;
  containerId: string;
  quantity: number;
  note?: string;
  reference?: string;
  allowNegative?: boolean;
  batchId?: string;
}

export async function removeStock(input: RemoveStockInput) {
  if (input.quantity <= 0) throw new AppError("Quantity must be greater than zero.");

  return prisma.$transaction(async (tx) => {
    const stockItem = await getOrCreateStockItem(tx, input.flavourId, input.containerId);
    const previous = stockItem.quantity;
    const updated = previous - input.quantity;

    if (updated < 0 && !input.allowNegative) {
      throw new AppError(
        `Not enough stock: only ${previous} available. Pass allowNegative to force this adjustment.`,
        409
      );
    }

    await tx.stockItem.update({ where: { id: stockItem.id }, data: { quantity: updated } });

    return tx.transaction.create({
      data: {
        type: TransactionType.REMOVE,
        flavourId: input.flavourId,
        quantity: input.quantity,
        sourceContainerId: input.containerId,
        previousStockSource: previous,
        newStockSource: updated,
        note: input.note,
        reference: input.reference,
        batchId: input.batchId,
      },
      include: { flavour: { include: { product: true } }, destContainer: true, sourceContainer: true },
    });
  });
}

export interface TransferStockInput {
  flavourId: string;
  sourceContainerId: string;
  destContainerId: string;
  quantity: number;
  note?: string;
  reference?: string;
  allowNegative?: boolean;
  batchId?: string;
}

export async function transferStock(input: TransferStockInput) {
  if (input.quantity <= 0) throw new AppError("Quantity must be greater than zero.");
  if (input.sourceContainerId === input.destContainerId) {
    throw new AppError("Source and destination containers must be different.");
  }

  return prisma.$transaction(async (tx) => {
    const sourceItem = await getOrCreateStockItem(tx, input.flavourId, input.sourceContainerId);
    const destItem = await getOrCreateStockItem(tx, input.flavourId, input.destContainerId);

    const previousSource = sourceItem.quantity;
    const updatedSource = previousSource - input.quantity;
    if (updatedSource < 0 && !input.allowNegative) {
      throw new AppError(
        `Not enough stock in source container: only ${previousSource} available. Pass allowNegative to force this transfer.`,
        409
      );
    }
    const previousDest = destItem.quantity;
    const updatedDest = previousDest + input.quantity;

    await tx.stockItem.update({ where: { id: sourceItem.id }, data: { quantity: updatedSource } });
    await tx.stockItem.update({ where: { id: destItem.id }, data: { quantity: updatedDest } });

    return tx.transaction.create({
      data: {
        type: TransactionType.TRANSFER,
        flavourId: input.flavourId,
        quantity: input.quantity,
        sourceContainerId: input.sourceContainerId,
        destContainerId: input.destContainerId,
        previousStockSource: previousSource,
        newStockSource: updatedSource,
        previousStockDest: previousDest,
        newStockDest: updatedDest,
        note: input.note,
        reference: input.reference,
        batchId: input.batchId,
      },
      include: { flavour: { include: { product: true } }, destContainer: true, sourceContainer: true },
    });
  });
}

export interface AdjustStockInput {
  flavourId: string;
  containerId: string;
  newQuantity: number;
  note?: string;
  reference?: string;
}

export async function adjustStock(input: AdjustStockInput) {
  return prisma.$transaction(async (tx) => {
    const stockItem = await getOrCreateStockItem(tx, input.flavourId, input.containerId);
    const previous = stockItem.quantity;
    const delta = input.newQuantity - previous;

    await tx.stockItem.update({ where: { id: stockItem.id }, data: { quantity: input.newQuantity } });

    return tx.transaction.create({
      data: {
        type: TransactionType.ADJUST,
        flavourId: input.flavourId,
        quantity: delta,
        destContainerId: delta >= 0 ? input.containerId : undefined,
        sourceContainerId: delta < 0 ? input.containerId : undefined,
        previousStockDest: delta >= 0 ? previous : undefined,
        newStockDest: delta >= 0 ? input.newQuantity : undefined,
        previousStockSource: delta < 0 ? previous : undefined,
        newStockSource: delta < 0 ? input.newQuantity : undefined,
        note: input.note,
        reference: input.reference,
      },
      include: { flavour: { include: { product: true } }, destContainer: true, sourceContainer: true },
    });
  });
}
