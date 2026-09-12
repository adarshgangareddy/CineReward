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
  <div className="pb-20">
    <section className="relative overflow-hidden px-6 py-28 bg-[linear-gradient(90deg,rgba(2,6,23,.98),rgba(2,6,23,.64)),url('https://image.tmdb.org/t/p/original/8YFL5QQVPy3Mrs2MKOD6RZEa2Lf.jpg')] bg-cover bg-center">
      <div className="max-w-7xl mx-auto">
        <p className="text-primary font-black uppercase tracking-[0.3em] text-xs mb-4">
          The CineReward story
        </p>
        <h1 className="text-5xl md:text-7xl font-black text-white max-w-3xl">
          Cinema that gives something back.
        </h1>
        <p className="text-slate-300 text-lg max-w-xl mt-6">
          A better place to discover movies, book seats, share useful reviews,
          and earn along the way.
        </p>
      </div>
    </section>
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map(([Icon, title, text]) => (
          <div
            key={title}
            className="bg-slate-900 border border-white/10 rounded-2xl p-6"
          >
            <Icon className="text-primary w-8 h-8 mb-8" />
            <h2 className="text-white font-black text-xl mb-2">{title}</h2>
            <p className="text-slate-400 text-sm leading-6">{text}</p>
          </div>
        ))}
      </div>
    </section>
    <section className="border-y border-white/10 bg-slate-900/40">
      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-8 text-center">
        {[
          ["Book", "Choose a show"],
          ["Review", "Share your take"],
          ["Earn", "Collect coins"],
          ["Redeem", "Enjoy more cinema"],
        ].map(([title, text]) => (
          <div key={title}>
            <p className="text-primary font-black text-2xl">{title}</p>
            <p className="text-slate-400 mt-2">{text}</p>
          </div>
        ))}
      </div>
    </section>
    <section className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
      <div>
        <p className="text-primary text-xs font-black uppercase tracking-[0.3em] mb-4">
          Built for movie people
        </p>
        <h2 className="text-4xl font-black text-white mb-5">
          A small platform with a useful promise.
        </h2>
        <p className="text-slate-400 leading-7">
          CineReward brings discovery, booking, reviews, and partner experiences
          into one focused home. Every part is designed to make the next movie
          decision easier.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          [Users, "50k+", "fans"],
          [BadgeCheck, "4.8/5", "community rating"],
        ].map(([Icon, value, label]) => (
          <div
            key={label}
            className="p-6 border border-white/10 rounded-2xl bg-slate-900"
          >
            <Icon className="text-primary mb-6" />
            <p className="text-3xl font-black text-white">{value}</p>
            <p className="text-slate-500 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>
    </section>
    <div className="max-w-7xl mx-auto px-6">
      <div className="rounded-2xl bg-primary p-8 md:p-12 flex flex-col md:flex-row gap-6 items-center justify-between">
        <h2 className="text-3xl font-black text-white">
          Ready for your next movie?
        </h2>
        <Link
          to="/"
          className="bg-slate-950 text-white px-6 py-3 rounded-xl font-bold"
        >
          Browse movies
        </Link>
      </div>
    </div>
  </div>
);

export default About;
