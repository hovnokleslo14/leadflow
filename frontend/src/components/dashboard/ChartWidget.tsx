"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const revenueData = [
  { month: "Led", revenue: 45000, expenses: 12000 },
  { month: "Úno", revenue: 52000, expenses: 15000 },
  { month: "Bře", revenue: 48000, expenses: 14000 },
  { month: "Dub", revenue: 61000, expenses: 18000 },
  { month: "Kvě", revenue: 55000, expenses: 16000 },
  { month: "Čvn", revenue: 67000, expenses: 20000 },
  { month: "Čvc", revenue: 72000, expenses: 22000 },
  { month: "Srp", revenue: 69000, expenses: 19000 },
  { month: "Zář", revenue: 78000, expenses: 21000 },
  { month: "Říj", revenue: 85000, expenses: 24000 },
  { month: "Lis", revenue: 82000, expenses: 23000 },
  { month: "Pro", revenue: 91000, expenses: 25000 },
];

const leadsData = [
  { month: "Led", new: 12, qualified: 8, won: 3 },
  { month: "Úno", new: 15, qualified: 10, won: 4 },
  { month: "Bře", new: 10, qualified: 7, won: 2 },
  { month: "Dub", new: 18, qualified: 12, won: 5 },
  { month: "Kvě", new: 14, qualified: 9, won: 4 },
  { month: "Čvn", new: 20, qualified: 14, won: 6 },
  { month: "Čvc", new: 16, qualified: 11, won: 5 },
  { month: "Srp", new: 19, qualified: 13, won: 6 },
  { month: "Zář", new: 22, qualified: 15, won: 7 },
  { month: "Říj", new: 18, qualified: 12, won: 6 },
  { month: "Lis", new: 21, qualified: 14, won: 7 },
  { month: "Pro", new: 24, qualified: 16, won: 8 },
];

interface ChartWidgetProps {
  title: string;
  type?: "revenue" | "leads";
}

export function ChartWidget({ title, type = "revenue" }: ChartWidgetProps) {
  const data = type === "revenue" ? revenueData : leadsData;
  
  return (
    <Card className="h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-xs bg-cyan-400/20 text-cyan-400 rounded-full">LIVE</span>
        </div>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          {type === "revenue" ? (
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#6b6b7a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6b6b7a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number) => [new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", minimumFractionDigits: 0 }).format(value), ""]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#00d4aa"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Příjmy"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#f87171"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorExpenses)"
                name="Výdaje"
              />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d3a" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#6b6b7a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6b6b7a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="new"
                stroke="#00d4aa"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Nové leady"
              />
              <Line
                type="monotone"
                dataKey="qualified"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Kvalifikované"
              />
              <Line
                type="monotone"
                dataKey="won"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="Vyhráno"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}