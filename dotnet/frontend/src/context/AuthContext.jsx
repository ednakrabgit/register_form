import { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('authUser');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [token, setToken] = useState(() => localStorage.getItem('authToken') || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      const savedToken = localStorage.getItem('authToken');
      if (savedToken) {
        try {
          const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data);
            localStorage.setItem('authUser', JSON.stringify(data));
          } else {
            // Token expired or invalid
            logout();
          }
        } catch (err) {
          console.error("Auth verification failed:", err);
        }
      }
      setIsLoading(false);
    };

    void verifyUser();
  }, []);

  const login = async (usernameOrEmail, password) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameOrEmail, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));

      return data.user;
    } catch (err) {
      throw err;
    }
  };

  const register = async (registerData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'สมัครสมาชิกไม่สำเร็จ');
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));

      return data.user;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  const isAuthenticated = !!token && !!user;
  const role = user?.role || null;
  const normalizedRole = String(role || '').toLowerCase();
  const isApplicant = normalizedRole === 'applicant';
  const isAdminOrViewer = ['superadmin', 'admin', 'viewer', 'admin2', 'admin3'].includes(normalizedRole) || (user?.permissions && user.permissions.some(p => p.canView && p.menuKey !== 'registration_form' && p.menuKey !== 'my_registrations'));

  // Dynamic permission checkers
  const hasPermission = (menuKey, action = 'view') => {
    if (!user) return false;
    const userRole = String(user.role || '').toLowerCase();
    if (userRole === 'superadmin') return true; // Superadmin has all permissions

    const targetKey = String(menuKey || '').toLowerCase();

    if (!user.permissions || !Array.isArray(user.permissions) || user.permissions.length === 0) {
      // Fallback defaults for standard roles if permissions not loaded
      if (userRole.startsWith('admin')) return !['registration_form', 'my_registrations'].includes(targetKey);
      if (userRole === 'viewer') return action === 'view' && ['dashboard', 'trainees', 'reports', 'profile'].includes(targetKey);
      if (userRole === 'applicant') return ['registration_form', 'my_registrations', 'trainees', 'profile'].includes(targetKey);
      return false;
    }

    const perm = user.permissions.find(p => 
      String(p.menuKey || p.MenuKey || '').toLowerCase() === targetKey
    );
    if (!perm) {
      if (userRole.startsWith('admin') || userRole === 'superadmin') return !['registration_form', 'my_registrations'].includes(targetKey);
      if (userRole === 'applicant' && targetKey === 'trainees') return true;
      return false;
    }

    return action === 'edit' 
      ? !!(perm.canEdit ?? perm.CanEdit) 
      : !!(perm.canView ?? perm.CanView);
  };

  const canViewMenu = (menuKey) => hasPermission(menuKey, 'view');
  const canEditMenu = (menuKey) => hasPermission(menuKey, 'edit');

  return (
    <AuthContext.Provider value={{
      user,
      token,
      role,
      isAuthenticated,
      isApplicant,
      isAdminOrViewer,
      isLoading,
      login,
      register,
      logout,
      hasPermission,
      canViewMenu,
      canEditMenu
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
