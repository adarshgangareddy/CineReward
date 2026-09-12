import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Key, Film, Shield, Mail, Lock } from "lucide-react";

const MovieTeamLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/admin/team/login", {
        email,
        password,
        secretKey,
      });
      localStorage.setItem("team", JSON.stringify(res.data));
      navigate("/team/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="bg-slate-900 border border-slate-800 p-12 rounded-[3.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

        <div className="text-center mb-10">
          <Film className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase mb-2">
            Movie Team Access
          </h2>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">
            Restricted Internal Environment
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-8 text-sm font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2 pl-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Team Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
              <input
                type="email"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-all font-bold"
                placeholder="team@cinereward.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2 pl-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Team Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
              <input
                type="password"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-all font-bold"
                placeholder="Team password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2 pl-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Secret Vault Key
            </label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
              <input
                type="password"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-all font-bold"
                placeholder="CX-889-442"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary-dark text-white font-black py-5 rounded-3xl transition-all shadow-2xl shadow-primary/20 mt-8 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
          >
            <Shield className="w-5 h-5" />
            <span>Initialize Hub</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default MovieTeamLogin;
