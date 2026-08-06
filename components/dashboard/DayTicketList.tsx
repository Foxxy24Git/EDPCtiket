"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { fmtTime, fmtDate } from "@/lib/format";

interface DashboardOpenTicket {
  id: string;
  noTiket: string;
  wsCabang: string;
  wsMerekKomputer: string | null;
  waktuOpen: Date;
  ownerNama: string;
}

interface Props {
  dateKey: string | null;
  tickets: DashboardOpenTicket[];
}

export function DayTicketList({ dateKey, tickets }: Props) {
  const router = useRouter();

  if (!dateKey) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 text-gray-400">
        <CalendarDays className="w-8 h-8 mb-2" />
        <p className="text-sm">Pilih tanggal pada kalender untuk melihat tiket.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {fmtDate(dateKey)} · {tickets.length} tiket berjalan
      </p>
      {tickets.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          Tidak ada tiket berjalan pada tanggal ini.
        </p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
          {tickets.map((t, i) => (
            <motion.li
              key={t.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
            >
              <button
                onClick={() => router.push(`/daily-monitoring`)}
                className="w-full text-left rounded-lg border border-gray-100 bg-surface-muted hover:bg-surface-subtle px-3 py-2 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-primary">
                    {t.noTiket}
                  </span>
                  <span className="text-xs text-gray-400">
                    {fmtTime(t.waktuOpen)}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-gray-600 truncate">
                  <span className="font-medium">{t.wsCabang}</span> · {t.wsMerekKomputer ?? "Workstation"}
                </div>
                <div className="mt-1 text-[10px] text-gray-400">
                  Petugas: {t.ownerNama}
                </div>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
