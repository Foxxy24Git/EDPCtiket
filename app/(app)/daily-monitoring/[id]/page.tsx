import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getTicketDetail } from "@/lib/ticketQueries";
import { TicketDetailClient } from "@/components/daily-monitoring/TicketDetailClient";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

export default async function TicketDetailPage({ params, searchParams }: Params) {
  const { id } = await params;
  const sParams = await searchParams;
  const session = await requireSession();

  const ticket = await getTicketDetail(id);
  if (!ticket) notFound();

  const isFromWeekly = sParams?.from === "weekly";

  return (
    <TicketDetailClient
      initialTicket={ticket}
      role={session.role}
      currentUserId={session.sub}
      backHref={isFromWeekly ? "/weekly-monitoring" : "/daily-monitoring"}
      backLabel={isFromWeekly ? "Kembali ke Data Tiket" : "Kembali ke Tiket Monitoring"}
      readOnly={isFromWeekly}
    />
  );
}
