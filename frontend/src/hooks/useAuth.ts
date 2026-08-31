"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  discord_id?: string;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User, token: string) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: true,

      login: async (email: string, password: string) => {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: email, password }),
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.detail || "Přihlášení selhalo");
        }
        
        const data = await res.json();
        
        // Get user info
        const userRes = await fetch(`${API_URL}/api/clients/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        
        let user = null;
        if (userRes.ok) {
          user = await userRes.json();
        }
        
        set({ user, token: data.access_token, isLoading: false });
      },

      logout: () => {
        set({ user: null, token: null });
      },

      setUser: (user: User, token: string) => {
        set({ user, token, isLoading: false });
      },
    }),
    {
      name: "leadflow-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state) state.isLoading = false;
      },
    }
  )
);

// Initialize auth on app load
if (typeof window !== "undefined") {
  useAuth.getState();
}