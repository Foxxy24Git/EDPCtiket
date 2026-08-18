import "server-only";
import type { Ticket } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionPayload } from "@/lib/jwt";

export type GuardResult =
  | { ok: true; ticket: Ticket }
  | { ok: false; status: number; error: string };

/**
 * Izin mutasi tiket (update kegiatan, close, dsb).
 * Supervisi hanya boleh meng-approve — tidak boleh mengubah rincian teknis.
 * Hanya pemilik tiket atau Super Admin yang dapat mengubah tiket ini.
 */
export async function guardTicketMutation(
  session: SessionPayload,
  ticketId: string
): Promise<GuardResult> {
  if (session.role === "supervisi") {
    return { ok: false, status: 403, error: "Supervisi tidak dapat mengubah tiket." };
  }
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) {
    return { ok: false, status: 404, error: "Tiket tidak ditemukan." };
  }
  const isOwner = ticket.ownerUserId === session.sub;
  const isSuperAdmin = session.role === "superadmin";
  if (!isOwner && !isSuperAdmin) {
    return {
      ok: false,
      status: 403,
      error: "Hanya pemilik tiket atau Superadmin yang dapat mengubah tiket ini.",
    };
  }
  return { ok: true, ticket };
}
