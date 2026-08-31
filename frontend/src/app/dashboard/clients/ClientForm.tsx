"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Image, Upload, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

const clientSchema = z.object({
  name: z.string().min(1, "Jméno je povinné").max(200),
  email: z.string().email("Neplatný email").optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  company: z.string().max(200).optional().or(z.literal("")),
  website: z.string().url("Neplatná URL").optional().or(z.literal("")),
  discord_id: z.string().max(100).optional().or(z.literal("")),
  avatar_url: z.string().url("Neplatná URL obrázku").optional().or(z.literal("")),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: {
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
  } | null;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => Promise<void>;
}

export function ClientForm({ client, onClose, onSubmit }: ClientFormProps) {
  const [tags, setTags] = useState<string[]>(client?.tags || []);
  const [newTag, setNewTag] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(client?.avatar_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name || "",
      email: client?.email || "",
      phone: client?.phone || "",
      company: client?.company || "",
      website: client?.website || "",
      discord_id: client?.discord_id || "",
      avatar_url: client?.avatar_url || "",
      notes: client?.notes || "",
      tags: client?.tags || [],
      is_active: client?.is_active ?? true,
    },
  });

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const onSubmitForm = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({ ...data, tags });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In real app, upload to server and get URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setAvatarPreview(url);
        setValue("avatar_url", url);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {client ? "Upravit klienta" : "Nový klient"}
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center overflow-hidden">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Image className="w-8 h-8 text-white/50" />
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
            <Upload className="w-4 h-4 text-primary-foreground" />
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
        <div className="flex-1">
          <Input
            label="Obrázek (URL)"
            {...register("avatar_url")}
            placeholder="https://example.com/avatar.png"
            onChange={(e) => {
              setValue("avatar_url", e.target.value);
              setAvatarPreview(e.target.value || null);
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">Nebo klikněte na avatar pro nahrání souboru</p>
        </div>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Jméno *"
          {...register("name")}
          error={errors.name?.message}
        />
        <Input
          label="Email"
          type="email"
          {...register("email")}
          error={errors.email?.message}
        />
        <Input
          label="Telefon"
          {...register("phone")}
          error={errors.phone?.message}
        />
        <Input
          label="Firma"
          {...register("company")}
          error={errors.company?.message}
        />
        <Input
          label="Web"
          type="url"
          {...register("website")}
          error={errors.website?.message}
          placeholder="https://example.com"
        />
        <Input
          label="Discord ID"
          {...register("discord_id")}
          placeholder="123456789012345678"
          error={errors.discord_id?.message}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <label className="label">Štítky</label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Přidat štítek..."
              className="input w-48"
            />
            <button type="button" onClick={addTag} className="btn-outline px-3">
              Přidat
            </button>
          </div>
        </div>
      </div>

      {/* Notes */}
      <Textarea
        label="Poznámky"
        {...register("notes")}
        placeholder="Interní poznámky k klientovi..."
        rows={4}
      />

      {/* Active Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Aktivní klient</p>
          <p className="text-sm text-muted-foreground">Zobrazovat v seznamech a výběrech</p>
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
          ) : client ? (
            "Uložit změny"
          ) : (
            "Vytvořit klienta"
          )}
        </Button>
      </div>
    </form>
  );
}