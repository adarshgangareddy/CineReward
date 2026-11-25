import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

const Unauthorized = () => (
  <section className="min-h-[70vh] flex items-center justify-center px-6 py-20">
    <div className="glass-panel rounded-3xl p-10 text-center max-w-md">
      <ShieldAlert className="w-14 h-14 text-[#ff2e3b] mx-auto mb-6" />
      <p className="text-[#ff2e3b] text-xs font-bold uppercase tracking-[0.25em] mb-3">
        403 Access Denied
      </p>
      <h1 className="text-3xl font-bold text-white mb-3">
        This area is restricted
      </h1>
      <p className="text-slate-400 text-sm mb-8 leading-relaxed">
        Sign in with an account that has the required role permissions or return to CineReward home.
      </p>
      <Link
        to="/"
        className="inline-flex btn-crimson px-6 py-3 rounded-xl text-sm"
      >
        Back to CineReward
      </Link>
    </div>
  </section>
);

export default Unauthorized;
