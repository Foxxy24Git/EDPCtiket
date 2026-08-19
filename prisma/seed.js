const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database users and master cabang...");

  const users = [
    { username: "mtr1", nama: "Afrinaldi", role: "user" },
    { username: "mtr2", nama: "Rian Islami Putra", role: "user" },
    { username: "mtr3", nama: "Kurnia Fajri", role: "user" },
    { username: "mtr4", nama: "Ibnu Sauki", role: "user" },
    { username: "mtr5", nama: "Ridho M R", role: "user" },
    { username: "superadmin", nama: "Super Admin", role: "superadmin" },
    { username: "tio", nama: "Tio Rahmayunda", role: "supervisi" },
    { username: "berto", nama: "Berto L", role: "supervisi" },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.username, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { ...u, passwordHash },
    });
  }
  console.log(`✓ Seeded ${users.length} akun default.`);

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
    if (!existing) {
      await prisma.workstationMaster.create({
        data: item,
      });
    }
  }
  console.log(`✓ Seeded ${cabangList.length} master cabang.`);
}

main()
  .catch((e) => {
    console.error("Gagal melakukan seed database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
