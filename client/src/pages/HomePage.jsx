import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Truck, ShieldCheck, Award, ArrowRight, CheckCircle2, 
  MapPin, Calculator, Layers, Package, PhoneCall, ChevronRight, Star
} from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import { useToast } from '../context/ToastContext';

export default function HomePage({ onOpenCalculator, onOpenBulkModal }) {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const [catRes, featRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products/featured')
        ]);
        if (catRes.data.success) setCategories(catRes.data.data);
        if (featRes.data.success) setFeaturedProducts(featRes.data.data);
      } catch (e) {
        console.error('Failed to load homepage data:', e);
      }
    }
    loadData();
  }, []);

  const handlePincodeCheck = async (e) => {
    e.preventDefault();
    if (!pincodeInput || pincodeInput.trim().length < 6) {
      toast.info('Please enter a valid 6-digit delivery PIN code.');
      return;
    }

    setPincodeLoading(true);
    try {
      const res = await api.get(`/service-areas/check/${pincodeInput.trim()}`);
      setPincodeResult(res.data);
    } catch (e) {
      toast.error('Unable to verify PIN code right now.');
    } finally {
      setPincodeLoading(false);
    }
  };

  return (
    <div>
      {/* 1. Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        padding: '4.5rem 0 3.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 450,
          height: 450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              color: 'var(--amber-primary)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              marginBottom: '1.25rem',
              letterSpacing: 0.5
            }}>
              <ShieldCheck size={16} />
              FACTORY-CERTIFIED CIVIL INFRASTRUCTURE MATERIALS
            </div>

            <h1 style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.15,
              marginBottom: '1.25rem',
              letterSpacing: '-0.02em'
            }}>
              Direct-from-Mill <br />
              <span style={{ color: 'var(--amber-primary)' }}>Civil Construction</span> Materials
            </h1>

            <p style={{
              fontSize: '1.125rem',
              color: '#94a3b8',
              lineHeight: 1.6,
              marginBottom: '2rem',
              maxWidth: 540
            }}>
              Order genuine UltraTech cement, Tata Tiscon Fe 550D TMT rebar rods, kiln bricks, and aggregates delivered straight to your site with live tracking and tipper unloading.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
              <Link to="/products" className="btn btn-primary btn-lg">
                Explore Products Catalog
                <ArrowRight size={18} />
              </Link>
              <button onClick={onOpenBulkModal} className="btn btn-outline btn-lg" style={{ color: '#ffffff', borderColor: '#475569' }}>
                <Truck size={18} color="var(--amber-primary)" />
                Contractor Bulk RFQ
              </button>
            </div>

            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>50,000+</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tonnes Delivered</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--amber-primary)' }}>100%</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>BIS &amp; IS Certified</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>24-48 Hrs</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Guaranteed Dispatch</div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Interactive Pincode & Quick Estimator Card */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            backdropFilter: 'blur(10px)',
            boxShadow: 'var(--shadow-xl)'
          }}>
            <h3 style={{ color: '#ffffff', fontSize: '1.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={20} color="var(--amber-primary)" />
              Check Site Logistics Availability
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Verify whether our heavy tipper trucks and flatbed trailers can service your project postal PIN code:
            </p>

            <form onSubmit={handlePincodeCheck} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <input
                type="text"
                placeholder="Enter 6-digit PIN code (e.g. 110001, 201301)"
                maxLength={6}
                value={pincodeInput}
                onChange={(e) => {
                  setPincodeInput(e.target.value);
                  setPincodeResult(null);
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #475569',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.9375rem',
                  outline: 'none'
                }}
              />
              <button type="submit" className="btn btn-primary" disabled={pincodeLoading}>
                {pincodeLoading ? 'Checking...' : 'Check'}
              </button>
            </form>

            {/* Pincode response widget */}
            {pincodeResult && (
              <div style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: pincodeResult.serviceable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${pincodeResult.serviceable ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                marginBottom: '1.5rem',
                fontSize: '0.85rem'
              }}>
                {pincodeResult.serviceable ? (
                  <div>
                    <div style={{ color: '#34d399', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={16} />
                      Direct Delivery Available in {pincodeResult.data?.city}!
                    </div>
                    <div style={{ color: '#e2e8f0', fontSize: '0.8rem' }}>
                      • Estimated Transit: <strong>{pincodeResult.data?.estimated_days} business day(s)</strong><br />
                      • Heavy Commercial Tippers: <strong>{pincodeResult.data?.heavy_vehicle_allowed ? 'Allowed' : 'Restricted (Small pickup only)'}</strong><br />
                      • Free Delivery Threshold: <strong>₹{pincodeResult.data?.free_delivery_threshold?.toLocaleString()}</strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: '#fca5a5' }}>
                    {pincodeResult.message}
                  </div>
                )}
              </div>
            )}

            {/* Quick Civil Calculator Teaser */}
            <div style={{
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9rem' }}>Civil Materials Estimator</div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Calculate exact cement bags, steel tonnage &amp; bricks.</div>
              </div>
              <button onClick={onOpenCalculator} className="btn btn-outline btn-sm" style={{ color: 'var(--amber-primary)', borderColor: 'var(--amber-primary)' }}>
                <Calculator size={14} />
                Calculate
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Construction Categories Grid */}
      <section style={{ padding: '4rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <span className="badge badge-amber" style={{ marginBottom: '0.5rem' }}>CATEGORIES</span>
              <h2 style={{ fontSize: '1.85rem' }}>Procure by Civil Category</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Standardized construction materials sourced from top-tier certified manufacturers.</p>
            </div>
            <Link to="/products" style={{ color: 'var(--amber-dark)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              View Complete Catalog <ChevronRight size={16} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/products?category=${cat.slug}`}
                className="card card-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  textDecoration: 'none',
                  backgroundColor: '#ffffff'
                }}
              >
                <div style={{ height: 130, position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={cat.image_url || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400'}
                    alt={cat.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(15,23,42,0.8) 0%, rgba(15,23,42,0) 60%)'
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 12,
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '1rem'
                  }}>
                    {cat.name}
                  </div>
                </div>

                <div style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {cat.product_count} items available
                  </span>
                  <span style={{ color: 'var(--amber-primary)', fontWeight: 700, fontSize: '0.8125rem' }}>
                    Shop →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Featured & High Demand Materials */}
      <section style={{ padding: '3.5rem 0 4.5rem', backgroundColor: 'var(--bg-subtle)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <span className="badge badge-dark" style={{ marginBottom: '0.5rem' }}>HIGH-DEMAND STOCKS</span>
              <h2 style={{ fontSize: '1.85rem' }}>Featured Construction Materials</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>Ready inventory in warehouse hubs with rapid dispatch availability.</p>
            </div>
            <Link to="/products" className="btn btn-outline btn-sm">
              All Products ({featuredProducts.length}+)
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1.5rem' }}>
            {featuredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Contractor Bulk Order Promotion Banner */}
      <section style={{ padding: '4rem 0' }}>
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 2.5rem',
            color: '#ffffff',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2.5rem',
            alignItems: 'center',
            boxShadow: 'var(--shadow-xl)',
            borderLeft: '8px solid var(--amber-primary)'
          }}>
            <div>
              <span className="badge badge-amber" style={{ marginBottom: '1rem' }}>FOR CONTRACTORS &amp; BUILDERS</span>
              <h2 style={{ color: '#ffffff', fontSize: '2rem', marginBottom: '1rem', lineHeight: 1.25 }}>
                Planning a Multi-Story Pour or Commercial Project?
              </h2>
              <p style={{ color: '#cbd5e1', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Lock in manufacturer mill-gate prices with direct factory dispatches. Get customized credit terms, bulk discounts up to 15%, and scheduled tipper deliveries.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                <button onClick={onOpenBulkModal} className="btn btn-primary btn-lg">
                  Submit Bulk Quote Request (RFQ)
                  <ArrowRight size={18} />
                </button>
                <Link to="/register" className="btn btn-outline btn-lg" style={{ color: '#ffffff', borderColor: '#475569' }}>
                  Register as Contractor
                </Link>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: '1.75rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ color: 'var(--amber-primary)', fontSize: '1.05rem', marginBottom: '1rem' }}>Contractor Benefits:</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: '#e2e8f0' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="var(--amber-primary)" />
                  <span>Volume tier discounts on cement bags &amp; steel rebars</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="var(--amber-primary)" />
                  <span>Mill test certificates &amp; NABL lab compliance reports</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="var(--amber-primary)" />
                  <span>Priority site dispatch with heavy tipper access</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} color="var(--amber-primary)" />
                  <span>GST invoicing with 100% verifiable tax input credits</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
