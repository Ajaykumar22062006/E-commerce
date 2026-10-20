import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = new URLSearchParams(location.search).get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res?.success) {
      navigate(redirectPath);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoading(true);
    const res = await login(demoEmail, demoPass);
    setLoading(false);
    if (res?.success) {
      navigate(redirectPath);
    }
  };

  return (
    <div className="container" style={{ padding: '4rem 1.25rem 6rem', maxWidth: 480 }}>
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
            <Lock size={24} />
          </div>
          <h1 style={{ fontSize: '1.65rem', marginBottom: '0.25rem' }}>Sign In to BuildMart</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Access saved site addresses, orders, and contractor pricing.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              required
              className="form-control"
              placeholder="contractor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Demo Fast Login Buttons */}
        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '2rem', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.75rem', letterSpacing: 0.5 }}>
            ONE-CLICK DEMO TEST LOGINS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ justifyContent: 'space-between', fontSize: '0.8125rem' }}
              onClick={() => handleDemoLogin('admin@buildmart.com', 'Admin@BuildMart2026!')}
            >
              <span>🔑 <strong>Administrator</strong> (Full Operations)</span>
              <span style={{ color: 'var(--amber-dark)', fontSize: '0.75rem' }}>Click to Login</span>
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ justifyContent: 'space-between', fontSize: '0.8125rem' }}
              onClick={() => handleDemoLogin('delivery@buildmart.com', 'Delivery@2026!')}
            >
              <span>🚚 <strong>Delivery Driver</strong> (Suresh Kumar)</span>
              <span style={{ color: 'var(--amber-dark)', fontSize: '0.75rem' }}>Click to Login</span>
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ justifyContent: 'space-between', fontSize: '0.8125rem' }}
              onClick={() => handleDemoLogin('contractor@sharma-constructions.com', 'Contractor@2026!')}
            >
              <span>🏗️ <strong>Contractor</strong> (Sharma Infra)</span>
              <span style={{ color: 'var(--amber-dark)', fontSize: '0.75rem' }}>Click to Login</span>
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ justifyContent: 'space-between', fontSize: '0.8125rem' }}
              onClick={() => handleDemoLogin('customer@example.com', 'Customer@2026!')}
            >
              <span>👤 <strong>Individual Builder</strong> (Ananya)</span>
              <span style={{ color: 'var(--amber-dark)', fontSize: '0.75rem' }}>Click to Login</span>
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to={`/register?redirect=${encodeURIComponent(redirectPath)}`} style={{ color: 'var(--amber-dark)', fontWeight: 700 }}>
            Register Now
          </Link>
        </div>
      </div>
    </div>
  );
}
