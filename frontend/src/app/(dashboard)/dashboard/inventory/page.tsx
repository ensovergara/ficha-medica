"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Product } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Textarea from "@/components/ui/textarea";
import FeatureGate from "@/components/FeatureGate";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "", sku: "", unit: "", stock_quantity: "0", min_stock: "0", price: "", description: "" });
  const [stockForm, setStockForm] = useState({ product_id: "", movement_type: "in", quantity: "", reason: "" });

  const fetchProducts = async () => {
    try {
      const { data } = await api.get("/inventory/products/", { params: search ? { search } : {} });
      setProducts(data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [search]);

  const resetForm = () => {
    setForm({ name: "", category: "", sku: "", unit: "", stock_quantity: "0", min_stock: "0", price: "", description: "" });
    setEditingId(null);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, category: p.category || "", sku: p.sku || "", unit: p.unit || "",
      stock_quantity: p.stock_quantity.toString(), min_stock: p.min_stock.toString(), price: p.price?.toString() || "", description: p.description || "",
    });
    setEditingId(p.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name, category: form.category || null, sku: form.sku || null, unit: form.unit || null,
      stock_quantity: parseInt(form.stock_quantity), min_stock: parseInt(form.min_stock),
      price: form.price ? parseFloat(form.price) : null, description: form.description || null,
    };
    if (editingId) {
      const { stock_quantity, ...updatePayload } = payload;
      await api.patch(`/inventory/products/${editingId}`, updatePayload);
    } else {
      await api.post("/inventory/products/", payload);
    }
    setShowModal(false);
    resetForm();
    fetchProducts();
  };

  const handleStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/inventory/stock-movements/", {
      product_id: stockForm.product_id, movement_type: stockForm.movement_type,
      quantity: parseInt(stockForm.quantity), reason: stockForm.reason || null,
    });
    setShowStockModal(false);
    setStockForm({ product_id: "", movement_type: "in", quantity: "", reason: "" });
    fetchProducts();
  };

  const openStockMovement = (productId: string) => {
    setStockForm({ product_id: productId, movement_type: "in", quantity: "", reason: "" });
    setShowStockModal(true);
  };

  return (
    <FeatureGate featureKey="inventory" upgradeMessage="Actualiza tu plan para acceder a gestión de inventario">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Inventario</h1>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>Nuevo Producto</Button>
        </div>

      <div className="mt-6">
        <Input placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Producto</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Precio</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">Cargando...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">No hay productos</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">{p.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{p.category || "-"}</td>
                  <td className="px-6 py-4 text-sm">
                    <Badge variant={p.stock_quantity <= p.min_stock ? "danger" : "success"}>
                      {p.stock_quantity} {p.unit || ""}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{p.price ? `$${p.price.toLocaleString()}` : "-"}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => openStockMovement(p.id)}>Mov. Stock</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Editar</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingId ? "Editar Producto" : "Nuevo Producto"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Input label="Unidad" placeholder="ej: ml, comprimidos" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {!editingId && <Input label="Stock inicial" type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />}
            <Input label="Stock mínimo" type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
            <Input label="Precio" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <Textarea label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit">{editingId ? "Guardar cambios" : "Crear producto"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showStockModal} onClose={() => setShowStockModal(false)} title="Movimiento de Stock" size="sm">
        <form onSubmit={handleStockMovement} className="space-y-4">
          <Select label="Tipo" required value={stockForm.movement_type} onChange={(e) => setStockForm({ ...stockForm, movement_type: e.target.value })} options={[{ value: "in", label: "Entrada" }, { value: "out", label: "Salida" }, { value: "adjustment", label: "Ajuste" }]} />
          <Input label="Cantidad" type="number" required min={1} value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} />
          <Input label="Razón" value={stockForm.reason} onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowStockModal(false)}>Cancelar</Button>
            <Button type="submit">Registrar</Button>
          </div>
        </form>
      </Modal>
      </div>
    </FeatureGate>
  );
}
