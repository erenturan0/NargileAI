import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const API_URL = 'http://localhost:3001/api/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('nargile-token'));
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isGuest = !user;

  // Verify existing token on mount
  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('nargile-token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    localStorage.setItem('nargile-token', data.token);
    setToken(data.token);
    setUser(data.user);
    setShowAuthModal(false);
    return data.user;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    localStorage.setItem('nargile-token', data.token);
    setToken(data.token);
    setUser(data.user);
    setShowAuthModal(false);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('nargile-token');
    localStorage.removeItem('nargile-conversations');
    localStorage.removeItem('nargile-active-id');
    setToken(null);
    setUser(null);
  }, []);

  const upgradePlan = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/upgrade`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error("Yükseltme hatası:", err);
    }
  }, [token]);

  const value = {
    user, token, isGuest, loading,
    showAuthModal, setShowAuthModal,
    login, register, logout, upgradePlan,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
