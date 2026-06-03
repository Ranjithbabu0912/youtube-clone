import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { SidebarProvider } from "../lib/SidebarContext";
import { useEffect } from "react";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    const checkTheme = async () => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        });
        const parts = formatter.formatToParts(now);
        const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
        const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
        const totalMinutes = hour * 60 + minute;
        
        // 10:00 AM to 12:00 PM IST
        const startMinutes = 10 * 60;
        const endMinutes = 12 * 60;
        const isWithinTimeRange = totalMinutes >= startMinutes && totalMinutes <= endMinutes;

        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        const state = data.region || data.regionName || "";
        
        const southernStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];
        const isSouthIndia = southernStates.some((s) => state.toLowerCase().includes(s.toLowerCase()));

        if (isWithinTimeRange && isSouthIndia) {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("theme", "light");
        } else {
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        }
      } catch (err) {
        console.error("Error setting dynamic theme:", err);
        // Fallback to dark theme
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      }
    };

    checkTheme();
  }, []);

  return (
    <UserProvider>
      <SidebarProvider>
        <div className="min-h-screen bg-background text-foreground flex flex-col transition-colors duration-200">
          <Head>
            <title>Your-Tube Clone</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </Head>
          <Header />
          <Toaster />
          <div className="flex flex-1 relative">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-x-hidden p-4">
              <Component {...pageProps} />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </UserProvider>
  );
}
