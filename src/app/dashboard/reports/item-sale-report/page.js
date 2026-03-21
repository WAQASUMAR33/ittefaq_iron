'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Download, Printer, Search, Package, ChevronUp, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard-layout';

export default function ItemSaleReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState([]);
  const [summary, setSummary] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  // Grouping
  const [groupBy, setGroupBy] = useState('none'); // 'none' | 'product' | 'customer' | 'category'

  // Sorting
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const from2000 = new Date(2000, 0, 1).toISOString().split('T')[0];
    setStartDate(from2000);
    setEndDate(today);
  }, []);

  useEffect(() => {
    if (startDate && endDate) fetchReport();
  }, [startDate, endDate]);

  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCategories(d); })
      .catch(() => {});
  }, []);

  const fetchReport = async () => {
    if (!startDate || !endDate) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/reports?type=item-sale-report&startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (res.ok) {
        setDetails(data.details || []);
        setSummary(data.summary || null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (n) => (parseFloat(n) || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtQty = (n) => (parseFloat(n) || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  const fmtDate = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return '-'; }
  };

  // Client-side filtering
  const filtered = useMemo(() => {
    let rows = details;
    if (searchProduct) rows = rows.filter(d => d.product?.pro_title?.toLowerCase().includes(searchProduct.toLowerCase()));
    if (searchCustomer) rows = rows.filter(d => d.sale?.customer?.cus_name?.toLowerCase().includes(searchCustomer.toLowerCase()));
    if (selectedCategory) rows = rows.filter(d => String(d.product?.cat_id) === String(selectedCategory));
    return rows;
  }, [details, searchProduct, searchCustomer, selectedCategory]);

  // Sorting
  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    copy.sort((a, b) => {
      switch (sortBy) {
        case 'date': return dir * (new Date(a.sale?.created_at) - new Date(b.sale?.created_at));
        case 'invoice': return dir * ((a.sale?.sale_id || 0) - (b.sale?.sale_id || 0));
        case 'product': return dir * ((a.product?.pro_title || '').localeCompare(b.product?.pro_title || ''));
        case 'customer': return dir * ((a.sale?.customer?.cus_name || '').localeCompare(b.sale?.customer?.cus_name || ''));
        case 'category': return dir * ((a.product?.category?.cat_name || '').localeCompare(b.product?.category?.cat_name || ''));
        case 'qty': return dir * (parseFloat(a.qnty || 0) - parseFloat(b.qnty || 0));
        case 'rate': return dir * (parseFloat(a.unit_rate || 0) - parseFloat(b.unit_rate || 0));
        case 'amount': return dir * (parseFloat(a.total_amount || 0) - parseFloat(b.total_amount || 0));
        case 'discount': return dir * (parseFloat(a.discount || 0) - parseFloat(b.discount || 0));
        case 'net': return dir * (parseFloat(a.net_total || 0) - parseFloat(b.net_total || 0));
        default: return 0;
      }
    });
    return copy;
  }, [filtered, sortBy, sortDir]);

  // Grouped view
  const grouped = useMemo(() => {
    if (groupBy === 'none') return null;
    const map = {};
    sorted.forEach(d => {
      let key, label;
      if (groupBy === 'product') { key = d.product?.pro_id || 'unknown'; label = d.product?.pro_title || 'Unknown Product'; }
      else if (groupBy === 'customer') { key = d.sale?.customer?.cus_id || 'unknown'; label = d.sale?.customer?.cus_name || 'Unknown Customer'; }
      else if (groupBy === 'category') { key = d.product?.cat_id || 'unknown'; label = d.product?.category?.cat_name || 'Uncategorized'; }
      if (!map[key]) map[key] = { label, rows: [], totalQty: 0, totalAmount: 0, totalDiscount: 0, netTotal: 0 };
      map[key].rows.push(d);
      map[key].totalQty += parseFloat(d.qnty || 0);
      map[key].totalAmount += parseFloat(d.total_amount || 0);
      map[key].totalDiscount += parseFloat(d.discount || 0);
      map[key].netTotal += parseFloat(d.net_total || 0);
    });
    return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
  }, [sorted, groupBy]);

  // Live summary for filtered data
  const filteredSummary = useMemo(() => ({
    totalItems: filtered.length,
    totalQty: filtered.reduce((s, d) => s + parseFloat(d.qnty || 0), 0),
    totalAmount: filtered.reduce((s, d) => s + parseFloat(d.total_amount || 0), 0),
    totalDiscount: filtered.reduce((s, d) => s + parseFloat(d.discount || 0), 0),
    netTotal: filtered.reduce((s, d) => s + parseFloat(d.net_total || 0), 0),
  }), [filtered]);

  const exportCSV = () => {
    const headers = ['S.No', 'Date', 'Invoice No', 'Customer', 'Product', 'Category', 'Sub Category', 'Qty', 'Unit', 'Unit Rate', 'Total Amount', 'Discount', 'Net Total'];
    const rows = sorted.map((d, i) => [
      i + 1,
      fmtDate(d.sale?.created_at),
      d.sale?.sale_id || '',
      d.sale?.customer?.cus_name || '',
      d.product?.pro_title || '',
      d.product?.category?.cat_name || '',
      d.product?.sub_category?.sub_cat_name || '',
      fmtQty(d.qnty),
      d.unit || '',
      fmt(d.unit_rate),
      fmt(d.total_amount),
      fmt(d.discount),
      fmt(d.net_total),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `item-sale-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span style={{ opacity: 0.3, fontSize: 10 }}>↕</span>;
    return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  };

  const Th = ({ col, children, right }) => (
    <th
      onClick={() => toggleSort(col)}
      style={{
        padding: '10px 12px', textAlign: right ? 'right' : 'left',
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
        background: '#1e293b', color: '#94a3b8', fontWeight: 600, fontSize: 12,
        borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 1,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children} <SortIcon col={col} />
      </span>
    </th>
  );

  const DetailRow = ({ d, idx }) => (
    <tr style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
      <td style={{ padding: '8px 12px', color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
      <td style={{ padding: '8px 12px', fontSize: 13, whiteSpace: 'nowrap' }}>{fmtDate(d.sale?.created_at)}</td>
      <td style={{ padding: '8px 12px', fontSize: 13 }}>
        <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 4, padding: '2px 7px', fontWeight: 700, fontSize: 12 }}>
          #{d.sale?.sale_id}
        </span>
      </td>
      <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>{d.sale?.customer?.cus_name || '-'}</td>
      <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{d.product?.pro_title || '-'}</td>
      <td style={{ padding: '8px 12px', fontSize: 12, color: '#64748b' }}>{d.product?.category?.cat_name || '-'}</td>
      <td style={{ padding: '8px 12px', fontSize: 12, color: '#64748b' }}>{d.product?.sub_category?.sub_cat_name || '-'}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
        {fmtQty(d.qnty)} <span style={{ color: '#94a3b8', fontSize: 11 }}>{d.unit || ''}</span>
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 13, color: '#475569' }}>{fmt(d.unit_rate)}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 13 }}>{fmt(d.total_amount)}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 13, color: '#dc2626' }}>
        {parseFloat(d.discount || 0) > 0 ? fmt(d.discount) : '-'}
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{fmt(d.net_total)}</td>
    </tr>
  );

  return (
    <DashboardLayout>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          .no-print { display: none !important; }
          body { font-size: 10px !important; background: white !important; margin: 0 !important; padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* Remove outer padding/background */
          div[style*="background: #f1f5f9"],
          div[style*="background:#f1f5f9"] { background: white !important; padding: 0 !important; }

          /* Summary cards — compact row */
          .print-summary { display: flex !important; flex-direction: row !important; gap: 8px !important; margin-bottom: 8px !important; }
          .print-summary > div { padding: 6px 10px !important; flex: 1 !important; }

          /* Table fills full width, no overflow */
          table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; font-size: 9px !important; }
          th, td { padding: 4px 5px !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
          tfoot td { white-space: normal !important; word-break: break-word !important; }

          /* Column widths — tune to fit A4 landscape (~270mm usable) */
          th:nth-child(1),  td:nth-child(1)  { width: 28px !important; }   /* # */
          th:nth-child(2),  td:nth-child(2)  { width: 60px !important; }   /* Date */
          th:nth-child(3),  td:nth-child(3)  { width: 46px !important; }   /* Invoice */
          th:nth-child(4),  td:nth-child(4)  { width: 80px !important; }   /* Customer */
          th:nth-child(5),  td:nth-child(5)  { width: 90px !important; }   /* Product */
          th:nth-child(6),  td:nth-child(6)  { width: 60px !important; }   /* Category */
          th:nth-child(7),  td:nth-child(7)  { width: 60px !important; }   /* Sub Category */
          th:nth-child(8),  td:nth-child(8)  { width: 48px !important; }   /* Qty */
          th:nth-child(9),  td:nth-child(9)  { width: 54px !important; }   /* Unit Rate */
          th:nth-child(10), td:nth-child(10) { width: 72px !important; }   /* Amount */
          th:nth-child(11), td:nth-child(11) { width: 60px !important; }   /* Discount */
          th:nth-child(12), td:nth-child(12) { width: 72px !important; }   /* Net Total */

          /* Sticky header — remove position sticky for print */
          th { position: static !important; }

          /* Page breaks */
          tr { page-break-inside: avoid !important; }
          thead { display: table-header-group !important; }
          tfoot { display: table-footer-group !important; }

          /* Outer container */
          div[style*="minHeight"] { min-height: unset !important; }

          /* Print title */
          .print-title { display: block !important; text-align: center; font-size: 14px; font-weight: 800; margin-bottom: 4px; color: #0f172a; }
          .print-subtitle { display: block !important; text-align: center; font-size: 10px; color: #64748b; margin-bottom: 10px; }
        }

        /* Hidden on screen, shown only in print */
        .print-title, .print-subtitle { display: none; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>

        {/* Header */}
        <div className="no-print" style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%)',
          padding: '20px 24px', color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center' }}>
                <ArrowLeft size={18} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={20} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Item Sales Report</h1>
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>Product-wise sales line items detail</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <Download size={15} /> Export CSV
              </button>
              <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <Printer size={15} /> Print
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>

          {/* Filters */}
          <div className="no-print" style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>

              {/* Date Range */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>From Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#0f172a' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>To Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#0f172a' }} />
              </div>

              {/* Product Search */}
              <div style={{ flex: '1 1 160px', minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Product</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="text" value={searchProduct} onChange={e => setSearchProduct(e.target.value)} placeholder="Search product..."
                    style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px 8px 30px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Customer Search */}
              <div style={{ flex: '1 1 160px', minWidth: 160 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Customer</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="text" value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} placeholder="Search customer..."
                    style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px 8px 30px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Category */}
              <div style={{ flex: '1 1 150px', minWidth: 150 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Category</label>
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                  style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%', background: 'white', color: '#0f172a' }}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c.cat_id} value={c.cat_id}>{c.cat_name}</option>)}
                </select>
              </div>

              {/* Group By */}
              <div style={{ flex: '1 1 140px', minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>Group By</label>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
                  style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%', background: 'white', color: '#0f172a' }}>
                  <option value="none">No Grouping</option>
                  <option value="product">By Product</option>
                  <option value="category">By Category</option>
                  <option value="customer">By Customer</option>
                </select>
              </div>

              {/* Apply Button */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'transparent', marginBottom: 5 }}>_</label>
                <button onClick={fetchReport} disabled={loading}
                  style={{ background: '#1e40af', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Loading...' : 'Apply'}
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {filteredSummary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Total Line Items', value: filteredSummary.totalItems.toLocaleString(), color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
                { label: 'Total Quantity', value: fmtQty(filteredSummary.totalQty), color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                { label: 'Gross Amount', value: 'PKR ' + fmt(filteredSummary.totalAmount), color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
                { label: 'Total Discount', value: 'PKR ' + fmt(filteredSummary.totalDiscount), color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                { label: 'Net Total', value: 'PKR ' + fmt(filteredSummary.netTotal), color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
              ].map(card => (
                <div key={card.label} style={{ background: card.bg, border: `1.5px solid ${card.border}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{card.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Print-only title */}
          <div className="print-title">Item Sales Report</div>
          <div className="print-subtitle">{startDate} — {endDate}</div>

          {/* Table */}
          <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>

            {loading ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Loading report data...</div>
            ) : sorted.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>No records found for the selected filters.</div>
            ) : groupBy !== 'none' && grouped ? (
              /* Grouped View */
              <div>
                {grouped.map((group, gi) => (
                  <div key={gi} style={{ borderBottom: gi < grouped.length - 1 ? '2px solid #e2e8f0' : 'none' }}>
                    {/* Group Header */}
                    <div style={{ background: '#1e293b', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, color: 'white', fontSize: 14 }}>{group.label}</span>
                      <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
                        <span style={{ color: '#94a3b8' }}>Items: <b style={{ color: 'white' }}>{group.rows.length}</b></span>
                        <span style={{ color: '#94a3b8' }}>Qty: <b style={{ color: '#67e8f9' }}>{fmtQty(group.totalQty)}</b></span>
                        <span style={{ color: '#94a3b8' }}>Gross: <b style={{ color: '#fbbf24' }}>PKR {fmt(group.totalAmount)}</b></span>
                        <span style={{ color: '#94a3b8' }}>Discount: <b style={{ color: '#f87171' }}>PKR {fmt(group.totalDiscount)}</b></span>
                        <span style={{ color: '#94a3b8' }}>Net: <b style={{ color: '#4ade80' }}>PKR {fmt(group.netTotal)}</b></span>
                      </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr>
                            <Th col="sno">#</Th>
                            <Th col="date">Date</Th>
                            <Th col="invoice">Invoice</Th>
                            <Th col="customer">Customer</Th>
                            <Th col="product">Product</Th>
                            <Th col="category">Category</Th>
                            <Th col="subcategory">Sub Category</Th>
                            <Th col="qty" right>Qty</Th>
                            <Th col="rate" right>Unit Rate</Th>
                            <Th col="amount" right>Amount</Th>
                            <Th col="discount" right>Discount</Th>
                            <Th col="net" right>Net Total</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((d, idx) => <DetailRow key={d.sale_detail_id} d={d} idx={idx} />)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Flat View */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <Th col="sno">#</Th>
                      <Th col="date">Date</Th>
                      <Th col="invoice">Invoice</Th>
                      <Th col="customer">Customer</Th>
                      <Th col="product">Product</Th>
                      <Th col="category">Category</Th>
                      <Th col="subcategory">Sub Category</Th>
                      <Th col="qty" right>Qty</Th>
                      <Th col="rate" right>Unit Rate</Th>
                      <Th col="amount" right>Amount</Th>
                      <Th col="discount" right>Discount</Th>
                      <Th col="net" right>Net Total</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((d, idx) => <DetailRow key={d.sale_detail_id} d={d} idx={idx} />)}
                  </tbody>
                  {/* Footer totals */}
                  <tfoot>
                    <tr style={{ background: '#0f172a', fontWeight: 800 }}>
                      <td colSpan={7} style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 12 }}>TOTAL ({sorted.length} items)</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#67e8f9', fontSize: 13 }}>{fmtQty(filteredSummary?.totalQty)}</td>
                      <td style={{ padding: '10px 12px' }}></td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#fbbf24', fontSize: 13 }}>{fmt(filteredSummary?.totalAmount)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#f87171', fontSize: 13 }}>{fmt(filteredSummary?.totalDiscount)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4ade80', fontSize: 13 }}>{fmt(filteredSummary?.netTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
