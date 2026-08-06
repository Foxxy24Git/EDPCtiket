import { requireSession } from "@/lib/session";
import { fmtDateKey } from "@/lib/format";
import { RekapLaporanClient } from "@/components/rekap/RekapLaporanClient";

export const dynamic = "force-dynamic";

export default async function RekapLaporanPage() {
  await requireSession();

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Laporan Rekap & Berita Acara</h1>
        <p className="page-subtitle">
          Pilihan laporan rekap workstation (format Excel) dan Berita Acara Serah Terima Perangkat resmi (format Word & PDF).
        </p>
      </div>
      <RekapLaporanClient today={fmtDateKey(new Date())} />
    </div>
  );
}
