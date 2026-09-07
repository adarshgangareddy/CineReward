
const LoadingSpinner = ({ fullPage = false, message = 'Loading...' }) => {
  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-800 border-t-primary rounded-full animate-spin"></div>
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
      </div>
      {message && (
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
