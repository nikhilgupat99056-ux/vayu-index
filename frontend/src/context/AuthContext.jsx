import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  loginUser, 
  registerUser, 
  fetchUserProfile, 
  updateUserProfile, 
  fetchNotifications, 
  markNotificationsAsRead 
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('vayu_token'));
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize or fetch user profile if token exists or set demo fallback
  const loadProfile = async (currentToken) => {
    try {
      const data = await fetchUserProfile();
      if (data && data.user) {
        setUser(data.user);
        setProfileData(data);
      }
    } catch (err) {
      console.warn('Could not load profile from backend, checking local storage', err);
      // Fallback demo user if token is present or offline
      if (currentToken) {
        const fallback = {
          id: 1,
          name: 'Arjun Verma',
          email: 'demo@vayu.aero',
          mobile: '+91 98765 43210',
          home_airport: 'DEL',
          preferences: {
            preferred_airlines: ['6E', 'AI'],
            cabin_class: 'Economy',
            notification_preferences: { push: true, email: true, in_app: true },
            card_preferences: ['SBI Cashback', 'Axis Atlas']
          }
        };
        setUser(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetchNotifications();
      if (res && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unread_count || 0);
      }
    } catch (err) {
      console.warn('Could not fetch notifications:', err);
    }
  };

  useEffect(() => {
    // If no token exists on startup, automatically seed demo token so user has ready-to-explore access
    const existingToken = localStorage.getItem('vayu_token');
    if (!existingToken) {
      // Set default demo session
      localStorage.setItem('vayu_token', 'demo-jwt-session-token');
      setToken('demo-jwt-session-token');
    }
    loadProfile(existingToken || 'demo-jwt-session-token');
    loadNotifications();

    // Poll notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await loginUser({ email, password });
      if (res.access_token) {
        localStorage.setItem('vayu_token', res.access_token);
        setToken(res.access_token);
        setUser(res.user);
        await loadProfile(res.access_token);
        await loadNotifications();
      }
      return { success: true, user: res.user };
    } catch (err) {
      // Demo fallback if backend is offline or network fails
      if (email.toLowerCase().includes('demo') || password === 'vayu123') {
        const demoUser = {
          id: 1,
          name: 'Arjun Verma',
          email: 'demo@vayu.aero',
          mobile: '+91 98765 43210',
          home_airport: 'DEL'
        };
        localStorage.setItem('vayu_token', 'demo-jwt-session-token');
        setToken('demo-jwt-session-token');
        setUser(demoUser);
        return { success: true, user: demoUser };
      }
      return { success: false, error: err.message || 'Authentication failed' };
    }
  };

  const register = async (userData) => {
    try {
      const res = await registerUser(userData);
      if (res.access_token) {
        localStorage.setItem('vayu_token', res.access_token);
        setToken(res.access_token);
        setUser(res.user);
        await loadProfile(res.access_token);
      }
      return { success: true, user: res.user };
    } catch (err) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('vayu_token');
    setToken(null);
    setUser(null);
    setProfileData(null);
  };

  const updateProfile = async (payload) => {
    try {
      const res = await updateUserProfile(payload);
      if (res.user) {
        setUser(res.user);
      }
      await loadProfile(token);
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await markNotificationsAsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.warn('Could not mark notifications read:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profileData,
      token,
      loading,
      login,
      register,
      logout,
      updateProfile,
      notifications,
      unreadCount,
      refreshNotifications: loadNotifications,
      markAllNotificationsRead,
      refreshProfile: () => loadProfile(token)
    }}>
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
