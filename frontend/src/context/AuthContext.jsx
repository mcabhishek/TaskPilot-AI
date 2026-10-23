import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('taskpilot_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.getMe();
        setUser(data.user);
      } catch (err) {
        console.error('Failed to verify token:', err);
        localStorage.removeItem('taskpilot_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    localStorage.setItem('taskpilot_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await api.register(name, email, password);
    localStorage.setItem('taskpilot_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const demoLogin = async () => {
    const data = await api.demoLogin();
    localStorage.setItem('taskpilot_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('taskpilot_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, demoLogin, logout, setUser }}>
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
