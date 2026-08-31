"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Send, Bot, Users, Search, Loader2, Check, X, RefreshCw, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { discordApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DiscordMessage } from "@/types";

export default function DiscordPage() {
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [oauthUrl, setOauthUrl] = useState("");

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = await discordApi.messages({ page, page_size: 20 });
      setMessages(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (error) {
      toast.error("Nepodařilo se načíst zprávy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchOauthUrl();
  }, [page]);

  const fetchOauthUrl = async () => {
    try {
      const data = await discordApi.oauthUrl();
      setOauthUrl(data.url);
    } catch (error) {
      console.error("Failed to fetch OAuth URL");
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastContent.trim()) return;
    setBroadcastLoading(true);
    try {
      // Get all unique user IDs from messages
      const userIds = [...new Set(messages.map(m => m.discord_user_id))];
      await discordApi.broadcast(userIds, broadcastContent);
      toast.success(`Hromadná zpráva odeslána ${userIds.length} uživatelům`);
      setShowBroadcast(false);
      setBroadcastContent("");
    } catch (error) {
      toast.error("Nepodařilo se odeslat hromadnou zprávu");
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleSendDM = async (userId: string, content: string) => {
    if (!content.trim()) return;
    try {
      await discordApi.sendDM(userId, content);
      toast.success("Zpráva odeslána");
    } catch (error) {
      toast.error("Nepodařilo se odeslat zprávu");
    }
  };

  const handleMarkRead = async (messageId: number) => {
    try {
      await discordApi.messages({ page: 1, page_size: 1 }); // This would need a proper mark read endpoint
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_read: true } : m));
    } catch (error) {
      toast.error("Nepodařilo se označit jako přečtené");
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
            <MessageSquare className="w-8 h-8 text-purple-400" />
            Discord Bot
          </h1>
          <p className="text-muted-foreground mt-1">Správa komunikace s klienty přes Discord</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowBroadcast(true)}
            className="btn-primary"
          >
            <Send className="w-4 h-4 mr-2" />
            Hromadná zpráva
          </motion.button>
          <a href={oauthUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <ExternalLink className="w-4 h-4 mr-2" />
            Propojit Discord
          </a>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Celkem zpráv</p>
              <p className="text-3xl font-bold">{total}</p>
            </div>
            <MessageSquare className="w-10 h-10 text-purple-400/30" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Nepřečtené</p>
              <p className="text-3xl font-bold text-yellow-400">
                {messages.filter(m => !m.is_read).length}
              </p>
            </div>
            <MessageSquare className="w-10 h-10 text-yellow-400/30" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unikátní uživatelé</p>
              <p className="text-3xl font-bold text-cyan-400">
                {[...new Set(messages.map(m => m.discord_user_id))].length}
              </p>
            </div>
            <Users className="w-10 h-10 text-cyan-400/30" />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Od bota</p>
              <p className="text-3xl font-bold text-purple-400">
                {messages.filter(m => m.is_from_bot).length}
              </p>
            </div>
            <Bot className="w-10 h-10 text-purple-400/30" />
          </div>
        </Card>
      </motion.div>

      {/* Messages List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="p-4 border-b border-border/30 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Hledat zprávy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="btn-outline flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Obnovit
          </button>
        </div>

        <div className="divide-y divide-border/30">
          {loading ? Array(5).fill(0).map((_, i) => (
            <motion.div key={i} className="p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </motion.div>
          )) : messages.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Žádné zprávy</h3>
              <p className="text-muted-foreground">Zprávy se zobrazí, když vám klienti napíší na Discord</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className={cn("p-4 hover:bg-accent/30 transition-colors", !message.is_read && "bg-yellow-500/5")}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    {message.discord_avatar ? (
                      <img src={message.discord_avatar} alt={message.discord_username} className="w-10 h-10 rounded-xl" />
                    ) : (
                      <span className="text-xl">👤</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{message.discord_username}</span>
                      {message.is_from_bot && (
                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">Bot</span>
                      )}
                      {!message.is_read && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">Nepřečtené</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{message.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>#{message.channel_id.slice(-8)}</span>
                      <span>{formatDateTime(message.created_at)}</span>
                      {message.client_id && <span>Klient: #{message.client_id}</span>}
                    </div>
                  </div>
                  {!message.is_read && (
                    <motion.button
                      onClick={() => handleMarkRead(message.id)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors flex-shrink-0"
                    >
                      <Check className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-outline"
            >
              Předchozí
            </button>
            <span className="px-4 text-sm text-muted-foreground">
              Stránka {page} z {totalPages} ({total} zpráv)
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-outline"
            >
              Další
            </button>
          </div>
        )}
      </motion.div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowBroadcast(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Hromadná zpráva
                </h2>
                <button onClick={() => setShowBroadcast(false)} className="p-2 rounded-lg hover:bg-accent">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                Zpráva bude odeslána všem uživatelům, kteří vám napsali ({[...new Set(messages.map(m => m.discord_user_id))].length} uživatelů)
              </p>
              <textarea
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                placeholder="Text zprávy..."
                rows={6}
                className="input min-h-[120px] resize-y"
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowBroadcast(false)}>
                  Zrušit
                </Button>
                <Button onClick={handleSendBroadcast} disabled={broadcastLoading || !broadcastContent.trim()}>
                  {broadcastLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Odesílám...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Odeslat všem
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}