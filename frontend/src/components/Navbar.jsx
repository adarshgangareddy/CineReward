import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, Film, Coins, Menu, X, Clapperboard, MapPin } from 'lucide-react';
import SearchBar from './SearchBar';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [superAdmin, setSuperAdmin] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(localStorage.getItem('selectedCity') || 'Bengaluru');
  const navigate = useNavigate();

  const cities = [
    { name: 'Mumbai', icon: '🏰' },
    { name: 'Delhi-NCR', icon: '🏛️' },
    { name: 'Bengaluru', icon: '🏢' },
    { name: 'Hyderabad', icon: '🕌' },
    { name: 'Chandigarh', icon: '🏙️' },
    { name: 'Chennai', icon: '⛱️' },
    { name: 'Pune', icon: '⛰️' },
    { name: 'Kolkata', icon: '🚊' },
    { name: 'Kochi', icon: '🌴' },
    { name: 'Ahmedabad', icon: '🏭' }
  ];

  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('user');
      const storedTeam = localStorage.getItem('team');
      const storedSuperAdmin = localStorage.getItem('superAdmin');
      try {
        if (storedUser && storedUser !== 'undefined') setUser(JSON.parse(storedUser));
        else setUser(null);
      } catch (e) {
        setUser(null);
      }
      try {
        if (storedTeam && storedTeam !== 'undefined') setTeam(JSON.parse(storedTeam));
        else setTeam(null);
      } catch (e) {
        setTeam(null);
      }
      try {
        if (storedSuperAdmin && storedSuperAdmin !== 'undefined') setSuperAdmin(JSON.parse(storedSuperAdmin));
        else setSuperAdmin(null);
      } catch (e) {
        setSuperAdmin(null);
      }
    };

    handleStorageChange();
    
    // Listen for cross-tab or programmatic localStorage changes
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleStorageChange);
    };
  }, []);

  const handleCitySelect = (city) => {
    setSelectedCity(city);
    localStorage.setItem('selectedCity', city);
    setIsLocationModalOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('team');
    localStorage.removeItem('superAdmin');
    setUser(null);
    setTeam(null);
    setSuperAdmin(null);
    navigate('/login');
    window.location.reload();
  };

  return (
    <nav className="bg-[#333545] text-white">
      {/* Upper Nav */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-8">
        <Link to="/" className="flex items-center gap-0 tracking-tighter">
          <span className="text-3xl font-black italic text-white uppercase">Cine</span>
          <div className="mx-2 bg-primary p-1.5 rounded-lg rotate-12 flex items-center justify-center shadow-lg shadow-primary/30">
            <Clapperboard className="w-5 h-5 text-white" />
          </div>
          <span className="text-3xl font-black italic text-white uppercase">Reward</span>
        </Link>

        {/* Search Bar Component */}
        <SearchBar />

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsLocationModalOpen(true)}
            className="hidden lg:flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer text-sm font-medium transition-colors"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span>{selectedCity}</span>
          </button>


          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">
                <Coins className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-black">{user.coins}</span>
              </div>
              <Link to="/dashboard" className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                <User className="w-5 h-5 text-primary" />
              </Link>
              <button onClick={handleLogout} className="text-slate-400 hover:text-primary transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : team ? (
            <div className="flex items-center gap-4">
              <Link to="/team/dashboard" className="flex items-center gap-2 text-sm font-bold text-primary">
                <Film className="w-5 h-5" /> Team Hub
              </Link>
              <button onClick={handleLogout} className="text-slate-400 hover:text-primary transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : superAdmin ? (
            <div className="flex items-center gap-4">
              <Link to="/super-admin-dashboard" className="flex items-center gap-2 text-sm font-bold text-red-500 bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">
                <Shield className="w-5 h-5" /> SuperAdmin Hub
              </Link>
              <button onClick={handleLogout} className="text-slate-400 hover:text-primary transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="bg-primary hover:bg-primary-dark text-white px-5 py-1.5 rounded-md text-sm font-bold transition-all shadow-lg shadow-primary/20"
            >
              Sign In
            </Link>
          )}

          <button className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Lower Nav (Categories) */}
      <div className="bg-[#1f2131] border-t border-white/5 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="max-w-7xl mx-auto px-6 h-10 flex items-center justify-between text-xs font-medium tracking-wide">
           <div className="flex gap-8">
             <Link to="/" className="hover:text-primary transition-colors">Movies</Link>
             <Link to="/" className="hover:text-primary transition-colors">Stream</Link>
             <Link to="/" className="hover:text-primary transition-colors">Events</Link>
             <Link to="/" className="hover:text-primary transition-colors">Plays</Link>
             <Link to="/" className="hover:text-primary transition-colors">Sports</Link>
             <Link to="/" className="hover:text-primary transition-colors">Activities</Link>
           </div>
           <div className="hidden sm:flex gap-6">
             <Link to="/partner" className="hover:text-primary transition-colors">ListYourShow</Link>
             <Link to="/" className="hover:text-primary transition-colors">Corporates</Link>
             <Link to="/" className="hover:text-primary transition-colors">Offers</Link>
             <Link to="/" className="hover:text-primary transition-colors">Gift Cards</Link>
             <Link to="/team/login" className="text-primary font-black hover:underline transition-colors uppercase">Movie Team</Link>
             <Link to="/super-admin-login" className="text-red-500 font-black hover:underline transition-colors uppercase ml-4">SuperAdmin</Link>
           </div>
        </div>
      </div>

      {/* Mobile Menu Source */}
      {isMenuOpen && (
        <div className="lg:hidden bg-slate-900 p-6 space-y-4 border-t border-slate-800">
           <SearchBar />
           <Link to="/" className="block py-2 border-b border-slate-800">Movies</Link>
           <Link to="/team/login" className="block py-2 border-b border-slate-800 text-slate-500">Team Portal</Link>
        </div>
      )}

      {/* Location Modal */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsLocationModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 transition-colors z-10 p-2"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="p-8">
              <div className="flex items-center justify-center gap-3 mb-8">
                 <MapPin className="w-6 h-6 text-primary" />
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Select City</h2>
              </div>
              
              <div className="relative mb-10 max-w-xl mx-auto">
                 <SearchBar />
                 <p className="text-center text-primary text-sm font-bold mt-4 cursor-pointer hover:underline">Detect my location</p>
              </div>

              <div className="border-t border-slate-200 pt-8">
                <h3 className="text-center text-slate-500 font-bold mb-6">Popular Cities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                  {cities.map(city => (
                    <button
                      key={city.name}
                      onClick={() => handleCitySelect(city.name)}
                      className="group flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
                    >
                      <div className="text-4xl filter grayscale group-hover:grayscale-0 transition-all">
                        {city.icon}
                      </div>
                      <span className={`text-sm font-bold transition-colors ${selectedCity === city.name ? 'text-primary' : 'text-slate-600 group-hover:text-primary'}`}>
                        {city.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <button className="text-primary font-bold text-sm hover:underline">View All Cities</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
