"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  PiggyBank,
  MessageSquare,
  Bot,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ChartWidget } from "@/components/dashboard/ChartWidget";
import { api } from "@/lib/api";

interface DashboardStats {
  total_clients: number;
  active_leads: number;
  won_leads: number;
  lost_leads: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  pending_invoices: number;
  overdue_invoices: number;
  upcoming_notifications: number;
  piggy_bank_total: number;
  piggy_bank_target: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.get<DashboardStats>("/dashboard/stats");
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="animate-pulse" />
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-pulse h-96" />
          <Card className="animate-pulse h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Přehled vašich leadů, financí a aktivit</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Online
          </span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          title="Klienti"
          value={stats?.total_clients || 0}
          icon={Users}
          iconColor="text-cyan-400"
          trend="+2 tento týden"
          trendUp
        />
        <StatCard
          title="Aktivní leady"
          value={stats?.active_leads || 0}
          icon={Target}
          iconColor="text-purple-400"
          trend={`${stats?.won_leads || 0} vyhráno, ${stats?.lost_leads || 0} ztraceno`}
        />
        <StatCard
          title="Čistý zisk"
          value={formatCurrency(stats?.net_profit || 0)}
          icon={TrendingUp}
          iconColor="text-green-400"
          trend={stats?.net_profit && stats.net_profit > 0 ? "↑ nad očekávání" : "↓ pod očekávání"}
          trendUp={stats?.net_profit && stats.net_profit > 0}
        />
        <StatCard
          title="Prasátko"
          value={`${((stats?.piggy_bank_total || 0) / (stats?.piggy_bank_target || 1) * 100).toFixed(0)}%`}
          icon={PiggyBank}
          iconColor="text-yellow-400"
          trend={`${formatCurrency(stats?.piggy_bank_total || 0)} / ${formatCurrency(stats?.piggy_bank_target || 0)}`}
        />
      </motion.div>

      {/* Secondary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          title="Příjmy"
          value={formatCurrency(stats?.total_revenue || 0)}
          icon={DollarSign}
          iconColor="text-green-400"
          trend="Celkem"
        />
        <StatCard
          title="Výdaje"
          value={formatCurrency(stats?.total_expenses || 0)}
          icon={DollarSign}
          iconColor="text-red-400"
          trend="Celkem"
        />
        <StatCard
          title="Čekající faktury"
          value={stats?.pending_invoices || 0}
          icon={Clock}
          iconColor="text-yellow-400"
          trend={`${stats?.overdue_invoices || 0} po splatnosti`}
          trendUp={false}
        />
        <StatCard
          title="Notifikace"
          value={stats?.upcoming_notifications || 0}
          icon={AlertTriangle}
          iconColor="text-orange-400"
          trend="Nepřečtené"
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts & Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 space-y-6"
        >
          <ChartWidget title="Přehled příjmů a výdajů" />
          <RecentActivity />
        </motion.div>

        {/* Right Column - Quick Actions & Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          <QuickActions />
          
          {/* Alerts */}
          {(stats && (stats.overdue_invoices > 0 || stats.upcoming_notifications > 0)) && (
            <Card className="border-destructive/30">
              <div className="p-4">
                <h3 className="font-semibold flex items-center gap-2 text-destructive mb-4">
                  <AlertTriangle className="w-5 h-5" />
                  Pozornost
                </h3>
                <div className="space-y-3">
                  {stats.overdue_invoices > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                      <div>
                        <p className="font-medium">Po splatnosti faktur</p>
                        <p className="text-sm text-muted-foreground">{stats.overdue_invoices} faktur čeká na platbu</p>
                      </div>
                    </div>
                  )}
                  {stats.upcoming_notifications > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-xl">
                      <Bell className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Nepřečtené notifikace</p>
                        <p className="text-sm text-muted-foreground">{stats.upcoming_notifications} nových upozornění</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}