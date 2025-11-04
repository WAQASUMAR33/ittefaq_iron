'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../components/dashboard-layout';

// Material-UI imports
import { 
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Stack,
  Divider
} from '@mui/material';

import {
  Store as StoreIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  TransferWithinAStation as TransferIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

export default function StoreStockPage() {
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [storeStock, setStoreStock] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [transferDialog, setTransferDialog] = useState(false);
  const [transferData, setTransferData] = useState({
    fromStore: '',
    toStore: '',
    product: '',
    quantity: 0
  });

  // Load initial data
  useEffect(() => {
    loadStores();
  }, []);

  // Load store stock when store is selected
  useEffect(() => {
    if (selectedStore) {
      loadStoreStock(selectedStore);
      loadLowStockProducts(selectedStore);
    }
  }, [selectedStore]);

  const loadStores = async () => {
    try {
      const response = await fetch('/api/stores');
      if (response.ok) {
        const data = await response.json();
        setStores(data.data || data);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      showSnackbar('Error loading stores', 'error');
    }
  };

  const loadStoreStock = async (storeId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/store-stock?store_id=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        setStoreStock(data);
      } else {
        showSnackbar('Error loading store stock', 'error');
      }
    } catch (error) {
      console.error('Error loading store stock:', error);
      showSnackbar('Error loading store stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadLowStockProducts = async (storeId) => {
    try {
      const response = await fetch(`/api/store-stock?store_id=${storeId}&low_stock=true`);
      if (response.ok) {
        const data = await response.json();
        setLowStockProducts(data);
      }
    } catch (error) {
      console.error('Error loading low stock products:', error);
    }
  };

  const handleTransferStock = async () => {
    if (!transferData.fromStore || !transferData.toStore || !transferData.product || !transferData.quantity) {
      showSnackbar('Please fill all fields', 'error');
      return;
    }

    try {
      const response = await fetch('/api/store-stock', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_store_id: transferData.fromStore,
          to_store_id: transferData.toStore,
          product_id: transferData.product,
          quantity: transferData.quantity,
          updated_by: 1 // Should be from auth context
        }),
      });

      if (response.ok) {
        showSnackbar('Stock transferred successfully', 'success');
        setTransferDialog(false);
        setTransferData({ fromStore: '', toStore: '', product: '', quantity: 0 });
        // Refresh stock data
        if (selectedStore) {
          loadStoreStock(selectedStore);
        }
      } else {
        const error = await response.json();
        showSnackbar(error.error || 'Error transferring stock', 'error');
      }
    } catch (error) {
      console.error('Error transferring stock:', error);
      showSnackbar('Error transferring stock', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStockStatus = (current, min) => {
    if (current <= 0) return { label: 'Out of Stock', color: 'error' };
    if (current <= min) return { label: 'Low Stock', color: 'warning' };
    return { label: 'In Stock', color: 'success' };
  };

  return (
    <DashboardLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InventoryIcon color="primary" />
            Store Stock Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage inventory across multiple stores
          </Typography>
        </Box>

        {/* Store Selection */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Select Store</InputLabel>
                  <Select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    label="Select Store"
                  >
                    {stores.map((store) => (
                      <MenuItem key={store.storeid} value={store.storeid}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <StoreIcon />
                          {store.store_name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="outlined"
                  startIcon={<TransferIcon />}
                  onClick={() => setTransferDialog(true)}
                  disabled={!selectedStore}
                >
                  Transfer Stock
                </Button>
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => selectedStore && loadStoreStock(selectedStore)}
                  disabled={!selectedStore || loading}
                >
                  Refresh
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              <WarningIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Low Stock Alert
            </Typography>
            <Typography variant="body2">
              {lowStockProducts.length} product(s) are running low on stock in this store.
            </Typography>
          </Alert>
        )}

        {/* Store Stock Table */}
        {selectedStore && (
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Stock for {stores.find(s => s.storeid === parseInt(selectedStore))?.store_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {storeStock.length} products
                </Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Current Stock</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Min Stock</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Max Stock</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Unit</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {storeStock.map((item) => {
                        const status = getStockStatus(item.stock_quantity, item.min_stock);
                        return (
                          <TableRow key={item.store_stock_id}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {item.product.pro_title}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {item.stock_quantity}
                              </Typography>
                            </TableCell>
                            <TableCell>{item.min_stock}</TableCell>
                            <TableCell>{item.max_stock}</TableCell>
                            <TableCell>
                              <Chip
                                label={status.label}
                                color={status.color}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{item.product.pro_unit}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transfer Stock Dialog */}
        <Dialog open={transferDialog} onClose={() => setTransferDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Transfer Stock Between Stores</DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>From Store</InputLabel>
                <Select
                  value={transferData.fromStore}
                  onChange={(e) => setTransferData({ ...transferData, fromStore: e.target.value })}
                  label="From Store"
                >
                  {stores.map((store) => (
                    <MenuItem key={store.storeid} value={store.storeid}>
                      {store.store_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>To Store</InputLabel>
                <Select
                  value={transferData.toStore}
                  onChange={(e) => setTransferData({ ...transferData, toStore: e.target.value })}
                  label="To Store"
                >
                  {stores.filter(store => store.storeid !== parseInt(transferData.fromStore)).map((store) => (
                    <MenuItem key={store.storeid} value={store.storeid}>
                      {store.store_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Product ID"
                value={transferData.product}
                onChange={(e) => setTransferData({ ...transferData, product: e.target.value })}
                type="number"
              />

              <TextField
                fullWidth
                label="Quantity"
                value={transferData.quantity}
                onChange={(e) => setTransferData({ ...transferData, quantity: parseInt(e.target.value) || 0 })}
                type="number"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTransferDialog(false)}>Cancel</Button>
            <Button onClick={handleTransferStock} variant="contained">
              Transfer
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </DashboardLayout>
  );
}



