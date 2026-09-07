import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Star, ThumbsUp, ChevronRight } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/movies/popular');
        const filteredMovies = Array.isArray(res.data) ? res.data.filter(m => m.poster_path) : [];
        setMovies(filteredMovies);
        setError(null);
      } catch (err) {
        console.error('Error fetching now playing movies:', err);
        setError('Failed to load movies. Showing recommendations.');
        // If API fails completely, use robust local fallback to keep the app workable
        setMovies([
          { id: 101, title: 'Red Lorry Film Festival 2026', poster_path: 'https://picsum.photos/seed/101/400/600', vote_average: 9.2, vote_count: 5900, popularity: 850, release_date: '2026-03-12' },
          { id: 102, title: 'The Kerala Story 2: Goes Beyond', poster_path: 'https://picsum.photos/seed/102/400/600', vote_average: 9.2, vote_count: 19500, popularity: 920, release_date: '2026-03-10' },
          { id: 103, title: 'Dhurandhar The Revenge', poster_path: 'https://picsum.photos/seed/103/400/600', vote_average: 8.8, vote_count: 513000, popularity: 780, release_date: '2026-03-08' },
          { id: 104, title: 'Hoppers', poster_path: 'https://picsum.photos/seed/104/400/600', vote_average: 9.2, vote_count: 2300, popularity: 650, release_date: '2026-03-05' },
          { id: 105, title: 'O\' Romeo', poster_path: 'https://picsum.photos/seed/105/400/600', vote_average: 8.5, vote_count: 157000, popularity: 880, release_date: '2026-03-01' },
          { id: 106, title: 'The Fall Guy', poster_path: 'https://picsum.photos/seed/106/400/600', vote_average: 7.8, vote_count: 1200, popularity: 450, release_date: '2026-05-03' },
          { id: 107, title: 'Kingdom of the Planet of the Apes', poster_path: 'https://picsum.photos/seed/107/400/600', vote_average: 8.2, vote_count: 3400, popularity: 950, release_date: '2026-05-10' },
          { id: 108, title: 'Challengers', poster_path: 'https://picsum.photos/seed/108/400/600', vote_average: 7.5, vote_count: 800, popularity: 300, release_date: '2026-04-26' },
          { id: 109, title: 'Furiosa: A Mad Max Saga', poster_path: 'https://picsum.photos/seed/109/400/600', vote_average: 8.9, vote_count: 6700, popularity: 1200, release_date: '2026-05-24' },
          { id: 110, title: 'IF', poster_path: 'https://picsum.photos/seed/110/400/600', vote_average: 7.0, vote_count: 1500, popularity: 500, release_date: '2026-05-17' },
          { id: 111, title: 'Civil War', poster_path: 'https://picsum.photos/seed/111/400/600', vote_average: 8.1, vote_count: 4500, popularity: 800, release_date: '2026-04-12' },
          { id: 112, title: 'The Garfield Movie', poster_path: 'https://picsum.photos/seed/112/400/600', vote_average: 6.5, vote_count: 2100, popularity: 600, release_date: '2026-05-24' },
          { id: 113, title: 'Kalki 2898 AD', poster_path: 'https://picsum.photos/seed/113/400/600', vote_average: 9.5, vote_count: 85000, popularity: 2000, release_date: '2026-06-27' },
          { id: 114, title: 'Inside Out 2', poster_path: 'https://picsum.photos/seed/114/400/600', vote_average: 8.8, vote_count: 15000, popularity: 1500, release_date: '2026-06-14' },
          { id: 115, title: 'Deadpool & Wolverine', poster_path: 'https://picsum.photos/seed/115/400/600', vote_average: 9.8, vote_count: 250000, popularity: 3000, release_date: '2026-07-26' },
          { id: 116, title: 'Pushpa 2: The Rule', poster_path: 'https://picsum.photos/seed/116/400/600', vote_average: 9.6, vote_count: 120000, popularity: 2500, release_date: '2026-08-15' },
          { id: 117, title: 'Joker: Folie à Deux', poster_path: 'https://picsum.photos/seed/117/400/600', vote_average: 8.4, vote_count: 9000, popularity: 1100, release_date: '2026-10-04' },
          { id: 118, title: 'Moana 2', poster_path: 'https://picsum.photos/seed/118/400/600', vote_average: 8.0, vote_count: 4000, popularity: 850, release_date: '2026-11-27' },
          { id: 119, title: 'Sonic the Hedgehog 3', poster_path: 'https://picsum.photos/seed/119/400/600', vote_average: 7.9, vote_count: 5000, popularity: 900, release_date: '2026-12-20' },
          { id: 120, title: 'Interstellar (Re-release)', poster_path: 'https://picsum.photos/seed/120/400/600', vote_average: 9.9, vote_count: 500000, popularity: 5000, release_date: '2014-11-07' },
          { id: 121, title: 'Gladiator II', poster_path: 'https://picsum.photos/seed/121/400/600', vote_average: 8.3, vote_count: 7500, popularity: 1300, release_date: '2026-11-22' },
          { id: 122, title: 'Wicked', poster_path: 'https://picsum.photos/seed/122/400/600', vote_average: 8.6, vote_count: 11200, popularity: 1600, release_date: '2026-11-27' },
          { id: 123, title: 'Kraven the Hunter', poster_path: 'https://picsum.photos/seed/123/400/600', vote_average: 7.1, vote_count: 3200, popularity: 750, release_date: '2026-12-13' },
          { id: 124, title: 'Mufasa: The Lion King', poster_path: 'https://picsum.photos/seed/124/400/600', vote_average: 8.2, vote_count: 8900, popularity: 1450, release_date: '2026-12-20' },
          { id: 125, title: 'Nosferatu', poster_path: 'https://picsum.photos/seed/125/400/600', vote_average: 7.8, vote_count: 4100, popularity: 600, release_date: '2026-12-25' },
          { id: 126, title: 'Captain America: Brave New World', poster_path: 'https://picsum.photos/seed/126/400/600', vote_average: 8.5, vote_count: 15400, popularity: 2200, release_date: '2025-02-14' },
          { id: 127, title: 'Snow White', poster_path: 'https://picsum.photos/seed/127/400/600', vote_average: 7.3, vote_count: 5600, popularity: 950, release_date: '2025-03-21' },
          { id: 128, title: 'Elio', poster_path: 'https://picsum.photos/seed/128/400/600', vote_average: 8.1, vote_count: 6700, popularity: 1100, release_date: '2025-06-13' },
          { id: 129, title: 'Superman', poster_path: 'https://picsum.photos/seed/129/400/600', vote_average: 9.1, vote_count: 45000, popularity: 3500, release_date: '2025-07-11' },
          { id: 130, title: 'The Fantastic Four', poster_path: 'https://picsum.photos/seed/130/400/600', vote_average: 8.8, vote_count: 32000, popularity: 2800, release_date: '2025-07-25' },
          { id: 131, title: 'Avatar 3', poster_path: 'https://picsum.photos/seed/131/400/600', vote_average: 8.9, vote_count: 15000, popularity: 3400, release_date: '2025-12-19' },
          { id: 132, title: 'Avengers: Doomsday', poster_path: 'https://picsum.photos/seed/132/400/600', vote_average: 9.3, vote_count: 50000, popularity: 4500, release_date: '2026-05-01' },
          { id: 133, title: 'Blade', poster_path: 'https://picsum.photos/seed/133/400/600', vote_average: 8.2, vote_count: 12000, popularity: 2100, release_date: '2025-11-07' },
          { id: 134, title: 'The Batman Part II', poster_path: 'https://picsum.photos/seed/134/400/600', vote_average: 9.0, vote_count: 42000, popularity: 3800, release_date: '2025-10-03' },
          { id: 135, title: 'Minecraft', poster_path: 'https://picsum.photos/seed/135/400/600', vote_average: 7.5, vote_count: 8500, popularity: 1900, release_date: '2025-04-04' },
          { id: 136, title: 'Fast X: Part 2', poster_path: 'https://picsum.photos/seed/136/400/600', vote_average: 8.1, vote_count: 22000, popularity: 3100, release_date: '2025-04-04' },
          { id: 137, title: 'Zootopia 2', poster_path: 'https://picsum.photos/seed/137/400/600', vote_average: 8.6, vote_count: 14000, popularity: 2300, release_date: '2025-11-26' },
          { id: 138, title: 'The Conjuring: Last Rites', poster_path: 'https://picsum.photos/seed/138/400/600', vote_average: 8.0, vote_count: 11000, popularity: 1800, release_date: '2025-09-05' },
          { id: 139, title: 'Tron: Ares', poster_path: 'https://picsum.photos/seed/139/400/600', vote_average: 8.3, vote_count: 9800, popularity: 1700, release_date: '2025-10-10' },
          { id: 140, title: 'Toy Story 5', poster_path: 'https://picsum.photos/seed/140/400/600', vote_average: 8.7, vote_count: 18000, popularity: 2500, release_date: '2026-06-19' },
          { id: 141, title: 'Shrek 5', poster_path: 'https://picsum.photos/seed/141/400/600', vote_average: 9.1, vote_count: 28000, popularity: 3300, release_date: '2025-05-16' },
          { id: 142, title: 'Mission: Impossible 8', poster_path: 'https://picsum.photos/seed/142/400/600', vote_average: 8.9, vote_count: 31000, popularity: 3100, release_date: '2025-05-23' },
          { id: 143, title: 'Super Mario Bros 2', poster_path: 'https://picsum.photos/seed/143/400/600', vote_average: 8.5, vote_count: 16000, popularity: 2600, release_date: '2026-04-03' },
          { id: 144, title: 'Star Wars: New Jedi Order', poster_path: 'https://picsum.photos/seed/144/400/600', vote_average: 8.4, vote_count: 19000, popularity: 2800, release_date: '2026-05-22' },
          { id: 145, title: 'Dune: Messiah', poster_path: 'https://picsum.photos/seed/145/400/600', vote_average: 9.4, vote_count: 45000, popularity: 4000, release_date: '2026-12-18' },
          { id: 146, title: 'Frozen 3', poster_path: 'https://picsum.photos/seed/146/400/600', vote_average: 8.8, vote_count: 21000, popularity: 2900, release_date: '2026-11-25' },
          { id: 147, title: 'Spider-Man 4', poster_path: 'https://picsum.photos/seed/147/400/600', vote_average: 9.2, vote_count: 38000, popularity: 3900, release_date: '2026-07-24' },
          { id: 148, title: 'John Wick 5', poster_path: 'https://picsum.photos/seed/148/400/600', vote_average: 9.0, vote_count: 29000, popularity: 3200, release_date: '2026-03-24' },
          { id: 149, title: 'The Mandalorian & Grogu', poster_path: 'https://picsum.photos/seed/149/400/600', vote_average: 8.7, vote_count: 24000, popularity: 2700, release_date: '2026-05-22' },
          { id: 150, title: 'Avengers: Secret Wars', poster_path: 'https://picsum.photos/seed/150/400/600', vote_average: 9.6, vote_count: 60000, popularity: 5000, release_date: '2027-05-07' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh]">
        <LoadingSpinner message="Loading Premium Movies..." />
      </div>
    );
  }

  const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

  return (
    <div className="bg-[#f5f5f5] min-h-screen">

      {/* Recommended Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Recommended Movies</h2>
          <Link to="/" className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
            See All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {movies.map((movie) => (
            <div key={movie.id} className="group cursor-pointer">
              <Link to={`/movie/${movie.id}`} className="block relative aspect-[2/3] rounded-xl overflow-hidden shadow-md mb-3">
                <img 
                  src={movie.poster_path?.startsWith('http') ? movie.poster_path : movie.poster_path?.startsWith('/') ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : `https://picsum.photos/seed/${movie.id}/400/600`} 
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {movie.id === 101 && (
                   <div className="absolute top-3 right-3 bg-[#f84464] text-white text-[8px] font-black px-2 py-1 rounded-sm uppercase tracking-tighter">Film Festival</div>
                )}

                {/* Overlay Bottom */}
                <div className="absolute bottom-0 left-0 w-full bg-black/90 p-2 border-t border-white/10">
                  <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-1.5">
                       {movie.id === 101 || movie.id === 103 || movie.id === 105 ? (
                          <ThumbsUp className="w-3.5 h-3.5 text-green-500 fill-green-500" />
                       ) : (
                          <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                       )}
                       <span className="text-[11px] font-black text-white">
                         {movie.id === 101 || movie.id === 103 || movie.id === 105 ? `${(movie.vote_count / 1000).toFixed(1)}K Likes` : `${movie.vote_average.toFixed(1)}/10`}
                       </span>
                    </div>
                    {!(movie.id === 101 || movie.id === 103 || movie.id === 105) && (
                      <div className="text-[9px] font-bold text-slate-400">
                        {(movie.vote_count / 1000).toFixed(1)}K Votes
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              
              <div className="px-1">
                <h3 className="text-[17px] font-extrabold text-[#222] tracking-tight leading-tight mb-0.5 mt-2 line-clamp-1">{movie.title}</h3>
                <p className="text-slate-500 text-sm font-medium mb-1">
                  {movie.id === 102 ? 'Drama/Social' : 'Action/Thriller'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Home;
