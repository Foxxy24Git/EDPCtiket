import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tickets = await prisma.ticket.findMany({
      where: {
        kategori: "workstation",
        waktuOpen: { gte: today, lt: tomorrow },
      },
      orderBy: { waktuOpen: "desc" },
      select: {
        id: true,
        noTiket: true,
        wsCabang: true,
        wsMerekKomputer: true,
        status: true,
        statusSupervisi: true,
        waktuOpen: true,
        owner: { select: { nama: true } },
      },
    });

    const total = tickets.length;
    const proses = tickets.filter((t) => t.status === "proses").length;
    const selesai = tickets.filter((t) => t.status === "selesai").length;
    const approved = tickets.filter((t) => t.statusSupervisi === "approved").length;

    return NextResponse.json({
      tickets: tickets.map((t) => ({
        id: t.id,
        noTiket: t.noTiket,
        wsCabang: t.wsCabang,
        wsMerekKomputer: t.wsMerekKomputer,
        status: t.status,
        statusSupervisi: t.statusSupervisi,
        ownerNama: t.owner.nama,
        waktuOpen: t.waktuOpen.toISOString(),
      })),
      stats: { total, proses, selesai, approved },
    });
  } catch (err) {
    console.error("GET /api/tickets/today error:", err);
    return NextResponse.json({ error: "Gagal memuat tiket hari ini." }, { status: 500 });
  }
}
