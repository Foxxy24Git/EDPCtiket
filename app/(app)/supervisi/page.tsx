import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { listTickets } from "@/lib/ticketQueries";
import { SupervisiClient } from "@/components/supervisi/SupervisiClient";

export const dynamic = "force-dynamic";

export default async function SupervisiPage() {
  const session = await requireSession();
  if (session.role !== "supervisi" && session.role !== "superadmin") {
    redirect("/dashboard");
  }

  // Supervisi melihat SEMUA tiket workstation yang belum diapprove,
  // termasuk yang sudah selesai dikerjakan teknisi namun menunggu approval.
  const tickets = await listTickets({
    statusSupervisi: "belum",
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Supervisi Workstation</h1>
        <p className="page-subtitle">
          Daftar tiket workstation yang sudah selesai ditangani oleh teknisi dan menunggu persetujuan (Approval) Anda.
        </p>
      </div>
      <SupervisiClient initialTickets={tickets} role={session.role} />
    </div>
  );
}
