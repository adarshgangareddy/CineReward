import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Star, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NotificationToast = ({ notification, onClose }) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const { title, body, data } = notification;
  const isReview = title?.toLowerCase().includes('review') || body?.toLowerCase().includes('review');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
        className="fixed bottom-4 md:bottom-8 inset-x-4 md:inset-auto md:right-8 z-[1000] w-auto md:w-full md:max-w-md"
      >
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          {/* Animated Background Pulse */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex gap-5 items-start">
            <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20">
              {isReview ? <Star className="w-7 h-7 text-primary animate-bounce" /> : <Bell className="w-7 h-7 text-primary" />}
            </div>
            
            <div className="flex-grow pt-1">
              <h4 className="text-white font-black uppercase tracking-tighter text-lg mb-1">{title}</h4>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">{body}</p>
              
              {(isReview || data?.url) && (
                <div className="mt-5 flex gap-3">
                  <button 
                    onClick={() => {
                      if (data?.url) navigate(data.url);
                      else if (data?.ticketId) navigate(`/review/${data.ticketId}`);
                      else navigate('/dashboard');
                      onClose();
                    }}
                    className="bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-primary/20"
                  >
                    {isReview ? 'Give Review Now' : 'Check Update'}
                  </button>
                  <button 
                    onClick={onClose}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl transition-all"
                  >
                    Later
                  </button>
                </div>
              )}

              {!isReview && (
                <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest">
                  <CheckCircle className="w-3 h-3" /> New Notification Received
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationToast;
