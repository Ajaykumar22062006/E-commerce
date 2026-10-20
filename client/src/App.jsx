import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ConstructionCalculatorModal from './components/ConstructionCalculatorModal';
import BulkInquiryModal from './components/BulkInquiryModal';

import HomePage from './pages/HomePage';
import ProductListingPage from './pages/ProductListingPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import AccountPage from './pages/AccountPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import DeliveryPartnerPage from './pages/DeliveryPartnerPage';

function AppContent() {
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar
        onOpenCalculator={() => setCalculatorOpen(true)}
        onOpenBulkModal={() => setBulkModalOpen(true)}
      />

      <main style={{ flex: 1 }}>
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                onOpenCalculator={() => setCalculatorOpen(true)}
                onOpenBulkModal={() => setBulkModalOpen(true)}
              />
            }
          />
          <Route path="/products" element={<ProductListingPage />} />
          <Route
            path="/products/:slug"
            element={<ProductDetailPage onOpenBulkModal={() => setBulkModalOpen(true)} />}
          />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders/:id/confirmed" element={<OrderConfirmationPage />} />
          <Route path="/orders/:id" element={<OrderConfirmationPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/delivery-portal" element={<DeliveryPartnerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />

      {/* Global Modals */}
      <ConstructionCalculatorModal
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
      />

      <BulkInquiryModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <AppContent />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}
