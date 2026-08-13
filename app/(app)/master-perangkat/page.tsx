import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { MasterPerangkatClient } from "@/components/master-perangkat/MasterPerangkatClient";

export const dynamic = "force-dynamic";

export default async function MasterPerangkatPage() {
  const session = await requireSession();
  if (session.role !== "superadmin") {
    redirect("/dashboard");
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Master Perangkat &amp; Opsi Sistem</h1>
        <p className="page-subtitle">
          Kelola jenis perangkat, sub-tipe, merek, vendor, dan custom form builder per jenis perangkat.
        </p>
      </div>
      <MasterPerangkatClient />
    </div>
  );
}
