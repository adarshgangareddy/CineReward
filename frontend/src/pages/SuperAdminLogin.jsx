import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Key } from 'lucide-react';

const SuperAdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();
      const res = await axios.post('/api/admin/super-login', { username: cleanUsername, password: cleanPassword });
      localStorage.setItem('superAdmin', JSON.stringify(res.data));
      navigate('/super-admin-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#f5f5f5] px-6">
      <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] w-full max-w-md shadow-2xl relative overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-3xl"></div>

        <div className="text-center mb-10 relative z-10">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Super<span className="text-red-500">Admin</span></h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">Authorized Personnel Only</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm font-bold text-center mb-6 z-10 relative">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div>
            <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 ml-4">System Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 text-white px-6 py-4 rounded-2xl focus:outline-none focus:border-red-500 transition-colors font-medium"
              placeholder="Enter username"
            />
          </div>

          <div>
             <label className="block text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 ml-4">Master Password</label>
             <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 text-white px-6 py-4 pr-12 rounded-2xl focus:outline-none focus:border-red-500 transition-colors font-medium"
                  placeholder="••••••••"
                />
                <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
             </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-500/20 mt-4 disabled:opacity-50"
          >
            {loading ? 'AUTHENTICATING...' : 'ACCESS DASHBOARD'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminLogin;
