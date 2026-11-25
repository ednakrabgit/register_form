import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import { API_BASE_URL } from '../config/api';

const DEFAULT_ADMIN_MENUS = [
  { menuKey: 'dashboard', menuName: 'หน้าแรก (Dashboard)', path: '/admin', icon: 'fas fa-home', sortOrder: 1, category: 'Admin' },
  { menuKey: 'profile', menuName: 'ข้อมูลส่วนตัว (My Profile)', path: '/admin/profile', icon: 'fas fa-id-card', sortOrder: 2, category: 'Admin' },
  { menuKey: 'trainees', menuName: 'ข้อมูลผู้สมัคร/ผู้อบรม', path: '/admin/trainees', icon: 'fas fa-users', sortOrder: 3, category: 'Admin' },
  { menuKey: 'training_import', menuName: 'นำเข้าผลการอบรม (Stamp ผล)', path: '/admin/training-import', icon: 'fas fa-file-import', sortOrder: 4, category: 'Admin' },
  { menuKey: 'reports', menuName: 'รายงาน (Reports)', path: '/admin/reports', icon: 'fas fa-file-excel', sortOrder: 5, category: 'Admin' },
  { menuKey: 'users', menuName: 'จัดการผู้ใช้งาน & กำหนดสิทธิ์', path: '/admin/users', icon: 'fas fa-user-cog', sortOrder: 6, category: 'Admin' },
  { menuKey: 'config', menuName: 'ตั้งค่าระบบ (System Config)', path: '/admin/config', icon: 'fas fa-cogs', sortOrder: 7, category: 'Admin' },
  { menuKey: 'master_data', menuName: 'จัดการข้อมูล (Master Data)', path: '/admin/master-data', icon: 'fas fa-database', sortOrder: 8, category: 'Admin' },
  { menuKey: 'audit_logs', menuName: 'ประวัติการแก้ไข (Audit Logs)', path: '/admin/audit-logs', icon: 'fas fa-history', sortOrder: 9, category: 'Admin' },
  { menuKey: 'system_logs', menuName: 'บันทึกระบบ (System Logs)', path: '/admin/system-logs', icon: 'fas fa-terminal', sortOrder: 10, category: 'Admin' }
];

export default function AdminLayout() {
  const { user, canViewMenu, logout } = useAuth();
  const navigate = useNavigate();
  const [menus, setMenus] = useState(DEFAULT_ADMIN_MENUS);

  useEffect(() => {
    fetch(`${API_BASE_URL}/roles/menus`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const adminMenus = data
            .filter(m => m.category === 'Admin')
            .sort((a, b) => a.sortOrder - b.sortOrder);
          if (adminMenus.length > 0) {
            setMenus(adminMenus);
          }
        }
      })
      .catch(() => {
        // Fallback gracefully to DEFAULT_ADMIN_MENUS
      });
  }, []);

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 border-l-4 transition-colors ${
      isActive
        ? 'bg-[#ffc107] text-[#003B6F] border-[#003B6F] font-semibold'
        : 'text-white border-transparent hover:bg-white/10 hover:border-white/50'
    }`;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-[#f8f9fa] font-sans">
      {/* Sidebar */}
      <aside className="w-[260px] bg-[#243c84] text-white flex flex-col shrink-0 shadow-xl z-10 min-h-screen relative">
        <div className="p-4 border-b border-white/20 text-center flex flex-col items-center">
          <div className="bg-white rounded-md p-2 mb-4 w-4/5 mx-auto flex items-center justify-center">
             <img src="/logo.jpg" alt="Logo" className="max-h-[40px] object-contain" />
          </div>
          <div className="flex flex-col items-center">
            <i className="fas fa-user-shield text-3xl text-[#ffc107] mb-2"></i>
            <span className="font-bold text-lg">{user?.fullName || user?.username || 'ผู้ดูแลระบบ'}</span>
            <span className="text-xs bg-[#ffc107] text-[#003B6F] font-bold px-2.5 py-0.5 rounded-full mt-1">
              {user?.role || 'Admin'}
            </span>
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 text-[15px]">
          {user?.role === 'Applicant' ? (
            <>
              <NavLink to="/admin/trainees" className={navLinkClass}>
                <i className="fas fa-history w-5 text-center"></i> ข้อมูลผู้สมัครของฉัน
              </NavLink>
              <NavLink to="/admin/profile" className={navLinkClass}>
                <i className="fas fa-id-card w-5 text-center"></i> ข้อมูลส่วนตัว
              </NavLink>
            </>
          ) : (
            menus
              .filter(menu => canViewMenu(menu.menuKey))
              .map(menu => {
                const isExternal = menu.path?.startsWith('http://') || menu.path?.startsWith('https://');
                if (isExternal) {
                  return (
                    <a
                      key={menu.menuKey}
                      href={menu.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 border-l-4 transition-colors text-white border-transparent hover:bg-white/10 hover:border-white/50"
                    >
                      <i className={`${menu.icon || 'fas fa-circle'} w-5 text-center`}></i>
                      <span className="flex-1">{menu.menuName}</span>
                      <i className="fas fa-arrow-up-right-from-square text-xs text-white/50"></i>
                    </a>
                  );
                }
                return (
                  <NavLink
                    key={menu.menuKey}
                    to={menu.path}
                    end={menu.path === '/admin'}
                    className={navLinkClass}
                  >
                    <i className={`${menu.icon || 'fas fa-circle'} w-5 text-center ${menu.menuKey === 'training_import' ? 'text-[#ffc107]' : ''}`}></i>
                    <span>{menu.menuName}</span>
                  </NavLink>
                );
              })
          )}
        </nav>

        <div className="p-4 border-t border-white/20 mt-auto">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-white/50 rounded hover:bg-white/10 hover:border-white transition text-white"
          >
            <i className="fas fa-sign-out-alt"></i> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 w-full overflow-y-auto h-screen">
        <ErrorBoundary name="Admin Main Page">
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
