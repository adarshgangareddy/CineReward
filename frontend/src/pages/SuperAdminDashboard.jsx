import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Users, Film, Ticket, PlusCircle, Activity, Mail, Phone, Briefcase, IndianRupee, MessageSquare, Check, X, Clock, CreditCard, Send } from 'lucide-react';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, teams: 0, tickets: 0, reviews: 0, revenue: 0 });
  const [teams, setTeams] = useState([]);
  const [movies, setMovies] = useState([]);
  const [defaultMovies, setDefaultMovies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('teams');

  // Modals
  const [actionModal, setActionModal] = useState(null); // { type: 'accept'|'negotiate'|'reject', lead }
  const [modalInput, setModalInput] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [newTeam, setNewTeam] = useState({ name: '', email: '', password: '', secretKey: '', assignedMovies: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();
  const [superAdmin] = useState(() => JSON.parse(localStorage.getItem('superAdmin')));

  useEffect(() => {
    if (!superAdmin || superAdmin.role !== 'superadmin') { navigate('/super-admin-login'); return; }
    fetchData();
  }, [navigate, superAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, teamsRes, moviesRes, leadsRes, paymentsRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/teams'),
        axios.get('/api/movies/popular').catch(() => ({ data: [] })),
        axios.get('/api/admin/partner/leads').catch(() => ({ data: [] })),
        axios.get('/api/admin/partner/payment-history').catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setTeams(teamsRes.data);
      setLeads(Array.isArray(leadsRes.data) ? leadsRes.data : []);
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      let fetchedMovies = Array.isArray(moviesRes.data) ? moviesRes.data.filter(m => m.poster_path) : [];
      if (fetchedMovies.length === 0) {
        fetchedMovies = [
          { id: 101, title: 'Red Lorry Film Festival 2026', poster_path: 'https://picsum.photos/seed/101/400/600' },
          { id: 102, title: 'The Kerala Story 2: Goes Beyond', poster_path: 'https://picsum.photos/seed/102/400/600' },
          { id: 103, title: 'Dhurandhar The Revenge', poster_path: 'https://picsum.photos/seed/103/400/600' },
          { id: 104, title: 'Hoppers', poster_path: 'https://picsum.photos/seed/104/400/600' },
          { id: 105, title: 'O\' Romeo', poster_path: 'https://picsum.photos/seed/105/400/600' },
          { id: 106, title: 'The Fall Guy', poster_path: 'https://picsum.photos/seed/106/400/600' },
          { id: 107, title: 'Kingdom of the Planet of the Apes', poster_path: 'https://picsum.photos/seed/107/400/600' },
          { id: 108, title: 'Challengers', poster_path: 'https://picsum.photos/seed/108/400/600' },
          { id: 109, title: 'Furiosa: A Mad Max Saga', poster_path: 'https://picsum.photos/seed/109/400/600' },
          { id: 110, title: 'IF', poster_path: 'https://picsum.photos/seed/110/400/600' },
          { id: 111, title: 'Civil War', poster_path: 'https://picsum.photos/seed/111/400/600' },
          { id: 112, title: 'The Garfield Movie', poster_path: 'https://picsum.photos/seed/112/400/600' },
          { id: 113, title: 'Kalki 2898 AD', poster_path: 'https://picsum.photos/seed/113/400/600' },
          { id: 114, title: 'Inside Out 2', poster_path: 'https://picsum.photos/seed/114/400/600' },
          { id: 115, title: 'Deadpool & Wolverine', poster_path: 'https://picsum.photos/seed/115/400/600' },
          { id: 116, title: 'Pushpa 2: The Rule', poster_path: 'https://picsum.photos/seed/116/400/600' },
          { id: 117, title: 'Joker: Folie à Deux', poster_path: 'https://picsum.photos/seed/117/400/600' },
          { id: 118, title: 'Moana 2', poster_path: 'https://picsum.photos/seed/118/400/600' },
          { id: 119, title: 'Sonic the Hedgehog 3', poster_path: 'https://picsum.photos/seed/119/400/600' },
          { id: 120, title: 'Interstellar (Re-release)', poster_path: 'https://picsum.photos/seed/120/400/600' },
          { id: 121, title: 'Gladiator II', poster_path: 'https://picsum.photos/seed/121/400/600' },
          { id: 122, title: 'Wicked', poster_path: 'https://picsum.photos/seed/122/400/600' },
          { id: 123, title: 'Kraven the Hunter', poster_path: 'https://picsum.photos/seed/123/400/600' },
          { id: 124, title: 'Mufasa: The Lion King', poster_path: 'https://picsum.photos/seed/124/400/600' },
          { id: 125, title: 'Nosferatu', poster_path: 'https://picsum.photos/seed/125/400/600' },
          { id: 126, title: 'Captain America: Brave New World', poster_path: 'https://picsum.photos/seed/126/400/600' },
          { id: 127, title: 'Snow White', poster_path: 'https://picsum.photos/seed/127/400/600' },
          { id: 128, title: 'Elio', poster_path: 'https://picsum.photos/seed/128/400/600' },
          { id: 129, title: 'Superman', poster_path: 'https://picsum.photos/seed/129/400/600' },
          { id: 130, title: 'The Fantastic Four', poster_path: 'https://picsum.photos/seed/130/400/600' },
          { id: 131, title: 'Avatar 3', poster_path: 'https://picsum.photos/seed/131/400/600' },
          { id: 132, title: 'Avengers: Doomsday', poster_path: 'https://picsum.photos/seed/132/400/600' },
          { id: 133, title: 'Blade', poster_path: 'https://picsum.photos/seed/133/400/600' },
          { id: 134, title: 'The Batman Part II', poster_path: 'https://picsum.photos/seed/134/400/600' },
          { id: 135, title: 'Minecraft', poster_path: 'https://picsum.photos/seed/135/400/600' },
          { id: 136, title: 'Fast X: Part 2', poster_path: 'https://picsum.photos/seed/136/400/600' },
          { id: 137, title: 'Zootopia 2', poster_path: 'https://picsum.photos/seed/137/400/600' },
          { id: 138, title: 'The Conjuring: Last Rites', poster_path: 'https://picsum.photos/seed/138/400/600' },
          { id: 139, title: 'Tron: Ares', poster_path: 'https://picsum.photos/seed/139/400/600' },
          { id: 140, title: 'Toy Story 5', poster_path: 'https://picsum.photos/seed/140/400/600' },
          { id: 141, title: 'Shrek 5', poster_path: 'https://picsum.photos/seed/141/400/600' },
          { id: 142, title: 'Mission: Impossible 8', poster_path: 'https://picsum.photos/seed/142/400/600' },
          { id: 143, title: 'Super Mario Bros 2', poster_path: 'https://picsum.photos/seed/143/400/600' },
          { id: 144, title: 'Star Wars: New Jedi Order', poster_path: 'https://picsum.photos/seed/144/400/600' },
          { id: 145, title: 'Dune: Messiah', poster_path: 'https://picsum.photos/seed/145/400/600' },
          { id: 146, title: 'Frozen 3', poster_path: 'https://picsum.photos/seed/146/400/600' },
          { id: 147, title: 'Spider-Man 4', poster_path: 'https://picsum.photos/seed/147/400/600' },
          { id: 148, title: 'John Wick 5', poster_path: 'https://picsum.photos/seed/148/400/600' },
          { id: 149, title: 'The Mandalorian & Grogu', poster_path: 'https://picsum.photos/seed/149/400/600' },
          { id: 150, title: 'Avengers: Secret Wars', poster_path: 'https://picsum.photos/seed/150/400/600' },
        ];
      }
      setMovies(fetchedMovies);
      setDefaultMovies(fetchedMovies);
    } catch (error) { console.error("Error fetching admin data", error); }
    finally { setLoading(false); }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setMovies(defaultMovies);
      return;
    }

    setIsSearching(true);
    try {
      const res = await axios.get(`/api/movies/search?q=${encodeURIComponent(query)}`);
      setMovies(res.data.filter(m => m.poster_path));
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const generateSecretKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'CR-';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewTeam({...newTeam, secretKey: result});
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setIsCreating(true); setSuccessMsg('');
    try {
      const assignedMoviesArray = newTeam.assignedMovies.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      await axios.post('/api/admin/create-team', { ...newTeam, assignedMovies: assignedMoviesArray });
      setSuccessMsg(`Team "${newTeam.name}" created! Key: ${newTeam.secretKey}`);
      setNewTeam({ name: '', email: '', password: '', secretKey: '', assignedMovies: '' });
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
    finally { setIsCreating(false); }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const { type, lead } = actionModal;
      const body = { status: type === 'accept' ? 'Accepted' : type === 'negotiate' ? 'Negotiating' : 'Rejected' };
      if (type === 'accept') { body.paymentAmount = Number(modalAmount) || lead.budget; body.message = modalInput; }
      if (type === 'negotiate') body.message = modalInput;
      if (type === 'reject') body.rejectReason = modalInput;
      await axios.patch(`/api/admin/partner/lead/${lead._id}`, body);
      setActionModal(null); setModalInput(''); setModalAmount('');
      fetchData();
    } catch (err) { alert('Action failed'); }
    finally { setActionLoading(false); }
  };

  const handleConfirmPayment = async (code) => {
    try {
      await axios.post('/api/admin/partner/confirm-payment', { paymentCode: code });
      fetchData();
    } catch (err) { alert('Failed to confirm payment'); }
  };

  if (loading) return <div className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest">Loading Core Systems...</div>;

  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 pt-16 pb-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]"><ShieldAlert className="w-8 h-8" /></div>
            <div><h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Super<span className="text-red-500">Admin</span> Core</h1><p className="text-slate-400 font-medium tracking-wide">System Monitoring & Control</p></div>
          </div>
          <button onClick={() => { localStorage.removeItem('superAdmin'); navigate('/super-admin-login'); }} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-slate-700">Lock System</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 -mt-12 space-y-12">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <StatCard icon={<Users />} label="Total Users" value={stats.users} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" />
          <StatCard icon={<Ticket />} label="Total Tickets" value={stats.tickets} color="text-green-500" bg="bg-green-500/10" border="border-green-500/20" />
          <StatCard icon={<Activity />} label="Total Revenue" value={`₹${stats.revenue}`} color="text-yellow-500" bg="bg-yellow-500/10" border="border-yellow-500/20" />
          <StatCard icon={<Film />} label="Movie Teams" value={stats.teams} color="text-purple-500" bg="bg-purple-500/10" border="border-purple-500/20" />
        </div>

        {/* Movies Grid */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-500" /> 
              {searchQuery ? 'Search Results' : 'Active Movies'}
              <span className="text-xs font-bold text-slate-400 normal-case ml-2">(Click to assign)</span>
            </h2>
            
            <div className="relative w-full md:w-96 group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-500 transition-colors">
                {isSearching ? <div className="w-3 h-3 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div> : <Film className="w-4 h-4" />}
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search any movie to assign..." 
                className="w-full bg-slate-50 border border-slate-200 pl-11 pr-4 py-3 rounded-2xl focus:outline-none focus:border-purple-500 text-sm font-bold text-slate-900 transition-all shadow-sm focus:shadow-md"
              />
              {searchQuery && (
                <button 
                  onClick={() => handleSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {movies.map(movie => (
              <div key={movie.id} onClick={() => {
                  const ids = newTeam.assignedMovies ? newTeam.assignedMovies.split(',').map(id => id.trim()).filter(Boolean) : [];
                  if (!ids.includes(movie.id.toString())) { setNewTeam({ ...newTeam, assignedMovies: [...ids, movie.id].join(', ') }); }
                }} className="group cursor-pointer relative rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md hover:border-purple-500 transition-all aspect-[2/3]">
                <img src={movie.poster_path?.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`} alt={movie.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full p-3"><h3 className="text-white text-xs font-black tracking-tight leading-tight line-clamp-2">{movie.title}</h3><p className="text-slate-400 text-[9px] font-bold mt-1">ID: {movie.id}</p></div>
              </div>
            ))}
          </div>
          {movies.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Film className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-bold">No movies found. Try a different search.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Team Creation Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-200 sticky top-28">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-red-500" /> Create Movie Team</h2>
              {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-xs font-bold mb-6 break-words">{successMsg}</div>}
              <form onSubmit={handleCreateTeam} className="space-y-5">
                <div><label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5 ml-2">Team Name</label><input required type="text" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:border-red-500 text-sm font-bold text-slate-900" placeholder="e.g. Kalki Production" /></div>
                <div><label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5 ml-2">Team Email</label><input required type="email" value={newTeam.email} onChange={e => setNewTeam({...newTeam, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:border-red-500 text-sm font-bold text-slate-900" placeholder="team@kalki.com" /></div>
                <div><label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5 ml-2">Team Password</label><input required type="password" value={newTeam.password} onChange={e => setNewTeam({...newTeam, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:border-red-500 text-sm font-bold text-slate-900" placeholder="••••••••" /></div>
                <div><label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5 ml-2">Assigned Movie IDs</label><input required type="text" value={newTeam.assignedMovies} onChange={e => setNewTeam({...newTeam, assignedMovies: e.target.value})} className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:border-red-500 text-sm font-bold text-slate-900" placeholder="e.g. 113, 114" /><p className="text-[9px] text-slate-400 mt-1 ml-2">Comma separated TMDB IDs</p></div>
                <div><label className="block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5 ml-2">Secret Vault Key</label><div className="flex gap-2"><input required type="text" value={newTeam.secretKey} onChange={e => setNewTeam({...newTeam, secretKey: e.target.value})} className="flex-grow bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:outline-none focus:border-red-500 text-sm font-black text-slate-900 tracking-wider" placeholder="Click generate" /><button type="button" onClick={generateSecretKey} className="bg-slate-900 text-white px-4 rounded-xl text-xs font-black uppercase hover:bg-slate-800 transition-colors">Generate</button></div></div>
                <button type="submit" disabled={isCreating} className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-500/20 mt-4 disabled:opacity-50 text-sm uppercase tracking-widest">{isCreating ? 'Provisioning...' : 'Provision Team'}</button>
              </form>
            </div>
          </div>

          {/* Tabbed: Teams & Leads & Payments */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              {['teams', 'leads', 'payments'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 font-black text-xs uppercase tracking-widest relative whitespace-nowrap ${activeTab === tab ? 'text-slate-900' : 'text-slate-400'}`}>
                  {tab === 'teams' ? 'Teams' : tab === 'leads' ? 'Partner Leads' : 'Payment History'}
                  {tab === 'leads' && leads.filter(l => l.status === 'Pending').length > 0 && <span className="ml-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">{leads.filter(l => l.status === 'Pending').length}</span>}
                  {tab === 'payments' && payments.filter(p => p.paymentStatus === 'Unpaid').length > 0 && <span className="ml-1 bg-yellow-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">{payments.filter(p => p.paymentStatus === 'Unpaid').length}</span>}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500 rounded-t-full -mb-2"></div>}
                </button>
              ))}
            </div>

            {/* Teams Tab */}
            {activeTab === 'teams' && (
              <div className="space-y-6">
                {teams.map(team => (
                  <div key={team._id} className="bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><Film className="w-5 h-5" /></div>
                      <div><h3 className="text-lg font-black text-slate-800">{team.name}</h3><p className="text-xs font-bold text-slate-500">{team.email}</p></div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100 w-full sm:w-auto">
                      <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key:</span><span className="text-xs font-black text-slate-700 bg-slate-200 px-2 py-0.5 rounded tracking-wider">{team.secretKey}</span></div>
                      <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Movies:</span><div className="flex gap-1 flex-wrap">{team.assignedMovies.map(id => <span key={id} className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{id}</span>)}</div></div>
                    </div>
                  </div>
                ))}
                {teams.length === 0 && <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-12 text-center text-slate-500"><Film className="w-12 h-12 mx-auto mb-4 opacity-20" /><p className="font-bold">No teams yet.</p></div>}
              </div>
            )}

            {/* Leads Tab */}
            {activeTab === 'leads' && (
              <div className="space-y-6">
                {leads.map(lead => (
                  <div key={lead._id} className="bg-white border border-slate-200 rounded-[2rem] p-6 md:p-8 shadow-sm hover:shadow-md transition-all overflow-hidden">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-3 rounded-2xl shrink-0 ${lead.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-600' : lead.status === 'Accepted' ? 'bg-green-500/10 text-green-600' : lead.status === 'Negotiating' ? 'bg-blue-500/10 text-blue-600' : 'bg-slate-100 text-slate-500'}`}><Briefcase className="w-6 h-6" /></div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-black text-slate-800 italic uppercase tracking-tight truncate">{lead.eventType}</h3>
                          <p className="text-slate-400 text-[10px] font-black uppercase flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(lead.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border ${lead.status === 'Pending' ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : lead.status === 'Accepted' ? 'bg-green-50 border-green-200 text-green-600' : lead.status === 'Negotiating' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-red-50 border-red-200 text-red-500'}`}>{lead.status}</span>
                    </div>

                    {/* Info chips */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <InfoChip icon={<Mail className="w-4 h-4 text-slate-400" />} label="Email" value={lead.email} />
                      <InfoChip icon={<Phone className="w-4 h-4 text-slate-400" />} label="Phone" value={lead.phone} />
                      <InfoChip icon={<IndianRupee className="w-4 h-4 text-green-500" />} label="Budget" value={`₹${lead.budget?.toLocaleString()}`} />
                      <InfoChip icon={<Users className="w-4 h-4 text-blue-500" />} label="Name" value={lead.name} />
                    </div>

                    {/* Date & Location */}
                    {lead.eventDate && (
                      <div className="flex gap-3 flex-wrap mb-4">
                        <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">📅 {lead.eventDate}</span>
                        {lead.eventLocation && <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 truncate max-w-[200px]">📍 {lead.eventLocation}</span>}
                        {lead.locationUrl && <a href={lead.locationUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors truncate max-w-[200px]">🗺️ View on Map</a>}
                      </div>
                    )}

                    {/* Description */}
                    <div className="bg-slate-900 text-slate-300 p-5 rounded-2xl border-l-4 border-red-500 italic text-sm mb-4 break-words">&quot;{lead.description}&quot;</div>

                    {/* Payment code & Actions row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {lead.paymentCode && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[10px] font-black text-slate-400 uppercase">Payment:</span>
                          <span className="font-black text-xs text-primary bg-primary/10 px-3 py-1 rounded-lg">{lead.paymentCode}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${lead.paymentStatus === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>{lead.paymentStatus}</span>
                        </div>
                      )}
                      {lead.status === 'Pending' && (
                        <div className="flex gap-2 ml-auto">
                          <button onClick={() => { setActionModal({ type: 'accept', lead }); setModalAmount(lead.budget?.toString()); }} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all"><Check className="w-4 h-4" /> Accept</button>
                          <button onClick={() => setActionModal({ type: 'negotiate', lead })} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all"><MessageSquare className="w-4 h-4" /> Negotiate</button>
                          <button onClick={() => setActionModal({ type: 'reject', lead })} className="bg-slate-100 hover:bg-red-500 hover:text-white text-slate-400 px-4 py-2.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase transition-all"><X className="w-4 h-4" /> Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {leads.length === 0 && <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-12 text-center text-slate-500"><Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" /><p className="font-bold">No leads yet.</p></div>}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200">
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-2"><CreditCard className="w-5 h-5 text-green-500" /> Payment History</h2>
                {payments.length === 0 ? (
                  <div className="text-center py-12 text-slate-400"><CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" /><p className="font-bold">No payments recorded yet.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-slate-100">
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 pr-4">Partner</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 pr-4">Event</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 pr-4">Code</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 pr-4">Amount</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3 pr-4">Status</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3">Action</th>
                      </tr></thead>
                      <tbody>
                        {payments.map(p => (
                          <tr key={p._id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="py-4 pr-4"><p className="font-bold text-sm text-slate-800">{p.name}</p><p className="text-[10px] text-slate-400">{p.email}</p></td>
                            <td className="py-4 pr-4 font-bold text-xs text-slate-600 uppercase">{p.eventType}</td>
                            <td className="py-4 pr-4"><span className="font-black text-xs text-primary bg-primary/10 px-2 py-1 rounded">{p.paymentCode}</span></td>
                            <td className="py-4 pr-4 font-black text-sm text-slate-800">₹{p.paymentAmount?.toLocaleString()}</td>
                            <td className="py-4 pr-4"><span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${p.paymentStatus === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>{p.paymentStatus}</span></td>
                            <td className="py-4">{p.paymentStatus === 'Unpaid' ? (
                              <button onClick={() => handleConfirmPayment(p.paymentCode)} className="bg-green-500 hover:bg-green-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all">Mark Paid</button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold">Paid {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : ''}</span>
                            )}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setActionModal(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-8 relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setActionModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"><X className="w-6 h-6" /></button>
            
            {actionModal.type === 'accept' && (
              <div className="space-y-6">
                <div className="text-center"><div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><Check className="w-8 h-8 text-green-600" /></div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Accept Partner</h3><p className="text-slate-500 text-sm mt-1">This will send payment details to <strong>{actionModal.lead.name}</strong></p></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Final Amount (₹)</label><input type="number" value={modalAmount} onChange={e => setModalAmount(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:outline-none focus:border-green-500 font-black text-lg mt-2 text-slate-900" placeholder="50000" /></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Message (optional)</label><textarea value={modalInput} onChange={e => setModalInput(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:outline-none focus:border-green-500 font-bold text-sm mt-2 min-h-[80px] text-slate-900" placeholder="Any notes for the partner..."></textarea></div>
                <button onClick={handleAction} disabled={actionLoading} className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50">{actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Send className="w-5 h-5" />Accept & Send Payment Details</>}</button>
              </div>
            )}

            {actionModal.type === 'negotiate' && (
              <div className="space-y-6">
                <div className="text-center"><div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3"><MessageSquare className="w-8 h-8 text-blue-600" /></div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Negotiate</h3><p className="text-slate-500 text-sm mt-1">Send a message to <strong>{actionModal.lead.name}</strong></p></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Your Message</label><textarea required value={modalInput} onChange={e => setModalInput(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:outline-none focus:border-blue-500 font-bold text-sm mt-2 min-h-[120px] text-slate-900" placeholder="e.g. We'd like to discuss the budget. Can you increase it to ₹75,000?"></textarea></div>
                <button onClick={handleAction} disabled={actionLoading || !modalInput} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50">{actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Send className="w-5 h-5" />Send Message</>}</button>
              </div>
            )}

            {actionModal.type === 'reject' && (
              <div className="space-y-6">
                <div className="text-center"><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3"><X className="w-8 h-8 text-red-600" /></div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Reject Partner</h3><p className="text-slate-500 text-sm mt-1">Please provide a reason to <strong>{actionModal.lead.name}</strong></p></div>
                <div><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Rejection Reason</label><textarea required value={modalInput} onChange={e => setModalInput(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:outline-none focus:border-red-500 font-bold text-sm mt-2 min-h-[120px] text-slate-900" placeholder="e.g. Budget too low for the requested services..."></textarea></div>
                <button onClick={handleAction} disabled={actionLoading || !modalInput} className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-50">{actionLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><X className="w-5 h-5" />Reject & Notify</>}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color, bg, border }) => (
  <div className={`bg-white border ${border} p-6 rounded-[2rem] shadow-sm relative overflow-hidden group hover:shadow-lg transition-all`}>
    <div className={`absolute -right-4 -top-4 w-24 h-24 ${bg} rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500`}></div>
    <div className="relative z-10">
      <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center mb-4`}>{React.cloneElement(icon, { className: 'w-5 h-5' })}</div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-800 tracking-tighter">{value}</p>
    </div>
  </div>
);

const InfoChip = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
    {icon}
    <div className="truncate"><p className="text-[10px] font-black text-slate-400 uppercase">{label}</p><p className="text-xs font-bold text-slate-700 truncate">{value}</p></div>
  </div>
);

export default SuperAdminDashboard;
