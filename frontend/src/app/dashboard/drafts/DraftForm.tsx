"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Bot, Sparkles, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Draft, DraftStatus } from "@/types";

const draftSchema = z.object({
  lead_id: z.number().min(1, "Vyberte lead"),
  subject: z.string().min(1, "Předmět je povinný").max(500),
  content: z.string().min(1, "Obsah je povinný"),
  status: z.enum(["pending", "generated", "approved", "sent", "rejected"]),
});

type DraftFormData = z.infer<typeof draftSchema>;

interface DraftFormProps {
  draft?: Draft | null;
  onClose: () => void;
  onSubmit: (data: DraftFormData) => Promise<void>;
}

const statusLabels: Record<DraftStatus, string> = {
  pending: "Čeká",
  generated: "Vygenerován",
  approved: "Schválen",
  sent: "Odeslán",
  rejected: "Zamítnut",
};

export function DraftForm({ draft, onClose, onSubmit }: DraftFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DraftFormData>({
    resolver: zodResolver(draftSchema),
    defaultValues: {
      lead_id: draft?.lead_id || 0,
      subject: draft?.subject || "",
      content: draft?.content || "",
      status: draft?.status || "pending",
    },
  });

  const onSubmitForm = async (data: DraftFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyContent = () => {
    const content = watch("content");
    if (content) {
      navigator.clipboard.writeText(content);
      toast.success("Obsah zkopírován");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {draft ? "Upravit draft" : "Nový draft"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Lead Selection */}
      <div className="space-y-2">
        <label className="label">Lead *</label>
        <select
          {...register("lead_id", { valueAsNumber: true })}
          className="input"
          required
        >
          <option value="">Vyberte lead...</option>
          <option value={1}>Lead #1: Hledám developera na custom pluginy</option>
          <option value={2}>Lead #2: Potřebuji web pro Survival server</option>
          <option value={3}>Lead #3: Optimalizace serveru + pluginy</option>
        </select>
        {errors.lead_id && (
          <p className="text-sm text-destructive">{errors.lead_id.message}</p>
        )}
      </div>

      {/* Subject */}
      <Input
        label="Předmět *"
        {...register("subject")}
        error={errors.subject?.message}
        placeholder="Např. Nabídka spolupráce: Vývoj pluginů pro Váš server"
      />

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="label">Obsah *</label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copyContent}
          >
            <Copy className="w-4 h-4 mr-1" />
            Kopírovat
          </Button>
        </div>
        <Textarea
          {...register("content")}
          error={errors.content?.message}
          placeholder="Text zprávy..."
          rows={12}
        />
      </div>

      {/* Status */}
      <Select
        label="Stav"
        {...register("status")}
        options={Object.entries(statusLabels).map(([value, label]) => ({ value: value as DraftStatus, label }))}
        error={errors.status?.message}
      />

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
          ) : draft ? (
            "Uložit změny"
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Vytvořit draft
            </>
          )}
        </Button>
      </div>
    </form>
  );
}