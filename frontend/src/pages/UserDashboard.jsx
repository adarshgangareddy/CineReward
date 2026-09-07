import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Ticket, Coins, Star, MessageSquare, Send, CheckCircle, Gift, ArrowRight } from 'lucide-react';

const UserDashboard = () => {
  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem('user');
      if (!stored || stored === 'undefined') return null;
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      return null;
    }
  };

  const [user, setUser] = useState(getStoredUser());
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('watching'); // changed from 'tickets'
  const [reviewForm, setReviewForm] = useState({ ticketId: '', movieId: '', rating: 10, comment: '' });

  useEffect(() => {
    fetchTickets();
    // fetchTickets reads and also updates `user` (via setUser), so adding it
    // as a dependency would cause an infinite refetch loop. It should only
    // run once on mount and whenever explicitly called afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTickets = async () => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }
    
    try {
      try {
        const userRes = await axios.get(`/api/users/${user.id}`);
        if (userRes.data) {
          const updatedUser = { ...user, coins: userRes.data.coins };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          // Signal Navbar to update
          window.dispatchEvent(new Event('userUpdated'));
        }
      } catch (e) {
        console.error('Failed to refresh user coins', e);
      }
      
      const res = await axios.get(`/api/tickets/user/${user.id}`);
      setTickets(res.data || []);
    } catch (err) {
      console.error(err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = () => {
    if (user.coins < 500) {
      alert('You need at least 500 coins to redeem a free ticket!');
      return;
    }
    alert('Congratulations! You redeemed a free movie ticket. A voucher has been sent to your email.');
    const updatedUser = { ...user, coins: user.coins - 500 };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user || !user.id) return alert("You must be logged in to submit a review.");
    
    try {
      await axios.post('/api/reviews/submit', { userId: user.id, ...reviewForm });
      alert('Review submitted! Thank you for your feedback.');
      setReviewForm({ ticketId: '', movieId: '', rating: 10, comment: '' });
      fetchTickets();
    } catch (err) {
      alert('Failed to submit review');
    }
  };

  // Helper to determine if a ticket is in the past
  const isTicketPast = (dateStr, timeStr) => {
    try {
      if (!timeStr || !dateStr) return false;
      // timeStr example: "07:30 PM", dateStr example: "3/14/2026"
      const [time, modifier] = timeStr.split(' ');
      let [hours, minutes] = time.split(':');
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
      
      const ticketDate = new Date(`${dateStr} ${hours}:${minutes}`);
      return ticketDate < new Date();
    } catch {
      return false; // Fallback
    }
  };

  const safeTickets = Array.isArray(tickets) ? tickets : [];
  const watchingTickets = safeTickets.filter(t => !isTicketPast(t.date, t.time));
  const previousTickets = safeTickets.filter(t => isTicketPast(t.date, t.time));
  const activeTickets = activeTab === 'watching' ? watchingTickets : previousTickets;

  if (loading) return <div className="text-center py-20 text-white">Loading your cinema profile...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sidebar */}
        <div className="w-full md:w-80 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 overflow-hidden relative">
             <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-3xl font-black text-white">
                  {user?.name?.[0] ? user.name[0].toUpperCase() : (user?.phone ? '📱' : 'U')}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">{user?.name || 'Cine Viewer'}</h2>
                 <p className="text-slate-500 text-xs truncate max-w-[150px]">{user?.email || user?.phone || 'No Contact Info'}</p>
               </div>
             </div>

             <div className="space-y-4">
               <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Coin Balance</span>
                   <Coins className="w-4 h-4 text-yellow-500" />
                 </div>
                 <p className="text-3xl font-black text-white">{user?.coins || 0}</p>
               </div>
               
               <button 
                onClick={handleRedeem}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-xl shadow-yellow-500/10 flex items-center justify-center gap-2"
               >
                 <Gift className="w-5 h-5" />
                 <span>REDEEM TICKET</span>
               </button>
               <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-tight">500 Coins = 1 Free Ticket</p>
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow space-y-8">
          <div className="flex gap-4 border-b border-slate-800 pb-2">
            <button 
              onClick={() => setActiveTab('watching')}
              className={`px-4 py-2 font-bold text-sm transition-all relative ${activeTab === 'watching' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Watching (Upcoming)
              {activeTab === 'watching' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full -mb-2"></div>}
            </button>
            <button 
              onClick={() => setActiveTab('previous')}
              className={`px-4 py-2 font-bold text-sm transition-all relative ${activeTab === 'previous' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Previous (Watched)
              {activeTab === 'previous' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full -mb-2"></div>}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {activeTickets.map(ticket => (
              <div key={ticket._id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row gap-8 transition-all hover:bg-slate-800/30">
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">{ticket.movieTitle || 'Movie Ticket'}</h3>
                      <p className="text-primary font-bold text-sm tracking-wide">{ticket.theatre}</p>
                    </div>
                    {ticket.reviewSubmitted ? (
                      <span className="bg-green-500/10 text-green-500 text-[10px] font-black px-3 py-1 rounded-full border border-green-500/20 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Reviewed
                      </span>
                    ) : (
                      <button 
                        onClick={() => setReviewForm({ ...reviewForm, ticketId: ticket._id, movieId: ticket.movieId })}
                        className="bg-primary/10 text-primary text-[10px] font-black px-4 py-1.5 rounded-full border border-primary/20 hover:bg-primary hover:text-white transition-all uppercase tracking-widest flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> Rate Now
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-600 uppercase block mb-1">Seats</span>
                      <span className="text-white font-bold">{ticket.seatNumber}</span>
                    </div>
                    <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-600 uppercase block mb-1">Date</span>
                      <span className="text-white font-bold">{ticket.date}</span>
                    </div>
                    <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800">
                      <span className="text-[10px] font-black text-slate-600 uppercase block mb-1">Time</span>
                      <span className="text-white font-bold">{ticket.time}</span>
                    </div>
                  </div>
                </div>

                <div className="sm:border-l sm:border-slate-800 sm:pl-8 flex flex-col justify-center items-center min-w-[120px]">
                   <div className="w-20 h-20 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center mb-3">
                     <Ticket className="w-10 h-10 text-slate-700" />
                   </div>
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ticket ID</span>
                   <span className="text-white font-mono text-xs mt-1">#{ticket._id.slice(-6).toUpperCase()}</span>
                </div>
              </div>
            ))}

            {activeTickets.length === 0 && (
              <div className="text-center py-24 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
                <Ticket className="w-16 h-16 text-slate-800 mx-auto mb-6" />
                <p className="text-slate-500 font-bold text-xl mb-4">
                  {activeTab === 'watching' ? "You don't have any upcoming movies." : "You haven't watched any movies yet."}
                </p>
                {activeTab === 'watching' && (
                  <Link to="/" className="text-primary font-bold flex items-center justify-center gap-2 hover:gap-4 transition-all">
                    Browse Movies <ArrowRight className="w-5 h-5" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewForm.ticketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[2.5rem] p-10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
              <h3 className="text-3xl font-black text-white mb-2 italic tracking-tighter uppercase">Rate Your Experience</h3>
              <p className="text-slate-500 text-sm mb-8 font-medium">Earn 100 Reward Coins for your genuine feedback.</p>
              <form onSubmit={handleReviewSubmit} className="space-y-6">
                <div className="mb-8">
                  <div className="flex justify-between items-end mb-6 pl-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Select Rating</label>
                    <span className="text-4xl font-black text-primary italic transition-all">{reviewForm.rating || '--'}</span>
                  </div>
                  
                  <div className="flex justify-between group">
                    {[...Array(10)].map((_, index) => {
                      const starValue = index + 1;
                      return (
                        <button
                          key={index}
                          type="button"
                          className={`transition-all duration-200 transform hover:scale-125 focus:outline-none ${starValue <= reviewForm.rating ? 'text-yellow-500' : 'text-slate-800'}`}
                          onClick={() => setReviewForm({ ...reviewForm, rating: starValue })}
                        >
                          <Star 
                           className={`w-6 h-6 md:w-8 md:h-8 ${starValue <= reviewForm.rating ? 'fill-yellow-500' : ''}`} 
                           strokeWidth={starValue <= reviewForm.rating ? 0 : 2}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Share your thoughts</label>
                  <textarea 
                    className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-5 text-white focus:outline-none focus:border-primary transition-all min-h-[150px] font-medium"
                    placeholder="Tell us what you liked about the story, cast, and direction..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})}
                  ></textarea>
                </div>
                
                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, ticketId: '' })}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-black px-6 rounded-full transition-all uppercase tracking-widest text-[10px] h-14"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    className="flex-grow bg-primary hover:bg-primary-dark text-white font-black rounded-full transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2 uppercase tracking-widest text-xs h-14"
                  >
                    <Send className="w-4 h-4 fill-white" />
                    <span>Send Review</span>
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
