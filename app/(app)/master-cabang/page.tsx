import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MasterCabangClient } from "@/components/master-cabang/MasterCabangClient";

export const dynamic = "force-dynamic";

const DEFAULT_CABANG_LIST = [
  { namaCabang: "PAYAKUMBUH", kodeKantor: "001" },
  { namaCabang: "BUKITTINGGI", kodeKantor: "002" },
  { namaCabang: "BATUSANGKAR", kodeKantor: "003" },
  { namaCabang: "SOLOK", kodeKantor: "004" },
  { namaCabang: "PARIAMAN", kodeKantor: "005" },
  { namaCabang: "PAINAN", kodeKantor: "006" },
  { namaCabang: "SIJUNJUNG", kodeKantor: "007" },
  { namaCabang: "LUBUK SIKAPING", kodeKantor: "008" },
  { namaCabang: "PASAR RAYA", kodeKantor: "009" },
  { namaCabang: "SITEBA", kodeKantor: "010" },
  { namaCabang: "SAWAHLUNTO", kodeKantor: "011" },
  { namaCabang: "SIMPANG EMPAT", kodeKantor: "012" },
  { namaCabang: "MUARA LABUH", kodeKantor: "013" },
  { namaCabang: "LUBUK GADANG", kodeKantor: "014" },
  { namaCabang: "KOTO BARU", kodeKantor: "015" },
  { namaCabang: "PULAU PUNJUNG", kodeKantor: "016" },
  { namaCabang: "UJUNG GADING", kodeKantor: "017" },
  { namaCabang: "LUBUK BASUNG", kodeKantor: "018" },
  { namaCabang: "LUBUK ALUNG", kodeKantor: "019" },
  { namaCabang: "TAPAN", kodeKantor: "020" },
  { namaCabang: "LINTAU", kodeKantor: "021" },
  { namaCabang: "CABANG UTAMA", kodeKantor: "022" },
  { namaCabang: "MENTAWAI", kodeKantor: "023" },
  { namaCabang: "TAPUS", kodeKantor: "024" },
  { namaCabang: "ALAHAN PANJANG", kodeKantor: "025" },
  { namaCabang: "PANGKALAN", kodeKantor: "026" },
  { namaCabang: "BALAI SELASA", kodeKantor: "027" },
  { namaCabang: "PULAU PUNJUNG BARAT", kodeKantor: "028" },
  { namaCabang: "JAKARTA", kodeKantor: "029" },
  { namaCabang: "PEKANBARU", kodeKantor: "030" },
  { namaCabang: "BATAM", kodeKantor: "031" },
  { namaCabang: "MEDAN", kodeKantor: "032" },
  { namaCabang: "BANDUNG", kodeKantor: "033" },
  { namaCabang: "SYARIAH PADANG", kodeKantor: "034" },
  { namaCabang: "SYARIAH PAYAKUMBUH", kodeKantor: "035" },
  { namaCabang: "SYARIAH BUKITTINGGI", kodeKantor: "036" },
  { namaCabang: "SYARIAH BATUSANGKAR", kodeKantor: "037" },
  { namaCabang: "PADANG PANJANG", kodeKantor: "038" },
];

export default async function MasterCabangPage() {
  const session = await requireSession();
  if (session.role !== "superadmin") {
    redirect("/dashboard");
  }

  let branches = await prisma.workstationMaster.findMany({
    orderBy: { namaCabang: "asc" },
  });

  if (branches.length === 0) {
    try {
      await prisma.workstationMaster.createMany({
        data: DEFAULT_CABANG_LIST,
        skipDuplicates: true,
      });
      branches = await prisma.workstationMaster.findMany({
        orderBy: { namaCabang: "asc" },
      });
    } catch (e) {
      console.error("Gagal auto-seed cabang di MasterCabangPage:", e);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Master Opsi</h1>
        <p className="page-subtitle">
          Kelola data cabang Bank Nagari, daftar merek hardware, dan vendor perbaikan perbaikan (CRUD).
        </p>
      </div>
      <MasterCabangClient initialBranches={branches} />
    </div>
  );
}
