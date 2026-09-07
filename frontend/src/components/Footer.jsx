import { Film, Instagram, MessageCircle, Tent, Github, Twitter, Mail, ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-950 border-t border-white/5 pt-20 pb-10 px-6 relative overflow-hidden">
      {/* Subtle Glows */}
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Partner Banner - Premium Version */}
        <div className="group bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-12 mb-20 flex flex-col md:flex-row items-center justify-between gap-8 border border-white/5 shadow-2xl hover:border-primary/20 transition-all duration-500">
           <div className="flex items-center gap-8">
             <div className="w-20 h-20 bg-slate-950 rounded-3xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-500">
               <Tent className="w-10 h-10 text-primary" />
             </div>
             <div>
               <h3 className="text-2xl md:text-3xl font-black text-white italic tracking-tighter uppercase mb-2">List your Show</h3>
               <p className="text-slate-400 text-sm md:text-base font-medium max-w-md">Reach 50k+ daily fans. Partner with CineReward for seamless ticketing and elite engagement.</p>
             </div>
           </div>
           <Link 
             to="/partner" 
             className="w-full md:w-auto bg-primary hover:bg-primary-dark text-white font-black px-12 py-5 rounded-2xl transition-all shadow-xl shadow-primary/20 uppercase tracking-widest text-sm flex items-center justify-center gap-2 group-hover:translate-x-2 transition-transform"
           >
             Contact today! <ArrowRight className="w-4 h-4" />
           </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-16 mb-20">
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 text-3xl font-black text-white italic tracking-tighter uppercase mb-8">
              <div className="p-2 bg-primary rounded-xl">
                <Film className="w-8 h-8 text-white" />
              </div>
              <span>Cine<span className="text-primary">Reward</span></span>
            </div>
            <p className="text-slate-500 text-lg leading-relaxed max-w-sm mb-8 font-medium">
              The next generation of cinema experiences. Watch, Review, and earn exclusive rewards in the most active movie community.
            </p>
            <div className="flex space-x-4">
              {[
                { icon: <Instagram />, url: 'https://www.instagram.com/zyntri_official?igsh=bTB3ejg0M3NwOWc4' },
                { icon: <MessageCircle />, url: 'https://chat.whatsapp.com/CKqtVSVs5k22DucoMptaeX?mode=gi_t' },
                { icon: <Twitter />, url: '#' },
                { icon: <Github />, url: 'https://github.com/AdarshAGangareddy/CineReward' }
              ].map((social, i) => (
                <a key={i} href={social.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all border border-white/5">
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-8 underline decoration-primary decoration-4 underline-offset-8">Quick Links</h4>
            <ul className="space-y-4 text-slate-500 font-bold text-sm">
              <li><Link to="/" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /> Now Showing</Link></li>
              <li><Link to="/dashboard" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /> User Dashboard</Link></li>
              <li><Link to="/partner" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /> Partner Program</Link></li>
              <li><Link to="/team/login" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /> Movie Team Login</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-8 underline decoration-primary decoration-4 underline-offset-8">Support</h4>
            <ul className="space-y-4 text-slate-500 font-bold text-sm">
              <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /> Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /> Terms of Use</a></li>
              <li><a href="#" className="hover:text-primary transition-colors flex items-center gap-2 group"><ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /> Privacy Policy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black uppercase tracking-widest text-xs mb-8 underline decoration-primary decoration-4 underline-offset-8">Reach Us</h4>
            <div className="space-y-6">
              <a href="mailto:zyntri.official@gmail.com" className="flex items-center gap-4 group">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-primary/20 group-hover:text-primary transition-all border border-white/5">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-slate-400 text-xs font-bold truncate">zyntri.official@gmail.com</span>
              </a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em] text-center md:text-left">
            © 2026 CineReward. Elite Cinema Platform. Built with ❤️ for the community.
          </p>
          <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-600">
            <a href="#" className="hover:text-primary transition-colors">Security</a>
            <a href="#" className="hover:text-primary transition-colors">System Status</a>
            <a href="#" className="hover:text-primary transition-colors">API Docs</a>
          </div>
        </div>
      </div>
    </footer>
  );
};



export default Footer;
