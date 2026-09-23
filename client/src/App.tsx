import { Route, Routes } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { ToastProvider } from "./components/ToastProvider";
import { Dashboard } from "./pages/Dashboard";
import { StockSearch } from "./pages/StockSearch";
import { Containers } from "./pages/Containers";
import { ContainerDetail } from "./pages/ContainerDetail";
import { Products } from "./pages/Products";
import { ProductDetail } from "./pages/ProductDetail";
import { BulkEntry } from "./pages/BulkEntry";
import { Transactions } from "./pages/Transactions";

export default function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 py-5">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/stock" element={<StockSearch />} />
            <Route path="/bulk" element={<BulkEntry />} />
            <Route path="/containers" element={<Containers />} />
            <Route path="/containers/:id" element={<ContainerDetail />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/transactions" element={<Transactions />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
