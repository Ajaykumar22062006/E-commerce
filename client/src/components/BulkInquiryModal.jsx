import React, { useState } from 'react';
import { X, Truck, Building2, Send, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function BulkInquiryModal({ isOpen, onClose, preselectedProduct = null }) {
  const { user } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    customer_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company_name: user?.company_name || '',
    product_id: preselectedProduct?.id || 1,
    estimated_quantity: 50,
    unit_of_measure: preselectedProduct?.unit_of_measure || 'bag (50kg)',
    delivery_pincode: '201301',
    project_details: ''
  });

  const [loading, setLoading] = useState(false);
  const [submittedInquiry, setSubmittedInquiry] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/bulk-inquiries', formData);
      if (res.data.success) {
        setSubmittedInquiry(res.data.data.inquiry_number);
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit bulk enquiry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620 }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'var(--amber-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={22} color="var(--amber-dark)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Contractor Bulk Quotation (RFQ)</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>Direct mill-gate pricing for high-volume commercial projects</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {submittedInquiry ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'var(--success-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircle size={36} color="var(--success)" />
            </div>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>RFQ Submitted Successfully!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '1.25rem' }}>
              Your inquiry reference number is <strong style={{ color: 'var(--primary)' }}>{submittedInquiry}</strong>.
            </p>
            <div style={{ backgroundColor: 'var(--bg-subtle)', borderRadius: 10, padding: '1rem', fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: '1.5rem', textAlign: 'left' }}>
              ✓ Direct factory dispatches from manufacturer cement & steel mills<br />
              ✓ Includes dedicated site logistics coordinator & dump truck unloading<br />
              ✓ Formal GST Proforma invoice issued within 4 business hours
            </div>
            <button className="btn btn-primary" onClick={onClose}>
              Done & Return
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Company / Firm Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Apex Civil Infra Ltd"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  className="form-control"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Estimated Quantity *</label>
                <input
                  type="number"
                  min="5"
                  required
                  className="form-control"
                  value={formData.estimated_quantity}
                  onChange={(e) => setFormData({ ...formData, estimated_quantity: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Delivery PIN Code *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  className="form-control"
                  value={formData.delivery_pincode}
                  onChange={(e) => setFormData({ ...formData, delivery_pincode: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Project Details & Delivery Schedule</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Mention expected delivery date, site access constraints (e.g. flatbed trailer or 10-wheeler allowed), and required test certificates."
                value={formData.project_details}
                onChange={(e) => setFormData({ ...formData, project_details: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Submitting...' : 'Request Mill-Gate Quote'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
