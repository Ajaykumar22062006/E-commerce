import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, Search, RefreshCw, X } from 'lucide-react';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

export default function ProductListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 12, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters state from query parameters
  const currentCategory = searchParams.get('category') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentSort = searchParams.get('sortBy') || 'newest';
  const currentInStock = searchParams.get('inStock') === 'true';
  const currentMinPrice = searchParams.get('minPrice') || '';
  const currentMaxPrice = searchParams.get('maxPrice') || '';
  const currentPage = parseInt(searchParams.get('page'), 10) || 1;

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get('/categories');
        if (res.data.success) {
          setCategories(res.data.data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchCategories();
  }, []);

  // Fetch products whenever search params change
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const params = new URLSearchParams(searchParams);
        if (!params.get('limit')) params.set('limit', '12');

        const res = await api.get(`/products?${params.toString()}`);
        if (res.data.success) {
          setProducts(res.data.data.products);
          setPagination(res.data.data.pagination);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [searchParams]);

  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value !== '' && value !== null && value !== undefined) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // reset to page 1 on filter change
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage.toString());
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  return (
    <div className="container" style={{ padding: '2rem 1.25rem 4rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.375rem' }}>Civil Construction Catalog</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
          Showing {pagination.total} construction materials with verified warehouse stock &amp; mill certification.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
        {/* Left Filter Sidebar */}
        <aside style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9375rem' }}>
                <Filter size={16} />
                <span>Filters</span>
              </div>
              {(currentCategory || currentSearch || currentMinPrice || currentMaxPrice || currentInStock) && (
                <button
                  onClick={clearAllFilters}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Reset All
                </button>
              )}
            </div>

            {/* Categories Filter */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ marginBottom: '0.625rem', display: 'block' }}>Categories</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <div
                  onClick={() => updateFilter('category', '')}
                  style={{
                    padding: '0.375rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: !currentCategory ? 700 : 500,
                    backgroundColor: !currentCategory ? 'var(--amber-subtle)' : 'transparent',
                    color: !currentCategory ? 'var(--amber-dark)' : 'var(--text-main)',
                    cursor: 'pointer'
                  }}
                >
                  All Categories
                </div>
                {categories.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => updateFilter('category', c.slug)}
                    style={{
                      padding: '0.375rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      fontWeight: currentCategory === c.slug ? 700 : 500,
                      backgroundColor: currentCategory === c.slug ? 'var(--amber-subtle)' : 'transparent',
                      color: currentCategory === c.slug ? 'var(--amber-dark)' : 'var(--text-main)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{c.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.product_count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div style={{ marginBottom: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <label className="form-label" style={{ marginBottom: '0.625rem', display: 'block' }}>Price Range (₹)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  placeholder="Min"
                  className="form-control"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8125rem' }}
                  value={currentMinPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                />
                <span style={{ color: 'var(--text-muted)' }}>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  className="form-control"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8125rem' }}
                  value={currentMaxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                />
              </div>
            </div>

            {/* In-Stock Only Toggle */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={currentInStock}
                  onChange={(e) => updateFilter('inStock', e.target.checked ? 'true' : '')}
                  style={{ width: 16, height: 16, accentColor: 'var(--amber-primary)' }}
                />
                <span>In-Stock Only</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Right Main Products Column */}
        <main style={{ gridColumn: 'span 9' }}>
          {/* Top Sort & Active Filters Toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: '#ffffff',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {currentSearch && (
                <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Search: "{currentSearch}"
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => updateFilter('search', '')} />
                </span>
              )}
              {currentCategory && (
                <span className="badge badge-dark" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  Category: {categories.find((c) => c.slug === currentCategory)?.name || currentCategory}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => updateFilter('category', '')} />
                </span>
              )}
            </div>

            {/* Sorting Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sort By:</label>
              <select
                className="form-control"
                style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                value={currentSort}
                onChange={(e) => updateFilter('sortBy', e.target.value)}
              >
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Customer Rating</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Retrieving construction materials...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#ffffff' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Matching Materials Found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
                Try adjusting your search criteria, price range or category filter.
              </p>
              <button onClick={clearAllFilters} className="btn btn-outline">
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '3rem' }}>
              <button
                className="btn btn-outline btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Previous
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  className={`btn btn-sm ${pg === pagination.page ? 'btn-primary' : 'btn-outline'}`}
                  style={{ minWidth: 36 }}
                  onClick={() => handlePageChange(pg)}
                >
                  {pg}
                </button>
              ))}
              <button
                className="btn btn-outline btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
