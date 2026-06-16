import { supabase } from "@/lib/supabase";
import { RealtimeChannel, Session, User } from "@supabase/supabase-js";
import { decode } from "base-64";
import { AppState, AppStateStatus } from "react-native";
import { create } from "zustand";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "renter" | "car_owner" | "admin" | null;
  avatar_url: string | null;
  nrc: string | null;
  nrc_url: string | null;
  gender: string | null;
  postal_code: string | null;
  location: string | null;
  is_active: boolean;
  is_blacklist: boolean;
  created_at: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  role: "renter" | "car_owner" | "admin" | null;
  isLoading: boolean;
  isInitialized: boolean; // true after the first getSession() call completes
  isVerifying: boolean;
  avatarUri: string | null;
  avatarBase64: string | null;
  profileSubscription: RealtimeChannel | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>; // Call once on app start to hydrate from storage
  setSession: (session: Session | null) => Promise<void>;
  fetchProfile: (userId: string, silent?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  setIsVerifying: (val: boolean) => void;
  isProfileComplete: () => boolean;
  setAvatarUri: (uri: string | null, base64?: string | null) => void;
  uploadAvatar: (
    uri: string,
    userId: string,
    base64?: string | null,
  ) => Promise<string | null>;
  subscribeToProfile: (userId: string) => void;
  unsubscribeFromProfile: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Copies missing OAuth metadata fields into the DB profile row.
  const syncMetadataToProfile = async (
    userId: string,
    profileData: any,
    metadata: any,
  ) => {
    if (!metadata) return profileData;

    const updates: any = {};
    const fieldsToSync = [
      "avatar_url",
      "nrc",
      "gender",
      "postal_code",
      "location",
      "phone",
    ];

    fieldsToSync.forEach((field) => {
      if (!profileData[field] && metadata[field]) {
        updates[field] = metadata[field];
        profileData[field] = metadata[field];
      }
    });

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);
      if (error) throw error;
    }

    return profileData;
  };

  return {
    session: null,
    user: null,
    profile: null,
    role: null,
    isLoading: true, // true on startup to prevent flash of login screen
    isInitialized: false,
    isVerifying: false,
    avatarUri: null,
    avatarBase64: null,
    profileSubscription: null,
    error: null,

    // Hydrates the store from persisted storage on cold start.
    // This is the ONLY reliable way to get the session on first open because
    // onAuthStateChange(INITIAL_SESSION) can fire before AsyncStorage is ready.
    initialize: async () => {
      // Prevent double-initialization
      if (get().isInitialized) return;

      try {
        set({ isLoading: true, error: null });

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        await get().setSession(session);
      } catch (error: any) {
        console.warn("Auth initialization failed:", error);
        set({
          isLoading: false,
          error: error?.message || "Unable to restore session",
        });
      } finally {
        set({ isInitialized: true });
      }
    },

    // Toggles the email-verification flow guard.
    setIsVerifying: (isVerifying: boolean) => set({ isVerifying }),

    // Stores the local avatar URI and optional base64 data.
    setAvatarUri: (
      avatarUri: string | null,
      avatarBase64: string | null = null,
    ) => set({ avatarUri, avatarBase64 }),

    // Updates session state; fetches profile on new sign-in, clears state on sign-out.
    setSession: async (session: Session | null) => {
      try {
        const currentSession = get().session;

        // Skip if the access token hasn't changed and the profile is already loaded.
        if (
          currentSession?.access_token === session?.access_token &&
          !!session &&
          !!get().profile
        ) {
          set({
            session,
            user: session.user,
            isLoading: false,
            error: null,
          });
          if (session.user.id) {
            get().subscribeToProfile(session.user.id);
          }
          return;
        }

        if (!session) {
          get().unsubscribeFromProfile();
          set({
            session: null,
            user: null,
            profile: null,
            role: null,
            isLoading: false,
          });
          return;
        }

        set({ session, user: session.user, isLoading: true });
        await get().fetchProfile(session.user.id);
        get().subscribeToProfile(session.user.id);
      } catch {
        set({ isLoading: false });
      }
    },

    // Updates profile and role only if the profile data has changed.
    setProfile: (profile) =>
      set((state) => {
        if (JSON.stringify(state.profile) === JSON.stringify(profile)) {
          return state;
        }
        return {
          profile,
          role: profile?.role || null,
        };
      }),

    // Fetches the user profile from DB; signs out if account is blocked.
    fetchProfile: async (userId: string, silent = false) => {
      try {
        if (!silent) set({ isLoading: true, error: null });

        const { data, error } = await Promise.race([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 30000),
          ),
        ]);

        if (error) throw error;

        if (data) {
          if (data.is_active === false || data.is_blacklist === true) {
            await get().signOut();
            return;
          }

          const metadata = get().session?.user?.user_metadata;
          const syncedData = await syncMetadataToProfile(
            userId,
            data,
            metadata,
          );

          set({
            profile: syncedData as Profile,
            role: syncedData.role as "renter" | "car_owner" | "admin",
            isLoading: false,
          });
        } else {
          set({ profile: null, role: null, isLoading: false });
        }
      } catch (error: any) {
        set({ isLoading: false, error: error.message || "Unknown error" });
      }
    },

    // Signs out from Supabase and clears all auth state.
    signOut: async () => {
      try {
        get().unsubscribeFromProfile();
        await supabase.auth.signOut();
      } finally {
        set({
          session: null,
          user: null,
          profile: null,
          role: null,
          isLoading: false,
        });
      }
    },

    // Uploads avatar image to Supabase Storage and returns the public URL.
    uploadAvatar: async (
      uri: string,
      userId: string,
      base64?: string | null,
    ) => {
      try {
        const fileExt = uri.split(".").pop()?.split("?")[0] || "jpg";
        const fileName = `${userId}.${fileExt}`;
        let body: any;
        const finalBase64 = base64 || get().avatarBase64;

        if (finalBase64) {
          const binary = decode(finalBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++)
            bytes[i] = binary.charCodeAt(i);
          body = bytes;
        } else {
          const response = await fetch(uri);
          body = await response.blob();
        }

        const { error: uploadError } = await supabase.storage
          .from("profiles")
          .upload(fileName, body, {
            contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("profiles").getPublicUrl(fileName);
        return publicUrl;
      } catch {
        return null;
      }
    },

    // Returns true if all required profile fields are filled.
    isProfileComplete: () => {
      const { profile } = get();
      if (!profile) return false;
      return !!(
        profile.full_name?.trim() &&
        profile.nrc?.trim() &&
        profile.gender &&
        profile.postal_code?.trim()
      );
    },

    // Opens a realtime channel to watch profile changes and react to account blocks.
    subscribeToProfile: (userId: string) => {
      if (get().profileSubscription) return;

      const channel = supabase
        .channel(`profile-updates-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            const newProfile = payload.new as Profile;

            if (
              newProfile.is_active === false ||
              newProfile.is_blacklist === true
            ) {
              get().signOut();
            } else {
              set({
                profile: newProfile,
                role: newProfile.role as "renter" | "car_owner" | "admin",
              });
            }
          },
        )
        .subscribe();

      set({ profileSubscription: channel });
    },

    // Removes the realtime profile channel subscription.
    unsubscribeFromProfile: () => {
      const { profileSubscription } = get();
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
        set({ profileSubscription: null });
      }
    },
  };
});

// Listens for post-initialization auth events.
// INITIAL_SESSION is intentionally ignored here — it races against AsyncStorage hydration
// and can deliver a null session before storage is ready. The `initialize()` action
// calls getSession() directly and is the single source of truth on cold start.
supabase.auth.onAuthStateChange(async (event, session) => {
  const { isVerifying, isInitialized, setSession } = useAuthStore.getState();
  if (isVerifying) return;

  // Skip INITIAL_SESSION — handled by initialize() to avoid the cold-start race condition.
  if (event === "INITIAL_SESSION") return;

  if (event === "TOKEN_REFRESHED" && session) {
    useAuthStore.setState({ session, user: session.user });
    return;
  }

  // For SIGNED_IN / SIGNED_OUT events, only process them after initialization is done
  // to avoid duplicate calls with the initialize() flow.
  if (!isInitialized) return;

  setSession(session);
});

// Restores session when app returns to foreground after a long background sleep.
// On Android, the JS context can be killed, clearing the in-memory store state.
// On resume, we re-hydrate from storage and update the store if the session was lost.
AppState.addEventListener("change", async (nextState: AppStateStatus) => {
  if (nextState !== "active") return;

  try {
    const store = useAuthStore.getState();
    // Only run recovery if we've already initialized (prevents conflict with cold start)
    if (!store.isInitialized) return;

    const { data, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn("Session recovery failed while reading storage:", sessionError);
      await store.signOut();
      return;
    }

    if (data.session && !store.session) {
      // Session was in storage but got cleared from memory — restore it
      await store.setSession(data.session);
      return;
    }

    if (!data.session && store.session) {
      // Access token may be expired but the refresh token can still be recovered
      // from the in-memory session. Use it explicitly to avoid the
      // "Refresh Token Not Found" path when storage is stale or unavailable.
      const refreshToken = store.session?.refresh_token;

      if (!refreshToken) {
        console.warn(
          "No refresh token available on app resume; signing out.",
        );
        await store.signOut();
        return;
      }

      const { data: refreshed, error: refreshError } =
        await supabase.auth.refreshSession({ refresh_token: refreshToken });

      if (refreshError) {
        console.warn("Session refresh failed on app resume:", refreshError);
        await store.signOut();
        return;
      }

      if (refreshed.session) {
        // Refresh succeeded — restore the new session silently
        await store.setSession(refreshed.session);
      } else {
        // Refresh token is also invalid/expired — sign out cleanly
        await store.setSession(null);
      }
    }
  } catch (error) {
    console.warn("Unexpected auth recovery error on app resume:", error);
    await useAuthStore.getState().signOut();
  }
});