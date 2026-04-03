"use client";

import { useEffect } from "react";
import { getStorage } from "@/lib/storage";

export function ThemeInitializer() {
  useEffect(() => {
    const applyTheme = () => {
      const saved = getStorage("theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = saved ? saved === "dark" : systemDark;

      document.documentElement.classList.toggle("dark", isDark);
    };

    applyTheme();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "quran_typing_theme") {
        applyTheme();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("quran-typing-theme-change", applyTheme);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("quran-typing-theme-change", applyTheme);
    };
  }, []);

  return null;
}
