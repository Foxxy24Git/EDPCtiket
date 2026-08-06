import { requireSession } from "@/lib/session";
import { listTickets } from "@/lib/ticketQueries";
import { prisma } from "@/lib/prisma";
import { DailyMonitoringClient } from "@/components/daily-monitoring/DailyMonitoringClient";

export const dynamic = "force-dynamic";

export default async function DailyMonitoringPage() {
  const session = await requireSession();

  const [items, supervisiUsers, me] = await Promise.all([
    listTickets({ status: "proses" }),
    prisma.user.findMany({
      where: { role: "supervisi", isAktif: true },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { ttdUrl: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Daily Monitoring</h1>
        <p className="page-subtitle">
          Daftar seluruh tiket workstation yang saat ini sedang dalam proses penanganan.
          Klik baris untuk membuka detail pekerjaan, mencatat kegiatan, atau meng-update status tiket.
        </p>
      </div>
      <DailyMonitoringClient
        initialItems={items}
        role={session.role}
        supervisiUsers={supervisiUsers}
        currentUserId={session.sub}
        currentUserHasTtd={Boolean(me?.ttdUrl)}
      />
    </div>
  );
}
