import { Outlet, useLocation } from "react-router-dom";
import TopNavigation from "../components/TopNavigation";
import BetaBanner from "../components/BetaBanner";

/** Layout for the gateway-level pages (auth, about, contact...): the global top navigation and beta banner. */
export default function SiteLayout() {
  const location = useLocation();

  return (
    <>
      <TopNavigation />
      <BetaBanner />
      {/* Keyed by path so the entrance animation replays on every page change */}
      <main className="site-page" key={location.pathname}>
        <Outlet />
      </main>
    </>
  );
}
