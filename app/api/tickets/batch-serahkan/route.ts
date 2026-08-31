import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const { ticketIds, wsTglKembaliKeCabang, wsPicTerima, activityText } = body;
  
  if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
    return NextResponse.json({ error: "Daftar ID tiket tidak valid." }, { status: 400 });
  }
  if (!wsTglKembaliKeCabang || !wsPicTerima) {
    return NextResponse.json({ error: "Tanggal kembali dan PIC Terima wajib diisi." }, { status: 400 });
  }

  try {
    const updatedTickets = await prisma.$transaction(async (tx) => {
      const tickets = await tx.ticket.findMany({
        where: { id: { in: ticketIds } },
        select: { id: true, wsTglKembaliKeCabang: true }
      });

      // Update only tickets that haven't been returned yet to avoid overriding
      const toUpdate = tickets.filter(t => !t.wsTglKembaliKeCabang).map(t => t.id);

      if (toUpdate.length > 0) {
        await tx.ticket.updateMany({
          where: { id: { in: toUpdate } },
          data: {
            wsTglKembaliKeCabang: new Date(wsTglKembaliKeCabang).toISOString(),
            wsPicTerima: String(wsPicTerima).trim(),
          },
        });

        // Add activity log for each updated ticket
        if (activityText) {
          await tx.ticketActivity.createMany({
            data: toUpdate.map(id => ({
              ticketId: id,
              userId: session.sub,
              teks: String(activityText),
            })),
          });
        }
      }
      return toUpdate;
    });

    return NextResponse.json({ ok: true, updatedCount: updatedTickets.length });
  } catch (e) {
    console.error("Gagal melakukan batch serahkan:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server saat batch penyerahan tiket." }, { status: 500 });
  }
}
