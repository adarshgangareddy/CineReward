import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  Star,
  Ticket,
  Coins,
  Handshake,
  Sparkles,
} from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotificationToast = ({ notification, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!notification) return undefined;
    const timeout = window.setTimeout(onClose, 7000);
    return () => window.clearTimeout(timeout);
  }, [notification, onClose]);

  if (!notification) return null;

  const { title, body, data } = notification;
  const content = `${title || ""} ${body || ""}`.toLowerCase();
  const type =
    data?.type ||
    (content.includes("review")
      ? "review_reminder"
      : content.includes("coin") || content.includes("reward")
        ? "coins-awarded"
        : content.includes("book") || content.includes("ticket")
          ? "ticket-booked"
          : content.includes("partner")
            ? "partner_update"
            : "general");
  const variants = {
    review_reminder: {
      Icon: Star,
      label: "⭐ Review reminder",
      accent: "text-amber-300",
      border: "border-amber-300/30",
      glow: "bg-amber-400/20",
      button: "Review now",
      action: data?.ticketId ? `/review/${data.ticketId}` : "/dashboard",
    },
    "ticket-booked": {
      Icon: Ticket,
      label: "🍿 Booking confirmed",
      accent: "text-cyan-300",
      border: "border-cyan-300/30",
      glow: "bg-cyan-400/20",
      button: "View booking",
      action: data?.url || "/dashboard",
    },
    "coins-awarded": {
      Icon: Coins,
      label: "🪙 Rewards update",
      accent: "text-yellow-300",
      border: "border-yellow-300/30",
      glow: "bg-yellow-400/20",
      button: "Open wallet",
      action: "/dashboard",
    },
    partner_update: {
      Icon: Handshake,
      label: "🤝 Partner update",
      accent: "text-emerald-300",
      border: "border-emerald-300/30",
      glow: "bg-emerald-400/20",
      button: "Check update",
      action: data?.url || "/partner-status",
    },
    general: {
      Icon: Bell,
      label: "✨ CineReward alert",
      accent: "text-primary-light",
      border: "border-primary/30",
      glow: "bg-primary/20",
      button: data?.url ? "Open update" : null,
      action: data?.url,
    },
  };
  const variant = variants[type] || variants.general;
  const Icon = variant.Icon;

  const openAction = () => {
    if (!variant.action) return;
    navigate(variant.action);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 32, x: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
        exit={{
          opacity: 0,
          y: 16,
          x: 24,
          scale: 0.96,
          transition: { duration: 0.2 },
        }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        role="status"
        aria-live="polite"
        className="fixed bottom-4 md:bottom-8 inset-x-4 md:inset-auto md:right-8 z-[1000] w-auto md:w-full md:max-w-md"
      >
        <div
          className={`bg-slate-950/95 backdrop-blur-2xl border ${variant.border} rounded-2xl p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] relative overflow-hidden group`}
        >
          <div
            className={`absolute -top-16 -right-10 w-40 h-40 ${variant.glow} rounded-full blur-3xl animate-pulse`}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent notification-shimmer" />
          <button
            onClick={onClose}
            aria-label="Dismiss notification"
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex gap-4 items-start relative">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className={`w-12 h-12 ${variant.glow} rounded-xl flex items-center justify-center shrink-0 border ${variant.border}`}
            >
              <Icon className={`w-6 h-6 ${variant.accent}`} />
            </motion.div>

            <div className="flex-grow pt-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className={`w-3.5 h-3.5 ${variant.accent}`} />
                <span
                  className={`text-[10px] font-black uppercase tracking-[0.18em] ${variant.accent}`}
                >
                  {variant.label}
                </span>
              </div>
              <h4 className="text-white font-black text-base leading-tight mb-1">
                {title || variant.label}
              </h4>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">
                {body || "You have a new CineReward update."}
              </p>

              {variant.action && (
                <div className="mt-5 flex gap-3">
                  <button
                    onClick={openAction}
                    className="bg-primary hover:bg-primary-dark text-white text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-primary/20"
                  >
                    {variant.button}
                  </button>
                  <button
                    onClick={onClose}
                    className="bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg transition-all"
                  >
                    Later
                  </button>
                </div>
              )}
            </div>
          </div>
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 7, ease: "linear" }}
            className={`absolute bottom-0 left-0 right-0 origin-left h-0.5 ${variant.glow.replace("/20", "")}`}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationToast;
