import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/server-log/kiosk — ambil daftar pre-registered visitors yang siap check-in */
export async function GET() {
  try {
    const preRegistered = await prisma.serverAccessLog.findMany({
      where: {
        statusApproval: "pre_registered",
      },
      orderBy: { createdAt: "desc" },
      include: {
        pencatat: { select: { nama: true } },
      },
    });

    return NextResponse.json({ items: preRegistered });
  } catch (err) {
    console.error("[GET /api/server-log/kiosk]", err);
    return NextResponse.json({ error: "Gagal memuat data pencatatan supervisi." }, { status: 500 });
  }
}

/** POST /api/server-log/kiosk — simpan check-in tamu dari device kiosk (Foto + Ttd) */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, fotoUrl, ttdUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "ID pencatatan wajib disertakan." }, { status: 400 });
    }
    if (!fotoUrl) {
      return NextResponse.json({ error: "Foto wajib diambil melalui kamera." }, { status: 400 });
    }
    if (!ttdUrl) {
      return NextResponse.json({ error: "Tanda tangan digital wajib dibubuhkan." }, { status: 400 });
    }

    const existingLog = await prisma.serverAccessLog.findUnique({ where: { id } });
    if (!existingLog) {
      return NextResponse.json({ error: "Data pencatatan tidak ditemukan." }, { status: 404 });
    }

    const updatedLog = await prisma.serverAccessLog.update({
      where: { id },
      data: {
        fotoUrl,
        ttdUrl,
        waktuAkses: new Date(),
        statusApproval: "pending",
      },
      include: {
        pencatat: { select: { id: true, nama: true, username: true } },
      },
    });

    return NextResponse.json({ log: updatedLog });
  } catch (err) {
    console.error("[POST /api/server-log/kiosk]", err);
    return NextResponse.json({ error: "Gagal menyimpan check-in kiosk." }, { status: 500 });
  }
}
