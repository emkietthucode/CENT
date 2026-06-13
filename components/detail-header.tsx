"use client";

import { useState } from "react";
import { Header } from "./header";
import { LogModal } from "./log-modal";

export function DetailHeader() {
  const [logModalOpen, setLogModalOpen] = useState(false);

  return (
    <>
      <Header
        searchQuery=""
        onSearchChange={(q) => {
          window.location.href = `/?search=${encodeURIComponent(q)}`;
        }}
        onLogClick={() => setLogModalOpen(true)}
      />
      <LogModal
        open={logModalOpen}
        onOpenChange={setLogModalOpen}
        onSaved={() => {
          // Reload page to reflect new log entries or updates
          window.location.reload();
        }}
      />
    </>
  );
}
