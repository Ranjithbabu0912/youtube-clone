"use client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { getMediaUrl } from "@/lib/utils";

import { useState } from "react";

export default function VideoCard({ video }: any) {
  const [duration, setDuration] = useState("0:00");

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoElement = e.currentTarget;
    const durSec = videoElement.duration;
    if (!isNaN(durSec)) {
      const minutes = Math.floor(durSec / 60);
      const seconds = Math.floor(durSec % 60);
      setDuration(`${minutes}:${seconds < 10 ? "0" : ""}${seconds}`);
    }
  };

  return (
    <Link href={`/watch/${video?._id}`} className="group">
      <div className="space-y-3">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
          <video
            src={video?.filepath ? `${getMediaUrl(video.filepath)}#t=0.1` : ""}
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
            {duration}
          </div>
        </div>
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback>{video?.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600">
              {video?.videotitle}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{video?.videochanel}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {video?.views.toLocaleString()} views •{" "}
              {formatDistanceToNow(new Date(video?.createdAt))} ago
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
