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
