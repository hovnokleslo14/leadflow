"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  DollarSign,
  PiggyBank,
  Bell,
  MessageSquare,
  Search,
  Bot,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  Building2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Klienti", href: "/dashboard/clients", icon: Users },
  { name: "Leady", href: "/dashboard/leads", icon: Target },
  { name: "Drafty", href: "/dashboard/drafts", icon: FileText },
  { name: "Finance", href: "/dashboard/finance", icon: DollarSign },
  { name: "Prasátko", href: "/dashboard/piggy-bank", icon: PiggyBank },
  { name: "Notifikace", href: "/dashboard/notifications", icon: Bell },
  { name: "Discord", href: "/dashboard/discord", icon: MessageSquare },
  { name: "Scraping", href: "/dashboard/scrapers", icon: Search },
  { name: "AI Nástroje", href: "/dashboard/ai", icon: Bot },
];

interface DashboardLayoutProps {
  user: {
    id: number;
    name: string;
    email: string;
    avatar_url?: string;
    is_admin: boolean;
  };
}

export function DashboardLayout({ user }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "fixed lg:relative z-50 h-screen w-72 glass border-r border-border/30 flex flex-col transition-all duration-300",
          !sidebarOpen && "lg:w-20"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border/30">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <AnimatePresence mode="wait">
              {sidebarOpen && (
                <motion.span
                  key="logo-text"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="font-bold text-lg gradient-text"
                >
                  LeadFlow
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <AnimatePresence mode="wait" key={item.name}>
                {sidebarOpen || !item.name ? (
                  <motion.button
                    as={Link}
                    href={item.href}
                    whileHover={{ x: sidebarOpen ? 4 : 0 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/20 text-primary shadow-lg shadow-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.name}</span>
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />}
                  </motion.button>
                ) : null}
              </AnimatePresence>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border/30">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-3 px-3 py-2"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-xl" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex justify-center"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-10 h-10 rounded-xl" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {sidebarOpen && (
            <motion.button
              onClick={logout}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Odhlásit se
            </motion.button>
          )}
        </div>
      </motion.aside>

      {/* Main content */}
      <div className={cn("lg:pl-72 transition-all duration-300", !sidebarOpen && "lg:pl-20")}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass border-b border-border/30 backdrop-blur-xl">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 flex items-center justify-between">
              <h1 className="text-xl font-semibold hidden sm:block">
                {navigation.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"))?.name || "Dashboard"}
              </h1>

              <div className="flex items-center gap-4">
                {/* Notifications badge */}
                <div className="relative">
                  <button className="p-2 rounded-xl hover:bg-accent transition-colors relative">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-xs font-medium rounded-full flex items-center justify-center">3</span>
                  </button>
                </div>

                {/* User menu */}
                <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-accent transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-xl" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <div className="animate-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}