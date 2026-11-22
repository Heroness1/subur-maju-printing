"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const WORKER_URL = (process.env.NEXT_PUBLIC_SALESHUB_API_URL || "").replace(/\/$/, "");
const VISITOR_KEY = "smp_visitor_id_v1";
const SESSION_KEY = "smp_visitor_session_v1";

function makeId() {
  try { if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID(); } catch {}
  return "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 14);
}

function storedId(storage, key) {
  try {
    let value = storage.getItem(key);
    if (!value) { value = makeId(); storage.setItem(key, value); }
    return value;
  } catch {
    return makeId();
  }
}

export default function VisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef("");

  useEffect(() => {
    if (!WORKER_URL || !pathname || lastTrackedPath.current === pathname) return;
    // Never count internal CRM pages or API routes as public website traffic.
    if (pathname.startsWith("/sales-hub") || pathname.startsWith("/saleshub") || pathname.startsWith("/api")) return;

    lastTrackedPath.current = pathname;
    let visitorId;
    let sessionId;
    try {
      visitorId = storedId(window.localStorage, VISITOR_KEY);
      sessionId = storedId(window.sessionStorage, SESSION_KEY);
    } catch {
      visitorId = makeId();
      sessionId = makeId();
    }

    const url = new URL(window.location.href);
    const payload = {
      event_id: makeId(),
      visitor_id: visitorId,
      session_id: sessionId,
      page_path: pathname,
      page_title: document.title || "",
      referrer: document.referrer || "",
      utm_source: url.searchParams.get("utm_source") || "",
      utm_medium: url.searchParams.get("utm_medium") || "",
      utm_campaign: url.searchParams.get("utm_campaign") || "",
      utm_content: url.searchParams.get("utm_content") || "",
      utm_term: url.searchParams.get("utm_term") || "",
      gclid: url.searchParams.get("gclid") || "",
      gbraid: url.searchParams.get("gbraid") || "",
      wbraid: url.searchParams.get("wbraid") || "",
    };

    fetch(WORKER_URL + "/api/intake/page-view", {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit",
    }).catch(() => {
      // Analytics must never interrupt the visitor's browsing experience.
    });
  }, [pathname]);

  return null;
}
