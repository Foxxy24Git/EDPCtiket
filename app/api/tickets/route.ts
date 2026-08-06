import { NextResponse } from "next/server";
import { CpTipe } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateUniqueNoTiket } from "@/lib/noTiket";
import { listTickets } from "@/lib/ticketQueries";

function cleanStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function optStr(v: unknown): string | null {
  const s = cleanStr(v);
  return s.length ? s : null;
}

/**
 * GET /api/tickets — daftar tiket workstation.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const statusSupervisi = sp.get("statusSupervisi");
  const wsCabang = sp.get("wsCabang");
  const search = sp.get("search");

  const items = await listTickets({
    status,
    statusSupervisi,
    wsCabang,
    search,
    currentUserId: session.role === "user" ? session.sub : null,
  });

  return NextResponse.json({ items });
}

/** POST /api/tickets — buka tiket gangguan workstation baru. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role === "supervisi") {
    return NextResponse.json(
      { error: "Supervisi tidak dapat membuka tiket." },
      { status: 403 }
    );
  }

  // Verifikasi user valid di database (mencegah Foreign Key constraint error jika cookie lama)
  const dbUser = await prisma.user.findFirst({
    where: {
      OR: [{ id: session.sub }, { username: session.username }],
    },
  });

  if (!dbUser || !dbUser.isAktif) {
    return NextResponse.json(
      { error: "Sesi login Anda telah kedaluwarsa. Silakan login kembali." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);

  const wsCabang = cleanStr(body?.wsCabang);
  const wsTanggalMasuk = cleanStr(body?.wsTanggalMasuk);
  const wsNoSurat = cleanStr(body?.wsNoSurat);
  const wsMerekKomputer = cleanStr(body?.wsMerekKomputer);
  const wsKelengkapan = cleanStr(body?.wsKelengkapan);
  const wsSnKomputer = cleanStr(body?.wsSnKomputer);
  const wsKerusakan = cleanStr(body?.wsKerusakan);
  const cpTipe = cleanStr(body?.cpTipe);
  const cpNama = cleanStr(body?.cpNama);
  const cpTelp = cleanStr(body?.cpTelp);
  const kegiatan = cleanStr(body?.kegiatan);

  // Validasi wajib
  if (!wsCabang) return NextResponse.json({ error: "Cabang wajib dipilih." }, { status: 400 });
  if (!wsTanggalMasuk) return NextResponse.json({ error: "Tanggal Masuk wajib diisi." }, { status: 400 });
  if (!wsNoSurat) return NextResponse.json({ error: "Nomor Surat wajib diisi." }, { status: 400 });
  if (!wsMerekKomputer) return NextResponse.json({ error: "Merek Komputer wajib diisi." }, { status: 400 });
  if (!wsKelengkapan) return NextResponse.json({ error: "Kelengkapan wajib diisi." }, { status: 400 });
  if (!wsSnKomputer) return NextResponse.json({ error: "SN Komputer wajib diisi." }, { status: 400 });
  if (!wsKerusakan) return NextResponse.json({ error: "Kerusakan wajib diisi." }, { status: 400 });
  if (!kegiatan) return NextResponse.json({ error: "Kegiatan penanganan pertama wajib diisi." }, { status: 400 });

  if (cpTipe === "pic" && (!cpNama || !cpTelp)) {
    return NextResponse.json({ error: "No PIC wajib mengisi nama dan nomor telepon." }, { status: 400 });
  }
  if (cpTipe === "wag" && !cpNama) {
    return NextResponse.json({ error: "Nama WAG wajib diisi." }, { status: 400 });
  }

  const noTiket = await generateUniqueNoTiket(prisma, "WS-");

  const ticket = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.create({
      data: {
        noTiket,
        kategori: "workstation",
        wsCabang,
        wsTanggalMasuk: new Date(wsTanggalMasuk),
        wsNoSurat,
        wsMerekKomputer,
        wsCapem: optStr(body?.wsCapem),
        wsKelengkapan,
        wsSnKomputer,
        wsKerusakan,
        cpTipe: cpTipe as CpTipe,
        cpNama,
        cpTelp: cpTipe === "pic" ? cpTelp : null,
        status: "proses",
        statusSupervisi: "belum",
        ownerUserId: dbUser.id,
        keterangan: optStr(body?.keterangan),
      },
    });

    await tx.ticketActivity.create({
      data: {
        ticketId: t.id,
        userId: dbUser.id,
        teks: kegiatan,
      },
    });

    return t;
  });

  return NextResponse.json(
    { item: { id: ticket.id, noTiket: ticket.noTiket } },
    { status: 201 }
  );
}
