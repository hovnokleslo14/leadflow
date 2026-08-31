"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";
import {
  UserPlus,
  Target,
  DollarSign,
  MessageSquare,
  Bot,
  PiggyBank,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "client" | "lead" | "transaction" | "message" | "draft" | "piggy";
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "client",
    title: "Nový klient přidán",
    description: "MC Server Czech s.r.o. - vývoj pluginů",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "2",
    type: "lead",
    title: "Lead kvalifikován",
    description: "Reddit r/admincraft: Hledám developera na custom pluginy",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "3",
    type: "transaction",
    title: "Příjem platby",
    description: "Faktura #2024-001 - 15 000 CZK",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "4",
    type: "draft",
    title: "AI draft vygenerován",
    description: "Nabídka pro SurvivalCraft server - web + pluginy",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "5",
    type: "piggy",
    title: "Prasátko doplněno",
    description: "+25 000 CZK k cíli 'Nový vývojový server'",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: "6",
    type: "message",
    title: "Discord zpráva",
    description: "Klient: 'Kdy bude hotový ten web?'",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

const typeConfig = {
  client: { icon: UserPlus, color: "text-cyan-400", bg: "bg-cyan-400/20" },
  lead: { icon: Target, color: "text-purple-400", bg: "bg-purple-400/20" },
  transaction: { icon: DollarSign, color: "text-green-400", bg: "bg-green-400/20" },
  draft: { icon: Bot, color: "text-orange-400", bg: "bg-orange-400/20" },
  piggy: { icon: PiggyBank, color: "text-yellow-400", bg: "bg-yellow-400/20" },
  message: { icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-400/20" },
};

export function RecentActivity() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Poslední aktivita</h3>
        <a href="/dashboard/activity" className="text-sm text-cyan-400 hover:underline">
          Všechny
        </a>
      </div>
      <div className="space-y-3">
        {mockActivities.map((activity, index) => {
          const config = typeConfig[activity.type];
          const Icon = config.icon;
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
            >
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", config.bg, config.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{activity.title}</p>
                <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                {formatDateTime(activity.timestamp)}
              </span>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}