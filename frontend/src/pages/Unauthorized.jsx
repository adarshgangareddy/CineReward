import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const Unauthorized = () => (
  <section className="min-h-[60vh] flex items-center justify-center px-6 py-20">
    <div className="text-center max-w-md">
      <ShieldAlert className="w-14 h-14 text-primary mx-auto mb-6" />
      <p className="text-primary text-xs font-black uppercase tracking-[0.3em] mb-3">
        403 Access denied
      </p>
      <h1 className="text-4xl font-black text-white mb-4">
        This area is not in your role.
      </h1>
      <p className="text-slate-400 mb-8">
        Use an account with the required permissions or return to the cinema
        home.
      </p>
      <Link
        to="/"
        className="inline-flex bg-primary hover:bg-primary-dark text-white font-bold px-6 py-3 rounded-xl"
      >
        Back to CineReward
      </Link>
    </div>
  </section>
);

export default Unauthorized;
