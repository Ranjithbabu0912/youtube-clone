"use client";

import { useRef, useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "./ui/button";
import PremiumModal from "./PremiumModal";
import {
  Crown,
  AlertTriangle,
  Play,
  Pause,
  FastForward,
  Rewind,
  SkipForward,
  MessageSquare,
  X,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { getMediaUrl } from "@/lib/utils";
import { useRouter } from "next/router";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  allVideos?: Array<{
    _id: string;
    videotitle: string;
    filepath: string;
  }>;
}

export default function VideoPlayer({ video, allVideos }: VideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user, login, handlegooglesignin } = useUser();

  // HUD state for gesture animations
  const [hudMessage, setHudMessage] = useState<{
    text: string;
    icon: "play" | "pause" | "forward" | "backward" | "skip" | "comments" | "close" | null;
    visible: boolean;
  }>({ text: "", icon: null, visible: false });

  // Refs for gesture detection
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tapCountRef = useRef(0);
  const lastZoneRef = useRef<"left" | "center" | "right" | null>(null);

  // HUD timer
  useEffect(() => {
    if (hudMessage.visible) {
      const timer = setTimeout(() => {
        setHudMessage((prev) => ({ ...prev, visible: false }));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [hudMessage.visible]);

  // Clean up gesture timer on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  const triggerHud = (text: string, icon: typeof hudMessage.icon) => {
    setHudMessage({ text, icon, visible: true });
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch((err) => console.error("Error playing video:", err));
      triggerHud("Playing", "play");
    } else {
      videoRef.current.pause();
      triggerHud("Paused", "pause");
    }
  };

  const seekVideo = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    if (seconds > 0) {
      triggerHud("+10s Forward", "forward");
    } else {
      triggerHud("-10s Backward", "backward");
    }
  };

  const handleNextVideo = () => {
    triggerHud("Skipping Video...", "skip");
    if (!allVideos || allVideos.length === 0) {
      toast.error("No other videos available.");
      return;
    }
    const currentIndex = allVideos.findIndex((v: any) => v._id === video._id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % allVideos.length;
    const nextVideo = allVideos[nextIndex];
    if (nextVideo) {
      setTimeout(() => {
        router.push(`/watch/${nextVideo._id}`);
      }, 500);
    }
  };

  const scrollToComments = () => {
    triggerHud("Opening Comments...", "comments");
    setTimeout(() => {
      const commentsEl = document.getElementById("comments-section");
      if (commentsEl) {
        commentsEl.scrollIntoView({ behavior: "smooth" });
        const textarea = commentsEl.querySelector("textarea");
        if (textarea) textarea.focus();
      } else {
        window.scrollTo({
          top: document.body.scrollHeight / 2,
          behavior: "smooth",
        });
      }
    }, 450);
  };

  const closeWebsite = () => {
    triggerHud("Closing Website...", "close");
    setTimeout(() => {
      try {
        window.close();
      } catch (err) {
        console.error("Window close blocked by browser settings:", err);
      }
      toast.info("Gesture close requested. Redirecting...");
      setTimeout(() => {
        window.location.href = "about:blank";
      }, 300);
    }, 800);
  };

  const handlePlayerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    let zone: "left" | "center" | "right" = "center";
    if (x < width * 0.35) {
      zone = "left";
    } else if (x > width * 0.65) {
      zone = "right";
    }

    if (lastZoneRef.current !== zone) {
      tapCountRef.current = 0;
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
    }

    lastZoneRef.current = zone;
    tapCountRef.current += 1;

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    tapTimeoutRef.current = setTimeout(() => {
      const finalCount = tapCountRef.current;
      const finalZone = lastZoneRef.current;

      tapCountRef.current = 0;
      lastZoneRef.current = null;
      tapTimeoutRef.current = null;

      if (finalZone === "center") {
        if (finalCount === 1) {
          togglePlayPause();
        } else if (finalCount === 3) {
          handleNextVideo();
        }
      } else if (finalZone === "left") {
        if (finalCount === 2) {
          seekVideo(-10);
        } else if (finalCount === 3) {
          scrollToComments();
        }
      } else if (finalZone === "right") {
        if (finalCount === 2) {
          seekVideo(10);
        } else if (finalCount === 3) {
          closeWebsite();
        }
      }
    }, 280);
  };

  const [watchTime, setWatchTime] = useState(0);
  const [limit, setLimit] = useState(300); // Default 5 mins (300 seconds)
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // Autoplay video on source load/change
  useEffect(() => {
    if (isLimitReached) return;
    if (videoRef.current && video?.filepath) {
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log("Autoplay was prevented by browser:", error);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video?.filepath]);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsyncedTimeRef = useRef(0);
  const watchTimeRef = useRef(0); // keep a ref for interval sync because state closes over values

  // Update watchTimeRef whenever state changes
  useEffect(() => {
    watchTimeRef.current = watchTime;
  }, [watchTime]);

  // Load limit and watchTime based on user plan
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    let userLimit = 300; // Free / Guest = 5 mins (300s)
    let currentWatch = 0;

    if (user) {
      if (user.plan === "gold" || user.plan === "premium") {
        userLimit = Infinity;
      } else if (user.plan === "silver") {
        userLimit = 600; // 10 mins (600s)
      } else if (user.plan === "bronze") {
        userLimit = 420; // 7 mins (420s)
      } else {
        userLimit = 300;
      }

      if (user.lastActiveDate === today) {
        currentWatch = user.watchTime || 0;
      }
    } else {
      // Guest logic
      const guestDate = localStorage.getItem("guest_watch_date");
      if (guestDate === today) {
        currentWatch = Number(localStorage.getItem("guest_watch_seconds") || 0);
      } else {
        localStorage.setItem("guest_watch_date", today);
        localStorage.setItem("guest_watch_seconds", "0");
      }
    }

    setLimit(userLimit);
    setWatchTime(currentWatch);

    if (currentWatch >= userLimit) {
      setIsLimitReached(true);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } else {
      setIsLimitReached(false);
    }
  }, [user]);

  // Sync watchTime to database
  const syncWatchTime = async () => {
    if (unsyncedTimeRef.current > 0 && user) {
      const timeToSync = unsyncedTimeRef.current;
      unsyncedTimeRef.current = 0; // Reset immediately to prevent duplicate requests
      try {
        const res = await axiosInstance.post("/user/update-watch-time", {
          userId: user._id,
          additionalTime: timeToSync,
        });
        if (res.data.success) {
          login(res.data.user);
        }
      } catch (err) {
        console.error("Failed to sync watch time:", err);
        // Put the unsynced time back if the request failed
        unsyncedTimeRef.current += timeToSync;
      }
    }
  };

  // Setup play/pause tracking
  const startTracking = () => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      const nextTime = watchTimeRef.current + 1;

      if (nextTime >= limit) {
        // Limit reached!
        stopTracking();
        if (videoRef.current) {
          videoRef.current.pause();
        }
        setIsLimitReached(true);
        setWatchTime(limit);

        if (user) {
          // Increment unsynced time and sync immediately
          unsyncedTimeRef.current += 1;
          syncWatchTime();
        } else {
          localStorage.setItem("guest_watch_seconds", limit.toString());
        }
        toast.error("Your daily viewing limit has been reached! Upgrade your plan to watch more.");
      } else {
        setWatchTime(nextTime);
        if (user) {
          unsyncedTimeRef.current += 1;
          // Sync to backend in 5-second batches
          if (unsyncedTimeRef.current >= 5) {
            syncWatchTime();
          }
        } else {
          localStorage.setItem("guest_watch_seconds", nextTime.toString());
        }
      }
    }, 1000);
  };

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    syncWatchTime();
  };

  // Sync on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Direct flush of any unsynced time on unmount
      if (unsyncedTimeRef.current > 0 && user) {
        const timeToSync = unsyncedTimeRef.current;
        axiosInstance.post("/user/update-watch-time", {
          userId: user._id,
          additionalTime: timeToSync,
        }).catch((err) => console.error("Error during unmount sync:", err));
      }
    };
  }, [user]);

  const handlePlay = () => {
    if (isLimitReached) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      toast.error("Daily watch limit reached! Please upgrade your plan to watch more.");
      return;
    }
    startTracking();
  };

  const handlePause = () => {
    stopTracking();
  };

  return (
    <div className="space-y-2">
      <div className="aspect-video bg-black rounded-lg overflow-hidden relative group">
        <video
          ref={videoRef}
          src={video?.filepath ? `${getMediaUrl(video.filepath)}#t=0.1` : ""}
          preload="metadata"
          className="w-full h-full"
          controls
          autoPlay
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handlePause}
        >
          Your browser does not support the video tag.
        </video>

        {/* Gesture Interactive Overlay (covers top area of video, leaving bottom controls exposed) */}
        {!isLimitReached && (
          <div
            onClick={handlePlayerClick}
            className="absolute inset-x-0 top-0 bottom-14 z-20 cursor-pointer select-none"
            title="Use gestures: Double tap left/right to seek, single tap center to play/pause, triple tap center to skip, triple tap left for comments, triple tap right to close"
          />
        )}

        {/* Visual HUD Feedback Overlay */}
        {hudMessage.visible && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 pointer-events-none z-30 transition-opacity duration-200">
            <div className="px-5 py-3.5 rounded-2xl flex flex-col items-center gap-2  shadow-2xl transition-all transform scale-100">
              {hudMessage.icon === "play" && <Play className="w-8 h-8 text-white fill-white" />}
              {hudMessage.icon === "pause" && <Pause className="w-8 h-8 text-white fill-white" />}
              {hudMessage.icon === "forward" && <FastForward className="w-8 h-8 text-white fill-white" />}
              {hudMessage.icon === "backward" && <Rewind className="w-8 h-8 text-white fill-white" />}
              {hudMessage.icon === "skip" && <SkipForward className="w-8 h-8 text-white fill-white" />}
              {hudMessage.icon === "comments" && <MessageSquare className="w-8 h-8 text-white fill-white" />}
              {hudMessage.icon === "close" && <X className="w-8 h-8 text-red-500 stroke-[3px]" />}

              <span className="text-white text-xs font-bold tracking-wider select-none">
                {hudMessage.text}
              </span>
            </div>
          </div>
        )}

        {/* Glassmorphism Limit Reached Overlay */}
        {isLimitReached && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-40 animate-fade-in">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mb-4 border border-yellow-200 shadow-md">
              <Crown className="w-7 h-7 text-yellow-600 animate-bounce" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
              Daily Viewing Limit Reached
            </h2>

            <p className="text-xs text-gray-300 max-w-sm mb-6 leading-relaxed">
              You've reached your daily allowance of {limit / 60} minutes for the{" "}
              <span className="font-semibold text-yellow-500 capitalize">
                {user?.plan || "Free"} plan
              </span>
              . Upgrade your tier to resume watching videos immediately!
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={() => setIsPremiumModalOpen(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-full px-6 py-2 flex items-center gap-1.5 shadow-lg transition-transform hover:scale-105"
              >
                <Sparkles className="w-4 h-4 fill-black text-black" />
                Upgrade Plan
              </Button>

              {!user && (
                <Button
                  onClick={handlegooglesignin}
                  variant="outline"
                  className="border-white text-white hover:bg-white/10 rounded-full px-6 py-2 transition-transform hover:scale-105"
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />
    </div>
  );
}
