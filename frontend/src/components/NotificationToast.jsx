import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Star, Ticket, Coins, Handshake, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const VARIANTS = {
  review_reminder: {
    Icon: Star,
    label: "Review Reminder",
    accent: "text-amber-300",
    border: "border-amber-400/35",
    glow: "bg-amber-400/20",
    bar: "bg-amber-400",
    button: "Review Now",
  },
  "ticket-booked": {
    Icon: Ticket,
    label: "Booking Confirmed",
    accent: "text-emerald-300",
    border: "border-emerald-400/35",
    glow: "bg-emerald-400/20",
    bar: "bg-emerald-400",
    button: "View M-Ticket",
  },
  "coins-awarded": {
    Icon: Coins,
    label: "Rewards Credited",
    accent: "text-yellow-300",
    border: "border-yellow-400/35",
    glow: "bg-yellow-400/20",
    bar: "bg-yellow-400",
    button: "Open Wallet",
  },
  partner_update: {
    Icon: Handshake,
    label: "Partner Update",
    accent: "text-cyan-300",
    border: "border-cyan-400/35",
    glow: "bg-cyan-400/20",
    bar: "bg-cyan-400",
    button: "Check Status",
  },
  general: {
    Icon: Bell,
    label: "CineReward Alert",
    accent: "text-rose-300",
    border: "border-[#e50914]/40",
    glow: "bg-[#e50914]/20",
    bar: "bg-[#e50914]",
    button: "Open",
  },
};

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

  const variant = VARIANTS[type] || VARIANTS.general;
  const Icon = variant.Icon;
  const actionPath =
    type === "review_reminder"
      ? data?.ticketId
        ? `/review/${data.ticketId}`
        : "/dashboard"
      : type === "partner_update"
        ? data?.url || "/partner-status"
        : data?.url || "/dashboard";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.95, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        role="status"
        aria-live="polite"
        className="fixed bottom-24 lg:bottom-7 inset-x-3 sm:inset-x-auto sm:right-6 z-[1000] sm:w-full sm:max-w-sm print:hidden"
      >
        <div
          className={`bg-[#0d111b]/95 backdrop-blur-2xl border ${variant.border} rounded-2xl p-4 sm:p-5 shadow-[0_24px_70px_rgba(0,0,0,0.8)] relative overflow-hidden`}
        >
          <div
            className={`absolute -top-14 -right-10 w-36 h-36 ${variant.glow} rounded-full blur-3xl pointer-events-none`}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss notification"
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white transition-colors z-10 p-1"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5 items-start relative pr-5">
            <div
              className={`w-11 h-11 ${variant.glow} rounded-xl flex items-center justify-center shrink-0 border ${variant.border}`}
            >
              <Icon className={`w-5 h-5 ${variant.accent}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className={`w-3 h-3 ${variant.accent}`} />
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.16em] ${variant.accent}`}
                >
                  {variant.label}
                </span>
              </div>
              <h4 className="text-white font-bold text-sm leading-snug mb-1">
                {title || variant.label}
              </h4>
              <p className="text-slate-300 text-xs leading-relaxed break-words">
                {body || "You have a new CineReward notification."}
              </p>

              <div className="mt-3.5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    navigate(actionPath);
                    onClose();
                  }}
                  className="bg-[#e50914] hover:bg-red-700 text-white text-[11px] font-bold px-3.5 py-2 rounded-lg transition-all"
                >
                  {variant.button}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 text-[11px] font-semibold px-3 py-2 rounded-lg transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 7, ease: "linear" }}
            className={`absolute bottom-0 left-0 right-0 origin-left h-0.5 ${variant.bar}`}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationToast;
