import "server-only";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface BranchStat {
  cabang: string;
  count: number;
}

export interface BrandStat {
  merek: string;
  count: number;
}

export interface DailyTrend {
  date: string; // "YYYY-MM-DD"
  count: number;
}

export interface DashboardData {
  counts: {
    total: number;
    proses: number;
    selesai: number;
    avgDaysToComplete: number; // avg days from open to selesai
  };
  openTickets: {
    id: string;
    noTiket: string;
    wsCabang: string;
    wsMerekKomputer: string | null;
    waktuOpen: Date;
    ownerNama: string;
  }[];
  recentTickets: {
    id: string;
    noTiket: string;
    wsCabang: string;
    wsMerekKomputer: string | null;
    waktuOpen: Date;
    ownerNama: string;
  }[];
  branchStats: BranchStat[];
  brandStats: BrandStat[];
  dailyTrend: DailyTrend[];
  generatedAt: string;
}

export async function getDashboardData(): Promise<DashboardData> {
  const last30days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const whereTotal: Prisma.TicketWhereInput = { kategori: "workstation" };
  const whereProses: Prisma.TicketWhereInput = { kategori: "workstation", status: "proses" };
  const whereSelesai: Prisma.TicketWhereInput = {
    kategori: "workstation",
    status: "selesai",
  };

  const [total, proses, selesai, openList, recentList, completedTickets, allTickets] =
    await Promise.all([
      prisma.ticket.count({ where: whereTotal }),
      prisma.ticket.count({ where: whereProses }),
      prisma.ticket.count({ where: whereSelesai }),
      prisma.ticket.findMany({
        where: whereProses,
        orderBy: { waktuOpen: "desc" },
        select: {
          id: true,
          noTiket: true,
          wsCabang: true,
          wsMerekKomputer: true,
          waktuOpen: true,
          owner: { select: { nama: true } },
        },
      }),
      prisma.ticket.findMany({
        where: {
          kategori: "workstation",
          waktuOpen: { gte: last30days },
        },
        orderBy: { waktuOpen: "desc" },
        select: {
          id: true,
          noTiket: true,
          wsCabang: true,
          wsMerekKomputer: true,
          waktuOpen: true,
          owner: { select: { nama: true } },
        },
      }),
      // For avg completion time
      prisma.ticket.findMany({
        where: {
          kategori: "workstation",
          status: "selesai",
          waktuSelesai: { not: null },
          waktuOpen: { gte: last30days },
        },
        select: { waktuOpen: true, waktuSelesai: true },
      }),
      // For branch & brand stats (last 90 days)
      prisma.ticket.findMany({
        where: {
          kategori: "workstation",
          waktuOpen: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        select: { wsCabang: true, wsMerekKomputer: true, waktuOpen: true },
      }),
    ]);

  // Calculate avg completion days
  let avgDaysToComplete = 0;
  if (completedTickets.length > 0) {
    const totalMs = completedTickets.reduce((sum, t) => {
      const ms = (t.waktuSelesai!.getTime() - t.waktuOpen.getTime());
      return sum + ms;
    }, 0);
    avgDaysToComplete = Math.round((totalMs / completedTickets.length) / (1000 * 60 * 60 * 24) * 10) / 10;
  }

  // Branch stats
  const branchMap = new Map<string, number>();
  for (const t of allTickets) {
    branchMap.set(t.wsCabang, (branchMap.get(t.wsCabang) ?? 0) + 1);
  }
  const branchStats: BranchStat[] = Array.from(branchMap.entries())
    .map(([cabang, count]) => ({ cabang, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Brand & Device stats (Komputer vs Mesin EDC)
  const brandMap = new Map<string, number>();
  for (const t of allTickets) {
    if (t.wsMerekKomputer) {
      const raw = t.wsMerekKomputer.trim();
      let label = raw;
      if (raw.startsWith("[EDC]")) {
        label = "Mesin EDC";
      } else if (raw.includes("]")) {
        const afterBracket = raw.split("]")[1]?.trim();
        label = afterBracket || "Komputer";
      }
      brandMap.set(label, (brandMap.get(label) ?? 0) + 1);
    }
  }
  const brandStats: BrandStat[] = Array.from(brandMap.entries())
    .map(([merek, count]) => ({ merek, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Daily trend (last 30 days)
  const dateMap = new Map<string, number>();
  for (const t of recentList) {
    const dateKey = t.waktuOpen.toISOString().split("T")[0];
    dateMap.set(dateKey, (dateMap.get(dateKey) ?? 0) + 1);
  }
  // Fill all 30 days (including zeros)
  const dailyTrend: DailyTrend[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    dailyTrend.push({ date: key, count: dateMap.get(key) ?? 0 });
  }

  return {
    counts: { total, proses, selesai, avgDaysToComplete },
    openTickets: openList.map((t) => ({
      id: t.id,
      noTiket: t.noTiket,
      wsCabang: t.wsCabang,
      wsMerekKomputer: t.wsMerekKomputer,
      waktuOpen: t.waktuOpen,
      ownerNama: t.owner.nama,
    })),
    recentTickets: recentList.map((t) => ({
      id: t.id,
      noTiket: t.noTiket,
      wsCabang: t.wsCabang,
      wsMerekKomputer: t.wsMerekKomputer,
      waktuOpen: t.waktuOpen,
      ownerNama: t.owner.nama,
    })),
    branchStats,
    brandStats,
    dailyTrend,
    generatedAt: new Date().toISOString(),
  };
}
