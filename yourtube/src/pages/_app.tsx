import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { SidebarProvider } from "../lib/SidebarContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <SidebarProvider>
        <div className="min-h-screen bg-white text-black flex flex-col">
          <title>Your-Tube Clone</title>
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
