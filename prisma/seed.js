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
      update: { nama: u.nama, role: u.role },
      create: { ...u, passwordHash },
    });
  }
  console.log(`✓ Seeded ${users.length} akun default.`);

  const cabangList = [
    { namaCabang: "PAYAKUMBUH", kodeKantor: "001" },
    { namaCabang: "BUKITTINGGI", kodeKantor: "002" },
    { namaCabang: "BATUSANGKAR", kodeKantor: "003" },
    { namaCabang: "SOLOK", kodeKantor: "004" },
    { namaCabang: "PARIAMAN", kodeKantor: "005" },
    { namaCabang: "PAINAN", kodeKantor: "006" },
    { namaCabang: "SIJUNJUNG", kodeKantor: "007" },
    { namaCabang: "LUBUK SIKAPING", kodeKantor: "008" },
    { namaCabang: "PASAR RAYA", kodeKantor: "009" },
    { namaCabang: "SITEBA", kodeKantor: "010" },
    { namaCabang: "SAWAHLUNTO", kodeKantor: "011" },
    { namaCabang: "SIMPANG EMPAT", kodeKantor: "012" },
    { namaCabang: "MUARA LABUH", kodeKantor: "013" },
    { namaCabang: "LUBUK GADANG", kodeKantor: "014" },
    { namaCabang: "KOTO BARU", kodeKantor: "015" },
    { namaCabang: "PULAU PUNJUNG", kodeKantor: "016" },
    { namaCabang: "UJUNG GADING", kodeKantor: "017" },
    { namaCabang: "LUBUK BASUNG", kodeKantor: "018" },
    { namaCabang: "LUBUK ALUNG", kodeKantor: "019" },
    { namaCabang: "TAPAN", kodeKantor: "020" },
    { namaCabang: "LINTAU", kodeKantor: "021" },
    { namaCabang: "CABANG UTAMA", kodeKantor: "022" },
    { namaCabang: "MENTAWAI", kodeKantor: "023" },
    { namaCabang: "TAPUS", kodeKantor: "024" },
    { namaCabang: "ALAHAN PANJANG", kodeKantor: "025" },
    { namaCabang: "PANGKALAN", kodeKantor: "026" },
    { namaCabang: "BALAI SELASA", kodeKantor: "027" },
    { namaCabang: "PULAU PUNJUNG BARAT", kodeKantor: "028" },
    { namaCabang: "JAKARTA", kodeKantor: "029" },
    { namaCabang: "PEKANBARU", kodeKantor: "030" },
    { namaCabang: "BATAM", kodeKantor: "031" },
    { namaCabang: "MEDAN", kodeKantor: "032" },
    { namaCabang: "BANDUNG", kodeKantor: "033" },
    { namaCabang: "SYARIAH PADANG", kodeKantor: "034" },
    { namaCabang: "SYARIAH PAYAKUMBUH", kodeKantor: "035" },
    { namaCabang: "SYARIAH BUKITTINGGI", kodeKantor: "036" },
    { namaCabang: "SYARIAH BATUSANGKAR", kodeKantor: "037" },
    { namaCabang: "PADANG PANJANG", kodeKantor: "038" },
  ];

  await prisma.workstationMaster.createMany({
    data: cabangList,
    skipDuplicates: true,
  });
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
