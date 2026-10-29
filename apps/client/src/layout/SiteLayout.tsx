import { Outlet } from "react-router-dom";
import TopNavigation from "../components/TopNavigation";
import BetaBanner from "../components/BetaBanner";

/** Layout for the gateway-level pages (auth, about, contact...): the global top navigation and beta banner. */
export default function SiteLayout() {
  return (
    <>
      <TopNavigation />
      <BetaBanner />
      <Outlet />
    </>
  );
}
