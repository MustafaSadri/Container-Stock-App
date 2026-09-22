export interface Container {
  id: string;
  name: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  totalStock: number;
  skuCount?: number;
}

export interface ContainerDetail extends Container {
  stock: StockRow[];
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  group: string | null;
  unit: string;
  flavourCount?: number;
  totalStock: number;
}

export interface FlavourDetail {
  id: string;
  nameEn: string;
  nameRu: string | null;
  code: string | null;
  costPrice: number | null;
  salePrice: number | null;
  lowStockThreshold: number;
  totalStock: number;
  byContainer: { containerId: string; containerName: string; location: string | null; quantity: number }[];
}

export interface ProductDetail extends Product {
  flavours: FlavourDetail[];
}

export interface StockRow {
  stockItemId: string;
  quantity: number;
  containerId: string;
  containerName: string;
  location: string | null;
  flavourId: string;
  flavourNameEn: string;
  flavourNameRu: string | null;
  code: string | null;
  productId: string;
  productName: string;
  brand: string | null;
  category: string | null;
  lowStockThreshold: number;
  isLowStock?: boolean;
}

export type TransactionType = "ADD" | "REMOVE" | "TRANSFER" | "ADJUST" | "IMPORT";

export interface Transaction {
  id: string;
  type: TransactionType;
  quantity: number;
  note: string | null;
  reference: string | null;
  batchId: string | null;
  createdAt: string;
  previousStockSource: number | null;
  newStockSource: number | null;
  previousStockDest: number | null;
  newStockDest: number | null;
  flavour: { id: string; nameEn: string; nameRu: string | null; product: { id: string; name: string } };
  sourceContainer: { id: string; name: string } | null;
  destContainer: { id: string; name: string } | null;
}

export interface DashboardData {
  totalStock: number;
  totalContainers: number;
  totalProducts: number;
  totalFlavours: number;
  byContainer: { containerId: string; containerName: string; location: string | null; totalStock: number }[];
  byCategory: { category: string; quantity: number }[];
  lowStockItems: {
    flavourId: string;
    productName: string;
    flavourNameEn: string;
    containerName: string;
    quantity: number;
    threshold: number;
  }[];
  topProducts: { productName: string; totalStock: number }[];
  recentTransactions: Transaction[];
}
