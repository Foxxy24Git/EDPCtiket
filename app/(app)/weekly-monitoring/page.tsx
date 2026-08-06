import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { countWeeklyTickets, listWorkstationWeeklyTickets } from "@/lib/ticketQueries";
import { resolveRange } from "@/lib/weeklyRange";
import { WeeklyMonitoringClient } from "@/components/weekly-monitoring/WeeklyMonitoringClient";

export const dynamic = "force-dynamic";

export default async function WeeklyMonitoringPage() {
  await requireSession();

  // Rentang default 7 hari (rolling) untuk muat awal.
  const { from, to, fromKey, toKey } = resolveRange(null, null);

  const [items, total, workstationCabangRows] = await Promise.all([
    listWorkstationWeeklyTickets({ from, to }),
    countWeeklyTickets({ from, to }),
    prisma.workstationMaster.findMany({
      orderBy: { namaCabang: "asc" },
      select: { id: true, namaCabang: true },
    }),
  ]);

  const wsCabangOptions = workstationCabangRows.map((c) => c.namaCabang);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Weekly Monitoring</h1>
        <p className="page-subtitle">
          Cari &amp; telusuri riwayat seluruh tiket gangguan workstation (proses maupun selesai).
          Default menampilkan 7 hari terakhir — gunakan filter untuk membatasi pencarian.
        </p>
      </div>
      <WeeklyMonitoringClient
        initialItems={items}
        initialTotal={total}
        initialFrom={fromKey}
        initialTo={toKey}
        wsCabangOptions={wsCabangOptions}
      />
    </div>
  );
}
