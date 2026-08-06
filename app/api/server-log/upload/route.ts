import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { saveImageUpload } from "@/lib/upload";

/** POST /api/server-log/upload — upload foto akses server */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "FormData tidak valid." }, { status: 400 });
  }

  const file = formData.get("file");
  const result = await saveImageUpload(file, "foto", `server-log-${session.sub}`);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ url: result.url });
}
