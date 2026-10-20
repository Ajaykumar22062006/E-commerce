import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [cart, setCart] = useState({
    items: [],
    items_count: 0,
    subtotal: 0
  });
  const [loading, setLoading] = useState(false);

  // Fetch cart from backend when user is authenticated
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.get('/cart');
      if (res.data.success) {
        setCart(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      // Guest local storage cart
      const saved = localStorage.getItem('buildmart_guest_cart');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCart(parsed);
        } catch (e) {
          // ignore error
        }
      } else {
        setCart({ items: [], items_count: 0, subtotal: 0 });
      }
    }
  }, [isAuthenticated, fetchCart]);

  const addToCart = async (product, quantity = 1) => {
    const qty = parseInt(quantity, 10) || 1;

    if (isAuthenticated) {
      try {
        const res = await api.post('/cart/items', {
          product_id: product.id,
          quantity: qty
        });
        if (res.data.success) {
          setCart(res.data.data);
          toast.success(`Added ${qty} × ${product.name} to cart`);
          return true;
        }
      } catch (err) {
        const msg = err.response?.data?.message || 'Could not add item to cart.';
        toast.error(msg);
        return false;
      }
    } else {
      // Guest cart logic
      setCart((prev) => {
        const existingIdx = prev.items.findIndex((item) => item.product_id === product.id);
        let newItems = [...prev.items];

        const unitPrice = parseFloat((product.unit_price * (1 - (product.discount_percent || 0) / 100)).toFixed(2));

        if (existingIdx >= 0) {
          const newQty = newItems[existingIdx].quantity + qty;
          newItems[existingIdx] = {
            ...newItems[existingIdx],
            quantity: newQty,
            line_total: parseFloat((unitPrice * newQty).toFixed(2))
          };
        } else {
          newItems.push({
            cart_item_id: `guest_${Date.now()}`,
            product_id: product.id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            brand: product.brand,
            unit_of_measure: product.unit_of_measure,
            unit_price: product.unit_price,
            effective_unit_price: unitPrice,
            quantity: qty,
            line_total: parseFloat((unitPrice * qty).toFixed(2)),
            stock_quantity: product.stock_quantity,
            is_heavy_bulk: product.is_heavy_bulk,
            image_url: product.primary_image || (product.images && product.images[0]?.image_url)
          });
        }

        const totalCount = newItems.reduce((acc, it) => acc + it.quantity, 0);
        const subtotal = newItems.reduce((acc, it) => acc + it.line_total, 0);

        const updated = {
          items: newItems,
          items_count: totalCount,
          subtotal: parseFloat(subtotal.toFixed(2))
        };

        localStorage.setItem('buildmart_guest_cart', JSON.stringify(updated));
        toast.success(`Added ${qty} × ${product.name} to cart`);
        return updated;
      });
      return true;
    }
  };

  const updateQuantity = async (cartItemId, newQty, productId) => {
    if (isAuthenticated) {
      try {
        const res = await api.put(`/cart/items/${cartItemId}`, { quantity: newQty });
        if (res.data.success) {
          setCart(res.data.data);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to update quantity.');
      }
    } else {
      setCart((prev) => {
        let newItems;
        if (newQty <= 0) {
          newItems = prev.items.filter((it) => it.product_id !== productId && it.cart_item_id !== cartItemId);
        } else {
          newItems = prev.items.map((it) => {
            if (it.product_id === productId || it.cart_item_id === cartItemId) {
              return {
                ...it,
                quantity: newQty,
                line_total: parseFloat((it.effective_unit_price * newQty).toFixed(2))
              };
            }
            return it;
          });
        }

        const totalCount = newItems.reduce((acc, it) => acc + it.quantity, 0);
        const subtotal = newItems.reduce((acc, it) => acc + it.line_total, 0);

        const updated = {
          items: newItems,
          items_count: totalCount,
          subtotal: parseFloat(subtotal.toFixed(2))
        };

        localStorage.setItem('buildmart_guest_cart', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const removeItem = async (cartItemId, productId) => {
    if (isAuthenticated) {
      try {
        const res = await api.delete(`/cart/items/${cartItemId}`);
        if (res.data.success) {
          setCart(res.data.data);
          toast.info('Item removed from cart');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to remove item.');
      }
    } else {
      setCart((prev) => {
        const newItems = prev.items.filter((it) => it.product_id !== productId && it.cart_item_id !== cartItemId);
        const totalCount = newItems.reduce((acc, it) => acc + it.quantity, 0);
        const subtotal = newItems.reduce((acc, it) => acc + it.line_total, 0);

        const updated = {
          items: newItems,
          items_count: totalCount,
          subtotal: parseFloat(subtotal.toFixed(2))
        };

        localStorage.setItem('buildmart_guest_cart', JSON.stringify(updated));
        toast.info('Item removed from cart');
        return updated;
      });
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await api.delete('/cart');
      } catch (e) {
        // ignore
      }
    }
    localStorage.removeItem('buildmart_guest_cart');
    setCart({ items: [], items_count: 0, subtotal: 0 });
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        items: cart.items || [],
        itemsCount: cart.items_count || 0,
        subtotal: cart.subtotal || 0,
        loading,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart: fetchCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
