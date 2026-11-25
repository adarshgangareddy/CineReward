export const BrandLogo = ({ size = "md" }) => {
  const textSize = size === "sm" ? "text-lg" : "text-xl sm:text-2xl";
  return (
    <div
      className={`inline-flex items-stretch font-brand font-bold tracking-tight ${textSize} leading-none select-none shadow-lg`}
    >
      <span className="bg-[#e50914] text-white px-2 py-0.5 rounded-l-[3px] uppercase">
        CINE
      </span>
      <span className="border-[1.5px] border-white/95 text-white px-2 py-0.5 rounded-r-[3px] uppercase bg-black/40">
        REWARD
      </span>
    </div>
  );
};

export default BrandLogo;
