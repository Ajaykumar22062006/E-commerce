import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, Award, FileText, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--primary)', color: '#ffffff', marginTop: '4rem', borderTop: '4px solid var(--amber-primary)' }}>
      {/* Value Badges Banner */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '2.5rem 0', backgroundColor: 'var(--primary-dark)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={24} color="var(--amber-primary)" />
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.25rem' }}>100% Genuine Materials</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Direct from manufacturer plants with batch test certificates.</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Truck size={24} color="var(--amber-primary)" />
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.25rem' }}>Direct Site Tipper Delivery</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Heavy vehicles, flatbed trailers &amp; dedicated site unloading.</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={24} color="var(--amber-primary)" />
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.25rem' }}>Instant GST Invoicing</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Claim 100% ITC tax input credits on commercial projects.</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Award size={24} color="var(--amber-primary)" />
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '0.25rem' }}>Contractor Volume Pricing</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>Tiered discounts and credit facilities for registered builders.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container" style={{ padding: '3.5rem 1.25rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2.5rem' }}>
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffffff' }}>BUILD</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--amber-primary)' }}>MART</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              India's specialized civil construction materials platform providing certified cement, steel TMT bars, bricks, and aggregates with guaranteed logistics.
            </p>
            <div style={{ fontSize: '0.8125rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={16} color="var(--amber-primary)" />
                <span>BuildMart Logistics Core, Connaught Place, New Delhi 110001</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={16} color="var(--amber-primary)" />
                <span>+91 98765 00001 / +91 11 2345 6789</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={16} color="var(--amber-primary)" />
                <span>orders@buildmart.com</span>
              </div>
            </div>
          </div>

          {/* Construction Materials */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--amber-primary)', paddingBottom: '0.375rem', display: 'inline-block' }}>
              Civil Categories
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              <li><Link to="/products?category=cement" style={{ color: 'inherit' }}>OPC &amp; PPC Cement (50kg Bags)</Link></li>
              <li><Link to="/products?category=steel-tmt-bars" style={{ color: 'inherit' }}>Tata Tiscon &amp; JSW Fe 550D TMT</Link></li>
              <li><Link to="/products?category=bricks-blocks" style={{ color: 'inherit' }}>AAC Lightweight Blocks &amp; Red Bricks</Link></li>
              <li><Link to="/products?category=sand-aggregates" style={{ color: 'inherit' }}>Zone II M-Sand &amp; 20mm Blue Metal</Link></li>
              <li><Link to="/products?category=paints-coatings" style={{ color: 'inherit' }}>Weatherproof Emulsions &amp; 2K Waterproofing</Link></li>
              <li><Link to="/products?category=tools-equipment" style={{ color: 'inherit' }}>Demolition Hammers &amp; Wheelbarrows</Link></li>
            </ul>
          </div>

          {/* Builder & Contractor Services */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--amber-primary)', paddingBottom: '0.375rem', display: 'inline-block' }}>
              Contractor Desk
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              <li><Link to="/products" style={{ color: 'inherit' }}>Volume Price Discount Tiers</Link></li>
              <li><Link to="/account" style={{ color: 'inherit' }}>Contractor Account Registration</Link></li>
              <li><Link to="/cart" style={{ color: 'inherit' }}>Delivery PIN Code Checker</Link></li>
              <li><Link to="/account" style={{ color: 'inherit' }}>Download GST Tax Invoices</Link></li>
              <li><Link to="/account" style={{ color: 'inherit' }}>Reorder Past Project Materials</Link></li>
            </ul>
          </div>

          {/* Legal & Policies */}
          <div>
            <h4 style={{ color: '#ffffff', fontSize: '1rem', marginBottom: '1.25rem', borderBottom: '2px solid var(--amber-primary)', paddingBottom: '0.375rem', display: 'inline-block' }}>
              Safety &amp; Compliance
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem', color: '#94a3b8' }}>
              <li><span>IS 269:2015 Cement Standard Quality</span></li>
              <li><span>IS 1786:2008 Rebar Yield Certified</span></li>
              <li><span>Razorpay 256-bit Encrypted Checkout</span></li>
              <li><span>Site Unloading Transit Liability Covered</span></li>
              <li><span>Cancellation &amp; Refund Policy</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '2.5rem', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem', color: '#64748b' }}>
          <div>
            © {new Date().getFullYear()} BuildMart Technologies India Ltd. All Rights Reserved. CIN: U52100DL2026PLC098765.
          </div>
          <div>
            Payment Partners: Razorpay • UPI (GPay/PhonePe) • NetBanking • Cash on Delivery
          </div>
        </div>
      </div>
    </footer>
  );
}
