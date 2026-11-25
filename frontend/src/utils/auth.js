const ROLE_ALIASES = {
  admin: "super_admin",
  superadmin: "super_admin",
  movieteam: "movie_team",
};

export function normalizeRole(role) {
  return ROLE_ALIASES[role] || role || null;
}

export function safeParseJSON(raw) {
  if (!raw || raw === "undefined" || raw === "null") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getApiBaseURL() {
  const configuredApiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  if (configuredApiUrl) return configuredApiUrl;

  if (typeof window !== "undefined") {
    const isLocalDevHost = ["localhost", "127.0.0.1"].includes(
      window.location.hostname
    );
    return isLocalDevHost ? "http://localhost:5000" : "";
  }
  return "";
}

export function clearAllSessions() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("team");
  localStorage.removeItem("superAdmin");
  window.dispatchEvent(new Event("userUpdated"));
}

export function saveRoleSession(role, userPayload, token) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("team");
  localStorage.removeItem("superAdmin");

  const normalized = normalizeRole(role || userPayload?.role);

  if (normalized === "movie_team") {
    localStorage.setItem(
      "team",
      JSON.stringify({ ...userPayload, role: "movie_team", token })
    );
  } else if (normalized === "super_admin") {
    localStorage.setItem(
      "superAdmin",
      JSON.stringify({ ...userPayload, role: "super_admin", token })
    );
  } else {
    if (token) localStorage.setItem("token", token);
    localStorage.setItem(
      "user",
      JSON.stringify({ ...userPayload, role: "user" })
    );
  }

  window.dispatchEvent(new Event("userUpdated"));
}

export function getActiveSession() {
  const token = localStorage.getItem("token");
  const user = safeParseJSON(localStorage.getItem("user"));
  if (user && token && token !== "undefined" && token !== "null") {
    return {
      role: normalizeRole(user.role) || "user",
      token,
      data: user,
      storageKey: "user",
    };
  }

  const team = safeParseJSON(localStorage.getItem("team"));
  if (team?.token) {
    return {
      role: "movie_team",
      token: team.token,
      data: team,
      storageKey: "team",
    };
  }

  const superAdmin = safeParseJSON(localStorage.getItem("superAdmin"));
  if (superAdmin?.token) {
    return {
      role: "super_admin",
      token: superAdmin.token,
      data: superAdmin,
      storageKey: "superAdmin",
    };
  }

  return null;
}

export function getTokenForApiUrl(url = "") {
  const team = safeParseJSON(localStorage.getItem("team"));
  const superAdmin = safeParseJSON(localStorage.getItem("superAdmin"));
  const userToken = localStorage.getItem("token");

  if (url.includes("/admin/team/")) {
    return team?.token || superAdmin?.token || null;
  }
  if (url.includes("/admin/")) {
    return superAdmin?.token || null;
  }
  if (userToken && userToken !== "undefined" && userToken !== "null") {
    return userToken;
  }
  return team?.token || superAdmin?.token || null;
}
