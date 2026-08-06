"use client";

import { motion } from "framer-motion";
import { CardTitle, Card } from "@/components/ui/Card";
import { PieChartCabang } from "./PieChartCabang";
import { BarChartMerek } from "./BarChartMerek";
import { LineChartTren } from "./LineChartTren";
import type { BranchStat, BrandStat, DailyTrend } from "@/lib/dashboardQueries";
import { TrendingUp, MapPin, Monitor } from "lucide-react";

interface Props {
  branchStats: BranchStat[];
  brandStats: BrandStat[];
  dailyTrend: DailyTrend[];
}

export function ChartsRow({ branchStats, brandStats, dailyTrend }: Props) {
  return (
    <div className="space-y-5">
      {/* Tren Harian - Full Width */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle>Tren Tiket Harian</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">30 hari terakhir</p>
            </div>
          </div>
          <LineChartTren data={dailyTrend} />
        </Card>
      </motion.div>

      {/* Pie + Bar — 2 kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card padding="lg" className="h-full">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <CardTitle>Cabang Paling Sering Rusak</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">90 hari terakhir, top 8</p>
              </div>
            </div>
            <PieChartCabang data={branchStats} />
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card padding="lg" className="h-full">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Monitor className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <CardTitle>Perbandingan Merek Komputer &amp; Mesin EDC</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">Perbandingan jenis komputer &amp; Mesin EDC bermasalah</p>
              </div>
            </div>
            <BarChartMerek data={brandStats} />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
