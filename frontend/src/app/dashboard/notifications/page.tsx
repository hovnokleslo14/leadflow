"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, Check, CheckCircle, X, Filter, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { notificationsApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Notification, NotificationType } from "@/types";

const typeIcons: Record<NotificationType, React.ReactNode> = {
  invoice_due: <span className="text-yellow-400">📄</span>,
  call_scheduled: <span className="text-blue-400">📞</span>,
  deadline: <span className="text-red-400">⏰</span>,
  payment_received: <span className="text-green-400">💰</span>,
  payment_overdue: <span className="text-red-400">❌</span>,
  recurring_payment: <span className="text-purple-400">🔄</span>,
  client_message: <span className="text-cyan-400">💬</span>,
  custom: <span className="text-gray-400">📝</span>,
};

const typeLabels: Record<NotificationType, string> = {
  invoice_due: "Splatnost faktury",
  call_scheduled: "Naplánovaný call",
  deadline: "Deadline",
  payment_received: "Platba přijata",
  payment_overdue: "Po splatnosti",
  recurring_payment: "Pravidelná platba",
  client_message: "Zpráva klienta",
  custom: "Vlastní",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const [data, unread] = await Promise.all([
        notificationsApi.list({ page, page_size: 20, is_read: filter === "unread" ? false : filter === "read" ? true : undefined }),
        notificationsApi.unreadCount(),
      ]);
      setNotifications(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
      setUnreadCount(unread.count);
    } catch (error) {
      toast.error("Nepodařilo se načíst notifikace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page, filter]);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      toast.error("Nepodařilo se označit jako přečtené");
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Vše označeno jako přečtené");
    } catch (error) {
      toast.error("Nepodařilo se označit vše");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="w-8 h-8 text-cyan-400" />
            Notifikace
          </h1>
          <p className="text-muted-foreground mt-1">Přehled upozornění, splatností a událostí</p>
        </div>
        {unreadCount > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="btn-primary"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Označit vše jako přečtené ({unreadCount})
          </motion.button>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Celkem</p>
              <p className="text-3xl font-bold">{total}</p>
            </div>
            <Bell className="w-10 h-10 text-cyan-400/30" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Nepřečtené</p>
              <p className="text-3xl font-bold text-yellow-400">{unreadCount}</p>
            </div>
            <Bell className="w-10 h-10 text-yellow-400/30" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Přečtené</p>
              <p className="text-3xl font-bold text-green-400">{total - unreadCount}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-400/30" />
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card flex flex-col sm:flex-row gap-4"
      >
        <div className="flex items-center gap-2">
          {["all", "unread", "read"].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f as any); setPage(1); }}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                filter === f
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {f === "all" && "Vše"}
              {f === "unread" && `Nepřečtené (${unreadCount})`}
              {f === "read" && "Přečtené"}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Notifications List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {loading ? Array(5).fill(0).map((_, i) => (
          <motion.div key={i} className="card animate-pulse" />
        )) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card flex flex-col items-center justify-center py-16 text-center"
          >
            <Bell className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Žádné notifikace</h3>
            <p className="text-muted-foreground">Zde se zobrazí upozornění o splatnostech, platech a událostech</p>
          </motion.div>
        ) : (
          notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              className={cn(
                "card flex items-start gap-4 p-4 transition-all",
                !notification.is_read && "bg-primary/5 border-primary/20"
              )}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: !notification.is_read ? "hsl(var(--primary)/0.2)" : "hsl(var(--muted))" }}>
                {typeIcons[notification.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className={cn("font-semibold", !notification.is_read ? "text-foreground" : "text-muted-foreground")}>
                      {notification.title}
                    </h3>
                    <span className={cn("ml-2 px-2 py-0.5 text-xs rounded-full",
                      notification.priority >= 5 ? "bg-red-500/20 text-red-400" :
                      notification.priority >= 3 ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-green-500/20 text-green-400"
                    )}>
                      {typeLabels[notification.type]}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatDateTime(notification.created_at)}
                  </span>
                </div>
                <p className={cn("text-sm mt-1", !notification.is_read ? "text-foreground" : "text-muted-foreground")}>
                  {notification.message}
                </p>
                {(notification.related_type || notification.scheduled_for) && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {notification.scheduled_for && (
                      <span>📅 {formatDateTime(notification.scheduled_for)}</span>
                    )}
                    {notification.related_type && (
                      <span>🔗 {notification.related_type} #{notification.related_id}</span>
                    )}
                  </div>
                )}
              </div>
              {!notification.is_read && (
                <motion.button
                  onClick={() => handleMarkRead(notification.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors flex-shrink-0"
                >
                  <Check className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2"
        >
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline"
          >
            Předchozí
          </button>
          <span className="px-4 text-sm text-muted-foreground">
            Stránka {page} z {totalPages} ({total} notifikací)
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-outline"
          >
            Další
          </button>
        </motion.div>
      )}
    </div>
  );
}