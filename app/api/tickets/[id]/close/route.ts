import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tickets/[id]/close
 *
 * Menandai tiket workstation selesai ditangani (status = selesai).
 * Menyimpan waktu selesai dan menuliskan log kronologi otomatis.
 */
export async function POST(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });
  }

  // Hak menutup: hanya owner tiket (Petugas IT Support)
  const isOwner = ticket.ownerUserId === session.sub;
  if (session.role !== "user" || !isOwner) {
    return NextResponse.json(
      { error: "Anda tidak berhak untuk menyelesaikan tiket ini." },
      { status: 403 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.update({
      where: { id },
      data: {
        status: "selesai",
        waktuSelesai: new Date(),
      },
    });

    await tx.ticketActivity.create({
      data: {
        ticketId: id,
        userId: session.sub,
        teks: `Tiket ditutup (Selesai Penanganan) oleh ${session.role.toUpperCase()}: ${session.nama}`,
      },
    });

    return t;
  });

  return NextResponse.json({ ok: true, ticket: updated });
}
