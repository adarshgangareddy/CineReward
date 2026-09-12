import { Navigate, Outlet, useLocation } from "react-router-dom";

const roleAliases = {
  admin: "super_admin",
  superadmin: "super_admin",
  movieteam: "movie_team",
};

const getRole = () => {
  for (const key of ["user", "team", "superAdmin"]) {
    try {
      const session = JSON.parse(localStorage.getItem(key) || "null");
      if (session)
        return (
          roleAliases[session.role] ||
          session.role ||
          (key === "team"
            ? "movie_team"
            : key === "superAdmin"
              ? "super_admin"
              : "user")
        );
    } catch {
      // Ignore malformed stale sessions and continue to the next session type.
    }
  }
  return null;
};

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const location = useLocation();
  const role = getRole();

  if (!role) return <Navigate to="/login" state={{ from: location }} replace />;
  if (allowedRoles.length && !allowedRoles.includes(role))
    return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
