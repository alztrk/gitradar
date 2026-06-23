import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('gitradar_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API}/api/me`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(u => { if (u) setUser(u); else { localStorage.removeItem('gitradar_token'); setToken(null); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  // Check URL for OAuth token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) {
      localStorage.setItem('gitradar_token', t);
      setToken(t);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const login = useCallback(() => { window.location.href = `${API}/auth/github`; }, []);
  const logout = useCallback(async () => {
    await fetch(`${API}/api/logout`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    localStorage.removeItem('gitradar_token');
    setToken(null);
    setUser(null);
  }, [token]);

  const authFetch = useCallback((url, opts = {}) => {
    return fetch(`${API}${url}`, { ...opts, headers: { ...opts.headers, 'Authorization': `Bearer ${token}` } });
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authFetch, apiUrl: API }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
