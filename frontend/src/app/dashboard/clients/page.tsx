"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Mail, Phone, Building2, Globe, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { clientsApi } from "@/lib/api";
import { formatDate, formatCurrency, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ClientForm } from "./ClientForm";

interface Client {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  discord_id?: string;
  avatar_url?: string;
  notes?: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  leads_count?: number;
  total_revenue?: number;
  total_expenses?: number;
  last_contact?: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await clientsApi.list({ page, page_size: 20, search: search || undefined });
      setClients(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (error) {
      toast.error("Nepodařilo se načíst klienty");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [page, search]);

  const handleDelete = async (id: number) => {
    if (!confirm("Opravdu chcete smazat tohoto klienta?")) return;
    setDeletingId(id);
    try {
      await clientsApi.delete(id);
      toast.success("Klient smazán");
      fetchClients();
    } catch (error) {
      toast.error("Nepodařilo se smazat klienta");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await clientsApi.create(data);
      toast.success("Klient vytvořen");
      setShowForm(false);
      fetchClients();
    } catch (error) {
      toast.error("Nepodařilo se vytvořit klienta");
    }
  };

  const handleUpdate = async (id: number, data: any) => {
    try {
      await clientsApi.update(id, data);
      toast.success("Klient aktualizován");
      setEditingClient(null);
      fetchClients();
    } catch (error) {
      toast.error("Nepodařilo se aktualizovat klienta");
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
          <h1 className="text-3xl font-bold">Klienti</h1>
          <p className="text-muted-foreground mt-1">Správa klientů, kontaktů a cenových seznamů</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setEditingClient(null); setShowForm(true); }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Nový klient
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
            placeholder="Hledat klienty (jméno, email, firma)..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
        </div>
        <button className="btn-outline flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filtry
        </button>
      </motion.div>

      {/* Clients Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {loading ? Array(8).fill(0).map((_, i) => (
          <motion.div key={i} className="card animate-pulse" />
        )) : clients.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full card flex flex-col items-center justify-center py-16 text-center"
          >
            <Users className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Žádní klienti</h3>
            <p className="text-muted-foreground mb-6">Začněte přidáním prvního klienta</p>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Přidat klienta
            </button>
          </motion.div>
        ) : (
          clients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="card group relative"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {client.avatar_url ? (
                    <img src={client.avatar_url} alt={client.name} className="w-12 h-12 rounded-xl" />
                  ) : (
                    getInitials(client.name)
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingClient(client)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                    title="Upravit"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    disabled={deletingId === client.id}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    title="Smazat"
                  >
                    {deletingId === client.id ? (
                      <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-lg truncate">{client.name}</h3>
                {client.company && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">{client.company}</span>
                  </div>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.email}</span>
                  </a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{client.phone}</span>
                  </a>
                )}
                {client.website && (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors">
                    <Globe className="w-4 h-4" />
                    <span className="truncate">{client.website.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
                {client.discord_id && (
                  <button className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    <span>Discord propojen</span>
                  </button>
                )}

                {/* Tags */}
                {client.tags && client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {client.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                    {client.tags.length > 4 && (
                      <span className="px-2 py-0.5 text-xs bg-muted rounded-full text-muted-foreground">
                        +{client.tags.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="pt-3 border-t border-border/30 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold text-cyan-400">{client.leads_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Leady</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(client.total_revenue || 0)}</p>
                    <p className="text-xs text-muted-foreground">Příjmy</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(client.total_expenses || 0)}</p>
                    <p className="text-xs text-muted-foreground">Výdaje</p>
                  </div>
                </div>

                {client.last_contact && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>Poslední kontakt:</span>
                    <span className="font-medium">{formatDate(client.last_contact)}</span>
                  </div>
                )}
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
            Stránka {page} z {totalPages} ({total} klientů)
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
      <AnimatePresence>
        {(showForm || editingClient) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowForm(false); setEditingClient(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-strong rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <ClientForm
                client={editingClient}
                onClose={() => { setShowForm(false); setEditingClient(null); }}
                onSubmit={editingClient ? handleUpdate.bind(null, editingClient.id) : handleCreate}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";