require("dotenv").config();
const axios = require("axios");
const { getSupabase, isSupabaseReady } = require("../config/supabase");
const { mapMovie } = require("../utils/dbMappers");
const {
  formatTmdbFinancials,
  formatCurrencyCompact,
} = require("../utils/currencyHelper");

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_W500 = "https://image.tmdb.org/t/p/w500";
const TMDB_IMAGE_ORIG = "https://image.tmdb.org/t/p/original";
const TVMAZE_BASE_URL = "https://api.tvmaze.com";
const GHIBLI_BASE_URL = "https://ghibliapi.vercel.app";
const OMDB_BASE_URL = "https://www.omdbapi.com";

// In-memory TTL cache
const cache = new Map();
const SHORT_TTL = 5 * 60 * 1000; // 5 minutes
const LONG_TTL = 30 * 60 * 1000; // 30 minutes

const getCachedData = (key, ttl = SHORT_TTL) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const getApiKey = () => process.env.TMDB_API_KEY;
const getOmdbKey = () => process.env.OMDB_API_KEY || "thewdb";

const GENRE_MAP = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10765: "Sci-Fi & Fantasy",
  10768: "War & Politics",
};

const GENRE_NAME_TO_ID = {
  action: 28,
  adventure: 12,
  animation: 16,
  anime: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "sci-fi": 878,
  scifi: 878,
  thriller: 53,
  war: 10752,
};

const OTT_PROVIDERS = {
  netflix: "8",
  prime: "119",
  hotstar: "122|337",
  apple: "350",
};

const COLLECTIONS_CONFIG = [
  {
    slug: "marvel-collection",
    title: "Marvel Collection",
    category: "Superheroes",
    description:
      "The complete multiverse of Avengers, Spider-Man, Iron Man, Guardians, and X-Men sagas.",
    source: "tmdb",
    collectionIds: [86311, 531241, 131292, 131295, 284433, 448150, 529892, 748],
    badge: "MCU & Multiverse",
  },
  {
    slug: "dc-universe",
    title: "DC Universe",
    category: "Superheroes",
    description:
      "Gotham nights, Kryptonian legends, and darker justice across iconic DC films.",
    source: "tmdb",
    collectionIds: [263, 209131, 987044, 468552, 573693, 531242, 724848],
    badge: "DC Legends",
  },
  {
    slug: "fast-and-furious",
    title: "Fast and Furious Franchise",
    category: "Action Franchises",
    description:
      "High-octane street racing, impossible heists, and family across the globe.",
    source: "tmdb",
    collectionIds: [9485],
    badge: "High Octane",
  },
  {
    slug: "pirates-of-the-caribbean",
    title: "Pirates of the Caribbean Collection",
    category: "Action Franchises",
    description:
      "Set sail with Captain Jack Sparrow across cursed seas and lost treasures.",
    source: "tmdb",
    collectionIds: [295],
    badge: "Adventure Saga",
  },
  {
    slug: "harry-potter-wizarding",
    title: "Wizarding World Collection",
    category: "Sci-Fi & Fantasy",
    description:
      "Return to Hogwarts and the magical battles of Harry Potter and Fantastic Beasts.",
    source: "tmdb",
    collectionIds: [1241, 435259],
    badge: "Fantasy Classic",
  },
  {
    slug: "john-wick-saga",
    title: "John Wick Saga",
    category: "Action Franchises",
    description:
      "Precision choreography, neon-lit underworld rules, and relentless action.",
    source: "tmdb",
    collectionIds: [404609],
    badge: "Action Noir",
  },
  {
    slug: "mission-impossible",
    title: "Mission: Impossible Collection",
    category: "Action Franchises",
    description:
      "Ethan Hunt and the IMF team tackling death-defying espionage missions.",
    source: "tmdb",
    collectionIds: [87359],
    badge: "Espionage",
  },
  {
    slug: "star-wars-universe",
    title: "Star Wars Universe",
    category: "Sci-Fi & Fantasy",
    description:
      "A galaxy far, far away — Skywalker sagas, Jedi tales, and rebellion.",
    source: "tmdb",
    collectionIds: [10],
    badge: "Space Opera",
  },
  {
    slug: "studio-ghibli",
    title: "Studio Ghibli Classics",
    category: "Anime & Animation",
    description:
      "Hand-crafted animated masterpieces powered live by the Studio Ghibli API.",
    source: "ghibli",
    collectionIds: [],
    badge: "Studio Ghibli API",
  },
  {
    slug: "indian-blockbusters",
    title: "Indian Blockbuster Universes",
    category: "Indian Universes",
    description:
      "Baahubali, KGF, Pushpa, Tiger, Drishyam, and monumental Indian cinema epics.",
    source: "tmdb-indian",
    collectionIds: [350309, 657153, 921781, 1029834, 485645, 1793488],
    badge: "Pan-India Hits",
  },
  {
    slug: "sci-fi-epics",
    title: "Sci-Fi & Cyberpunk Epics",
    category: "Sci-Fi & Fantasy",
    description:
      "Dune, Avatar, The Matrix, and Blade Runner — visionary worlds beyond imagination.",
    source: "tmdb",
    collectionIds: [726871, 87096, 2344, 422837],
    badge: "4K Visionary",
  },
  {
    slug: "anime-adventures",
    title: "Animation & Family Legends",
    category: "Anime & Animation",
    description:
      "Toy Story, Kung Fu Panda, How to Train Your Dragon, and animated blockbusters.",
    source: "tmdb",
    collectionIds: [10194, 77816, 8917, 2150],
    badge: "Family & Anime",
  },
];

const resolvePosterUrl = (path, highRes = false) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${highRes ? TMDB_IMAGE_ORIG : TMDB_IMAGE_W500}${path}`;
};

const normalizeTmdbMovie = (item, forcedMediaType) => {
  const mediaType =
    forcedMediaType || (item.media_type === "tv" || item.first_air_date ? "tv" : "movie");
  const rawId = item.id;
  const id = mediaType === "tv" ? `tv-${rawId}` : String(rawId);
  const title = item.title || item.name || "Untitled";
  const releaseDate = item.release_date || item.first_air_date || "";
  const year = releaseDate ? releaseDate.slice(0, 4) : "";
  const genreIds = Array.isArray(item.genre_ids)
    ? item.genre_ids
    : Array.isArray(item.genres)
      ? item.genres.map((g) => g.id)
      : [];
  const genres = Array.isArray(item.genres)
    ? item.genres
    : genreIds.map((gid) => ({ id: gid, name: GENRE_MAP[gid] || "Cinema" }));

  return {
    id,
    rawId,
    mediaType,
    source: "tmdb",
    title,
    overview: item.overview || "",
    poster_path: resolvePosterUrl(item.poster_path, false),
    backdrop_path: resolvePosterUrl(item.backdrop_path || item.poster_path, true),
    vote_average: Number(item.vote_average || 0),
    vote_count: Number(item.vote_count || 0),
    popularity: Number(item.popularity || 0),
    release_date: releaseDate,
    year,
    original_language: item.original_language || "en",
    genre_ids: genreIds,
    genres,
    quality: (item.vote_average || 0) >= 7.5 ? "IMAX" : "1080p",
    bookable: mediaType === "movie",
  };
};

const normalizeTvMazeShow = (show) => {
  const cleanSummary = (show.summary || "")
    .replace(/<[^>]+>/g, "")
    .trim();
  const year = show.premiered ? show.premiered.slice(0, 4) : "";
  const genres = (show.genres || []).map((name, idx) => ({
    id: 9000 + idx,
    name,
  }));
  const rating = Number(show.rating?.average || 7.5);
  return {
    id: `tvmaze-${show.id}`,
    rawId: show.id,
    mediaType: "tv",
    source: "tvmaze",
    title: show.name || "TV Show",
    overview: cleanSummary || "Series available via TVMaze public directory.",
    poster_path: show.image?.original || show.image?.medium || "",
    backdrop_path: show.image?.original || show.image?.medium || "",
    vote_average: rating,
    vote_count: Math.round((show.weight || 80) * 120),
    popularity: Number(show.weight || 50),
    release_date: show.premiered || "",
    year,
    runtime: show.averageRuntime || show.runtime || 45,
    original_language: (show.language || "English").slice(0, 2).toLowerCase(),
    languageLabel: show.language || "English",
    network: show.network?.name || show.webChannel?.name || "Streaming",
    genre_ids: [],
    genres,
    quality: "1080p",
    bookable: false,
  };
};

const normalizeGhibliFilm = (film) => {
  const score = Number(film.rt_score || 85) / 10;
  return {
    id: `ghibli-${film.id}`,
    rawId: film.id,
    mediaType: "movie",
    source: "ghibli",
    title: film.title,
    originalTitle: film.original_title,
    overview: film.description || "",
    poster_path: film.image || "",
    backdrop_path: film.movie_banner || film.image || "",
    vote_average: Number(score.toFixed(1)),
    vote_count: 15000 + Number(film.rt_score || 85) * 120,
    popularity: Number(film.rt_score || 85) * 10,
    release_date: `${film.release_date || "2001"}-01-01`,
    year: String(film.release_date || ""),
    runtime: Number(film.running_time || 110),
    director: film.director,
    producer: film.producer,
    original_language: "ja",
    genre_ids: [16, 14, 12],
    genres: [
      { id: 16, name: "Animation" },
      { id: 14, name: "Fantasy" },
      { id: 12, name: "Adventure" },
    ],
    quality: "4K",
    bookable: true,
  };
};

const dedupeById = (items) => {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item || !item.id) continue;
    const key = String(item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

const FALLBACK_MOVIES = [
  {
    id: "550",
    rawId: 550,
    mediaType: "movie",
    source: "tmdb",
    title: "Fight Club",
    overview:
      "An insomniac office worker and a devil-may-care soap maker form an underground fight club.",
    poster_path: "https://picsum.photos/seed/550/400/600",
    backdrop_path: "https://picsum.photos/seed/550_bg/1280/720",
    vote_average: 8.4,
    vote_count: 28500,
    popularity: 920,
    release_date: "1999-10-15",
    year: "1999",
    original_language: "en",
    genre_ids: [18, 53],
    genres: [{ id: 18, name: "Drama" }, { id: 53, name: "Thriller" }],
    quality: "IMAX",
    bookable: true,
  },
  {
    id: "157336",
    rawId: 157336,
    mediaType: "movie",
    source: "tmdb",
    title: "Interstellar",
    overview:
      "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    poster_path: "https://picsum.photos/seed/157336/400/600",
    backdrop_path: "https://picsum.photos/seed/157336_bg/1280/720",
    vote_average: 8.7,
    vote_count: 35000,
    popularity: 1250,
    release_date: "2014-11-05",
    year: "2014",
    original_language: "en",
    genre_ids: [12, 18, 878],
    genres: [{ id: 12, name: "Adventure" }, { id: 878, name: "Sci-Fi" }],
    quality: "IMAX",
    bookable: true,
  },
];

async function tmdbGet(path, params = {}, ttl = SHORT_TTL) {
  const apiKey = getApiKey();
  const cacheKey = `tmdb:${path}:${JSON.stringify(params)}`;
  const cached = getCachedData(cacheKey, ttl);
  if (cached) return cached;

  const response = await axios.get(`${TMDB_BASE_URL}${path}`, {
    params: { api_key: apiKey, ...params },
    timeout: 5000,
  });
  setCachedData(cacheKey, response.data);
  return response.data;
}

const CITY_THEATRES_MAP = {
  Hyderabad: [
    { name: "AMB Cinemas: Gachibowli", area: "Gachibowli", badge: "Dolby Atmos • 4K Laser", formats: ["2D", "3D", "Dolby Atmos"], price: 320, amenities: ["M-Ticket", "Dolby Atmos", "Gourmet F&B"] },
    { name: "Prasads Multiplex: Necklace Road", area: "Necklace Road", badge: "PCX Giant Screen • Atmos", formats: ["2D", "3D", "IMAX 2D"], price: 295, amenities: ["M-Ticket", "PCX Screen", "Food Court"] },
    { name: "PVR ICON: Hitech City", area: "Madhapur", badge: "4K Laser • Dolby 7.1", formats: ["2D", "3D", "IMAX 2D"], price: 350, amenities: ["M-Ticket", "Recliners", "Valet"] },
    { name: "AAA Cinemas: Ameerpet", area: "Ameerpet", badge: "Barco 4K • Dolby Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 295, amenities: ["M-Ticket", "Dolby Atmos", "Lounge"] },
    { name: "INOX: GVK One Banjara Hills", area: "Banjara Hills", badge: "Insignia Luxe • 4K", formats: ["2D", "3D"], price: 340, amenities: ["M-Ticket", "Luxury Seating", "Cafe"] },
    { name: "PVR: Nexus Mall Kukatpally", area: "Kukatpally", badge: "4DX • Dolby 7.1", formats: ["2D", "3D", "4DX"], price: 310, amenities: ["M-Ticket", "4DX Motion", "Food Court"] },
    { name: "Sudarshan 35mm: RTC X Roads", area: "RTC X Roads", badge: "4K Christie • Dolby Atmos", formats: ["2D", "Dolby Atmos"], price: 210, amenities: ["M-Ticket", "Mass Ambience", "Atmos"] },
    { name: "Asian M Cube: Attapur", area: "Attapur", badge: "RGB 4K Laser • Dolby", formats: ["2D", "3D"], price: 230, amenities: ["M-Ticket", "Food & Beverage"] },
    { name: "Cinepolis: Mantra Mall", area: "Attapur", badge: "VIP Recliners • 4K", formats: ["2D", "3D"], price: 280, amenities: ["M-Ticket", "Recliners", "Popcorn Bar"] },
    { name: "PVR Irrum Manzil: Next Galleria", area: "Punjagutta", badge: "Dolby Digital 7.1", formats: ["2D", "3D", "IMAX 2D"], price: 295, amenities: ["M-Ticket", "Metro Connected"] },
  ],
  Bengaluru: [
    { name: "PVR ICON: Orion Mall", area: "Rajajinagar", badge: "IMAX 4K • Gold Class", formats: ["2D", "3D", "IMAX 2D", "IMAX 3D"], price: 420, amenities: ["M-Ticket", "IMAX Laser", "Recliners"] },
    { name: "Urvashi Digital Cinema: Lalbagh", area: "Lalbagh Road", badge: "Dolby Atmos • 4K Laser", formats: ["2D", "3D", "Dolby Atmos"], price: 280, amenities: ["M-Ticket", "Dolby Atmos", "Curved Screen"] },
    { name: "PVR: Phoenix Marketcity", area: "Whitefield", badge: "4DX • IMAX Laser", formats: ["2D", "3D", "IMAX 2D", "4DX"], price: 450, amenities: ["M-Ticket", "4DX Motion", "Gold Class"] },
    { name: "INOX: Garuda Mall", area: "Magrath Road", badge: "Insignia • Dolby Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 360, amenities: ["M-Ticket", "Dolby Atmos", "Gourmet F&B"] },
    { name: "Cinepolis: Nexus Shantiniketan", area: "Whitefield", badge: "IMAX • VIP Recliners", formats: ["2D", "3D", "IMAX 2D"], price: 390, amenities: ["M-Ticket", "VIP Lounge", "Valet"] },
    { name: "PVR: Vega City Mall", area: "Bannerghatta Road", badge: "Dual Laser IMAX", formats: ["2D", "3D", "IMAX 2D", "IMAX 3D"], price: 410, amenities: ["M-Ticket", "IMAX Screen", "Food Court"] },
    { name: "INOX: Mantri Square", area: "Malleshwaram", badge: "4K Projection • Dolby 7.1", formats: ["2D", "3D"], price: 290, amenities: ["M-Ticket", "Metro Connected"] },
    { name: "PVR Director's Cut: Rex Walk", area: "Brigade Road", badge: "Luxury Recliners • Atmos", formats: ["2D", "Dolby Atmos"], price: 590, amenities: ["M-Ticket", "Butler Service", "Recliners"] },
    { name: "Cinepolis: Royal Meenakshi", area: "Hulimavu", badge: "RealD 3D • Dolby 7.1", formats: ["2D", "3D"], price: 260, amenities: ["M-Ticket", "Food & Beverage"] },
    { name: "Gopalan Grand Cinemas", area: "Indiranagar", badge: "Dolby Digital 7.1", formats: ["2D", "3D"], price: 240, amenities: ["M-Ticket", "Budget Friendly"] },
  ],
  Mumbai: [
    { name: "PVR ICON: Phoenix Palladium", area: "Lower Parel", badge: "IMAX Laser • Luxe", formats: ["2D", "3D", "IMAX 2D", "IMAX 3D"], price: 490, amenities: ["M-Ticket", "IMAX Laser", "Valet"] },
    { name: "Maison INOX: Jio World Plaza", area: "Bandra Kurla Complex", badge: "Maison Luxe • Atmos", formats: ["2D", "Dolby Atmos"], price: 650, amenities: ["M-Ticket", "Dolby Atmos", "Lounge"] },
    { name: "Sterling Cineplex: Fort", area: "Fort", badge: "Dolby Atmos • 4K", formats: ["2D", "3D", "Dolby Atmos"], price: 340, amenities: ["M-Ticket", "Dolby Atmos", "Heritage Hall"] },
    { name: "PVR: Juhu Dynamix", area: "Juhu", badge: "4K Laser • Dolby 7.1", formats: ["2D", "3D"], price: 410, amenities: ["M-Ticket", "Recliners", "Gourmet F&B"] },
    { name: "Cinepolis: Fun Republic", area: "Andheri West", badge: "VIP • Dolby Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 380, amenities: ["M-Ticket", "VIP Lounge"] },
    { name: "INOX: R City Ghatkopar", area: "Ghatkopar", badge: "Insignia • IMAX", formats: ["2D", "3D", "IMAX 2D"], price: 430, amenities: ["M-Ticket", "IMAX Screen"] },
    { name: "Liberty Cinema: Marine Lines", area: "Marine Lines", badge: "Heritage 4K Atmos", formats: ["2D", "Dolby Atmos"], price: 290, amenities: ["M-Ticket", "Art Deco Auditorium"] },
    { name: "PVR: Infinity Mall Malad", area: "Malad West", badge: "4DX • RealD 3D", formats: ["2D", "3D", "4DX"], price: 370, amenities: ["M-Ticket", "4DX Motion"] },
    { name: "INOX: Megaplex Inorbit", area: "Malad", badge: "MX4D • ScreenX", formats: ["2D", "3D", "4DX"], price: 420, amenities: ["M-Ticket", "ScreenX"] },
    { name: "Miraj Cinemas: Thakur Mall", area: "Dahisar", badge: "Dolby Digital 7.1", formats: ["2D", "3D"], price: 230, amenities: ["M-Ticket", "Budget Friendly"] },
  ],
  "Delhi-NCR": [
    { name: "PVR Director's Cut: Ambience", area: "Vasant Kunj", badge: "Luxe Dining • Dolby Atmos", formats: ["2D", "Dolby Atmos"], price: 690, amenities: ["M-Ticket", "Butler Service", "Recliners"] },
    { name: "PVR ICON: Select CITYWALK", area: "Saket", badge: "IMAX Laser • 4DX", formats: ["2D", "3D", "IMAX 2D", "4DX"], price: 470, amenities: ["M-Ticket", "IMAX Screen", "Gold Class"] },
    { name: "INOX: Insignia Nehru Place", area: "Nehru Place", badge: "Laserplex • Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 410, amenities: ["M-Ticket", "Insignia Lounge"] },
    { name: "PVR: Plaza Connaught Place", area: "Connaught Place", badge: "Heritage 4K • Dolby 7.1", formats: ["2D", "3D"], price: 320, amenities: ["M-Ticket", "Central Location"] },
    { name: "Cinepolis: DLF Avenue", area: "Saket", badge: "VIP • Dolby Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 430, amenities: ["M-Ticket", "VIP Recliners"] },
    { name: "PVR: Ambience Mall Gurugram", area: "Gurugram CyberHub", badge: "IMAX • Gold Class", formats: ["2D", "3D", "IMAX 2D"], price: 480, amenities: ["M-Ticket", "IMAX Laser"] },
    { name: "INOX: Mall of India", area: "Noida Sec 18", badge: "Insignia • IMAX 4K", formats: ["2D", "3D", "IMAX 2D", "IMAX 3D"], price: 440, amenities: ["M-Ticket", "IMAX Laser"] },
    { name: "Delite Cinema: Asaf Ali Road", area: "Daryaganj", badge: "Dolby Atmos • Balcony", formats: ["2D", "Dolby Atmos"], price: 210, amenities: ["M-Ticket", "Classic Single Screen"] },
    { name: "PVR: Pacific Mall Tagore Garden", area: "Rajouri Garden", badge: "4DX • Dolby 7.1", formats: ["2D", "3D", "4DX"], price: 350, amenities: ["M-Ticket", "4DX Motion"] },
    { name: "Miraj Cinemas: Subhash Nagar", area: "West Delhi", badge: "Dolby Digital 7.1", formats: ["2D", "3D"], price: 240, amenities: ["M-Ticket", "Food & Beverage"] },
  ],
  Chennai: [
    { name: "PVR: Sathyam Cinemas", area: "Royapettah", badge: "RDX Atmos • Pure Sound", formats: ["2D", "3D", "Dolby Atmos"], price: 210, amenities: ["M-Ticket", "RDX Audio", "Famous Popcorn"] },
    { name: "PVR ICON: Palazzo Nexus", area: "Vadapalani", badge: "IMAX • Luxe Lounge", formats: ["2D", "3D", "IMAX 2D", "IMAX 3D"], price: 290, amenities: ["M-Ticket", "IMAX Laser"] },
    { name: "PVR: Escape Express Avenue", area: "Royapettah", badge: "Boutique 4K • Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 230, amenities: ["M-Ticket", "Designer Screens"] },
    { name: "Luxe Cinemas: Phoenix Mall", area: "Velachery", badge: "IMAX Laser • 4K", formats: ["2D", "3D", "IMAX 2D"], price: 280, amenities: ["M-Ticket", "IMAX Laser", "Gold Class"] },
    { name: "Rohini Silver Screens", area: "Koyambedu", badge: "Dolby Atmos • Fan Hub", formats: ["2D", "3D", "Dolby Atmos"], price: 195, amenities: ["M-Ticket", "Atmos Audio"] },
    { name: "AGS Cinemas: T. Nagar", area: "T. Nagar", badge: "4K Laser • Dolby 7.1", formats: ["2D", "3D"], price: 210, amenities: ["M-Ticket", "Food Court"] },
    { name: "INOX: Chennai Citi Centre", area: "Mylapore", badge: "Insignia • Dolby", formats: ["2D", "3D"], price: 220, amenities: ["M-Ticket", "Central Access"] },
    { name: "Kamala Cinemas: Vadapalani", area: "Vadapalani", badge: "Barco 4K • Atmos", formats: ["2D", "Dolby Atmos"], price: 190, amenities: ["M-Ticket", "Budget Friendly"] },
    { name: "PVR: VR Chennai", area: "Anna Nagar", badge: "4DX • Dolby Atmos", formats: ["2D", "3D", "4DX", "Dolby Atmos"], price: 260, amenities: ["M-Ticket", "4DX Motion"] },
    { name: "AGS Cinemas: OMR Navalur", area: "OMR Navalur", badge: "Dolby Atmos • 4K", formats: ["2D", "3D", "Dolby Atmos"], price: 210, amenities: ["M-Ticket", "Tech Corridor"] },
  ],
  Pune: [
    { name: "PVR ICON: Pavillion Mall", area: "Senapati Bapat Road", badge: "Gold Class • Dolby Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 410, amenities: ["M-Ticket", "Recliners", "Valet"] },
    { name: "Cinepolis: WestEnd Mall", area: "Aundh", badge: "IMAX 4K • VIP", formats: ["2D", "3D", "IMAX 2D"], price: 390, amenities: ["M-Ticket", "IMAX Screen"] },
    { name: "INOX: Bund Garden", area: "Bund Garden Road", badge: "Insignia • 4K Laser", formats: ["2D", "3D"], price: 330, amenities: ["M-Ticket", "Luxury Lounge"] },
    { name: "City Pride: Kothrud", area: "Kothrud", badge: "Dolby Atmos • Local Legend", formats: ["2D", "3D", "Dolby Atmos"], price: 260, amenities: ["M-Ticket", "Dolby Atmos"] },
    { name: "PVR: Phoenix Marketcity Pune", area: "Viman Nagar", badge: "4DX • RealD 3D", formats: ["2D", "3D", "4DX"], price: 380, amenities: ["M-Ticket", "4DX Motion"] },
    { name: "Cinepolis: Seasons Mall", area: "Magarpatta", badge: "4DX • Dolby 7.1", formats: ["2D", "3D", "4DX"], price: 340, amenities: ["M-Ticket", "Food Court"] },
    { name: "INOX: Elpro City Square", area: "Chinchwad", badge: "Dolby Digital 7.1", formats: ["2D", "3D"], price: 270, amenities: ["M-Ticket", "Family Friendly"] },
    { name: "E-Square Multiplex", area: "University Road", badge: "Christie 4K • Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 250, amenities: ["M-Ticket", "Gourmet Cafe"] },
    { name: "PVR: Grand Highstreet", area: "Hinjewadi", badge: "4K Laser • Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 320, amenities: ["M-Ticket", "IT Park Hub"] },
    { name: "Victory Theatre: Camp", area: "MG Road Camp", badge: "Dolby 7.1 Heritage", formats: ["2D"], price: 200, amenities: ["M-Ticket", "Classic Auditorium"] },
  ],
  Kolkata: [
    { name: "INOX: South City Mall", area: "Jadavpur", badge: "IMAX Laser • Insignia", formats: ["2D", "3D", "IMAX 2D"], price: 380, amenities: ["M-Ticket", "IMAX Laser", "Lounge"] },
    { name: "INOX: Quest Mall", area: "Ballygunge", badge: "Insignia • Dolby Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 420, amenities: ["M-Ticket", "Butler Service"] },
    { name: "PVR: Mani Square", area: "EM Bypass", badge: "4DX • 4K Laser", formats: ["2D", "3D", "4DX"], price: 350, amenities: ["M-Ticket", "4DX Motion"] },
    { name: "Cinepolis: Acropolis Mall", area: "Kasba", badge: "VIP Recliners • Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 330, amenities: ["M-Ticket", "VIP Lounge"] },
    { name: "PVR: Diamond Plaza", area: "Nagerbazar", badge: "Dolby Digital 7.1", formats: ["2D", "3D"], price: 260, amenities: ["M-Ticket", "Popcorn Bar"] },
    { name: "Navina Cinema: Tollygunge", area: "Tollygunge", badge: "4K Laser • Dolby Atmos", formats: ["2D", "Dolby Atmos"], price: 210, amenities: ["M-Ticket", "Classic Auditorium"] },
    { name: "Priya Cinema: Deshapriya Park", area: "Rashbehari", badge: "Dolby 7.1 • Heritage", formats: ["2D", "3D"], price: 200, amenities: ["M-Ticket", "Heritage Screen"] },
    { name: "INOX: City Centre Salt Lake", area: "Salt Lake Sec 1", badge: "4K Projection • Dolby", formats: ["2D", "3D"], price: 300, amenities: ["M-Ticket", "Food Court"] },
    { name: "Miraj Cinemas: Newtown Square", area: "New Town", badge: "Dolby Atmos • Recliners", formats: ["2D", "3D", "Dolby Atmos"], price: 270, amenities: ["M-Ticket", "Recliners"] },
    { name: "Star Theatre: Hatibagan", area: "North Kolkata", badge: "Digital 2K • Dolby", formats: ["2D"], price: 180, amenities: ["M-Ticket", "Historic Theatre"] },
  ],
  Kochi: [
    { name: "PVR: LuLu Mall", area: "Edappally", badge: "4DX • PXL Giant Screen", formats: ["2D", "3D", "IMAX 2D", "4DX"], price: 340, amenities: ["M-Ticket", "PXL Screen", "4DX"] },
    { name: "Cinepolis: Centre Square Mall", area: "MG Road", badge: "IMAX • VIP Recliners", formats: ["2D", "3D", "IMAX 2D"], price: 360, amenities: ["M-Ticket", "IMAX Screen"] },
    { name: "Vanitha Vineetha Cineplex", area: "Edappally", badge: "Dolby Atmos • 4K RGB", formats: ["2D", "3D", "Dolby Atmos"], price: 220, amenities: ["M-Ticket", "Dolby Atmos"] },
    { name: "Shenoys Theatre: MG Road", area: "MG Road", badge: "Christie 4K • Dolby Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 210, amenities: ["M-Ticket", "Recliners"] },
    { name: "PVR: Forum Mall Kochi", area: "Maradu", badge: "Luxe • PXL Laser", formats: ["2D", "3D", "Dolby Atmos"], price: 350, amenities: ["M-Ticket", "Luxury Seating"] },
    { name: "Q Cinemas: Gold Souk Grande", area: "Vyttila", badge: "Barco 4K • Dolby 7.1", formats: ["2D", "3D"], price: 240, amenities: ["M-Ticket", "Food Court"] },
    { name: "Kavitha Theatre: MG Road", area: "Ernakulam", badge: "4K Laser • Dolby Atmos", formats: ["2D", "Dolby Atmos"], price: 195, amenities: ["M-Ticket", "Classic Hub"] },
    { name: "Pan Cinemas: Nucleus Mall", area: "Maradu", badge: "Dolby 7.1 • RealD 3D", formats: ["2D", "3D"], price: 210, amenities: ["M-Ticket", "Budget Friendly"] },
    { name: "Padma Cinema: MG Road", area: "Ernakulam", badge: "4K Digital • Atmos", formats: ["2D", "Dolby Atmos"], price: 190, amenities: ["M-Ticket", "Heritage Cinema"] },
    { name: "M Cinemas: Varapuzha", area: "Varapuzha", badge: "Dolby Atmos • 4K", formats: ["2D", "3D"], price: 200, amenities: ["M-Ticket", "Family Seating"] },
  ],
  Chandigarh: [
    { name: "PVR: Elante Mall", area: "Industrial Area Phase 1", badge: "4DX • Gold Class", formats: ["2D", "3D", "IMAX 2D", "4DX"], price: 390, amenities: ["M-Ticket", "4DX Motion", "Lounge"] },
    { name: "Cinepolis: Jagat Mall", area: "Sector 17", badge: "4K Laser • Dolby Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 310, amenities: ["M-Ticket", "Dolby Atmos"] },
    { name: "PVR: Centra Mall", area: "Industrial Area", badge: "Dolby Digital 7.1", formats: ["2D", "3D"], price: 280, amenities: ["M-Ticket", "Food Court"] },
    { name: "INOX: NH22 Mall", area: "Panchkula", badge: "Insignia • 4K", formats: ["2D", "3D"], price: 300, amenities: ["M-Ticket", "Recliners"] },
    { name: "PVR: VR Punjab", area: "Kharar Road", badge: "IMAX • Dolby Atmos", formats: ["2D", "3D", "IMAX 2D"], price: 360, amenities: ["M-Ticket", "IMAX Screen"] },
    { name: "Piccadily Square: Sector 34", area: "Sector 34A", badge: "Christie 4K • Atmos", formats: ["2D", "Dolby Atmos"], price: 260, amenities: ["M-Ticket", "Cafe Lounge"] },
    { name: "Cinepolis: Bestech Square", area: "Mohali", badge: "VIP • RealD 3D", formats: ["2D", "3D"], price: 310, amenities: ["M-Ticket", "VIP Seats"] },
    { name: "Fun Cinemas: Republic", area: "Manimajra", badge: "Dolby 7.1", formats: ["2D", "3D"], price: 230, amenities: ["M-Ticket", "Budget Friendly"] },
    { name: "Miraj Cinemas: Cosmo Plaza", area: "Zirakpur", badge: "Dolby Atmos • 4K", formats: ["2D", "3D", "Dolby Atmos"], price: 250, amenities: ["M-Ticket", "Atmos Sound"] },
    { name: "Neelam Theatre: Sector 17", area: "Sector 17E", badge: "Classic 4K Digital", formats: ["2D"], price: 190, amenities: ["M-Ticket", "Heritage Cinema"] },
  ],
  Ahmedabad: [
    { name: "PVR: Acropolis Mall", area: "Thaltej", badge: "IMAX Laser • Luxe", formats: ["2D", "3D", "IMAX 2D", "IMAX 3D"], price: 380, amenities: ["M-Ticket", "IMAX Laser", "Recliners"] },
    { name: "NY Cinemas: Ahmedabad One", area: "Vastrapur", badge: "Dolby Atmos • 4K", formats: ["2D", "3D", "Dolby Atmos"], price: 350, amenities: ["M-Ticket", "Dolby Atmos", "Lounge"] },
    { name: "Cinepolis: AlphaOne", area: "Vastrapur", badge: "4DX • VIP Seats", formats: ["2D", "3D", "4DX"], price: 360, amenities: ["M-Ticket", "4DX Motion"] },
    { name: "INOX: Himalaya Mall", area: "Drive-In Road", badge: "Insignia • Dolby 7.1", formats: ["2D", "3D"], price: 310, amenities: ["M-Ticket", "Luxury Seating"] },
    { name: "PVR: Motera Sangath", area: "Chandkheda", badge: "4K Projection • Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 290, amenities: ["M-Ticket", "Dolby Atmos"] },
    { name: "Wide Angle Multiplex", area: "SG Highway", badge: "Christie 4K • Dolby", formats: ["2D", "3D"], price: 260, amenities: ["M-Ticket", "Food Court"] },
    { name: "Rajhans Cinemas: Nikol", area: "Nikol", badge: "Barco 4K • Atmos", formats: ["2D", "3D", "Dolby Atmos"], price: 230, amenities: ["M-Ticket", "Budget Friendly"] },
    { name: "PVR: Palladium Ahmedabad", area: "SG Highway", badge: "Luxe • Dual Laser", formats: ["2D", "3D", "IMAX 2D"], price: 450, amenities: ["M-Ticket", "Gold Class"] },
    { name: "City Gold Multiplex", area: "Ashram Road", badge: "Dolby Digital 7.1", formats: ["2D", "3D"], price: 210, amenities: ["M-Ticket", "Central Access"] },
    { name: "Miraj Cinemas: Shalin", area: "Science City", badge: "Dolby Atmos • Recliners", formats: ["2D", "3D", "Dolby Atmos"], price: 250, amenities: ["M-Ticket", "Recliners"] },
  ],
};

function normalizeCustomMovieDoc(doc) {
  const formattedBudget = formatCurrencyCompact(
    doc.totalBudget,
    doc.currencyCode,
    doc.currencySymbol
  );
  const formattedCollections = formatCurrencyCompact(
    doc.totalCollections,
    doc.currencyCode,
    doc.currencySymbol
  );
  return {
    id: doc.customId,
    rawId: doc.customId,
    mediaType: doc.mediaType || "movie",
    source: "custom",
    isCustomMovie: true,
    title: doc.title,
    tagline: doc.tagline || "Featured CineReward Release",
    overview: doc.overview || "",
    poster_path: doc.posterUrl,
    backdrop_path: doc.backdropUrl || doc.posterUrl,
    galleryPhotos: Array.isArray(doc.galleryPhotos) ? doc.galleryPhotos : [],
    vote_average: Number(doc.rating || 8.5),
    vote_count: 1500,
    popularity: 1200,
    release_date: doc.releaseDate || "",
    year: doc.year || (doc.releaseDate ? String(doc.releaseDate).slice(0, 4) : "2026"),
    runtime: doc.runtime || 145,
    certification: doc.certification || "UA 13+",
    director: doc.director || "Featured Director",
    original_language: doc.originalLanguage || "en",
    language: doc.language || "English",
    genre_ids: [],
    genres: (doc.genres || []).map((name, i) => ({ id: 9500 + i, name })),
    quality: doc.quality || "IMAX 4K",
    country: doc.country || "IN",
    currencyCode: doc.currencyCode || "INR",
    currencySymbol: doc.currencySymbol || "₹",
    totalBudget: Number(doc.totalBudget || 0),
    totalCollections: Number(doc.totalCollections || 0),
    formattedBudget,
    formattedCollections,
    trailerKey: doc.trailerKey || null,
    trailerUrl: doc.trailerUrl || null,
    cast: (doc.cast || []).map((c, idx) => ({
      id: `custom-cast-${idx}`,
      name: c.name,
      character: c.character || "Lead Cast",
      profile_path: c.photoUrl || null,
    })),
    ticketPricing: doc.ticketPricing || { classic: 240, grand: 360, majestic: 540 },
    customTheatres: Array.isArray(doc.theatres) ? doc.theatres : [],
    paymentConfig: doc.paymentConfig || {
      upi: true,
      card: true,
      wallets: true,
      netBanking: true,
      coinsRedeemable: true,
      rewardCoinsPerSeat: 25,
    },
    bookable: true,
  };
}

async function getCustomMoviesNormalized() {
  const cached = getCachedData("custom:movies:list", 60 * 1000);
  if (cached) return cached;
  if (!isSupabaseReady()) return [];
  try {
    const { data: docs } = await getSupabase().from("movies").select("*").eq("is_published", true).order("created_at", { ascending: false });
    const list = (docs || []).map((d) => normalizeCustomMovieDoc(mapMovie(d)));
    setCachedData("custom:movies:list", list);
    return list;
  } catch {
    return [];
  }
}

function buildTheatresForMovie(movieId, city = "Bengaluru", customMovie = null) {
  const normalizedCity = Object.keys(CITY_THEATRES_MAP).find(
    (c) => c.toLowerCase() === String(city || "").trim().toLowerCase()
  ) || "Bengaluru";

  const customPricing = customMovie?.ticketPricing;
  const customCityVenues = (customMovie?.customTheatres || [])
    .filter(
      (t) =>
        !t.city || t.city.toLowerCase() === normalizedCity.toLowerCase()
    )
    .map((t) => ({
      name: t.name,
      area: t.area || normalizedCity,
      badge: t.badge || "Dolby Atmos • 4K",
      formats: ["2D", "IMAX 2D", "Dolby Atmos"],
      price: Number(t.price) || Number(customPricing?.classic) || 260,
      amenities: ["M-Ticket", "Featured Venue", "Dolby Atmos"],
    }));

  const cityVenues = [
    ...customCityVenues,
    ...CITY_THEATRES_MAP[normalizedCity].filter(
      (v) => !customCityVenues.some((cv) => cv.name.toLowerCase() === v.name.toLowerCase())
    ),
  ].slice(0, 10);

  const seed = String(movieId)
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  return cityVenues.map((venue, idx) => {
    const classicPrice = customPricing?.classic ? Number(customPricing.classic) : venue.price;
    const grandPrice = customPricing?.grand
      ? Number(customPricing.grand)
      : venue.price + 110;
    const majesticPrice = customPricing?.majestic
      ? Number(customPricing.majestic)
      : venue.price + 240;

    const baseTimes = ["09:20 AM", "12:30 PM", "03:40 PM", "07:15 PM", "10:00 PM"];
    const slots = baseTimes.map((t, sIdx) => ({
      time: t,
      status: (idx + sIdx + seed) % 4 === 0 ? "fast" : "available",
      screen: idx === 0 ? "Screen 1 • Laser Atmos" : `Audi ${(idx % 6) + 1}`,
      experience: venue.formats?.[sIdx % venue.formats.length] || "2D",
    }));

    return {
      id: `${normalizedCity.toLowerCase().replace(/[^a-z]/g, "")}-th-${idx + 1}`,
      name: venue.name,
      shortName: venue.name.split(":")[0].trim(),
      area: venue.area,
      city: normalizedCity,
      badge: venue.badge,
      formats: venue.formats,
      basePrice: classicPrice,
      tiers: [
        { key: "majestic", label: "MAJESTIC", price: majesticPrice, status: idx % 3 === 0 ? "Filling Fast" : "Available" },
        { key: "grand", label: "GRAND", price: grandPrice, status: "Available" },
        { key: "classic", label: "CLASSIC", price: classicPrice, status: "Available" },
      ],
      amenities: venue.amenities,
      cancellable: idx % 2 === 0,
      promo: idx === 0 ? "100 Coins Cashback on 2+ Tickets!" : null,
      slots,
    };
  });
}

const tmdbService = {
  getGhibliFilms: async () => {
    const cacheKey = "ghibli:films";
    const cached = getCachedData(cacheKey, LONG_TTL);
    if (cached) return cached;
    try {
      const res = await axios.get(`${GHIBLI_BASE_URL}/films`, { timeout: 8000 });
      const items = (Array.isArray(res.data) ? res.data : []).map(normalizeGhibliFilm);
      setCachedData(cacheKey, items);
      return items;
    } catch (err) {
      console.error("Studio Ghibli API error:", err.message);
      return [];
    }
  },

  getTvMazeShows: async (page = 0) => {
    const cacheKey = `tvmaze:shows:${page}`;
    const cached = getCachedData(cacheKey, LONG_TTL);
    if (cached) return cached;
    try {
      const res = await axios.get(`${TVMAZE_BASE_URL}/shows`, {
        params: { page },
        timeout: 8000,
      });
      const items = (Array.isArray(res.data) ? res.data : [])
        .filter((s) => s.image?.medium || s.image?.original)
        .sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0))
        .slice(0, 40)
        .map(normalizeTvMazeShow);
      setCachedData(cacheKey, items);
      return items;
    } catch (err) {
      console.error("TVMaze API error:", err.message);
      return [];
    }
  },

  getOmdbDetails: async (imdbId) => {
    if (!imdbId) return null;
    const cacheKey = `omdb:${imdbId}`;
    const cached = getCachedData(cacheKey, LONG_TTL);
    if (cached) return cached;
    try {
      const res = await axios.get(OMDB_BASE_URL, {
        params: { i: imdbId, apikey: getOmdbKey() },
        timeout: 5000,
      });
      if (res.data && res.data.Response === "True") {
        setCachedData(cacheKey, res.data);
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  getNowPlaying: async (page = 1) => {
    try {
      const data = await tmdbGet("/movie/now_playing", { region: "IN", page });
      let results = (data.results || []).map((m) => normalizeTmdbMovie(m, "movie"));
      if (results.length < 12) {
        const globalData = await tmdbGet("/movie/now_playing", { page });
        results = dedupeById([
          ...results,
          ...(globalData.results || []).map((m) => normalizeTmdbMovie(m, "movie")),
        ]);
      }
      return results.filter((m) => m.poster_path);
    } catch (error) {
      console.error("Error fetching now playing movies:", error?.message);
      return FALLBACK_MOVIES;
    }
  },

  getPopular: async (page = 1) => {
    try {
      const startPage = Math.max(1, parseInt(page, 10) || 1);
      const pagesToFetch = startPage === 1 ? [1, 2, 3] : [startPage];
      const responses = await Promise.all(
        pagesToFetch.map((p) => tmdbGet("/movie/popular", { page: p }).catch(() => ({ results: [] })))
      );
      const accumulated = responses.flatMap((r) =>
        (r.results || []).map((m) => normalizeTmdbMovie(m, "movie"))
      );
      return dedupeById(accumulated.filter((m) => m.poster_path));
    } catch (error) {
      console.error("Error fetching popular movies:", error?.message);
      return FALLBACK_MOVIES;
    }
  },

  getHomeFeed: async () => {
    const cacheKey = "home:feed:v2";
    const cached = getCachedData(cacheKey, SHORT_TTL);
    if (cached) return cached;

    const [customMovies,
      trendingMoviesRes,
      nowPlayingRes,
      popularRes,
      topRatedRes,
      tvPopularRes,
      tvTopRes,
      tvMazeRes,
    ] = await Promise.all([
      getCustomMoviesNormalized(),
      tmdbGet("/trending/movie/week", { page: 1 }).catch(() => ({ results: [] })),
      tmdbGet("/movie/now_playing", { region: "IN", page: 1 }).catch(() => ({ results: [] })),
      tmdbGet("/movie/popular", { page: 1 }).catch(() => ({ results: [] })),
      tmdbGet("/movie/top_rated", { page: 1 }).catch(() => ({ results: [] })),
      tmdbGet("/tv/popular", { page: 1 }).catch(() => ({ results: [] })),
      tmdbGet("/tv/top_rated", { page: 1 }).catch(() => ({ results: [] })),
      Promise.race([
        tmdbService.getTvMazeShows(0),
        new Promise((resolve) => setTimeout(() => resolve([]), 2200)),
      ]),
    ]);

    // Use cached full collections if warm; otherwise fetch fast 3-collection preview without blocking Home
    let collectionsPreview = getCachedData("collections:all:v1", LONG_TTL);
    if (!collectionsPreview) {
      const fastCols = await Promise.all(
        COLLECTIONS_CONFIG.slice(0, 3).map(async (cfg) => {
          const c = await tmdbGet(`/collection/${cfg.collectionIds[0]}`, {}, LONG_TTL).catch(() => null);
          const parts = (c?.parts || []).map((m) => normalizeTmdbMovie(m, "movie")).filter((m) => m.poster_path);
          return {
            slug: cfg.slug,
            title: cfg.title,
            category: cfg.category,
            totalCount: parts.length,
            previewPosters: parts.slice(0, 3).map((p) => p.poster_path),
          };
        })
      );
      collectionsPreview = fastCols;
      // Warm remaining collections in background
      tmdbService.getCollections().catch(() => {});
    }

    const trendingMovies = dedupeById(
      (trendingMoviesRes.results || []).map((m) => normalizeTmdbMovie(m, "movie"))
    ).filter((m) => m.poster_path);

    const nowPlaying = dedupeById(
      (nowPlayingRes.results || []).map((m) => normalizeTmdbMovie(m, "movie"))
    ).filter((m) => m.poster_path);

    const featured = dedupeById([
      ...customMovies,
      ...(popularRes.results || []).map((m) => normalizeTmdbMovie(m, "movie")),
    ]).filter((m) => m.poster_path);

    const topMovies = dedupeById(
      (topRatedRes.results || []).map((m) => normalizeTmdbMovie(m, "movie"))
    ).filter((m) => m.poster_path);

    const tmdbShows = dedupeById([
      ...(tvTopRes.results || []).map((s) => normalizeTmdbMovie(s, "tv")),
      ...(tvPopularRes.results || []).map((s) => normalizeTmdbMovie(s, "tv")),
    ]).filter((s) => s.poster_path);

    const topShows = dedupeById([...tmdbShows.slice(0, 12), ...tvMazeRes.slice(0, 8)]);

    const heroCandidates = dedupeById([
      ...customMovies.filter((m) => m.backdrop_path),
      ...trendingMovies.filter((m) => m.backdrop_path),
      ...nowPlaying.filter((m) => m.backdrop_path),
    ]).slice(0, 10);

    const payload = {
      heroSlides: heroCandidates,
      featured: featured.slice(0, 14),
      nowPlaying: dedupeById([...customMovies, ...nowPlaying]).slice(0, 14),
      trending: trendingMovies.slice(0, 14),
      topMovies: topMovies.slice(0, 10),
      topShows: topShows.slice(0, 10),
      popularShows: dedupeById([...tmdbShows, ...tvMazeRes]).slice(0, 14),
      collections: collectionsPreview.slice(0, 6),
      genres: Object.entries(GENRE_MAP).slice(0, 12).map(([id, name]) => ({
        id: Number(id),
        name,
      })),
    };

    setCachedData(cacheKey, payload);
    return payload;
  },

  getCatalog: async ({
    q = "",
    section = "all",
    type = "all",
    genre = "",
    language = "",
    ott = "",
    year = "",
    sort = "popular",
    page = 1,
  } = {}) => {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const trimmedQ = q.trim();

    if (trimmedQ) {
      return {
        items: await tmdbService.searchAll(trimmedQ, { type, genre, language, year, sort }),
        page: p,
        hasMore: false,
      };
    }

    // Special section: Studio Ghibli or Anime
    if (section === "ghibli") {
      const items = await tmdbService.getGhibliFilms();
      return {
        items: applyLocalFilters(items, { type, genre, language, year, sort }),
        page: 1,
        hasMore: false,
      };
    }

    const discoverParams = { page: p };
    if (language && language !== "all") {
      discoverParams.with_original_language = language;
    }
    if (genre && genre !== "all") {
      const resolvedGenre = GENRE_NAME_TO_ID[String(genre).toLowerCase()] || genre;
      if (!isNaN(Number(resolvedGenre))) {
        discoverParams.with_genres = resolvedGenre;
      }
    }
    if (ott && OTT_PROVIDERS[ott]) {
      discoverParams.with_watch_providers = OTT_PROVIDERS[ott];
      discoverParams.watch_region = "IN";
    }

    if (year && year !== "all") {
      if (year === "2020s") {
        discoverParams["primary_release_date.gte"] = "2020-01-01";
        discoverParams["first_air_date.gte"] = "2020-01-01";
      } else if (year === "2010s") {
        discoverParams["primary_release_date.gte"] = "2010-01-01";
        discoverParams["primary_release_date.lte"] = "2019-12-31";
        discoverParams["first_air_date.gte"] = "2010-01-01";
        discoverParams["first_air_date.lte"] = "2019-12-31";
      } else if (year === "classic") {
        discoverParams["primary_release_date.lte"] = "2009-12-31";
        discoverParams["first_air_date.lte"] = "2009-12-31";
      } else if (/^\d{4}$/.test(year)) {
        discoverParams.primary_release_year = year;
        discoverParams.first_air_date_year = year;
      }
    }

    const sortMap = {
      popular: "popularity.desc",
      top_rated: "vote_average.desc",
      newest: "primary_release_date.desc",
      recent: "popularity.desc",
    };
    discoverParams.sort_by = sortMap[sort] || "popularity.desc";
    if (sort === "top_rated") {
      discoverParams["vote_count.gte"] = 100;
    }

    let items = [];
    const pagePair = p === 1 ? [1, 2] : [p + 1];

    try {
      if (section === "now-playing") {
        const res = await Promise.all(
          pagePair.map((pg) => tmdbGet("/movie/now_playing", { region: "IN", page: pg }))
        );
        items = res.flatMap((r) => (r.results || []).map((m) => normalizeTmdbMovie(m, "movie")));
      } else if (section === "trending") {
        const endpoint =
          type === "tv" ? "/trending/tv/week" : type === "movie" ? "/trending/movie/week" : "/trending/all/week";
        const res = await Promise.all(pagePair.map((pg) => tmdbGet(endpoint, { page: pg })));
        items = res.flatMap((r) => (r.results || []).map((m) => normalizeTmdbMovie(m)));
      } else if (section === "top-rated") {
        const endpoint = type === "tv" ? "/tv/top_rated" : "/movie/top_rated";
        const res = await Promise.all(pagePair.map((pg) => tmdbGet(endpoint, { page: pg })));
        items = res.flatMap((r) =>
          (r.results || []).map((m) => normalizeTmdbMovie(m, type === "tv" ? "tv" : "movie"))
        );
      } else if (section === "upcoming") {
        const res = await Promise.all(
          pagePair.map((pg) => tmdbGet("/movie/upcoming", { region: "IN", page: pg }))
        );
        items = res.flatMap((r) => (r.results || []).map((m) => normalizeTmdbMovie(m, "movie")));
      } else if (section === "shows" || type === "tv") {
        const tvParams = { ...discoverParams };
        if (sort === "newest") tvParams.sort_by = "first_air_date.desc";
        const [tmdbTv1, tmdbTv2, tvMaze] = await Promise.all([
          tmdbGet("/discover/tv", { ...tvParams, page: pagePair[0] }).catch(() => ({ results: [] })),
          pagePair[1]
            ? tmdbGet("/discover/tv", { ...tvParams, page: pagePair[1] }).catch(() => ({ results: [] }))
            : Promise.resolve({ results: [] }),
          p === 1 ? tmdbService.getTvMazeShows(0) : Promise.resolve([]),
        ]);
        items = [
          ...(tmdbTv1.results || []).map((m) => normalizeTmdbMovie(m, "tv")),
          ...(tmdbTv2.results || []).map((m) => normalizeTmdbMovie(m, "tv")),
          ...tvMaze,
        ];
      } else {
        if (section === "bollywood") discoverParams.with_original_language = "hi";
        if (section === "hollywood") discoverParams.with_original_language = "en";
        if (section === "korean") discoverParams.with_original_language = "ko";
        if (section === "anime") {
          discoverParams.with_genres = discoverParams.with_genres
            ? `${discoverParams.with_genres},16`
            : "16";
        }

        if (section === "south-indian") {
          const southLangs = ["te", "ta", "ml", "kn"];
          const southResponses = await Promise.all(
            southLangs.map((lang) =>
              tmdbGet("/discover/movie", {
                ...discoverParams,
                with_original_language: lang,
                page: p,
              }).catch(() => ({ results: [] }))
            )
          );
          items = southResponses.flatMap((r) =>
            (r.results || []).map((m) => normalizeTmdbMovie(m, "movie"))
          );
        } else {
          const res = await Promise.all(
            pagePair.map((pg) =>
              tmdbGet("/discover/movie", { ...discoverParams, page: pg }).catch(() => ({ results: [] }))
            )
          );
          items = res.flatMap((r) => (r.results || []).map((m) => normalizeTmdbMovie(m, "movie")));
        }

        if (section === "anime" && p === 1) {
          const ghibli = await tmdbService.getGhibliFilms();
          items = [...items, ...ghibli];
        }

        if (type === "all" && !ott && !["bollywood", "hollywood", "south-indian"].includes(section) && p === 1) {
          const tvExtra = await tmdbGet("/discover/tv", { ...discoverParams, page: 1 }).catch(() => ({
            results: [],
          }));
          items = [...items, ...(tvExtra.results || []).slice(0, 12).map((s) => normalizeTmdbMovie(s, "tv"))];
        }
      }
    } catch (err) {
      console.error("Catalog fetch error:", err.message);
      items = FALLBACK_MOVIES;
    }

    if (p === 1 && !ott) {
      const customList = await getCustomMoviesNormalized();
      if (customList.length > 0) {
        items = [...customList, ...items];
      }
    }

    const filtered = applyLocalFilters(
      dedupeById(items).filter((m) => m.poster_path),
      { type, genre, language, year, sort }
    );

    return {
      items: filtered,
      page: p,
      hasMore: filtered.length >= 16,
    };
  },

  getCollections: async () => {
    const cacheKey = "collections:all:v1";
    const cached = getCachedData(cacheKey, LONG_TTL);
    if (cached) return cached;

    const results = await Promise.all(
      COLLECTIONS_CONFIG.map(async (cfg) => {
        try {
          if (cfg.source === "ghibli") {
            const ghibli = await tmdbService.getGhibliFilms();
            return {
              slug: cfg.slug,
              title: cfg.title,
              category: cfg.category,
              description: cfg.description,
              badge: cfg.badge,
              totalCount: ghibli.length,
              previewPosters: ghibli.slice(0, 3).map((g) => g.poster_path),
            };
          }

          const firstCollections = await Promise.all(
            cfg.collectionIds.slice(0, 3).map((cid) =>
              tmdbGet(`/collection/${cid}`, {}, LONG_TTL).catch(() => null)
            )
          );
          const parts = dedupeById(
            firstCollections
              .filter(Boolean)
              .flatMap((c) => (c.parts || []).map((m) => normalizeTmdbMovie(m, "movie")))
          ).filter((m) => m.poster_path);

          let extraCount = 0;
          if (cfg.collectionIds.length > 3) {
            extraCount = (cfg.collectionIds.length - 3) * 4;
          }
          if (cfg.source === "tmdb-indian") {
            extraCount += 24;
          }

          return {
            slug: cfg.slug,
            title: cfg.title,
            category: cfg.category,
            description: cfg.description,
            badge: cfg.badge,
            totalCount: parts.length + extraCount,
            previewPosters: parts.slice(0, 3).map((p) => p.poster_path),
          };
        } catch {
          return {
            slug: cfg.slug,
            title: cfg.title,
            category: cfg.category,
            description: cfg.description,
            badge: cfg.badge,
            totalCount: 0,
            previewPosters: [],
          };
        }
      })
    );

    setCachedData(cacheKey, results);
    return results;
  },

  getCollectionBySlug: async (slug, filters = {}) => {
    const cfg = COLLECTIONS_CONFIG.find((c) => c.slug === slug);
    if (!cfg) return null;

    const cacheKey = `collection:items:${slug}`;
    let items = getCachedData(cacheKey, LONG_TTL);

    if (!items) {
      if (cfg.source === "ghibli") {
        items = await tmdbService.getGhibliFilms();
      } else {
        const colResponses = await Promise.all(
          cfg.collectionIds.map((cid) =>
            tmdbGet(`/collection/${cid}`, {}, LONG_TTL).catch(() => null)
          )
        );
        items = colResponses
          .filter(Boolean)
          .flatMap((c) => (c.parts || []).map((m) => normalizeTmdbMovie(m, "movie")));

        if (cfg.source === "tmdb-indian") {
          const indianLangs = ["hi", "te", "ta"];
          const indianResponses = await Promise.all(
            indianLangs.map((lang) =>
              tmdbGet(
                "/discover/movie",
                {
                  with_original_language: lang,
                  sort_by: "popularity.desc",
                  "vote_count.gte": 80,
                  page: 1,
                },
                LONG_TTL
              ).catch(() => ({ results: [] }))
            )
          );
          items = [
            ...items,
            ...indianResponses.flatMap((r) =>
              (r.results || []).map((m) => normalizeTmdbMovie(m, "movie"))
            ),
          ];
        }

        if (cfg.slug === "marvel-collection" || cfg.slug === "dc-universe") {
          const keywordQuery = cfg.slug === "marvel-collection" ? "Marvel" : "DC";
          const tvSearch = await tmdbGet("/search/tv", { query: keywordQuery }, LONG_TTL).catch(
            () => ({ results: [] })
          );
          items = [
            ...items,
            ...(tvSearch.results || []).slice(0, 12).map((s) => normalizeTmdbMovie(s, "tv")),
          ];
        }

        items = dedupeById(items).filter((m) => m.poster_path);
      }
      setCachedData(cacheKey, items);
    }

    const filtered = applyLocalFilters(items, filters);
    return {
      collection: {
        slug: cfg.slug,
        title: cfg.title,
        category: cfg.category,
        description: cfg.description,
        badge: cfg.badge,
        totalCount: items.length,
      },
      items: filtered,
    };
  },

  getMovieDetails: async (rawParamId, mediaTypeHint) => {
    const idStr = String(rawParamId);

    // 0. Custom Admin Movie
    if (idStr.startsWith("cr-") && isSupabaseReady()) {
      const { data: customDoc } = await getSupabase().from("movies").select("*").eq("custom_id", idStr).single();
      if (customDoc) {
        const customItem = normalizeCustomMovieDoc(mapMovie(customDoc));
        const similarList = (await tmdbService.getPopular(1)).slice(0, 6);
        return {
          ...customItem,
          status: "Released",
          spokenLanguages: [customItem.language],
          similar: similarList,
        };
      }
    }

    // 1. Studio Ghibli film
    if (idStr.startsWith("ghibli-")) {
      const filmId = idStr.replace(/^ghibli-/, "");
      const films = await tmdbService.getGhibliFilms();
      const film = films.find((f) => String(f.rawId) === filmId);
      if (film) {
        return {
          ...film,
          status: "Released",
          tagline: "A Studio Ghibli Masterpiece",
          cast: [
            { id: "dir", name: film.director || "Hayao Miyazaki", character: "Director", profile_path: null },
            { id: "prod", name: film.producer || "Toshio Suzuki", character: "Producer", profile_path: null },
          ],
          trailerKey: null,
          similar: films.filter((f) => f.id !== film.id).slice(0, 6),
        };
      }
    }

    // 2. TVMaze Show
    if (idStr.startsWith("tvmaze-")) {
      const showId = idStr.replace(/^tvmaze-/, "");
      try {
        const res = await axios.get(`${TVMAZE_BASE_URL}/shows/${showId}`, {
          params: { "embed[]": ["cast", "episodes"] },
          timeout: 8000,
        });
        const show = res.data;
        const normalized = normalizeTvMazeShow(show);
        const cast = (show._embedded?.cast || []).slice(0, 10).map((c) => ({
          id: c.person?.id,
          name: c.person?.name,
          character: c.character?.name || "Series Cast",
          profile_path: c.person?.image?.medium || null,
        }));
        const allTvMaze = await tmdbService.getTvMazeShows(0);
        const rawEpisodes = show._embedded?.episodes || [];
        const seasonNumbers = [...new Set(rawEpisodes.map((e) => e.season || 1))];
        const episodes = rawEpisodes
          .filter((e) => (e.season || 1) === (seasonNumbers[0] || 1))
          .map((e) => ({
            id: e.id,
            episode_number: e.number,
            season_number: e.season || 1,
            name: e.name,
            overview: (e.summary || "").replace(/<[^>]+>/g, "").trim(),
            runtime: e.runtime || normalized.runtime || 45,
            still_path: e.image?.original || e.image?.medium || normalized.backdrop_path,
          }));

        return {
          ...normalized,
          status: show.status || "Running",
          tagline: show.network?.name || show.webChannel?.name || "TV Series",
          network: show.network?.name || show.webChannel?.name || null,
          seasonsCount: seasonNumbers.length || 1,
          episodesCount: rawEpisodes.length || episodes.length,
          seasons: seasonNumbers.map((s) => ({
            season_number: s,
            name: `Season ${s}`,
            episode_count: rawEpisodes.filter((e) => (e.season || 1) === s).length,
          })),
          episodes,
          cast,
          similar: allTvMaze.filter((s) => s.id !== normalized.id).slice(0, 6),
        };
      } catch (err) {
        console.error("TVMaze detail error:", err.message);
      }
    }

    // 3. TMDB TV Show
    if (idStr.startsWith("tv-") || mediaTypeHint === "tv") {
      const tmdbTvId = idStr.replace(/^tv-/, "");
      const cacheKey = `detail:tv:${tmdbTvId}:v2`;
      const cached = getCachedData(cacheKey, SHORT_TTL);
      if (cached) return cached;

      try {
        const data = await tmdbGet(`/tv/${tmdbTvId}`, {
          append_to_response: "credits,videos,similar,recommendations,content_ratings",
        });
        const normalized = normalizeTmdbMovie(data, "tv");
        const trailer =
          (data.videos?.results || []).find(
            (v) => v.site === "YouTube" && v.type === "Trailer"
          ) || (data.videos?.results || []).find((v) => v.site === "YouTube");
        const creator = data.created_by?.[0]?.name || "Showrunner";
        const cert =
          data.content_ratings?.results?.find((r) => r.iso_3166_1 === "US")?.rating ||
          "TV-14";
        const similarRaw =
          data.recommendations?.results?.length > 0
            ? data.recommendations.results
            : data.similar?.results || [];

        const validSeasons = (data.seasons || []).filter((s) => s.season_number >= 1);
        const firstSeasonNumber = validSeasons[0]?.season_number || 1;
        let episodes = [];
        try {
          const seasonData = await tmdbGet(
            `/tv/${tmdbTvId}/season/${firstSeasonNumber}`,
            {},
            SHORT_TTL
          );
          episodes = (seasonData.episodes || []).map((ep) => ({
            id: ep.id,
            episode_number: ep.episode_number,
            season_number: ep.season_number,
            name: ep.name,
            overview: ep.overview || "",
            runtime: ep.runtime || data.episode_run_time?.[0] || 45,
            still_path: ep.still_path
              ? resolvePosterUrl(ep.still_path, false)
              : normalized.backdrop_path,
          }));
        } catch {
          episodes = [];
        }

        const full = {
          ...normalized,
          status: data.status || "Returning Series",
          tagline: data.tagline || "",
          runtime: data.episode_run_time?.[0] || 45,
          seasonsCount: data.number_of_seasons || validSeasons.length || 1,
          episodesCount: data.number_of_episodes || episodes.length,
          network: data.networks?.[0]?.name || null,
          seasons: validSeasons.map((s) => ({
            season_number: s.season_number,
            name: s.name || `Season ${s.season_number}`,
            episode_count: s.episode_count,
          })),
          episodes,
          spokenLanguages: (data.spoken_languages || []).map((l) => l.english_name).filter(Boolean),
          director: creator,
          certification: cert,
          trailerKey: trailer?.key || null,
          cast: (data.credits?.cast || []).slice(0, 12).map((p) => ({
            ...p,
            profile_path: p.profile_path ? resolvePosterUrl(p.profile_path) : null,
          })),
          similar: similarRaw
            .filter((s) => s.poster_path)
            .slice(0, 6)
            .map((s) => normalizeTmdbMovie(s, "tv")),
        };
        setCachedData(cacheKey, full);
        return full;
      } catch (err) {
        console.error(`Error fetching TMDB TV ${tmdbTvId}:`, err.message);
      }
    }

    // 4. TMDB Movie
    const movieId = idStr.replace(/^movie-/, "");
    const cacheKey = `detail:movie:${movieId}`;
    const cached = getCachedData(cacheKey, SHORT_TTL);
    if (cached) return cached;

    try {
      const data = await tmdbGet(`/movie/${movieId}`, {
        append_to_response: "credits,videos,similar,recommendations,release_dates",
      });
      const normalized = normalizeTmdbMovie(data, "movie");
      const trailer =
        (data.videos?.results || []).find(
          (v) => v.site === "YouTube" && v.type === "Trailer"
        ) || (data.videos?.results || []).find((v) => v.site === "YouTube");
      const directorObj = (data.credits?.crew || []).find((c) => c.job === "Director");
      const releaseIN = data.release_dates?.results?.find((r) => r.iso_3166_1 === "IN");
      const releaseUS = data.release_dates?.results?.find((r) => r.iso_3166_1 === "US");
      const cert =
        releaseUS?.release_dates?.find((d) => d.certification)?.certification ||
        releaseIN?.release_dates?.find((d) => d.certification)?.certification ||
        "UA";

      const omdb = await Promise.race([
        tmdbService.getOmdbDetails(data.imdb_id),
        new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);
      const similarRaw =
        data.recommendations?.results?.length > 0
          ? data.recommendations.results
          : data.similar?.results || [];

      const financials = formatTmdbFinancials({
        budgetUsd: data.budget,
        revenueUsd: data.revenue,
        countryCode: data.production_countries?.[0]?.iso_3166_1,
        originalLanguage: data.original_language,
      });

      const full = {
        ...normalized,
        imdb_id: data.imdb_id,
        imdbRating: omdb?.imdbRating && omdb.imdbRating !== "N/A" ? omdb.imdbRating : null,
        awards: omdb?.Awards && omdb.Awards !== "N/A" ? omdb.Awards : null,
        boxOffice: omdb?.BoxOffice && omdb.BoxOffice !== "N/A" ? omdb.BoxOffice : null,
        runtime: data.runtime || 135,
        status: data.status || "Released",
        budget: data.budget || 0,
        revenue: data.revenue || 0,
        ...financials,
        tagline: data.tagline || "",
        director: directorObj?.name || omdb?.Director || "Featured Director",
        certification: cert,
        spokenLanguages: (data.spoken_languages || []).map((l) => l.english_name).filter(Boolean),
        belongs_to_collection: data.belongs_to_collection || null,
        trailerKey: trailer?.key || null,
        cast: (data.credits?.cast || []).slice(0, 12).map((p) => ({
          ...p,
          profile_path: p.profile_path ? resolvePosterUrl(p.profile_path) : null,
        })),
        similar: similarRaw
          .filter((m) => m.poster_path)
          .slice(0, 6)
          .map((m) => normalizeTmdbMovie(m, "movie")),
      };

      setCachedData(cacheKey, full);
      return full;
    } catch (error) {
      console.error(`Error fetching movie details for ${movieId}:`, error?.message);
      return {
        ...FALLBACK_MOVIES[0],
        id: movieId,
        title: `Movie ${movieId}`,
        runtime: 140,
        status: "Released",
        budget: 0,
        revenue: 0,
        cast: [],
        similar: FALLBACK_MOVIES,
      };
    }
  },

  invalidateCustomCache: () => {
    cache.delete("custom:movies:list");
    cache.delete("home:feed:v2");
  },

  getTheatres: async (movieId, city = "Bengaluru") => {
    let customMovie = null;
    if (String(movieId).startsWith("cr-") && isSupabaseReady()) {
      const { data: doc } = await getSupabase().from("movies").select("*").eq("custom_id", String(movieId)).single();
      if (doc) customMovie = normalizeCustomMovieDoc(mapMovie(doc));
    }
    return buildTheatresForMovie(movieId, city, customMovie);
  },

  warmCache: async () => {
    try {
      await Promise.all([
        tmdbService.getHomeFeed(),
        tmdbService.getCollections(),
      ]);
      console.log("[Cache Warm] Home & Collections warmed successfully.");
    } catch (err) {
      console.warn("[Cache Warm] Partial warmup:", err.message);
    }
  },

  getTvSeason: async (rawParamId, seasonNumber = 1) => {
    const idStr = String(rawParamId);
    const seasonNum = Math.max(1, parseInt(seasonNumber, 10) || 1);

    if (idStr.startsWith("tvmaze-")) {
      const showId = idStr.replace(/^tvmaze-/, "");
      const res = await axios.get(`${TVMAZE_BASE_URL}/shows/${showId}/episodes`, {
        timeout: 8000,
      });
      return (Array.isArray(res.data) ? res.data : [])
        .filter((e) => (e.season || 1) === seasonNum)
        .map((e) => ({
          id: e.id,
          episode_number: e.number,
          season_number: e.season || 1,
          name: e.name,
          overview: (e.summary || "").replace(/<[^>]+>/g, "").trim(),
          runtime: e.runtime || 45,
          still_path: e.image?.original || e.image?.medium || "",
        }));
    }

    const tmdbTvId = idStr.replace(/^tv-/, "");
    const data = await tmdbGet(`/tv/${tmdbTvId}/season/${seasonNum}`, {}, SHORT_TTL);
    return (data.episodes || []).map((ep) => ({
      id: ep.id,
      episode_number: ep.episode_number,
      season_number: ep.season_number,
      name: ep.name,
      overview: ep.overview || "",
      runtime: ep.runtime || 45,
      still_path: ep.still_path ? resolvePosterUrl(ep.still_path, false) : "",
    }));
  },

  getMovieCredits: async (movieId) => {
    const details = await tmdbService.getMovieDetails(movieId);
    return details.cast || [];
  },

  searchMovies: async (query) => {
    return tmdbService.searchAll(query);
  },

  searchAll: async (query, filters = {}) => {
    if (!query || !query.trim()) return [];
    const trimmed = query.trim();
    const cacheKey = `search:${trimmed.toLowerCase()}`;
    let combined = getCachedData(cacheKey, SHORT_TTL);

    if (!combined) {
      const [customList, tmdbMovies, tmdbTv, tvMaze, ghibli] = await Promise.all([
        getCustomMoviesNormalized().then((list) =>
          list.filter((m) => (m.title || "").toLowerCase().includes(trimmed.toLowerCase()))
        ),
        tmdbGet("/search/movie", { query: trimmed, page: 1 }).catch(() => ({ results: [] })),
        tmdbGet("/search/tv", { query: trimmed, page: 1 }).catch(() => ({ results: [] })),
        axios
          .get(`${TVMAZE_BASE_URL}/search/shows`, { params: { q: trimmed }, timeout: 6000 })
          .then((r) => (r.data || []).slice(0, 8).map((entry) => normalizeTvMazeShow(entry.show)))
          .catch(() => []),
        tmdbService.getGhibliFilms().then((films) =>
          films.filter((f) => f.title.toLowerCase().includes(trimmed.toLowerCase()))
        ),
      ]);

      combined = dedupeById([
        ...customList,
        ...(tmdbMovies.results || []).map((m) => normalizeTmdbMovie(m, "movie")),
        ...(tmdbTv.results || []).slice(0, 10).map((s) => normalizeTmdbMovie(s, "tv")),
        ...ghibli,
        ...tvMaze,
      ]).filter((m) => m.poster_path);

      setCachedData(cacheKey, combined);
    }

    return applyLocalFilters(combined, filters);
  },
};

function applyLocalFilters(items, { q = "", type = "all", genre = "", language = "", year = "", sort = "" } = {}) {
  let out = [...items];

  if (q && q.trim()) {
    const ql = q.trim().toLowerCase();
    out = out.filter((m) => (m.title || "").toLowerCase().includes(ql));
  }

  if (type && type !== "all") {
    out = out.filter((m) => m.mediaType === type);
  }

  if (genre && genre !== "all") {
    const targetName = String(genre).toLowerCase();
    const targetId = GENRE_NAME_TO_ID[targetName] || Number(genre);
    out = out.filter(
      (m) =>
        (Array.isArray(m.genre_ids) && m.genre_ids.includes(targetId)) ||
        (Array.isArray(m.genres) &&
          m.genres.some(
            (g) =>
              g.id === targetId ||
              (g.name && g.name.toLowerCase().includes(targetName))
          ))
    );
  }

  if (language && language !== "all") {
    const langs = language.split("|");
    out = out.filter((m) => langs.includes(m.original_language));
  }

  if (year && year !== "all") {
    out = out.filter((m) => {
      const y = parseInt(m.year || "0", 10);
      if (!y) return false;
      if (year === "2020s") return y >= 2020;
      if (year === "2010s") return y >= 2010 && y <= 2019;
      if (year === "classic") return y <= 2009;
      return String(y) === String(year);
    });
  }

  if (sort === "top_rated") {
    out.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  } else if (sort === "newest") {
    out.sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
  } else if (sort === "popular") {
    out.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  }

  return out;
}

module.exports = tmdbService;
