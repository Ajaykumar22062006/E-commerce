import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, Truck, Package, Clock, XCircle, 
  RotateCcw, Printer, ArrowLeft, ShieldCheck, MapPin, Check
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useCart } from '../context/CartContext';

export default function OrderConfirmationPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const toast = useToast();
  const { refreshCart } = useCart();
  const navigate = useNavigate();

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${id}`);
      if (res.data.success) {
        setOrder(res.data.data);
      }
    } catch (err) {
      toast.error('Unable to retrieve order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please enter a cancellation reason.');
      return;
    }
    setCancelling(true);
    try {
      const res = await api.post(`/orders/${id}/cancel`, { reason: cancelReason });
      if (res.data.success) {
        toast.success(res.data.message);
        setShowCancelModal(false);
        loadOrder();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = async () => {
    try {
      const res = await api.post(`/orders/${id}/reorder`);
      if (res.data.success) {
        toast.success(res.data.message);
        await refreshCart();
        navigate('/cart');
      }
    } catch (err) {
      toast.error('Failed to reorder items.');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Retrieving order receipt and tracking...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <h2>Order Not Found</h2>
        <Link to="/products" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Storefront
        </Link>
      </div>
    );
  }

  const deliveryStages = [
    { key: 'confirmed', label: 'Order Confirmed' },
    { key: 'preparing', label: 'Preparing at Yard' },
    { key: 'dispatched', label: 'Dispatched from Yard' },
    { key: 'out_for_delivery', label: 'Out for Site Delivery' },
    { key: 'delivered', label: 'Delivered & Unloaded' }
  ];

  const getDeliveryStepIndex = () => {
    const orderFallbackMap = { pending: 0, confirmed: 0, processing: 1, shipped: 2, delivered: 4 };
    const orderStep = orderFallbackMap[order.order_status] ?? 0;

    if (!order.delivery) {
      return orderStep;
    }
    const statusMap = {
      pending_assignment: 0,
      assigned: 0,
      preparing: 1,
      dispatched: 2,
      out_for_delivery: 3,
      delivered: 4,
      failed: 3
    };
    const deliveryStep = statusMap[order.delivery.status] ?? 0;
    return Math.max(deliveryStep, orderStep);
  };

  const currentStepIndex = getDeliveryStepIndex();
  const isCancelled = order.order_status === 'cancelled';
  const isDeliveryFailed = order.delivery?.status === 'failed';
  const isDelivered = order.order_status === 'delivered' || order.delivery?.status === 'delivered';

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 5rem' }}>
      {/* Top Banner */}
      <div style={{
        backgroundColor: isCancelled ? 'var(--danger-bg)' : isDelivered ? 'var(--success-bg)' : 'var(--amber-subtle)',
        border: `1px solid ${isCancelled ? 'var(--danger-border)' : isDelivered ? 'var(--success-border)' : 'var(--amber-primary)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        marginBottom: '2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            backgroundColor: isCancelled ? 'var(--danger)' : isDelivered ? 'var(--success)' : 'var(--amber-primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isCancelled ? <XCircle size={32} /> : <CheckCircle size={32} />}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isCancelled ? 'var(--danger)' : isDelivered ? 'var(--success)' : 'var(--amber-dark)', textTransform: 'uppercase' }}>
              {isCancelled ? 'ORDER CANCELLED' : isDelivered ? 'ORDER DELIVERED & UNLOADED' : 'ORDER CONFIRMED & REGISTERED'}
            </div>
            <h1 style={{ fontSize: '1.65rem', margin: '0.25rem 0' }}>
              Order #{order.order_number}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Placed on {new Date(order.created_at).toLocaleString()} • Payment: <strong style={{ textTransform: 'uppercase' }}>{order.payment_method} ({order.payment_status})</strong>
              {order.delivery && (
                <span> • Consignment: <strong style={{ color: 'var(--amber-dark)' }}>{order.delivery.delivery_number}</strong></span>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={() => window.print()} className="btn btn-outline btn-sm">
            <Printer size={15} />
            Print GST Invoice
          </button>
          <button onClick={handleReorder} className="btn btn-dark btn-sm">
            <RotateCcw size={15} />
            Reorder Materials
          </button>
          {['pending', 'confirmed'].includes(order.order_status) && (
            <button onClick={() => setShowCancelModal(true)} className="btn btn-danger btn-sm">
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Failed Delivery Warning Banner */}
      {isDeliveryFailed && (
        <div style={{
          backgroundColor: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'flex-start'
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            backgroundColor: 'var(--danger)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <XCircle size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              Delivery Attempt Recorded as Failed
            </div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              <strong>Reason:</strong> {order.delivery?.failure_reason || 'Site gate inaccessible or recipient unavailable'}.
              {order.delivery?.rescheduled_date && (
                <span> Redelivery has been rescheduled for: <strong style={{ color: 'var(--amber-dark)' }}>{new Date(order.delivery.rescheduled_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</strong>.</span>
              )}
            </p>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              If you need immediate site delivery coordination, contact BuildMart Logistics Dispatch at <strong>+91 98765 00001</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Rescheduled Notice Banner (if not failed) */}
      {!isDeliveryFailed && order.delivery?.rescheduled_date && (
        <div style={{
          backgroundColor: 'var(--amber-subtle)',
          border: '1px solid var(--amber-primary)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <Truck size={22} color="var(--amber-dark)" />
          <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
            <strong>Logistics Schedule Notice:</strong> Delivery for this order has been rescheduled to <strong>{new Date(order.delivery.rescheduled_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</strong>.
          </div>
        </div>
      )}

      {/* Delivery Status Timeline */}
      {!isCancelled && (
        <div className="card" style={{ padding: '2rem', backgroundColor: '#ffffff', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={22} color="var(--amber-primary)" />
                Site Logistics Delivery Tracker
              </h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Track real-time dispatch, transit, and unloading at your construction site.
              </p>
            </div>

            {order.delivery && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className={`badge ${
                  (order.delivery.status === 'delivered' || order.order_status === 'delivered') ? 'badge-success' :
                  order.delivery.status === 'failed' ? 'badge-danger' :
                  order.delivery.status === 'out_for_delivery' ? 'badge-amber' : 'badge-dark'
                }`} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', textTransform: 'capitalize' }}>
                  Status: {(order.delivery.status === 'delivered' || order.order_status === 'delivered') ? 'Delivered & Unloaded' : order.delivery.status.replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '2.5rem' }}>
            {/* Progress line */}
            <div style={{
              position: 'absolute',
              top: 20,
              left: 40,
              right: 40,
              height: 4,
              backgroundColor: 'var(--border-color)',
              zIndex: 1
            }}>
              <div style={{
                height: '100%',
                backgroundColor: isDeliveryFailed ? 'var(--danger)' : isDelivered ? 'var(--success)' : 'var(--amber-primary)',
                width: `${Math.max(0, (currentStepIndex / (deliveryStages.length - 1)) * 100)}%`,
                transition: 'width 0.4s ease'
              }} />
            </div>

            {deliveryStages.map((stage, idx) => {
              const isPast = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const showCheck = (isDelivered && isPast) || (isPast && !isCurrent);
              const stepColor = (isCurrent && isDeliveryFailed) 
                ? 'var(--danger)' 
                : (isDelivered && isPast) 
                  ? 'var(--success)' 
                  : isPast 
                    ? 'var(--amber-primary)' 
                    : 'var(--border-strong)';

              return (
                <div key={stage.key} style={{ textAlign: 'center', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    backgroundColor: (isCurrent && isDeliveryFailed) 
                      ? 'var(--danger)' 
                      : (isDelivered && isPast) 
                        ? 'var(--success)' 
                        : isPast 
                          ? 'var(--amber-primary)' 
                          : '#ffffff',
                    border: `3px solid ${stepColor}`,
                    color: (isPast || (isCurrent && isDeliveryFailed)) 
                      ? ((isCurrent && isDeliveryFailed) || (isDelivered && isPast) ? '#ffffff' : '#0f172a') 
                      : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                    boxShadow: isCurrent ? `0 0 0 4px ${isDeliveryFailed ? 'rgba(239, 68, 68, 0.25)' : isDelivered ? 'rgba(34, 197, 94, 0.25)' : 'rgba(245, 158, 11, 0.25)'}` : 'none'
                  }}>
                    {showCheck ? <Check size={18} strokeWidth={3} /> : idx + 1}
                  </div>
                  <div style={{
                    fontSize: '0.8125rem',
                    fontWeight: isPast ? 700 : 500,
                    color: isCurrent && isDeliveryFailed 
                      ? 'var(--danger)' 
                      : (isDelivered && isPast) 
                        ? 'var(--success)' 
                        : isPast 
                          ? 'var(--text-main)' 
                          : 'var(--text-muted)'
                  }}>
                    {stage.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Logistics Metadata Snapshot */}
          {order.delivery && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '1rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Consignment Number
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                    {order.delivery.delivery_number}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Booked Delivery Window
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--amber-dark)' }}>
                    {order.delivery.preferred_delivery_date
                      ? `${new Date(order.delivery.preferred_delivery_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`
                      : order.delivery.expected_delivery_date
                        ? new Date(order.delivery.expected_delivery_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                        : 'Awaiting Fleet Schedule'}
                  </div>
                  {order.delivery.time_slot && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.15rem' }}>
                      🕒 {order.delivery.time_slot}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Site Unloading Requirement
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, textTransform: 'capitalize' }}>
                    {order.delivery.unloading_preference === 'hydraulic_tipper' ? '🚜 Hydraulic Tipper Dump' :
                     order.delivery.unloading_preference === 'manual_labor' ? '👷 Manual Labor Offload' :
                     order.delivery.unloading_preference === 'crane_handling' ? '🏗️ Boom Crane Hoist' :
                     '🤝 Self / Contractor Arranged'}
                  </div>
                  {Number(order.delivery.unloading_charge) > 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                      Service Fee: ₹{Number(order.delivery.unloading_charge).toLocaleString()}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Assigned Driver / Partner
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                    {order.delivery.delivery_person_name ? (
                      <span>{order.delivery.delivery_person_name} ({order.delivery.delivery_person_phone || 'Assigned'})</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Yard Dispatcher Assigning</span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Fleet Vehicle
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                    {order.delivery.vehicle_number ? (
                      <span>{order.delivery.vehicle_number} ({order.delivery.vehicle_type?.replace(/_/g, ' ')})</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Heavy Fleet Allocation</span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Site Contact / Supervisor
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>
                    {order.delivery.site_contact_name ? (
                      <span>{order.delivery.site_contact_name} ({order.delivery.site_contact_phone || 'On Site'})</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Same as Recipient</span>
                    )}
                  </div>
                  {order.delivery.site_landmark && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Near: {order.delivery.site_landmark}
                    </div>
                  )}
                </div>
              </div>

              {order.delivery.site_access_instructions && (
                <div style={{
                  padding: '0.85rem 1.25rem',
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.84rem',
                  color: '#92400e',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}>
                  <strong>Site Access &amp; Offloading Instructions:</strong> {order.delivery.site_access_instructions}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Grid: Order Items & Shipping Snapshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2.5rem' }}>
        {/* Purchased Items (Span 8) */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              Materials Purchased ({order.items?.length} items)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {order.items?.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=100'}
                      alt=""
                      style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.product_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        SKU: {item.sku} | Unit: {item.unit_of_measure}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Qty: <strong>{item.quantity}</strong> × ₹{item.effective_price}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                    ₹{item.total_line_price}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Status History */}
          {order.history && order.history.length > 0 && (
            <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Order Timeline Audit Logs</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {order.history.map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem' }}>
                    <div style={{ color: 'var(--text-muted)', minWidth: 140 }}>
                      {new Date(h.created_at).toLocaleString()}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--primary)', minWidth: 100, textTransform: 'capitalize' }}>
                      {h.status}
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {h.notes} ({h.changed_by})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Transit & Dispatch Logs */}
          {order.delivery?.history && order.delivery.history.length > 0 && (
            <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck size={17} color="var(--amber-primary)" />
                Delivery Transit &amp; Dispatch Logs
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {order.delivery.history.map((dh, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', alignItems: 'flex-start' }}>
                    <div style={{ color: 'var(--text-muted)', minWidth: 140, flexShrink: 0 }}>
                      {new Date(dh.created_at).toLocaleString()}
                    </div>
                    <div style={{ minWidth: 120, flexShrink: 0 }}>
                      <span className={`badge ${
                        dh.to_status === 'delivered' ? 'badge-success' :
                        dh.to_status === 'failed' ? 'badge-danger' :
                        dh.to_status === 'out_for_delivery' ? 'badge-amber' : 'badge-dark'
                      }`} style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                        {dh.to_status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-main)', flex: 1 }}>
                      {dh.notes || 'Status updated'} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({dh.changed_by})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Info Box (Span 4) */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Shipping Address Snapshot */}
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="var(--amber-primary)" />
              Site Delivery Destination
            </h4>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
              <strong>{order.shipping_address_snapshot?.recipient_name}</strong><br />
              {order.shipping_address_snapshot?.address_line1}<br />
              {order.delivery?.site_landmark && (
                <div style={{ margin: '0.25rem 0', color: 'var(--amber-dark)', fontWeight: 600, fontSize: '0.82rem' }}>
                  📍 Landmark: {order.delivery.site_landmark}
                </div>
              )}
              {order.shipping_address_snapshot?.city}, {order.shipping_address_snapshot?.state} - {order.shipping_address_snapshot?.postal_code}<br />
              Phone: {order.shipping_address_snapshot?.phone}
              {order.delivery?.site_contact_name && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.82rem' }}>
                  <strong>Site Supervisor:</strong> {order.delivery.site_contact_name} ({order.delivery.site_contact_phone})
                </div>
              )}
              {order.delivery?.site_access_instructions && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <strong>Access Notes:</strong> {order.delivery.site_access_instructions}
                </div>
              )}
            </div>
          </div>

          {/* Billing & Tax Summary */}
          <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
            <h4 style={{ fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Financial Summary
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span>₹{order.subtotal?.toLocaleString()}</span>
              </div>
              {order.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                  <span>Discount ({order.coupon_code || 'Promo'})</span>
                  <span>-₹{order.discount_amount?.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>GST (18%)</span>
                <span>₹{order.tax_amount?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Freight Fee</span>
                <span>{order.delivery_fee === 0 || !order.delivery_fee ? 'FREE' : `₹${order.delivery_fee}`}</span>
              </div>
              {Number(order.unloading_fee) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Unloading Assistance</span>
                  <span>₹{Number(order.unloading_fee).toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontWeight: 800, fontSize: '1.15rem' }}>
                <span>Total Amount</span>
                <span style={{ color: 'var(--primary)' }}>₹{order.total_amount?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>
              Confirm Order Cancellation
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Cancelling Order #{order.order_number} will release reserved cement/steel inventory back to the warehouse.
            </p>
            <div className="form-group">
              <label className="form-label">Reason for Cancellation *</label>
              <textarea
                rows={3}
                required
                className="form-control"
                placeholder="e.g. Concrete contractor postponed site pour..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => setShowCancelModal(false)}>
                Keep Order
              </button>
              <button className="btn btn-danger" onClick={handleCancelOrder} disabled={cancelling}>
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
