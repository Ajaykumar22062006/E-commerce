import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, Package, MapPin, Phone, CheckCircle, AlertTriangle, 
  Clock, Calendar, UserCheck, ShieldCheck, RefreshCw, X, ChevronRight, AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function DeliveryPartnerPage() {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  // Status update modal
  const [updateModal, setUpdateModal] = useState({
    open: false,
    delivery: null,
    targetStatus: 'out_for_delivery',
    notes: '',
    reason: '',
    rescheduled_date: ''
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/delivery-portal');
      return;
    }
    if (user?.role !== 'delivery_personnel' && user?.role !== 'admin') {
      toast.error('Access restricted to authorized BuildMart Fleet Logistics Partners.');
      navigate('/');
      return;
    }

    loadMyDeliveries();
  }, [isAuthenticated, user, navigate]);

  const loadMyDeliveries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/deliveries');
      if (res.data.success) {
        setDeliveries(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load assigned deliveries.');
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (delivery, targetStatus) => {
    setUpdateModal({
      open: true,
      delivery,
      targetStatus,
      notes: '',
      reason: '',
      rescheduled_date: targetStatus === 'failed' ? new Date(Date.now() + 86400000).toISOString().split('T')[0] : ''
    });
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (updateModal.targetStatus === 'failed' && !updateModal.reason.trim()) {
      toast.error('Failure reason is strictly required.');
      return;
    }

    setUpdating(true);
    try {
      const res = await api.put(`/deliveries/${updateModal.delivery.id}/status`, {
        status: updateModal.targetStatus,
        notes: updateModal.notes,
        reason: updateModal.reason,
        rescheduled_date: updateModal.rescheduled_date || null
      });

      if (res.data.success) {
        toast.success(`Delivery #${updateModal.delivery.delivery_number} updated to ${updateModal.targetStatus.replace(/_/g, ' ')}!`);
        setUpdateModal({ open: false, delivery: null, targetStatus: 'out_for_delivery', notes: '', reason: '', rescheduled_date: '' });
        loadMyDeliveries();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update delivery status.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return ['assigned', 'preparing', 'dispatched', 'out_for_delivery'].includes(d.status);
    if (filterStatus === 'delivered') return d.status === 'delivered';
    if (filterStatus === 'failed') return d.status === 'failed';
    return true;
  });

  const activeCount = deliveries.filter(d => ['assigned', 'preparing', 'dispatched', 'out_for_delivery'].includes(d.status)).length;
  const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;
  const failedCount = deliveries.filter(d => d.status === 'failed').length;

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '2rem',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--amber-primary)',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}>
            <Truck size={28} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--amber-dark)', textTransform: 'uppercase' }}>
              Fleet Operations Dispatch Portal
            </div>
            <h1 style={{ fontSize: '1.65rem', margin: 0 }}>
              {user?.full_name}'s Delivery Route
            </h1>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Logged in as Authorized Delivery Personnel • ID #{user?.id}
            </div>
          </div>
        </div>

        <button onClick={loadMyDeliveries} className="btn btn-outline btn-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Fleet Dispatches
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid var(--amber-primary)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active Dispatches
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)', marginTop: '0.25rem' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Require site transit &amp; unloading</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Completed Deliveries
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--success)', marginTop: '0.25rem' }}>
            {deliveredCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Successfully unloaded at site</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Failed / Rescheduled
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--danger)', marginTop: '0.25rem' }}>
            {failedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Site gate issue or customer absent</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {[
          { key: 'all', label: `All Shipments (${deliveries.length})` },
          { key: 'active', label: `Active In-Transit (${activeCount})` },
          { key: 'delivered', label: `Completed (${deliveredCount})` },
          { key: 'failed', label: `Failed / Hold (${failedCount})` }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`btn btn-sm ${filterStatus === tab.key ? 'btn-dark' : 'btn-outline'}`}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Deliveries List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading assigned delivery manifests...</p>
        </div>
      ) : filteredDeliveries.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem', textAlign: 'center', backgroundColor: '#ffffff' }}>
          <CheckCircle size={44} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No deliveries matching filter</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            All assigned shipments for this status are clear.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredDeliveries.map((d) => (
            <div key={d.id} className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--primary)' }}>
                      #{d.delivery_number}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      (Order #{d.order_number})
                    </span>
                    <span className={`badge ${
                      d.status === 'delivered' ? 'badge-success' :
                      d.status === 'failed' ? 'badge-danger' :
                      d.status === 'out_for_delivery' ? 'badge-amber' : 'badge-dark'
                    }`} style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                      {d.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Expected Delivery: <strong>{d.expected_delivery_date ? new Date(d.expected_delivery_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Today'}</strong>
                    {d.vehicle_number && <span> • Vehicle: <strong>{d.vehicle_number}</strong> ({d.vehicle_type?.replace(/_/g, ' ')})</span>}
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['assigned', 'preparing', 'dispatched'].includes(d.status) && (
                    <button
                      onClick={() => openUpdateModal(d, 'out_for_delivery')}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Truck size={14} />
                      Start Transit (Out for Delivery)
                    </button>
                  )}

                  {['dispatched', 'out_for_delivery'].includes(d.status) && (
                    <>
                      <button
                        onClick={() => openUpdateModal(d, 'delivered')}
                        className="btn btn-dark btn-sm"
                        style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <CheckCircle size={14} />
                        Confirm Unloaded &amp; Delivered
                      </button>

                      <button
                        onClick={() => openUpdateModal(d, 'failed')}
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <AlertTriangle size={14} />
                        Record Failure
                      </button>
                    </>
                  )}

                  {d.status === 'failed' && (
                    <button
                      onClick={() => openUpdateModal(d, 'out_for_delivery')}
                      className="btn btn-outline btn-sm"
                      style={{ color: 'var(--amber-dark)', borderColor: 'var(--amber-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <RefreshCw size={14} />
                      Attempt Redelivery
                    </button>
                  )}
                </div>
              </div>

              {/* Delivery Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
                {/* Site Destination (Span 4) */}
                <div style={{ gridColumn: 'span 4' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} color="var(--amber-primary)" />
                    Site Destination
                  </div>
                  <div style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>
                    <strong>{d.shipping_address_snapshot?.recipient_name || d.customer_name}</strong><br />
                    {d.shipping_address_snapshot?.address_line1 || 'Main Site Gate'}<br />
                    {d.shipping_address_snapshot?.city || 'Delhi NCR'} - <strong>{d.shipping_address_snapshot?.postal_code || '110001'}</strong>
                  </div>
                  {d.shipping_address_snapshot?.phone && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <a
                        href={`tel:${d.shipping_address_snapshot.phone}`}
                        className="btn btn-outline btn-sm"
                        style={{ fontSize: '0.78rem', padding: '0.25rem 0.5rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Phone size={12} />
                        Call Site Contact: {d.shipping_address_snapshot.phone}
                      </a>
                    </div>
                  )}
                </div>

                {/* Materials Manifest (Span 5) */}
                <div style={{ gridColumn: 'span 5' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Package size={13} color="var(--amber-primary)" />
                    Cargo / Construction Materials
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                    {d.items && d.items.length > 0 ? (
                      d.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.2rem' }}>
                          <span>{item.product_name}</span>
                          <span style={{ fontWeight: 700 }}>{item.quantity} {item.unit_of_measure}</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Standard Heavy Bulk Consignment</span>
                    )}
                  </div>
                </div>

                {/* Financial / Unloading Notes (Span 3) */}
                <div style={{ gridColumn: 'span 3', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Payment &amp; Unloading
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    Payment Mode: <strong style={{ textTransform: 'uppercase' }}>{d.payment_method}</strong>
                  </div>
                  <div style={{ marginTop: '0.25rem' }}>
                    Status: <span className={`badge ${d.payment_status === 'paid' ? 'badge-success' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                      {d.payment_status === 'paid' ? 'PAID ONLINE' : 'COLLECT CASH ON SITE'}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)' }}>
                    ₹{d.total_amount?.toLocaleString()}
                  </div>
                  {d.failure_reason && (
                    <div style={{ marginTop: '0.5rem', backgroundColor: 'var(--danger-bg)', padding: '0.4rem 0.6rem', borderRadius: 4, fontSize: '0.75rem', color: 'var(--danger)' }}>
                      <strong>Hold Reason:</strong> {d.failure_reason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status Update Modal */}
      {updateModal.open && (
        <div className="modal-overlay" onClick={() => setUpdateModal({ ...updateModal, open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, textTransform: 'capitalize' }}>
                Update to {updateModal.targetStatus.replace(/_/g, ' ')}
              </h3>
              <button
                onClick={() => setUpdateModal({ ...updateModal, open: false })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Delivery Consignment: <strong>#{updateModal.delivery?.delivery_number}</strong> (Order #{updateModal.delivery?.order_number})
              </p>

              {updateModal.targetStatus === 'delivered' && updateModal.delivery?.payment_method === 'cod' && (
                <div style={{ backgroundColor: 'var(--amber-subtle)', border: '1px solid var(--amber-primary)', padding: '0.75rem 1rem', borderRadius: 6, fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--amber-dark)', fontWeight: 600 }}>
                  ⚠️ Cash on Delivery: Confirm that ₹{updateModal.delivery?.total_amount?.toLocaleString()} in full payment was received on site upon unloading.
                </div>
              )}

              {updateModal.targetStatus === 'failed' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Failure Reason *</label>
                    <select
                      required
                      className="form-control"
                      value={updateModal.reason}
                      onChange={(e) => setUpdateModal({ ...updateModal, reason: e.target.value })}
                    >
                      <option value="">-- Select Failure Cause --</option>
                      <option value="Customer unreachable by phone at gate">Customer unreachable by phone at gate</option>
                      <option value="Site gate locked / Security clearance denied">Site gate locked / Security clearance denied</option>
                      <option value="Tipper / Truck unable to enter narrow approach road">Tipper / Truck unable to enter narrow approach road</option>
                      <option value="Site crane unavailable for heavy unloading">Site crane unavailable for heavy unloading</option>
                      <option value="Customer requested date postponement">Customer requested date postponement</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Rescheduled Delivery Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={updateModal.rescheduled_date}
                      onChange={(e) => setUpdateModal({ ...updateModal, rescheduled_date: e.target.value })}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Driver Logistics Notes</label>
                <textarea
                  rows={2}
                  className="form-control"
                  placeholder="e.g. Unloaded 50 bags Ultratech Cement at Block B foundation"
                  value={updateModal.notes}
                  onChange={(e) => setUpdateModal({ ...updateModal, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setUpdateModal({ ...updateModal, open: false })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${updateModal.targetStatus === 'failed' ? 'btn-danger' : updateModal.targetStatus === 'delivered' ? 'btn-dark' : 'btn-primary'}`}
                  disabled={updating}
                >
                  {updating ? 'Recording...' : `Confirm ${updateModal.targetStatus.replace(/_/g, ' ')}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
