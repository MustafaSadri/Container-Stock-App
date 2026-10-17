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

function parseDate(date?: string): Date | undefined {
  if (!date) return undefined;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) throw new AppError("Invalid transaction date.");
  return parsed;
}

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
  date?: string;
}

export async function addStock(input: AddStockInput) {
  if (input.quantity <= 0) throw new AppError("Quantity must be greater than zero.");
  const createdAt = parseDate(input.date);

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
        ...(createdAt ? { createdAt } : {}),
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
  date?: string;
}

export async function removeStock(input: RemoveStockInput) {
  if (input.quantity <= 0) throw new AppError("Quantity must be greater than zero.");
  const createdAt = parseDate(input.date);

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
        ...(createdAt ? { createdAt } : {}),
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
  date?: string;
}

export async function transferStock(input: TransferStockInput) {
  if (input.quantity <= 0) throw new AppError("Quantity must be greater than zero.");
  if (input.sourceContainerId === input.destContainerId) {
    throw new AppError("Source and destination containers must be different.");
  }
  const createdAt = parseDate(input.date);

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
        ...(createdAt ? { createdAt } : {}),
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
  date?: string;
}

export async function adjustStock(input: AdjustStockInput) {
  const createdAt = parseDate(input.date);
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
        ...(createdAt ? { createdAt } : {}),
      },
      include: { flavour: { include: { product: true } }, destContainer: true, sourceContainer: true },
    });
  });
}

async function adjustStockItemQuantity(tx: Tx, flavourId: string, containerId: string, delta: number) {
  const stockItem = await getOrCreateStockItem(tx, flavourId, containerId);
  await tx.stockItem.update({ where: { id: stockItem.id }, data: { quantity: stockItem.quantity + delta } });
}

// Deletes a transaction and reverses the stock change it made, bringing the affected
// container(s) back to what they would be if the transaction had never happened — regardless
// of what other transactions happened before or after it, since a transaction's effect is
// just a delta applied to the running balance.
export async function deleteTransaction(transactionId: string) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({ where: { id: transactionId } });
    if (!transaction) throw new AppError("Transaction not found.", 404);

    switch (transaction.type) {
      case TransactionType.ADD:
      case TransactionType.IMPORT:
        if (!transaction.destContainerId) throw new AppError("Transaction is missing its destination container.");
        await adjustStockItemQuantity(tx, transaction.flavourId, transaction.destContainerId, -transaction.quantity);
        break;
      case TransactionType.REMOVE:
        if (!transaction.sourceContainerId) throw new AppError("Transaction is missing its source container.");
        await adjustStockItemQuantity(tx, transaction.flavourId, transaction.sourceContainerId, transaction.quantity);
        break;
      case TransactionType.TRANSFER:
        if (!transaction.sourceContainerId || !transaction.destContainerId) {
          throw new AppError("Transaction is missing a source or destination container.");
        }
        await adjustStockItemQuantity(tx, transaction.flavourId, transaction.sourceContainerId, transaction.quantity);
        await adjustStockItemQuantity(tx, transaction.flavourId, transaction.destContainerId, -transaction.quantity);
        break;
      case TransactionType.ADJUST: {
        const containerId = transaction.destContainerId ?? transaction.sourceContainerId;
        if (!containerId) throw new AppError("Transaction is missing its container.");
        await adjustStockItemQuantity(tx, transaction.flavourId, containerId, -transaction.quantity);
        break;
      }
      default:
        throw new AppError(`Cannot roll back unknown transaction type: ${transaction.type}`);
    }

    await tx.transaction.delete({ where: { id: transactionId } });
  });
}
