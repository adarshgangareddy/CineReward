import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Star, Send, CheckCircle, Ticket, Heart } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const QuickReview = () => {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const fetchTicketDetails = useCallback(async () => {
    try {
      const res = await axios.get(`/api/reviews/ticket-details?ticketId=${ticketId}`);
      setTicket(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired review link.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicketDetails();
  }, [fetchTicketDetails]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return alert('Please select a star rating.');
    
    setSubmitting(true);
    try {
      // We use a dedicated endpoint or reuse submitReview if we can bypass auth for this path
      // For simplicity here, I'll assume we can submit using ticketId + userId if we find it
      // but the requirement "no need to login" means we should allow it via ticketId alone
      await axios.post('/api/reviews/submit', { 
        ticketId, 
        movieId: ticket.movieId, 
        rating, 
        comment,
        isQuick: true // Flag to skip auth check in backend if ticketId is valid
      });
      setSubmitted(true);
    } catch (err) {
      alert('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <LoadingSpinner message="Validating Review Session..." />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
        <Ticket className="w-10 h-10 text-red-500 opacity-50" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Access Denied</h2>
      <p className="text-slate-500 max-w-sm mb-8">{error}</p>
      <a href="/" className="text-primary font-bold hover:underline">Back to Home</a>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 px-6 text-center animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-8 relative">
        <CheckCircle className="w-12 h-12 text-green-500" />
        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
      </div>
      <h2 className="text-4xl font-black text-white mb-4 italic tracking-tighter uppercase">Review Submitted!</h2>
      <p className="text-slate-400 max-w-sm text-lg leading-relaxed mb-10">
        Thank you for your feedback on <span className="text-white font-bold">{ticket.movieTitle}</span>. 
        High-quality reviews earn reward coins!
      </p>
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl mb-12">
        <div className="flex items-center gap-4 text-left">
           <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center">
             <Heart className="w-6 h-6 text-primary fill-primary" />
           </div>
           <div>
             <p className="text-white font-bold text-sm">You earned a chance!</p>
             <p className="text-slate-500 text-xs">Our team will review your feedback soon.</p>
           </div>
        </div>
      </div>
      <a href="/" className="bg-primary text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all uppercase tracking-widest text-sm">
        Browse More Movies
      </a>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-6 flex flex-col items-center">
      <div className="w-full max-w-lg">
        <div className="text-center mb-12">
           <div className="inline-block bg-primary/10 text-primary text-[10px] font-black px-4 py-1 rounded-full border border-primary/20 uppercase tracking-[0.3em] mb-4">
             Cinema Feedback
           </div>
           <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">How was the movie?</h1>
           <p className="text-slate-500 font-medium">Rate your experience for <span className="text-white">{ticket.movieTitle}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
           
           <div className="mb-12">
             <div className="flex justify-between items-end mb-6 pl-1">
               <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Select Rating</span>
               <span className="text-4xl font-black text-primary italic transition-all">{rating || hover || '--'}</span>
             </div>
             
             <div className="flex justify-between group">
               {[...Array(10)].map((_, index) => {
                 const starValue = index + 1;
                 return (
                   <button
                     key={index}
                     type="button"
                     className={`transition-all duration-200 transform hover:scale-125 focus:outline-none ${starValue <= (hover || rating) ? 'text-yellow-500' : 'text-slate-800'}`}
                     onClick={() => setRating(starValue)}
                     onMouseEnter={() => setHover(starValue)}
                     onMouseLeave={() => setHover(0)}
                   >
                     <Star 
                      className={`w-6 h-6 md:w-8 md:h-8 ${starValue <= (hover || rating) ? 'fill-yellow-500' : ''}`} 
                      strokeWidth={starValue <= (hover || rating) ? 0 : 2}
                     />
                   </button>
                 );
               })}
             </div>
           </div>

           <div className="space-y-3 mb-10">
             <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Share your thoughts (Optional)</label>
             <textarea
               className="w-full bg-slate-950 border-2 border-slate-850 rounded-3xl p-6 text-white focus:outline-none focus:border-primary transition-all min-h-[160px] font-medium placeholder:text-slate-700"
               placeholder="What did you love about the movie? Story, cast, cinematography..."
               value={comment}
               onChange={(e) => setComment(e.target.value)}
             ></textarea>
           </div>

           <button
             type="submit"
             disabled={submitting || rating === 0}
             className="w-full group relative"
           >
             <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-all"></div>
             <div className="relative bg-primary hover:bg-primary-dark text-white font-black py-5 rounded-full transition-all flex items-center justify-center gap-3 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed">
               {submitting ? (
                 <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
               ) : (
                 <>
                   <span className="tracking-widest uppercase text-sm pl-2">Send Review</span>
                   <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-2 transition-transform">
                     <Send className="w-5 h-5 fill-white" />
                   </div>
                 </>
               )}
             </div>
           </button>
        </form>

        <p className="mt-12 text-center text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] max-w-xs mx-auto leading-relaxed">
          Your feedback helps us improve and rewards the best reviewers.
        </p>
      </div>
    </div>
  );
};

export default QuickReview;
