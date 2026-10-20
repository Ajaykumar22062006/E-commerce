import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = new URLSearchParams(location.search).get('redirect') || '/';

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
    company_name: '',
    gstin: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await register(formData);
    setLoading(false);
    if (res?.success) {
      navigate(redirectPath);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 1.25rem 6rem', maxWidth: 540 }}>
      <div className="card" style={{ padding: '2.5rem', backgroundColor: '#ffffff' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: 'var(--amber-subtle)',
            color: 'var(--amber-dark)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem'
          }}>
            <UserPlus size={24} />
          </div>
          <h1 style={{ fontSize: '1.65rem', marginBottom: '0.25rem' }}>Create BuildMart Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Direct manufacturer pricing for civil contractors &amp; home builders.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Account Role Selector */}
          <div className="form-group">
            <label className="form-label">Account Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {['customer', 'contractor', 'builder'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: r })}
                  style={{
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: formData.role === r ? '2px solid var(--amber-primary)' : '1px solid var(--border-strong)',
                    backgroundColor: formData.role === r ? 'var(--amber-subtle)' : '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    textTransform: 'capitalize',
                    cursor: 'pointer'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              className="form-control"
              placeholder="e.g. Rajesh Sharma"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              required
              className="form-control"
              placeholder="sharma@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              className="form-control"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number (Site Dispatch OTP)</label>
            <input
              type="tel"
              className="form-control"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          {(formData.role === 'contractor' || formData.role === 'builder') && (
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '1rem', borderRadius: 8, marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
              <div className="form-group">
                <label className="form-label">Company / Firm Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Apex Civil Infra LLP"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">GSTIN (For Tax Invoices)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="07AAAAA0000A1Z5"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Complete Registration'}
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already registered?{' '}
          <Link to={`/login?redirect=${encodeURIComponent(redirectPath)}`} style={{ color: 'var(--amber-dark)', fontWeight: 700 }}>
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
