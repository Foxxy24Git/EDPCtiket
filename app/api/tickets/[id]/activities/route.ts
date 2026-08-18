import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tickets/[id]/activities — tambah satu entri kegiatan penanganan baru.
 */
export async function POST(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const { id } = await params;

  // Cari tiket
  const ticket = await prisma.ticket.findUnique({
    where: { id },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });
  }

  // Cek otorisasi: hanya owner tiket (Petugas IT Support)
  const isOwner = ticket.ownerUserId === session.sub;
  if (session.role !== "user" || !isOwner) {
    return NextResponse.json(
      { error: "Anda tidak berhak menambah kegiatan pada tiket ini." },
      { status: 403 }
    );
  }

  if (ticket.status === "selesai") {
    return NextResponse.json(
      { error: "Tiket telah Selesai (Closed) dan log kegiatan tidak dapat ditambah lagi." },
      { status: 400 }
    );
  }

  // Parse body
  const body = await req.json().catch(() => null);
  const teks = typeof body?.teks === "string" ? body.teks.trim() : "";
  if (!teks) {
    return NextResponse.json({ error: "Teks kegiatan wajib diisi." }, { status: 400 });
  }

  // Insert activity
  const activity = await prisma.ticketActivity.create({
    data: {
      ticketId: id,
      userId: session.sub,
      teks,
      waktu: new Date(),
    },
  });

  return NextResponse.json({ item: activity });
}
