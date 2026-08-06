import "server-only";
import { prisma } from "@/lib/prisma";
import { TicketStatus, StatusSupervisi, CpTipe, Prisma } from "@prisma/client";

export interface TicketListFilter {
  status?: string | null;
  statusSupervisi?: string | null;
  currentUserId?: string | null;
  search?: string | null;
  wsCabang?: string | null;
}

export interface TicketListItem {
  id: string;
  noTiket: string;
  kategori: string;
  waktuOpen: Date;
  waktuSelesai: Date | null;
  status: TicketStatus;
  statusSupervisi: StatusSupervisi;
  wsCabang: string;
  wsCapem: string | null;
  wsTanggalMasuk: Date;
  wsNoSurat: string | null;
  wsMerekKomputer: string | null;
  wsKelengkapan: string | null;
  wsSnKomputer: string | null;
  wsKerusakan: string;
  wsTglKeVendor: Date | null;
  wsVendor: string | null;
  wsTglSelesaiVendor: Date | null;
  wsTglKembaliKeCabang: Date | null;
  wsPicTerima: string | null;
  ownerNama: string;
  ownerUserId: string;
  keterangan: string | null;
  cpTipe: CpTipe;
  cpNama: string;
  cpTelp: string | null;
  lastTeks: string | null;
  lastWaktu: Date | null;
  lastPic: string | null;
}

/** Query daftar tiket workstation. */
export async function listTickets(f: TicketListFilter): Promise<TicketListItem[]> {
  const where: Prisma.TicketWhereInput = {
    kategori: "workstation",
  };

  if (f.status === "proses" || f.status === "selesai") {
    where.status = f.status;
  }
  if (f.statusSupervisi === "belum" || f.statusSupervisi === "approved") {
    where.statusSupervisi = f.statusSupervisi;
  }
  if (f.currentUserId) {
    where.ownerUserId = f.currentUserId;
  }
  if (f.wsCabang?.trim()) {
    where.wsCabang = f.wsCabang.trim();
  }

  const search = f.search?.trim();
  if (search) {
    where.OR = [
      { noTiket: { contains: search, mode: "insensitive" } },
      { wsCabang: { contains: search, mode: "insensitive" } },
      { wsMerekKomputer: { contains: search, mode: "insensitive" } },
      { wsKerusakan: { contains: search, mode: "insensitive" } },
      { wsNoSurat: { contains: search, mode: "insensitive" } },
      { wsVendor: { contains: search, mode: "insensitive" } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { waktuOpen: "desc" },
    include: {
      owner: { select: { nama: true } },
      activities: {
        orderBy: { waktu: "desc" },
        take: 1,
        select: { teks: true, waktu: true, user: { select: { nama: true } } },
      },
    },
  });

  return tickets.map((t) => {
    const last = t.activities[0] ?? null;
    return {
      id: t.id,
      noTiket: t.noTiket,
      kategori: t.kategori,
      waktuOpen: t.waktuOpen,
      waktuSelesai: t.waktuSelesai,
      status: t.status,
      statusSupervisi: t.statusSupervisi,
      wsCabang: t.wsCabang,
      wsCapem: t.wsCapem,
      wsTanggalMasuk: t.wsTanggalMasuk,
      wsNoSurat: t.wsNoSurat,
      wsMerekKomputer: t.wsMerekKomputer,
      wsKelengkapan: t.wsKelengkapan,
      wsSnKomputer: t.wsSnKomputer,
      wsKerusakan: t.wsKerusakan,
      wsTglKeVendor: t.wsTglKeVendor,
      wsVendor: t.wsVendor,
      wsTglSelesaiVendor: t.wsTglSelesaiVendor,
      wsTglKembaliKeCabang: t.wsTglKembaliKeCabang,
      wsPicTerima: t.wsPicTerima,
      ownerNama: t.owner.nama,
      ownerUserId: t.ownerUserId,
      keterangan: t.keterangan,
      cpTipe: t.cpTipe,
      cpNama: t.cpNama,
      cpTelp: t.cpTelp,
      lastTeks: last?.teks ?? null,
      lastWaktu: last?.waktu ?? null,
      lastPic: last?.user.nama ?? null,
    };
  });
}

export interface WorkstationWeeklyFilter {
  from: Date;
  to: Date;
  cabang?: string | null;
  status?: string | null;
  search?: string | null;
}

/** Query riwayat tiket Workstation untuk Weekly Monitoring. */
export async function listWorkstationWeeklyTickets(
  f: WorkstationWeeklyFilter
): Promise<TicketListItem[]> {
  const where: Prisma.TicketWhereInput = {
    kategori: "workstation",
    waktuOpen: { gte: f.from, lte: f.to },
  };

  if (f.cabang?.trim()) {
    where.wsCabang = f.cabang.trim();
  }
  if (f.status === "proses" || f.status === "selesai") {
    where.status = f.status;
  }

  const search = f.search?.trim();
  if (search) {
    where.OR = [
      { noTiket: { contains: search, mode: "insensitive" } },
      { wsCabang: { contains: search, mode: "insensitive" } },
      { wsMerekKomputer: { contains: search, mode: "insensitive" } },
      { wsNoSurat: { contains: search, mode: "insensitive" } },
      { wsKerusakan: { contains: search, mode: "insensitive" } },
      { wsVendor: { contains: search, mode: "insensitive" } },
      { wsSnKomputer: { contains: search, mode: "insensitive" } },
    ];
  }

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { waktuOpen: "desc" },
    include: {
      owner: { select: { nama: true } },
      activities: {
        orderBy: { waktu: "desc" },
        take: 1,
        select: { teks: true, waktu: true, user: { select: { nama: true } } },
      },
    },
  });

  return tickets.map((t) => {
    const last = t.activities[0] ?? null;
    return {
      id: t.id,
      noTiket: t.noTiket,
      kategori: t.kategori,
      waktuOpen: t.waktuOpen,
      waktuSelesai: t.waktuSelesai,
      status: t.status,
      statusSupervisi: t.statusSupervisi,
      wsCabang: t.wsCabang,
      wsCapem: t.wsCapem,
      wsTanggalMasuk: t.wsTanggalMasuk,
      wsNoSurat: t.wsNoSurat,
      wsMerekKomputer: t.wsMerekKomputer,
      wsKelengkapan: t.wsKelengkapan,
      wsSnKomputer: t.wsSnKomputer,
      wsKerusakan: t.wsKerusakan,
      wsTglKeVendor: t.wsTglKeVendor,
      wsVendor: t.wsVendor,
      wsTglSelesaiVendor: t.wsTglSelesaiVendor,
      wsTglKembaliKeCabang: t.wsTglKembaliKeCabang,
      wsPicTerima: t.wsPicTerima,
      ownerNama: t.owner.nama,
      ownerUserId: t.ownerUserId,
      keterangan: t.keterangan,
      cpTipe: t.cpTipe,
      cpNama: t.cpNama,
      cpTelp: t.cpTelp,
      lastTeks: last?.teks ?? null,
      lastWaktu: last?.waktu ?? null,
      lastPic: last?.user.nama ?? null,
    };
  });
}

/** Total tiket workstation dalam rentang tanggal. */
export async function countWeeklyTickets(range: { from: Date; to: Date }): Promise<number> {
  return prisma.ticket.count({
    where: {
      kategori: "workstation",
      waktuOpen: { gte: range.from, lte: range.to },
    },
  });
}

export interface TicketActivityItem {
  id: string;
  waktu: Date;
  teks: string;
  userId: string;
  userNama: string;
}

export interface TicketDetail {
  id: string;
  noTiket: string;
  kategori: string;
  status: TicketStatus;
  statusSupervisi: StatusSupervisi;
  waktuOpen: Date;
  waktuSelesai: Date | null;
  cpTipe: CpTipe;
  cpNama: string;
  cpTelp: string | null;
  jenisGangguan: string;
  sumberPenyebab: string;
  metodePenanganan: string;
  wsCabang: string;
  wsTanggalMasuk: Date;
  wsNoSurat: string | null;
  wsMerekKomputer: string | null;
  wsCapem: string | null;
  wsKelengkapan: string | null;
  wsSnKomputer: string | null;
  wsKerusakan: string;
  wsTglKeVendor: Date | null;
  wsVendor: string | null;
  wsTglSelesaiVendor: Date | null;
  wsTglKembaliKeCabang: Date | null;
  wsPicTerima: string | null;
  ownerId: string;
  ownerNama: string;
  keterangan: string | null;
  activities: TicketActivityItem[];
}

/** Detail satu tiket workstation beserta log kronologis. */
export async function getTicketDetail(id: string): Promise<TicketDetail | null> {
  const t = await prisma.ticket.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, nama: true } },
      activities: {
        orderBy: { waktu: "asc" },
        include: { user: { select: { nama: true } } },
      },
    },
  });
  if (!t) return null;

  return {
    id: t.id,
    noTiket: t.noTiket,
    kategori: t.kategori,
    status: t.status,
    statusSupervisi: t.statusSupervisi,
    waktuOpen: t.waktuOpen,
    waktuSelesai: t.waktuSelesai,
    cpTipe: t.cpTipe,
    cpNama: t.cpNama,
    cpTelp: t.cpTelp,
    jenisGangguan: t.jenisGangguan,
    sumberPenyebab: t.sumberPenyebab,
    metodePenanganan: t.metodePenanganan,
    wsCabang: t.wsCabang,
    wsTanggalMasuk: t.wsTanggalMasuk,
    wsNoSurat: t.wsNoSurat,
    wsMerekKomputer: t.wsMerekKomputer,
    wsCapem: t.wsCapem,
    wsKelengkapan: t.wsKelengkapan,
    wsSnKomputer: t.wsSnKomputer,
    wsKerusakan: t.wsKerusakan,
    wsTglKeVendor: t.wsTglKeVendor,
    wsVendor: t.wsVendor,
    wsTglSelesaiVendor: t.wsTglSelesaiVendor,
    wsTglKembaliKeCabang: t.wsTglKembaliKeCabang,
    wsPicTerima: t.wsPicTerima,
    ownerId: t.owner.id,
    ownerNama: t.owner.nama,
    keterangan: t.keterangan,
    activities: t.activities.map((a) => ({
      id: a.id,
      waktu: a.waktu,
      teks: a.teks,
      userId: a.userId,
      userNama: a.user.nama,
    })),
  };
}
