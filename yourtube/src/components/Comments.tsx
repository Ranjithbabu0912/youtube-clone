import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { ThumbsUp, ThumbsDown, Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  city: string;
  likes: string[];
  dislikes: string[];
  commentedon: string;
  createdAt: string;
}

const Comments = ({ videoId }: { videoId: any }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  // Translation & Geolocation State
  const [userCity, setUserCity] = useState("Unknown City");
  const [translatedComments, setTranslatedComments] = useState<{ [key: string]: string }>({});
  const [translatingIds, setTranslatingIds] = useState<{ [key: string]: boolean }>({});
  const [selectedLanguages, setSelectedLanguages] = useState<{ [key: string]: string }>({});

  const availableLanguages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "hi", name: "Hindi" },
    { code: "ta", name: "Tamil" },
    { code: "zh", name: "Chinese" },
  ];

  // Geolocation lookup on mount
  useEffect(() => {
    const detectCity = async () => {
      try {
        const res = await fetch("https://geolocation-db.com/json/");
        const data = await res.json();
        if (data.city) {
          setUserCity(data.city);
        }
      } catch (error) {
        console.log("Failed to detect city via geolocation-db.com, trying fallback:", error);
        try {
          const res = await fetch("https://ipinfo.io/json");
          const data = await res.json();
          if (data.city) {
            setUserCity(data.city);
          }
        } catch (fallbackError) {
          console.log("Failed to detect city via fallback:", fallbackError);
        }
      }
    };
    detectCity();
  }, []);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comments/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error("Please sign in to comment");
      return;
    }
    if (!newComment.trim()) return;

    // Unicode-friendly regex validation:
    // We check if the comment contains at least one letter (\p{L}) or number (\p{N}) in any language.
    const hasLettersOrNumbers = /[\p{L}\p{N}]/u.test(newComment);
    if (!hasLettersOrNumbers) {
      toast.error("Comments containing only special characters are not allowed!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comments", {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name || "Anonymous",
        city: userCity,
      });
      // Prepend the new comment to the comments list
      setComments((prev) => [res.data, ...prev]);
      setNewComment("");
      toast.success("Comment added successfully");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      const errMsg = error.response?.data?.message || "Error adding comment";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to like comments");
      return;
    }
    try {
      const res = await axiosInstance.patch(`/comments/${commentId}/like`, { userId: user._id });
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId ? { ...c, likes: res.data.likes, dislikes: res.data.dislikes } : c
        )
      );
    } catch (error) {
      console.error("Error liking comment:", error);
      toast.error("Failed to update like");
    }
  };

  const handleDislike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to dislike comments");
      return;
    }
    try {
      const res = await axiosInstance.patch(`/comments/${commentId}/dislike`, { userId: user._id });
      if (res.data.deleted) {
        toast.success("Comment automatically removed due to dislikes limit");
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      } else {
        setComments((prev) =>
          prev.map((c) =>
            c._id === commentId ? { ...c, likes: res.data.likes, dislikes: res.data.dislikes } : c
          )
        );
      }
    } catch (error) {
      console.error("Error disliking comment:", error);
      toast.error("Failed to update dislike");
    }
  };

  const handleTranslate = async (commentId: string, text: string) => {
    const targetLang = selectedLanguages[commentId] || "en";
    setTranslatingIds((prev) => ({ ...prev, [commentId]: true }));
    try {
      const res = await axiosInstance.post("/translate", { text, targetLang });
      setTranslatedComments((prev) => ({ ...prev, [commentId]: res.data.translatedText }));
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Failed to translate comment");
    } finally {
      setTranslatingIds((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleLanguageChange = (commentId: string, lang: string) => {
    setSelectedLanguages((prev) => ({ ...prev, [commentId]: lang }));
  };

  const clearTranslation = (commentId: string) => {
    setTranslatedComments((prev) => {
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    try {
      await axiosInstance.delete(`/comments/deletecomment/${id}`);
      setComments((prev) => prev.filter((c) => c._id !== id));
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        <span className="ml-2 text-sm text-gray-500">Loading comments...</span>
      </div>
    );
  }

  return (
    <div id="comments-section" className="space-y-6 max-w-full">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {(comments?.length || 0)} Comments
      </h2>

      {/* Comment Input */}
      {user ? (
        <div className="flex gap-3 md:gap-4 items-start">
          <Avatar className="w-10 h-10 border shadow-sm">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-b-2 border-gray-200 rounded-none focus-visible:ring-0 focus:border-black px-1 py-2 text-sm transition-colors"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-gray-500 italic">
                Commenting from: <span className="font-semibold text-gray-700">{userCity}</span>
              </span>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setNewComment("")}
                  disabled={!newComment.trim()}
                  className="rounded-full text-xs font-semibold px-4 py-1.5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="rounded-full bg-black text-white hover:bg-gray-800 text-xs font-semibold px-4 py-1.5"
                >
                  {isSubmitting ? "Posting..." : "Comment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-dashed rounded-lg text-center">
          <p className="text-sm text-gray-600">
            Sign in to join the conversation and post a comment.
          </p>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-6">
        {(!comments || comments.length === 0) ? (
          <p className="text-sm text-gray-500 italic text-center py-6">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => {
            const isLiked = comment.likes?.includes(user?._id || "");
            const isDisliked = comment.dislikes?.includes(user?._id || "");
            const isTranslating = translatingIds[comment._id];
            const hasTranslation = !!translatedComments[comment._id];
            const targetLang = selectedLanguages[comment._id] || "en";

            return (
              <div key={comment._id} className="flex gap-3 md:gap-4 items-start group">
                <Avatar className="w-10 h-10 border">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback className="bg-gray-200 text-gray-700">
                    {comment.usercommented?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {comment.usercommented}
                    </span>
                    <span className="text-xs text-gray-500 truncate font-medium">
                      • {comment.city || "Unknown City"}
                    </span>
                    <span className="text-xs text-gray-400">
                      • {formatDistanceToNow(new Date(comment.createdAt || comment.commentedon))} ago
                    </span>
                  </div>

                  <p className="text-sm text-zinc-800 dark:text-zinc-200 break-words leading-relaxed whitespace-pre-wrap">
                    {comment.commentbody}
                  </p>

                  {/* Translation result */}
                  {hasTranslation && (
                    <div className="mt-2 p-3 bg-blue-50/50 border border-blue-100 rounded-md text-sm text-gray-800 relative">
                      <p className="font-semibold text-xs text-blue-600 mb-1">
                        Translated ({availableLanguages.find(l => l.code === targetLang)?.name || "English"}):
                      </p>
                      <p className="italic break-words">{translatedComments[comment._id]}</p>
                      <button
                        onClick={() => clearTranslation(comment._id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium underline mt-1.5 block"
                      >
                        Show original
                      </button>
                    </div>
                  )}

                  {/* Interactions Bar */}
                  <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-2 mt-2 pt-1 text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleLike(comment._id)}
                        className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${
                          isLiked ? "text-blue-600 bg-blue-50" : "text-gray-500"
                        }`}
                        title="Like comment"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-semibold">{comment.likes?.length || 0}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDislike(comment._id)}
                        className={`p-1.5 rounded-full hover:bg-gray-100 transition-colors ${
                          isDisliked ? "text-red-600 bg-red-50" : "text-gray-500"
                        }`}
                        title="Dislike comment"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-semibold">{comment.dislikes?.length || 0}</span>
                    </div>

                    {/* Translation Controls */}
                    <div className="flex items-center gap-2 border-l border-gray-200 pl-3 sm:pl-4">
                      <select
                        value={targetLang}
                        onChange={(e) => handleLanguageChange(comment._id, e.target.value)}
                        className="text-xs bg-background dark:bg-zinc-800 border border-border rounded px-1.5 py-0.5 text-foreground focus:outline-none focus:border-zinc-400 max-w-[85px] sm:max-w-none"
                      >
                        {availableLanguages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTranslate(comment._id, comment.commentbody)}
                        disabled={isTranslating}
                        className="text-xs font-semibold text-gray-600 hover:text-black flex items-center gap-1 h-7 px-2 hover:bg-gray-100 rounded"
                      >
                        {isTranslating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Languages className="w-3.5 h-3.5" />
                        )}
                        Translate
                      </Button>
                    </div>

                    {/* Delete option for comment owner */}
                    {comment.userid === user?._id && (
                      <button
                        onClick={() => handleDelete(comment._id)}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline font-medium ml-auto sm:border-l sm:pl-4 py-1"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;
