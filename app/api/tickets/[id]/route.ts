import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { guardTicketMutation } from "@/lib/ticketGuard";
import { getTicketDetail } from "@/lib/ticketQueries";

type Params = { params: Promise<{ id: string }> };

function cleanStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function optStr(v: unknown): string | null {
  const s = cleanStr(v);
  return s.length ? s : null;
}

/** GET /api/tickets/[id] — detail tiket workstation + kronologi kegiatan. */
export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const { id } = await params;

  const ticket = await getTicketDetail(id);
  if (!ticket) {
    return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });
  }
  return NextResponse.json({ item: ticket });
}

/** PATCH /api/tickets/[id] — ubah detail workstation (vendor, pic terima, dsb). */
export async function PATCH(req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const { id } = await params;
  const guard = await guardTicketMutation(session, id);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const body = await req.json().catch(() => null);
  const activityText = optStr(body?.activityText);

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.ticket.update({
      where: { id },
      data: {
        jenisGangguan: optStr(body?.jenisGangguan) ?? undefined,
        sumberPenyebab: optStr(body?.sumberPenyebab) ?? undefined,
        metodePenanganan: optStr(body?.metodePenanganan) ?? undefined,
        keterangan: body?.keterangan !== undefined ? optStr(body?.keterangan) : undefined,
        wsTglKeVendor: body?.wsTglKeVendor !== undefined ? (body.wsTglKeVendor ? new Date(body.wsTglKeVendor) : null) : undefined,
        wsVendor: body?.wsVendor !== undefined ? optStr(body?.wsVendor) : undefined,
        wsTglSelesaiVendor: body?.wsTglSelesaiVendor !== undefined ? (body.wsTglSelesaiVendor ? new Date(body.wsTglSelesaiVendor) : null) : undefined,
        wsTglKembaliKeCabang: body?.wsTglKembaliKeCabang !== undefined ? (body.wsTglKembaliKeCabang ? new Date(body.wsTglKembaliKeCabang) : null) : undefined,
        wsPicTerima: body?.wsPicTerima !== undefined ? optStr(body?.wsPicTerima) : undefined,
      },
    });

    if (activityText) {
      await tx.ticketActivity.create({
        data: {
          ticketId: id,
          userId: session.sub,
          teks: activityText,
        },
      });
    }

    return t;
  });

  return NextResponse.json({ item: { id: updated.id } });
}

/** DELETE /api/tickets/[id] — hapus tiket. Owner/superadmin. */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  const { id } = await params;
  const guard = await guardTicketMutation(session, id);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  try {
    await prisma.ticket.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Tiket tidak ditemukan." }, { status: 404 });
    }
    throw e;
  }
}
