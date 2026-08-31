"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ArrowUp, ArrowDown, Target, Flag, PieChart, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { piggyApi } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PiggyGoalForm } from "./PiggyGoalForm";
import { PiggyTransactionForm } from "./PiggyTransactionForm";
import { PiggyBankGoal, PiggyBankTransaction, TransactionType } from "@/types";

export default function PiggyBankPage() {
  const [goals, setGoals] = useState<PiggyBankGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PiggyBankGoal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<PiggyBankGoal | null>(null);
  const [transactions, setTransactions] = useState<PiggyBankTransaction[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await piggyApi.goals();
      setGoals(data);
    } catch (error) {
      toast.error("Nepodařilo se načíst cíle");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchTransactions = async (goalId: number) => {
    try {
      const data = await piggyApi.transactions(goalId);
      setTransactions(data);
    } catch (error) {
      toast.error("Nepodařilo se načíst transakce");
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (!confirm("Opravdu chcete smazat tento cíl?")) return;
    setDeletingId(id);
    try {
      await piggyApi.deleteGoal(id);
      toast.success("Cíl smazán");
      fetchGoals();
    } catch (error) {
      toast.error("Nepodařilo se smazat cíl");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteTransaction = async (goalId: number, transactionId: number) => {
    if (!confirm("Opravdu chcete smazat tuto transakci?")) return;
    try {
      await piggyApi.deleteTransaction(goalId, transactionId);
      toast.success("Transakce smazána");
      fetchTransactions(goalId);
      fetchGoals();
    } catch (error) {
      toast.error("Nepodařilo se smazat transakci");
    }
  };

  const handleCreateGoal = async (data: any) => {
    try {
      await piggyApi.createGoal(data);
      toast.success("Cíl vytvořen");
      setShowGoalForm(false);
      fetchGoals();
    } catch (error) {
      toast.error("Nepodařilo se vytvořit cíl");
    }
  };

  const handleUpdateGoal = async (id: number, data: any) => {
    try {
      await piggyApi.updateGoal(id, data);
      toast.success("Cíl aktualizován");
      setEditingGoal(null);
      fetchGoals();
    } catch (error) {
      toast.error("Nepodařilo se aktualizovat cíl");
    }
  };

  const handleAddTransaction = async (goalId: number, data: any) => {
    try {
      await piggyApi.addTransaction(goalId, data);
      toast.success("Transakce přidána");
      setShowTransactionForm(false);
      fetchTransactions(goalId);
      fetchGoals();
    } catch (error) {
      toast.error("Nepodařilo se přidat transakci");
    }
  };

  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget * 100) : 0;

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
            <span className="text-4xl">🐷</span>
            Prasátko
          </h1>
          <p className="text-muted-foreground mt-1">Finanční cíle s animacemi a sledováním progrès</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setEditingGoal(null); setShowGoalForm(true); }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Nový cíl
        </motion.button>
      </motion.div>

      {/* Overall Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", damping: 20 }}
        className="card relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-purple-500/10" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-muted-foreground">Celkový progres</p>
              <h2 className="text-3xl font-bold gradient-text">
                {formatCurrency(totalCurrent)} / {formatCurrency(totalTarget)}
              </h2>
            </div>
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", damping: 15 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center"
            >
              <span className="text-3xl">🐷</span>
            </motion.div>
          </div>

          {/* Animated Progress Bar */}
          <div className="h-4 bg-muted rounded-full overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(overallProgress, 100)}%` }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-white text-shadow"
            >
              {overallProgress.toFixed(1)}%
            </motion.span>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 text-center">
            <div>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totalCurrent)}</p>
              <p className="text-sm text-muted-foreground">Naspořeno</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalTarget - totalCurrent)}</p>
              <p className="text-sm text-muted-foreground">Chybí k cíli</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-400">{goals.filter(g => g.is_active).length}</p>
              <p className="text-sm text-muted-foreground">Aktivních cílů</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Goals Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {loading ? Array(6).fill(0).map((_, i) => (
          <motion.div key={i} className="card animate-pulse" />
        )) : goals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full card flex flex-col items-center justify-center py-16 text-center"
          >
            <span className="text-6xl mb-4">🐷</span>
            <h3 className="text-lg font-medium mb-2">Žádné cíle</h3>
            <p className="text-muted-foreground mb-6">Nastav si svůj první finanční cíl</p>
            <button onClick={() => setShowGoalForm(true)} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Vytvořit cíl
            </button>
          </motion.div>
        ) : (
          goals.map((goal, index) => (
            <PiggyGoalCard
              key={goal.id}
              goal={goal}
              index={index}
              onClick={() => { setSelectedGoal(goal); fetchTransactions(goal.id); }}
              onEdit={() => setEditingGoal(goal)}
              onDelete={() => handleDeleteGoal(goal.id)}
              deleting={deletingId === goal.id}
              progress={(goal.current_amount / goal.target_amount * 100)}
            />
          ))
        )}
      </motion.div>

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedGoal(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <PiggyGoalDetail
              goal={selectedGoal}
              transactions={transactions}
              onClose={() => setSelectedGoal(null)}
              onAddTransaction={() => { setShowTransactionForm(true); }}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Goal Form Modal */}
      {showGoalForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => { setShowGoalForm(false); setEditingGoal(null); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <PiggyGoalForm
              goal={editingGoal}
              onClose={() => { setShowGoalForm(false); setEditingGoal(null); }}
              onSubmit={editingGoal ? handleUpdateGoal.bind(null, editingGoal.id) : handleCreateGoal}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Transaction Form Modal */}
      {showTransactionForm && selectedGoal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowTransactionForm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-strong rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <PiggyTransactionForm
              goalId={selectedGoal.id}
              onClose={() => setShowTransactionForm(false)}
              onSubmit={handleAddTransaction.bind(null, selectedGoal.id)}
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

function PiggyGoalCard({
  goal,
  index,
  onClick,
  onEdit,
  onDelete,
  deleting,
  progress,
}: any) {
  const isComplete = progress >= 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, type: "spring", damping: 20 }}
      onClick={onClick}
      className={cn(
        "card cursor-pointer group relative overflow-hidden",
        isComplete && "ring-2 ring-green-500/50"
      )}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
    >
      {/* Color indicator */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: goal.color }} />
      
      {/* Completion animation */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute top-4 right-4 w-10 h-10 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center animate-pulse"
          >
            <Target className="w-5 h-5" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${goal.color}20` }}>
              {goal.icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{goal.name}</h3>
              <p className="text-sm text-muted-foreground">{goal.currency}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 rounded-lg hover:bg-accent" title="Upravit">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} disabled={deleting} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive" title="Smazat">
              {deleting ? <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {goal.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{goal.description}</p>
        )}

        {/* Progress Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span>{progress.toFixed(1)}%</span>
            <span className="font-medium">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
              className="h-full rounded-full relative overflow-hidden"
              style={{ background: goal.color }}
            >
              {isComplete && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
              )}
            </motion.div>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/30">
          {goal.deadline && (
            <span className={cn("flex items-center gap-1", new Date(goal.deadline) < new Date() && "text-red-400")}>
              <Flag className="w-3 h-3" />
              {formatDate(goal.deadline)}
            </span>
          )}
          <span>Vytvořeno: {formatDate(goal.created_at)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function PiggyGoalDetail({
  goal,
  transactions,
  onClose,
  onAddTransaction,
  onDeleteTransaction,
}: any) {
  const progress = (goal.current_amount / goal.target_amount * 100);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: `${goal.color}20` }}>
            {goal.icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{goal.name}</h2>
            <p className="text-muted-foreground">{goal.currency}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress */}
      <div className="mb-6 p-4 bg-muted/50 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Progres</span>
          <span className="text-xl font-bold" style={{ color: goal.color }}>{progress.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: goal.color }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center text-sm">
          <div>
            <p className="font-bold text-green-400">{formatCurrency(goal.current_amount)}</p>
            <p className="text-muted-foreground">Naspořeno</p>
          </div>
          <div>
            <p className="font-bold text-yellow-400">{formatCurrency(goal.target_amount - goal.current_amount)}</p>
            <p className="text-muted-foreground">Chybí</p>
          </div>
          <div>
            <p className="font-bold text-cyan-400">{goal.target_amount > 0 ? Math.ceil((goal.target_amount - goal.current_amount) / (goal.target_amount / 100)) : 0}%</p>
            <p className="text-muted-foreground">Zbývá</p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Transakce ({transactions.length})</h3>
        <Button onClick={onAddTransaction} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Přidat
        </Button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Žádné transakce</p>
        ) : (
          transactions.map((tx: PiggyBankTransaction) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                  tx.type === "income" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}>
                  {tx.type === "income" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("font-bold",
                  tx.type === "income" ? "text-green-400" : "text-red-400"
                )}>
                  {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteTransaction(goal.id, tx.id); }}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

import { Textarea } from "@/components/ui/Textarea";
import { X } from "lucide-react";