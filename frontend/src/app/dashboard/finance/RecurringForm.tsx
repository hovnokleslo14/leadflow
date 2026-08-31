"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, RotateCcw, DollarSign, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RecurringPayment, TransactionType, TransactionCategory, RecurringFrequency } from "@/types";

const recurringSchema = z.object({
  client_id: z.number().optional(),
  name: z.string().min(1, "Název je povinný").max(200),
  type: z.enum(["income", "expense"]),
  category: z.enum(["service", "hosting", "development", "design", "marketing", "subscription", "salary", "tax", "other"]),
  amount: z.number().min(0.01, "Částka musí být větší než 0"),
  currency: z.string().length(3).default("CZK"),
  frequency: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
  day_of_month: z.number().min(1).max(31).optional(),
  day_of_week: z.number().min(0).max(6).optional(),
  description: z.string().optional(),
  next_due: z.string().min(1, "Datum první splatnosti je povinné"),
  is_active: z.boolean().default(true),
  notify_before_days: z.number().min(0).max(30).default(3),
  metadata: z.record(z.any()).default({}),
});

type RecurringFormData = z.infer<typeof recurringSchema>;

interface RecurringFormProps {
  recurring?: RecurringPayment | null;
  onClose: () => void;
  onSubmit: (data: RecurringFormData) => Promise<void>;
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

const frequencyLabels: Record<RecurringFrequency, string> = {
  daily: "Denně",
  weekly: "Týdně",
  monthly: "Měsíčně",
  quarterly: "Čtvrtletně",
  yearly: "Ročně",
};

export function RecurringForm({ recurring, onClose, onSubmit }: RecurringFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecurringFormData>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      client_id: recurring?.client_id,
      name: recurring?.name || "",
      type: recurring?.type || "expense",
      category: recurring?.category || "other",
      amount: recurring?.amount || 0,
      currency: recurring?.currency || "CZK",
      frequency: recurring?.frequency || "monthly",
      day_of_month: recurring?.day_of_month,
      day_of_week: recurring?.day_of_week,
      description: recurring?.description || "",
      next_due: recurring?.next_due ? recurring.next_due.split("T")[0] : new Date().toISOString().split("T")[0],
      is_active: recurring?.is_active ?? true,
      notify_before_days: recurring?.notify_before_days || 3,
      metadata: recurring?.metadata || {},
    },
  });

  const onSubmitForm = async (data: RecurringFormData) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        ...data,
        next_due: new Date(data.next_due).toISOString(),
      };
      await onSubmit(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequency = watch("frequency");

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {recurring ? "Upravit pravidelnou platbu" : "Nová pravidelná platba"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Name */}
      <Input
        label="Název *"
        {...register("name")}
        error={errors.name?.message}
        placeholder="Např. Měsíční hosting, Roční licence..."
      />

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
          placeholder="5000"
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

      {/* Frequency */}
      <div className="space-y-4">
        <Select
          label="Frekvence *"
          {...register("frequency")}
          options={Object.entries(frequencyLabels).map(([value, label]) => ({ value: value as RecurringFrequency, label }))}
          error={errors.frequency?.message}
        />

        {frequency === "monthly" || frequency === "quarterly" || frequency === "yearly" ? (
          <Input
            label="Den v měsíci"
            type="number"
            min="1"
            max="31"
            {...register("day_of_month", { valueAsNumber: true })}
            placeholder="1-31"
          />
        ) : frequency === "weekly" ? (
          <Select
            label="Den v týdnu"
            {...register("day_of_week", { valueAsNumber: true })}
            options={[
              { value: "0", label: "Neděle" },
              { value: "1", label: "Pondělí" },
              { value: "2", label: "Úterý" },
              { value: "3", label: "Středa" },
              { value: "4", label: "Čtvrtek" },
              { value: "5", label: "Pátek" },
              { value: "6", label: "Sobota" },
            ]}
          />
        ) : null}
      </div>

      {/* Next Due Date */}
      <Input
        label="První splatnost *"
        type="date"
        {...register("next_due")}
        value={watch("next_due") || ""}
        onChange={(e) => setValue("next_due", e.target.value)}
        error={errors.next_due?.message}
      />

      {/* Description */}
      <Textarea
        label="Popis"
        {...register("description")}
        placeholder="Další poznámky..."
        rows={3}
      />

      {/* Active & Notification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Aktivní</p>
            <p className="text-sm text-muted-foreground">Generovat transakce automaticky</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              {...register("is_active")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
        <Input
          label="Upozornit předem (dny)"
          type="number"
          min="0"
          max="30"
          {...register("notify_before_days", { valueAsNumber: true })}
          defaultValue={3}
        />
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
          ) : recurring ? (
            "Uložit změny"
          ) : (
            <>
              <RotateCcw className="w-4 h-4 mr-2" />
              Vytvořit pravidelnou platbu
            </>
          )}
        </Button>
      </div>
    </form>
  );
}