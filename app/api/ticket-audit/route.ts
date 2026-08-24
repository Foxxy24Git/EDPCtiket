import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

/**
 * GET /api/ticket-audit
 * Audit trail seluruh aktivitas tiket workstation.
 * Hanya Supervisi & Superadmin yang boleh mengakses.
 *
 * Query params:
 *   from=YYYY-MM-DD, to=YYYY-MM-DD, search=string, page=number
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
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const perPage = 50;

  const where: Record<string, unknown> = {};

  if (fromStr || toStr) {
    const waktu: Record<string, Date> = {};
    if (fromStr) {
      const d = new Date(fromStr);
      d.setHours(0, 0, 0, 0);
      waktu.gte = d;
    }
    if (toStr) {
      const d = new Date(toStr);
      d.setHours(23, 59, 59, 999);
      waktu.lte = d;
    }
    where.waktu = waktu;
  }

  if (search) {
    where.OR = [
      { user: { nama: { contains: search, mode: "insensitive" } } },
      { ticket: { noTiket: { contains: search, mode: "insensitive" } } },
      { ticket: { wsCabang: { contains: search, mode: "insensitive" } } },
      { teks: { contains: search, mode: "insensitive" } },
    ];
  }

  const [activities, total] = await Promise.all([
    prisma.ticketActivity.findMany({
      where,
      orderBy: { waktu: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        waktu: true,
        teks: true,
        user: { select: { id: true, nama: true, username: true, role: true } },
        ticket: {
          select: {
            id: true,
            noTiket: true,
            wsCabang: true,
            wsMerekKomputer: true,
            status: true,
            statusSupervisi: true,
          },
        },
      },
    }),
    prisma.ticketActivity.count({ where }),
  ]);

  // Ambil juga audit hapus tiket dari MasterOption
  let deletedAudit: {
    id: string;
    waktu: string;
    teks: string;
    userName: string;
    userUsername: string;
    userRole: string;
    noTiket: string;
    wsCabang: string;
  }[] = [];

  try {
    const auditRecord = await prisma.masterOption.findUnique({
      where: { key: "audit_deleted_tickets" },
    });
    if (auditRecord) {
      const parsed: typeof deletedAudit = JSON.parse(auditRecord.value);
      // Filter berdasarkan rentang tanggal & search
      deletedAudit = parsed.filter((entry) => {
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
            entry.userName?.toLowerCase().includes(q) ||
            entry.noTiket?.toLowerCase().includes(q) ||
            entry.wsCabang?.toLowerCase().includes(q) ||
            entry.teks?.toLowerCase().includes(q)
          );
        }
        return true;
      });
    }
  } catch {
    // Audit belum ada — abaikan
  }

  return NextResponse.json({
    activities,
    deletedAudit,
    total,
    page,
    perPage,
  });
}
