"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { motion } from "framer-motion";
import { LogIn, LogOut, Users, Activity } from "lucide-react";
import type { ServerLog } from "./TambahLogModal";

interface SummaryCardsProps {
  logs: ServerLog[];
  filter?: "harian" | "mingguan" | "bulanan" | "semua" | "custom";
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cardVariants: any = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
};

export function SummaryCards({ logs }: SummaryCardsProps) {
  const stats = useMemo(() => {
    const totalAkses = logs.length;
    const totalMasuk = totalAkses; // Setiap log yang tercatat adalah kedatangan
    const totalKeluar = logs.filter((l) => l.waktuKeluar !== null).length;
    const uniqueOrang = new Set(logs.map((l) => l.namaOrang.toLowerCase())).size;
    return { totalAkses, totalMasuk, totalKeluar, uniqueOrang };
  }, [logs]);

  const cards = [
    {
      label: "Total Akses",
      value: stats.totalAkses,
      icon: Activity,
      color: "text-primary",
      bg: "bg-primary-50",
      border: "border-primary-100",
    },
    {
      label: "Total Masuk",
      value: stats.totalMasuk,
      icon: LogIn,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      label: "Total Keluar",
      value: stats.totalKeluar,
      icon: LogOut,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      label: "Orang Berbeda",
      value: stats.uniqueOrang,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            variants={cardVariants}
            whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.15 } }}
            className="cursor-pointer"
          >
            <Card className={`border ${card.border} transition-shadow hover:shadow-card-lg`} padding="md">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-semibold leading-tight">{card.label}</p>
                  <p className={`text-2xl font-bold mt-0.5 ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
