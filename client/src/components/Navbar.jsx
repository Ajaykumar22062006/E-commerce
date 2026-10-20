import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, ShoppingCart, Heart, User, MapPin, Calculator, 
  Truck, ShieldCheck, ChevronDown, Menu, X, LogOut, LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import api from '../services/api';

export default function Navbar({ onOpenCalculator, onOpenBulkModal }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemsCount, subtotal } = useCart();
  const { wishlistCount } = useWishlist();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  // Fetch categories
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.get('/categories');
        if (res.data.success) {
          setCategories(res.data.data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadCategories();
  }, []);

  // Search auto-suggest
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const delay = setTimeout(async () => {
        try {
          const res = await api.get(`/products?search=${encodeURIComponent(searchQuery)}&limit=5`);
          if (res.data.success) {
            setSearchSuggestions(res.data.data.products);
            setShowSuggestions(true);
          }
        } catch (e) {
          // ignore
        }
      }, 250);
      return () => clearTimeout(delay);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#ffffff', boxShadow: 'var(--shadow-sm)' }}>
      {/* 1. Announcement bar */}
      <div style={{ backgroundColor: 'var(--primary)', color: '#ffffff', fontSize: '0.78rem', padding: '0.4rem 0', fontWeight: 500 }}>
        <div className="container flex items-center justify-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span>🚚 Free Site Delivery on Orders &gt; ₹5,000</span>
            <span style={{ display: 'none', md: 'inline' }}>⚡ Mill-Gate Certified Cement &amp; TMT Rebars</span>
            <span>📑 Instant GST Input Credit Invoicing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: 'var(--amber-primary)', fontWeight: 600 }}>Support: +91 98765 00001</span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <div style={{ borderBottom: '1px solid var(--border-color)', padding: '0.875rem 0' }}>
        <div className="container flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '2px solid var(--primary)',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ color: 'var(--amber-primary)', fontSize: '1.45rem', fontWeight: 900 }}>B</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)' }}>BUILD</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--amber-primary)', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)' }}>MART</span>
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: -4 }}>
                Civil Construction Marketplace
              </div>
            </div>
          </Link>

          {/* Search bar with instant auto-suggestions */}
          <div ref={searchRef} style={{ flex: 1, maxWidth: 560, position: 'relative' }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search UltraTech Cement, Tata Tiscon 12mm, Bricks, M-Sand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                style={{
                  width: '100%',
                  padding: '0.6875rem 1rem 0.6875rem 2.5rem',
                  fontSize: '0.9375rem',
                  borderRadius: 'var(--radius-full)',
                  border: '2px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-subtle)',
                  outline: 'none',
                  transition: 'var(--transition)'
                }}
              />
              <Search
                size={18}
                style={{ position: 'absolute', left: '0.875rem', color: 'var(--text-muted)' }}
              />
              <button
                type="submit"
                style={{
                  position: 'absolute',
                  right: 4,
                  backgroundColor: 'var(--amber-primary)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.45rem 1rem',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  color: 'var(--primary)'
                }}
              >
                Search
              </button>
            </form>

            {/* Auto-suggest dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-xl)',
                border: '1px solid var(--border-color)',
                marginTop: 6,
                zIndex: 200,
                overflow: 'hidden'
              }}>
                <div style={{ padding: '0.5rem 0.875rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', backgroundColor: 'var(--bg-subtle)' }}>
                  MATCHING CIVIL MATERIALS
                </div>
                {searchSuggestions.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setShowSuggestions(false);
                      setSearchQuery('');
                      navigate(`/products/${p.slug}`);
                    }}
                    style={{
                      padding: '0.625rem 0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    <img
                      src={p.primary_image || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=100'}
                      alt={p.name}
                      style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.category_name} • SKU: {p.sku}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>
                        ₹{p.effective_price}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        per {p.unit_of_measure}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Tools & Shortcuts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <button
              onClick={onOpenCalculator}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--primary)', borderColor: 'var(--border-strong)' }}
            >
              <Calculator size={15} color="var(--amber-hover)" />
              <span>Civil Estimator</span>
            </button>

            <button
              onClick={onOpenBulkModal}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <Truck size={15} />
              <span>Bulk RFQ</span>
            </button>

            {/* Wishlist */}
            <Link
              to="/account?tab=wishlist"
              style={{
                position: 'relative',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Saved Materials"
            >
              <Heart size={22} />
              {wishlistCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: 'var(--danger)',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  width: 17,
                  height: 17,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Button */}
            <Link
              to="/cart"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                textDecoration: 'none',
                color: 'var(--text-main)'
              }}
            >
              <div style={{ position: 'relative' }}>
                <ShoppingCart size={20} color="var(--primary)" />
                {itemsCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -6,
                    right: -8,
                    backgroundColor: 'var(--amber-primary)',
                    color: 'var(--primary)',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {itemsCount}
                  </span>
                )}
              </div>
              <div style={{ display: 'none', md: 'block' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1 }}>Cart</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.2 }}>₹{subtotal.toLocaleString()}</div>
              </div>
            </Link>

            {/* User Account / Auth Dropdown */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              {isAuthenticated ? (
                <div>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      background: 'none',
                      border: '1px solid var(--border-color)',
                      padding: '0.45rem 0.65rem',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: isAdmin ? 'var(--amber-primary)' : 'var(--primary)',
                      color: isAdmin ? 'var(--primary)' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.8rem'
                    }}>
                      {user.full_name?.charAt(0) || 'U'}
                    </div>
                    <ChevronDown size={14} color="var(--text-muted)" />
                  </button>

                  {userMenuOpen && (
                    <div style={{
                      position: 'absolute',
                      right: 0,
                      top: '100%',
                      marginTop: 8,
                      width: 220,
                      backgroundColor: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-xl)',
                      border: '1px solid var(--border-color)',
                      zIndex: 300,
                      overflow: 'hidden'
                    }}>
                      <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>{user.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                        <div style={{ marginTop: 4 }}>
                          <span className={`badge ${isAdmin ? 'badge-amber' : 'badge-dark'}`} style={{ fontSize: '0.65rem' }}>
                            {user.role}
                          </span>
                        </div>
                      </div>

                      <div style={{ padding: '0.375rem 0' }}>
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.625rem',
                              padding: '0.625rem 1rem',
                              fontSize: '0.875rem',
                              color: 'var(--amber-dark)',
                              fontWeight: 600
                            }}
                          >
                            <LayoutDashboard size={16} />
                            Admin Operations
                          </Link>
                        )}
                        {(user.role === 'delivery_personnel' || isAdmin) && (
                          <Link
                            to="/delivery-portal"
                            onClick={() => setUserMenuOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.625rem',
                              padding: '0.625rem 1rem',
                              fontSize: '0.875rem',
                              color: 'var(--amber-dark)',
                              fontWeight: 600
                            }}
                          >
                            <Truck size={16} />
                            Fleet Delivery Portal
                          </Link>
                        )}
                        <Link
                          to="/account"
                          onClick={() => setUserMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            padding: '0.625rem 1rem',
                            fontSize: '0.875rem',
                            color: 'var(--text-main)'
                          }}
                        >
                          <User size={16} />
                          My Account &amp; Orders
                        </Link>
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            padding: '0.625rem 1rem',
                            fontSize: '0.875rem',
                            color: 'var(--danger)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Link to="/login" className="btn btn-outline btn-sm">
                    Log In
                  </Link>
                  <Link to="/register" className="btn btn-dark btn-sm">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Category navigation ribbon */}
      <nav style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0.5rem 1.25rem' }}>
          <Link
            to="/products"
            style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <span>All Construction Catalog</span>
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/products?category=${c.slug}`}
              style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-main)', padding: '0.2rem 0' }}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
