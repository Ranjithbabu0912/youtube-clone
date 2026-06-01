"use client";

import { useRef, useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Button } from "./ui/button";
import PremiumModal from "./PremiumModal";
import { Crown, AlertTriangle, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getMediaUrl } from "@/lib/utils";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user, login, handlegooglesignin } = useUser();

  const [watchTime, setWatchTime] = useState(0);
  const [limit, setLimit] = useState(300); // Default 5 mins (300 seconds)
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

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
          className="w-full h-full"
          controls
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handlePause}
          poster={`/placeholder.svg?height=480&width=854`}
        >
          <source
            src={getMediaUrl(video?.filepath)}
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>

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
