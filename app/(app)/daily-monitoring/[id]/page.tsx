import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getTicketDetail } from "@/lib/ticketQueries";
import { TicketDetailClient } from "@/components/daily-monitoring/TicketDetailClient";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function TicketDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await requireSession();

  const ticket = await getTicketDetail(id);
  if (!ticket) notFound();

  return (
    <TicketDetailClient
      initialTicket={ticket}
      role={session.role}
      currentUserId={session.sub}
    />
  );
}
