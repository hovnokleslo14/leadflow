"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Filter, Edit, Trash2, DollarSign, ArrowDown, ArrowUp, FileText, Calendar, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { transactionsApi, recurringApi } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TransactionForm } from "./TransactionForm";
import { RecurringForm } from "./RecurringForm";
import { Transaction, TransactionType, TransactionCategory, RecurringPayment, RecurringFrequency } from "@/types";

const typeColors: Record<TransactionType, string> = {
  income: "text-green-400",
  expense: "text-red-400",
};

const typeLabels: Record<TransactionType, string> = {
  income: "Příjem",
  expense: "Výdaj",
};

const categoryLabels: Record<TransactionCategory, string> = {
  service: "Služby",
  hosting: "Hosting",
  development: "Vývoj",
  design: "Design",
  marketing: "Marketing",
  subscription: "Předplatné",
  salary: "Mzdy",
  tax: "Daně",
  other: "Ostatní",
};

const frequencyLabels: Record<RecurringFrequency, string> = {
  daily: "Denně",
  weekly: "Týdně",
  monthly: "Měsíčně",
  quarterly: "Čtvrtletně",
  yearly: "Ročně",
};

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurring, setRecurring] = useState<RecurringPayment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"transactions" | "recurring" | "summary">("transactions");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringPayment | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transData, recData, sumData] = await Promise.all([
        transactionsApi.list({ page, page_size: 20, type: typeFilter !== "all" ? typeFilter : undefined }),
        recurringApi.list({ page: 1, page_size: 50 }),
        transactionsApi.summary(),
      ]);
      setTransactions(transData.items);
      setTotal(transData.total);
      setTotalPages(transData.total_pages);
      setRecurring(recData.items);
      setSummary(sumData);
    } catch (error) {
      toast.error("Nepodařilo se načíst data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, typeFilter, activeTab]);

  const handleDeleteTransaction = async (id: number) => {
    if (!confirm("Opravdu chcete smazat tuto transakci?")) return;
    setDeletingId(id);
    try {
      await transactionsApi.delete(id);
      toast.success("Transakce smazána");
      fetchData();
    } catch (error) {
      toast.error("Nepodařilo se smazat transakci");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    if (!confirm("Opravdu chcete smazat tuto pravidelnou platbu?")) return;
    setDeletingId(id);
    try {
      await recurringApi.delete(id);
      toast.success("Pravidelná platba smazána");
      fetchData();
    } catch (error) {
      toast.error("Nepodařilo se smazat pravidelnou platbu");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateTransaction = async (data: any) => {
    try {
      await transactionsApi.create(data);
      toast.success("Transakce vytvořena");
      setShowForm(false);
      fetchData();
    } catch (error) {
      toast.error("Nepodařilo se vytvořit transakci");
    }
  };

  const handleUpdateTransaction = async (id: number, data: any) => {
    try {
      await transactionsApi.update(id, data);
      toast.success("Transakce aktualizována");
      setEditingTransaction(null);
      fetchData();
    } catch (error) {
      toast.error("Nepodařilo se aktualizovat transakci");
    }
  };

  const handleCreateRecurring = async (data: any) => {
    try {
      await recurringApi.create(data);
      toast.success("Pravidelná platba vytvořena");
      setShowRecurringForm(false);
      fetchData();
    } catch (error) {
      toast.error("Nepodařilo se vytvořit pravidelnou platbu");
    }
  };

  const handleUpdateRecurring = async (id: number, data: any) => {
    try {
      await recurringApi.update(id, data);
      toast.success("Pravidelná platba aktualizována");
      setEditingRecurring(null);
      fetchData();
    } catch (error) {
      toast.error("Nepodařilo se aktualizovat pravidelnou platbu");
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
          <h1 className="text-3xl font-bold">Finance</h1>
          <p className="text-muted-foreground mt-1">Přehled příjmů, výdajů a pravidelných plateb</p>
        </div>
        {activeTab === "transactions" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setEditingTransaction(null); setShowForm(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Přidat transakci
          </motion.button>
        )}
        {activeTab === "recurring" && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setEditingRecurring(null); setShowRecurringForm(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Pravidelná platba
          </motion.button>
        )}
      </motion.div>

      {/* Summary Cards */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkové příjmy</p>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(summary.total_income)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-green-400/30" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Celkové výdaje</p>
                <p className="text-3xl font-bold text-red-400">{formatCurrency(summary.total_expense)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-red-400/30" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Čistý zisk</p>
                <p className={cn("text-3xl font-bold", summary.net >= 0 ? "text-green-400" : "text-red-400")}>
                  {formatCurrency(summary.net)}
                </p>
              </div>
              <ArrowUp className="w-10 h-10 text-cyan-400/30" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pravidelných plateb</p>
                <p className="text-3xl font-bold text-purple-400">{recurring.filter(r => r.is_active).length}</p>
              </div>
              <RotateCcw className="w-10 h-10 text-purple-400/30" />
            </div>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <div className="border-b border-border/30">
          <nav className="flex gap-1 p-1" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("transactions")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === "transactions"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <DollarSign className="w-4 h-4 inline mr-1" />
              Transakce
            </button>
            <button
              onClick={() => setActiveTab("recurring")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === "recurring"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <RotateCcw className="w-4 h-4 inline mr-1" />
              Pravidelné
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === "summary"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <FileText className="w-4 h-4 inline mr-1" />
              Rozpis
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === "transactions" && (
            <TransactionList
              transactions={transactions}
              loading={loading}
              total={total}
              totalPages={totalPages}
              page={page}
              onPageChange={setPage}
              onEdit={setEditingTransaction}
              onDelete={handleDeleteTransaction}
              deletingId={deletingId}
              search={search}
              onSearchChange={setSearch}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
            />
          )}

          {activeTab === "recurring" && (
            <RecurringList
              recurring={recurring}
              onEdit={setEditingRecurring}
              onDelete={handleDeleteRecurring}
              deletingId={deletingId}
            />
          )}

          {activeTab === "summary" && (
            <SummaryView summary={summary} />
          )}
        </div>
      </motion.div>

      {/* Transaction Form Modal */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowForm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <TransactionForm
              transaction={editingTransaction}
              onClose={() => { setShowForm(false); setEditingTransaction(null); }}
              onSubmit={editingTransaction ? handleUpdateTransaction.bind(null, editingTransaction.id) : handleCreateTransaction}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Recurring Form Modal */}
      {showRecurringForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowRecurringForm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <RecurringForm
              recurring={editingRecurring}
              onClose={() => { setShowRecurringForm(false); setEditingRecurring(null); }}
              onSubmit={editingRecurring ? handleUpdateRecurring.bind(null, editingRecurring.id) : handleCreateRecurring}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function TransactionList({
  transactions,
  loading,
  total,
  totalPages,
  page,
  onPageChange,
  onEdit,
  onDelete,
  deletingId,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
}: any) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Hledat transakce..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as any)}
          className="input w-auto"
        >
          <option value="all">Všechny typy</option>
          <option value="income">Příjmy</option>
          <option value="expense">Výdaje</option>
        </select>
      </div>

      {loading ? Array(5).fill(0).map((_, i) => (
        <motion.div key={i} className="card animate-pulse" />
      )) : transactions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <DollarSign className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Žádné transakce</h3>
          <button onClick={() => { setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Přidat transakci
          </button>
        </div>
      ) : (
        <>
          {transactions.map((transaction: Transaction, index: number) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              className="card flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", 
                  transaction.type === "income" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}>
                  {transaction.type === "income" ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className={cn("px-2 py-0.5 rounded-full", 
                      transaction.type === "income" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    )}>
                      {typeLabels[transaction.type]}
                    </span>
                    <span className="px-2 py-0.5 bg-muted rounded-full">{categoryLabels[transaction.category]}</span>
                    {transaction.invoice_number && (
                      <span>Faktura: #{transaction.invoice_number}</span>
                    )}
                    {transaction.due_date && (
                      <span><Calendar className="w-3 h-3 inline mr-1" /> {formatDate(transaction.due_date)}</span>
                    )}
                    {transaction.paid_at && (
                      <span className="text-green-400"><CheckCircle className="w-3 h-3 inline mr-1" /> Zaplaceno</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn("text-xl font-bold", typeColors[transaction.type])}>
                  {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(transaction)}
                    className="p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <Edit className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => onDelete(transaction.id)}
                    disabled={deletingId === transaction.id}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    {deletingId === transaction.id ? (
                      <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => onPageChange(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-outline"
              >
                Předchozí
              </button>
              <span className="px-4 text-sm text-muted-foreground">
                Stránka {page} z {totalPages} ({total} transakcí)
              </span>
              <button
                onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-outline"
              >
                Další
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RecurringList({
  recurring,
  onEdit,
  onDelete,
  deletingId,
}: any) {
  return (
    <div className="space-y-4">
      {recurring.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <RotateCcw className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">Žádné pravidelné platby</h3>
          <button onClick={() => setShowRecurringForm(true)} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Přidat pravidelnou platbu
          </button>
        </div>
      ) : (
        recurring.map((payment: RecurringPayment, index: number) => (
          <motion.div
            key={payment.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
            className={cn("card flex items-center justify-between p-4", !payment.is_active && "opacity-50")}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{payment.name}</p>
                  <span className={cn("px-2 py-0.5 text-xs rounded-full",
                    payment.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
                  )}>
                    {payment.is_active ? "Aktivní" : "Neaktivní"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{formatCurrency(payment.amount)} / {frequencyLabels[payment.frequency]}</span>
                  <span>Další: {formatDate(payment.next_due)}</span>
                  <span className="px-2 py-0.5 bg-muted rounded-full">{categoryLabels[payment.category]}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(payment)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <Edit className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => onDelete(payment.id)}
                disabled={deletingId === payment.id}
                className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
              >
                {deletingId === payment.id ? (
                  <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

function SummaryView({ summary }: any) {
  if (!summary) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold mb-4">Příjmy podle kategorií</h3>
          <div className="space-y-3">
            {Object.entries(summary.income_by_category || {}).map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm">{categoryLabels[cat as TransactionCategory]}</span>
                <span className="font-bold text-green-400">{formatCurrency(amount as number)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold mb-4">Výdaje podle kategorií</h3>
          <div className="space-y-3">
            {Object.entries(summary.expense_by_category || {}).map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className="text-sm">{categoryLabels[cat as TransactionCategory]}</span>
                <span className="font-bold text-red-400">{formatCurrency(amount as number)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

import { CheckCircle } from "lucide-react";
import { setShowForm, setShowRecurringForm } from "@/lib/utils";