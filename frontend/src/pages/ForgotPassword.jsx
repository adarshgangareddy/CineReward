import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, Send } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post('/api/auth/forgot-password', { email });
      setMessage('A password reset link has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] px-4 py-12">
      <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 w-full max-w-md shadow-2xl">
        <Link to="/login" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-6 text-sm font-bold">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
        
        <h2 className="text-2xl font-black mb-2 text-white uppercase tracking-tight italic">Forgot <span className="text-primary">Password?</span></h2>
        <p className="text-slate-500 text-sm mb-8 font-medium">No worries, it happens. Enter your email and we&apos;ll send you a reset link.</p>

        {message && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-xl mb-6 text-sm font-medium">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
              <input
                type="email"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-all font-medium"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || message}
            className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-xl transition-all flex justify-center items-center space-x-2 shadow-xl shadow-primary/20 disabled:opacity-50"
          >
            {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <><Send className="w-5 h-5" /><span>SEND RESET LINK</span></>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
