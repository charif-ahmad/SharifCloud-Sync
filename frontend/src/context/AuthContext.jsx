import { createContext, useContext, useState, useEffect } from 'react';
import { authenticate as apiAuthenticate } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sharifcloud_api_key') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!apiKey);
  const [loading, setLoading] = useState(!!apiKey);

  useEffect(() => {
    if (apiKey) {
      apiAuthenticate(apiKey)
        .then(() => {
          setIsAuthenticated(true);
          setLoading(false);
        })
        .catch(() => {
          setApiKey('');
          setIsAuthenticated(false);
          localStorage.removeItem('sharifcloud_api_key');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  function login(key) {
    return apiAuthenticate(key).then((data) => {
      localStorage.setItem('sharifcloud_api_key', key);
      setApiKey(key);
      setIsAuthenticated(true);
      return data;
    });
  }

  function logout() {
    localStorage.removeItem('sharifcloud_api_key');
    setApiKey('');
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ apiKey, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
