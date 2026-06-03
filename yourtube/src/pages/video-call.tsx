import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { getMediaUrl } from "@/lib/utils";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Circle,
  Square,
  Play,
  Pause,
  RefreshCw,
  Search,
  Users,
  Tv,
  Crown,
  Laptop
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  image: string;
  plan: string;
}

export default function VideoCallPage() {
  const { user } = useUser();
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Call States
  const [callState, setCallState] = useState<"idle" | "calling" | "ringing" | "connected">("idle");
  const [activePartner, setActivePartner] = useState<UserProfile | null>(null);
  const [partnerSocketId, setPartnerSocketId] = useState<string>("");
  const [incomingOffer, setIncomingOffer] = useState<any>(null);

  // Media States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // YouTube Sync States
  const [youtubeVideoId, setYoutubeVideoId] = useState("dQw4w9WgXcQ");
  const [ytUrlInput, setYtUrlInput] = useState("");
  const [showWatchTogether, setShowWatchTogether] = useState(false);

  // YourTube Database Sync States & Refs
  const [dbVideos, setDbVideos] = useState<any[]>([]);
  const [activeDbVideo, setActiveDbVideo] = useState<any>(null);
  const [watchSource, setWatchSource] = useState<"youtube" | "db">("youtube");
  const dbVideoRef = useRef<HTMLVideoElement | null>(null);
  const dbVideosRef = useRef<any[]>([]);

  // WebRTC Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Recording Refs
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingRef = useRef(false);

  // YouTube Player Refs
  const ytPlayerRef = useRef<any>(null);
  const isSyncingRef = useRef(false);

  const ICE_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  };

  // Helper to extract YouTube Video ID
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : url;
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (showWatchTogether) {
      if (!(window as any).YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
      }

      // Handler for iframe API ready
      (window as any).onYouTubeIframeAPIReady = () => {
        initializeYtPlayer();
      };

      if ((window as any).YT && (window as any).YT.Player) {
        initializeYtPlayer();
      }
    } else {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
    }
  }, [showWatchTogether, youtubeVideoId]);

  const initializeYtPlayer = () => {
    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch (e) {
        console.error(e);
      }
    }
    ytPlayerRef.current = new (window as any).YT.Player("yt-player", {
      height: "100%",
      width: "100%",
      videoId: youtubeVideoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        rel: 0,
      },
      events: {
        onStateChange: handlePlayerStateChange,
      },
    });
  };

  const handlePlayerStateChange = (event: any) => {
    if (isSyncingRef.current) return;
    const state = event.data;
    const currentTime = ytPlayerRef.current?.getCurrentTime() || 0;

    // YT.PlayerState.PLAYING = 1, PAUSED = 2
    if (state === 1) {
      emitSyncEvent("play", currentTime);
    } else if (state === 2) {
      emitSyncEvent("pause", currentTime);
    }
  };

  const emitSyncEvent = (action: string, time: number) => {
    if (socketRef.current && activePartner) {
      socketRef.current.emit("sync-youtube", {
        to: activePartner._id,
        action,
        videoId: youtubeVideoId,
        time,
        isPlaying: action === "play",
      });
    }
  };

  // Fetch database videos
  useEffect(() => {
    const fetchDbVideos = async () => {
      try {
        const response = await axiosInstance.get("/video/getall");
        setDbVideos(response.data || []);
        dbVideosRef.current = response.data || [];
      } catch (err) {
        console.error("Error fetching database videos:", err);
      }
    };
    fetchDbVideos();
  }, []);

  // Fetch registered users
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get("/user/all-users");
        setUsersList(response.data.filter((u: UserProfile) => u._id !== user._id));
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, [user]);

  // Connect to Socket.io Signaling Server
  useEffect(() => {
    if (!user) return;

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const newSocket = io(backendUrl);
    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      newSocket.emit("register-user", user._id);
    });

    newSocket.on("online-users", (userIds: string[]) => {
      setOnlineUserIds(userIds);
    });

    newSocket.on("incoming-call", ({ from, callerName, callerId, callerImage, offer }) => {
      setPartnerSocketId(from);
      const partner = usersList.find((u) => u._id === callerId) || {
        _id: callerId,
        name: callerName,
        image: callerImage || "https://github.com/shadcn.png",
        email: "",
        plan: "free"
      };
      setActivePartner(partner);
      setIncomingOffer(offer);
      setCallState("ringing");
      toast.info(`Incoming video call from ${callerName}`);
    });

    newSocket.on("call-accepted", async ({ answer, from }) => {
      setPartnerSocketId(from);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState("connected");
        toast.success("Call connected!");
      }
    });

    newSocket.on("call-rejected", () => {
      toast.error("Call was rejected");
      cleanupCall();
    });

    newSocket.on("call-failed", ({ reason }) => {
      toast.error(`Call failed: ${reason}`);
      cleanupCall();
    });

    newSocket.on("ice-candidate", async ({ candidate }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ice candidate:", e);
        }
      }
    });

    newSocket.on("call-ended", () => {
      toast.info("Call ended by partner");
      cleanupCall();
    });

    newSocket.on("sync-youtube-client", ({ action, videoId, time, isPlaying }) => {
      isSyncingRef.current = true;

      if (action.startsWith("db-") || action === "db-load") {
        setWatchSource("db");
        setShowWatchTogether(true);
        const selectedVideo = dbVideosRef.current.find((v) => v._id === videoId);
        if (selectedVideo) {
          setActiveDbVideo(selectedVideo);
          setTimeout(() => {
            const vidPlayer = dbVideoRef.current;
            if (!vidPlayer) return;
            if (action === "db-load") {
              vidPlayer.src = getMediaUrl(selectedVideo.filepath);
              vidPlayer.currentTime = time;
              vidPlayer.play().catch((e) => console.error(e));
            } else if (action === "db-play") {
              vidPlayer.currentTime = time;
              vidPlayer.play().catch((e) => console.error(e));
            } else if (action === "db-pause") {
              vidPlayer.pause();
              vidPlayer.currentTime = time;
            } else if (action === "db-seek") {
              vidPlayer.currentTime = time;
            }
            setTimeout(() => {
              isSyncingRef.current = false;
            }, 800);
          }, 500);
        } else {
          isSyncingRef.current = false;
        }
        return;
      }

      setWatchSource("youtube");
      if (videoId !== youtubeVideoId) {
        setYoutubeVideoId(videoId);
      }
      setShowWatchTogether(true);

      setTimeout(() => {
        if (!ytPlayerRef.current) return;
        const player = ytPlayerRef.current;
        if (action === "play") {
          if (typeof player.seekTo === "function") player.seekTo(time, true);
          if (typeof player.playVideo === "function") player.playVideo();
        } else if (action === "pause") {
          if (typeof player.pauseVideo === "function") player.pauseVideo();
          if (typeof player.seekTo === "function") player.seekTo(time, true);
        }
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 800);
      }, 500);
    });

    return () => {
      newSocket.disconnect();
      cleanupCall();
    };
  }, [user, usersList, youtubeVideoId]);

  const getSilentAudioTrack = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const oscillator = ctx.createOscillator();
      const dst = ctx.createMediaStreamDestination();
      oscillator.connect(dst);
      oscillator.start();
      const track = dst.stream.getAudioTracks()[0];
      if (track) {
        track.enabled = false;
        return track;
      }
    } catch (e) {
      console.error("Error creating silent audio track:", e);
    }
    return null;
  };

  const getFakeVideoTrack = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1e1e2e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "#ef4444";
        ctx.font = "20px sans-serif";
        ctx.fillText("Camera stream unavailable", 180, 240);
      }
      const stream = (canvas as any).captureStream(30);
      return stream.getVideoTracks()[0];
    } catch (e) {
      console.error("Error creating fake video track:", e);
    }
    return null;
  };

  const acquireUserMedia = async () => {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      console.warn("Could not get both video and audio, trying audio only...", err);
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        const fakeVideo = getFakeVideoTrack();
        if (fakeVideo) {
          audioStream.addTrack(fakeVideo);
        }
        return audioStream;
      } catch (err2) {
        console.warn("Could not get audio stream, trying video only...", err2);
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          const silentAudio = getSilentAudioTrack();
          if (silentAudio) {
            videoStream.addTrack(silentAudio);
          }
          return videoStream;
        } catch (err3) {
          console.warn("Failed to acquire hardware streams, using synthetic fallbacks.", err3);
          const tracks = [];
          const fakeVideo = getFakeVideoTrack();
          if (fakeVideo) tracks.push(fakeVideo);
          const silentAudio = getSilentAudioTrack();
          if (silentAudio) tracks.push(silentAudio);
          
          if (tracks.length > 0) {
            return new MediaStream(tracks);
          }
          throw new Error("No media inputs available and synthetic fallback failed");
        }
      }
    }
  };

  // Clean up Peer Connections & Streams
  const cleanupCall = () => {
    if (recorderRef.current && recordingRef.current) {
      recorderRef.current.stop();
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setRemoteStream(null);
    setCallState("idle");
    setActivePartner(null);
    setPartnerSocketId("");
    setIncomingOffer(null);
    setIsScreenSharing(false);
    setShowWatchTogether(false);
    setActiveDbVideo(null);
    setWatchSource("youtube");
  };

  // Start Call
  const startCall = async (partner: UserProfile) => {
    try {
      setActivePartner(partner);
      setCallState("calling");

      const stream = await acquireUserMedia();
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          const targetSocket = usersList.find((u) => u._id === partner._id) ? partner._id : partnerSocketId;
          socketRef.current.emit("ice-candidate", {
            to: partnerSocketId || targetSocket,
            candidate: event.candidate,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit("call-user", {
          toCall: partner._id,
          offer,
          callerName: user?.name || "Friend",
          callerId: user?._id || "",
          callerImage: user?.image || "",
        });
      }
    } catch (err) {
      console.error("Error starting call:", err);
      toast.error("Could not access camera or microphone");
      cleanupCall();
    }
  };

  // Accept Call
  const acceptCall = async () => {
    if (!incomingOffer || !socketRef.current) return;
    try {
      setCallState("connected");
      const stream = await acquireUserMedia();
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", {
            to: partnerSocketId,
            candidate: event.candidate,
          });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketRef.current.emit("answer-call", {
        to: partnerSocketId,
        answer,
      });
    } catch (err) {
      console.error("Error accepting call:", err);
      toast.error("Could not accept call or open media devices");
      rejectCall();
    }
  };

  // Reject Call
  const rejectCall = () => {
    if (socketRef.current && partnerSocketId) {
      socketRef.current.emit("reject-call", { to: partnerSocketId });
    }
    cleanupCall();
  };

  // Hang Up
  const hangupCall = () => {
    if (socketRef.current && activePartner) {
      socketRef.current.emit("hangup", { to: activePartner._id });
    }
    cleanupCall();
  };

  // Toggle Mute
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  // Screen Share Handler
  const toggleScreenShare = async () => {
    if (!peerConnectionRef.current) return;

    if (isScreenSharing) {
      // Revert to camera
      try {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
          screenStreamRef.current = null;
        }

        const videoSender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");

        if (videoSender && localStream) {
          const cameraTrack = localStream.getVideoTracks()[0];
          await videoSender.replaceTrack(cameraTrack);
        }
        setIsScreenSharing(false);
      } catch (err) {
        console.error(err);
      }
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true, // option for tab audio sharing
        });
        screenStreamRef.current = screenStream;

        const videoSender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");

        if (videoSender) {
          const screenTrack = screenStream.getVideoTracks()[0];
          await videoSender.replaceTrack(screenTrack);

          screenTrack.onended = () => {
            toggleScreenShare(); // Revert back when user stops from browser UI
          };

          setIsScreenSharing(true);
          toast.success("Sharing your screen! Display YouTube for synced viewing.");
        }
      } catch (err) {
        console.error("Error screen sharing:", err);
        toast.error("Screen sharing cancelled or unavailable");
      }
    }
  };

  // Audio/Video Local Recording Handler (Canvas Mix)
  const handleRecording = () => {
    if (isRecording) {
      // Stop Recording
      if (recorderRef.current) {
        recordingRef.current = false;
        recorderRef.current.stop();
      }
    } else {
      // Start Recording
      if (!localStream || !remoteStream) {
        toast.error("Active call with connected media streams required to record session.");
        return;
      }

      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const localVid = localVideoRef.current;
        const remoteVid = remoteVideoRef.current;

        let animationId: number;
        const draw = () => {
          if (!recordingRef.current) return;

          // Remote stream (Main backdrop)
          if (remoteVid && remoteVid.readyState >= 2) {
            ctx.drawImage(remoteVid, 0, 0, canvas.width, canvas.height);
          } else {
            ctx.fillStyle = "#1e1e2e";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          // Local stream (PIP window inset in bottom-right)
          if (localVid && localVid.readyState >= 2) {
            const pipW = 280;
            const pipH = 157;
            const pipX = canvas.width - pipW - 30;
            const pipY = canvas.height - pipH - 30;

            // Glassmorphic border
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(pipX - 4, pipY - 4, pipW + 8, pipH + 8);
            ctx.drawImage(localVid, pipX, pipY, pipW, pipH);
          }

          animationId = requestAnimationFrame(draw);
        };

        recordingRef.current = true;
        draw();

        // Audio mixing node setup
        const canvasStream = (canvas as any).captureStream(30);
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const dest = audioCtx.createMediaStreamDestination();

        if (localStream.getAudioTracks().length > 0) {
          const srcLocal = audioCtx.createMediaStreamSource(localStream);
          srcLocal.connect(dest);
        }
        if (remoteStream.getAudioTracks().length > 0) {
          const srcRemote = audioCtx.createMediaStreamSource(remoteStream);
          srcRemote.connect(dest);
        }

        const combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);

        let selectedMimeType = "video/webm";
        let extension = "webm";

        const candidateTypes = [
          { type: "video/mp4;codecs=h264,aac", ext: "mp4" },
          { type: "video/mp4;codecs=h264", ext: "mp4" },
          { type: "video/mp4", ext: "mp4" },
          { type: "video/webm;codecs=h264,opus", ext: "webm" },
          { type: "video/webm;codecs=h264", ext: "webm" },
          { type: "video/webm;codecs=vp9,opus", ext: "webm" },
          { type: "video/webm;codecs=vp8,opus", ext: "webm" }
        ];

        for (const candidate of candidateTypes) {
          if (MediaRecorder.isTypeSupported(candidate.type)) {
            selectedMimeType = candidate.type;
            extension = candidate.ext;
            break;
          }
        }

        const recorder = new MediaRecorder(combinedStream, {
          mimeType: selectedMimeType,
        });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onstop = () => {
          cancelAnimationFrame(animationId);
          audioCtx.close();

          const blob = new Blob(chunks, { type: selectedMimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `YourTube-Call-Recording-${Date.now()}.${extension}`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }, 100);
          setIsRecording(false);
          toast.success("Recording saved and downloaded locally!");
        };

        recorder.start();
        recorderRef.current = recorder;
        setIsRecording(true);
        toast.success("Call recording started!");
      } catch (err) {
        console.error("Recording initialization failed:", err);
        toast.error("Failed to start recording call session");
      }
    }
  };

  const handleDbPlay = () => {
    if (isSyncingRef.current) return;
    if (socketRef.current && activePartner && activeDbVideo) {
      socketRef.current.emit("sync-youtube", {
        to: activePartner._id,
        action: "db-play",
        videoId: activeDbVideo._id,
        time: dbVideoRef.current?.currentTime || 0,
        isPlaying: true,
      });
    }
  };

  const handleDbPause = () => {
    if (isSyncingRef.current) return;
    if (socketRef.current && activePartner && activeDbVideo) {
      socketRef.current.emit("sync-youtube", {
        to: activePartner._id,
        action: "db-pause",
        videoId: activeDbVideo._id,
        time: dbVideoRef.current?.currentTime || 0,
        isPlaying: false,
      });
    }
  };

  const handleDbSeeked = () => {
    if (isSyncingRef.current) return;
    if (socketRef.current && activePartner && activeDbVideo) {
      socketRef.current.emit("sync-youtube", {
        to: activePartner._id,
        action: "db-seek",
        videoId: activeDbVideo._id,
        time: dbVideoRef.current?.currentTime || 0,
        isPlaying: !dbVideoRef.current?.paused,
      });
    }
  };

  const handleLoadYoutube = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytUrlInput.trim()) return;
    const vId = getYoutubeId(ytUrlInput.trim());
    setYoutubeVideoId(vId);
    setShowWatchTogether(true);
    setYtUrlInput("");

    // Emit event so other user automatically switches to this video
    if (socketRef.current && activePartner) {
      socketRef.current.emit("sync-youtube", {
        to: activePartner._id,
        action: "load",
        videoId: vId,
        time: 0,
        isPlaying: true,
      });
    }
    toast.success("YouTube video loaded and shared!");
  };

  // Sign In Fallback
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-background text-foreground px-4 text-center">
        <div className="bg-muted border border-border p-8 rounded-2xl max-w-md shadow-2xl flex flex-col items-center gap-4">
          <div className="bg-red-500/10 p-4 rounded-full">
            <Video className="w-12 h-12 text-red-500 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">VoIP Video Call</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Real-time peer-to-peer video calling, screen sharing, call recording, and shared media playback requires you to sign in to your account.
          </p>
          <Button onClick={() => (window as any).location.reload()} className="mt-2 bg-red-600 hover:bg-red-700 text-white rounded-full px-6">
            Sign In Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 min-h-[calc(100vh-6rem)] bg-background text-foreground relative p-1">
      {/* LEFT COLUMN: Main Call Interface or User Selector */}
      <div className="flex-1 flex flex-col bg-card/40 border border-border/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl relative min-h-[500px]">
        {callState === "idle" && (
          <div className="flex-1 flex flex-col p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-bold">YourTube Direct Contacts</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-red-500/10 text-red-600 rounded-full flex items-center gap-1.5 animate-pulse">
                <Circle className="w-2.5 h-2.5 fill-red-600 border-none" />
                Live VoIP Calling
              </span>
            </div>

            {usersList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <p className="text-sm">No other registered users found in the database.</p>
                <p className="text-xs">Create multiple profiles locally to test calling between user instances.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 mt-6 overflow-y-auto max-h-[550px] pr-2">
                {usersList.map((targetUser) => {
                  const isOnline = onlineUserIds.includes(targetUser._id);
                  return (
                    <div
                      key={targetUser._id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/80 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="w-12 h-12 border border-border">
                            <AvatarImage src={targetUser.image} />
                            <AvatarFallback>{targetUser.name[0]}</AvatarFallback>
                          </Avatar>
                          {isOnline ? (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                          ) : (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-zinc-400 border-2 border-background rounded-full" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-semibold text-sm leading-none">{targetUser.name}</p>
                            {targetUser.plan !== "free" && (
                              <span title={`${targetUser.plan} Member`}>
                                <Crown className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">{targetUser.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={!isOnline}
                        onClick={() => startCall(targetUser)}
                        className={`rounded-full px-4 text-xs font-semibold ${
                          isOnline
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5 mr-1.5" />
                        {isOnline ? "Call" : "Offline"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Ringing Modal (Recipient) */}
        {callState === "ringing" && activePartner && (
          <div className="flex-1 flex flex-col items-center justify-center bg-black/60 p-8 backdrop-blur-md">
            <div className="bg-card border border-border/80 p-8 rounded-3xl max-w-sm w-full shadow-2xl flex flex-col items-center gap-6 animate-bounce">
              <div className="relative">
                <Avatar className="w-24 h-24 border-2 border-red-500">
                  <AvatarImage src={activePartner.image} />
                  <AvatarFallback>{activePartner.name[0]}</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-1 right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center border-2 border-card animate-pulse">
                  <Video className="w-3 h-3 text-white" />
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold text-foreground">{activePartner.name}</h3>
                <p className="text-xs text-red-600 font-semibold uppercase tracking-wider mt-1 animate-pulse">
                  Incoming VoIP Call...
                </p>
              </div>
              <div className="flex gap-4 w-full">
                <Button onClick={rejectCall} className="flex-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white border border-border py-6">
                  <PhoneOff className="w-4 h-4 mr-2" />
                  Decline
                </Button>
                <Button onClick={acceptCall} className="flex-1 rounded-full bg-green-600 hover:bg-green-700 text-white py-6">
                  <Phone className="w-4 h-4 mr-2" />
                  Accept
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Outgoing Ringing Screen (Caller) */}
        {callState === "calling" && activePartner && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-card/60">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-2 border-red-500 animate-pulse">
                  <AvatarImage src={activePartner.image} />
                  <AvatarFallback>{activePartner.name[0]}</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-1 right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center border-2 border-card">
                  <Video className="w-3 h-3 text-white" />
                </span>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold">{activePartner.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 animate-pulse">
                  Dialing VoIP connection...
                </p>
              </div>
              <Button onClick={hangupCall} className="rounded-full bg-red-600 hover:bg-red-700 text-white px-8 py-5">
                <PhoneOff className="w-4 h-4 mr-2" />
                Cancel Call
              </Button>
            </div>
          </div>
        )}

        {/* Connected Active Call View */}
        {callState === "connected" && activePartner && (
          <div className="flex-1 flex flex-col relative bg-black/90">
            {/* Remote Partner Feed */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                id="remoteVideo"
                autoPlay
                playsInline
                className="w-full h-full object-cover max-h-[600px] bg-zinc-950"
              />

              {!remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
                  <p className="text-xs font-semibold uppercase tracking-wider">Establishing media stream...</p>
                </div>
              )}

              {/* Local Camera (PIP Inset) */}
              <div className="absolute bottom-4 right-4 w-44 md:w-56 h-28 md:h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-900 group hover:scale-105 transition-transform duration-300">
                <video
                  ref={localVideoRef}
                  id="localVideo"
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/50 text-[10px] text-white px-2 py-0.5 rounded-full backdrop-blur-md">
                  You
                </div>
              </div>

              {/* Overlaid Participant Info */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={activePartner.image} />
                  <AvatarFallback>{activePartner.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-white font-semibold">{activePartner.name}</span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
              </div>
            </div>

            {/* Calling Bottom Controls Bar */}
            <div className="bg-zinc-950/90 border-t border-zinc-800 p-4 flex flex-wrap items-center justify-center gap-4">
              {/* Mic Control */}
              <Button
                size="icon"
                onClick={toggleMute}
                className={`rounded-full w-12 h-12 shadow-md ${
                  isMuted ? "bg-red-600 hover:bg-red-700 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              {/* Cam Control */}
              <Button
                size="icon"
                onClick={toggleVideo}
                className={`rounded-full w-12 h-12 shadow-md ${
                  isCamOff ? "bg-red-600 hover:bg-red-700 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                }`}
              >
                {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </Button>

              {/* Screen Share Control */}
              <Button
                size="icon"
                onClick={toggleScreenShare}
                title="Share Screen (Specifically Choose YouTube for Shared Viewing)"
                className={`rounded-full w-12 h-12 shadow-md ${
                  isScreenSharing
                    ? "bg-green-600 hover:bg-green-700 text-white animate-pulse"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                }`}
              >
                {isScreenSharing ? <Laptop className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </Button>

              {/* Local Recording Control */}
              <Button
                onClick={handleRecording}
                className={`rounded-full px-5 py-6 font-semibold shadow-md ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop Rec
                  </>
                ) : (
                  <>
                    <Circle className="w-4 h-4 mr-2 fill-red-500 stroke-none" />
                    Record Call
                  </>
                )}
              </Button>

              {/* Watch Together Switcher */}
              <Button
                onClick={() => setShowWatchTogether(!showWatchTogether)}
                className={`rounded-full px-5 py-6 font-semibold shadow-md ${
                  showWatchTogether
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                }`}
              >
                <Tv className="w-4 h-4 mr-2" />
                Watch Together
              </Button>

              {/* End Call Button */}
              <Button
                onClick={hangupCall}
                className="rounded-full bg-red-600 hover:bg-red-700 text-white px-6 py-6 font-semibold shadow-md border-none ml-auto"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                Hang Up
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Watch Together Container */}
      <div
        className={`w-full xl:w-[450px] flex flex-col bg-card/40 border border-border/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl transition-all duration-300 ${
          showWatchTogether ? "opacity-100 translate-x-0" : "opacity-40 select-none hidden xl:flex"
        }`}
      >
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-sm">Watch Together</h3>
          </div>
          <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
            Synced
          </span>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-border bg-muted/10">
          <button
            onClick={() => setWatchSource("youtube")}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all ${
              watchSource === "youtube"
                ? "border-red-600 text-red-600 bg-red-500/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            YouTube Video
          </button>
          <button
            onClick={() => setWatchSource("db")}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-all ${
              watchSource === "db"
                ? "border-red-600 text-red-600 bg-red-500/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            YourTube (DB) Video
          </button>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-4">
          {watchSource === "youtube" ? (
            <form onSubmit={handleLoadYoutube} className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Enter YouTube Video URL or ID"
                  value={ytUrlInput}
                  onChange={(e) => setYtUrlInput(e.target.value)}
                  disabled={callState !== "connected"}
                  className="rounded-full pl-9 h-10 text-xs border border-border focus-visible:ring-0"
                />
                <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-muted-foreground" />
              </div>
              <Button
                type="submit"
                disabled={callState !== "connected"}
                className="rounded-full h-10 text-xs bg-red-600 hover:bg-red-700 text-white px-4"
              >
                Load
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">Select Uploaded Video</label>
              <select
                disabled={callState !== "connected"}
                value={activeDbVideo?._id || ""}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const selected = dbVideos.find((v) => v._id === selectedId);
                  if (selected) {
                    setActiveDbVideo(selected);
                    setShowWatchTogether(true);
                    
                    if (socketRef.current && activePartner) {
                      socketRef.current.emit("sync-youtube", {
                        to: activePartner._id,
                        action: "db-load",
                        videoId: selected._id,
                        time: 0,
                        isPlaying: true,
                      });
                    }
                    toast.success(`Loaded: ${selected.videotitle}`);
                  }
                }}
                className="w-full h-10 rounded-full px-4 text-xs bg-background border border-border text-foreground focus:outline-none"
              >
                <option value="" disabled>-- Select a Video --</option>
                {dbVideos.map((vid) => (
                  <option key={vid._id} value={vid._id}>
                    {vid.videotitle}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Video Player Embed */}
          <div className="aspect-video w-full bg-zinc-950 rounded-xl overflow-hidden border border-border flex items-center justify-center relative">
            {showWatchTogether ? (
              watchSource === "youtube" ? (
                <div id="yt-player" className="w-full h-full" />
              ) : (
                activeDbVideo && (
                  <video
                    ref={dbVideoRef}
                    src={getMediaUrl(activeDbVideo.filepath)}
                    onPlay={handleDbPlay}
                    onPause={handleDbPause}
                    onSeeked={handleDbSeeked}
                    controls
                    className="w-full h-full object-contain"
                  />
                )
              )
            ) : (
              <div className="text-center p-6 text-muted-foreground flex flex-col items-center gap-2">
                <Tv className="w-8 h-8 opacity-40 text-red-500" />
                <p className="text-xs">Synchronized watch list is currently empty.</p>
                <p className="text-[10px] opacity-70">
                  Connect a VoIP call and load a video above to sync playback with your friend.
                </p>
              </div>
            )}
          </div>

          {/* Guidelines / Tips */}
          <div className="bg-muted/40 rounded-xl p-3.5 border border-border/50 text-[11px] text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">💡 How Synced Viewing works:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Pasting a video link dynamically syncs for both callers.</li>
              <li>Play/Pause/Seek events will immediately adjust your friend's player.</li>
              <li>You can also click "Share Screen" on the calling dashboard and choose Chrome/Edge tab sharing to share your browser's interactive session directly.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
