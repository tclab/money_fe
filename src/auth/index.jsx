import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    // Hydrate from any persisted session, then keep in sync with auth events.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // Password-reset links open the app in a recovery session; flag it so the
      // shell shows the new-password screen instead of the authenticated app.
      if (_event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email, password, fullName) =>
    supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
    });

  // Drop-in slot for a future passwordless flow; the backend already accepts
  // the same JWT regardless of how it was issued.
  const signInWithMagicLink = (email) =>
    supabase.auth.signInWithOtp({ email });

  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`,
    });

  const updatePassword = (password) =>
    supabase.auth.updateUser({ password });

  const updateProfile = (fullName) =>
    supabase.auth.updateUser({ data: { full_name: fullName } });

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, recovery, setRecovery, signIn, signUp, signInWithMagicLink, resetPassword, updatePassword, updateProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
