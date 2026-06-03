import { Bell, Menu, Mic, Search, User, VideoIcon, ArrowLeft, Crown } from "lucide-react";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Link from "next/link";
import PremiumModal from "./PremiumModal";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Channeldialogue from "./channeldialogue";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import { useSidebar } from "@/lib/SidebarContext";

const Header = () => {
  const { user, logout, handlegooglesignin } = useUser();
  const { toggle } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const [isdialogeopen, setisdialogeopen] = useState(false);
  const [isMobileSearch, setIsMobileSearch] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileSearch(false); // Close mobile search overlay after search
    }
  };

  const handleKeypress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(e as any);
    }
  };

  // Mobile-only active search layout
  if (isMobileSearch) {
    return (
      <header className="flex items-center justify-between px-3 py-2 bg-background border-b border-border gap-2 h-14">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setIsMobileSearch(false)}
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Button>
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-1.5">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            autoFocus
            onKeyPress={handleKeypress}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-full flex-1 h-9 px-4 border border-border bg-background text-foreground focus-visible:ring-0"
          />
          <Button
            type="submit"
            size="icon"
            className="rounded-full h-9 w-9 bg-muted hover:bg-accent text-foreground border border-border border-l-0"
          >
            <Search className="w-4 h-4" />
          </Button>
        </form>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Mic className="w-4 h-4" />
        </Button>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-background border-b border-border h-14">
      {/* Left logo area */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={toggle}>
          <Menu className="w-5 h-5" />
        </Button>
        <Link href="/" className="flex items-center gap-1">
          <div className="bg-red-600 p-1.5 rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-tight ">YourTube</span>
          <span className="text-[10px] text-gray-400 font-semibold self-start mt-0.5 ml-0.5 hidden sm:inline">IN</span>
        </Link>
      </div>

      {/* Central Search Form (responsive: hidden on mobile) */}
      <form
        onSubmit={handleSearch}
        className="hidden md:flex items-center gap-3 flex-1 max-w-2xl mx-6"
      >
        <div className="flex flex-1 items-center">
          <Input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onKeyPress={handleKeypress}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-l-full border-r-0 focus-visible:ring-0 h-9 bg-background text-foreground"
          />
          <Button
            type="submit"
            className="rounded-r-full px-5 bg-muted hover:bg-accent text-muted-foreground border border-border border-l-0 h-9"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 bg-muted text-foreground hover:bg-accent">
          <Mic className="w-4 h-4" />
        </Button>
      </form>

      {/* Right actions area */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Mobile-only Search Button */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full md:hidden"
          onClick={() => setIsMobileSearch(true)}
        >
          <Search className="w-5 h-5 text-foreground" />
        </Button>

        {(!user || (user.plan !== "gold" && user.plan !== "premium")) && (
          <Button
            onClick={() => setIsPremiumModalOpen(true)}
            className="flex items-center gap-1 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-2 sm:px-3 h-8 shadow-sm mr-1.5"
          >
            <Crown className="w-3.5 h-3.5 fill-white" />
            <span className="hidden sm:inline">Upgrade Plan</span>
          </Button>
        )}

        {user ? (
          <>
            <Button variant="ghost" size="icon" className="rounded-full hidden sm:inline-flex">
              <VideoIcon className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full hidden sm:inline-flex">
              <Bell className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-8 w-8 rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image} />
                    <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  {user?.plan && user.plan !== "free" && (
                    <span className={`absolute -top-1 -right-1 rounded-full p-0.5 border border-white ${
                      user.plan === "gold" || user.plan === "premium" ? "bg-yellow-500" :
                      user.plan === "silver" ? "bg-slate-400" :
                      "bg-amber-600"
                    }`}>
                      <Crown className="w-2.5 h-2.5 text-white fill-white" />
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                {user?.plan && user.plan !== "free" && (
                  <div className={`px-3 py-2 flex items-center gap-1.5 text-xs font-bold border-b border-gray-100 rounded-t-md ${
                    user.plan === "gold" || user.plan === "premium" ? "text-yellow-600 bg-yellow-50" :
                    user.plan === "silver" ? "text-slate-600 bg-slate-100" :
                    "text-amber-700 bg-amber-50"
                  }`}>
                    <Crown className={`w-4 h-4 ${
                      user.plan === "gold" || user.plan === "premium" ? "fill-yellow-600 text-yellow-600" :
                      user.plan === "silver" ? "fill-slate-600 text-slate-600" :
                      "fill-amber-700 text-amber-700"
                    }`} />
                    {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)} Member
                  </div>
                )}
                {(!user?.plan || (user.plan !== "gold" && user.plan !== "premium")) && (
                  <DropdownMenuItem
                    onClick={() => setIsPremiumModalOpen(true)}
                    className="text-red-600 font-bold focus:text-red-700 focus:bg-red-50"
                  >
                    <Crown className="w-4 h-4 mr-2 text-red-600" />
                    Upgrade Plan
                  </DropdownMenuItem>
                )}
                {user?.channelname ? (
                  <DropdownMenuItem asChild>
                    <Link href={`/channel/${user?._id}`}>Your channel</Link>
                  </DropdownMenuItem>
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
                <DropdownMenuItem asChild>
                  <Link href="/downloads">Downloads</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/history">History</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/liked">Liked videos</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/watch-later">Watch later</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <Button
              className="flex items-center gap-1.5 rounded-full border px-3 h-9 text-xs font-semibold bg-background text-foreground border-border hover:bg-accent"
              onClick={handlegooglesignin}
            >
              <User className="w-4 h-4" />
              Sign in
            </Button>
          </>
        )}
      </div>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />
    </header>
  );
};

export default Header;
