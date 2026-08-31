"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, Search, Filter, Edit, Trash2, Send, Eye, Bot, Copy, CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { draftsApi } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DraftForm } from "./DraftForm";
import { DraftStatus, Draft } from "@/types";

const statusColors: Record<DraftStatus, string> = {
  pending: "bg-gray-500/20 text-gray-400",
  generated: "bg-blue-500/20 text-blue-400",
  approved: "bg-green-500/20 text-green-400",
  sent: "bg-purple-500/20 text-purple-400",
  rejected: "bg-red-500/20 text-red-400",
};

const statusLabels: Record<DraftStatus, string> = {
  pending: "Čeká",
  generated: "Vygenerován",
  approved: "Schválen",
  sent: "Odeslán",
  rejected: "Zamítnut",
};

const statusIcons: Record<DraftStatus, React.ReactNode> = {
  pending: <span className="w-2 h-2 bg-gray-400 rounded-full" />,
  generated: <Bot className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  sent: <Send className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DraftStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingDraft, setViewingDraft] = useState<Draft | null>(null);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const data = await draftsApi.list({ 
        page, 
        page_size: 20, 
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setDrafts(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (error) {
      toast.error("Nepodařilo se načíst drafty");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [page, statusFilter]);

  const handleDelete = async (id: number) => {
    if (!confirm("Opravdu chcete smazat tento draft?")) return;
    setDeletingId(id);
    try {
      await draftsApi.delete(id);
      toast.success("Draft smazán");
      fetchDrafts();
    } catch (error) {
      toast.error("Nepodařilo se smazat draft");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await draftsApi.create(data);
      toast.success("Draft vytvořen");
      setShowForm(false);
      fetchDrafts();
    } catch (error) {
      toast.error("Nepodařilo se vytvořit draft");
    }
  };

  const handleUpdate = async (id: number, data: any) => {
    try {
      await draftsApi.update(id, data);
      toast.success("Draft aktualizován");
      setEditingDraft(null);
      fetchDrafts();
    } catch (error) {
      toast.error("Nepodařilo se aktualizovat draft");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Zkopírováno do schránky");
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
          <h1 className="text-3xl font-bold">AI Drafty</h1>
          <p className="text-muted-foreground mt-1">Správa AI generovaných nabídek a komunikace</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setEditingDraft(null); setShowForm(true); }}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4" />
            Ruční draft
          </motion.button>
        </div>
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
            placeholder="Hledat drafty (předmět, obsah, lead)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="input w-auto"
        >
          <option value="all">Všechny stavy</option>
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </motion.div>

      {/* Drafts Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        {loading ? Array(5).fill(0).map((_, i) => (
          <motion.div key={i} className="card animate-pulse" />
        )) : drafts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="card flex flex-col items-center justify-center py-16 text-center"
          >
            <Bot className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Žádné drafty</h3>
            <p className="text-muted-foreground mb-6">Vytvořte první draft ručně nebo nechte AI vygenerovat nabídku z leadu</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Vytvořit draft
            </button>
          </motion.div>
        ) : (
          drafts.map((draft, index) => (
            <motion.div
              key={draft.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="card group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {statusIcons[draft.status]}
                    <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", statusColors[draft.status])}>
                      {statusLabels[draft.status]}
                    </span>
                    {draft.ai_model && (
                      <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                        {draft.ai_model}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{draft.subject}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{draft.content}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                    {draft.lead && (
                      <span>Lead: {draft.lead.title}</span>
                    )}
                    <span>{formatDateTime(draft.created_at)}</span>
                    {draft.approved_at && (
                      <span className="text-green-400">Schváleno: {formatDate(draft.approved_at)}</span>
                    )}
                    {draft.sent_at && (
                      <span className="text-purple-400">Odesláno: {formatDate(draft.sent_at)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                  <button
                    onClick={() => setViewingDraft(draft)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                    title="Zobrazit"
                  >
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(draft.content)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                    title="Kopírovat"
                  >
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {draft.status !== "sent" && draft.status !== "rejected" && (
                    <button
                      onClick={() => setEditingDraft(draft)}
                      className="p-2 rounded-lg hover:bg-accent transition-colors"
                      title="Upravit"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(draft.id)}
                    disabled={deletingId === draft.id}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    title="Smazat"
                  >
                    {deletingId === draft.id ? (
                      <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
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
            Stránka {page} z {totalPages} ({total} draftů)
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
      {showForm || editingDraft ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => { setShowForm(false); setEditingDraft(null); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <DraftForm
              draft={editingDraft}
              onClose={() => { setShowForm(false); setEditingDraft(null); }}
              onSubmit={editingDraft ? handleUpdate.bind(null, editingDraft.id) : handleCreate}
            />
          </motion.div>
        </motion.div>
      ) : null}

      {/* View Modal */}
      {viewingDraft ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setViewingDraft(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{viewingDraft.subject}</h2>
                <button onClick={() => setViewingDraft(null)} className="p-2 rounded-lg hover:bg-accent">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {statusIcons[viewingDraft.status]}
                  <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", statusColors[viewingDraft.status])}>
                    {statusLabels[viewingDraft.status]}
                  </span>
                  {viewingDraft.ai_model && (
                    <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">
                      AI: {viewingDraft.ai_model}
                    </span>
                  )}
                </div>
                <div className="p-4 bg-muted/50 rounded-lg whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto">
                  {viewingDraft.content}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => copyToClipboard(viewingDraft.content)} variant="outline">
                    <Copy className="w-4 h-4 mr-2" />
                    Kopírovat
                  </Button>
                  <Button onClick={() => setEditingDraft(viewingDraft)} variant="secondary">
                    <Edit className="w-4 h-4 mr-2" />
                    Upravit
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  );
}

import { X } from "lucide-react";