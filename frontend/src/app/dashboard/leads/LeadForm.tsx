"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Bot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Lead, LeadStatus, LeadSource } from "@/types";

const leadSchema = z.object({
  client_id: z.number().optional(),
  source: z.enum(["reddit", "minecraft_server_list", "planet_minecraft", "mcservers", "discord", "referral", "manual", "other"]),
  source_url: z.string().url("Neplatná URL").optional().or(z.literal("")),
  title: z.string().min(1, "Název je povinný").max(500),
  description: z.string().optional(),
  server_name: z.string().max(200).optional().or(z.literal("")),
  server_ip: z.string().max(100).optional().or(z.literal("")),
  server_players: z.number().optional(),
  server_max_players: z.number().optional(),
  server_version: z.string().max(50).optional().or(z.literal("")),
  contact_username: z.string().max(200).optional().or(z.literal("")),
  contact_platform: z.string().max(50).optional().or(z.literal("")),
  status: z.enum(["new", "contacted", "qualified", "proposal_sent", "negotiating", "won", "lost", "archived"]),
  priority: z.number().default(0),
  estimated_value: z.number().optional(),
  metadata: z.record(z.any()).default({}),
});

type LeadFormData = z.infer<typeof leadSchema>;

interface LeadFormProps {
  lead?: Lead | null;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => Promise<void>;
}

export function LeadForm({ lead, onClose, onSubmit }: LeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      client_id: lead?.client_id,
      source: lead?.source || "manual",
      source_url: lead?.source_url || "",
      title: lead?.title || "",
      description: lead?.description || "",
      server_name: lead?.server_name || "",
      server_ip: lead?.server_ip || "",
      server_players: lead?.server_players,
      server_max_players: lead?.server_max_players,
      server_version: lead?.server_version || "",
      contact_username: lead?.contact_username || "",
      contact_platform: lead?.contact_platform || "",
      status: lead?.status || "new",
      priority: lead?.priority || 0,
      estimated_value: lead?.estimated_value,
      metadata: lead?.metadata || {},
    },
  });

  const onSubmitForm = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!lead?.id) {
      toast.error("Nejprve uložte lead");
      return;
    }
    setGeneratingDraft(true);
    try {
      // This would call the AI draft generation API
      toast.success("Draft bude vygenerován po uložení leadu");
    } catch (error) {
      toast.error("Nepodařilo se vygenerovat draft");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const sourceLabels: Record<LeadSource, string> = {
    reddit: "Reddit",
    minecraft_server_list: "Minecraft Server List",
    planet_minecraft: "Planet Minecraft",
    mcservers: "MCservers",
    discord: "Discord",
    referral: "Doporučení",
    manual: "Ruční",
    other: "Jiné",
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

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {lead ? "Upravit lead" : "Nový lead"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-medium text-muted-foreground">Základní informace</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Zdroj *"
            {...register("source")}
            options={Object.entries(sourceLabels).map(([value, label]) => ({ value: value as LeadSource, label }))}
            error={errors.source?.message}
          />
          <Input
            label="Priorita"
            type="number"
            {...register("priority", { valueAsNumber: true })}
            min={0}
            max={100}
            error={errors.priority?.message}
          />
        </div>

        <Input
          label="Název *"
          {...register("title")}
          error={errors.title?.message}
          placeholder="Např. Hledám developera na custom pluginy"
        />

        <Textarea
          label="Popis"
          {...register("description")}
          placeholder="Detailní popis příležitosti..."
          rows={3}
        />

        <Input
          label="Odhadovaná hodnota (CZK)"
          type="number"
          {...register("estimated_value", { valueAsNumber: true })}
          min={0}
          step={1000}
          placeholder="50000"
        />
      </div>

      {/* Server Info */}
      <div className="space-y-4 pt-4 border-t border-border/30">
        <h3 className="font-medium text-muted-foreground flex items-center gap-2">
          Informace o serveru
          {lead?.server_name && <span className="text-xs px-2 py-0.5 bg-cyan-400/20 text-cyan-400 rounded">{lead.server_name}</span>}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Název serveru"
            {...register("server_name")}
            placeholder="SurvivalCraft"
          />
          <Input
            label="IP adresa"
            {...register("server_ip")}
            placeholder="play.example.com:25565"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Hráči online"
            type="number"
            {...register("server_players", { valueAsNumber: true })}
            min={0}
          />
          <Input
            label="Max hráči"
            type="number"
            {...register("server_max_players", { valueAsNumber: true })}
            min={0}
          />
          <Input
            label="Verze"
            {...register("server_version")}
            placeholder="1.20.4"
          />
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-4 pt-4 border-t border-border/30">
        <h3 className="font-medium text-muted-foreground">Kontakt</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Uživatelské jméno"
            {...register("contact_username")}
            placeholder="Notch"
          />
          <Input
            label="Platforma"
            {...register("contact_platform")}
            placeholder="Discord, Reddit, Email..."
          />
        </div>

        <Input
          label="Zdrojová URL"
          type="url"
          {...register("source_url")}
          placeholder="https://reddit.com/r/admincraft/comments/..."
          error={errors.source_url?.message}
        />
      </div>

      {/* Status */}
      <div className="space-y-4 pt-4 border-t border-border/30">
        <h3 className="font-medium text-muted-foreground">Stav</h3>
        
        <Select
          label="Stav leadu *"
          {...register("status")}
          options={Object.entries(statusLabels).map(([value, label]) => ({ value: value as LeadStatus, label }))}
          error={errors.status?.message}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
        <Button type="button" variant="outline" onClick={onClose}>
          Zrušit
        </Button>
        {lead && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerateDraft}
            disabled={generatingDraft}
          >
            {generatingDraft ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generuji...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                Vygenerovat AI draft
              </>
            )}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Ukládám...
            </>
          ) : lead ? (
            "Uložit změny"
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Vytvořit lead
            </>
          )}
        </Button>
      </div>
    </form>
  );
}