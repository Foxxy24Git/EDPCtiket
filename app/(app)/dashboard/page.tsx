import { requireSession } from "@/lib/session";
import { getDashboardData } from "@/lib/dashboardQueries";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireSession();
  const data = await getDashboardData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Ringkasan status open tiket workstation, kalender tiket berjalan, dan alert realtime.
        </p>
      </div>
      <DashboardClient initialData={data} />
    </div>
  );
}
