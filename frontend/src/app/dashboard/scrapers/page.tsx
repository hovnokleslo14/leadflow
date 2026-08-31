"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Play, Loader2, RefreshCw, Database, Trash2, Filter, Target, Bot, Globe, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { scrapersApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScraperLog } from "@/types";

const scraperIcons: Record<string, React.ReactNode> = {
  reddit_admincraft: <Bot className="w-5 h-5" />,
  minecraft_servers_list: <Globe className="w-5 h-5" />,
  planet_minecraft: <Target className="w-5 h-5" />,
};

const scraperLabels: Record<string, string> = {
  reddit_admincraft: "Reddit r/admincraft",
  minecraft_servers_list: "Minecraft Server List",
  planet_minecraft: "Planet Minecraft",
};

export default function ScrapersPage() {
  const [scrapers, setScrapers] = useState<any[]>([]);
  const [logs, setLogs] = useState<ScraperLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [runningScrapers, setRunningScrapers] = useState<Set<string>>(new Set());
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSubreddit, setSearchSubreddit] = useState("admincraft");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const fetchScrapers = async () => {
    try {
      const data = await scrapersApi.list();
      setScrapers(data);
    } catch (error) {
      toast.error("Nepodařilo se načíst scrapéry");
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await scrapersApi.logs({ 
        page: logPage, 
        page_size: 20, 
        scraper_name: logFilter !== "all" ? logFilter : undefined 
      });
      setLogs(data.items);
      setLogTotalPages(data.total_pages);
    } catch (error) {
      toast.error("Nepodařilo se načíst logy");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchScrapers();
    fetchLogs();
  }, [logPage, logFilter]);

  const handleRunScraper = async (name: string) => {
    setRunningScrapers(prev => new Set(prev).add(name));
    try {
      await scrapersApi.run(name);
      toast.success(`Scraper ${scraperLabels[name] || name} spuštěn`);
      // Refresh after a delay
      setTimeout(() => {
        fetchLogs();
        setRunningScrapers(prev => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      }, 5000);
    } catch (error) {
      toast.error("Nepodařilo se spustit scraper");
      setRunningScrapers(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  const handleSearchReddit = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);
    try {
      const data = await scrapersApi.searchReddit(searchQuery, searchSubreddit, 25);
      setSearchResults(data.leads);
      toast.success(`Nalezeno ${data.found} leadů`);
    } catch (error) {
      toast.error("Nepodařilo se vyhledat");
    } finally {
      setSearchLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "text-green-400";
      case "error": return "text-red-400";
      default: return "text-gray-400";
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
            <Search className="w-8 h-8 text-cyan-400" />
            Scraping & Lead Generation
          </h1>
          <p className="text-muted-foreground mt-1">Automatické hledání leadů na Redditu, Minecraft serverech a dalších zdrojích</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { fetchScrapers(); fetchLogs(); }}
          disabled={loading}
          className="btn-outline"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Obnovit
        </motion.button>
      </motion.div>

      {/* Available Scrapers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {scrapers.map((scraper, index) => (
          <motion.div
            key={scraper.name}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                {scraperIcons[scraper.name] || <Database className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-semibold">{scraperLabels[scraper.name] || scraper.name}</h3>
                <p className="text-sm text-muted-foreground">{scraper.description}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRunScraper(scraper.name)}
              disabled={runningScrapers.has(scraper.name)}
              className={cn("btn-primary w-full", runningScrapers.has(scraper.name) && "opacity-50")}
            >
              {runningScrapers.has(scraper.name) ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Běží...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Spustit nyní
                </>
              )}
            </motion.button>
          </motion.div>
        ))}
      </motion.div>

      {/* Reddit Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="p-4 border-b border-border/30">
          <h3 className="font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Ruční vyhledávání na Redditu
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Vyhledávací dotaz"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="developer, plugin, web, hiring..."
            />
            <Input
              label="Subreddit"
              value={searchSubreddit}
              onChange={(e) => setSearchSubreddit(e.target.value)}
              placeholder="admincraft"
            />
            <div className="flex items-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSearchReddit}
                disabled={searchLoading || !searchQuery.trim()}
                className="btn-primary w-full"
              >
                {searchLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Hledám...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Vyhledat
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="pt-4 border-t border-border/30">
              <h4 className="font-medium mb-3">Výsledky ({searchResults.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {searchResults.map((lead, index) => (
                  <motion.div
                    key={lead.id || index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Bot className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-muted-foreground">r/{searchSubreddit}</span>
                    </div>
                    <h4 className="font-medium text-sm mb-1 line-clamp-1">{lead.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{lead.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="px-2 py-0.5 bg-muted rounded-full">u/{lead.contact_username}</span>
                      <span className="text-muted-foreground">{formatDateTime(lead.created_at)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Logs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="p-4 border-b border-border/30 flex flex-col sm:flex-row gap-4 justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Database className="w-5 h-5" />
            Historie běhů scraperů
          </h3>
          <select
            value={logFilter}
            onChange={(e) => { setLogFilter(e.target.value); setLogPage(1); }}
            className="input w-auto"
          >
            <option value="all">Všechny scrapéry</option>
            {Object.entries(scraperLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-muted-foreground border-b border-border/30">
                <th className="p-3">Scraper</th>
                <th className="p-3">Stav</th>
                <th className="p-3">Nalezeno</th>
                <th className="p-3">Nových</th>
                <th className="p-3">Doba trvání</th>
                <th className="p-3">Čas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {logsLoading ? Array(5).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="p-3"><div className="h-4 bg-muted rounded w-24" /></td>
                  <td className="p-3"><div className="h-4 bg-muted rounded w-20" /></td>
                  <td className="p-3"><div className="h-4 bg-muted rounded w-16" /></td>
                  <td className="p-3"><div className="h-4 bg-muted rounded w-16" /></td>
                  <td className="p-3"><div className="h-4 bg-muted rounded w-20" /></td>
                  <td className="p-3"><div className="h-4 bg-muted rounded w-32" /></td>
                </tr>
              )) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Žádné logy
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <td className="p-3 font-medium">{scraperLabels[log.scraper_name] || log.scraper_name}</td>
                    <td className="p-3">
                      <span className={cn("px-2 py-0.5 text-xs rounded-full",
                        log.status === "success" ? "bg-green-500/20 text-green-400" :
                        log.status === "error" ? "bg-red-500/20 text-red-400" :
                        "bg-gray-500/20 text-gray-400"
                      )}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3">{log.leads_found}</td>
                    <td className="p-3 font-bold text-green-400">{log.leads_new}</td>
                    <td className="p-3 text-muted-foreground">{log.duration_ms}ms</td>
                    <td className="p-3 text-muted-foreground">{formatDateTime(log.created_at)}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logTotalPages > 1 && (
          <div className="p-4 flex items-center justify-center gap-2 border-t border-border/30">
            <button
              onClick={() => setLogPage(p => Math.max(1, p - 1))}
              disabled={logPage === 1}
              className="btn-outline"
            >
              Předchozí
            </button>
            <span className="px-4 text-sm text-muted-foreground">
              Stránka {logPage} z {logTotalPages}
            </span>
            <button
              onClick={() => setLogPage(p => Math.min(logTotalPages, p + 1))}
              disabled={logPage === logTotalPages}
              className="btn-outline"
            >
              Další
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}