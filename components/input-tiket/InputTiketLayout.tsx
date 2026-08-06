"use client";

import { useState } from "react";
import { WorkstationForm } from "./WorkstationForm";
import { TodayTicketPanel } from "./TodayTicketPanel";

export function InputTiketLayout() {
  const [refreshSignal, setRefreshSignal] = useState(0);

  const handleSuccess = () => {
    setRefreshSignal((prev) => prev + 1);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
      {/* Kolom Kiri: Form Input */}
      <WorkstationForm onSuccess={handleSuccess} />
      {/* Kolom Kanan: Panel Informasi Hari Ini */}
      <div className="hidden xl:block">
        <TodayTicketPanel refreshSignal={refreshSignal} />
      </div>
    </div>
  );
}
