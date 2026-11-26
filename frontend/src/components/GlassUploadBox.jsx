import { useState } from "react";
import { Upload, Image as ImageIcon, X } from "lucide-react";

const GlassUploadBox = ({
  label,
  hint = "Click or drop PNG / JPG",
  value = "",
  urlPlaceholder = "Or paste image URL (https://...)",
  onFileSelect,
  onUrlChange,
  onClear,
  required = false,
  compact = false,
}) => {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file && onFileSelect) onFileSelect(file);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 block">
          {label}
        </label>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`group relative flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden backdrop-blur-xl ${
          compact ? "min-h-[86px] p-2.5" : "min-h-[124px] p-4"
        } ${
          dragging
            ? "border-[#ff2e3b] bg-[#e50914]/15"
            : value
              ? "border-emerald-400/45 bg-white/[0.05] hover:border-white/40"
              : "border-white/[0.18] bg-white/[0.03] hover:border-[#ff2e3b]/60 hover:bg-white/[0.06]"
        }`}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onFileSelect) onFileSelect(file);
            e.target.value = "";
          }}
        />

        {value ? (
          <div className="w-full flex items-center gap-3">
            <img
              src={value}
              alt={label || "Preview"}
              className={`${
                compact ? "w-14 h-14" : "w-20 h-20"
              } rounded-xl object-cover border border-white/15 shrink-0 bg-black/40`}
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-bold text-emerald-300 truncate">
                Image Attached
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click box or drop a file to replace
              </p>
            </div>
            {onClear && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClear();
                }}
                aria-label="Clear image"
                className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-red-500/25 text-slate-300 hover:text-red-300 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-1.5">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-[#ff2e3b] group-hover:scale-105 transition-transform">
              {compact ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </div>
            <p className="text-xs font-semibold text-slate-200">{hint}</p>
            {!compact && (
              <p className="text-[10px] text-slate-400">
                Drag &amp; drop an image file here, or paste URL below
              </p>
            )}
          </div>
        )}
      </label>

      {onUrlChange && (
        <input
          type="text"
          required={required}
          placeholder={urlPlaceholder}
          value={value}
          onChange={(e) => onUrlChange(e.target.value)}
          className="w-full bg-white/[0.04] backdrop-blur-xl border border-white/[0.12] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#e50914] transition-all"
        />
      )}
    </div>
  );
};

export default GlassUploadBox;

