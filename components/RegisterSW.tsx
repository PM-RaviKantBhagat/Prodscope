"use client";

import { useEffect } from "react";

/** Registers the service worker so the site can be installed as an app and opens offline. */
export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
