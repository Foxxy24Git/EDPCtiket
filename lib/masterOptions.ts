import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "master_options.json");

export { DAFTAR_CABANG_BANK_NAGARI } from "@/lib/constants";

const DEFAULT_DEVICE_TYPES = [
  { id: "workstation", nama: "Workstation / Komputer", subtypes: ["Desktop", "All in One", "Mini PC", "Laptop"] },
  { id: "edc", nama: "Mesin EDC", subtypes: [] },
];

/** Membaca daftar nama jenis perangkat dari DB (dengan fallback ke file JSON) */
export async function getDeviceTypeNamesFromDb(): Promise<string[]> {
  try {
    const row = await prisma.masterOption.findUnique({
      where: { key: "deviceTypes" },
    });

    if (row && row.value) {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((d: { nama: string }) => d.nama);
      }
    }
  } catch (e) {
    console.error("Gagal membaca deviceTypes dari database:", e);
  }

  // Fallback ke file JSON data/master_options.json
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const json = JSON.parse(content);
      if (json.deviceTypes && Array.isArray(json.deviceTypes) && json.deviceTypes.length > 0) {
        return json.deviceTypes.map((d: { nama: string }) => d.nama);
      }
    }
  } catch {}

  return DEFAULT_DEVICE_TYPES.map((d) => d.nama);
}
