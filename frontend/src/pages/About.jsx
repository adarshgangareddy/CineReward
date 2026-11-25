import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Clapperboard,
  Coins,
  MessageSquareText,
  Ticket,
  Users,
} from "lucide-react";

const features = [
  [
    Ticket,
    "Book tickets",
    "Find a seat and check out without the usual friction.",
  ],
  [
    Coins,
    "Earn rewards",
    "Turn bookings and thoughtful reviews into reward coins.",
  ],
  [
    Clapperboard,
    "Discover movies",
    "Browse TMDB-powered films and find your next watch.",
  ],
  [
    MessageSquareText,
    "Trusted reviews",
    "Make better choices with reviews scored for quality.",
  ],
];

const About = () => (
  <div className="bg-[#09090d] pb-20">
    <section className="relative overflow-hidden px-6 py-24 bg-[linear-gradient(90deg,rgba(9,9,13,.98),rgba(9,9,13,.68)),url('https://image.tmdb.org/t/p/original/8YFL5QQVPy3Mrs2MKOD6RZEa2Lf.jpg')] bg-cover bg-center border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto">
        <p className="text-[#ff2e3b] font-bold uppercase tracking-[0.26em] text-xs mb-3">
          The CineReward Story
        </p>
        <h1 className="text-4xl md:text-6xl font-black text-white max-w-3xl tracking-tight leading-tight">
          Cinema discovery that gives something back.
        </h1>
        <p className="text-slate-300 text-base md:text-lg max-w-xl mt-5 leading-relaxed">
          Explore movies, curated franchises, and TV series powered by open public APIs —
          book theatre seats, share AI-scored reviews, and earn real reward coins.
        </p>
      </div>
    </section>
    <section className="max-w-7xl mx-auto px-6 py-16">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map(([Icon, title, text]) => (
          <div
            key={title}
            className="glass-card rounded-2xl p-6"
          >
            <Icon className="text-[#ff2e3b] w-7 h-7 mb-6" />
            <h2 className="text-white font-bold text-lg mb-2">{title}</h2>
            <p className="text-slate-400 text-xs leading-6">{text}</p>
          </div>
        ))}
      </div>
    </section>
    <section className="border-y border-white/[0.07] bg-white/[0.02]">
      <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-4 gap-8 text-center">
        {[
          ["Book", "Choose a seat & showtime"],
          ["Review", "Share your genuine take"],
          ["Earn", "Collect AI-awarded coins"],
          ["Redeem", "Unlock more cinema"],
        ].map(([title, text]) => (
          <div key={title}>
            <p className="text-[#ff2e3b] font-extrabold text-2xl">{title}</p>
            <p className="text-slate-400 text-xs mt-1.5">{text}</p>
          </div>
        ))}
      </div>
    </section>
    <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
      <div>
        <p className="text-[#ff2e3b] text-xs font-bold uppercase tracking-[0.25em] mb-3">
          Built for movie communities
        </p>
        <h2 className="text-3xl font-extrabold text-white mb-4">
          One unified hub for fans, creators &amp; theatres.
        </h2>
        <p className="text-slate-400 text-sm leading-7">
          CineReward combines MultiMovies-inspired glassmorphic discovery, curated collections,
          seat reservations, and partner event management into one cohesive experience.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          [Users, "50k+", "cinema fans"],
          [BadgeCheck, "4.8/5", "community score"],
        ].map(([Icon, value, label]) => (
          <div
            key={label}
            className="p-6 glass-card rounded-2xl"
          >
            <Icon className="text-[#ff2e3b] mb-5" />
            <p className="text-3xl font-black text-white">{value}</p>
            <p className="text-slate-400 text-xs mt-1">{label}</p>
          </div>
        ))}
      </div>
    </section>
    <div className="max-w-7xl mx-auto px-6">
      <div className="rounded-3xl bg-gradient-to-r from-[#e50914] to-rose-700 p-8 md:p-10 flex flex-col md:flex-row gap-6 items-center justify-between shadow-2xl">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white">
          Ready for your next movie night?
        </h2>
        <Link
          to="/catalog"
          className="bg-white hover:bg-slate-100 text-slate-950 px-6 py-3 rounded-xl font-bold text-xs"
        >
          Explore Catalog →
        </Link>
      </div>
    </div>
  </div>
);

export default About;
