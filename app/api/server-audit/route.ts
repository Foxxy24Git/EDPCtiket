import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/server-audit
 * Audit trail log server: siapa yang catat tamu, siapa yang approve.
 * Hanya Supervisi & Superadmin yang boleh mengakses.
 *
 * Query params:
 *   from=YYYY-MM-DD, to=YYYY-MM-DD, search=string
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role !== "supervisi" && session.role !== "superadmin") {
    return NextResponse.json({ error: "Hanya Supervisi atau Superadmin." }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const fromStr = sp.get("from");
  const toStr = sp.get("to");
  const search = sp.get("search")?.trim() ?? "";

  const where: Record<string, unknown> = { isTerminated: false };

  if (fromStr || toStr) {
    const createdAt: Record<string, Date> = {};
    if (fromStr) {
      const d = new Date(fromStr);
      d.setHours(0, 0, 0, 0);
      createdAt.gte = d;
    }
    if (toStr) {
      const d = new Date(toStr);
      d.setHours(23, 59, 59, 999);
      createdAt.lte = d;
    }
    where.createdAt = createdAt;
  }

  if (search) {
    where.OR = [
      { namaOrang: { contains: search, mode: "insensitive" } },
      { instansi: { contains: search, mode: "insensitive" } },
      { pencatat: { nama: { contains: search, mode: "insensitive" } } },
      { approver: { nama: { contains: search, mode: "insensitive" } } },
    ];
  }

  const logs = await prisma.serverAccessLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      namaOrang: true,
      instansi: true,
      namaPic: true,
      statusApproval: true,
      createdAt: true,
      waktuAkses: true,
      pencatat: { select: { id: true, nama: true, username: true, role: true } },
      approver: { select: { id: true, nama: true, username: true, role: true } },
    },
  });

  // Ambil juga audit hapus log server dari MasterOption
  let deletedServerAudit: {
    id: string;
    waktu: string;
    namaOrang: string;
    instansi: string;
    teks: string;
    deletedBy: string;
    deletedByUsername: string;
    deletedByRole: string;
  }[] = [];

  try {
    const auditRecord = await prisma.masterOption.findUnique({
      where: { key: "audit_deleted_server_logs" },
    });
    if (auditRecord) {
      const parsed: typeof deletedServerAudit = JSON.parse(auditRecord.value);
      deletedServerAudit = parsed.filter((entry) => {
        const waktu = new Date(entry.waktu);
        if (fromStr && waktu < new Date(fromStr)) return false;
        if (toStr) {
          const toDate = new Date(toStr);
          toDate.setHours(23, 59, 59, 999);
          if (waktu > toDate) return false;
        }
        if (search) {
          const q = search.toLowerCase();
          return (
            entry.namaOrang?.toLowerCase().includes(q) ||
            entry.instansi?.toLowerCase().includes(q) ||
            entry.deletedBy?.toLowerCase().includes(q)
          );
        }
        return true;
      });
    }
  } catch {
    // Audit belum ada — abaikan
  }

  return NextResponse.json({ logs, deletedServerAudit });
}
