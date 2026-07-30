"use client";

import { useEffect } from "react";

export function TimezoneSync() {
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) return;
    fetch("/api/settings/timezone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ timezone }),
    }).catch(() => undefined);
  }, []);
  return null;
}
