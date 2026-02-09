'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Printer, Search, Package, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/dashboard-layout';
import { Autocomplete, TextField, InputAdornment } from '@mui/material';

export default function StockReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('');
  const [minStockValue, setMinStockValue] = useState('');
  const [maxStockValue, setMaxStockValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { fetchCategories(); fetchStores(); fetchReport(); }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (response.ok) setCategories(data);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      const result = await response.json();
      if (response.ok && result.success && Array.isArray(result.data)) {
        setStores(result.data);
      } else {
        console.error('Stores API did not return valid data:', result);
        setStores([]);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setStores([]);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports?type=stock-report`);
      const data = await response.json();
      if (response.ok) setReportData(data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handlePrint = () => window.print();

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return num.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatNumber = (num) => {
    return (num || 0).toLocaleString('en-PK');
  };

  const handleExport = () => {
    if (!reportData) return;
    let csv = 'STOCK VALUATION REPORT\n';
    csv += `As on: ${new Date().toLocaleDateString('en-GB')}\n\n`;
    csv += 'S.No,Category,Item Name,Unit,Quantity,Cost Rate,Sale Rate,Stock Value\n';
    let sno = 1;
    const filteredCategories = selectedCategory
      ? reportData.stockByCategory.filter(cat => cat.categoryId === parseInt(selectedCategory))
      : reportData.stockByCategory;
    filteredCategories.forEach(category => {
      category.products.forEach(product => {
        const stockValue = product.pro_stock_qnty * parseFloat(product.pro_cost_price || 0);
        csv += `${sno++},${category.categoryName},${product.pro_title},${product.pro_unit},${product.pro_stock_qnty},${formatCurrency(product.pro_cost_price)},${formatCurrency(product.pro_sale_price)},${formatCurrency(stockValue)}\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-valuation-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getFilteredData = () => {
    if (!reportData) return null;

    let filteredProducts = reportData.products;
    let filteredCategories = reportData.stockByCategory;

    // Filter by category
    if (selectedCategory) {
      filteredProducts = filteredProducts.filter(p => p.cat_id === parseInt(selectedCategory));
      filteredCategories = filteredCategories.filter(cat => cat.categoryId === parseInt(selectedCategory));
    }

    // Filter by store
    if (selectedStore) {
      filteredProducts = filteredProducts.filter(p =>
        p.store_stocks?.some(ss => ss.store_id === parseInt(selectedStore))
      );
    }

    // Helper function to get stock quantity for selected store or all stores
    const getStockQuantity = (product) => {
      if (selectedStore) {
        // Get stock only from selected store
        const storeStock = product.store_stocks?.find(ss => ss.store_id === parseInt(selectedStore));
        return storeStock?.stock_quantity || 0;
      } else {
        // Get total stock from all stores
        return product.store_stocks?.reduce((sum, ss) => sum + (ss.stock_quantity || 0), 0) || 0;
      }
    };

    // Filter by stock status
    if (selectedStockStatus) {
      filteredProducts = filteredProducts.filter(p => {
        const totalStock = getStockQuantity(p);
        switch (selectedStockStatus) {
          case 'IN_STOCK': return totalStock > 0;
          case 'OUT_OF_STOCK': return totalStock === 0;
          case 'LOW_STOCK': return totalStock > 0 && totalStock < 10;
          case 'NEGATIVE': return totalStock < 0;
          default: return true;
        }
      });
    }

    // Filter by value range
    if (minStockValue || maxStockValue) {
      filteredProducts = filteredProducts.filter(p => {
        const totalStock = getStockQuantity(p);
        const stockValue = totalStock * parseFloat(p.pro_cost_price || 0);
        const min = parseFloat(minStockValue) || 0;
        const max = parseFloat(maxStockValue) || Infinity;
        return stockValue >= min && stockValue <= max;
      });
    }

    // Filter by item name search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.pro_title?.toLowerCase().includes(query)
      );
    }

    // Recalculate category totals
    const recalculatedCategories = filteredCategories.map(category => {
      const categoryProducts = filteredProducts.filter(p => p.cat_id === category.categoryId);
      return {
        ...category,
        products: categoryProducts,
        totalProducts: categoryProducts.length,
        totalStock: categoryProducts.reduce((sum, p) => {
          return sum + getStockQuantity(p);
        }, 0),
        totalValue: categoryProducts.reduce((sum, p) => {
          const stockQty = getStockQuantity(p);
          return sum + (stockQty * parseFloat(p.pro_cost_price || 0));
        }, 0)
      };
    }).filter(cat => cat.products.length > 0);

    const summary = {
      totalProducts: filteredProducts.length,
      totalCategories: recalculatedCategories.length,
      totalStock: filteredProducts.reduce((sum, p) => {
        return sum + getStockQuantity(p);
      }, 0),
      totalStockValue: filteredProducts.reduce((sum, p) => {
        const stockQty = getStockQuantity(p);
        return sum + (stockQty * parseFloat(p.pro_cost_price || 0));
      }, 0),
      lowStockItems: filteredProducts.filter(p => {
        const totalStock = getStockQuantity(p);
        return totalStock > 0 && totalStock < 10;
      }).length,
      outOfStockItems: filteredProducts.filter(p => {
        const totalStock = getStockQuantity(p);
        return totalStock === 0;
      }).length
    };

    return {
      ...reportData,
      products: filteredProducts,
      stockByCategory: recalculatedCategories,
      summary
    };
  };

  const filteredData = getFilteredData();

  // Helper function to get stock quantity for display (same logic as getFilteredData)
  const getDisplayStockQuantity = (product) => {
    if (selectedStore) {
      // Get stock only from selected store
      const storeStock = product.store_stocks?.find(ss => ss.store_id === parseInt(selectedStore));
      return storeStock?.stock_quantity || 0;
    } else {
      // Get total stock from all stores
      return product.store_stocks?.reduce((sum, ss) => sum + (ss.stock_quantity || 0), 0) || 0;
    }
  };

  // Helper function to get store breakdown text
  const getStoreBreakdownText = (product) => {
    if (selectedStore) {
      // Show only selected store
      const storeStock = product.store_stocks?.find(ss => ss.store_id === parseInt(selectedStore));
      const storeName = storeStock?.store?.store_name || `Store ${selectedStore}`;
      return `${storeName}: ${storeStock?.stock_quantity || 0}`;
    } else {
      // Show all stores
      return product.store_stocks?.map(ss =>
        `${ss.store?.store_name || `Store ${ss.store_id}`}: ${ss.stock_quantity}`
      ).join(', ') || 'No stores';
    }
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-white print:bg-white overflow-hidden">
        {/* Screen Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-700 to-purple-900 text-white px-6 py-4 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/dashboard/reports')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">Stock Valuation Report</h1>
                  <p className="text-purple-200 text-sm">Current inventory levels & valuation</p>
                </div>
              </div>
            </div>
            {filteredData && (
              <div className="flex items-center space-x-2">
                <button onClick={handleExport} className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors">
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </button>
                <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
                  <Printer className="w-4 h-4 mr-2" /> Print
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200 px-6 py-3 print:hidden">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px] max-w-[250px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1 caps">CATEGORY</label>
              <Autocomplete
                size="small"
                options={categories}
                getOptionLabel={(option) => option.cat_name || ''}
                value={categories.find(c => c.cat_id === parseInt(selectedCategory)) || null}
                onChange={(e, val) => setSelectedCategory(val ? val.cat_id.toString() : '')}
                autoSelect={true}
                autoHighlight={true}
                openOnFocus={true}
                selectOnFocus={true}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="All Categories"
                    onFocus={(e) => e.target.select()}
                    sx={{
                      '& .MuiOutlinedInput-root': { py: '2px', borderRadius: '8px', bgcolor: 'white' }
                    }}
                  />
                )}
              />
            </div>
            <div className="flex-1 min-w-[200px] max-w-[250px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1 caps">STORE</label>
              <Autocomplete
                size="small"
                options={stores}
                getOptionLabel={(option) => option.store_name || ''}
                value={stores.find(s => s.storeid === parseInt(selectedStore)) || null}
                onChange={(e, val) => setSelectedStore(val ? val.storeid.toString() : '')}
                autoSelect={true}
                autoHighlight={true}
                openOnFocus={true}
                selectOnFocus={true}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="All Stores"
                    onFocus={(e) => e.target.select()}
                    sx={{
                      '& .MuiOutlinedInput-root': { py: '2px', borderRadius: '8px', bgcolor: 'white' }
                    }}
                  />
                )}
              />
            </div>
            <div className="flex-1 min-w-[140px] max-w-[180px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">STOCK STATUS</label>
              <select value={selectedStockStatus} onChange={(e) => setSelectedStockStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                <option value="">All Status</option>
                <option value="IN_STOCK">In Stock</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="LOW_STOCK">Low Stock (&lt;10)</option>
                <option value="NEGATIVE">Negative Stock</option>
              </select>
            </div>
            <div className="flex-1 min-w-[120px] max-w-[150px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1">MIN VALUE</label>
              <input type="number" value={minStockValue} onChange={(e) => setMinStockValue(e.target.value)} placeholder="0"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
            </div>
            <div className="flex-1 min-w-[200px] max-w-[300px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1 caps">SEARCH ITEM</label>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by item name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search className="w-4 h-4 text-slate-400" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '8px', bgcolor: 'white' }
                }}
              />
            </div>
            <button onClick={fetchReport} disabled={loading}
              className="flex items-center px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg text-sm font-semibold transition-colors">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Apply Filters'}
            </button>
          </div>
        </div>

        {/* Report Content */}
        {filteredData ? (
          <div className="flex-1 overflow-auto p-4 print:p-0 print:overflow-visible">
            <div className="max-w-[1400px] mx-auto">
              {/* Print Header */}
              <div className="hidden print:block border-b-2 border-black pb-4 mb-4">
                <div className="text-center">
                  <h1 className="text-2xl font-bold tracking-wider">ITTEFAQ IRON STORE</h1>
                  <p className="text-sm text-gray-600">Parianwali, Pakistan | Tel: +92 346 7560306</p>
                  <div className="mt-3 py-2 bg-black text-white">
                    <h2 className="text-lg font-bold tracking-widest">STOCK VALUATION REPORT</h2>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="font-semibold">As on:</span> {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Summary Cards - Screen */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4 print:hidden">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Items</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{formatNumber(filteredData.summary.totalProducts)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Categories</p>
                  <p className="text-2xl font-bold text-purple-800 mt-1">{filteredData.summary.totalCategories}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Qty</p>
                  <p className="text-2xl font-bold text-blue-800 mt-1">{formatNumber(filteredData.summary.totalStock)}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Stock Value</p>
                  <p className="text-xl font-bold text-emerald-800 mt-1">Rs. {formatCurrency(filteredData.summary.totalStockValue)}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Low Stock</p>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-amber-800 mt-1">{filteredData.summary.lowStockItems}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Out of Stock</p>
                    <XCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="text-2xl font-bold text-red-800 mt-1">{filteredData.summary.outOfStockItems}</p>
                </div>
              </div>

              {/* Print Summary */}
              <div className="hidden print:block mb-4 border border-black">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="p-2 font-semibold border-r border-black">Total Items:</td>
                      <td className="p-2 text-right border-r border-black">{formatNumber(filteredData.summary.totalProducts)}</td>
                      <td className="p-2 font-semibold border-r border-black">Categories:</td>
                      <td className="p-2 text-right border-r border-black">{filteredData.summary.totalCategories}</td>
                      <td className="p-2 font-semibold border-r border-black">Total Qty:</td>
                      <td className="p-2 text-right">{formatNumber(filteredData.summary.totalStock)}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-semibold border-r border-black">Stock Value:</td>
                      <td className="p-2 text-right border-r border-black font-bold">{formatCurrency(filteredData.summary.totalStockValue)}</td>
                      <td className="p-2 font-semibold border-r border-black">Low Stock:</td>
                      <td className="p-2 text-right border-r border-black">{filteredData.summary.lowStockItems}</td>
                      <td className="p-2 font-semibold border-r border-black">Out of Stock:</td>
                      <td className="p-2 text-right">{filteredData.summary.outOfStockItems}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Main Table */}
              <div className="bg-white border border-slate-300 rounded-lg overflow-hidden print:border-black print:rounded-none">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white print:bg-gray-200 print:text-black">
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black w-12">S.No</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Category</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black">Item Name</th>
                      <th className="px-3 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black w-16">Unit</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black w-28">Total Qty</th>
                      <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black w-32">Store Breakdown</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider border-r border-slate-600 print:border-black w-28">Cost Rate</th>
                      <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider w-32">Stock Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 print:divide-black">
                    {(() => {
                      let sno = 1;
                      return filteredData.stockByCategory.map(category => (
                        category.products.map((product) => {
                          // Use helper functions for consistent display
                          const totalStock = getDisplayStockQuantity(product);
                          const stockValue = totalStock * parseFloat(product.pro_cost_price || 0);
                          const isOutOfStock = totalStock === 0;
                          const isLowStock = totalStock > 0 && totalStock < 10;
                          const isNegative = totalStock < 0;

                          // Create store breakdown text
                          const storeBreakdown = getStoreBreakdownText(product);

                          return (
                            <tr key={product.pro_id} className={`${sno % 2 === 0 ? 'bg-slate-50' : 'bg-white'} ${isNegative ? 'bg-red-100' : isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-amber-50' : ''} hover:bg-purple-50 print:bg-white transition-colors`}>
                              <td className="px-3 py-2.5 text-slate-900 border-r border-slate-200 print:border-black">{sno++}</td>
                              <td className="px-3 py-2.5 text-slate-600 border-r border-slate-200 print:border-black">{category.categoryName}</td>
                              <td className="px-3 py-2.5 text-slate-900 font-medium border-r border-slate-200 print:border-black">{product.pro_title}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600 border-r border-slate-200 print:border-black">{product.pro_unit}</td>
                              <td className={`px-3 py-2.5 text-right font-semibold border-r border-slate-200 print:border-black tabular-nums ${isNegative ? 'text-red-700 font-bold' : isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-slate-900'} print:text-black`}>
                                {formatNumber(totalStock)}
                                {isNegative && <span className="ml-1 text-xs">(⚠️)</span>}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 text-xs border-r border-slate-200 print:border-black">
                                {storeBreakdown}
                              </td>
                              <td className="px-3 py-2.5 text-right text-slate-900 border-r border-slate-200 print:border-black tabular-nums">{formatCurrency(product.pro_cost_price)}</td>
                              <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${isNegative ? 'text-red-700' : 'text-slate-900'} print:text-black`}>{formatCurrency(stockValue)}</td>
                            </tr>
                          );
                        })
                      )).flat();
                    })()}
                    {filteredData.products.length === 0 && (
                      <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500">No products found in selected category</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-bold print:bg-gray-200 print:text-black">
                      <td colSpan="4" className="px-3 py-3 text-right uppercase text-xs tracking-wider border-r border-slate-600 print:border-black">Grand Total</td>
                      <td className="px-3 py-3 text-right border-r border-slate-600 print:border-black tabular-nums">{formatNumber(filteredData.summary.totalStock)}</td>
                      <td className="px-3 py-3 border-r border-slate-600 print:border-black"></td>
                      <td className="px-3 py-3 border-r border-slate-600 print:border-black"></td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatCurrency(filteredData.summary.totalStockValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Print Footer */}
              <div className="hidden print:flex justify-between items-center mt-6 pt-4 border-t-2 border-black text-xs">
                <span>Generated: {new Date().toLocaleString('en-GB')}</span>
                <span className="font-semibold">Ittefaq Management System</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center print:hidden">
            <div className="text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Loading Stock Data...</h3>
              <p className="text-slate-500 mt-1">Please wait while we fetch inventory information</p>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </DashboardLayout>
  );
}
