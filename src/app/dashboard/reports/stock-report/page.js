'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Printer, Search, Package, AlertTriangle, XCircle, RefreshCw, Store, BarChart2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard-layout';
import {
  Autocomplete, TextField, InputAdornment, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Box, Alert, Tab, Tabs, Chip
} from '@mui/material';

const TABS = [
  { id: 'all', label: 'All Stock', icon: Package },
  { id: 'store-wise', label: 'Store Wise', icon: Store },
  { id: 'low-stock', label: 'Low Stock', icon: AlertTriangle },
  { id: 'low-stock-category', label: 'Low Stock by Category', icon: BarChart2 },
  { id: 'low-stock-store', label: 'Low Stock (Store Wise)', icon: Store },
];

export default function StockReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Active tab
  const [activeTab, setActiveTab] = useState('all');

  // Price adjustment modal
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [purchasePercentage, setPurchasePercentage] = useState('');
  const [salePercentage, setSalePercentage] = useState('');
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchStores();
    fetchReport();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (res.ok) setCategories(data);
    } catch (e) { console.error(e); }
  };

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      const result = await res.json();
      if (res.ok && result.success) setStores(result.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports?type=stock-report');
      const data = await res.json();
      if (res.ok) setReportData(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatCurrency = (v) => (parseFloat(v) || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatNumber = (v) => (v || 0).toLocaleString('en-PK');

  // ─── Filtering helpers ─────────────────────────────────────────────────────

  const getStoreQty = (product, storeId) => {
    const ss = product.store_stocks?.find(s => s.store_id === parseInt(storeId));
    return ss?.stock_quantity || 0;
  };

  const getTotalQty = (product) =>
    product.store_stocks?.reduce((s, ss) => s + (ss.stock_quantity || 0), 0) || 0;

  const isLowStock = (product, storeId = null) => {
    const threshold = product.low_stock_quantity ?? 10;
    const qty = storeId ? getStoreQty(product, storeId) : getTotalQty(product);
    return qty > 0 && qty <= threshold;
  };

  const isOutOfStock = (product, storeId = null) => {
    const qty = storeId ? getStoreQty(product, storeId) : getTotalQty(product);
    return qty === 0;
  };

  const applyBaseFilters = (products) => {
    let list = [...products];
    if (selectedCategory) list = list.filter(p => p.cat_id === parseInt(selectedCategory));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.pro_title?.toLowerCase().includes(q));
    }
    return list;
  };

  // ─── Derived data for each tab ─────────────────────────────────────────────

  const getAllStockData = () => {
    if (!reportData) return [];
    return applyBaseFilters(reportData.products);
  };

  const getStoreWiseData = () => {
    if (!reportData) return [];
    const products = applyBaseFilters(reportData.products);
    const storeList = selectedStore
      ? stores.filter(s => s.storeid === parseInt(selectedStore))
      : stores;

    return storeList.map(store => {
      const storeProducts = products
        .map(p => ({ ...p, _storeQty: getStoreQty(p, store.storeid) }))
        .filter(p => p._storeQty > 0);
      const totalQty = storeProducts.reduce((s, p) => s + p._storeQty, 0);
      const totalValue = storeProducts.reduce((s, p) => s + p._storeQty * parseFloat(p.pro_cost_price || 0), 0);
      return { store, products: storeProducts, totalQty, totalValue };
    }).filter(g => g.products.length > 0);
  };

  const getLowStockData = () => {
    if (!reportData) return [];
    return applyBaseFilters(reportData.products).filter(p => {
      const qty = selectedStore ? getStoreQty(p, selectedStore) : getTotalQty(p);
      const threshold = p.low_stock_quantity ?? 10;
      return qty > 0 && qty <= threshold;
    });
  };

  const getLowStockStoreWiseData = () => {
    if (!reportData) return [];
    const products = applyBaseFilters(reportData.products);
    const storeList = selectedStore
      ? stores.filter(s => s.storeid === parseInt(selectedStore))
      : stores;

    return storeList.map(store => {
      const threshold = (p) => p.low_stock_quantity ?? 10;
      const lowProducts = products
        .map(p => ({ ...p, _storeQty: getStoreQty(p, store.storeid) }))
        .filter(p => p._storeQty > 0 && p._storeQty <= threshold(p));
      return { store, products: lowProducts };
    }).filter(g => g.products.length > 0);
  };

  const getLowStockByCategoryData = () => {
    if (!reportData) return [];
    const products = applyBaseFilters(reportData.products);
    const grouped = {};
    products.forEach(p => {
      const qty = selectedStore ? getStoreQty(p, selectedStore) : getTotalQty(p);
      const threshold = p.low_stock_quantity ?? 10;
      if (qty > 0 && qty <= threshold) {
        const catId = p.cat_id;
        const catName = p.category?.cat_name || 'Uncategorized';
        if (!grouped[catId]) grouped[catId] = { catId, catName, products: [] };
        grouped[catId].products.push({ ...p, _qty: qty });
      }
    });
    return Object.values(grouped).sort((a, b) => a.catName.localeCompare(b.catName));
  };

  // ─── Summary stats ─────────────────────────────────────────────────────────

  const getSummary = () => {
    if (!reportData) return null;
    const products = applyBaseFilters(reportData.products);
    const getQty = (p) => selectedStore ? getStoreQty(p, selectedStore) : getTotalQty(p);
    return {
      total: products.length,
      totalQty: products.reduce((s, p) => s + getQty(p), 0),
      totalValue: products.reduce((s, p) => s + getQty(p) * parseFloat(p.pro_cost_price || 0), 0),
      lowStock: products.filter(p => isLowStock(p, selectedStore || null)).length,
      outOfStock: products.filter(p => isOutOfStock(p, selectedStore || null)).length,
    };
  };

  const summary = getSummary();

  // ─── Export ────────────────────────────────────────────────────────────────

  const handleExport = () => {
    if (!reportData) return;
    const products = getAllStockData();
    let csv = 'STOCK REPORT\n';
    csv += `Generated: ${new Date().toLocaleDateString('en-GB')}\n\n`;
    csv += 'S.No,Category,Item Name,Unit,Total Qty,Cost Rate,Stock Value,Low Stock Threshold,Status\n';
    products.forEach((p, i) => {
      const qty = selectedStore ? getStoreQty(p, selectedStore) : getTotalQty(p);
      const val = qty * parseFloat(p.pro_cost_price || 0);
      const threshold = p.low_stock_quantity ?? 10;
      const status = qty === 0 ? 'Out of Stock' : qty <= threshold ? 'Low Stock' : 'In Stock';
      csv += `${i + 1},${p.category?.cat_name || ''},${p.pro_title},${p.pro_unit || ''},${qty},${formatCurrency(p.pro_cost_price)},${formatCurrency(val)},${threshold},${status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // ─── Price adjustment ──────────────────────────────────────────────────────

  const applyPriceAdjustment = async () => {
    if (!selectedCategory) { alert('Please select a category'); return; }
    const purchaseVal = purchasePercentage !== '' ? parseFloat(purchasePercentage) : null;
    const saleVal = salePercentage !== '' ? parseFloat(salePercentage) : null;
    if ((purchaseVal == null || isNaN(purchaseVal)) && (saleVal == null || isNaN(saleVal))) {
      alert('Please enter at least one valid percentage.'); return;
    }
    if (!window.confirm(`Apply ${[purchaseVal != null ? `purchase ${purchaseVal}%` : '', saleVal != null ? `sale ${saleVal}%` : ''].filter(Boolean).join(' and ')} to category?`)) return;
    try {
      setAdjustmentLoading(true);
      const payload = { categoryId: parseInt(selectedCategory) };
      if (purchaseVal != null && !isNaN(purchaseVal)) payload.purchasePercentage = purchaseVal;
      if (saleVal != null && !isNaN(saleVal)) payload.salePercentage = saleVal;
      const res = await fetch('/api/products/adjust-price', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok) { alert(`✅ Updated ${data.updatedCount} products!`); setShowAdjustmentModal(false); setPurchasePercentage(''); setSalePercentage(''); await fetchReport(); }
      else alert(`Error: ${data.error || 'Failed'}`);
    } catch (e) { alert('Error updating prices'); }
    finally { setAdjustmentLoading(false); }
  };

  // ─── Row background helper ─────────────────────────────────────────────────

  const rowBg = (product, storeId = null, idx = 0) => {
    const qty = storeId ? getStoreQty(product, storeId) : getTotalQty(product);
    const threshold = product.low_stock_quantity ?? 10;
    if (qty < 0) return 'bg-red-100';
    if (qty === 0) return 'bg-red-50';
    if (qty <= threshold) return 'bg-amber-50';
    return idx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
  };

  const statusBadge = (product, storeId = null) => {
    const qty = storeId ? getStoreQty(product, storeId) : getTotalQty(product);
    const threshold = product.low_stock_quantity ?? 10;
    if (qty < 0) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-200 text-red-800">Negative</span>;
    if (qty === 0) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">Out of Stock</span>;
    if (qty <= threshold) return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">Low Stock</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">In Stock</span>;
  };

  // ─── Table: All Stock ──────────────────────────────────────────────────────

  const renderAllStock = () => {
    const products = getAllStockData();
    return (
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-slate-600 w-10">S#</th>
              <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-slate-600">Category</th>
              <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-slate-600">Item Name</th>
              <th className="px-3 py-3 text-center text-xs font-bold uppercase border-r border-slate-600 w-14">Unit</th>
              <th className="px-3 py-3 text-right text-xs font-bold uppercase border-r border-slate-600 w-24">Total Qty</th>
              <th className="px-3 py-3 text-left text-xs font-bold uppercase border-r border-slate-600">Store Breakdown</th>
              <th className="px-3 py-3 text-right text-xs font-bold uppercase border-r border-slate-600 w-28">Cost Rate</th>
              <th className="px-3 py-3 text-right text-xs font-bold uppercase border-r border-slate-600 w-28">Stock Value</th>
              <th className="px-3 py-3 text-center text-xs font-bold uppercase w-24">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 ? (
              <tr><td colSpan={9} className="py-10 text-center text-slate-400">No products found</td></tr>
            ) : products.map((p, i) => {
              const qty = selectedStore ? getStoreQty(p, selectedStore) : getTotalQty(p);
              const storeBreakdown = selectedStore
                ? `${stores.find(s => s.storeid === parseInt(selectedStore))?.store_name || ''}: ${getStoreQty(p, selectedStore)}`
                : (p.store_stocks?.map(ss => `${ss.store?.store_name || `Store ${ss.store_id}`}: ${ss.stock_quantity}`).join(' | ') || '—');
              return (
                <tr key={p.pro_id} className={`${rowBg(p, selectedStore || null, i)} hover:brightness-95 transition-all`}>
                  <td className="px-3 py-2 text-slate-500 border-r border-slate-100 text-xs">{i + 1}</td>
                  <td className="px-3 py-2 text-slate-600 border-r border-slate-100 text-xs">{p.category?.cat_name}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-100">{p.pro_title}</td>
                  <td className="px-3 py-2 text-center text-slate-600 border-r border-slate-100 text-xs">{p.pro_unit || '—'}</td>
                  <td className={`px-3 py-2 text-right font-bold border-r border-slate-100 tabular-nums ${qty <= 0 ? 'text-red-600' : qty <= (p.low_stock_quantity ?? 10) ? 'text-amber-600' : 'text-slate-900'}`}>{formatNumber(qty)}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs border-r border-slate-100">{storeBreakdown}</td>
                  <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100 tabular-nums">{formatCurrency(p.pro_cost_price)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900 border-r border-slate-100 tabular-nums">{formatCurrency(qty * parseFloat(p.pro_cost_price || 0))}</td>
                  <td className="px-3 py-2 text-center">{statusBadge(p, selectedStore || null)}</td>
                </tr>
              );
            })}
          </tbody>
          {products.length > 0 && (
            <tfoot>
              <tr className="bg-slate-800 text-white font-bold">
                <td colSpan={4} className="px-3 py-3 text-right text-xs uppercase border-r border-slate-600">Grand Total</td>
                <td className="px-3 py-3 text-right tabular-nums border-r border-slate-600">
                  {formatNumber(products.reduce((s, p) => s + (selectedStore ? getStoreQty(p, selectedStore) : getTotalQty(p)), 0))}
                </td>
                <td className="px-3 py-3 border-r border-slate-600"></td>
                <td className="px-3 py-3 border-r border-slate-600"></td>
                <td className="px-3 py-3 text-right tabular-nums border-r border-slate-600">
                  {formatCurrency(products.reduce((s, p) => {
                    const q = selectedStore ? getStoreQty(p, selectedStore) : getTotalQty(p);
                    return s + q * parseFloat(p.pro_cost_price || 0);
                  }, 0))}
                </td>
                <td className="px-3 py-3"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  };

  // ─── Table: Store Wise ─────────────────────────────────────────────────────

  const renderStoreWise = () => {
    const groups = getStoreWiseData();
    if (groups.length === 0) return <div className="py-16 text-center text-slate-400">No store stock data found</div>;
    return (
      <div className="space-y-6">
        {groups.map(({ store, products, totalQty, totalValue }) => (
          <div key={store.storeid} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-indigo-700 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base">
                <Store className="w-4 h-4" />
                {store.store_name}
              </div>
              <div className="flex gap-4 text-sm text-indigo-100">
                <span>{products.length} items</span>
                <span>Total Qty: <strong className="text-white">{formatNumber(totalQty)}</strong></span>
                <span>Value: <strong className="text-white">Rs. {formatCurrency(totalValue)}</strong></span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-slate-200 w-10">S#</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-slate-200">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-slate-200">Item Name</th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase border-r border-slate-200 w-14">Unit</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-slate-200 w-24">Qty (Store)</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-slate-200 w-28">Cost Rate</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-slate-200 w-28">Value</th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p, i) => (
                  <tr key={p.pro_id} className={`${rowBg(p, store.storeid, i)} hover:brightness-95`}>
                    <td className="px-3 py-2 text-slate-400 border-r border-slate-100 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 text-slate-500 border-r border-slate-100 text-xs">{p.category?.cat_name}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900 border-r border-slate-100">{p.pro_title}</td>
                    <td className="px-3 py-2 text-center text-slate-500 border-r border-slate-100 text-xs">{p.pro_unit || '—'}</td>
                    <td className={`px-3 py-2 text-right font-bold border-r border-slate-100 tabular-nums ${p._storeQty <= (p.low_stock_quantity ?? 10) ? 'text-amber-600' : 'text-slate-900'}`}>{formatNumber(p._storeQty)}</td>
                    <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-100 tabular-nums">{formatCurrency(p.pro_cost_price)}</td>
                    <td className="px-3 py-2 text-right font-semibold border-r border-slate-100 tabular-nums">{formatCurrency(p._storeQty * parseFloat(p.pro_cost_price || 0))}</td>
                    <td className="px-3 py-2 text-center">{statusBadge(p, store.storeid)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50 font-semibold text-indigo-900">
                  <td colSpan={4} className="px-3 py-2 text-right text-xs uppercase border-r border-slate-200">Store Total</td>
                  <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">{formatNumber(totalQty)}</td>
                  <td className="px-3 py-2 border-r border-slate-200"></td>
                  <td className="px-3 py-2 text-right tabular-nums border-r border-slate-200">{formatCurrency(totalValue)}</td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))}
      </div>
    );
  };

  // ─── Table: Low Stock ──────────────────────────────────────────────────────

  const renderLowStock = () => {
    const products = getLowStockData();
    return (
      <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
        <div className="bg-amber-600 text-white px-4 py-2.5 flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-4 h-4" />
          Low Stock Items — {products.length} product{products.length !== 1 ? 's' : ''} need restocking
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-amber-50 text-amber-900">
              <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-amber-200 w-10">S#</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-amber-200">Category</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-amber-200">Item Name</th>
              <th className="px-3 py-2 text-center text-xs font-bold uppercase border-r border-amber-200 w-14">Unit</th>
              <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-amber-200 w-24">Current Qty</th>
              <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-amber-200 w-24">Threshold</th>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-amber-200">Store Breakdown</th>
              <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-amber-200 w-28">Cost Rate</th>
              <th className="px-3 py-2 text-right text-xs font-bold uppercase w-28">Stock Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {products.length === 0 ? (
              <tr><td colSpan={9} className="py-10 text-center text-green-600 font-semibold">✅ No low stock items — all products are well stocked!</td></tr>
            ) : products.map((p, i) => {
              const qty = selectedStore ? getStoreQty(p, selectedStore) : getTotalQty(p);
              const threshold = p.low_stock_quantity ?? 10;
              const storeBreakdown = p.store_stocks?.map(ss => `${ss.store?.store_name || `S${ss.store_id}`}: ${ss.stock_quantity}`).join(' | ') || '—';
              return (
                <tr key={p.pro_id} className={`bg-amber-50 hover:bg-amber-100 transition-colors`}>
                  <td className="px-3 py-2 text-amber-500 border-r border-amber-100 text-xs">{i + 1}</td>
                  <td className="px-3 py-2 text-slate-600 border-r border-amber-100 text-xs">{p.category?.cat_name}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900 border-r border-amber-100">{p.pro_title}</td>
                  <td className="px-3 py-2 text-center text-slate-500 border-r border-amber-100 text-xs">{p.pro_unit || '—'}</td>
                  <td className="px-3 py-2 text-right font-bold text-amber-700 border-r border-amber-100 tabular-nums">{formatNumber(qty)}</td>
                  <td className="px-3 py-2 text-right text-slate-500 border-r border-amber-100 tabular-nums">{formatNumber(threshold)}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs border-r border-amber-100">{storeBreakdown}</td>
                  <td className="px-3 py-2 text-right text-slate-700 border-r border-amber-100 tabular-nums">{formatCurrency(p.pro_cost_price)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">{formatCurrency(qty * parseFloat(p.pro_cost_price || 0))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ─── Table: Low Stock Store Wise ───────────────────────────────────────────

  const renderLowStockStoreWise = () => {
    const groups = getLowStockStoreWiseData();
    if (groups.length === 0) return (
      <div className="py-16 text-center">
        <div className="text-green-600 font-semibold text-lg">✅ No low stock items in any store</div>
        <p className="text-slate-400 mt-1">All stores are well stocked</p>
      </div>
    );
    return (
      <div className="space-y-6">
        {groups.map(({ store, products }) => (
          <div key={store.storeid} className="bg-white border border-amber-300 rounded-lg overflow-hidden">
            <div className="bg-amber-600 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base">
                <AlertTriangle className="w-4 h-4" />
                {store.store_name} — Low Stock Alert
              </div>
              <span className="text-amber-100 text-sm">{products.length} item{products.length !== 1 ? 's' : ''} need restocking</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-amber-50 text-amber-900">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-amber-200 w-10">S#</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-amber-200">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-amber-200">Item Name</th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase border-r border-amber-200 w-14">Unit</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-amber-200 w-28">Store Qty</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-amber-200 w-24">Min Threshold</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase w-28">Cost Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {products.map((p, i) => (
                  <tr key={p.pro_id} className="bg-amber-50 hover:bg-amber-100">
                    <td className="px-3 py-2 text-amber-400 border-r border-amber-100 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 text-slate-500 border-r border-amber-100 text-xs">{p.category?.cat_name}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900 border-r border-amber-100">{p.pro_title}</td>
                    <td className="px-3 py-2 text-center text-slate-500 border-r border-amber-100 text-xs">{p.pro_unit || '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-amber-700 border-r border-amber-100 tabular-nums">{formatNumber(p._storeQty)}</td>
                    <td className="px-3 py-2 text-right text-slate-500 border-r border-amber-100 tabular-nums">{formatNumber(p.low_stock_quantity ?? 10)}</td>
                    <td className="px-3 py-2 text-right text-slate-700 tabular-nums">{formatCurrency(p.pro_cost_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  };

  // ─── Table: Low Stock by Category ─────────────────────────────────────────

  const renderLowStockByCategory = () => {
    const groups = getLowStockByCategoryData();
    if (groups.length === 0) return (
      <div className="py-16 text-center">
        <div className="text-green-600 font-semibold text-lg">✅ No low stock items in any category</div>
        <p className="text-slate-400 mt-1">All categories are well stocked</p>
      </div>
    );
    const totalLow = groups.reduce((s, g) => s + g.products.length, 0);
    return (
      <div className="space-y-5">
        {/* Overview banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <span className="text-amber-800 font-semibold">
            {totalLow} product{totalLow !== 1 ? 's' : ''} across {groups.length} categor{groups.length !== 1 ? 'ies' : 'y'} need restocking
          </span>
        </div>

        {groups.map(({ catId, catName, products }) => {
          const catTotalQty = products.reduce((s, p) => s + p._qty, 0);
          const catTotalValue = products.reduce((s, p) => s + p._qty * parseFloat(p.pro_cost_price || 0), 0);
          return (
            <div key={catId} className="bg-white border border-amber-200 rounded-lg overflow-hidden">
              {/* Category header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base">
                  <BarChart2 className="w-4 h-4" />
                  {catName}
                </div>
                <div className="flex gap-4 text-sm text-amber-100">
                  <span>{products.length} low-stock item{products.length !== 1 ? 's' : ''}</span>
                  <span>Qty: <strong className="text-white">{formatNumber(catTotalQty)}</strong></span>
                  <span>Value: <strong className="text-white">Rs. {formatCurrency(catTotalValue)}</strong></span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-50 text-amber-900">
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-amber-200 w-10">S#</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-amber-200">Item Name</th>
                    <th className="px-3 py-2 text-center text-xs font-bold uppercase border-r border-amber-200 w-14">Unit</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-amber-200 w-28">Current Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-amber-200 w-28">Min Threshold</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-amber-200 w-20">Shortage</th>
                    <th className="px-3 py-2 text-left text-xs font-bold uppercase border-r border-amber-200">Store Breakdown</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase border-r border-amber-200 w-28">Cost Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-bold uppercase w-28">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {products.map((p, i) => {
                    const threshold = p.low_stock_quantity ?? 10;
                    const shortage = threshold - p._qty;
                    const storeBreakdown = p.store_stocks?.map(ss =>
                      `${ss.store?.store_name || `S${ss.store_id}`}: ${ss.stock_quantity}`
                    ).join(' | ') || '—';
                    return (
                      <tr key={p.pro_id} className="bg-amber-50 hover:bg-amber-100 transition-colors">
                        <td className="px-3 py-2 text-amber-400 border-r border-amber-100 text-xs">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900 border-r border-amber-100">{p.pro_title}</td>
                        <td className="px-3 py-2 text-center text-slate-500 border-r border-amber-100 text-xs">{p.pro_unit || '—'}</td>
                        <td className="px-3 py-2 text-right font-bold text-amber-700 border-r border-amber-100 tabular-nums">{formatNumber(p._qty)}</td>
                        <td className="px-3 py-2 text-right text-slate-500 border-r border-amber-100 tabular-nums">{formatNumber(threshold)}</td>
                        <td className="px-3 py-2 text-right font-bold text-red-600 border-r border-amber-100 tabular-nums">{formatNumber(shortage)}</td>
                        <td className="px-3 py-2 text-slate-500 text-xs border-r border-amber-100">{storeBreakdown}</td>
                        <td className="px-3 py-2 text-right text-slate-700 border-r border-amber-100 tabular-nums">{formatCurrency(p.pro_cost_price)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">{formatCurrency(p._qty * parseFloat(p.pro_cost_price || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-100 font-semibold text-amber-900">
                    <td colSpan={3} className="px-3 py-2 text-right text-xs uppercase border-r border-amber-200">Category Total</td>
                    <td className="px-3 py-2 text-right tabular-nums border-r border-amber-200">{formatNumber(catTotalQty)}</td>
                    <td colSpan={3} className="px-3 py-2 border-r border-amber-200"></td>
                    <td className="px-3 py-2 border-r border-amber-200"></td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(catTotalValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-white overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-700 to-purple-900 text-white px-6 py-4 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/dashboard/reports')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg"><Package className="w-6 h-6" /></div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">Stock Report</h1>
                  <p className="text-purple-200 text-sm">All stock · Store wise · Low stock alerts</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={handleExport} className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </button>
              <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                <Printer className="w-4 h-4 mr-2" /> Print
              </button>
              {selectedCategory && (
                <button onClick={() => setShowAdjustmentModal(true)} className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition-colors">
                  Adjust Prices
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-5 gap-3 px-6 py-3 bg-slate-50 border-b border-slate-200 print:hidden">
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Items</p>
              <p className="text-2xl font-bold text-slate-800">{formatNumber(summary.total)}</p>
            </div>
            <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-blue-600 uppercase">Total Qty</p>
              <p className="text-2xl font-bold text-blue-800">{formatNumber(summary.totalQty)}</p>
            </div>
            <div className="bg-white border border-emerald-200 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-emerald-600 uppercase">Stock Value</p>
              <p className="text-lg font-bold text-emerald-800">Rs. {formatCurrency(summary.totalValue)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-amber-600 uppercase flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3" /> Low Stock</p>
              <p className="text-2xl font-bold text-amber-700">{summary.lowStock}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-xs font-semibold text-red-600 uppercase flex items-center justify-center gap-1"><XCircle className="w-3 h-3" /> Out of Stock</p>
              <p className="text-2xl font-bold text-red-700">{summary.outOfStock}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-3 print:hidden">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px] max-w-[220px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Category</label>
              <Autocomplete size="small" options={categories} getOptionLabel={(o) => o.cat_name || ''}
                value={categories.find(c => c.cat_id === parseInt(selectedCategory)) || null}
                onChange={(_, v) => setSelectedCategory(v ? v.cat_id.toString() : '')}
                autoHighlight openOnFocus
                renderInput={(params) => <TextField {...params} placeholder="All Categories" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } }} />}
              />
            </div>
            <div className="flex-1 min-w-[180px] max-w-[220px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Store</label>
              <Autocomplete size="small" options={stores} getOptionLabel={(o) => o.store_name || ''}
                value={stores.find(s => s.storeid === parseInt(selectedStore)) || null}
                onChange={(_, v) => setSelectedStore(v ? v.storeid.toString() : '')}
                autoHighlight openOnFocus
                renderInput={(params) => <TextField {...params} placeholder="All Stores" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } }} />}
              />
            </div>
            <div className="flex-1 min-w-[200px] max-w-[280px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Search Item</label>
              <TextField fullWidth size="small" placeholder="Search by item name..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search className="w-4 h-4 text-slate-400" /></InputAdornment>, sx: { borderRadius: '8px', bgcolor: 'white' } }}
              />
            </div>
            <button onClick={fetchReport} disabled={loading}
              className="flex items-center px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold transition-colors">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white print:hidden">
          <div className="flex">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap
                    ${isActive
                      ? 'border-purple-600 text-purple-700 bg-purple-50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {(tab.id === 'low-stock' || tab.id === 'low-stock-category') && summary?.lowStock > 0 && (
                    <span className="ml-1 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{summary.lowStock}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {reportData ? (
          <div className="flex-1 overflow-auto p-4">
            <div className="max-w-[1500px] mx-auto">
              {loading && (
                <div className="flex items-center justify-center py-8 text-slate-500 text-sm gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading stock data...
                </div>
              )}
              {!loading && (
                <>
                  {activeTab === 'all' && renderAllStock()}
                  {activeTab === 'store-wise' && renderStoreWise()}
                  {activeTab === 'low-stock' && renderLowStock()}
                  {activeTab === 'low-stock-category' && renderLowStockByCategory()}
                  {activeTab === 'low-stock-store' && renderLowStockStoreWise()}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-medium">Loading stock data...</p>
            </div>
          </div>
        )}
      </div>

      {/* Price Adjustment Modal */}
      <Dialog open={showAdjustmentModal} onClose={() => !adjustmentLoading && setShowAdjustmentModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#f5f3ff', borderBottom: '2px solid #e9d5ff' }}>
          Adjust Prices — {categories.find(c => c.cat_id === parseInt(selectedCategory))?.cat_name}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {adjustmentLoading ? (
            <Alert severity="info">Processing adjustment...</Alert>
          ) : (
            <>
              <TextField fullWidth label="Purchase % (e.g. 10 or -5)" type="number" inputProps={{ step: 0.1 }}
                value={purchasePercentage} onChange={(e) => setPurchasePercentage(e.target.value)} size="small" sx={{ mb: 2 }} />
              <TextField fullWidth label="Sale % (e.g. 15 or -8)" type="number" inputProps={{ step: 0.1 }}
                value={salePercentage} onChange={(e) => setSalePercentage(e.target.value)} size="small" sx={{ mb: 2 }} />
              <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
                New Purchase Rate = Base × (1 + purchase%/100) &nbsp;|&nbsp; New Sale Price = Purchase × (1 + sale%/100)
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
          <Button onClick={() => { setShowAdjustmentModal(false); setPurchasePercentage(''); setSalePercentage(''); }} disabled={adjustmentLoading} variant="outlined">Cancel</Button>
          <Button onClick={applyPriceAdjustment} disabled={adjustmentLoading || (purchasePercentage === '' && salePercentage === '')} variant="contained" sx={{ bgcolor: '#f97316', '&:hover': { bgcolor: '#ea580c' } }}>
            {adjustmentLoading ? 'Updating...' : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          .no-print { display: none !important; }
          body { font-size: 10px !important; background: white !important; margin: 0 !important; padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; font-size: 9px !important; }
          th, td { padding: 4px 6px !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
          th { position: static !important; }
          tr { page-break-inside: avoid !important; }
          thead { display: table-header-group !important; }
          tfoot { display: table-footer-group !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
