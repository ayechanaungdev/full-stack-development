// ================================================================
// OLD: Supabase Auth Store (kept for reference)
// ================================================================
// import { supabase } from "@/lib/supabase";
// import adapters from "@/lib/serviceAdapters";
// import { RealtimeChannel, Session, User } from "@supabase/supabase-js";
// import { decode, encode as b64encode } from "base-64";
// import { AppState, AppStateStatus } from "react-native";
// import { create } from "zustand";
//
// export interface Profile {
//   id: string;
//   full_name: string | null;
//   phone: string | null;
//   role: "renter" | "car_owner" | "admin" | null;
//   avatar_url: string | null;
//   nrc: string | null;
//   nrc_url: string | null;
//   gender: string | null;
//   postal_code: string | null;
//   location: string | null;
//   is_active: boolean;
//   is_blacklist: boolean;
//   created_at: string;
// }
//
// ... (full old store at the bottom of this file)
// ================================================================

// ================================================================
// NEW: Backend Auth Store (active)
// ================================================================
import { tokenManager } from "@/lib/axios";
import apiClient from "@/lib/axios";
import { create } from "zustand";

export interface Profile {
  id: number;
  email: string;
  name: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  nrc: string | null;
  nrc_url: string | null;
  gender: string | null;
  postal_code: string | null;
  location: string | null;
  is_active: boolean;
  is_blacklist: boolean;
  role: "USER" | "ADMIN";
  fcmToken: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  session: { accessToken: string; refreshToken: string } | null;
  user: Profile | null;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  role: "USER" | "ADMIN" | null;
  isLoading: boolean;
  isInitialized: boolean;
  isVerifying: boolean;
  avatarUri: string | null;
  avatarBase64: string | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  setSession: (session: { accessToken: string; refreshToken: string } | null, user?: Profile) => Promise<void>;
  fetchProfile: (userId: number, silent?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  setIsVerifying: (val: boolean) => void;
  isProfileComplete: () => boolean;
  setAvatarUri: (uri: string | null, base64?: string | null) => void;
}

const AUTH_STORAGE_KEY = "backend_auth";

const saveToStorage = async (data: object) => {
  try {
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[Auth] saveToStorage failed:', e);
  }
};

const loadFromStorage = async (): Promise<{
  session: { accessToken: string; refreshToken: string } | null;
  user: Profile | null;
} | null> => {
  try {
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const removeFromStorage = async () => {
  try {
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  isInitialized: false,
  isVerifying: false,
  avatarUri: null,
  avatarBase64: null,
  error: null,

  // OLD: initialize() used supabase.auth.getSession()
  // NEW: read tokens + user from AsyncStorage
  initialize: async () => {
    if (get().isInitialized) return;
    try {
      set({ isLoading: true, error: null });
      const stored = await loadFromStorage();
      if (stored?.session && stored?.user) {
        console.log('[Auth] Session restored from storage');
        await tokenManager.setTokens(stored.session.accessToken, stored.session.refreshToken);
        set({
          session: stored.session,
          user: stored.user,
          profile: stored.user,
          role: stored.user.role,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        console.log('[Auth] No stored session found');
        set({ isLoading: false, isInitialized: true });
      }
    } catch (error: any) {
      console.warn('[Auth] initialize error:', error?.message);
      set({ isLoading: false, error: error?.message || "Unable to restore session", isInitialized: true });
    }
  },

  setIsVerifying: (isVerifying: boolean) => set({ isVerifying }),

  setAvatarUri: (avatarUri: string | null, avatarBase64: string | null = null) =>
    set({ avatarUri, avatarBase64 }),

  // OLD: setSession took Supabase Session | null
  // NEW: takes { accessToken, refreshToken } | null + optional user
  setSession: async (session, user) => {
    if (!session) {
      set({ session: null, user: null, profile: null, role: null, isLoading: false });
      await removeFromStorage();
      return;
    }
    if (user) {
      await tokenManager.setTokens(session.accessToken, session.refreshToken);
      set({ session, user, profile: user, role: user.role, isLoading: false });
      await saveToStorage({ session, user });
    } else {
      set({ session, isLoading: false });
    }
  },

  setProfile: (profile) =>
    set((state) => {
      if (JSON.stringify(state.profile) === JSON.stringify(profile)) return state;
      return { profile, role: profile?.role || null };
    }),

  // NEW: login via backend /auth/login
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      console.log("[AUTH] Login attempt to:", apiClient.defaults.baseURL + "/auth/login");
      const response = await apiClient.post("/auth/login", { email, password });
      console.log("[AUTH] Login success, status:", response.status);
      const { accessToken, refreshToken, user } = response.data;

      const profile: Profile = user;
      const session = { accessToken, refreshToken };

      set({
        session,
        user: profile,
        profile,
        role: profile.role,
        isLoading: false,
        error: null,
      });

      await saveToStorage({ session, user: profile });
      await tokenManager.setTokens(accessToken, refreshToken);
    } catch (error: any) {
      console.log("[AUTH] Login error:", error?.response?.status, error?.response?.data, error?.message);
      const message = error?.response?.data?.message || error?.message || "Login failed";
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  // OLD: fetchProfile used supabase.from("profiles").select("*")
  // NEW: uses GET /users/:id
  fetchProfile: async (userId: number, silent = false) => {
    try {
      if (!silent) set({ isLoading: true, error: null });
      const response = await apiClient.get(`/users/${userId}`);
      const data = response.data as Profile;

      if (data.is_active === false || data.is_blacklist === true) {
        await get().signOut();
        return;
      }

      set({
        profile: data,
        role: data.role,
        isLoading: false,
      });
    } catch (error: any) {
      set({ isLoading: false, error: error?.message || "Unknown error" });
    }
  },

  // OLD: signOut() called supabase.auth.signOut() + unsubscribeFromProfile()
  // NEW: calls backend POST /auth/logout + clears local tokens
  signOut: async () => {
    try {
      await apiClient.post("/auth/logout").catch(() => null);
    } finally {
      set({ session: null, user: null, profile: null, role: null, isLoading: false });
      await removeFromStorage();
      await tokenManager.clearTokens();
    }
  },

  // Stub — old Supabase realtime subscription, no longer needed
  unsubscribeFromProfile: () => {},

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
}));

// ================================================================
// OLD: Supabase Auth — onAuthStateChange listener (kept for ref)
// ================================================================
// supabase.auth.onAuthStateChange(async (event, session) => {
//   const { isVerifying, isInitialized, setSession } = useAuthStore.getState();
//   if (isVerifying) return;
//   if (event === "INITIAL_SESSION") return;
//   if (event === "TOKEN_REFRESHED" && session) {
//     useAuthStore.setState({ session, user: session.user });
//     return;
//   }
//   if (!isInitialized) return;
//   setSession(session);
// });
//
// AppState.addEventListener("change", async (nextState: AppStateStatus) => {
//   if (nextState !== "active") return;
//   try {
//     const store = useAuthStore.getState();
//     if (!store.isInitialized) return;
//     const { data, error: sessionError } = await supabase.auth.getSession();
//     if (sessionError) { await store.signOut(); return; }
//     if (data.session && !store.session) { await store.setSession(data.session); return; }
//     if (!data.session && store.session) {
//       const refreshToken = store.session?.refresh_token;
//       if (!refreshToken) { await store.signOut(); return; }
//       const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
//       if (refreshError) { await store.signOut(); return; }
//       if (refreshed.session) { await store.setSession(refreshed.session); }
//       else { await store.setSession(null); }
//     }
//   } catch (error) {
//     await useAuthStore.getState().signOut();
//   }
// });

// ================================================================
// OLD: Full Supabase Auth Store implementation (kept for reference)
// ================================================================
// import { supabase } from "@/lib/supabase";
// import { RealtimeChannel, Session, User } from "@supabase/supabase-js";
// import { decode } from "base-64";
// import { AppState, AppStateStatus } from "react-native";
// import { create } from "zustand";
//
// export interface Profile {
//   id: string;
//   full_name: string | null;
//   phone: string | null;
//   role: "renter" | "car_owner" | "admin" | null;
//   avatar_url: string | null;
//   nrc: string | null;
//   nrc_url: string | null;
//   gender: string | null;
//   postal_code: string | null;
//   location: string | null;
//   is_active: boolean;
//   is_blacklist: boolean;
//   created_at: string;
// }
//
// interface AuthState {
//   session: Session | null;
//   user: User | null;
//   profile: Profile | null;
//   setProfile: (profile: Profile | null) => void;
//   role: "renter" | "car_owner" | "admin" | null;
//   isLoading: boolean;
//   isInitialized: boolean;
//   isVerifying: boolean;
//   avatarUri: string | null;
//   avatarBase64: string | null;
//   profileSubscription: RealtimeChannel | null;
//   error: string | null;
//   initialize: () => Promise<void>;
//   setSession: (session: Session | null) => Promise<void>;
//   fetchProfile: (userId: string, silent?: boolean) => Promise<void>;
//   signOut: () => Promise<void>;
//   setIsVerifying: (val: boolean) => void;
//   isProfileComplete: () => boolean;
//   setAvatarUri: (uri: string | null, base64?: string | null) => void;
//   uploadAvatar: (uri: string, userId: string, base64?: string | null) => Promise<string | null>;
//   subscribeToProfile: (userId: string) => void;
//   unsubscribeFromProfile: () => void;
// }
//
// export const useAuthStore = create<AuthState>((set, get) => {
//   const syncMetadataToProfile = async (userId: string, profileData: any, metadata: any) => {
//     if (!metadata) return profileData;
//     const updates: any = {};
//     const fieldsToSync = ["avatar_url", "nrc", "gender", "postal_code", "location", "phone"];
//     fieldsToSync.forEach((field) => {
//       if (!profileData[field] && metadata[field]) {
//         updates[field] = metadata[field];
//         profileData[field] = metadata[field];
//       }
//     });
//     if (Object.keys(updates).length > 0) {
//       const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
//       if (error) throw error;
//     }
//     return profileData;
//   };
//
//   return {
//     session: null, user: null, profile: null, role: null,
//     isLoading: true, isInitialized: false, isVerifying: false,
//     avatarUri: null, avatarBase64: null, profileSubscription: null, error: null,
//
//     initialize: async () => {
//       if (get().isInitialized) return;
//       try {
//         set({ isLoading: true, error: null });
//         const { data: { session }, error: sessionError } = await supabase.auth.getSession();
//         if (sessionError) throw sessionError;
//         await get().setSession(session);
//       } catch (error: any) {
//         set({ isLoading: false, error: error?.message || "Unable to restore session" });
//       } finally { set({ isInitialized: true }); }
//     },
//
//     setIsVerifying: (isVerifying: boolean) => set({ isVerifying }),
//     setAvatarUri: (avatarUri: string | null, avatarBase64: string | null = null) => set({ avatarUri, avatarBase64 }),
//
//     setSession: async (session: Session | null) => {
//       try {
//         const currentSession = get().session;
//         if (currentSession?.access_token === session?.access_token && !!session && !!get().profile) {
//           set({ session, user: session.user, isLoading: false, error: null });
//           if (session.user.id) get().subscribeToProfile(session.user.id);
//           return;
//         }
//         if (!session) {
//           get().unsubscribeFromProfile();
//           set({ session: null, user: null, profile: null, role: null, isLoading: false });
//           return;
//         }
//         set({ session, user: session.user, isLoading: true });
//         await get().fetchProfile(session.user.id);
//         get().subscribeToProfile(session.user.id);
//       } catch { set({ isLoading: false }); }
//     },
//
//     setProfile: (profile) => set((state) => {
//       if (JSON.stringify(state.profile) === JSON.stringify(profile)) return state;
//       return { profile, role: profile?.role || null };
//     }),
//
//     fetchProfile: async (userId: string, silent = false) => {
//       try {
//         if (!silent) set({ isLoading: true, error: null });
//         const { data, error } = await Promise.race([
//           supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
//           new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000)),
//         ]);
//         if (error) throw error;
//         if (data) {
//           if (data.is_active === false || data.is_blacklist === true) { await get().signOut(); return; }
//           const metadata = get().session?.user?.user_metadata;
//           const syncedData = await syncMetadataToProfile(userId, data, metadata);
//           set({ profile: syncedData as Profile, role: syncedData.role as "renter" | "car_owner" | "admin", isLoading: false });
//         } else { set({ profile: null, role: null, isLoading: false }); }
//       } catch (error: any) { set({ isLoading: false, error: error.message || "Unknown error" }); }
//     },
//
//     signOut: async () => {
//       try { get().unsubscribeFromProfile(); await supabase.auth.signOut(); }
//       finally { set({ session: null, user: null, profile: null, role: null, isLoading: false }); }
//     },
//
//     uploadAvatar: async (uri: string, userId: string, base64?: string | null) => {
//       try {
//         const fileExt = uri.split(".").pop()?.split("?")[0] || "jpg";
//         const fileName = `${userId}.${fileExt}`;
//         let body: any;
//         const finalBase64 = base64 || get().avatarBase64;
//         if (finalBase64) {
//           const binary = decode(finalBase64);
//           const bytes = new Uint8Array(binary.length);
//           for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
//           body = bytes;
//         } else { const response = await fetch(uri); body = await response.blob(); }
//         const { error: uploadError } = await supabase.storage.from("profiles").upload(fileName, body, {
//           contentType: `image/${fileExt === "jpg" ? "jpeg" : fileExt}`, upsert: true,
//         });
//         if (uploadError) throw uploadError;
//         const { data: { publicUrl } } = supabase.storage.from("profiles").getPublicUrl(fileName);
//         return publicUrl;
//       } catch { return null; }
//     },
//
//     isProfileComplete: () => {
//       const { profile } = get();
//       if (!profile) return false;
//       return !!(profile.full_name?.trim() && profile.nrc?.trim() && profile.gender && profile.postal_code?.trim());
//     },
//
//     subscribeToProfile: (userId: string) => {
//       if (get().profileSubscription) return;
//       const channel = supabase.channel(`profile-updates-${userId}`)
//         .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
//           (payload) => {
//             const newProfile = payload.new as Profile;
//             if (newProfile.is_active === false || newProfile.is_blacklist === true) { get().signOut(); }
//             else { set({ profile: newProfile, role: newProfile.role as "renter" | "car_owner" | "admin" }); }
//           })
//         .subscribe();
//       set({ profileSubscription: channel });
//     },
//
//     unsubscribeFromProfile: () => {
//       const { profileSubscription } = get();
//       if (profileSubscription) { supabase.removeChannel(profileSubscription); set({ profileSubscription: null }); }
//     },
//   };
// });
