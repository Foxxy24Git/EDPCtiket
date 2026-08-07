import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfMonth(date: Date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** GET /api/server-log — daftar log akses server */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }

    const sp = new URL(req.url).searchParams;
    const filter = sp.get("filter") ?? "semua";

    const now = new Date();
    let where: { waktuAkses?: { gte: Date; lte: Date } } = {};

    if (filter === "harian") {
      where = { waktuAkses: { gte: startOfDay(now), lte: endOfDay(now) } };
    } else if (filter === "mingguan") {
      const weekStart = startOfWeek(now);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      where = { waktuAkses: { gte: weekStart, lte: weekEnd } };
    } else if (filter === "bulanan") {
      where = { waktuAkses: { gte: startOfMonth(now), lte: endOfMonth(now) } };
    } else if (filter === "custom") {
      const startDateStr = sp.get("startDate");
      const endDateStr = sp.get("endDate");
      if (startDateStr && endDateStr) {
        const start = new Date(startDateStr);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDateStr);
        end.setHours(23, 59, 59, 999);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          where = { waktuAkses: { gte: start, lte: end } };
        }
      }
    }

    const logs = await prisma.serverAccessLog.findMany({
      where,
      orderBy: { waktuAkses: "desc" },
      select: {
        id: true,
        namaOrang: true,
        instansi: true,
        namaPic: true,
        keperluan: true,
        jenisAkses: true,
        waktuAkses: true,
        waktuKeluar: true,
        fotoUrl: true,
        ttdUrl: true,
        statusApproval: true,
        approvedBy: true,
        createdAt: true,
        pencatat: { select: { id: true, nama: true, username: true } },
        approver: { select: { id: true, nama: true, username: true } },
      },
    });

    return NextResponse.json({ logs });
  } catch (err) {
    console.error("[GET /api/server-log]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

/** POST /api/server-log — pencatatan tamu oleh Supervisi / IT Support */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }

    let body: Record<string, unknown> | null = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body request tidak valid." }, { status: 400 });
    }

    const namaOrang = typeof body?.namaOrang === "string" ? body.namaOrang.trim() : "";
    const instansi = typeof body?.instansi === "string" ? body.instansi.trim() : "";
    const namaPic = typeof body?.namaPic === "string" ? body.namaPic.trim() : "";
    const keperluan = typeof body?.keperluan === "string" ? body.keperluan.trim() || null : null;
    const fotoUrl = typeof body?.fotoUrl === "string" ? body.fotoUrl.trim() || null : null;
    const ttdUrl = typeof body?.ttdUrl === "string" ? body.ttdUrl.trim() || null : null;
    const isPreRegister = Boolean(body?.isPreRegister) || session.role === "supervisi";

    if (!namaOrang) {
      return NextResponse.json({ error: "Nama orang / tamu wajib diisi." }, { status: 400 });
    }
    if (!instansi) {
      return NextResponse.json({ error: "Nama instansi wajib diisi." }, { status: 400 });
    }

    const userOr = [];
    if (session.sub) userOr.push({ id: session.sub });
    if (session.username) userOr.push({ username: session.username });

    const dbUser = userOr.length > 0
      ? await prisma.user.findFirst({ where: { OR: userOr } })
      : null;

    if (!dbUser || !dbUser.isAktif) {
      return NextResponse.json(
        { error: "Sesi login Anda telah kedaluwarsa. Silakan login kembali." },
        { status: 401 }
      );
    }

    const log = await prisma.serverAccessLog.create({
      data: {
        namaOrang,
        instansi,
        namaPic,
        keperluan,
        jenisAkses: "masuk",
        waktuAkses: new Date(),
        fotoUrl,
        ttdUrl,
        catatanOleh: dbUser.id,
        statusApproval: isPreRegister ? "pre_registered" : "pending",
      },
      select: {
        id: true,
        namaOrang: true,
        instansi: true,
        namaPic: true,
        keperluan: true,
        jenisAkses: true,
        waktuAkses: true,
        waktuKeluar: true,
        fotoUrl: true,
        ttdUrl: true,
        statusApproval: true,
        approvedBy: true,
        createdAt: true,
        pencatat: { select: { id: true, nama: true, username: true } },
        approver: { select: { id: true, nama: true, username: true } },
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/server-log]", err);
    const errMessage = err instanceof Error ? err.message : "Terjadi kesalahan pada server saat membuat log.";
    return NextResponse.json(
      { error: errMessage },
      { status: 500 }
    );
  }
}

/** PATCH /api/server-log — update waktu keluar atau approve */
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }

    let body: Record<string, unknown> | null = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body request tidak valid." }, { status: 400 });
    }

    const id = typeof body?.id === "string" ? body.id : "";
    const action = typeof body?.action === "string" ? body.action : "";

    if (!id) {
      return NextResponse.json({ error: "ID log wajib disertakan." }, { status: 400 });
    }

    const existingLog = await prisma.serverAccessLog.findUnique({ where: { id } });
    if (!existingLog) {
      return NextResponse.json({ error: "Log tidak ditemukan." }, { status: 404 });
    }

    let updatedData: Record<string, unknown> = {};

    if (action === "exit") {
      if (existingLog.waktuKeluar) {
        return NextResponse.json({ error: "Waktu keluar sudah terekam." }, { status: 400 });
      }
      updatedData = { waktuKeluar: new Date() };
    } else if (action === "approve") {
      if (session.role !== "supervisi" && session.role !== "superadmin") {
        return NextResponse.json(
          { error: "Hanya supervisi atau superadmin yang dapat melakukan approval." },
          { status: 403 }
        );
      }
      updatedData = {
        statusApproval: "approved",
        approvedBy: session.sub,
      };
    } else if (action === "edit") {
      if (session.role !== "supervisi" && session.role !== "superadmin") {
        return NextResponse.json(
          { error: "Hanya supervisi atau superadmin yang dapat mengubah data." },
          { status: 403 }
        );
      }
      const namaOrang = typeof body?.namaOrang === "string" ? body.namaOrang.trim() : existingLog.namaOrang;
      const instansi = typeof body?.instansi === "string" ? body.instansi.trim() : existingLog.instansi;
      const namaPic = typeof body?.namaPic === "string" ? body.namaPic.trim() : existingLog.namaPic;
      const keperluan = typeof body?.keperluan === "string" ? body.keperluan.trim() : existingLog.keperluan;
      updatedData = { namaOrang, instansi, namaPic, keperluan };
    } else {
      return NextResponse.json({ error: "Aksi tidak dikenali." }, { status: 400 });
    }

    const log = await prisma.serverAccessLog.update({
      where: { id },
      data: updatedData,
      include: {
        pencatat: { select: { id: true, nama: true, username: true } },
        approver: { select: { id: true, nama: true, username: true } },
      },
    });

    return NextResponse.json({ log });
  } catch (err) {
    console.error("[PATCH /api/server-log]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server saat memperbarui log." },
      { status: 500 }
    );
  }
}

/** DELETE /api/server-log — hapus log akses (Supervisi / Superadmin) */
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID log wajib disertakan." }, { status: 400 });
    }

    const existingLog = await prisma.serverAccessLog.findUnique({ where: { id } });
    if (!existingLog) {
      return NextResponse.json({ error: "Data log tidak ditemukan." }, { status: 404 });
    }

    if (existingLog.statusApproval === "approved") {
      return NextResponse.json(
        { error: "Data log server yang sudah disetujui (Approved) bersifat permanen dan tidak dapat dihapus." },
        { status: 400 }
      );
    }

    await prisma.serverAccessLog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/server-log]", err);
    return NextResponse.json({ error: "Gagal menghapus log." }, { status: 500 });
  }
}
