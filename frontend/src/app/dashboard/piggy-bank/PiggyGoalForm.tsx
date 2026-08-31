"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Target, Palette, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PiggyBankGoal } from "@/types";

const goalSchema = z.object({
  name: z.string().min(1, "Název je povinný").max(200),
  target_amount: z.number().min(1, "Cílová částka musí být větší než 0"),
  currency: z.string().length(3).default("CZK"),
  deadline: z.string().optional().or(z.literal("")),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#00d4aa"),
  icon: z.string().max(10).default("🐷"),
  is_active: z.boolean().default(true),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface PiggyGoalFormProps {
  goal?: PiggyBankGoal | null;
  onClose: () => void;
  onSubmit: (data: GoalFormData) => Promise<void>;
}

const icons = ["🐷", "💰", "🎯", "🏠", "🚗", "💻", "🎮", "✈️", "📚", "🏥", "💍", "🎓", "🏖️", "🎁", "⭐"];
const colors = ["#00d4aa", "#a855f7", "#f97316", "#ec4899", "#3b82f6", "#22c55e", "#eab308", "#ef4444", "#6366f1", "#14b8a6"];

export function PiggyGoalForm({ goal, onClose, onSubmit }: PiggyGoalFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: goal?.name || "",
      target_amount: goal?.target_amount || 0,
      currency: goal?.currency || "CZK",
      deadline: goal?.deadline ? goal.deadline.split("T")[0] : "",
      description: goal?.description || "",
      color: goal?.color || "#00d4aa",
      icon: goal?.icon || "🐷",
      is_active: goal?.is_active ?? true,
    },
  });

  const onSubmitForm = async (data: GoalFormData) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        ...data,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      };
      await onSubmit(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const color = watch("color");

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">{watch("icon") || "🐷"}</span>
          {goal ? "Upravit cíl" : "Nový cíl"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Icon Picker */}
      <div className="space-y-2">
        <label className="label flex items-center gap-2">
          <span className="text-2xl">{watch("icon") || "🐷"}</span>
          Ikona
        </label>
        <div className="flex flex-wrap gap-2">
          {icons.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setValue("icon", icon)}
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-2xl transition-all",
                watch("icon") === icon
                  ? "ring-2 ring-primary scale-110 bg-primary/20"
                  : "hover:bg-accent hover:scale-105"
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <label className="label flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Barva
        </label>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue("color", c)}
              className={cn(
                "w-10 h-10 rounded-xl transition-all border-2",
                watch("color") === c
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                  : "hover:scale-105"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <Input
            type="color"
            {...register("color")}
            className="w-10 h-10 rounded-xl cursor-pointer border-2 p-0"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>

      {/* Basic Fields */}
      <Input
        label="Název cíle *"
        {...register("name")}
        error={errors.name?.message}
        placeholder="Např. Nový vývojový server"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Cílová částka *"
          type="number"
          min="1"
          step="100"
          {...register("target_amount", { valueAsNumber: true })}
          error={errors.target_amount?.message}
          placeholder="100000"
        />
        <Input
          label="Měna"
          {...register("currency")}
          disabled
          defaultValue="CZK"
        />
      </div>

      <Input
        label="Deadline"
        type="date"
        {...register("deadline")}
        value={watch("deadline") || ""}
        onChange={(e) => setValue("deadline", e.target.value)}
      />

      <Textarea
        label="Popis"
        {...register("description")}
        placeholder="Popis cíle, motivace..."
        rows={3}
      />

      {/* Active Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Aktivní cíl</p>
          <p className="text-sm text-muted-foreground">Zobrazovat v přehledu a sledovat progres</p>
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
          ) : goal ? (
            "Uložit změny"
          ) : (
            <>
              <Target className="w-4 h-4 mr-2" />
              Vytvořit cíl
            </>
          )}
        </Button>
      </div>
    </form>
  );
}