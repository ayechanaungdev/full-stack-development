import { useEffect, useMemo, useState } from "react";

const API_BASE = ""; // Vite proxy forwards /auth and /users to backend

export type User = {
  id: number;
  email: string;
  role: string;
  name?: string | null;
};

type LoginState = "idle" | "loading" | "success" | "error";

type Page = "login" | "dashboard";

function App() {
  const [page, setPage] = useState<Page>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<LoginState>("idle");
  const [error, setError] = useState("");
  const [accessExpiresAt, setAccessExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const isAuthenticated = useMemo(() => !!user, [user]);

  const getAccessTokenExpiry = (token: string) => {
    try {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      return payload.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as {
        user: User;
        accessToken: string;
        refreshToken: string;
        accessExpiresAt?: number;
      };

      const expiresAt =
        parsed.accessExpiresAt ?? getAccessTokenExpiry(parsed.accessToken);
      setUser(parsed.user);
      setAccessExpiresAt(expiresAt ?? null);
      setPage("dashboard");
    } catch {
      localStorage.removeItem("auth");
    }
  }, []);

  useEffect(() => {
    if (!accessExpiresAt) {
      setRemainingSeconds(null);
      return;
    }

    const tick = () => {
      const seconds = Math.max(
        0,
        Math.ceil((accessExpiresAt - Date.now()) / 1000),
      );
      setRemainingSeconds(seconds);
      if (seconds <= 0) {
        logout();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [accessExpiresAt]);

  const saveSession = (
    user: User,
    accessToken: string,
    refreshToken: string,
  ) => {
    const expiresAt = getAccessTokenExpiry(accessToken);
    const authState = {
      user,
      accessToken,
      refreshToken,
      accessExpiresAt: expiresAt,
    };

    localStorage.setItem("auth", JSON.stringify(authState));
    setAccessExpiresAt(expiresAt ?? null);
  };

  const login = async () => {
    setStatus("loading");
    setError("");

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || "Login failed");
      }

      const data = await response.json();
      if (!data.accessToken || !data.refreshToken || !data.user) {
        throw new Error("Invalid response from server");
      }

      setUser(data.user);
      saveSession(data.user, data.accessToken, data.refreshToken);
      setPage("dashboard");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const logout = async () => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const parsed = JSON.parse(stored) as { accessToken: string };
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${parsed.accessToken}`,
        },
      }).catch(() => null);
    }
    setUser(null);
    setPage("login");
    setAccessExpiresAt(null);
    setRemainingSeconds(null);
    localStorage.removeItem("auth");
  };

  const refreshToken = async () => {
    const stored = localStorage.getItem("auth");
    if (!stored) return false;

    const parsed = JSON.parse(stored) as {
      refreshToken: string;
      accessToken: string;
      user: User;
    };

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${parsed.refreshToken}`,
        },
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (!data.accessToken || !data.refreshToken) return false;

      saveSession(parsed.user, data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    }
  };

  const requestProtected = async () => {
    const stored = localStorage.getItem("auth");
    if (!stored) return;

    const parsed = JSON.parse(stored) as { accessToken: string };
    const response = await fetch(`${API_BASE}/users`, {
      headers: {
        Authorization: `Bearer ${parsed.accessToken}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      const refreshed = await refreshToken();
      if (!refreshed) {
        logout();
        return;
      }
      return requestProtected();
    }

    if (!response.ok) {
      setError("Protected request failed");
      return;
    }

    const protectedData = await response.json();
    console.log("Protected data:", protectedData);
    alert("Protected request succeeded. Check console for user list.");
  };

  if (page === "dashboard" && isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white/95 p-10 shadow-2xl shadow-slate-200/60">
          <div className="space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-600">
                Welcome back
              </p>
              <h1 className="mt-3 text-3xl font-semibold">
                {user.name || user.email}
              </h1>
              <p className="mt-2 text-slate-600">Role: {user.role}</p>
            </div>

            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">
                Backend session is active.
              </p>
              <p className="mt-2 text-3xl font-semibold text-cyan-600">
                Token-based auth
              </p>
              <p className="mt-3 text-sm text-slate-500">
                {remainingSeconds !== null
                  ? `Expires in ${remainingSeconds}s`
                  : "Expiration info unavailable"}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                onClick={requestProtected}
              >
                Check protected /users
              </button>
              <button
                className="rounded-2xl border border-slate-700 bg-slate-950/90 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-50 text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/95 p-10 shadow-2xl shadow-slate-200/50">
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-600">
              Sign in
            </p>
            <h1 className="mt-3 text-3xl font-semibold">
              Login to your account
            </h1>
            <p className="mt-2 text-slate-600">
              Use backend auth; access and refresh tokens are handled by the
              server.
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-500"
                placeholder="Your password"
              />
            </label>
          </div>

          {error && (
            <p className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            className="w-full rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={login}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default App;
