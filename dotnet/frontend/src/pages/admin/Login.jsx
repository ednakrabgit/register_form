import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const user = await login(username, password);
      if (user.role === 'Applicant') {
        void navigate('/admin/trainees', { replace: true });
      } else {
        void navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md border-t-4 border-primary">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-primary mb-2">Admin Login</h2>
          <p className="text-textMuted text-sm">เข้าสู่ระบบจัดการข้อมูลการลงทะเบียน</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-error text-error p-3 mb-6 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <Input 
            label="ชื่อผู้ใช้งาน" 
            id="username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
          />
          <Input 
            label="รหัสผ่าน" 
            id="password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          
          <Button type="submit" disabled={loading} className="w-full justify-center mt-6">
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </Button>
        </form>
      </div>
    </div>
  );
}
