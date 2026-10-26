import { API_BASE_URL, API_ORIGIN } from '../../config/api';
import { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, Shield, ShieldCheck, Eye, 
  UserCheck, Edit2, Trash2, Key, CheckCircle2, XCircle, AlertCircle, 
  RefreshCw, X, Lock, Phone, Mail, CreditCard, Sliders, Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function UserManagement() {
  const { user: authUser, token, canViewMenu, canEditMenu } = useAuth();
  const isSuperadmin = authUser?.role === 'Superadmin';
  const canViewUsers = isSuperadmin || canViewMenu('users');
  const canEditUsers = isSuperadmin || canEditMenu('users');

  const getAuthHeaders = () => {
    const currentToken = token || localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
    };
  };

  const getAuthOnlyHeaders = () => {
    const currentToken = token || localStorage.getItem('authToken');
    return currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {};
  };

  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles'

  // Users State
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals state (Users)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const parseFullName = (full) => {
    if (!full) return { titleTh: 'นาย', firstName: '', lastName: '' };
    let trimmed = full.trim();
    let title = 'นาย';
    if (trimmed.startsWith('นางสาว')) { title = 'นางสาว'; trimmed = trimmed.substring(6).trim(); }
    else if (trimmed.startsWith('นาง')) { title = 'นาง'; trimmed = trimmed.substring(3).trim(); }
    else if (trimmed.startsWith('นาย')) { title = 'นาย'; trimmed = trimmed.substring(3).trim(); }
    
    const parts = trimmed.split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    return { titleTh: title, firstName, lastName };
  };

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Applicant',
    nationId: '',
    titleTh: 'นาย',
    firstName: '',
    lastName: '',
    fullName: '',
    phone: '',
    isActive: true
  });
  const [newPassword, setNewPassword] = useState('');

  // Roles & Permissions State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [isDeleteRoleModalOpen, setIsDeleteRoleModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    roleCode: '',
    roleName: '',
    description: ''
  });
  const [rolePermissions, setRolePermissions] = useState([]);

  const [alert, setAlert] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/users?search=${encodeURIComponent(search)}&role=${selectedRole}`;
      if (selectedStatus !== 'all') {
        url += `&isActive=${selectedStatus === 'active'}`;
      }
      const res = await fetch(url, { headers: getAuthOnlyHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
      showAlert("error", "ไม่สามารถโหลดรายชื่อผู้ใช้งานได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/roles`, { headers: getAuthOnlyHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch (err) {
      console.error("Failed to fetch roles", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [search, selectedRole, selectedStatus]);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  // --- User Handlers ---
  const handleOpenAddUser = () => {
    setCurrentUser(null);
    setUserFormData({
      username: '',
      email: '',
      password: '',
      role: 'Applicant',
      nationId: '',
      titleTh: 'นาย',
      firstName: '',
      lastName: '',
      fullName: '',
      phone: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditUser = (user) => {
    if (!isSuperadmin && user.role === 'Superadmin') {
      showAlert("error", "ท่านไม่มีสิทธิ์แก้ไขข้อมูลของผู้ดูแลระบบสูงสุด (Superadmin)");
      return;
    }
    setCurrentUser(user);
    const parsed = parseFullName(user.fullName);
    setUserFormData({
      username: user.username,
      email: user.email || '',
      password: '',
      role: user.role,
      nationId: user.nationId || '',
      titleTh: parsed.titleTh || 'นาย',
      firstName: parsed.firstName || '',
      lastName: parsed.lastName || '',
      fullName: user.fullName || '',
      phone: user.phone || '',
      isActive: user.isActive
    });
    setIsModalOpen(true);
  };

  const handleOpenPassword = (user) => {
    if (!isSuperadmin && user.role === 'Superadmin') {
      showAlert("error", "ท่านไม่มีสิทธิ์เปลี่ยนรหัสผ่านของผู้ดูแลระบบสูงสุด (Superadmin)");
      return;
    }
    setCurrentUser(user);
    setNewPassword('');
    setIsPasswordModalOpen(true);
  };

  const handleOpenDeleteUser = (user) => {
    if (user.role === 'Superadmin') {
      showAlert("error", "ไม่อนุญาตให้ลบบัญชีผู้ดูแลระบบสูงสุด (Superadmin)");
      return;
    }
    setCurrentUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    try {
      const combinedFullName = `${userFormData.titleTh || ''}${userFormData.firstName || ''} ${userFormData.lastName || ''}`.trim();
      const payload = {
        username: userFormData.username,
        email: userFormData.email || null,
        password: userFormData.password,
        role: userFormData.role,
        nationId: userFormData.nationId || null,
        titleTh: userFormData.titleTh || null,
        firstName: userFormData.firstName?.trim() || null,
        lastName: userFormData.lastName?.trim() || null,
        fullName: combinedFullName || userFormData.fullName || null,
        phone: userFormData.phone || null,
        isActive: userFormData.isActive
      };

      if (currentUser) {
        const res = await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'บันทึกข้อมูลไม่สำเร็จ');
        showAlert("success", "แก้ไขข้อมูลผู้ใช้งานเรียบร้อยแล้ว");
      } else {
        const res = await fetch(`${API_BASE_URL}/users`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'สร้างผู้ใช้งานไม่สำเร็จ');
        showAlert("success", "สร้างผู้ใช้งานใหม่เรียบร้อยแล้ว");
      }

      setIsModalOpen(false);
      fetchUsers();
      fetchRoles();
    } catch (err) {
      showAlert("error", err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showAlert("error", "รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users/${currentUser.id}/password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');

      showAlert("success", `เปลี่ยนรหัสผ่านสำหรับ ${currentUser.username} สำเร็จ`);
      setIsPasswordModalOpen(false);
    } catch (err) {
      showAlert("error", err.message);
    }
  };

  const handleDeleteUser = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
        method: 'DELETE',
        headers: getAuthOnlyHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'ลบผู้ใช้งานไม่สำเร็จ');

      showAlert("success", "ลบผู้ใช้งานเรียบร้อยแล้ว");
      setIsDeleteModalOpen(false);
      fetchUsers();
      fetchRoles();
    } catch (err) {
      showAlert("error", err.message);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    if (!isSuperadmin && targetUser.role === 'Superadmin') {
      showAlert("error", "ไม่อนุญาตให้ระงับการใช้งานบัญชี Superadmin");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/users/${targetUser.id}/toggle-status`, {
        method: 'PATCH',
        headers: getAuthOnlyHeaders()
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Toggle status error", err);
    }
  };

  // --- Role & Permissions Handlers ---
  const handleOpenAddRole = () => {
    setCurrentRole(null);
    setRoleFormData({
      roleCode: '',
      roleName: '',
      description: ''
    });
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role) => {
    setCurrentRole(role);
    setRoleFormData({
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.description || ''
    });
    setIsRoleModalOpen(true);
  };

  const handleOpenPermissions = async (role) => {
    if (role.roleCode === 'Superadmin') {
      showAlert("error", "สิทธิ์ของ Superadmin เป็นสิทธิ์สูงสุดของระบบ (Full Access) ที่ถูกล็อคไว้เสมอ ไม่สามารถปรับลดได้");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/roles/${role.id}`, {
        headers: getAuthOnlyHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentRole(data);
        setRolePermissions(data.permissions || []);
        setIsPermModalOpen(true);
      }
    } catch (err) {
      showAlert("error", "ไม่สามารถโหลดตารางสิทธิ์ได้");
    }
  };

  const handleOpenDeleteRole = (role) => {
    setCurrentRole(role);
    setIsDeleteRoleModalOpen(true);
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentRole) {
        const res = await fetch(`${API_BASE_URL}/roles/${currentRole.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            roleName: roleFormData.roleName,
            description: roleFormData.description
          })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'บันทึก Role ไม่สำเร็จ');
        }
        showAlert("success", "แก้ไขข้อมูล Role สำเร็จ");
      } else {
        const res = await fetch(`${API_BASE_URL}/roles`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(roleFormData)
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'สร้าง Role ไม่สำเร็จ');
        }
        showAlert("success", "สร้าง Role ใหม่เรียบร้อยแล้ว");
      }

      setIsRoleModalOpen(false);
      fetchRoles();
    } catch (err) {
      showAlert("error", err.message);
    }
  };

  const handlePermissionToggle = (menuKey, field) => {
    setRolePermissions(prev => prev.map(p => {
      if (p.menuKey === menuKey) {
        const updated = { ...p, [field]: !p[field] };
        if (field === 'canView' && !updated.canView) updated.canEdit = false;
        if (field === 'canEdit' && updated.canEdit) updated.canView = true;
        return updated;
      }
      return p;
    }));
  };

  const handleSelectAll = (field, value) => {
    setRolePermissions(prev => prev.map(p => {
      const updated = { ...p, [field]: value };
      if (field === 'canView' && !value) updated.canEdit = false;
      if (field === 'canEdit' && value) updated.canView = true;
      return updated;
    }));
  };

  const handleSavePermissions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/roles/${currentRole.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          roleName: currentRole.roleName,
          description: currentRole.description,
          permissions: rolePermissions.map(p => ({
            menuKey: p.menuKey,
            canView: p.canView,
            canEdit: p.canEdit
          }))
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'บันทึกสิทธิ์ไม่สำเร็จ');
      }

      showAlert("success", `บันทึกตารางสิทธิ์สำหรับ ${currentRole.roleName} สำเร็จ`);
      setIsPermModalOpen(false);
      fetchRoles();
    } catch (err) {
      showAlert("error", err.message);
    }
  };

  const handleDeleteRole = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/roles/${currentRole.id}`, {
        method: 'DELETE',
        headers: getAuthOnlyHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'ลบ Role ไม่สำเร็จ');

      showAlert("success", "ลบ Role เรียบร้อยแล้ว");
      setIsDeleteRoleModalOpen(false);
      fetchRoles();
    } catch (err) {
      showAlert("error", err.message);
    }
  };

  // Stats calculation
  const totalCount = users.length;
  const adminCount = users.filter(u => u.role === 'Admin' || u.role === 'Superadmin').length;
  const viewerCount = users.filter(u => u.role === 'Viewer').length;
  const applicantCount = users.filter(u => u.role === 'Applicant').length;

  // Hierarchy Levels: Superadmin = 100, Admin = 50, Custom = 30, Viewer = 20, Applicant = 10
  const getRoleLevel = (roleCode) => {
    switch (roleCode?.toLowerCase()) {
      case 'superadmin': return 100;
      case 'admin': return 50;
      case 'viewer': return 20;
      case 'applicant': return 10;
      default: return 30; // custom roles
    }
  };

  // Rule: Can ONLY manage strictly lower roles (Cannot manage own role or higher roles)
  const canManageRole = (targetRoleCode) => {
    if (!authUser?.role || !targetRoleCode) return false;
    const callerLevel = getRoleLevel(authUser.role);
    const targetLevel = getRoleLevel(targetRoleCode);
    return callerLevel > targetLevel;
  };

  const getRoleBadge = (roleCode) => {
    switch (roleCode) {
      case 'Superadmin':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><Shield className="w-3 h-3 text-purple-600" /> Superadmin</span>;
      case 'Admin':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-amber-600" /> Admin</span>;
      case 'Viewer':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><Eye className="w-3 h-3 text-emerald-600" /> Viewer (สาขา)</span>;
      case 'Applicant':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><UserCheck className="w-3 h-3 text-blue-600" /> ผู้สมัคร (Applicant)</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1"><Sliders className="w-3 h-3 text-slate-600" /> {roleCode}</span>;
    }
  };

  // Filter selectable roles in user modal: Can only assign roles that are strictly lower than caller's role
  const selectableRoles = roles.filter(r => canManageRole(r.roleCode));

  // If user cannot view this menu at all (e.g. Viewer)
  if (!canViewUsers) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center max-w-lg mx-auto mt-12 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
        <p className="text-sm text-slate-500 mb-6">
          บทบาทของท่าน (<strong>{authUser?.role || 'Viewer'}</strong>) มีสิทธิ์สำหรับการค้นหาและดูข้อมูล (Enquiry Only) เท่านั้น ไม่ได้รับอนุญาตให้เข้าถึงระบบจัดการผู้ใช้งานและกำหนดสิทธิ์
        </p>
        <a
          href="/admin"
          className="inline-flex items-center gap-2 bg-primary hover:bg-[#002882] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow"
        >
          กลับสู่หน้าหลัก
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {alert && (
        <div className={`p-4 rounded-xl flex items-center gap-3 shadow-md animate-in fade-in duration-200 ${
          alert.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {alert.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <span className="text-sm font-medium">{alert.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-primary" />
            ระบบจัดการผู้ใช้งาน & กำหนดสิทธิ์เมนู (RBAC)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            กำหนดระดับสิทธิ์ (Role) และตั้งค่าว่า Role ใดสามารถ <strong>ดู (View)</strong> หรือ <strong>แก้ไข (Edit/Manage)</strong> ในแต่ละเมนูได้อย่างอิสระ
          </p>
        </div>

        {canEditUsers && (
          <div className="flex gap-2">
            {activeTab === 'users' ? (
              <button
                onClick={handleOpenAddUser}
                className="bg-primary hover:bg-[#002882] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                เพิ่มผู้ใช้งานใหม่
              </button>
            ) : (
              <button
                onClick={handleOpenAddRole}
                className="bg-primary hover:bg-[#002882] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                สร้าง Role ใหม่
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 transition-all border-b-2 ${
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          รายชื่อผู้ใช้งาน (Users List)
          <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
            {totalCount}
          </span>
        </button>

        {canEditUsers && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 transition-all border-b-2 ${
              activeTab === 'roles'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield className="w-4 h-4" />
            บทบาท & สิทธิ์การใช้งานเมนู (Roles & Permissions Matrix)
            <span className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
              {roles.length}
            </span>
          </button>
        )}
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">ผู้ใช้งานทั้งหมด</div>
                <div className="text-2xl font-bold text-slate-800">{totalCount}</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-500 uppercase">ทีมงาน Admin</div>
                <div className="text-2xl font-bold text-amber-900">{adminCount}</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Eye className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-500 uppercase">เจ้าหน้าที่สาขา</div>
                <div className="text-2xl font-bold text-emerald-900">{viewerCount}</div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-bold text-blue-500 uppercase">ผู้เข้าอบรม</div>
                <div className="text-2xl font-bold text-blue-900">{applicantCount}</div>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, อีเมล, เลขบัตร, เบอร์..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                <Filter className="w-3.5 h-3.5" /> กรอง:
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">ทุกระดับสิทธิ์ (All Roles)</option>
                {roles.map(r => (
                  <option key={r.id} value={r.roleCode}>{r.roleName} ({r.roleCode})</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">ทุกสถานะ (All Status)</option>
                <option value="active">เปิดใช้งาน (Active)</option>
                <option value="inactive">ระงับการใช้งาน (Inactive)</option>
              </select>

              <button
                onClick={fetchUsers}
                className="p-2 border border-slate-300 hover:border-primary rounded-xl text-slate-600 hover:text-primary transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">ผู้ใช้งาน</th>
                    <th className="py-3.5 px-4">บทบาท (Role)</th>
                    <th className="py-3.5 px-4">เลขประจำตัวประชาชน</th>
                    <th className="py-3.5 px-4">เบอร์โทรศัพท์</th>
                    <th className="py-3.5 px-4 text-center">สถานะ</th>
                    <th className="py-3.5 px-4">เข้าสู่ระบบล่าสุด</th>
                    <th className="py-3.5 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        ไม่พบข้อมูลผู้ใช้งานตามเงื่อนไขที่ค้นหา
                      </td>
                    </tr>
                  ) : (
                    users.map(u => {
                      const isTargetSuperadmin = u.role === 'Superadmin';
                      const canManageThisUser = canManageRole(u.role);

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                                {(u.fullName || u.username || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800">{u.fullName || u.username}</div>
                                <div className="text-xs text-slate-400">{u.email || u.username}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {getRoleBadge(u.role)}
                          </td>

                          <td className="py-3.5 px-4">
                            {u.nationId ? (
                              <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {u.nationId}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 text-xs">
                            {u.phone || '-'}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={!canManageThisUser}
                              className={`text-xs px-2.5 py-0.5 rounded-full font-bold transition-colors ${
                                u.isActive 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                              title={canManageThisUser ? "คลิกเพื่อสลับสถานะ" : "ไม่สามารถจัดการบัญชีของ Role ตัวเอง หรือ Role ที่เทียบเท่า/สูงกว่าได้"}
                            >
                              {u.isActive ? 'เปิดใช้งาน' : 'ระงับ'}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('th-TH') : 'ยังไม่เคยล็อกอิน'}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditUser(u)}
                                disabled={!canManageThisUser}
                                className="p-1.5 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={canManageThisUser ? "แก้ไขข้อมูล" : "ไม่สามารถแก้ไขบัญชีของ Role ตัวเอง หรือ Role ที่เทียบเท่า/สูงกว่าได้"}
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenPassword(u)}
                                disabled={!canManageThisUser}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={canManageThisUser ? "เปลี่ยนรหัสผ่าน" : "ไม่สามารถเปลี่ยนรหัสผ่านของ Role ตัวเอง หรือ Role ที่เทียบเท่า/สูงกว่าได้"}
                              >
                                <Key className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteUser(u)}
                                disabled={!canManageThisUser || u.username === 'superadmin' || u.username === 'admin'}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={canManageThisUser ? "ลบผู้ใช้" : "ไม่สามารถลบบัญชีนี้ได้"}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-base">ตารางระดับสิทธิ์ในระบบ (Roles)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  คลิกที่ปุ่ม <strong>"กำหนดสิทธิ์ (Permissions)"</strong> เพื่อตั้งค่าการเข้าดู (View) และการแก้ไข (Edit) ในแต่ละเมนู
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">รหัส & ชื่อระดับสิทธิ์ (Role)</th>
                    <th className="py-3.5 px-4">คำอธิบาย</th>
                    <th className="py-3.5 px-4 text-center">ประเภท</th>
                    <th className="py-3.5 px-4 text-center">จำนวนผู้ใช้</th>
                    <th className="py-3.5 px-4 text-center">สิทธิ์เมนู (ดู / แก้ไข)</th>
                    <th className="py-3.5 px-4 text-center">จัดการสิทธิ์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roles.map(r => {
                    const isSuperadminRole = r.roleCode === 'Superadmin';
                    const isOwnRole = r.roleCode?.toLowerCase() === authUser?.role?.toLowerCase();
                    const canManageThisRole = canManageRole(r.roleCode);

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{r.roleName}</div>
                          <div className="font-mono text-xs text-slate-400">{r.roleCode}</div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs">
                          {r.description || '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {r.isSystem ? (
                            <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                              System Role
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                              Custom Role
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full text-xs">
                            {r.userCount} คน
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isSuperadminRole ? (
                            <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg font-bold inline-flex items-center gap-1">
                              <Lock className="w-3 h-3 text-purple-600" /> สิทธิ์เต็มทุกเมนู 100% (Locked)
                            </span>
                          ) : (
                            <span className="text-xs text-slate-600 font-medium">
                              ดูได้ <strong className="text-green-600">{r.viewableMenuCount}</strong> / แก้ไขได้ <strong className="text-amber-600">{r.editableMenuCount}</strong> เมนู
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isSuperadminRole ? (
                              <span className="text-xs text-slate-400 italic py-1.5">
                                สิทธิ์สูงสุดถาวร
                              </span>
                            ) : !canManageThisRole ? (
                              <span
                                className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 cursor-not-allowed"
                                title="ไม่สามารถกำหนดสิทธิ์ Role ของตัวเอง หรือ Role ที่มีระดับสิทธิ์เทียบเท่า/สูงกว่าได้"
                              >
                                <Lock className="w-3 h-3 text-slate-400" />
                                {isOwnRole ? 'Role ตัวเอง (ล็อค)' : 'สิทธิ์เทียบเท่า/สูงกว่า'}
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenPermissions(r)}
                                className="bg-primary/10 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                กำหนดสิทธิ์เมนู
                              </button>
                            )}
                            
                            {!r.isSystem && canManageThisRole && (
                              <>
                                <button
                                  onClick={() => handleOpenEditRole(r)}
                                  className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg"
                                  title="แก้ไขชื่อ Role"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenDeleteRole(r)}
                                  disabled={r.userCount > 0}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30"
                                  title="ลบ Role"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Matrix Modal */}
      {isPermModalOpen && currentRole && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  กำหนดสิทธิ์เมนูสำหรับ: <span className="text-primary">{currentRole.roleName}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ทำเครื่องหมายถูกเพื่อเปิดให้สิทธิ์ <strong>เข้าดู (View)</strong> หรือ <strong>แก้ไขข้อมูล (Edit/Manage)</strong> ในแต่ละเมนู
                </p>
              </div>
              <button onClick={() => setIsPermModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl mb-4 text-xs">
              <span className="font-bold text-slate-600">ทางลัดเลือกสิทธิ์ทั้งหมด (Quick Select):</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAll('canView', true)}
                  className="px-2.5 py-1 bg-white border border-slate-300 hover:border-primary rounded-lg text-slate-700 font-medium"
                >
                  👁️ ดูได้ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectAll('canEdit', true)}
                  className="px-2.5 py-1 bg-white border border-slate-300 hover:border-amber-500 rounded-lg text-slate-700 font-medium"
                >
                  ✏️ แก้ไขได้ทั้งหมด
                </button>
                <button
                  type="button"
                  onClick={() => { handleSelectAll('canView', false); handleSelectAll('canEdit', false); }}
                  className="px-2.5 py-1 bg-white border border-red-200 hover:bg-red-50 rounded-lg text-red-600 font-medium"
                >
                  ❌ ล้างสิทธิ์ทั้งหมด
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase">
                    <th className="py-3 px-4">ชื่อเมนูระบบ (Menu Name)</th>
                    <th className="py-3 px-4 text-center w-36">หมวดหมู่</th>
                    <th className="py-3 px-4 text-center w-32 bg-green-50/50">
                      👁️ ดูได้ (View)
                    </th>
                    <th className="py-3 px-4 text-center w-36 bg-amber-50/50">
                      ✏️ แก้ไขได้ (Edit)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rolePermissions.map((perm) => (
                    <tr key={perm.menuKey} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          <i className={`${perm.icon || 'fas fa-circle'} text-primary w-4 text-center text-xs`}></i>
                          {perm.menuName}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 ml-6">
                          Key: {perm.menuKey} | Path: {perm.path}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                          perm.category === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {perm.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center bg-green-50/20">
                        <label className="inline-flex items-center cursor-pointer justify-center">
                          <input
                            type="checkbox"
                            checked={perm.canView}
                            onChange={() => handlePermissionToggle(perm.menuKey, 'canView')}
                            className="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                          />
                        </label>
                      </td>

                      <td className="py-3 px-4 text-center bg-amber-50/20">
                        <label className="inline-flex items-center cursor-pointer justify-center">
                          <input
                            type="checkbox"
                            checked={perm.canEdit}
                            onChange={() => handlePermissionToggle(perm.menuKey, 'canEdit')}
                            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
              <div className="text-xs text-slate-500">
                * หากเลือก "แก้ไขได้" ระบบจะเปิดสิทธิ์ "ดูได้" ให้อัตโนมัติ
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPermModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-700 hover:bg-slate-50 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  className="px-5 py-2 bg-primary hover:bg-[#002882] text-white rounded-xl text-sm font-bold shadow transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  บันทึกสิทธิ์
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {currentUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อผู้ใช้งาน (Username) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!currentUser}
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  placeholder="เช่น admin หรือ user@email.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">อีเมล (Email)</label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="user@viriyah.co.th"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              {!currentUser && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสผ่าน (Password) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ระดับสิทธิ์ (Role) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                  >
                    {selectableRoles.map(r => (
                      <option key={r.id} value={r.roleCode}>{r.roleName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">เลขประจำตัวประชาชน (13 หลัก)</label>
                  <input
                    type="text"
                    maxLength={13}
                    value={userFormData.nationId}
                    onChange={(e) => setUserFormData({ ...userFormData, nationId: e.target.value })}
                    placeholder="7980373142667"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">คำนำหน้า</label>
                  <select
                    value={userFormData.titleTh}
                    onChange={(e) => setUserFormData({ ...userFormData, titleTh: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="อื่นๆ">อื่นๆ</option>
                  </select>
                </div>

                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อ (First Name)</label>
                  <input
                    type="text"
                    value={userFormData.firstName}
                    onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                    placeholder="สมชาย"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">นามสกุล (Last Name)</label>
                  <input
                    type="text"
                    value={userFormData.lastName}
                    onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                    placeholder="มีชำนาญ"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={userFormData.phone}
                  onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                  placeholder="0812345678"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userFormData.isActive}
                    onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-medium text-slate-700">เปิดใช้งานบัญชีนี้ (Active)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-700 hover:bg-slate-50 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-[#002882] text-white rounded-xl text-sm font-bold shadow transition-all"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Role Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {currentRole ? 'แก้ไขข้อมูล Role' : 'สร้าง Role ใหม่'}
              </h3>
              <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัส Role (Role Code) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!currentRole}
                  value={roleFormData.roleCode}
                  onChange={(e) => setRoleFormData({ ...roleFormData, roleCode: e.target.value })}
                  placeholder="เช่น training_staff หรือ branch_officer"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm disabled:bg-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อ Role แสดงผล (Role Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={roleFormData.roleName}
                  onChange={(e) => setRoleFormData({ ...roleFormData, roleName: e.target.value })}
                  placeholder="เช่น เจ้าหน้าที่ฝ่ายฝึกอบรม (Staff)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">คำอธิบายบทบาท</label>
                <textarea
                  rows={3}
                  value={roleFormData.description}
                  onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                  placeholder="ระบุหน้าที่ความรับผิดชอบหรือขอบเขตสิทธิ์ของบทบาทนี้"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-700 hover:bg-slate-50 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-[#002882] text-white rounded-xl text-sm font-bold shadow transition-all"
                >
                  บันทึก Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                เปลี่ยนรหัสผ่าน
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <p className="text-xs text-slate-500">
                ตั้งรหัสผ่านใหม่สำหรับผู้ใช้งาน <strong>{currentUser?.username}</strong>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านใหม่อย่างน้อย 4 ตัวอักษร"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-700 hover:bg-slate-50 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow transition-all"
                >
                  เปลี่ยนรหัสผ่าน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (User) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">ยืนยันการลบผู้ใช้งาน?</h3>
            <p className="text-xs text-slate-500 mb-4">
              ท่านต้องการลบบัญชีผู้ใช้ <strong>{currentUser?.username}</strong> หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>

            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-700 hover:bg-slate-50 font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow transition-all"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Role) */}
      {isDeleteRoleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">ยืนยันการลบ Role?</h3>
            <p className="text-xs text-slate-500 mb-4">
              ท่านต้องการลบ Role <strong>{currentRole?.roleName}</strong> ({currentRole?.roleCode}) หรือไม่?
            </p>

            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteRoleModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-sm text-slate-700 hover:bg-slate-50 font-medium"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow transition-all"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
