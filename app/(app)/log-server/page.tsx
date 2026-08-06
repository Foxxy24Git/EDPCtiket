import { requireSession } from "@/lib/session";
import { LogServerClient } from "@/components/log-server/LogServerClient";

export const dynamic = "force-dynamic";

export default async function LogServerPage() {
  const session = await requireSession();

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Log Server</h1>
        <p className="page-subtitle">
          Monitoring akses keluar masuk ruang server — per hari, per minggu, atau keseluruhan.
        </p>
      </div>
      <LogServerClient
        currentUserNama={session.nama}
        currentUserRole={session.role}
        currentUserId={session.sub}
      />
    </div>
  );
}
