import { CheckCircle2, Ticket, Coins, MapPin, Calendar, Clock } from "lucide-react";

const hashSeed = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const QrScannerSvg = ({ value }) => {
  const size = 21;
  const seed = hashSeed(String(value || "CINEREWARD"));

  const isFinderCell = (r, c) => {
    const inTopLeft = r < 7 && c < 7;
    const inTopRight = r < 7 && c >= size - 7;
    const inBottomLeft = r >= size - 7 && c < 7;
    if (!inTopLeft && !inTopRight && !inBottomLeft) return null;

    const lr = r >= size - 7 ? r - (size - 7) : r;
    const lc = c >= size - 7 ? c - (size - 7) : c;
    const onOuter = lr === 0 || lr === 6 || lc === 0 || lc === 6;
    const onInner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
    return onOuter || onInner;
  };

  const cells = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const finder = isFinderCell(r, c);
      let filled = false;
      if (finder !== null) {
        filled = finder;
      } else {
        const bitHash = (seed ^ (r * 73856093) ^ (c * 19349663)) >>> 0;
        filled = bitHash % 2 === 0;
      }
      if (filled) {
        cells.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#0f172a" />);
      }
    }
  }

  return (
    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm shrink-0">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-24 h-24 sm:w-28 sm:h-28 block"
        aria-label="M-Ticket QR Scanner"
      >
        <rect width={size} height={size} fill="#ffffff" />
        {cells}
      </svg>
    </div>
  );
};

const TicketBarcode = ({ value }) => {
  const seed = hashSeed(String(value || "CINEREWARD"));
  const bars = Array.from({ length: 32 }, (_, i) => ((seed >> (i % 16)) & 1 ? 3 : 1));
  return (
    <div className="flex items-stretch justify-center gap-[2px] h-9 bg-white px-2.5 py-1 rounded border border-slate-200">
      {bars.map((w, i) => (
        <span
          key={i}
          className="bg-slate-900 inline-block h-full"
          style={{ width: `${w}px` }}
        />
      ))}
    </div>
  );
};

const WhiteTicketCard = ({
  bookingId,
  movieTitle,
  poster,
  languageFormat,
  theatre,
  area,
  city,
  screen,
  date,
  time,
  seats,
  snacksSummary,
  totalPaid,
  paymentMethod,
  coinsEarned,
}) => {
  const shortId = String(bookingId || "CR000001")
    .slice(-8)
    .toUpperCase();
  const seatText = Array.isArray(seats) ? seats.join(", ") : String(seats || "");

  return (
    <div className="bg-white text-slate-900 rounded-3xl overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.65)] border border-slate-200 printable-ticket">
      {/* Dark Branded Ticket Header Strip */}
      <div className="bg-[#0e0f17] border-b-4 border-[#e50914] px-5 sm:px-7 py-5 flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-stretch font-brand font-bold tracking-tight text-xl leading-none select-none">
            <span className="bg-[#e50914] text-white px-2 py-0.5 rounded-l-[3px] uppercase">
              CINE
            </span>
            <span className="border-[1.5px] border-white/95 text-white px-2 py-0.5 rounded-r-[3px] uppercase bg-black/40">
              REWARD
            </span>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5">
            Official Cinema Boarding Pass
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Confirmed
        </span>
      </div>

      {/* Crisp White Ticket Details */}
      <div className="p-5 sm:p-7 space-y-5">
        <div className="flex items-start gap-4">
          {poster && (
            <img
              src={poster}
              alt={movieTitle}
              className="w-16 h-24 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-tight break-words">
              {movieTitle || "Movie Ticket"}
            </h2>
            {languageFormat && (
              <p className="text-xs font-semibold text-slate-500 mt-1">
                {languageFormat}
              </p>
            )}
            <div className="mt-2.5 flex items-start gap-1.5 text-xs font-bold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-[#e50914] shrink-0 mt-0.5" />
              <span className="break-words">
                {theatre}
                {area ? `, ${area}` : ""}
                {city ? ` (${city})` : ""}
              </span>
            </div>
            {screen && (
              <p className="text-[11px] font-semibold text-slate-500 ml-5 mt-0.5">
                {screen}
              </p>
            )}
          </div>
        </div>

        {/* Date, Time & Seat Block */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date
            </p>
            <p className="text-sm font-extrabold text-slate-900 mt-0.5">{date}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Showtime
            </p>
            <p className="text-sm font-extrabold text-emerald-700 mt-0.5">{time}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Ticket className="w-3 h-3 text-[#e50914]" /> Seats
            </p>
            <p className="text-sm font-black text-[#e50914] mt-0.5 break-words">
              {seatText}
            </p>
          </div>
        </div>

        {/* Payment & Snacks Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Paid {paymentMethod ? `(${paymentMethod})` : ""}
            </p>
            <p className="text-lg font-black text-slate-950">₹{totalPaid ?? 0}</p>
            {snacksSummary && (
              <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                Includes F&amp;B: {snacksSummary}
              </p>
            )}
          </div>

          {Number(coinsEarned) > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              +{coinsEarned} CineCoins
            </span>
          )}
        </div>
      </div>

      {/* Perforated Tear Line + White Scanner Stub */}
      <div className="relative bg-slate-100 border-t-2 border-dashed border-slate-300 px-5 sm:px-7 py-5">
        <span className="hidden sm:block absolute -top-3 -left-3 w-6 h-6 rounded-full bg-[#07080d]" />
        <span className="hidden sm:block absolute -top-3 -right-3 w-6 h-6 rounded-full bg-[#07080d]" />

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <QrScannerSvg value={bookingId} />
          <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Scan at Cinema Entry
              </p>
              <p className="font-mono text-sm font-black tracking-[0.18em] text-slate-900 mt-0.5">
                BOOKING ID: #{shortId}
              </p>
            </div>
            <TicketBarcode value={bookingId} />
            <p className="text-[11px] text-slate-500">
              Present this white pass QR code or Booking ID at the theatre kiosk. Arrive 20 mins before showtime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhiteTicketCard;
