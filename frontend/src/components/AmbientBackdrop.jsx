import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { DEFAULT_BACKDROP } from "../utils/backdrop";

const AmbientBackdrop = () => {
  const location = useLocation();
  const [defaultUrl, setDefaultUrl] = useState(DEFAULT_BACKDROP);
  const [backdropUrl, setBackdropUrl] = useState(DEFAULT_BACKDROP);
  const [mode, setMode] = useState("ambient"); // "hero" | "detail" | "ambient"

  useEffect(() => {
    axios
      .get("/api/movies/home")
      .then((res) => {
        const first = res.data?.heroSlides?.[0]?.backdrop_path;
        if (first) {
          setDefaultUrl(first);
          setBackdropUrl((prev) => (prev === DEFAULT_BACKDROP ? first : prev));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.url) {
        setBackdropUrl(e.detail.url);
      }
      if (e.detail?.mode) {
        setMode(e.detail.mode);
      }
    };
    window.addEventListener("cinereward:backdrop", handler);
    return () => window.removeEventListener("cinereward:backdrop", handler);
  }, []);

  useEffect(() => {
    // Reset to ambient mode when leaving Home/MovieDetails
    if (
      location.pathname !== "/" &&
      !location.pathname.startsWith("/movie/")
    ) {
      setMode("ambient");
      setBackdropUrl(defaultUrl);
    }
  }, [location.pathname, defaultUrl]);

  const isDetail = mode === "detail";
  const isHero = mode === "hero";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#07080d]"
    >
      <img
        key={backdropUrl}
        src={backdropUrl}
        alt=""
        className={`w-full h-full object-cover object-center transition-all duration-700 ${
          isDetail
            ? "opacity-80 scale-100"
            : isHero
              ? "opacity-50 scale-[1.03]"
              : "opacity-35 scale-[1.04]"
        }`}
      />

      {/* Cinema directional vignette keeping backdrop bright & clear while text stays readable */}
      <div
        className={`absolute inset-0 ${
          isDetail
            ? "bg-gradient-to-r from-[#07080d]/90 via-[#07080d]/35 to-transparent"
            : "bg-gradient-to-r from-[#07080d]/90 via-[#07080d]/65 to-[#07080d]/55"
        }`}
      />
      <div
        className={`absolute inset-0 ${
          isDetail
            ? "bg-gradient-to-t from-[#07080d]/95 via-[#07080d]/20 to-[#07080d]/45"
            : "bg-gradient-to-t from-[#07080d]/95 via-[#07080d]/50 to-[#07080d]/70"
        }`}
      />

      {/* Subtle crimson cinema atmosphere glow */}
      <div className="absolute -top-40 left-1/4 w-[620px] h-[420px] bg-[#e50914]/15 rounded-full blur-[160px]" />
    </div>
  );
};

export default AmbientBackdrop;
