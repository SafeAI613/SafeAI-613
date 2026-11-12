import type { ReactNode } from "react";
import ProfileSelectionModal from "../components/ProfileSelectionModal";
import { useAuth } from "../context/authStore";

/**
 * Asks a logged-in user to pick a filter profile before they use the app.
 *
 * The proxy rejects every request from a user without a profile, so this
 * runs inside ProtectedRoute for every protected page instead of only on the
 * login page. That way it also covers self-registration, email
 * verification auto-login, Google OAuth and a page refresh.
 */
export function ProfileGate({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();

  // A temporary password must be replaced first; the change-password page
  // is itself protected, so don't stack the modal on top of it.
  const needsProfile = !!user?._id && !user.profileId && !user.mustChangePassword;

  return (
    <>
      {children}
      <ProfileSelectionModal
        isOpen={needsProfile}
        onClose={() => {}} // Selection is required; the modal cannot be dismissed
        userId={user?._id ?? ""}
        onProfileSelected={(profileId) => {
          if (user) setUser({ ...user, profileId });
        }}
      />
    </>
  );
}
