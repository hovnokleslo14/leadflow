"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, ArrowUp, ArrowDown, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { TransactionType } from "@/types";

const transactionSchema = z.object({
  amount: z.number().min(0.01, "Částka musí být větší než 0"),
  type: z.enum(["income", "expense"]),
  description: z.string().min(1, "Popis je povinný").max(500),
  metadata: z.record(z.any()).default({}),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface PiggyTransactionFormProps {
  goalId: number;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
}

export function PiggyTransactionForm({ goalId, onClose, onSubmit }: PiggyTransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      type: "income",
      description: "",
      metadata: {},
    },
  });

  const onSubmitForm = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const type = watch("type");

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className={cn("text-2xl", type === "income" ? "text-green-400" : "text-red-400")}>
            {type === "income" ? "💰" : "💸"}
          </span>
          {type === "income" ? "Přidat peníze" : "Odebrat peníze"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Type Selector */}
      <div className="space-y-2">
        <label className="label">Typ transakce</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue("type", "income")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-center",
              type === "income"
                ? "bg-green-500/20 border-green-500/50 text-green-400"
                : "hover:bg-accent border-border"
            )}
          >
            <ArrowUp className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium">Přidat</p>
            <p className="text-sm text-muted-foreground">Příjem</p>
          </button>
          <button
            type="button"
            onClick={() => setValue("type", "expense")}
            className={cn(
              "p-4 rounded-xl border-2 transition-all text-center",
              type === "expense"
                ? "bg-red-500/20 border-red-500/50 text-red-400"
                : "hover:bg-accent border-border"
            )}
          >
            <ArrowDown className="w-6 h-6 mx-auto mb-2" />
            <p className="font-medium">Odebrat</p>
            <p className="text-sm text-muted-foreground">Výdaj</p>
          </button>
        </div>
      </div>

      {/* Amount */}
      <Input
        label="Částka *"
        type="number"
        step="1"
        min="1"
        {...register("amount", { valueAsNumber: true })}
        error={errors.amount?.message}
        placeholder="10000"
        className="text-2xl text-center"
      />

      {/* Description */}
      <Textarea
        label="Popis *"
        {...register("description")}
        error={errors.description?.message}
        placeholder="Za co / od koho..."
        rows={3}
      />

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
        <Button type="button" variant="outline" onClick={onClose}>
          Zrušit
        </Button>
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Ukládám...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              {type === "income" ? "Přidat" : "Odebrat"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}