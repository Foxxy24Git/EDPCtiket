"use client";

import { motion } from "framer-motion";
import { Monitor, Activity, CheckCircle, Timer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CountUp } from "./CountUp";

interface Props {
  counts: {
    total: number;
    proses: number;
    selesai: number;
    avgDaysToComplete: number;
  };
}

export function MetricCards({ counts }: Props) {
  const cards = [
    {
      key: "total",
      label: "Total Tiket Workstation",
      value: counts.total,
      suffix: "tiket",
      Icon: Monitor,
      accent: "text-primary",
      ring: "bg-primary/10 text-primary",
      bar: "bg-primary",
      gradient: "from-blue-50 to-white",
    },
    {
      key: "proses",
      label: "Tiket Dalam Proses",
      value: counts.proses,
      suffix: "tiket",
      Icon: Activity,
      accent: "text-amber-600",
      ring: "bg-amber-50 text-amber-600",
      bar: "bg-amber-500",
      gradient: "from-amber-50 to-white",
    },
    {
      key: "selesai",
      label: "Tiket Selesai & Approved",
      value: counts.selesai,
      suffix: "tiket",
      Icon: CheckCircle,
      accent: "text-emerald-700",
      ring: "bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
      gradient: "from-emerald-50 to-white",
    },
    {
      key: "avg",
      label: "Rata-rata Penyelesaian",
      value: counts.avgDaysToComplete,
      suffix: "hari",
      Icon: Timer,
      accent: "text-violet-700",
      ring: "bg-violet-50 text-violet-700",
      bar: "bg-violet-500",
      gradient: "from-violet-50 to-white",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.08 }}
        >
          <Card padding="lg" className={`relative overflow-hidden bg-gradient-to-br ${c.gradient}`}>
            <span className={`absolute left-0 top-0 h-full w-1 ${c.bar}`} aria-hidden />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{c.label}</p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <CountUp
                    value={c.value}
                    className={`text-4xl font-display font-bold ${c.accent}`}
                  />
                  <span className="text-sm text-gray-400">{c.suffix}</span>
                </div>
              </div>
              <span className={`grid place-items-center w-11 h-11 rounded-xl ${c.ring}`}>
                <c.Icon className="w-6 h-6" />
              </span>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
