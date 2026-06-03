import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import axiosInstance from "@/lib/axiosinstance";
import { getMediaUrl } from "@/lib/utils";

const SearchResult = ({ query }: any) => {
  if (!query.trim()) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Enter a search term to find videos and channels.
        </p>
      </div>
    );
  }
  const [video, setvideos] = useState<any>(null);
  const [durations, setDurations] = useState<Record<string, string>>({});

  const handleLoadedMetadata = (videoId: string, e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoElement = e.currentTarget;
    const durSec = videoElement.duration;
    if (!isNaN(durSec)) {
      const minutes = Math.floor(durSec / 60);
      const seconds = Math.floor(durSec % 60);
      const durationStr = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
      setDurations((prev) => ({ ...prev, [videoId]: durationStr }));
    }
  };

  const videos = async () => {
    try {
      const response = await axiosInstance.get("/video/getall");
      const allVideos = response.data || [];
      let results = allVideos.filter(
        (vid: any) =>
          vid.videotitle.toLowerCase().includes(query.toLowerCase()) ||
          vid.videochanel.toLowerCase().includes(query.toLowerCase())
      );
      setvideos(results);
    } catch (err) {
      console.error("Error fetching search results:", err);
      setvideos([]);
    }
  };

  useEffect(() => {
    videos();
  }, [query]);
  if (!video) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }
  const hasResults = video ? video.length > 0 : true;
  if (!hasResults) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No results found</h2>
        <p className="text-gray-600">
          Try different keywords or remove search filters
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Video Results */}
      {video.length > 0 && (
        <div className="space-y-4">
          {video.map((video: any) => (
            <div key={video._id} className="flex flex-col sm:flex-row gap-4 group">
              <Link href={`/watch/${video._id}`} className="flex-shrink-0 w-full sm:w-80">
                <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <video
                    src={video.filepath ? `${getMediaUrl(video.filepath)}#t=0.1` : ""}
                    preload="metadata"
                    onLoadedMetadata={(e) => handleLoadedMetadata(video._id, e)}
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
                    {durations[video._id] || "0:00"}
                  </div>
                </div>
              </Link>

              <div className="flex-1 min-w-0 py-1">
                <Link href={`/watch/${video._id}`}>
                  <h3 className="font-medium text-lg line-clamp-2 group-hover:text-blue-600 mb-2">
                    {video.videotitle}
                  </h3>
                </Link>

                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span>{video.views.toLocaleString()} views</span>
                  <span>•</span>
                  <span>
                    {formatDistanceToNow(new Date(video.createdAt))} ago
                  </span>
                </div>

                <Link
                  href={`/channel/${video.uploader}`}
                  className="flex items-center gap-2 mb-2 hover:text-blue-600"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src="/placeholder.svg?height=24&width=24" />
                    <AvatarFallback className="text-xs">
                      {video.videochanel[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-gray-600">
                    {video.videochanel}
                  </span>
                </Link>

                <p className="text-sm text-gray-700 line-clamp-2">
                  Sample video description that would show search-relevant
                  content and help users understand what the video is about
                  before clicking.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Results */}
      {hasResults && (
        <div className="text-center py-8">
          <p className="text-gray-600">
            Showing {videos.length} results for "{query}"
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchResult;
