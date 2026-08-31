"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, DollarSign, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Transaction, TransactionType, TransactionCategory } from "@/types";

const transactionSchema = z.object({
  client_id: z.number().optional(),
  type: z.enum(["income", "expense"]),
  category: z.enum(["service", "hosting", "development", "design", "marketing", "subscription", "salary", "tax", "other"]),
  amount: z.number().min(0.01, "Částka musí být větší než 0"),
  currency: z.string().length(3).default("CZK"),
  description: z.string().min(1, "Popis je povinný").max(500),
  reference: z.string().max(200).optional().or(z.literal("")),
  invoice_number: z.string().max(100).optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
  paid_at: z.string().optional().or(z.literal("")),
  is_recurring: z.boolean().default(false),
  metadata: z.record(z.any()).default({}),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  transaction?: Transaction | null;
  onClose: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
}

const typeLabels: Record<TransactionType, string> = {
  income: "Příjem (+)",
  expense: "Výdaj (-)",
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

export function TransactionForm({ transaction, onClose, onSubmit }: TransactionFormProps) {
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
      client_id: transaction?.client_id,
      type: transaction?.type || "expense",
      category: transaction?.category || "other",
      amount: transaction?.amount || 0,
      currency: transaction?.currency || "CZK",
      description: transaction?.description || "",
      reference: transaction?.reference || "",
      invoice_number: transaction?.invoice_number || "",
      due_date: transaction?.due_date ? transaction.due_date.split("T")[0] : "",
      paid_at: transaction?.paid_at ? transaction.paid_at.split("T")[0] : "",
      is_recurring: transaction?.is_recurring || false,
      metadata: transaction?.metadata || {},
    },
  });

  const onSubmitForm = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : undefined,
        paid_at: data.paid_at ? new Date(data.paid_at).toISOString() : undefined,
      };
      await onSubmit(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {transaction ? "Upravit transakci" : "Nová transakce"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Type & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Typ *"
          {...register("type")}
          options={Object.entries(typeLabels).map(([value, label]) => ({ value: value as TransactionType, label }))}
          error={errors.type?.message}
        />
        <Select
          label="Kategorie *"
          {...register("category")}
          options={Object.entries(categoryLabels).map(([value, label]) => ({ value: value as TransactionCategory, label }))}
          error={errors.category?.message}
        />
      </div>

      {/* Amount & Currency */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input
          label="Částka *"
          type="number"
          step="0.01"
          min="0.01"
          {...register("amount", { valueAsNumber: true })}
          error={errors.amount?.message}
          placeholder="10000"
        />
        <Input
          label="Měna"
          {...register("currency")}
          disabled
          defaultValue="CZK"
        />
        <Input
          label="Klient (ID)"
          type="number"
          {...register("client_id", { valueAsNumber: true })}
          placeholder="Volitelné"
        />
      </div>

      {/* Description */}
      <Input
        label="Popis *"
        {...register("description")}
        error={errors.description?.message}
        placeholder="Popis transakce..."
      />

      {/* Reference & Invoice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Reference"
          {...register("reference")}
          placeholder="Např. číslo objednávky"
        />
        <Input
          label="Číslo faktury"
          {...register("invoice_number")}
          placeholder="Např. 2024-001"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Datum splatnosti"
          type="date"
          {...register("due_date")}
          value={watch("due_date") || ""}
          onChange={(e) => setValue("due_date", e.target.value)}
        />
        <Input
          label="Datum platby"
          type="date"
          {...register("paid_at")}
          value={watch("paid_at") || ""}
          onChange={(e) => setValue("paid_at", e.target.value)}
        />
      </div>

      {/* Recurring */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Pravidelná platba</p>
          <p className="text-sm text-muted-foreground">Označit jako opakující se</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            {...register("is_recurring")}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
        <Button type="button" variant="outline" onClick={onClose}>
          Zrušit
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Ukládám...
            </>
          ) : transaction ? (
            "Uložit změny"
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              Vytvořit transakci
            </>
          )}
        </Button>
      </div>
    </form>
  );
}