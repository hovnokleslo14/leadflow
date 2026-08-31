"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import {
  UserPlus,
  Target,
  FileText,
  DollarSign,
  PiggyBank,
  Bot,
  Search,
  Bell,
} from "lucide-react";

const actions = [
  {
    title: "Nový klient",
    description: "Přidat klienta s profilem, Discord ID a cenovým seznamem",
    href: "/dashboard/clients/new",
    icon: UserPlus,
    color: "text-cyan-400",
    bg: "bg-cyan-400/20",
  },
  {
    title: "Nový lead",
    description: "Zapsat příležitost ze scraperu nebo ručně",
    href: "/dashboard/leads/new",
    icon: Target,
    color: "text-purple-400",
    bg: "bg-purple-400/20",
  },
  {
    title: "Generovat draft",
    description: "AI navrhne nabídku na základě dat o serveru",
    href: "/dashboard/drafts/new",
    icon: Bot,
    color: "text-orange-400",
    bg: "bg-orange-400/20",
  },
  {
    title: "Přidat transakci",
    description: "Zapsat příjem nebo výdaj, propojit s klientem",
    href: "/dashboard/finance/new",
    icon: DollarSign,
    color: "text-green-400",
    bg: "bg-green-400/20",
  },
  {
    title: "Prasátko",
    description: "Přidat peníze k cíli nebo nastavit nový cíl",
    href: "/dashboard/piggy-bank",
    icon: PiggyBank,
    color: "text-yellow-400",
    bg: "bg-yellow-400/20",
  },
  {
    title: "Spustit scrapéry",
    description: "Ruční spuštění hledání leadů na Redditu a serverech",
    href: "/dashboard/scrapers",
    icon: Search,
    color: "text-blue-400",
    bg: "bg-blue-400/20",
  },
];

export function QuickActions() {
  return (
    <Card>
      <h3 className="font-semibold mb-4">Rychlé akce</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.title}
              as={Link}
              href={action.href}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex flex-col items-start gap-2 p-4 rounded-xl hover:bg-accent/50 border border-border/30 transition-all group"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", action.bg, action.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm group-hover:text-cyan-400 transition-colors">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </Card>
  );
}