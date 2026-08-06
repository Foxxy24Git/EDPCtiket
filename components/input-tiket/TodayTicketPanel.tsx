"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TicketCheck,
  Clock,
  TrendingUp,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CalendarDays,
  Monitor,
  User,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { fmtTime } from "@/lib/format";

interface TodayTicket {
  id: string;
  noTiket: string;
  wsCabang: string;
  wsMerekKomputer: string | null;
  status: string;
  statusSupervisi: string;
  ownerNama: string;
  waktuOpen: string;
}

interface TodayStats {
  total: number;
  proses: number;
  selesai: number;
  approved: number;
}

interface Props {
  refreshSignal?: number;
}

function StatusBadge({ status, statusSupervisi }: { status: string; statusSupervisi: string }) {
  if (statusSupervisi === "approved") {
    return (
      <Badge variant="success">
        <ShieldCheck className="w-3 h-3 mr-1" />
        Approved
      </Badge>
    );
  }
  if (status === "selesai") {
    return <Badge variant="info">Selesai</Badge>;
  }
  return <Badge variant="warning">Proses</Badge>;
}

export function TodayTicketPanel({ refreshSignal }: Props) {
  const [tickets, setTickets] = useState<TodayTicket[]>([]);
  const [stats, setStats] = useState<TodayStats>({ total: 0, proses: 0, selesai: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets/today", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets ?? []);
        setStats(data.stats ?? { total: 0, proses: 0, selesai: 0, approved: 0 });
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error("Gagal memuat tiket hari ini:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday, refreshSignal]);

  const miniStats = [
    { label: "Dalam Proses", value: stats.proses, Icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Selesai", value: stats.selesai, Icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Approved", value: stats.approved, Icon: ShieldCheck, color: "text-violet-600", bg: "bg-violet-50" },
  ];

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <Card padding="lg" className="bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-white" />
        </div>
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 opacity-90" />
              <span className="text-sm font-semibold opacity-90">Aktivitas Hari Ini</span>
            </div>
            <button
              onClick={fetchToday}
              disabled={loading}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="text-5xl font-bold">{stats.total}</p>
          <p className="text-sm opacity-80 mt-1">tiket workstation dibuka</p>
          <p className="text-xs opacity-55 mt-2">Terakhir: {fmtTime(lastRefresh.toISOString())}</p>
        </div>
      </Card>

      {/* Mini Stats */}
      <div className="grid grid-cols-3 gap-2">
        {miniStats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 }}
          >
            <Card padding="sm" className="text-center">
              <div className={`w-8 h-8 mx-auto rounded-lg ${s.bg} flex items-center justify-center mb-1.5`}>
                <s.Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 leading-tight">{s.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Today's Ticket List */}
      <Card padding="none" className="overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TicketCheck className="w-4 h-4 text-primary" />
            Tiket Hari Ini
          </CardTitle>
          {tickets.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {tickets.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Memuat...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
            <AlertCircle className="w-8 h-8 opacity-40" />
            <p className="text-sm">Belum ada tiket hari ini</p>
            <p className="text-xs opacity-70">Tiket baru akan muncul di sini</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
            <AnimatePresence>
              {tickets.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-4 py-3 hover:bg-gray-50/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-mono text-sm font-bold text-primary">{t.noTiket}</span>
                    <StatusBadge status={t.status} statusSupervisi={t.statusSupervisi} />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Monitor className="w-3 h-3 shrink-0" />
                    <span className="font-medium text-gray-700 truncate">{t.wsCabang}</span>
                    {t.wsMerekKomputer && (
                      <>
                        <span className="text-gray-300 shrink-0">·</span>
                        <span className="truncate">{t.wsMerekKomputer}</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                    <User className="w-3 h-3 shrink-0" />
                    <span>{t.ownerNama}</span>
                    <span className="text-gray-300">·</span>
                    <span>{fmtTime(t.waktuOpen)}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Quick Tips */}
      <Card padding="md" className="border border-dashed border-primary/25 bg-gradient-to-br from-blue-50/60 to-transparent">
        <div className="flex gap-2.5">
          <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600 space-y-1.5">
            <p className="font-semibold text-gray-800">Tips Input Tiket</p>
            <p>📷 Gunakan tombol <strong>Scan OCR</strong> untuk mengisi SN & Nomor Surat otomatis.</p>
            <p>🔢 Nomor tiket dibuat <strong>otomatis</strong> — tidak perlu diisi manual.</p>
            <p>🏢 Tambahkan <strong>Capem</strong> jika perangkat dari kantor pembantu.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
