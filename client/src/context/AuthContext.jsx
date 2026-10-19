import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  /**
   * Restores authenticated session on initial application load
   * Calls GET /api/auth/me using credentials in httpOnly cookies
   */
  const checkSession = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await authApi.getMe();
      if (res?.success && res.data) {
        setUser(res.data.user);
        setOrganization(res.data.organization);
      } else {
        setUser(null);
        setOrganization(null);
      }
    } catch (err) {
      // 401 or network failure means no active session
      setUser(null);
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * Authenticates user and updates verified context
   */
  const login = async (credentials) => {
    setAuthError(null);
    try {
      const res = await authApi.login(credentials);
      if (res?.success && res.data) {
        setUser(res.data.user);
        setOrganization(res.data.organization);
        return { success: true };
      }
      throw new Error('Malformed login response');
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
      throw err;
    }
  };

  /**
   * Registers a new organization and root Org Admin account
   */
  const register = async (registrationData) => {
    setAuthError(null);
    try {
      const res = await authApi.register(registrationData);
      if (res?.success && res.data) {
        setUser(res.data.user);
        setOrganization(res.data.organization);
        return { success: true };
      }
      throw new Error('Malformed registration response');
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
      throw err;
    }
  };

  /**
   * Calls backend logout, invalidates tokenVersion in DB, clears state
   */
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('[Logout Notice] Server-side logout warning:', err.message);
    } finally {
      setUser(null);
      setOrganization(null);
    }
  };

  const value = {
    user,
    organization,
    isAuthenticated: !!user,
    isLoading,
    authError,
    login,
    register,
    logout,
    checkSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
