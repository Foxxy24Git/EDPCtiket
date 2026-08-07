import { PrismaClient, Role, CpTipe, TicketStatus, StatusSupervisi } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedUsers() {
  const users: { username: string; nama: string; role: Role }[] = [
    { username: "mtr1", nama: "Afrinaldi", role: Role.user },
    { username: "mtr2", nama: "Rian Islami Putra", role: Role.user },
    { username: "mtr3", nama: "Kurnia Fajri", role: Role.user },
    { username: "mtr4", nama: "Ibnu Sauki", role: Role.user },
    { username: "mtr5", nama: "Ridho M R", role: Role.user },
    { username: "superadmin", nama: "Super Admin", role: Role.superadmin },
    { username: "tio", nama: "Tio Rahmayunda", role: Role.supervisi },
    { username: "berto", nama: "Berto L", role: Role.supervisi },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.username, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { nama: u.nama, role: u.role },
      create: { ...u, passwordHash },
    });
  }
  console.log(`  users: ${users.length} akun (password = username)`);
}

async function seedWorkstationMaster() {
  const cabangList = [
    { namaCabang: "PAYAKUMBUH", kodeKantor: "0100" },
    { namaCabang: "BUKITTINGGI", kodeKantor: "0200" },
    { namaCabang: "BATUSANGKAR", kodeKantor: "0300" },
    { namaCabang: "SOLOK", kodeKantor: "0600" },
    { namaCabang: "PARIAMAN", kodeKantor: "0500" },
    { namaCabang: "PAINAN", kodeKantor: "0400" },
    { namaCabang: "SIJUNJUNG", kodeKantor: "0700" },
    { namaCabang: "LUBUK SIKAPING", kodeKantor: "0800" },
    { namaCabang: "PASAR RAYA", kodeKantor: "1000" },
    { namaCabang: "SITEBA", kodeKantor: "1005" },
    { namaCabang: "SAWAHLUNTO", kodeKantor: "1100" },
    { namaCabang: "SIMPANG EMPAT", kodeKantor: "1200" },
    { namaCabang: "MUARA LABUH", kodeKantor: "1300" },
    { namaCabang: "LUBUK GADANG", kodeKantor: "1301" },
    { namaCabang: "KOTO BARU", kodeKantor: "1400" },
    { namaCabang: "PULAU PUNJUNG", kodeKantor: "1403" },
    { namaCabang: "UJUNG GADING", kodeKantor: "1500" },
    { namaCabang: "LUBUK BASUNG", kodeKantor: "1600" },
    { namaCabang: "LUBUK ALUNG", kodeKantor: "1700" },
    { namaCabang: "TAPAN", kodeKantor: "1900" },
    { namaCabang: "LINTAU", kodeKantor: "2000" },
    { namaCabang: "CABANG UTAMA", kodeKantor: "2100" },
    { namaCabang: "MENTAWAI", kodeKantor: "2110" },
    { namaCabang: "TAPUS", kodeKantor: "2200" },
    { namaCabang: "ALAHAN PANJANG", kodeKantor: "2300" },
    { namaCabang: "JAKARTA", kodeKantor: "2400" },
    { namaCabang: "PEKANBARU", kodeKantor: "2500" },
    { namaCabang: "BANDUNG", kodeKantor: "2600" },
    { namaCabang: "SYARIAH PADANG", kodeKantor: "7100" },
    { namaCabang: "SYARIAH SOLOK", kodeKantor: "7202" },
    { namaCabang: "SYARIAH PAYAKUMBUH", kodeKantor: "7200" },
    { namaCabang: "SYARIAH BUKITTINGGI", kodeKantor: "7201" },
    { namaCabang: "SYARIAH BATUSANGKAR", kodeKantor: "7203" },
    { namaCabang: "PADANG PANJANG", kodeKantor: "0900" },
  ];

  for (const item of cabangList) {
    const existing = await prisma.workstationMaster.findFirst({
      where: { namaCabang: item.namaCabang },
    });
    if (existing) {
      await prisma.workstationMaster.update({
        where: { id: existing.id },
        data: { kodeKantor: item.kodeKantor },
      });
    } else {
      await prisma.workstationMaster.create({
        data: item,
      });
    }
  }
  console.log(`  workstation_master: ${cabangList.length} cabang Bank Nagari di-seed/update`);
}

async function seedSampleTickets() {
  const count = await prisma.ticket.count();
  if (count > 0) {
    console.log("  tickets: sudah ada data tiket, dilewati");
    return;
  }

  const user = await prisma.user.findFirst({ where: { role: Role.user } });
  if (!user) return;

  const samples = [
    {
      noTiket: "WS-2026-00001",
      wsCabang: "PAYAKUMBUH",
      wsMerekKomputer: "[Komputer - AIO] Lenovo ThinkCentre",
      wsSnKomputer: "WPYB0026269263",
      wsKerusakan: "Layar monitor bergaris dan mati total saat dinyalakan",
      wsKelengkapan: "Adaptor, Kabel Power, Mouse",
      wsNoSurat: "SR/01/PYK/01-2026",
      cpTipe: CpTipe.pic,
      cpNama: "Andi Saputra",
      cpTelp: "081267890011",
      status: TicketStatus.proses,
      statusSupervisi: StatusSupervisi.belum,
      ownerUserId: user.id,
    },
    {
      noTiket: "WS-2026-00002",
      wsCabang: "BUKITTINGGI",
      wsMerekKomputer: "[EDC] Ingenico Move 2500",
      wsSnKomputer: "ING2500-998812",
      wsKerusakan: "Kertas tidak keluar dan layar touchscreen macet",
      wsKelengkapan: "Charger EDC, Kabel USB",
      wsNoSurat: "SR/02/BKT/01-2026",
      cpTipe: CpTipe.wag,
      cpNama: "WAG CS Bukittinggi",
      cpTelp: "",
      status: TicketStatus.selesai,
      statusSupervisi: StatusSupervisi.belum,
      ownerUserId: user.id,
    },
    {
      noTiket: "WS-2026-00003",
      wsCabang: "CABANG UTAMA",
      wsMerekKomputer: "[Komputer - Desktop] HP ProDesk",
      wsSnKomputer: "HPPD-8871239",
      wsKerusakan: "Power supply bunyi dan PC mati sendiri",
      wsKelengkapan: "Unit PC saja",
      wsNoSurat: "SR/05/CU/01-2026",
      cpTipe: CpTipe.pic,
      cpNama: "Rina Wijaya",
      cpTelp: "081398765432",
      status: TicketStatus.selesai,
      statusSupervisi: StatusSupervisi.approved,
      ownerUserId: user.id,
    },
    {
      noTiket: "WS-2026-00004",
      wsCabang: "SOLOK",
      wsMerekKomputer: "[EDC] Verifone VX520",
      wsSnKomputer: "VERI-520-11234",
      wsKerusakan: "Sinyal GPRS mati dan kartu tidak terbaca",
      wsKelengkapan: "Adaptor, Base",
      wsNoSurat: "SR/04/SLK/01-2026",
      cpTipe: CpTipe.pic,
      cpNama: "Budi Santoso",
      cpTelp: "082155443322",
      status: TicketStatus.proses,
      statusSupervisi: StatusSupervisi.belum,
      ownerUserId: user.id,
    },
  ];

  for (const s of samples) {
    const t = await prisma.ticket.create({
      data: {
        ...s,
        wsTanggalMasuk: new Date(),
        activities: {
          create: {
            teks: "Pendataan awal perangkat & pembuatan tiket otomatis",
            userId: user.id,
          },
        },
      },
    });
  }
  console.log(`  tickets: ${samples.length} tiket sampel di-seed`);
}

// Sample JPEG Base64 Data URL untuk foto sampel log server
const sampleFotoAvatar1 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOJM9PDkeODFDZCORQGQzOkjDxub78gAAAAAA";
const sampleFotoAvatar2 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOJM9PDkeODFDZCORQGQzOkjDxub78gAAAAAA";

async function seedServerLogs() {
  const user = await prisma.user.findFirst({ where: { role: "user" } });
  const supervisi = await prisma.user.findFirst({ where: { role: "supervisi" } });
  if (!user) return;

  const now = new Date();

  await prisma.serverAccessLog.createMany({
    data: [
      {
        namaOrang: "Hendra Wijaya (Teknisi PLN)",
        instansi: "PT. PLN (Persero)",
        namaPic: "RUDI HARNO FAZLUR RAHMAN",
        keperluan: "Maintenance Panel Listrik & UPS Server Room",
        jenisAkses: "masuk",
        waktuAkses: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        waktuKeluar: new Date(now.getTime() - 30 * 60 * 1000),
        fotoUrl: sampleFotoAvatar1,
        catatanOleh: user.id,
        statusApproval: "approved",
        approvedBy: supervisi?.id ?? user.id,
      },
      {
        namaOrang: "Budi Pratama (Vendor AC)",
        instansi: "PT. Cold Tech Indonesia",
        namaPic: "DIMAS TEGUH PRIBADI",
        keperluan: "Pengecekan Freon & Pembersihan AC Precision Server",
        jenisAkses: "masuk",
        waktuAkses: new Date(now.getTime() - 45 * 60 * 1000),
        waktuKeluar: null,
        fotoUrl: sampleFotoAvatar2,
        catatanOleh: user.id,
        statusApproval: "pending",
      },
    ],
  });
  console.log(`  server_logs: 2 log akses server dengan foto sampel di-seed`);
}

async function main() {
  console.log("Seeding mtr-Report...");
  await seedUsers();
  await seedWorkstationMaster();
  await seedServerLogs();
  console.log("Selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
