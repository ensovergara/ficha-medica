"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Invoice, Client } from "@/types";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import FeatureGate from "@/components/FeatureGate";

const statusVariant: Record<string, "default" | "info" | "success" | "danger"> = {
  draft: "default", issued: "info", paid: "success", cancelled: "danger",
};
const statusLabels: Record<string, string> = { draft: "Borrador", issued: "Emitida", paid: "Pagada", cancelled: "Anulada" };

interface InvoiceItem { description: string; quantity: number; unit_price: number; }

interface InvoiceDetail extends Invoice {
  items: { id: string; description: string; quantity: number; unit_price: number; total: number; }[];
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailInvoice, setDetailInvoice] = useState<InvoiceDetail | null>(null);
  const [payInvoiceId, setPayInvoiceId] = useState("");
  const [payForm, setPayForm] = useState({ amount: "", payment_method: "efectivo" });
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);

  const fetch = async () => {
    try {
      const [inv, cl] = await Promise.all([api.get("/invoices/"), api.get("/clients/")]);
      setInvoices(inv.data);
      setClients(cl.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    setItems(updated);
  };

  const subtotal = items.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  const tax = Math.round(subtotal * 0.19);
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/invoices/", { client_id: clientId, items: items.filter((it) => it.description) });
    setShowModal(false);
    setClientId("");
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
    fetch();
  };

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/invoices/${id}`, { status });
    fetch();
  };

  const openPay = (inv: Invoice) => {
    setPayInvoiceId(inv.id);
    setPayForm({ amount: inv.total.toString(), payment_method: "efectivo" });
    setShowPayModal(true);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/invoices/payments/", { invoice_id: payInvoiceId, amount: parseFloat(payForm.amount), payment_method: payForm.payment_method });
    setShowPayModal(false);
    fetch();
  };

  const getClientName = (id: string) => { const c = clients.find((c) => c.id === id); return c ? `${c.first_name} ${c.last_name}` : "-"; };

  const openDetail = async (inv: Invoice) => {
    try {
      const { data } = await api.get(`/invoices/${inv.id}`);
      setDetailInvoice(data);
      setShowDetailModal(true);
    } catch {}
  };

  return (
    <FeatureGate featureKey="billing" upgradeMessage="Actualiza tu plan para acceder a facturación">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Facturación</h1>
          <Button onClick={() => setShowModal(true)}>Nueva Factura</Button>
        </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">N°</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Fecha</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-slate-400">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">Cargando...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-slate-400">No hay facturas</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                  <td className="px-6 py-4 text-sm font-medium text-primary-600 dark:text-primary-400 cursor-pointer hover:underline" onClick={() => openDetail(inv)}>{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{getClientName(inv.client_id)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-slate-100">${inv.total.toLocaleString()}</td>
                  <td className="px-6 py-4"><Badge variant={statusVariant[inv.status]}>{statusLabels[inv.status]}</Badge></td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{new Date(inv.created_at).toLocaleDateString("es-CL")}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {inv.status === "draft" && <Button variant="ghost" size="sm" onClick={() => updateStatus(inv.id, "issued")}>Emitir</Button>}
                    {inv.status === "issued" && <Button variant="ghost" size="sm" onClick={() => openPay(inv)}>Pagar</Button>}
                    {(inv.status === "draft" || inv.status === "issued") && <Button variant="ghost" size="sm" className="text-red-600" onClick={() => updateStatus(inv.id, "cancelled")}>Anular</Button>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva Factura" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Cliente" required value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Seleccionar" options={clients.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}` }))} />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Items</label>
            {items.map((item, i) => (
              <div key={i} className="mb-2 flex gap-2 items-end">
                <div className="flex-1"><Input placeholder="Descripción" required value={item.description} onChange={(e) => updateItem(i, "description", e.target.value)} /></div>
                <div className="w-20"><Input type="number" min={1} placeholder="Cant" value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 0)} /></div>
                <div className="w-32"><Input type="number" step="0.01" placeholder="Precio" value={item.unit_price} onChange={(e) => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)} /></div>
                <div className="w-28 text-right text-sm font-medium text-gray-700 dark:text-slate-300 py-2">${(item.quantity * item.unit_price).toLocaleString()}</div>
                {items.length > 1 && <Button variant="ghost" size="sm" type="button" onClick={() => removeItem(i)} className="text-red-500">X</Button>}
              </div>
            ))}
            <Button variant="secondary" size="sm" type="button" onClick={addItem}>+ Agregar item</Button>
          </div>

          <div className="border-t dark:border-slate-700 pt-4 text-right space-y-1 text-sm text-gray-700 dark:text-slate-300">
            <p>Subtotal: <span className="font-medium">${subtotal.toLocaleString()}</span></p>
            <p>IVA (19%): <span className="font-medium">${tax.toLocaleString()}</span></p>
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100">Total: ${total.toLocaleString()}</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit">Crear factura</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Registrar Pago" size="sm">
        <form onSubmit={handlePay} className="space-y-4">
          <Input label="Monto" type="number" step="0.01" required value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
          <Select label="Método de pago" required value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })} options={[{ value: "efectivo", label: "Efectivo" }, { value: "debito", label: "Débito" }, { value: "credito", label: "Crédito" }, { value: "transferencia", label: "Transferencia" }]} />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" type="button" onClick={() => setShowPayModal(false)}>Cancelar</Button>
            <Button type="submit">Registrar pago</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title={`Detalle ${detailInvoice?.invoice_number || ""}`} size="lg">
        {detailInvoice && (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-600 dark:text-slate-400">
              <span>Cliente: <strong className="text-gray-900 dark:text-slate-100">{getClientName(detailInvoice.client_id)}</strong></span>
              <span>Estado: <Badge variant={statusVariant[detailInvoice.status]}>{statusLabels[detailInvoice.status]}</Badge></span>
            </div>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 rounded-lg border border-gray-200 dark:border-slate-700 text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Descripción</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-slate-400">Cant.</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-slate-400">Precio unit.</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-slate-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {(detailInvoice.items || []).map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-800 dark:text-slate-200">{item.description}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-slate-400">{item.quantity}</td>
                    <td className="px-4 py-2 text-right text-gray-600 dark:text-slate-400">${item.unit_price.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-slate-100">${item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t dark:border-slate-700 pt-3 text-right space-y-1 text-sm text-gray-600 dark:text-slate-400">
              <p>Subtotal: <span className="font-medium">${detailInvoice.subtotal.toLocaleString()}</span></p>
              <p>IVA (19%): <span className="font-medium">${detailInvoice.tax.toLocaleString()}</span></p>
              <p className="text-base font-bold text-gray-900 dark:text-slate-100">Total: ${detailInvoice.total.toLocaleString()}</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
    </FeatureGate>
  );
}
