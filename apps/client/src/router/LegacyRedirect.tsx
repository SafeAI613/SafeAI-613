import { Navigate, generatePath, useLocation, useParams } from "react-router-dom";

/** Redirects a moved URL to its new location, keeping params, query string, hash and navigation state. */
export default function LegacyRedirect({ to }: { to: string }) {
  const { search, hash, state } = useLocation();
  const params = useParams();
  return <Navigate to={{ pathname: generatePath(to, params), search, hash }} state={state} replace />;
}
