import { Navigate, useLocation } from "react-router-dom";

/** Redirects a moved URL to its new location, keeping the query string and hash. */
export default function LegacyRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}
