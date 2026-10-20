import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, Truck, 
  AlertTriangle, DollarSign, Plus, Edit, Trash2, CheckCircle, 
  X, RefreshCw, Search, ArrowUpRight, Calendar, Clock, Phone,
  MapPin, UserCheck, AlertCircle, Check, FileText, RotateCcw
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const { user, isAdmin, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'orders' | 'deliveries' | 'inventory' | 'products' | 'rfqs' | 'customers'

  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delivery Management States
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryStats, setDeliveryStats] = useState(null);
  const [deliveryPersonnel, setDeliveryPersonnel] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [deliverySearch, setDeliverySearch] = useState('');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('');
  const [deliveryDateFrom, setDeliveryDateFrom] = useState('');
  const [deliveryDateTo, setDeliveryDateTo] = useState('');
  const [deliveryLoading, setDeliveryLoading] = useState(false);

  // Delivery Modals
  const [assignModal, setAssignModal] = useState({
    open: false,
    deliveryId: null,
    deliveryNumber: '',
    orderNumber: '',
    delivery_person_id: '',
    vehicle_id: '',
    expected_delivery_date: '',
    notes: '',
    preferredDeliveryDate: '',
    timeSlot: '',
    unloadingPreference: '',
    siteContactName: '',
    siteContactPhone: '',
    siteLandmark: '',
    siteAccessInstructions: ''
  });

  const [deliveryStatusModal, setDeliveryStatusModal] = useState({
    open: false,
    deliveryId: null,
    deliveryNumber: '',
    orderNumber: '',
    currentStatus: '',
    status: 'dispatched',
    notes: '',
    reason: '',
    expected_delivery_date: ''
  });

  const [deliveryHistoryModal, setDeliveryHistoryModal] = useState({
    open: false,
    delivery: null,
    history: []
  });

  const [personnelModal, setPersonnelModal] = useState({
    open: false,
    full_name: '',
    email: '',
    password: '',
    phone: '',
    company_name: 'BuildMart Fleet Logistics'
  });

  const [vehicleModal, setVehicleModal] = useState({
    open: false,
    vehicle_number: '',
    vehicle_type: 'tipper_truck',
    capacity_tonnes: 5.5,
    driver_name: '',
    driver_phone: ''
  });

  // Status update modal state
  const [statusModal, setStatusModal] = useState({ open: false, orderId: null, status: 'confirmed', notes: '' });

  // Inventory adjustment modal state
  const [adjustModal, setAdjustModal] = useState({ open: false, productId: null, productName: '', changeQty: 10, reason: '' });

  // Product Add / Edit modal state
  const [productModal, setProductModal] = useState({
    open: false,
    isEdit: false,
    id: null,
    category_id: 1,
    name: '',
    sku: '',
    brand: '',
    description: '',
    unit_of_measure: 'bag (50kg)',
    unit_price: 400,
    discount_percent: 0,
    stock_quantity: 100,
    low_stock_threshold: 20,
    min_order_quantity: 5,
    volume_discount_threshold: 50,
    volume_discount_percent: 8,
    is_heavy_bulk: 1,
    image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800'
  });

  // RFQ quote modal state
  const [rfqModal, setRfqModal] = useState({ open: false, rfqId: null, status: 'quoted', quotedPrice: '', adminNotes: '' });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/admin');
      return;
    }
    if (!isAdmin) {
      toast.error(`Access Denied: Logged in as ${user?.email} (${user?.role || 'customer'}). Please log in with an Administrator account.`);
      navigate('/login?redirect=/admin');
      return;
    }

    loadAllAdminData();
  }, [isAuthenticated, isAdmin, navigate]);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, invRes, prodRes, catRes, rfqRes, custRes, delRes, delStatsRes, delPersRes, delVehRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/orders?limit=25'),
        api.get('/inventory'),
        api.get('/products?limit=50'),
        api.get('/categories'),
        api.get('/admin/bulk-inquiries'),
        api.get('/admin/customers'),
        api.get('/deliveries?limit=50'),
        api.get('/deliveries/dashboard/stats'),
        api.get('/deliveries/personnel'),
        api.get('/deliveries/vehicles')
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (ordersRes.data.success) setOrders(ordersRes.data.data.orders);
      if (invRes.data.success) setInventory(invRes.data.data);
      if (prodRes.data.success) setProducts(prodRes.data.data.products);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (rfqRes.data.success) setRfqs(rfqRes.data.data);
      if (custRes.data.success) setCustomers(custRes.data.data);
      if (delRes.data.success) setDeliveries(delRes.data.data.deliveries);
      if (delStatsRes.data.success) setDeliveryStats(delStatsRes.data.data);
      if (delPersRes.data.success) setDeliveryPersonnel(delPersRes.data.data);
      if (delVehRes.data.success) setVehicles(delVehRes.data.data);
    } catch (err) {
      toast.error('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async () => {
    setDeliveryLoading(true);
    try {
      const params = new URLSearchParams();
      if (deliverySearch.trim()) params.append('search', deliverySearch.trim());
      if (deliveryStatusFilter) params.append('status', deliveryStatusFilter);
      if (deliveryDateFrom) params.append('startDate', deliveryDateFrom);
      if (deliveryDateTo) params.append('endDate', deliveryDateTo);
      params.append('limit', '50');

      const [res, statsRes] = await Promise.all([
        api.get(`/deliveries?${params.toString()}`),
        api.get('/deliveries/dashboard/stats')
      ]);

      if (res.data.success) setDeliveries(res.data.data.deliveries);
      if (statsRes.data.success) setDeliveryStats(statsRes.data.data);
    } catch (err) {
      toast.error('Failed to refresh delivery data.');
    } finally {
      setDeliveryLoading(false);
    }
  };

  // Delivery Operation: Assign Delivery Person & Vehicle
  const handleAssignDelivery = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/deliveries/assign', {
        delivery_id: assignModal.deliveryId,
        delivery_person_id: assignModal.delivery_person_id ? Number(assignModal.delivery_person_id) : null,
        vehicle_id: assignModal.vehicle_id ? Number(assignModal.vehicle_id) : null,
        expected_delivery_date: assignModal.expected_delivery_date || null,
        notes: assignModal.notes
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setAssignModal({ open: false, deliveryId: null, deliveryNumber: '', orderNumber: '', delivery_person_id: '', vehicle_id: '', expected_delivery_date: '', notes: '' });
        loadDeliveries();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Assignment failed.');
    }
  };

  // Delivery Operation: Update Delivery Status (dispatched, delivered, failed, rescheduled)
  const handleUpdateDeliveryStatus = async (e) => {
    e.preventDefault();
    if (deliveryStatusModal.status === 'failed' && !deliveryStatusModal.reason.trim()) {
      toast.error('Failure reason is mandatory for failed deliveries.');
      return;
    }
    if (deliveryStatusModal.status === 'rescheduled' && !deliveryStatusModal.expected_delivery_date) {
      toast.error('Rescheduled delivery date is required.');
      return;
    }
    try {
      const res = await api.put(`/deliveries/${deliveryStatusModal.deliveryId}/status`, {
        status: deliveryStatusModal.status,
        notes: deliveryStatusModal.notes,
        reason: deliveryStatusModal.reason,
        expected_delivery_date: deliveryStatusModal.expected_delivery_date
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setDeliveryStatusModal({ open: false, deliveryId: null, deliveryNumber: '', orderNumber: '', currentStatus: '', status: 'dispatched', notes: '', reason: '', expected_delivery_date: '' });
        loadDeliveries();
        // Also refresh orders since order status syncs with delivery status
        const ordersRes = await api.get('/admin/orders?limit=25');
        if (ordersRes.data.success) setOrders(ordersRes.data.data.orders);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status transition failed.');
    }
  };

  // Delivery Operation: View Delivery Audit History Timeline
  const handleOpenDeliveryHistory = async (deliveryId) => {
    try {
      const res = await api.get(`/deliveries/${deliveryId}`);
      if (res.data.success) {
        setDeliveryHistoryModal({
          open: true,
          delivery: res.data.data,
          history: res.data.data.history || []
        });
      }
    } catch (err) {
      toast.error('Unable to fetch delivery timeline.');
    }
  };

  // Delivery Operation: Create Delivery Personnel Account
  const handleCreatePersonnel = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/deliveries/personnel', personnelModal);
      if (res.data.success) {
        toast.success(res.data.message);
        setPersonnelModal({ open: false, full_name: '', email: '', password: '', phone: '', company_name: 'BuildMart Fleet Logistics' });
        const persRes = await api.get('/deliveries/personnel');
        if (persRes.data.success) setDeliveryPersonnel(persRes.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create delivery personnel.');
    }
  };

  // Delivery Operation: Register Vehicle
  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/deliveries/vehicles', vehicleModal);
      if (res.data.success) {
        toast.success(res.data.message);
        setVehicleModal({ open: false, vehicle_number: '', vehicle_type: 'tipper_truck', capacity_tonnes: 5.5, driver_name: '', driver_phone: '' });
        const vehRes = await api.get('/deliveries/vehicles');
        if (vehRes.data.success) setVehicles(vehRes.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register vehicle.');
    }
  };

  // 1. Order Status Update
  const handleUpdateOrderStatus = async () => {
    try {
      const res = await api.put(`/admin/orders/${statusModal.orderId}/status`, {
        status: statusModal.status,
        notes: statusModal.notes
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setStatusModal({ open: false, orderId: null, status: 'confirmed', notes: '' });
        loadAllAdminData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order status.');
    }
  };

  // 2. Inventory Adjustment
  const handleAdjustInventory = async () => {
    if (!adjustModal.reason.trim()) {
      toast.error('Audit reason is required for inventory movements.');
      return;
    }
    try {
      const res = await api.post('/inventory/adjust', {
        product_id: adjustModal.productId,
        change_quantity: adjustModal.changeQty,
        reason: adjustModal.reason
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setAdjustModal({ open: false, productId: null, productName: '', changeQty: 10, reason: '' });
        loadAllAdminData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Inventory adjustment failed.');
    }
  };

  // 3. Product Save (Create or Update)
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...productModal,
        images: [productModal.image_url]
      };

      if (productModal.isEdit) {
        const res = await api.put(`/admin/products/${productModal.id}`, payload);
        if (res.data.success) toast.success('Product updated.');
      } else {
        const res = await api.post('/admin/products', payload);
        if (res.data.success) toast.success('Product created.');
      }
      setProductModal({ ...productModal, open: false });
      loadAllAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product.');
    }
  };

  // 4. Product Delete
  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate/delete "${name}"?`)) return;
    try {
      const res = await api.delete(`/admin/products/${id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        loadAllAdminData();
      }
    } catch (err) {
      toast.error('Failed to delete product.');
    }
  };

  // 5. RFQ Quote Update
  const handleUpdateRfq = async () => {
    try {
      const res = await api.put(`/admin/bulk-inquiries/${rfqModal.rfqId}`, {
        status: rfqModal.status,
        quoted_price_per_unit: rfqModal.quotedPrice,
        admin_notes: rfqModal.adminNotes
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setRfqModal({ open: false, rfqId: null, status: 'quoted', quotedPrice: '', adminNotes: '' });
        loadAllAdminData();
      }
    } catch (err) {
      toast.error('Failed to update RFQ.');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Loading BuildMart administrative operations...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span className="badge badge-amber">LOGISTICS COMMAND</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Live MySQL Database Connected</span>
          </div>
          <h1 style={{ fontSize: '1.85rem', marginTop: '0.25rem' }}>Administrator Management Console</h1>
        </div>

        <button onClick={loadAllAdminData} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          Refresh Stats
        </button>
      </div>

      {/* KPI Cards Row (From real database) */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Total Revenue (Paid)</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)', margin: '0.35rem 0' }}>
              ₹{stats.totalRevenue?.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>Real settled revenue</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Total Orders</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)', margin: '0.35rem 0' }}>
              {stats.totalOrders}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{stats.pendingOrders} pending dispatch</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Active Materials</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)', margin: '0.35rem 0' }}>
              {stats.totalProducts}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>In active warehouse hubs</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Customers / Builders</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)', margin: '0.35rem 0' }}>
              {stats.registeredCustomers}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Registered accounts</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Low-Stock Warnings</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: stats.lowStockCount > 0 ? 'var(--danger)' : 'var(--success)', margin: '0.35rem 0' }}>
              {stats.lowStockCount}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>Restock required</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontWeight: 600 }}>Bulk RFQ Requests</div>
            <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--amber-dark)', margin: '0.35rem 0' }}>
              {stats.pendingInquiries}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--amber-dark)', fontWeight: 600 }}>Awaiting pricing quote</div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', overflowX: 'auto', gap: '0.5rem' }}>
        {[
          { id: 'overview', label: 'Overview & Sales Trends' },
          { id: 'orders', label: `Orders (${orders.length})` },
          { id: 'deliveries', label: `Delivery Management (${deliveries.length})`, icon: Truck },
          { id: 'inventory', label: `Inventory & Stock (${inventory.length})` },
          { id: 'products', label: `Products (${products.length})` },
          { id: 'rfqs', label: `Bulk RFQs (${rfqs.length})` },
          { id: 'customers', label: `Customers (${customers.length})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? 'var(--amber-dark)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '3px solid var(--amber-primary)' : '3px solid transparent',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {tab.icon && <tab.icon size={16} color={activeTab === tab.id ? 'var(--amber-dark)' : 'currentColor'} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
          {/* Recent Orders List (Span 7) */}
          <div style={{ gridColumn: 'span 7' }}>
            <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Recent Construction Orders</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats?.recentOrders?.map((ord) => (
                  <div key={ord.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        #{ord.order_number} • {ord.customer_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(ord.created_at).toLocaleString()} • {ord.payment_method.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800 }}>₹{ord.total_amount?.toLocaleString()}</div>
                      <span className={`badge ${ord.order_status === 'delivered' ? 'badge-success' : ord.order_status === 'cancelled' ? 'badge-danger' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                        {ord.order_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Low Stock Alerts (Span 5) */}
          <div style={{ gridColumn: 'span 5' }}>
            <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} />
                Low Stock Warehouse Alerts
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats?.lowStockProducts?.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>All materials adequately stocked above threshold.</p>
                ) : (
                  stats?.lowStockProducts?.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          SKU: {item.sku} • Threshold: {item.low_stock_threshold}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setAdjustModal({
                            open: true,
                            productId: item.id,
                            productName: item.name,
                            changeQty: 50,
                            reason: 'Emergency restock delivery'
                          });
                        }}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.75rem' }}
                      >
                        Restock ({item.stock_quantity})
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ORDERS */}
      {activeTab === 'orders' && (
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Order Management &amp; Status Transitions</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Total Amount</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Date Placed</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 700 }}>#{o.order_number}</td>
                    <td>
                      <div>{o.customer_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{o.customer_email}</div>
                    </td>
                    <td style={{ fontWeight: 800 }}>₹{o.total_amount?.toLocaleString()}</td>
                    <td>
                      <span className="badge badge-dark" style={{ fontSize: '0.65rem' }}>
                        {o.payment_method} ({o.payment_status})
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${o.order_status === 'delivered' ? 'badge-success' : o.order_status === 'cancelled' ? 'badge-danger' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                        {o.order_status}
                      </span>
                    </td>
                    <td>{new Date(o.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => setStatusModal({ open: true, orderId: o.id, status: o.order_status, notes: '' })}
                        className="btn btn-outline btn-sm"
                      >
                        Update Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: DELIVERY MANAGEMENT */}
      {activeTab === 'deliveries' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* 1. Real Logistics KPI Statistics Cards */}
          {deliveryStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Pending Assignment
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)', margin: '0.35rem 0' }}>
                  {deliveryStats.pendingAssignment}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>Awaiting driver &amp; vehicle</div>
              </div>

              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid #3b82f6' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Assigned Deliveries
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)', margin: '0.35rem 0' }}>
                  {deliveryStats.assigned}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>Scheduled for pickup</div>
              </div>

              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Preparing Orders
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)', margin: '0.35rem 0' }}>
                  {deliveryStats.preparing}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#8b5cf6', fontWeight: 600 }}>Batching &amp; yard loading</div>
              </div>

              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid #0284c7' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Dispatched Orders
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--primary)', margin: '0.35rem 0' }}>
                  {deliveryStats.dispatched}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>En route in freight corridor</div>
              </div>

              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid #d97706' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Out For Delivery
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--amber-dark)', margin: '0.35rem 0' }}>
                  {deliveryStats.outForDelivery}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--amber-dark)', fontWeight: 600 }}>Last-mile site transit</div>
              </div>

              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid #10b981' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Delivered Orders
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--success)', margin: '0.35rem 0' }}>
                  {deliveryStats.delivered}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>Unloaded &amp; signed</div>
              </div>

              <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid #ef4444' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Failed Attempts
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: deliveryStats.failed > 0 ? 'var(--danger)' : 'var(--text-muted)', margin: '0.35rem 0' }}>
                  {deliveryStats.failed}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--danger)', fontWeight: 600 }}>Requires redelivery</div>
              </div>
            </div>
          )}

          {/* 2. Operations Controls & Table */}
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Truck size={22} color="var(--amber-primary)" />
                  Civil Materials Delivery Operations
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                  Manage site consignments, tipper assignments, delivery schedules, and recorded proof of delivery.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setPersonnelModal({ open: true, full_name: '', email: '', password: '', phone: '', company_name: 'BuildMart Fleet Logistics' })} 
                  className="btn btn-outline btn-sm"
                >
                  <Plus size={14} /> Add Delivery Partner
                </button>
                <button 
                  onClick={() => setVehicleModal({ open: true, vehicle_number: '', vehicle_type: 'tipper_truck', capacity_tonnes: 5.5, driver_name: '', driver_phone: '' })} 
                  className="btn btn-outline btn-sm"
                >
                  <Plus size={14} /> Register Fleet Vehicle
                </button>
                <button onClick={loadDeliveries} className="btn btn-dark btn-sm">
                  <RefreshCw size={14} /> Refresh Deliveries
                </button>
              </div>
            </div>

            {/* Filter controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Search Order / Customer / PIN
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Order #, DEL #, name, phone, PIN..."
                    value={deliverySearch}
                    onChange={(e) => setDeliverySearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadDeliveries()}
                    className="form-control"
                    style={{ fontSize: '0.85rem', paddingLeft: '2rem' }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Filter by Delivery Status
                </label>
                <select
                  value={deliveryStatusFilter}
                  onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="">All Statuses ({deliveries.length})</option>
                  <option value="pending_assignment">Pending Assignment</option>
                  <option value="assigned">Assigned</option>
                  <option value="preparing">Preparing (Loading)</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed Delivery</option>
                  <option value="rescheduled">Rescheduled</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Date From
                </label>
                <input
                  type="date"
                  value={deliveryDateFrom}
                  onChange={(e) => setDeliveryDateFrom(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Date To
                </label>
                <input
                  type="date"
                  value={deliveryDateTo}
                  onChange={(e) => setDeliveryDateTo(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                <button onClick={loadDeliveries} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  Apply Filters
                </button>
                <button 
                  onClick={() => {
                    setDeliverySearch('');
                    setDeliveryStatusFilter('');
                    setDeliveryDateFrom('');
                    setDeliveryDateTo('');
                    setTimeout(loadDeliveries, 50);
                  }} 
                  className="btn btn-outline btn-sm"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Deliveries Operations Table */}
            <div className="table-responsive">
              <table className="table" style={{ fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th>Order &amp; Delivery #</th>
                    <th>Customer &amp; Site Contact</th>
                    <th>Site Destination &amp; PIN</th>
                    <th>Ordered Materials</th>
                    <th>Booked Slot &amp; Unloading</th>
                    <th>Logistics Fees</th>
                    <th>Payment</th>
                    <th>Assigned Driver &amp; Fleet</th>
                    <th>Expected Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        {deliveryLoading ? 'Loading delivery logistics records...' : 'No delivery records match the current filter criteria.'}
                      </td>
                    </tr>
                  ) : (
                    deliveries.map((del) => (
                      <tr key={del.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--primary)' }}>
                            #{del.orderNumber}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {del.deliveryNumber}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {new Date(del.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700 }}>{del.customer.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Phone size={11} color="var(--amber-primary)" /> {del.customer.phone}
                          </div>
                          {del.siteContactName && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: '0.25rem', fontWeight: 600 }}>
                              👷 Site: {del.siteContactName} {del.siteContactPhone ? `(${del.siteContactPhone})` : ''}
                            </div>
                          )}
                        </td>

                        <td style={{ maxWidth: 220 }}>
                          <div style={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                            {del.shippingAddress.address_line1 || del.shippingAddress.city || 'Site Address'}
                          </div>
                          {del.siteLandmark && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--amber-dark)', fontWeight: 600, marginTop: '0.15rem' }}>
                              📍 Landmark: {del.siteLandmark}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                            <span className="badge badge-dark" style={{ fontSize: '0.65rem' }}>
                              PIN: {del.shippingAddress.postal_code || 'N/A'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {del.shippingAddress.city}
                            </span>
                          </div>
                          {del.siteAccessInstructions && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                              Note: {del.siteAccessInstructions.slice(0, 45)}{del.siteAccessInstructions.length > 45 ? '...' : ''}
                            </div>
                          )}
                        </td>

                        <td style={{ maxWidth: 190 }}>
                          {del.itemsSummary && del.itemsSummary.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              {del.itemsSummary.slice(0, 2).map((item, idx) => (
                                <div key={idx} style={{ fontSize: '0.78rem' }}>
                                  <strong>{item.quantity}</strong> {item.unit_of_measure} • {item.product_name?.slice(0, 24)}...
                                </div>
                              ))}
                              {del.itemsSummary.length > 2 && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--amber-dark)', fontWeight: 600 }}>
                                  +{del.itemsSummary.length - 2} more items
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Construction supplies</span>
                          )}
                        </td>

                        <td style={{ minWidth: 160 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>
                            📅 {del.preferredDeliveryDate ? new Date(del.preferredDeliveryDate).toLocaleDateString() : 'Immediate Dispatch'}
                          </div>
                          {del.timeSlot && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              🕒 {del.timeSlot}
                            </div>
                          )}
                          <div style={{ marginTop: '0.3rem' }}>
                            <span className={`badge ${
                              del.unloadingPreference === 'hydraulic_tipper' ? 'badge-amber' :
                              del.unloadingPreference === 'manual_labor' ? 'badge-dark' :
                              del.unloadingPreference === 'crane_handling' ? 'badge-danger' : 'badge-outline'
                            }`} style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                              {del.unloadingPreference === 'hydraulic_tipper' ? '🚜 Tipper Dump' :
                               del.unloadingPreference === 'manual_labor' ? '👷 Labor Offload' :
                               del.unloadingPreference === 'crane_handling' ? '🏗️ Crane Hoist' : 'Self Arranged'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                            Freight: {del.deliveryCharge === 0 || del.deliveryCharge === '0.00' ? (
                              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>FREE</span>
                            ) : `₹${Number(del.deliveryCharge).toLocaleString()}`}
                          </div>
                          {Number(del.unloadingFee) > 0 && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--amber-dark)', fontWeight: 600, marginTop: '0.15rem' }}>
                              Unload: +₹{Number(del.unloadingFee).toLocaleString()}
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.78rem' }}>
                            {del.paymentMethod}
                          </div>
                          <span className={`badge ${del.paymentStatus === 'paid' ? 'badge-success' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                            {del.paymentStatus}
                          </span>
                        </td>

                        <td>
                          {del.assignedPersonnel ? (
                            <div>
                              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <UserCheck size={12} color="var(--success)" />
                                {del.assignedPersonnel.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {del.assignedPersonnel.phone}
                              </div>
                              {del.vehicle && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--amber-dark)', fontWeight: 600 }}>
                                  🚛 {del.vehicle.vehicleNumber} ({del.vehicle.vehicleType?.replace('_', ' ')})
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>
                              ⚠️ Unassigned
                            </span>
                          )}
                        </td>

                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                            {del.expectedDeliveryDate ? new Date(del.expectedDeliveryDate).toLocaleDateString() : 'Unscheduled'}
                          </div>
                          {del.actualDeliveryDate && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>
                              Delivered: {new Date(del.actualDeliveryDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>

                        <td>
                          <span className={`badge ${
                            del.status === 'delivered' ? 'badge-success' :
                            del.status === 'failed' ? 'badge-danger' :
                            ['dispatched', 'out_for_delivery'].includes(del.status) ? 'badge-amber' :
                            'badge-dark'
                          }`} style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                            {del.status?.replace(/_/g, ' ')}
                          </span>
                          {del.failureReason && del.status === 'failed' && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--danger)', marginTop: '0.25rem', maxWidth: 140, lineHeight: 1.2 }}>
                              Reason: {del.failureReason}
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setAssignModal({
                                open: true,
                                deliveryId: del.id,
                                deliveryNumber: del.deliveryNumber,
                                orderNumber: del.orderNumber,
                                delivery_person_id: del.assignedPersonnel?.id || '',
                                vehicle_id: del.vehicle?.id || '',
                                expected_delivery_date: del.expectedDeliveryDate ? del.expectedDeliveryDate.slice(0, 10) : del.preferredDeliveryDate ? del.preferredDeliveryDate.slice(0, 10) : '',
                                notes: del.deliveryNotes || '',
                                preferredDeliveryDate: del.preferredDeliveryDate,
                                timeSlot: del.timeSlot,
                                unloadingPreference: del.unloadingPreference,
                                siteContactName: del.siteContactName,
                                siteContactPhone: del.siteContactPhone,
                                siteLandmark: del.siteLandmark,
                                siteAccessInstructions: del.siteAccessInstructions
                              })}
                              className="btn btn-outline btn-sm"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                              title="Assign driver and fleet vehicle"
                            >
                              Assign
                            </button>

                            <button
                              onClick={() => setDeliveryStatusModal({
                                open: true,
                                deliveryId: del.id,
                                deliveryNumber: del.deliveryNumber,
                                orderNumber: del.orderNumber,
                                currentStatus: del.status,
                                status: del.status === 'failed' ? 'rescheduled' : del.status === 'pending_assignment' ? 'assigned' : 'dispatched',
                                notes: '',
                                reason: '',
                                expected_delivery_date: ''
                              })}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                              disabled={del.status === 'delivered'}
                              title="Update delivery status"
                            >
                              Update Status
                            </button>

                            <button
                              onClick={() => handleOpenDeliveryHistory(del.id)}
                              className="btn btn-dark btn-sm"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                              title="View audit history timeline"
                            >
                              History
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Live Stock &amp; Warehouse Adjustment Ledger</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Stock Quantity</th>
                  <th>Low Threshold</th>
                  <th>Status</th>
                  <th>Adjust Stock</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 700 }}>{inv.sku}</td>
                    <td>{inv.name}</td>
                    <td>{inv.category_name}</td>
                    <td style={{ fontWeight: 800, fontSize: '1rem' }}>
                      {inv.stock_quantity} {inv.unit_of_measure}
                    </td>
                    <td>{inv.low_stock_threshold}</td>
                    <td>
                      <span className={`badge ${inv.inventory_status === 'OUT_OF_STOCK' ? 'badge-danger' : inv.inventory_status === 'LOW_STOCK' ? 'badge-amber' : 'badge-success'}`}>
                        {inv.inventory_status}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setAdjustModal({
                            open: true,
                            productId: inv.id,
                            productName: inv.name,
                            changeQty: 25,
                            reason: 'Warehouse physical audit stock update'
                          });
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.2rem' }}>Civil Catalog Products CRUD</h3>
            <button
              onClick={() => {
                setProductModal({
                  open: true,
                  isEdit: false,
                  id: null,
                  category_id: categories[0]?.id || 1,
                  name: '',
                  sku: `MAT-${Date.now().toString().slice(-4)}`,
                  brand: 'BuildMart Certified',
                  description: '',
                  unit_of_measure: 'piece',
                  unit_price: 500,
                  discount_percent: 0,
                  stock_quantity: 100,
                  low_stock_threshold: 15,
                  min_order_quantity: 1,
                  volume_discount_threshold: 50,
                  volume_discount_percent: 5,
                  is_heavy_bulk: 0,
                  image_url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800'
                });
              }}
              className="btn btn-primary btn-sm"
            >
              <Plus size={16} />
              Add New Material
            </button>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Discount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700 }}>{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.unit_of_measure}</td>
                    <td style={{ fontWeight: 800 }}>₹{p.effective_price || p.unit_price}</td>
                    <td>{p.stock_quantity}</td>
                    <td>{p.discount_percent}%</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                          onClick={() => {
                            setProductModal({
                              open: true,
                              isEdit: true,
                              id: p.id,
                              category_id: p.category_id || 1,
                              name: p.name,
                              sku: p.sku,
                              brand: p.brand || '',
                              description: p.description || '',
                              unit_of_measure: p.unit_of_measure,
                              unit_price: p.unit_price,
                              discount_percent: p.discount_percent,
                              stock_quantity: p.stock_quantity,
                              low_stock_threshold: p.low_stock_threshold || 10,
                              min_order_quantity: p.min_order_quantity || 1,
                              volume_discount_threshold: p.volume_discount_threshold || '',
                              volume_discount_percent: p.volume_discount_percent || 0,
                              is_heavy_bulk: p.is_heavy_bulk ? 1 : 0,
                              image_url: p.primary_image || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800'
                            });
                          }}
                          className="btn btn-outline btn-sm"
                          title="Edit Product"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="btn btn-danger btn-sm"
                          title="Delete / Deactivate"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: BULK RFQs */}
      {activeTab === 'rfqs' && (
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Contractor Quotation Inquiries (RFQs)</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>RFQ Reference</th>
                  <th>Contractor / Firm</th>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Delivery PIN</th>
                  <th>Status</th>
                  <th>Quoted Rate</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => (
                  <tr key={rfq.id}>
                    <td style={{ fontWeight: 700 }}>#{rfq.inquiry_number}</td>
                    <td>
                      <div>{rfq.customer_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{rfq.company_name || rfq.email}</div>
                    </td>
                    <td>{rfq.product_name}</td>
                    <td style={{ fontWeight: 700 }}>{rfq.estimated_quantity} {rfq.unit_of_measure}</td>
                    <td>{rfq.delivery_pincode}</td>
                    <td>
                      <span className={`badge ${rfq.status === 'quoted' ? 'badge-success' : 'badge-amber'}`}>
                        {rfq.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 800 }}>
                      {rfq.quoted_price_per_unit ? `₹${rfq.quoted_price_per_unit}` : 'Pending Quote'}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setRfqModal({
                            open: true,
                            rfqId: rfq.id,
                            status: rfq.status || 'quoted',
                            quotedPrice: rfq.quoted_price_per_unit || rfq.product_catalog_price || '',
                            adminNotes: rfq.admin_notes || ''
                          });
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        Set Quote Rate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Registered Customers, Contractors &amp; Builders</h3>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Firm / GSTIN</th>
                  <th>Total Orders</th>
                  <th>Total Spend</th>
                  <th>Active</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.full_name}</td>
                    <td>{c.email}</td>
                    <td>
                      <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                        {c.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {c.company_name ? `${c.company_name} (${c.gstin || 'No GST'})` : 'Individual'}
                    </td>
                    <td>{c.total_orders}</td>
                    <td style={{ fontWeight: 800 }}>₹{c.total_spend?.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: UPDATE ORDER STATUS */}
      {statusModal.open && (
        <div className="modal-overlay" onClick={() => setStatusModal({ ...statusModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Update Order Status</h3>
            <div className="form-group">
              <label className="form-label">New Transition Status</label>
              <select
                className="form-control"
                value={statusModal.status}
                onChange={(e) => setStatusModal({ ...statusModal, status: e.target.value })}
              >
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing (Dispatch Loaded)</option>
                <option value="shipped">Shipped (Tipper in Transit)</option>
                <option value="delivered">Delivered (Site Unloaded)</option>
                <option value="cancelled">Cancelled (Restore Stock)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Logistics Tracking Notes</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Dispatched via Tipper HR55-AB-1234, Driver: Ramesh"
                value={statusModal.notes}
                onChange={(e) => setStatusModal({ ...statusModal, notes: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setStatusModal({ ...statusModal, open: false })}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleUpdateOrderStatus}>
                Save Status Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADJUST INVENTORY */}
      {adjustModal.open && (
        <div className="modal-overlay" onClick={() => setAdjustModal({ ...adjustModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Warehouse Stock Adjustment</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{adjustModal.productName}</p>
            <div className="form-group">
              <label className="form-label">Adjustment Quantity (Use positive to add, negative to write-off)</label>
              <input
                type="number"
                required
                className="form-control"
                value={adjustModal.changeQty}
                onChange={(e) => setAdjustModal({ ...adjustModal, changeQty: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mandatory Audit Reason *</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="e.g. Received new plant rake shipment / Damaged bag write-off"
                value={adjustModal.reason}
                onChange={(e) => setAdjustModal({ ...adjustModal, reason: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setAdjustModal({ ...adjustModal, open: false })}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleAdjustInventory}>
                Commit Inventory Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT PRODUCT */}
      {productModal.open && (
        <div className="modal-overlay" onClick={() => setProductModal({ ...productModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650, padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>
              {productModal.isEdit ? 'Edit Construction Material' : 'Add New Construction Material'}
            </h3>
            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={productModal.category_id}
                    onChange={(e) => setProductModal({ ...productModal, category_id: Number(e.target.value) })}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">SKU *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={productModal.sku}
                    onChange={(e) => setProductModal({ ...productModal, sku: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={productModal.name}
                    onChange={(e) => setProductModal({ ...productModal, name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Brand</label>
                  <input
                    type="text"
                    className="form-control"
                    value={productModal.brand}
                    onChange={(e) => setProductModal({ ...productModal, brand: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Unit of Measure *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. bag (50kg), piece (12m), tonne"
                    value={productModal.unit_of_measure}
                    onChange={(e) => setProductModal({ ...productModal, unit_of_measure: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Unit Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="form-control"
                    value={productModal.unit_price}
                    onChange={(e) => setProductModal({ ...productModal, unit_price: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Discount (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={productModal.discount_percent}
                    onChange={(e) => setProductModal({ ...productModal, discount_percent: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Warehouse Stock Quantity</label>
                  <input
                    type="number"
                    className="form-control"
                    value={productModal.stock_quantity}
                    onChange={(e) => setProductModal({ ...productModal, stock_quantity: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Low Stock Threshold</label>
                  <input
                    type="number"
                    className="form-control"
                    value={productModal.low_stock_threshold}
                    onChange={(e) => setProductModal({ ...productModal, low_stock_threshold: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Product Image URL</label>
                <input
                  type="url"
                  className="form-control"
                  value={productModal.image_url}
                  onChange={(e) => setProductModal({ ...productModal, image_url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={2}
                  className="form-control"
                  value={productModal.description}
                  onChange={(e) => setProductModal({ ...productModal, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setProductModal({ ...productModal, open: false })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: SET RFQ QUOTE */}
      {rfqModal.open && (
        <div className="modal-overlay" onClick={() => setRfqModal({ ...rfqModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Quote Contractor Rate</h3>
            <div className="form-group">
              <label className="form-label">Quoted Mill-Gate Unit Price (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                className="form-control"
                placeholder="e.g. 365.00"
                value={rfqModal.quotedPrice}
                onChange={(e) => setRfqModal({ ...rfqModal, quotedPrice: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">RFQ Status</label>
              <select
                className="form-control"
                value={rfqModal.status}
                onChange={(e) => setRfqModal({ ...rfqModal, status: e.target.value })}
              >
                <option value="in_review">In Review</option>
                <option value="quoted">Quoted (Sent to Contractor)</option>
                <option value="fulfilled">Fulfilled / Contract Executed</option>
                <option value="rejected">Rejected / Capacity Full</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Logistics Dispatch Notes</label>
              <textarea
                rows={2}
                className="form-control"
                placeholder="Direct plant freight included. Delivery by trailer."
                value={rfqModal.adminNotes}
                onChange={(e) => setRfqModal({ ...rfqModal, adminNotes: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setRfqModal({ ...rfqModal, open: false })}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleUpdateRfq}>
                Submit Quote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ASSIGN DELIVERY PERSON & VEHICLE */}
      {assignModal.open && (
        <div className="modal-overlay" onClick={() => setAssignModal({ ...assignModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Assign Delivery Logistics</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Order #{assignModal.orderNumber} • {assignModal.deliveryNumber}
                </div>
              </div>
              <button 
                onClick={() => setAssignModal({ ...assignModal, open: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignDelivery}>
              {assignModal.preferredDeliveryDate && (
                <div style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.82rem',
                  color: '#92400e',
                  lineHeight: 1.5
                }}>
                  <div style={{ fontWeight: 800, color: '#b45309', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Truck size={15} /> Customer Booked Logistics Specification
                  </div>
                  <div><strong>Preferred Date:</strong> {new Date(assignModal.preferredDeliveryDate).toLocaleDateString()} {assignModal.timeSlot ? `• ${assignModal.timeSlot}` : ''}</div>
                  {assignModal.unloadingPreference && (
                    <div>
                      <strong>Unloading Required:</strong> {
                        assignModal.unloadingPreference === 'hydraulic_tipper' ? '🚜 Hydraulic Tipper Dump (+₹350)' :
                        assignModal.unloadingPreference === 'manual_labor' ? '👷 Manual Labor Offload (+₹500)' :
                        assignModal.unloadingPreference === 'crane_handling' ? '🏗️ Crane Hoist (+₹1,200)' : 'Self Arranged'
                      }
                    </div>
                  )}
                  {assignModal.siteContactName && (
                    <div><strong>Site Supervisor:</strong> {assignModal.siteContactName} {assignModal.siteContactPhone ? `(${assignModal.siteContactPhone})` : ''}</div>
                  )}
                  {assignModal.siteLandmark && (
                    <div><strong>Landmark:</strong> {assignModal.siteLandmark}</div>
                  )}
                  {assignModal.siteAccessInstructions && (
                    <div style={{ marginTop: '0.25rem', fontStyle: 'italic', color: '#78350f' }}>
                      <strong>Access Instructions:</strong> {assignModal.siteAccessInstructions}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Assign Delivery Partner / Driver</label>
                <select
                  className="form-control"
                  value={assignModal.delivery_person_id}
                  onChange={(e) => setAssignModal({ ...assignModal, delivery_person_id: e.target.value })}
                >
                  <option value="">-- Select Delivery Personnel --</option>
                  {deliveryPersonnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.phone}) — {p.active_assignments_count} active orders
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assign Delivery Vehicle</label>
                <select
                  className="form-control"
                  value={assignModal.vehicle_id}
                  onChange={(e) => setAssignModal({ ...assignModal, vehicle_id: e.target.value })}
                >
                  <option value="">-- Select Fleet Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_number} • {v.vehicle_type?.replace('_', ' ').toUpperCase()} ({v.capacity_tonnes}T)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Scheduled Delivery Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={assignModal.expected_delivery_date}
                  onChange={(e) => setAssignModal({ ...assignModal, expected_delivery_date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dispatch / Unloading Notes</label>
                <textarea
                  rows={2}
                  className="form-control"
                  placeholder="e.g. Requires site crane for unloading; call site eng 30 mins before arrival."
                  value={assignModal.notes}
                  onChange={(e) => setAssignModal({ ...assignModal, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setAssignModal({ ...assignModal, open: false })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: UPDATE DELIVERY STATUS */}
      {deliveryStatusModal.open && (
        <div className="modal-overlay" onClick={() => setDeliveryStatusModal({ ...deliveryStatusModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Update Delivery Status</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Order #{deliveryStatusModal.orderNumber} • Current: <strong>{deliveryStatusModal.currentStatus?.replace(/_/g, ' ')}</strong>
                </div>
              </div>
              <button 
                onClick={() => setDeliveryStatusModal({ ...deliveryStatusModal, open: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateDeliveryStatus}>
              <div className="form-group">
                <label className="form-label">Transition To Status</label>
                <select
                  className="form-control"
                  value={deliveryStatusModal.status}
                  onChange={(e) => setDeliveryStatusModal({ ...deliveryStatusModal, status: e.target.value })}
                >
                  <option value="preparing">Preparing Materials (Yard Loading)</option>
                  <option value="dispatched">Dispatched (En route to Logistics Corridor)</option>
                  <option value="out_for_delivery">Out for Delivery (Last-Mile Site Transit)</option>
                  <option value="delivered">Delivered (Unloaded &amp; Verified at Site)</option>
                  <option value="failed">Failed Delivery Attempt</option>
                  <option value="rescheduled">Rescheduled / Arrange Redelivery</option>
                </select>
              </div>

              {deliveryStatusModal.status === 'failed' && (
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--danger)' }}>
                    Failure Reason (Mandatory)
                  </label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Site gate locked; security denied heavy vehicle entry outside 8 AM - 6 PM"
                    value={deliveryStatusModal.reason}
                    onChange={(e) => setDeliveryStatusModal({ ...deliveryStatusModal, reason: e.target.value })}
                  />
                </div>
              )}

              {deliveryStatusModal.status === 'rescheduled' && (
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--amber-dark)' }}>
                    Rescheduled Delivery Date (Mandatory)
                  </label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    value={deliveryStatusModal.expected_delivery_date}
                    onChange={(e) => setDeliveryStatusModal({ ...deliveryStatusModal, expected_delivery_date: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Operational Notes / Proof</label>
                <textarea
                  rows={2}
                  className="form-control"
                  placeholder="e.g. Client supervisor signed invoice challan. Tipper hydraulic unloading completed."
                  value={deliveryStatusModal.notes}
                  onChange={(e) => setDeliveryStatusModal({ ...deliveryStatusModal, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setDeliveryStatusModal({ ...deliveryStatusModal, open: false })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Apply Status Transition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: DELIVERY AUDIT TIMELINE HISTORY */}
      {deliveryHistoryModal.open && deliveryHistoryModal.delivery && (
        <div className="modal-overlay" onClick={() => setDeliveryHistoryModal({ ...deliveryHistoryModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Delivery Audit Trail &amp; Timeline</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Delivery #{deliveryHistoryModal.delivery.delivery_number} • Order #{deliveryHistoryModal.delivery.order_number}
                </div>
              </div>
              <button 
                onClick={() => setDeliveryHistoryModal({ ...deliveryHistoryModal, open: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Delivery Meta summary */}
            <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div><strong>Current Status:</strong> <span className="badge badge-dark" style={{ textTransform: 'capitalize' }}>{deliveryHistoryModal.delivery.status?.replace(/_/g, ' ')}</span></div>
                <div><strong>Driver:</strong> {deliveryHistoryModal.delivery.delivery_person_name || 'Unassigned'}</div>
                <div><strong>Vehicle:</strong> {deliveryHistoryModal.delivery.vehicle_number || 'N/A'}</div>
                <div><strong>Failures Logged:</strong> {deliveryHistoryModal.delivery.failure_count || 0}</div>
              </div>
            </div>

            {/* Timeline Events */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 380, overflowY: 'auto', paddingRight: '0.5rem' }}>
              {deliveryHistoryModal.history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No status events recorded yet.</p>
              ) : (
                deliveryHistoryModal.history.map((h, idx) => (
                  <div key={h.id || idx} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      backgroundColor: h.to_status === 'delivered' ? 'var(--success)' : h.to_status === 'failed' ? 'var(--danger)' : 'var(--amber-primary)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'capitalize', color: 'var(--primary)' }}>
                          {h.to_status?.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                        Updated by: <strong>{h.changed_by_name}</strong>
                      </div>
                      {h.notes && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginTop: '0.25rem', backgroundColor: 'var(--bg-subtle)', padding: '0.4rem 0.5rem', borderRadius: 4 }}>
                          {h.notes}
                        </div>
                      )}
                      {h.reason && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', fontWeight: 600 }}>
                          Reason: {h.reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-dark btn-sm" onClick={() => setDeliveryHistoryModal({ ...deliveryHistoryModal, open: false })}>
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: ADD DELIVERY PERSONNEL */}
      {personnelModal.open && (
        <div className="modal-overlay" onClick={() => setPersonnelModal({ ...personnelModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Register Delivery Personnel</h3>
              <button 
                onClick={() => setPersonnelModal({ ...personnelModal, open: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePersonnel}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Ramesh Yadav (Tipper Lead)"
                  value={personnelModal.full_name}
                  onChange={(e) => setPersonnelModal({ ...personnelModal, full_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Login)</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  placeholder="e.g. ramesh.driver@buildmart.com"
                  value={personnelModal.email}
                  onChange={(e) => setPersonnelModal({ ...personnelModal, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  placeholder="Minimum 6 characters"
                  value={personnelModal.password}
                  onChange={(e) => setPersonnelModal({ ...personnelModal, password: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="+91 98450 12345"
                  value={personnelModal.phone}
                  onChange={(e) => setPersonnelModal({ ...personnelModal, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Logistics Hub / Company</label>
                <input
                  type="text"
                  className="form-control"
                  value={personnelModal.company_name}
                  onChange={(e) => setPersonnelModal({ ...personnelModal, company_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setPersonnelModal({ ...personnelModal, open: false })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Register Partner Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: REGISTER VEHICLE */}
      {vehicleModal.open && (
        <div className="modal-overlay" onClick={() => setVehicleModal({ ...vehicleModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Register Fleet Vehicle</h3>
              <button 
                onClick={() => setVehicleModal({ ...vehicleModal, open: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVehicle}>
              <div className="form-group">
                <label className="form-label">Vehicle Registration Number</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. DL-01-AB-1234"
                  value={vehicleModal.vehicle_number}
                  onChange={(e) => setVehicleModal({ ...vehicleModal, vehicle_number: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <select
                  className="form-control"
                  value={vehicleModal.vehicle_type}
                  onChange={(e) => setVehicleModal({ ...vehicleModal, vehicle_type: e.target.value })}
                >
                  <option value="tipper_truck">Tipper Truck (Aggregate / Sand / Earth)</option>
                  <option value="flatbed_trailer">Flatbed Trailer (TMT Rebars / Cement)</option>
                  <option value="mini_truck">Mini Commercial Truck (Tata Ace / Dost)</option>
                  <option value="pickup">Heavy Pickup Vehicle</option>
                  <option value="two_wheeler">Rapid Express Two-Wheeler (Tools / Fixtures)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payload Capacity (Tonnes)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  className="form-control"
                  value={vehicleModal.capacity_tonnes}
                  onChange={(e) => setVehicleModal({ ...vehicleModal, capacity_tonnes: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Designated Driver Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Suresh Kumar"
                  value={vehicleModal.driver_name}
                  onChange={(e) => setVehicleModal({ ...vehicleModal, driver_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Designated Driver Phone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="+91 98450 12345"
                  value={vehicleModal.driver_phone}
                  onChange={(e) => setVehicleModal({ ...vehicleModal, driver_phone: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setVehicleModal({ ...vehicleModal, open: false })}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Register Fleet Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
