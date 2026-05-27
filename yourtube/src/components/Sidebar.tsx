import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Download,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import { useUser } from "@/lib/AuthContext";
import { useSidebar } from "@/lib/SidebarContext";

const Sidebar = () => {
  const { user } = useUser();
  const { isOpen, setOpen } = useSidebar();
  const [isdialogeopen, setisdialogeopen] = useState(false);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`bg-white border-r transition-all duration-200 p-2 z-40 min-h-screen flex-shrink-0
          ${isOpen
            ? "w-64 fixed inset-y-0 left-0 md:relative md:translate-x-0"
            : "w-0 -translate-x-full md:w-16 md:translate-x-0 overflow-hidden md:block"
          }
        `}
      >
        {isOpen ? (
          <nav className="space-y-1">
            <Link href="/">
              <Button variant="ghost" className="w-full justify-start">
                <Home className="w-5 h-5 mr-3" />
                Home
              </Button>
            </Link>
            <Link href="/explore">
              <Button variant="ghost" className="w-full justify-start">
                <Compass className="w-5 h-5 mr-3" />
                Explore
              </Button>
            </Link>
            <Link href="/subscriptions">
              <Button variant="ghost" className="w-full justify-start">
                <PlaySquare className="w-5 h-5 mr-3" />
                Subscriptions
              </Button>
            </Link>

            {user && (
              <>
                <div className="border-t pt-2 mt-2">
                  <Link href="/history">
                    <Button variant="ghost" className="w-full justify-start">
                      <History className="w-5 h-5 mr-3" />
                      History
                    </Button>
                  </Link>
                  <Link href="/liked">
                    <Button variant="ghost" className="w-full justify-start">
                      <ThumbsUp className="w-5 h-5 mr-3" />
                      Liked videos
                    </Button>
                  </Link>
                  <Link href="/watch-later">
                    <Button variant="ghost" className="w-full justify-start">
                      <Clock className="w-5 h-5 mr-3" />
                      Watch later
                    </Button>
                  </Link>
                  <Link href="/downloads">
                    <Button variant="ghost" className="w-full justify-start">
                      <Download className="w-5 h-5 mr-3" />
                      Downloads
                    </Button>
                  </Link>
                  {user?.channelname ? (
                    <Link href={`/channel/${user.id}`}>
                      <Button variant="ghost" className="w-full justify-start">
                        <User className="w-5 h-5 mr-3" />
                        Your channel
                      </Button>
                    </Link>
                  ) : (
                    <div className="px-2 py-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={() => setisdialogeopen(true)}
                      >
                        Create Channel
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>
        ) : (
          /* Mini (Collapsed) Sidebar Menu */
          <nav className="space-y-3 flex flex-col items-center pt-2">
            <Link
              href="/"
              className="flex flex-col items-center gap-1.5 text-[9px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black w-full py-3 rounded-lg transition-colors"
              title="Home"
            >
              <Home className="w-5 h-5" />
              <span>Home</span>
            </Link>
            <Link
              href="/explore"
              className="flex flex-col items-center gap-1.5 text-[9px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black w-full py-3 rounded-lg transition-colors"
              title="Explore"
            >
              <Compass className="w-5 h-5" />
              <span>Explore</span>
            </Link>
            <Link
              href="/subscriptions"
              className="flex flex-col items-center gap-1.5 text-[9px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black w-full py-3 rounded-lg transition-colors"
              title="Subscriptions"
            >
              <PlaySquare className="w-5 h-5" />
              <span>Subs</span>
            </Link>
            {user && (
              <>
                <Link
                  href="/history"
                  className="flex flex-col items-center gap-1.5 text-[9px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black w-full py-3 rounded-lg transition-colors"
                  title="History"
                >
                  <History className="w-5 h-5" />
                  <span>History</span>
                </Link>
                <Link
                  href="/downloads"
                  className="flex flex-col items-center gap-1.5 text-[9px] font-medium text-gray-700 hover:bg-gray-100 hover:text-black w-full py-3 rounded-lg transition-colors"
                  title="Downloads"
                >
                  <Download className="w-5 h-5" />
                  <span>Downloads</span>
                </Link>
              </>
            )}
          </nav>
        )}
      </aside>

      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </>
  );
};

export default Sidebar;
