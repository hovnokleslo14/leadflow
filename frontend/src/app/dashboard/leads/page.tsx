"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Mail, MessageSquare, ArrowRight, Bot } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { leadsApi } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LeadForm } from "./LeadForm";
import { LeadStatus, LeadSource } from "@/types";

interface Lead {
  id: number;
  client_id?: number;
  source: LeadSource;
  source_url?: string;
  title: string;
  description?: string;
  server_name?: string;
  server_ip?: string;
  server_players?: number;
  server_max_players?: number;
  server_version?: string;
  contact_username?: string;
  contact_platform?: string;
  status: LeadStatus;
  priority: number;
  estimated_value?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  contacted_at?: string;
  closed_at?: string;
  client?: { id: number; name: string };
  drafts_count?: number;
}

const statusColors: Record<LeadStatus, string> = {
  new: "bg-blue-500/20 text-blue-400",
  contacted: "bg-cyan-500/20 text-cyan-400",
  qualified: "bg-purple-500/20 text-purple-400",
  proposal_sent: "bg-orange-500/20 text-orange-400",
  negotiating: "bg-yellow-500/20 text-yellow-400",
  won: "bg-green-500/20 text-green-400",
  lost: "bg-red-500/20 text-red-400",
  archived: "bg-gray-500/20 text-gray-400",
};

const statusLabels: Record<LeadStatus, string> = {
  new: "Nový",
  contacted: "Kontaktován",
  qualified: "Kvalifikován",
  proposal_sent: "Nabídka odeslána",
  negotiating: "Vyjednávání",
  won: "Vyhráno",
  lost: "Ztraceno",
  archived: "Archivováno",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await leadsApi.list({ 
        page, 
        page_size: 20, 
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setLeads(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (error) {
      toast.error("Nepodařilo se načíst leady");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, search, statusFilter]);

  const handleDelete = async (id: number) => {
    if (!confirm("Opravdu chcete smazat tento lead?")) return;
    setDeletingId(id);
    try {
      await leadsApi.delete(id);
      toast.success("Lead smazán");
      fetchLeads();
    } catch (error) {
      toast.error("Nepodařilo se smazat lead");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await leadsApi.create(data);
      toast.success("Lead vytvořen");
      setShowForm(false);
      fetchLeads();
    } catch (error) {
      toast.error("Nepodařilo se vytvořit lead");
    }
  };

  const handleUpdate = async (id: number, data: any) => {
    try {
      await leadsApi.update(id, data);
      toast.success("Lead aktualizován");
      setEditingLead(null);
      fetchLeads();
    } catch (error) {
      toast.error("Nepodařilo se aktualizovat lead");
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
          <h1 className="text-3xl font-bold">Leady</h1>
          <p className="text-muted-foreground mt-1">Správa příležitostí a obchodních případů</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setEditingLead(null); setShowForm(true); }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Nový lead
        </motion.button>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Hledat leady (název, popis, server, kontakt)..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
          className="input w-auto"
        >
          <option value="all">Všechny stavy</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </motion.div>

      {/* Leads Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {loading ? Array(6).fill(0).map((_, i) => (
          <motion.div key={i} className="card animate-pulse" />
        )) : leads.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full card flex flex-col items-center justify-center py-16 text-center"
          >
            <Bot className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Žádné leady</h3>
            <p className="text-muted-foreground mb-6">Začněte přidáním prvního leadu nebo spusťte scrapéry</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Přidat lead
            </button>
          </motion.div>
        ) : (
          leads.map((lead, index) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="card group relative"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", statusColors[lead.status])}>
                    {statusLabels[lead.status]}
                  </span>
                  {lead.priority > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full">
                      ⭐ {lead.priority}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingLead(lead)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                    title="Upravit"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(lead.id)}
                    disabled={deletingId === lead.id}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    title="Smazat"
                  >
                    {deletingId === lead.id ? (
                      <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-lg truncate mb-2">{lead.title}</h3>
              
              {lead.server_name && (
                <div className="mb-2 p-2 bg-muted/50 rounded-lg">
                  <p className="font-medium text-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                    {lead.server_name}
                  </p>
                  {lead.server_ip && (
                    <p className="text-xs text-muted-foreground font-mono">{lead.server_ip}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    {lead.server_players !== undefined && (
                      <span>{lead.server_players}/{lead.server_max_players || "?"} hráčů</span>
                    )}
                    {lead.server_version && (
                      <span className="px-1.5 py-0.5 bg-muted rounded">{lead.server_version}</span>
                    )}
                  </div>
                </div>
              )}

              {lead.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{lead.description}</p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span className="px-2 py-0.5 bg-muted rounded capitalize">{lead.source.replace(/_/g, " ")}</span>
                {lead.contact_username && (
                  <>
                    <MessageSquare className="w-3 h-3" />
                    <span>@{lead.contact_username}</span>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/30">
                {lead.estimated_value && (
                  <span className="font-bold text-green-400">
                    ~{formatCurrency(lead.estimated_value)}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {lead.client && (
                    <span className="text-xs text-muted-foreground">Klient: {lead.client.name}</span>
                  )}
                  {lead.drafts_count && lead.drafts_count > 0 && (
                    <Link href={`/dashboard/drafts?lead_id=${lead.id}`} className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                      <Bot className="w-3 h-3" />
                      {lead.drafts_count} draft{y}
                    </Link>
                  )}
                </div>
              </div>
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
            Stránka {page} z {totalPages} ({total} leadů)
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

      {/* Create/Edit Modal */}
      {showForm || editingLead ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => { setShowForm(false); setEditingLead(null); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <LeadForm
              lead={editingLead}
              onClose={() => { setShowForm(false); setEditingLead(null); }}
              onSubmit={editingLead ? handleUpdate.bind(null, editingLead.id) : handleCreate}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  );
}