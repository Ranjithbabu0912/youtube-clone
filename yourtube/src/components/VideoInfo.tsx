import React, { useEffect, useState, useRef } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Bookmark,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import PremiumModal from "./PremiumModal";
import { getMediaUrl } from "@/lib/utils";
import Link from "next/link";

interface VideoInfoProps {
  video: any;
  allVideos?: any[];
}

const getVideoDetails = (title: string, channel: string) => {
  const t = (title || "").toLowerCase();

  if (t.includes("raga of revenge") || t.includes("dc trailer") || t.includes("sun pictures")) {
    return {
      description: 'Presenting the viral rage "Raga of Revenge" from the movie "DC", Starring Lokesh Kanagaraj and Wamiqa Gabbi, Directed by Arun Matheswaran, Music by Anirudh and Produced by Sun Pictures.',
      hashtags: "#DCtrailer #DCMovie #WamiqaGabbi"
    };
  }

  if (t.includes("earth") || t.includes("planet")) {
    return {
      description: `Explore the breathtaking beauty of our planet with ${channel || "Earth Discoveries"}. Featuring stunning footage of oceans, mountains, forests, and wildlife across the globe.`,
      hashtags: "#Earth #Nature #BeautifulPlanet #Wildlife #Discovery"
    };
  }

  if (t.includes("gaming") || t.includes("highlight")) {
    return {
      description: `Check out the most epic gaming highlights, insane plays, clutch moments, and funny fails from the top games this week, brought to you by ${channel || "Alpha Gaming"}.`,
      hashtags: "#Gaming #Highlights #Gamer #EpicPlays #GamingCommunity"
    };
  }

  if (t.includes("nature") || t.includes("timelapse")) {
    return {
      description: `Experience the calming and majestic beauty of nature in this stunning timelapse video by ${channel || "Green World"}. Showcasing gorgeous sunrises, sunsets, and changing landscapes.`,
      hashtags: "#Nature #Timelapse #StunningNature #Scenery #Relaxing"
    };
  }

  if (t.includes("design") || t.includes("tutorial") || t.includes("web")) {
    return {
      description: `Learn the principles of modern web design, including layouts, typography, color theory, and responsive design techniques. Presented by ${channel || "Tech Crafts"}.`,
      hashtags: "#WebDesign #UXUI #Frontend #HTML #CSS #Tutorial"
    };
  }

  if (t.includes("first video")) {
    return {
      description: `Welcome to our first video! We are excited to start this journey on ${channel || "Bithead-mr"}. In this video, we introduce our channel, explain our vision, and share our plans for future content.`,
      hashtags: "#FirstVideo #Intro #NewChannel #Welcome #Bithead"
    };
  }

  // Fallback dynamic generator
  return {
    description: `Welcome to ${channel || "our channel"}! In this video, we present "${title || "our latest content"}". Don't forget to like, subscribe, and hit the notification bell for more updates!`,
    hashtags: `#${(channel || "Youtube").replace(/\s+/g, "")} #${(title || "Video").split(" ")[0].replace(/[^a-zA-Z0-9]/g, "")} #Trending`
  };
};

const getVideoTags = (title: string, channel: string) => {
  const t = (title || "").toLowerCase();

  if (t.includes("raga of revenge") || t.includes("dc trailer") || t.includes("sun pictures")) {
    return ["All", "From the series", "From Sun TV", "Anirudh Ravichander", "Indian Music", "Related", "For you", "Recent"];
  }

  if (t.includes("earth") || t.includes("planet")) {
    return ["All", "Science", "Nature", "Earth Discoveries", "Documentary", "Planet", "Related", "For you"];
  }

  if (t.includes("gaming") || t.includes("highlight")) {
    return ["All", "Esports", "Live Gaming", "Alpha Gaming", "Highlights", "Let's Play", "Related", "For you"];
  }

  if (t.includes("nature") || t.includes("timelapse")) {
    return ["All", "Timelapse", "Green World", "Meditation", "Scenic", "Nature Sounds", "Related", "For you"];
  }

  if (t.includes("design") || t.includes("tutorial") || t.includes("web")) {
    return ["All", "Programming", "Tech Crafts", "Coding", "UI/UX Design", "Development", "Related", "For you"];
  }

  // Fallback
  return ["All", channel || "Creator", "More from creator", "Recommended", "Related", "For you", "Recent"];
};

const getChannelDetails = (channel: string) => {
  const c = (channel || "").toLowerCase();
  if (c.includes("sun tv")) {
    return { subscribers: "32.4m subscribers", verified: true };
  }
  if (c.includes("bithead")) {
    return { subscribers: "1.2k subscribers", verified: false };
  }
  if (c.includes("earth discoveries")) {
    return { subscribers: "4.5m subscribers", verified: true };
  }
  if (c.includes("alpha gaming")) {
    return { subscribers: "820k subscribers", verified: true };
  }
  if (c.includes("green world")) {
    return { subscribers: "2.1m subscribers", verified: true };
  }
  if (c.includes("tech crafts")) {
    return { subscribers: "340k subscribers", verified: true };
  }
  return { subscribers: "150 subscribers", verified: false };
};

const VideoInfo = ({ video, allVideos = [] }: VideoInfoProps) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!user) {
      toast.error("Please sign in to download videos");
      return;
    }

    setDownloading(true);
    try {
      const res = await axiosInstance.post("/download", {
        userId: user._id,
        videoId: video._id,
      });

      if (res.data && res.data.limitExceeded) {
        toast.error(res.data.message || "Download limit reached!");
        setIsPremiumModalOpen(true);
        setDownloading(false);
        return;
      }

      toast.success("Download started...");

      const fileUrl = getMediaUrl(video.filepath);
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = video.filename || `${video.videotitle}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
      toast.success("Download completed!");
    } catch (error: any) {
      console.error("Download error:", error);
      if (error.response?.status === 403 && error.response?.data?.limitExceeded) {
        toast.error(error.response?.data?.message || "Download limit reached!");
        setIsPremiumModalOpen(true);
      } else {
        toast.error(
          error.response?.data?.message || "Failed to download video. Make sure backend is running."
        );
      }
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
    setIsQueueOpen(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          console.error(error);
        }
      } else {
        try {
          await axiosInstance.post(`/history/views/${video?._id}`);
        } catch (error) {
          console.error(error);
        }
      }
    };
    handleviews();
  }, [user, video._id]);

  const handleLike = async () => {
    if (!user) {
      toast.error("Please sign in to like videos");
      return;
    }
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleWatchLater = async () => {
    if (!user) {
      toast.error("Please sign in to save videos to Watch Later");
      return;
    }
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
        toast.success(isWatchLater ? "Removed from Watch Later" : "Saved to Watch Later");
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDislike = async () => {
    if (!user) {
      toast.error("Please sign in to dislike videos");
      return;
    }
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - 150 : scrollLeft + 150;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  // Find next video in playlist queue
  const nextVideo = (() => {
    if (!allVideos || allVideos.length === 0) return null;
    const idx = allVideos.findIndex((v: any) => v._id === video._id);
    if (idx === -1) return null;
    return allVideos[(idx + 1) % allVideos.length];
  })();

  const { description, hashtags } = getVideoDetails(video.videotitle, video.videochanel);
  const tags = getVideoTags(video.videotitle, video.videochanel);
  const channelInfo = getChannelDetails(video.videochanel);

  return (
    <div className="space-y-4">
      {/* Next Playlist / Mix Banner */}
      {nextVideo && (
        <div className="rounded-xl overflow-hidden border border-red-950/20 bg-[#251515] dark:bg-[#1a0b0b] text-white">
          <button
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 transition-colors text-left"
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                <span>Next: {nextVideo.videotitle}</span>
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
                Mix – {video.videotitle}
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${isQueueOpen ? "rotate-180" : ""}`} />
          </button>
          {isQueueOpen && (
            <div className="border-t border-red-950/10 bg-black/40 max-h-60 overflow-y-auto divide-y divide-zinc-800/40">
              {allVideos.map((vid: any, i: number) => (
                <Link
                  key={vid._id}
                  href={`/watch/${vid._id}`}
                  className={`flex gap-3 p-3 items-center hover:bg-white/5 transition-colors ${vid._id === video._id ? "bg-red-500/10" : ""
                    }`}
                >
                  <span className="text-xs text-zinc-500 w-4 text-center">{i + 1}</span>
                  <div className="relative w-20 aspect-video rounded overflow-hidden bg-zinc-850 flex-shrink-0">
                    <video
                      src={vid.filepath ? `${getMediaUrl(vid.filepath)}#t=0.1` : ""}
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold line-clamp-1">{vid.videotitle}</h4>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{vid.videochanel}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video Title */}
      <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground leading-tight">
        {video.videotitle}
      </h1>

      {/* Channel and Actions block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        {/* Channel Info */}
        <div className="flex items-center justify-between md:justify-start gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-border/50">
              <AvatarFallback className="bg-zinc-800 text-zinc-100 font-bold">
                {video.videochanel ? video.videochanel[0] : "C"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm hover:text-red-500 transition-colors cursor-pointer">
                  {video.videochanel}
                </h3>
                {channelInfo.verified && (
                  <span className="bg-zinc-400 dark:bg-zinc-600 text-white rounded-full p-0.5 flex items-center justify-center w-3.5 h-3.5 flex-shrink-0">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{channelInfo.subscribers}</p>
            </div>
          </div>
          <Button className="rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold px-4 h-9 shadow-md ml-2 transition-transform active:scale-95">
            Subscribe
          </Button>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {/* Like/Dislike combined button */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full border border-border/20 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full h-9 pl-3.5 pr-2.5 text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1.5 text-xs font-medium"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-4 h-4 ${isLiked ? "fill-foreground text-foreground" : ""}`}
              />
              <span>{likes.toLocaleString()}</span>
            </Button>
            <div className="w-px h-5 bg-zinc-300 dark:bg-zinc-700" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full h-9 px-3 text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1.5 text-xs font-medium"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-4 h-4 ${isDisliked ? "fill-foreground text-foreground" : ""}`}
              />
            </Button>
          </div>

          {/* Share Button */}
          <Button
            variant="ghost"
            size="sm"
            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full h-9 px-3.5 text-foreground flex items-center gap-1.5 text-xs font-medium shadow-sm border border-border/10"
          >
            <Share className="w-4 h-4" />
            <span>Share</span>
          </Button>

          {/* Download Button */}
          <Button
            variant="ghost"
            size="sm"
            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full h-9 px-3.5 text-foreground flex items-center gap-1.5 text-xs font-medium shadow-sm border border-border/10"
            disabled={downloading}
            onClick={handleDownload}
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? "Saving..." : "Download"}</span>
          </Button>

          {/* Save / Watch Later Button (HIDDEN on mobile views, visible on sm and up) */}
          <Button
            variant="ghost"
            size="sm"
            className={`hidden sm:flex bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full h-9 px-3.5 text-foreground items-center gap-1.5 text-xs font-medium shadow-sm border border-border/10 ${isWatchLater ? "text-primary dark:text-red-400 font-bold" : ""
              }`}
            onClick={handleWatchLater}
          >
            <Bookmark className="w-4 h-4" />
            <span>{isWatchLater ? "Saved" : "Save"}</span>
          </Button>

          {/* More options */}
          <Button
            variant="ghost"
            size="icon"
            className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full h-9 w-9 text-foreground flex items-center justify-center shadow-sm border border-border/10"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Description Box */}
      <div className="bg-background dark:bg-background/30 rounded-xl p-3.5 text-foreground shadow-sm hover:bg-zinc-150 dark:hover:bg-zinc-900/80 transition-colors">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm font-bold mb-1.5">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
          <span className="text-red-500 font-semibold">{hashtags}</span>
        </div>
        <div className={`text-xs md:text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 ${showFullDescription ? "" : "line-clamp-2"}`}>
          <p>{description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-1.5 p-0 h-auto font-bold text-xs text-foreground hover:bg-transparent hover:text-red-500 transition-colors"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "...less" : "...more"}
        </Button>
      </div>

      {/* Scrollable Tag Carousel */}
      <div className="relative flex items-center group/carousel py-1 border-b border-border/40 pb-3">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 z-10 hidden group-hover/carousel:flex bg-background/80 hover:bg-background border rounded-full shadow w-7 h-7 -translate-x-3 items-center justify-center"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </Button>

        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1 w-full"
        >
          {tags.map((tag, idx) => (
            <button
              key={idx}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${idx === 0
                ? "bg-foreground text-background"
                : "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-foreground"
                }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 z-10 hidden group-hover/carousel:flex bg-background/80 hover:bg-background border rounded-full shadow w-7 h-7 translate-x-3 items-center justify-center"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </Button>
      </div>

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
      />
    </div>
  );
};

export default VideoInfo;
