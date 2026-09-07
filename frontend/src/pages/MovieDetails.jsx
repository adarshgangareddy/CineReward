import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Star, Clock, Calendar, Film, Users, Ticket as TicketIcon } from 'lucide-react';

const MovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await axios.get(`/api/movies/${id}`);
        setMovie(res.data);
      } catch (err) {
        console.error('Error fetching movie details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) return <div className="text-center py-20 text-white">Loading Movie Details...</div>;
  if (!movie) return <div className="text-center py-20 text-white">Movie not found</div>;

  const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original"; // High quality backdrop
  const POSTER_BASE = "https://image.tmdb.org/t/p/original"; // High quality poster

  return (
    <div className="min-h-screen pb-20">
      {/* Hero */}
      <div className="relative h-[600px] w-full">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent z-10"></div>
        <img 
          src={movie.backdrop_path?.startsWith('http') ? movie.backdrop_path : movie.backdrop_path ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}` : `https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80`} 
          alt={movie.title}
          className="w-full h-full object-cover opacity-50"
        />
        
        <div className="absolute inset-0 z-20 max-w-7xl mx-auto px-6 flex items-end pb-12">
          <div className="flex flex-col md:flex-row gap-12 items-end w-full">
            <div className="w-72 h-[450px] flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 hidden md:block">
              <img 
                src={movie.poster_path?.startsWith('http') ? movie.poster_path : movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : `https://picsum.photos/seed/${movie.id}/400/600`} 
                alt={movie.title} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1 text-yellow-500 font-bold text-xl">
                  <Star className="w-6 h-6 fill-yellow-500" />
                  <span>{movie.vote_average.toFixed(1)}</span>
                </div>
                <span className="text-slate-400">|</span>
                <span className="text-slate-300 font-medium">{movie.genres.map(g => g.name).join(', ')}</span>
              </div>
              
              <h1 className="text-6xl font-black text-white mb-6 leading-tight">{movie.title}</h1>
              
              <div className="flex gap-6 text-slate-300 mb-8">
                <span className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> {movie.runtime} min</span>
                <span className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> {movie.release_date}</span>
                <span className="flex items-center gap-2"><Film className="w-5 h-5 text-primary" /> {movie.status}</span>
              </div>

              <button 
                onClick={() => navigate(`/book/${movie.id}`)}
                className="bg-primary hover:bg-primary-dark text-white font-black text-xl px-12 py-5 rounded-2xl transition-all shadow-2xl shadow-primary/40 flex items-center gap-3"
              >
                <TicketIcon className="w-6 h-6" />
                <span>BOOK TICKETS</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 mt-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-2 space-y-12">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4 border-l-4 border-primary pl-4 uppercase tracking-wider">Synopsis</h2>
            <p className="text-slate-400 text-lg leading-relaxed">{movie.overview}</p>
          </div>

          <div>
             <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-primary pl-4 uppercase tracking-wider">Top Cast</h2>
             <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
               {movie.cast?.slice(0, 10).map(person => (
                 <div key={person.id} className="text-center group">
                   <div className="aspect-square rounded-full overflow-hidden mb-3 border-2 border-slate-800 group-hover:border-primary transition-all duration-300">
                     <img 
                      src={person.profile_path ? `${POSTER_BASE}${person.profile_path}` : 'https://via.placeholder.com/150'} 
                      alt={person.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                     />
                   </div>
                   <h4 className="text-white font-bold text-sm leading-tight">{person.name}</h4>
                   <p className="text-slate-500 text-xs mt-1">{person.character}</p>
                 </div>
               ))}
             </div>
          </div>
        </div>

        <div className="lg:col-span-1">
           <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-8 rounded-3xl sticky top-28">
             <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
               <Users className="w-5 h-5 text-primary" />
               Production Info
             </h3>
             <ul className="space-y-4 text-sm">
               <li className="flex justify-between border-b border-slate-800 pb-2">
                 <span className="text-slate-500 font-medium">Budget</span>
                 <span className="text-white font-bold">${(movie.budget / 1000000).toFixed(1)}M</span>
               </li>
               <li className="flex justify-between border-b border-slate-800 pb-2">
                 <span className="text-slate-500 font-medium">Revenue</span>
                 <span className="text-white font-bold">${(movie.revenue / 1000000).toFixed(1)}M</span>
               </li>
               <li className="flex justify-between border-b border-slate-800 pb-2">
                 <span className="text-slate-500 font-medium">Tagline</span>
                 <span className="text-white italic text-right max-w-[150px]">{movie.tagline || 'N/A'}</span>
               </li>
             </ul>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails;
