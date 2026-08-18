import { requireSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { BackupSection } from "@/components/setting/BackupSection";

export const dynamic = "force-dynamic";

export default async function BackupDatabasePage() {
  const session = await requireSession();
  if (session.role !== "superadmin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Backup Database</h1>
        <p className="page-subtitle">
          Kelola pemeliharaan, pencadangan otomatis bulanan, dan unduh backup database.
        </p>
      </div>
      <BackupSection />
    </div>
  );
}
