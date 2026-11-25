const LoadingSpinner = ({ fullPage = false, message = "Loading..." }) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="w-12 h-12 border-2 border-white/10 border-t-[#e50914] rounded-full animate-spin"></div>
        <div className="absolute inset-0 bg-[#e50914]/20 blur-xl rounded-full animate-pulse"></div>
      </div>
      {message && (
        <p className="text-slate-400 font-semibold uppercase tracking-[0.25em] text-[10px]">
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
