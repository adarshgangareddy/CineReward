import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, UserPlus, ArrowRight, Chrome } from 'lucide-react';

const getApiBaseURL = () => {
  const configuredApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (configuredApiUrl) return configuredApiUrl;

  const isLocalDevHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return isLocalDevHost ? 'http://localhost:5000' : '';
};

const Signup = () => {

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post('/api/auth/signup', formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };



  const handleGoogleSignup = () => {
    const apiBaseURL = getApiBaseURL();
    window.location.href = `${apiBaseURL}/api/auth/google`;
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4 py-12">
      <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 w-full max-w-md shadow-2xl">
        <h2 className="text-3xl font-black mb-8 text-center text-white italic tracking-tighter uppercase">Join <span className="text-primary">CineReward</span></h2>
        

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        {/* EMAIL FORM */}
        <form onSubmit={handleEmailSignup} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-all font-medium"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                <input
                  type="email"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-all font-medium"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                <input
                  type="password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-all font-medium"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-xl transition-all flex justify-center items-center space-x-2 shadow-xl shadow-primary/20 disabled:opacity-50 mt-4"
            >
              {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <><UserPlus className="w-5 h-5" /><span>CREATE ACCOUNT</span></>}
            </button>
          </form>


        <div className="relative my-8 text-center text-slate-800">
           <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
           <span className="relative px-4 bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-600">or sign up with</span>
        </div>

        <button
          onClick={handleGoogleSignup}
          className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 rounded-xl transition-all flex justify-center items-center space-x-3 mb-8"
        >
          <Chrome className="w-6 h-6 text-blue-600" />
          <span>Google Account</span>
        </button>

        <p className="text-center text-slate-500 text-sm font-medium">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline underline-offset-4 font-bold flex items-center justify-center gap-1 mt-2">
            Login Here <ArrowRight className="w-4 h-4" />
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
