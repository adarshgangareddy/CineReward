import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getActiveSession } from "../utils/auth";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const location = useLocation();
  const session = getActiveSession();

  if (!session || !session.role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length && !allowedRoles.includes(session.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
