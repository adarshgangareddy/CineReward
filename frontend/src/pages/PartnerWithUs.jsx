import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Music, MapPin, BookOpen, PartyPopper, Trophy, Users, 
  ChevronRight, CheckCircle, ShieldCheck, Send, X, Info,
  Megaphone, BadgeDollarSign, UtensilsCrossed, Shield, BarChart3, Cpu, Calendar, Navigation, Crosshair, Search
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Map click handler component
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
};

// Component to programmatically fly to a location
const FlyToLocation = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 15, { duration: 1.5 });
  }, [position, map]);
  return null;
};

const PartnerWithUs = () => {
  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored || stored === 'undefined') return null;
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  };
  const [user] = useState(getStoredUser());
  const [formData, setFormData] = useState({
    userId: user?.id || null,
    name: user?.name || '', 
    email: user?.email || '', 
    phone: '', 
    eventType: '', 
    budget: '', 
    description: '', 
    eventDate: '', 
    eventLocation: '', 
    locationUrl: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [infoModal, setInfoModal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mapPosition, setMapPosition] = useState([12.9716, 77.5946]); // Default: Bangalore
  const [markerPos, setMarkerPos] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  const categories = [
    { id: 'Performances', label: 'Performances', icon: <Music className="w-8 h-8" />, desc: 'Music, Theatre & More', 
      color: 'purple', glow: 'glow-purple',
      detail: 'From underground gigs to massive theatrical stages. We provide concert-grade sound, lighting, and seamless ticketing for artist tours and cultural fests.',
      images: ['https://picsum.photos/seed/perf1/300/200', 'https://picsum.photos/seed/perf2/300/200', 'https://picsum.photos/seed/perf3/300/200'] },
    { id: 'Experiences', label: 'Experiences', icon: <MapPin className="w-8 h-8" />, desc: 'Workshops & Tours', 
      color: 'emerald', glow: 'glow-emerald',
      detail: 'Immersive guided tours, niche skill workshops, and adventure activities. Our tools help you manage registrations and provide unique participant interaction.',
      images: ['https://picsum.photos/seed/exp1/300/200', 'https://picsum.photos/seed/exp2/300/200', 'https://picsum.photos/seed/exp3/300/200'] },
    { id: 'Expositions', label: 'Expositions', icon: <BookOpen className="w-8 h-8" />, desc: 'Exhibits & Fairs', 
      color: 'amber', glow: 'glow-amber',
      detail: 'Art expos, tech summits, and cultural fairs. We handle booth management, visitor tracking, and digital catalogs for a professional exposition experience.',
      images: ['https://picsum.photos/seed/expo1/300/200', 'https://picsum.photos/seed/expo2/300/200', 'https://picsum.photos/seed/expo3/300/200'] },
    { id: 'Parties', label: 'Parties', icon: <PartyPopper className="w-8 h-8" />, desc: 'Nightlife & Socials', 
      color: 'rose', glow: 'glow-rose',
      detail: 'Club nights, DJ sets, and high-energy social parties. Integrated age verification, guest list management, and real-time entry tracking.',
      images: ['https://picsum.photos/seed/party1/300/200', 'https://picsum.photos/seed/party2/300/200', 'https://picsum.photos/seed/party3/300/200'] },
    { id: 'Sports', label: 'Sports', icon: <Trophy className="w-8 h-8" />, desc: 'Matches & Tourneys', 
      color: 'cyan', glow: 'glow-cyan',
      detail: 'Local tournaments, marathons, and esports leagues. Live scoring integration, bracket management, and multi-tier ticketing for sports fans.',
      images: ['https://picsum.photos/seed/sport1/300/200', 'https://picsum.photos/seed/sport2/300/200', 'https://picsum.photos/seed/sport3/300/200'] },
    { id: 'Conferences', label: 'Conferences', icon: <Users className="w-8 h-8" />, desc: 'Talks & Meets', 
      color: 'indigo', glow: 'glow-indigo',
      detail: 'Professional summits, networking meets, and keynote seminars. Session scheduling, speaker management, and corporate attendee tracking.',
      images: ['https://picsum.photos/seed/conf1/300/200', 'https://picsum.photos/seed/conf2/300/200', 'https://picsum.photos/seed/conf3/300/200'] },
  ];

  const services = [
    { id: 'S1', color: 'sky', glow: 'glow-sky', icon: <Megaphone />, label: 'Online Sales & Marketing', 
      desc: 'Targeted campaigns and social media integration.',
      detail: 'Boost your ticket sales with our precision-targeted social media marketing, email newsletters, and premium platform placement.' },
    { id: 'S2', color: 'green', glow: 'glow-green', icon: <BadgeDollarSign />, label: 'Pricing', 
      desc: 'Dynamic ticketing tiers and early bird offers.',
      detail: 'Maximize revenue with smart dynamic pricing algorithms, multiple ticket categories, and time-sensitive discount codes.' },
    { id: 'S3', color: 'orange', glow: 'glow-orange', icon: <UtensilsCrossed />, label: 'Food & Beverages', 
      desc: 'Full vendor coordination and stall setup.',
      detail: 'End-to-end F&B management from vendor selection to digital payment collection at stalls and crowd flow optimization.' },
    { id: 'S4', color: 'blue', glow: 'glow-blue', icon: <Shield />, label: 'Ground Support', 
      desc: 'Professional entry and crowd management.',
      detail: 'Trained entry staff and security with QR scanning, real-time analytics on turnout, and physical barrier logistics.' },
    { id: 'S5', color: 'violet', glow: 'glow-violet', icon: <BarChart3 />, label: 'Reports & Insights', 
      desc: 'Detailed analytics and audience demographics.',
      detail: 'Post-event deep dives into audience behavior, ticket sales funnels, and demographic breakdown for your next big show.' },
    { id: 'S6', color: 'rose', glow: 'glow-rose', icon: <Cpu />, label: 'POS & RFID', 
      desc: 'Cashless payments and automated turnstiles.',
      detail: 'Step into the future with RFID wristbands for seamless entry and cashless payments across your entire venue.' },
  ];

  const handleMapClick = async (latlng) => {
    setMarkerPos([latlng.lat, latlng.lng]);
    const mapsUrl = `https://www.google.com/maps?q=${latlng.lat},${latlng.lng}`;
    // Reverse geocode using Nominatim (free)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
      const data = await res.json();
      const locationName = data.display_name || `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`;
      setFormData(prev => ({ ...prev, eventLocation: locationName, locationUrl: mapsUrl }));
    } catch {
      setFormData(prev => ({ ...prev, eventLocation: `${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`, locationUrl: mapsUrl }));
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return alert('Geolocation is not supported by your browser');
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapPosition([latitude, longitude]);
        setMarkerPos([latitude, longitude]);
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          setFormData(prev => ({ ...prev, eventLocation: data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, locationUrl: mapsUrl }));
        } catch {
          setFormData(prev => ({ ...prev, eventLocation: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, locationUrl: mapsUrl }));
        }
        setLocatingUser(false);
      },
      () => { alert('Unable to retrieve your location'); setLocatingUser(false); },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.eventType) return alert('Please select an event type.');
    setLoading(true);
    try {
      await axios.post('/api/admin/partner/submit', {
        ...formData,
        budget: Number(formData.budget),
        userId: user?.id || null
      });
      setSubmitted(true);
      setLoading(false);
    } catch (err) {
      console.error('Submission failed', err);
      alert(err.response?.data?.message || 'Submission failed. Please check your data and try again.');
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-slate-950 min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="glass-card rounded-[4rem] p-16 max-w-2xl w-full text-center relative z-10 border-primary/20 shadow-[0_0_100px_rgba(244,63,94,0.1)]">
           <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-10 ring-8 ring-primary/5">
             <CheckCircle className="w-12 h-12 text-primary" />
           </div>
           <h2 className="text-5xl font-black text-white italic tracking-tighter uppercase mb-6 premium-gradient-text">Inquiry <span className="text-primary">Sent!</span></h2>
           <p className="text-slate-400 text-lg font-medium leading-relaxed mb-12">
             Elite partnership protocols initialized. Our team will review your requirements and reach out within 24-48 hours.
           </p>
           <button 
             onClick={() => window.location.href = '/'} 
             className="w-full btn-premium py-6 text-sm"
           >
             Return to Dashboard
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen pb-20 relative overflow-hidden">
      {/* Background Decorative Glows */}
      <div className="fixed top-1/4 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[160px] pointer-events-none"></div>
      <div className="fixed bottom-1/4 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[160px] pointer-events-none"></div>
      
      {/* Hero */}
      <div className="bg-slate-950 pt-32 pb-48 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -mr-64 -mt-64 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -ml-64 -mb-64"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase mb-6 premium-gradient-text leading-tight">
            Elevate Your <br />
            <span className="text-primary drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]">Event Game</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl font-medium leading-relaxed">
            From registration to encore, CineReward provides elite end-to-end solutions for the modern pioneer.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-20 space-y-20">
        {/* Category Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              onClick={() => setInfoModal(cat)}
              className={`glass-card ${cat.glow} rounded-[3.5rem] p-12 text-center hover:scale-[1.05] hover:bg-slate-900/80 transition-all duration-700 group cursor-pointer relative overflow-hidden ring-1 ring-white/5`}
            >
              <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
              <div className={`w-28 h-28 rounded-[2rem] mx-auto mb-8 flex items-center justify-center bg-slate-800/40 text-slate-400 group-hover:bg-white group-hover:text-black transition-all duration-700`}>
                {React.cloneElement(cat.icon, { className: 'w-12 h-12 stroke-[1.5px]' })}
              </div>
              <h3 className="font-black uppercase tracking-tight text-xl mb-3 text-white group-hover:tracking-widest transition-all duration-500">{cat.label}</h3>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em] mb-8">{cat.desc}</p>
              <div className="w-14 h-14 rounded-full border border-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all mx-auto shadow-inner">
                <Info className="w-6 h-6" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Track Inquiry Link */}
        <div className="flex justify-center">
          <button 
            onClick={() => window.location.href = '/partner-status'}
            className="flex items-center gap-2 text-slate-400 hover:text-primary transition-all text-xs font-black uppercase tracking-widest bg-slate-900/50 px-6 py-3 rounded-2xl border border-slate-800"
          >
            <Search className="w-4 h-4" /> Already submitted? Track your inquiry & pay
          </button>
        </div>

        {/* Services Section */}
        <div className="text-center space-y-24 py-32 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-primary/50 to-transparent"></div>
          <div className="space-y-6">
            <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter italic uppercase premium-gradient-text leading-none">
              Venues <span className="text-primary">Redefined</span>
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto font-medium text-xl leading-relaxed">
              Industrial-grade solutions for the high-end entertainment ecosystem.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {services.map((svc, i) => (
              <div 
                key={i} 
                onClick={() => setInfoModal(svc)}
                className={`glass-card ${svc.glow} rounded-[4rem] p-16 text-left hover:scale-[1.05] transition-all duration-700 group cursor-pointer relative overflow-hidden ring-1 ring-white/5`}
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-[80px] -mr-24 -mt-24 group-hover:bg-white/10 transition-all duration-700"></div>
                <div className={`w-24 h-24 bg-slate-800/40 rounded-[2rem] mb-10 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-black group-hover:scale-110 transition-all duration-700`}>
                  {React.cloneElement(svc.icon, { className: 'w-12 h-12 stroke-[2px]' })}
                </div>
                <h3 className="font-black text-white text-2xl uppercase tracking-tight mb-6 leading-tight group-hover:tracking-widest transition-all duration-500">{svc.label}</h3>
                <p className="text-base text-slate-400 font-medium leading-relaxed opacity-70 group-hover:opacity-100 transition-all duration-500">{svc.desc}</p>
                <div className="mt-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">
                  Learn More <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA to show form */}
        {!showForm && (
          <div className="text-center">
            <button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary-dark text-white font-black px-16 py-5 rounded-[2rem] transition-all shadow-2xl shadow-primary/30 uppercase tracking-widest text-sm">
              List your show
            </button>
          </div>
        )}

        {/* Contact Form */}
        {showForm && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12" id="contact-form">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-xl border border-slate-100">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic underline decoration-primary decoration-4 underline-offset-4 mb-2">Event Details</h2>
                <p className="text-slate-500 text-sm font-medium mb-10">Please fill in correctly for faster negotiation.</p>

                {/* Category selector */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-10">
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => setFormData({ ...formData, eventType: cat.id })}
                      className={`p-3 rounded-2xl text-center transition-all border-2 text-xs font-black uppercase ${formData.eventType === cat.id ? 'bg-primary/5 border-primary text-primary' : 'bg-slate-50 border-transparent text-slate-400 hover:border-slate-200'}`}>
                      <div className="mx-auto mb-1">{React.cloneElement(cat.icon, { className: 'w-5 h-5 mx-auto' })}</div>
                      {cat.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Your Name</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-slate-900" placeholder="Full Name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Email Address</label>
                      <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-slate-900" placeholder="email@company.com" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Phone Number</label>
                      <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-slate-900" placeholder="+91 XXXXX XXXXX" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Max Budget (₹)</label>
                      <input required type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-slate-900" placeholder="e.g. 50000" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-1"><Calendar className="w-3 h-3" /> Event Date</label>
                      <input required type="date" value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-slate-900" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Event Location</label>
                      <input required type="text" value={formData.eventLocation} onChange={e => setFormData({...formData, eventLocation: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-slate-900" placeholder="Click on map or type location" />
                    </div>
                  </div>

                    {/* Interactive Map */}
                    {showForm && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-1">
                            <Navigation className="w-3 h-3" /> Select Location on Map
                          </label>
                          <button type="button" onClick={handleUseCurrentLocation} disabled={locatingUser}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all disabled:opacity-50">
                            {locatingUser ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <Crosshair className="w-4 h-4" />
                            )}
                            {locatingUser ? 'Locating...' : 'Use Current Location'}
                          </button>
                        </div>
                        <div className="rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm" style={{ height: 350 }}>
                          <MapContainer 
                            center={mapPosition} 
                            zoom={12} 
                            style={{ height: '100%', width: '100%' }} 
                            scrollWheelZoom={true}
                          >
                            <TileLayer
                              attribution='&copy; OpenStreetMap'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapClickHandler onMapClick={handleMapClick} />
                            <FlyToLocation position={markerPos} />
                            {markerPos ? <Marker position={markerPos} /> : null}
                          </MapContainer>
                        </div>
                        {formData.eventLocation && (
                          <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                            <MapPin className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-green-700 break-words">{formData.eventLocation}</p>
                          </div>
                        )}
                      </div>
                    )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Brief Information</label>
                    <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:outline-none focus:border-primary transition-all font-bold text-slate-900 min-h-[150px]" placeholder="Tell us about the event, expected audience, and specific requirements..."></textarea>
                  </div>
                  <button type="submit" disabled={loading || !formData.eventType} className="w-full bg-primary hover:bg-primary-dark text-white font-black py-5 rounded-[2rem] transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-50">
                    {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <><span>Submit Partnership Inquiry</span><Send className="w-5 h-5" /></>}
                  </button>
                </form>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-8">
              <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><ShieldCheck className="w-32 h-32" /></div>
                <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-6">Why Partner With Us?</h3>
                <ul className="space-y-6">
                  {[
                    { title: 'Maximized Visibility', desc: 'Reach over 50k+ daily active users on our platform.' },
                    { title: 'Secure Payments', desc: 'Integrated escrow for budget negotiations.' },
                    { title: '24/7 Support', desc: 'Dedicated account manager for your event.' }
                  ].map((item, i) => (
                    <li key={i} className="flex gap-4">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shrink-0 mt-1"><ChevronRight className="w-4 h-4" /></div>
                      <div><p className="font-black uppercase text-xs tracking-widest mb-1">{item.title}</p><p className="text-slate-400 text-xs font-medium">{item.desc}</p></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4" onClick={() => setInfoModal(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-[3rem] max-w-lg w-full p-10 relative shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={`absolute top-0 right-0 w-64 h-64 opacity-20 blur-[100px] -mr-32 -mt-32 bg-white`}></div>
            
            <button onClick={() => setInfoModal(null)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors z-10"><X className="w-6 h-6" /></button>
            <div className="relative z-10 text-center space-y-6">
              <div className={`w-20 h-20 bg-white/10 rounded-3xl mx-auto flex items-center justify-center text-white`}>
                {React.cloneElement(infoModal.icon, { className: 'w-10 h-10' })}
              </div>
              <div>
                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{infoModal.label}</h3>
                <p className="text-slate-400 text-base font-medium mt-4 leading-relaxed">{infoModal.detail || infoModal.desc}</p>
              </div>
            </div>

            {infoModal.images && (
              <div className="relative z-10 mt-10">
                <p className="text-center text-slate-500 font-black uppercase text-[10px] tracking-[0.3em] mb-6">Visual Insights</p>
                <div className="flex gap-4 justify-center">
                  {infoModal.images.map((img, i) => (
                    <div key={i} className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                      <img src={img} alt="" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="relative z-10 mt-10">
              <button 
                onClick={() => { 
                  if (infoModal.id?.startsWith('S')) {
                    // Service click - just close or go to form with generic type
                    setInfoModal(null);
                    setShowForm(true);
                  } else {
                    setFormData({...formData, eventType: infoModal.id}); 
                    setInfoModal(null); 
                    setShowForm(true); 
                  }
                  setTimeout(() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' }), 100); 
                }}
                className="w-full bg-white text-black font-black py-5 rounded-3xl transition-all uppercase tracking-widest text-xs hover:bg-primary hover:text-white shadow-2xl shadow-white/5"
              >
                Inquire for {infoModal.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerWithUs;
