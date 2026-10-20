import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('buildmart_token'));
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('buildmart_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.data.user);
        }
      } catch (err) {
        localStorage.removeItem('buildmart_token');
        localStorage.removeItem('buildmart_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token: newToken, user: userData } = res.data.data;
        localStorage.setItem('buildmart_token', newToken);
        localStorage.setItem('buildmart_user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        toast.success(`Welcome back, ${userData.full_name}!`);
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid credentials.';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const register = async (formData) => {
    try {
      const res = await api.post('/auth/register', formData);
      if (res.data.success) {
        const { token: newToken, user: userData } = res.data.data;
        localStorage.setItem('buildmart_token', newToken);
        localStorage.setItem('buildmart_user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        toast.success('Your BuildMart account was created successfully!');
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('buildmart_token');
    localStorage.removeItem('buildmart_user');
    setToken(null);
    setUser(null);
    toast.info('You have been logged out.');
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  const isAdmin = user?.role === 'admin';
  const isContractor = user?.role === 'contractor' || user?.role === 'builder';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAdmin,
        isContractor,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
