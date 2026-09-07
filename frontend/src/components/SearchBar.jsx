import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, X, Star, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const searchMovies = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      try {
        const res = await axios.get(`/api/search?query=${query}`);
        setResults(res.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    };
    
    const timeoutId = setTimeout(searchMovies, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);

  const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w200";

  return (
    <div className="relative flex-grow max-w-md mx-4 hidden lg:block">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-2 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all"
          placeholder="Search for Movies, Events, Sports..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[100] overflow-hidden">
          {results.map((movie) => (
            <Link 
              key={movie.id} 
              to={`/movie/${movie.id}`}
              onClick={() => { setIsOpen(false); setQuery(''); }}
              className="flex items-center gap-4 p-4 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-0"
            >
              <img 
                src={movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : 'https://via.placeholder.com/50x75'} 
                alt={movie.title}
                className="w-10 h-14 object-cover rounded shadow"
              />
              <div>
                <h4 className="text-sm font-bold text-white truncate max-w-[200px]">{movie.title}</h4>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1 text-yellow-500"><Star className="w-3 h-3 fill-yellow-500" /> {movie.vote_average.toFixed(1)}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {movie.release_date?.split('-')[0]}</span>
                </div>
              </div>
            </Link>
          ))}
          <div className="p-2 bg-slate-950 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest border-t border-slate-800">
            Press Enter to see all results
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
