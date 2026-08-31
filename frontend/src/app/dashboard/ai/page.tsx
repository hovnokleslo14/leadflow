"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, Loader2, Copy, FileText, Target, Brain, Zap, Settings } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { draftsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AIDraftRequest } from "@/types";

const tones = [
  { value: "professional", label: "Profesionální", icon: <Target className="w-4 h-4" /> },
  { value: "friendly", label: "Přátelský", icon: <Sparkles className="w-4 h-4" /> },
  { value: "casual", label: "Neformální", icon: <Zap className="w-4 h-4" /> },
  { value: "formal", label: "Formální", icon: <FileText className="w-4 h-4" /> },
];

const languages = [
  { value: "cs", label: "Čeština", flag: "🇨🇿" },
  { value: "en", label: "English", flag: "🇺🇸" },
];

export default function AIPage() {
  const [leadId, setLeadId] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [tone, setTone] = useState<AIDraftRequest["tone"]>("professional");
  const [language, setLanguage] = useState<AIDraftRequest["language"]>("cs");
  const [generating, setGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [leadInfo, setLeadInfo] = useState<any>(null);

  const handleGenerate = async () => {
    if (!leadId.trim()) {
      toast.error("Zadejte ID leadu");
      return;
    }
    setGenerating(true);
    try {
      const data = await draftsApi.generate({
        lead_id: parseInt(leadId),
        custom_prompt: customPrompt || undefined,
        tone,
        language,
      });
      setGeneratedDraft(data.draft);
      setUsage(data.usage);
      toast.success("Draft vygenerován!");
    } catch (error) {
      toast.error("Nepodařilo se vygenerovat draft");
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Zkopírováno do schránky");
  };

  const loadLeadInfo = async () => {
    if (!leadId.trim()) return;
    try {
      const lead = await fetch(`/api/backend/leads/${leadId}`).then(r => r.json());
      setLeadInfo(lead);
    } catch (error) {
      console.error("Failed to load lead info");
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
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-400" />
            AI Nástroje
          </h1>
          <p className="text-muted-foreground mt-1">Generování nabídek, analýza leadů a AI asistence</p>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          <Card>
            <div className="p-4 border-b border-border/30 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Generátor AI draftů
              </h3>
              <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded-full">GPT-4o / Claude</span>
            </div>
            <div className="p-4 space-y-6">
              {/* Lead Selection */}
              <div className="space-y-2">
                <label className="label flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Lead ID *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    placeholder="Např. 42"
                    className="input flex-1"
                    min="1"
                  />
                  <button
                    onClick={loadLeadInfo}
                    className="btn-outline"
                    disabled={!leadId.trim()}
                  >
                    Načíst info
                  </button>
                </div>
              </div>

              {/* Lead Info Preview */}
              {leadInfo && (
                <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                  <h4 className="font-medium">Informace o leadu</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Název:</span>
                    <span className="font-medium">{leadInfo.title}</span>
                    <span className="text-muted-foreground">Server:</span>
                    <span className="font-medium">{leadInfo.server_name || "Neurčen"}</span>
                    <span className="text-muted-foreground">Kontakt:</span>
                    <span className="font-medium">@{leadInfo.contact_username || "Neurčen"}</span>
                    <span className="text-muted-foreground">Zdroj:</span>
                    <span className="font-medium capitalize">{leadInfo.source?.replace(/_/g, " ")}</span>
                  </div>
                </div>
              )}

              {/* Custom Prompt */}
              <div className="space-y-2">
                <label className="label">Vlastní pokyny (volitelné)</label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Např. Zdůrazni naše zkušenosti s hostingem, zmíň konkrétní cenu..."
                  rows={3}
                  className="input min-h-[80px] resize-y"
                />
                <p className="text-xs text-muted-foreground">Zde můžeš dodat specifické pokyny pro AI, které se přidají k výchozímu promptu.</p>
              </div>

              {/* Tone & Language */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label">Tón komunikace</label>
                  <div className="grid grid-cols-4 gap-2">
                    {tones.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTone(t.value)}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all text-center",
                          tone === t.value
                            ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                            : "hover:bg-accent border-border"
                        )}
                      >
                        {t.icon}
                        <p className="text-xs mt-1">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="label">Jazyk</label>
                  <div className="grid grid-cols-2 gap-2">
                    {languages.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        onClick={() => setLanguage(l.value as any)}
                        className={cn(
                          "p-3 rounded-xl border-2 transition-all text-center",
                          language === l.value
                            ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                            : "hover:bg-accent border-border"
                        )}
                      >
                        <span className="text-2xl">{l.flag}</span>
                        <p className="text-xs mt-1">{l.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={generating || !leadId.trim()}
                className="btn-primary w-full py-4 text-lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin mr-3" />
                    Generuji draft...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 mr-3" />
                    Vygenerovat AI draft
                  </>
                )}
              </motion.button>
            </div>
          </Card>

          {/* Generated Draft Preview */}
          {generatedDraft && (
            <Card>
              <div className="p-4 border-b border-border/30 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Vygenerovaný draft
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(generatedDraft.content)}
                    className="btn-outline btn-sm"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Kopírovat
                  </button>
                  <button className="btn-primary btn-sm">
                    Uložit jako draft
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <p className="font-medium">Předmět: {generatedDraft.subject}</p>
                  <p className="text-sm text-muted-foreground">Status: {generatedDraft.status}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg whitespace-pre-wrap font-mono text-sm max-h-96 overflow-y-auto border border-border/30">
                  {generatedDraft.content}
                </div>
                {usage && (
                  <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between text-sm text-muted-foreground">
                    <span>Model: {usage.provider} ({usage.model})</span>
                    <span>Tokeny: {usage.total_tokens || usage.input_tokens + usage.output_tokens || "N/A"}</span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </motion.div>

        {/* Features & Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <Card>
            <div className="p-4 border-b border-border/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Co AI umí
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {[
                { icon: Bot, title: "Personalizované drafty", desc: "AI analyzuje data o serveru a klientovi a vytvoří relevantní nabídku" },
                { icon: Sparkles, title: "Různé tóny", desc: "Profesionální, přátelský, neformální nebo formální styl komunikace" },
                { icon: Brain, title: "Dva jazyky", desc: "Generování v češtině i angličtině" },
                { icon: Zap, title: "Rychlost", desc: "Draft je připraven do pár sekund" },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium">{feature.title}</p>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-border/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Tipy pro lepší výsledky
              </h3>
            </div>
            <div className="p-4 space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <span>Vyplň co nejvíce informací o leadu (server, kontakt, popis) - AI bude mít více kontextu</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <span>Použij vlastní pokyny pro specifické požadavky (např. "zmíň naši cenu 15k/měsíc za hosting")</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <span>Vždy draft zkontroluj před odesláním - AI může hallucinovat</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                <span>Pro opakující se typy leadů vytvoř šablony vlastních pokynů</span>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-border/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Rychlé akce
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <button className="btn-outline text-left p-4 hover:bg-accent/50 transition-colors">
                <Bot className="w-5 h-5 mr-2" />
                <div>
                  <p className="font-medium">Analýza leadu</p>
                  <p className="text-xs text-muted-foreground">AI ohodnotí kvalitu leadu</p>
                </div>
              </button>
              <button className="btn-outline text-left p-4 hover:bg-accent/50 transition-colors">
                <FileText className="w-5 h-5 mr-2" />
                <div>
                  <p className="font-medium">Šablony promptů</p>
                  <p className="text-xs text-muted-foreground">Uložené prompty pro různé typy</p>
                </div>
              </button>
              <button className="btn-outline text-left p-4 hover:bg-accent/50 transition-colors">
                <Target className="w-5 h-5 mr-2" />
                <div>
                  <p className="font-medium">A/B testování</p>
                  <p className="text-xs text-muted-foreground">Porovnej různé varianty draftu</p>
                </div>
              </button>
              <button className="btn-outline text-left p-4 hover:bg-accent/50 transition-colors">
                <Settings className="w-5 h-5 mr-2" />
                <div>
                  <p className="font-medium">Nastavení AI</p>
                  <p className="text-xs text-muted-foreground">Model, teplota, max tokeny</p>
                </div>
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}