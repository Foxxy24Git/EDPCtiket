import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function cleanStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function optStr(v: unknown): string | null {
  const s = cleanStr(v);
  return s.length ? s : null;
}

const DEFAULT_CABANG_LIST = [
  { namaCabang: "PAYAKUMBUH", kodeKantor: "0100" },
  { namaCabang: "BUKITTINGGI", kodeKantor: "0200" },
  { namaCabang: "BATUSANGKAR", kodeKantor: "0300" },
  { namaCabang: "SOLOK", kodeKantor: "0600" },
  { namaCabang: "PARIAMAN", kodeKantor: "0500" },
  { namaCabang: "PAINAN", kodeKantor: "0400" },
  { namaCabang: "SIJUNJUNG", kodeKantor: "0700" },
  { namaCabang: "LUBUK SIKAPING", kodeKantor: "0800" },
  { namaCabang: "PASAR RAYA", kodeKantor: "1000" },
  { namaCabang: "SITEBA", kodeKantor: "1005" },
  { namaCabang: "SAWAHLUNTO", kodeKantor: "1100" },
  { namaCabang: "SIMPANG EMPAT", kodeKantor: "1200" },
  { namaCabang: "MUARA LABUH", kodeKantor: "1300" },
  { namaCabang: "LUBUK GADANG", kodeKantor: "1301" },
  { namaCabang: "KOTO BARU", kodeKantor: "1400" },
  { namaCabang: "PULAU PUNJUNG", kodeKantor: "1403" },
  { namaCabang: "UJUNG GADING", kodeKantor: "1500" },
  { namaCabang: "LUBUK BASUNG", kodeKantor: "1600" },
  { namaCabang: "LUBUK ALUNG", kodeKantor: "1700" },
  { namaCabang: "TAPAN", kodeKantor: "1900" },
  { namaCabang: "LINTAU", kodeKantor: "2000" },
  { namaCabang: "CABANG UTAMA", kodeKantor: "2100" },
  { namaCabang: "MENTAWAI", kodeKantor: "2110" },
  { namaCabang: "TAPUS", kodeKantor: "2200" },
  { namaCabang: "ALAHAN PANJANG", kodeKantor: "2300" },
  { namaCabang: "JAKARTA", kodeKantor: "2400" },
  { namaCabang: "PEKANBARU", kodeKantor: "2500" },
  { namaCabang: "BANDUNG", kodeKantor: "2600" },
  { namaCabang: "SYARIAH PADANG", kodeKantor: "7100" },
  { namaCabang: "SYARIAH SOLOK", kodeKantor: "7202" },
  { namaCabang: "SYARIAH PAYAKUMBUH", kodeKantor: "7200" },
  { namaCabang: "SYARIAH BUKITTINGGI", kodeKantor: "7201" },
  { namaCabang: "SYARIAH BATUSANGKAR", kodeKantor: "7203" },
  { namaCabang: "PADANG PANJANG", kodeKantor: "0900" },
];

/**
 * GET /api/workstation — daftar master cabang workstation Bank Nagari.
 * Query param: ?q= (pencarian nama/kode), &limit=
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const limitRaw = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 200;

  const where: Prisma.WorkstationMasterWhereInput = q
    ? {
        OR: [
          { namaCabang: { contains: q, mode: "insensitive" } },
          { kodeKantor: { contains: q, mode: "insensitive" } },
          { lokasiKantor: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  let [items, total] = await Promise.all([
    prisma.workstationMaster.findMany({
      where,
      orderBy: { namaCabang: "asc" },
      take: limit,
    }),
    prisma.workstationMaster.count(),
  ]);

  // Jika database master cabang masih kosong, otomatis isi dengan 38 cabang default Bank Nagari
  if (total === 0 && !q) {
    try {
      await prisma.workstationMaster.createMany({
        data: DEFAULT_CABANG_LIST,
        skipDuplicates: true,
      });
      items = await prisma.workstationMaster.findMany({
        orderBy: { namaCabang: "asc" },
        take: limit,
      });
      total = items.length;
    } catch (e) {
      console.error("Gagal auto-seed master cabang:", e);
    }
  }

  return NextResponse.json({ items, total });
}

/** POST /api/workstation — tambah data cabang workstation. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role === "supervisi") {
    return NextResponse.json(
      { error: "Supervisi tidak dapat menambah data cabang." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const namaCabang = cleanStr(body?.namaCabang);

  if (!namaCabang) {
    return NextResponse.json(
      { error: "Nama Cabang wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.workstationMaster.create({
      data: {
        namaCabang,
        kodeKantor: optStr(body?.kodeKantor),
        lokasiKantor: optStr(body?.lokasiKantor),
      },
    });
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: `Kode kantor "${optStr(body?.kodeKantor)}" sudah terdaftar.` },
        { status: 409 }
      );
    }
    throw e;
  }
}
