import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pc-inventory
 * Ambil daftar inventaris SN perangkat dengan filter opsional
 * Query params: sn, merek, jenis, cabang, q (search), page, limit
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q       = searchParams.get("q") ?? "";
  const merek   = searchParams.get("merek") ?? "";
  const jenis   = searchParams.get("jenis") ?? "";
  const cabang  = searchParams.get("cabang") ?? "";
  const page    = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit   = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
  const skip    = (page - 1) * limit;

  try {
    const where: Record<string, unknown> = { isTerminated: false };

    if (q) {
      where.OR = [
        { sn: { contains: q, mode: "insensitive" } },
        { merek: { contains: q, mode: "insensitive" } },
        { jenis: { contains: q, mode: "insensitive" } },
        { lokasi: { contains: q, mode: "insensitive" } },
        { cabang: { contains: q, mode: "insensitive" } },
      ];
    }
    if (merek) where.merek = { contains: merek, mode: "insensitive" };
    if (jenis) where.jenis = { contains: jenis, mode: "insensitive" };
    if (cabang) where.cabang = { contains: cabang, mode: "insensitive" };

    const [items, total] = await Promise.all([
      prisma.pcInventory.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.pcInventory.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (error) {
    console.error("Gagal memuat pc_inventory:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}

/**
 * POST /api/pc-inventory
 * Tambah entri SN baru (hanya superadmin)
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Hanya superadmin yang dapat menambah data." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.sn || !body.sn.trim()) {
    return NextResponse.json({ error: "Serial Number (SN) wajib diisi." }, { status: 400 });
  }

  const sn     = body.sn.trim().toUpperCase();
  const merek  = body.merek ? body.merek.trim() : null;
  const jenis  = body.jenis ? body.jenis.trim() : null;
  const lokasi = body.lokasi ? body.lokasi.trim() : null;
  const cabang = body.cabang ? body.cabang.trim() : null;

  try {
    const existing = await prisma.pcInventory.findFirst({ where: { sn, isTerminated: false } });
    if (existing) {
      return NextResponse.json({ error: `SN '${sn}' sudah ada di inventaris.` }, { status: 409 });
    }

    const item = await prisma.pcInventory.create({
      data: { sn, merek, jenis, lokasi, cabang, isTerminated: false },
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    console.error("Gagal tambah pc_inventory:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
