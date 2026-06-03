"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MoreVertical, X, Download, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { getMediaUrl } from "@/lib/utils";

export default function DownloadsContent() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadDownloads();
    }
  }, [user]);

  const loadDownloads = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get(`/download/user/${user._id}`);
      setDownloads(res.data);
    } catch (error) {
      console.error("Error loading downloads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDownload = async (downloadId: string) => {
    try {
      await axiosInstance.delete(`/download/${downloadId}`);
      setDownloads(downloads.filter((item) => item._id !== downloadId));
      toast.success("Download removed from history");
    } catch (error) {
      console.error("Error deleting download:", error);
      toast.error("Failed to remove download");
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16 bg-gray-50 border rounded-2xl p-6">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">Keep track of your downloads</h2>
        <p className="text-gray-600 text-sm max-w-sm mx-auto mb-6">
          Sign in to download videos and access them anytime in your profile library.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        <span className="ml-2 text-sm text-gray-500">Loading downloads...</span>
      </div>
    );
  }

  if (downloads.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 border border-dashed rounded-2xl p-6">
        <Download className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">No downloaded videos yet</h2>
        <p className="text-gray-600 text-sm max-w-sm mx-auto mb-4">
          Videos you download will appear here so you can access them quickly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            {downloads.length} {downloads.length === 1 ? "video" : "videos"} in your library
          </p>
        </div>
        {downloads.length > 0 && downloads[0].videoId && (
          <Link href={`/watch/${downloads[0].videoId._id}`}>
            <Button className="flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 h-9">
              <Play className="w-4 h-4 fill-white text-white" />
              Play all
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-4 pt-2">
        {downloads.map((item) => {
          // Safeguard in case referenced video was deleted from DB
          if (!item.videoId) return null;

          return (
            <div
              key={item._id}
              className="flex flex-col sm:flex-row gap-4 group p-2 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <Link
                href={`/watch/${item.videoId._id}`}
                className="flex-shrink-0 w-full sm:w-44"
              >
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-sm">
                  <video
                    src={item.videoId.filepath ? `${getMediaUrl(item.videoId.filepath)}#t=0.1` : ""}
                    preload="metadata"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>
              </Link>

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <Link href={`/watch/${item.videoId._id}`}>
                  <h3 className="font-bold text-sm text-gray-900 line-clamp-2 group-hover:text-red-600 mb-1 leading-snug">
                    {item.videoId.videotitle}
                  </h3>
                </Link>
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  {item.videoId.videochanel}
                </p>
                <p className="text-xs text-gray-500">
                  {item.videoId.views.toLocaleString()} views •{" "}
                  {formatDistanceToNow(new Date(item.videoId.createdAt))} ago
                </p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">
                  Downloaded {formatDistanceToNow(new Date(item.createdAt || item.downloadedAt))} ago
                </p>
              </div>

              <div className="self-center sm:self-auto sm:ml-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 rounded-full h-8 w-8 hover:bg-gray-200"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem
                      onClick={() => handleDeleteDownload(item._id)}
                      className="text-red-600 hover:bg-red-50 focus:text-red-700 focus:bg-red-50 text-xs font-semibold cursor-pointer"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove from downloads
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
