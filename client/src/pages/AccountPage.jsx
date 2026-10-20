import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  User, Package, MapPin, Truck, Heart, Lock, 
  Plus, CheckCircle, RotateCcw, Eye, Trash2, Building2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function AccountPage() {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'orders';

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    company_name: user?.company_name || '',
    gstin: user?.gstin || ''
  });

  // Password Change State
  const [passForm, setPassForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/account');
      return;
    }

    async function loadAccountData() {
      setLoading(true);
      try {
        const [ordersRes, addrRes, inqRes] = await Promise.all([
          api.get('/orders'),
          api.get('/addresses'),
          api.get('/bulk-inquiries/my')
        ]);
        if (ordersRes.data.success) setOrders(ordersRes.data.data);
        if (addrRes.data.success) setAddresses(addrRes.data.data);
        if (inqRes.data.success) setInquiries(inqRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadAccountData();
  }, [isAuthenticated, navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put('/auth/profile', profileForm);
      if (res.data.success) {
        updateUser(res.data.data.user);
        toast.success('Profile updated successfully.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.new_password !== passForm.confirm_password) {
      toast.error('New passwords do not match.');
      return;
    }
    try {
      const res = await api.post('/auth/change-password', {
        current_password: passForm.current_password,
        new_password: passForm.new_password
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setPassForm({ current_password: '', new_password: '', confirm_password: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password update failed.');
    }
  };

  const setTab = (tabName) => {
    setSearchParams({ tab: tabName });
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 5rem' }}>
      {/* Account Hero Card */}
      <div className="card" style={{ padding: '1.75rem', backgroundColor: 'var(--primary)', color: '#ffffff', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: 'var(--amber-primary)',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.5rem'
            }}>
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <h2 style={{ color: '#ffffff', fontSize: '1.4rem', margin: 0 }}>{user?.full_name}</h2>
                <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>{user?.role}</span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                {user?.email} • {user?.phone || 'No phone added'}
                {user?.company_name && ` • Firm: ${user.company_name}`}
              </p>
            </div>
          </div>
          <button onClick={logout} className="btn btn-outline btn-sm" style={{ color: '#ffffff', borderColor: '#475569' }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2.5rem' }}>
        {/* Left Tabs Menu (Span 3) */}
        <aside style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => setTab('orders')}
            className={`btn ${activeTab === 'orders' ? 'btn-dark' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', width: '100%' }}
          >
            <Package size={17} />
            Order History ({orders.length})
          </button>
          <button
            onClick={() => setTab('addresses')}
            className={`btn ${activeTab === 'addresses' ? 'btn-dark' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', width: '100%' }}
          >
            <MapPin size={17} />
            Site Addresses ({addresses.length})
          </button>
          <button
            onClick={() => setTab('rfqs')}
            className={`btn ${activeTab === 'rfqs' ? 'btn-dark' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', width: '100%' }}
          >
            <Truck size={17} />
            Bulk RFQs ({inquiries.length})
          </button>
          <button
            onClick={() => setTab('wishlist')}
            className={`btn ${activeTab === 'wishlist' ? 'btn-dark' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', width: '100%' }}
          >
            <Heart size={17} />
            Saved Materials ({wishlist.length})
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`btn ${activeTab === 'settings' ? 'btn-dark' : 'btn-outline'}`}
            style={{ justifyContent: 'flex-start', padding: '0.75rem 1rem', width: '100%' }}
          >
            <User size={17} />
            Account Settings
          </button>
        </aside>

        {/* Right Content Tab Body (Span 9) */}
        <main style={{ gridColumn: 'span 9' }}>
          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Project Orders &amp; Dispatches</h3>
              {orders.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>No orders placed yet.</p>
                  <Link to="/products" className="btn btn-primary">
                    Procure Materials Now
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {orders.map((o) => (
                    <div key={o.id} className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
                            #{o.order_number}
                          </span>
                          <span className={`badge ${o.order_status === 'delivered' ? 'badge-success' : o.order_status === 'cancelled' ? 'badge-danger' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                            Order: {o.order_status}
                          </span>
                          {o.delivery_status && (
                            <span className={`badge ${
                              (o.delivery_status === 'delivered' || o.order_status === 'delivered') ? 'badge-success' :
                              o.delivery_status === 'failed' ? 'badge-danger' :
                              o.delivery_status === 'out_for_delivery' ? 'badge-amber' : 'badge-dark'
                            }`} style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textTransform: 'capitalize' }}>
                              <Truck size={11} />
                              {(o.delivery_status === 'delivered' || o.order_status === 'delivered') ? 'Delivered' : o.delivery_status.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Placed {new Date(o.created_at).toLocaleDateString()} • {o.items_count} items • Mode: <strong style={{ textTransform: 'uppercase' }}>{o.payment_method}</strong>
                          {o.delivery_number && (
                            <span> • Logistics: <strong>{o.delivery_number}</strong></span>
                          )}
                        </div>
                        {o.expected_delivery_date && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--amber-dark)', fontWeight: 600, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Truck size={12} />
                            Est. Site Arrival: {new Date(o.expected_delivery_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>
                            ₹{o.total_amount?.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Payment: {o.payment_status}
                          </div>
                        </div>

                        <Link to={`/orders/${o.id}/confirmed`} className="btn btn-dark btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Truck size={14} color="var(--amber-primary)" />
                          Track Delivery
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Registered Site Locations</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {addresses.map((a) => (
                  <div key={a.id} className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: a.is_default ? '2px solid var(--amber-primary)' : '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700 }}>{a.label}</span>
                      {a.is_default && <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Default Site</span>}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{a.recipient_name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0.25rem 0' }}>
                      {a.address_line1}, {a.city}, {a.state} - {a.postal_code}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Phone: {a.phone}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RFQs */}
          {activeTab === 'rfqs' && (
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Contractor Quotation Requests</h3>
              {inquiries.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff' }}>
                  <p style={{ color: 'var(--text-muted)' }}>No bulk quote enquiries submitted yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {inquiries.map((inq) => (
                    <div key={inq.id} className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div>
                          <strong style={{ fontSize: '1rem' }}>RFQ #{inq.inquiry_number}</strong>
                          <span style={{ marginLeft: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                            {inq.product_name}
                          </span>
                        </div>
                        <span className={`badge ${inq.status === 'quoted' ? 'badge-success' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                          {inq.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        Quantity: <strong>{inq.estimated_quantity} {inq.unit_of_measure}</strong> • Site PIN: {inq.delivery_pincode}
                      </div>
                      {inq.quoted_price_per_unit && (
                        <div style={{ marginTop: '0.5rem', backgroundColor: 'var(--success-bg)', padding: '0.5rem 0.75rem', borderRadius: 6, fontSize: '0.85rem', color: 'var(--success)', fontWeight: 700 }}>
                          Quoted Mill-Gate Rate: ₹{inq.quoted_price_per_unit} per {inq.unit_of_measure}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: WISHLIST */}
          {activeTab === 'wishlist' && (
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Saved Construction Materials</h3>
              {wishlist.length === 0 ? (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#ffffff' }}>
                  <p style={{ color: 'var(--text-muted)' }}>Your saved materials list is empty.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  {wishlist.map((item) => (
                    <div key={item.wishlist_id} className="card" style={{ padding: '1rem', backgroundColor: '#ffffff' }}>
                      <img
                        src={item.image_url || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200'}
                        alt=""
                        style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: '0.5rem' }}
                      />
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{item.name}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.75rem' }}>
                        ₹{item.effective_price}
                      </div>
                      <button
                        onClick={() => addToCart({ id: item.product_id, name: item.name }, 1)}
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%' }}
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Company &amp; Profile Details</h3>
                <form onSubmit={handleUpdateProfile}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profileForm.full_name}
                        onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Firm / Construction Entity</label>
                      <input
                        type="text"
                        className="form-control"
                        value={profileForm.company_name}
                        onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">GSTIN (For 100% Tax Invoicing)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 07AAAAA0000A1Z5"
                        value={profileForm.gstin}
                        onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Save Changes
                  </button>
                </form>
              </div>

              <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Security &amp; Password</h3>
                <form onSubmit={handleChangePassword}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Current Password</label>
                      <input
                        type="password"
                        required
                        className="form-control"
                        value={passForm.current_password}
                        onChange={(e) => setPassForm({ ...passForm, current_password: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <input
                        type="password"
                        required
                        className="form-control"
                        value={passForm.new_password}
                        onChange={(e) => setPassForm({ ...passForm, new_password: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        className="form-control"
                        value={passForm.confirm_password}
                        onChange={(e) => setPassForm({ ...passForm, confirm_password: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-dark btn-sm">
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
