import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "master_options.json");

const DEFAULT_OPTIONS = {
  merekKomputer: ["Lenovo", "HP", "Dell", "Acer", "Asus", "Apple", "Fujitsu"],
  merekEdc: ["Ingenico", "Verifone", "Pax", "Sunmi", "MoreFun", "Castle"],
  vendorList: ["PT Infomedia", "Vendor Lenovo", "PT Multipolar", "Vendor HP", "PT Visionet"],
  deviceTypes: [
    { id: "workstation", nama: "Workstation / Komputer", subtypes: ["Desktop", "All in One", "Mini PC", "Laptop"] },
    { id: "edc", nama: "Mesin EDC", subtypes: [] }
  ]
};

/** Membaca master options dari DB (dengan fallback ke JSON/Defaults) */
async function getMasterOptionsFromDb() {
  try {
    const rows = await prisma.masterOption.findMany();
    const map: Record<string, unknown> = {};
    for (const r of rows) {
      try {
        map[r.key] = JSON.parse(r.value);
      } catch {
        map[r.key] = null;
      }
    }

    const merekKomputer =
      Array.isArray(map.merekKomputer) && map.merekKomputer.length > 0
        ? map.merekKomputer
        : DEFAULT_OPTIONS.merekKomputer;
    const merekEdc =
      Array.isArray(map.merekEdc) && map.merekEdc.length > 0
        ? map.merekEdc
        : DEFAULT_OPTIONS.merekEdc;
    const vendorList =
      Array.isArray(map.vendorList) && map.vendorList.length > 0
        ? map.vendorList
        : DEFAULT_OPTIONS.vendorList;
    const deviceTypes =
      Array.isArray(map.deviceTypes) && map.deviceTypes.length > 0
        ? map.deviceTypes
        : DEFAULT_OPTIONS.deviceTypes;

    return { merekKomputer, merekEdc, vendorList, deviceTypes };
  } catch (e) {
    console.error("Gagal membaca master_options dari database, fallback ke JSON:", e);
    // Fallback file
    try {
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, "utf-8");
        const json = JSON.parse(content);
        return {
          merekKomputer: json.merekKomputer || DEFAULT_OPTIONS.merekKomputer,
          merekEdc: json.merekEdc || DEFAULT_OPTIONS.merekEdc,
          vendorList: json.vendorList || DEFAULT_OPTIONS.vendorList,
          deviceTypes: json.deviceTypes || DEFAULT_OPTIONS.deviceTypes
        };
      }
    } catch {}
    return DEFAULT_OPTIONS;
  }
}

/** Menyimpan master options ke DB & File JSON */
async function saveMasterOptionsToDb(data: typeof DEFAULT_OPTIONS) {
  try {
    await Promise.all([
      prisma.masterOption.upsert({
        where: { key: "merekKomputer" },
        update: { value: JSON.stringify(data.merekKomputer) },
        create: { key: "merekKomputer", value: JSON.stringify(data.merekKomputer) },
      }),
      prisma.masterOption.upsert({
        where: { key: "merekEdc" },
        update: { value: JSON.stringify(data.merekEdc) },
        create: { key: "merekEdc", value: JSON.stringify(data.merekEdc) },
      }),
      prisma.masterOption.upsert({
        where: { key: "vendorList" },
        update: { value: JSON.stringify(data.vendorList) },
        create: { key: "vendorList", value: JSON.stringify(data.vendorList) },
      }),
      prisma.masterOption.upsert({
        where: { key: "deviceTypes" },
        update: { value: JSON.stringify(data.deviceTypes) },
        create: { key: "deviceTypes", value: JSON.stringify(data.deviceTypes) },
      }),
    ]);
  } catch (e) {
    console.error("Gagal menyimpan master_options ke DB:", e);
  }

  // Juga simpan ke file JSON sebagai cadangan
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Gagal menulis master_options.json:", e);
  }
}

/** GET /api/master-options — mengambil opsi master list (Merek, Vendor & DeviceTypes) dari database */
export async function GET() {
  const options = await getMasterOptionsFromDb();
  return NextResponse.json(options);
}

/** POST /api/master-options — memperbarui opsi master list (khusus superadmin) */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Hanya Super Admin yang dapat mengubah data master." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const current = await getMasterOptionsFromDb();

  const merekKomputer = Array.isArray(body.merekKomputer) ? body.merekKomputer : current.merekKomputer;
  const merekEdc = Array.isArray(body.merekEdc) ? body.merekEdc : current.merekEdc;
  const vendorList = Array.isArray(body.vendorList) ? body.vendorList : current.vendorList;
  const deviceTypes = Array.isArray(body.deviceTypes) ? body.deviceTypes : current.deviceTypes;

  const updated = { merekKomputer, merekEdc, vendorList, deviceTypes };
  await saveMasterOptionsToDb(updated);

  return NextResponse.json({ ok: true, options: updated });
}
