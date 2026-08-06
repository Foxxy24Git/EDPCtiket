import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tickets/[id]/approve-workstation
 *
 * Approve tiket workstation secara langsung oleh supervisi/superadmin.
 */
export async function POST(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role !== "supervisi" && session.role !== "superadmin") {
    return NextResponse.json(
      { error: "Hanya supervisi atau superadmin yang dapat meng-approve tiket workstation." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: { id: true, kategori: true, statusSupervisi: true },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });
  }
  if (ticket.kategori !== "workstation") {
    return NextResponse.json(
      { error: "Endpoint ini hanya untuk tiket kategori workstation." },
      { status: 400 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.update({
      where: { id },
      data: {
        statusSupervisi: "approved",
      },
      select: { id: true, noTiket: true, statusSupervisi: true },
    });

    await tx.ticketActivity.create({
      data: {
        ticketId: t.id,
        userId: session.sub,
        teks: `Tiket disetujui (Approved) oleh ${session.role.toUpperCase()}: ${session.nama}`,
      },
    });

    return t;
  });

  return NextResponse.json({ ok: true, ticket: updated });
}
