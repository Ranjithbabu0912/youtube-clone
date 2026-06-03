# YourTube Clone: VoIP Collaboration & Dynamic Video Platform

A modern, high-fidelity YouTube clone that goes beyond typical video sharing. It features **real-time peer-to-peer VoIP calling**, **synchronized media viewing ("Watch Together")**, **canvas-based dual-stream call recording**, **dynamic metadata extraction**, and **location-aware dynamic authentication security**.

---

## 🚀 Key Features

### 1. 📞 Peer-to-Peer VoIP Video Calling
- **Real-Time Signaling**: Built on a backend Socket.io signaling server that negotiates WebRTC session descriptions (SDP offers/answers) and forwards ICE candidates.
- **Dynamic User Directory**: Displays registered users with real-time online/offline statuses.
- **Hardware Fail-Safes**: Implements a robust media capture fallback (`acquireUserMedia`). If camera or microphone hardware is absent or blocked, it dynamically generates synthetic streams (a silent Web Audio node and a static color canvas video track) to preserve connection integrity.

### 2. 🖥️ Screen Sharing & Dual-Stream Recording
- **Shared Browsing**: Allows participants to share their screens (specifically targeting a YouTube interface) to drive group discussions and media viewing.
- **Canvas-Mixed Recording**: Merges local camera (Picture-in-Picture) and remote video feeds onto a single `<canvas>` canvas layer.
- **Audio Mixing**: Uses the Web Audio API to mix local and remote audio tracks.
- **Native Playback Compatibility**: Generates H.264/AAC media streams (`video/mp4` or `video/webm;codecs=h264`) that open and play natively inside Windows Media Player and Movies & TV applications.

### 3. 🎬 "Watch Together" Synchronized Playback
- **Dual Playback Engines**: Syncs both embedded YouTube videos (via URL parsing) and uploaded database videos.
- **Real-Time Sync Events**: Socket.io event propagation synchronizes video loading, playing, pausing, and scrubbing across all call participants.

### 4. 🖼️ First-Frame Thumbnails & Dynamic Durations
- **Auto-Generated Thumbnails**: Avoids static image placeholders. Video tags across all list layouts use `preload="metadata"` and append a temporal fragment `#t=0.1` to the media URL, forcing browsers to display the actual first frame of the video.
- **Dynamic Durations**: Discards hardcoded video durations. The application captures `onLoadedMetadata` events directly from the active HTML5 video elements to format and display true video lengths (e.g. `0:05`, `1:23`).

### 5. 🔒 Location-Aware Secure Authentication (Dynamic OTP)
- **Dynamic Geolocator**: Employs a robust, multi-fallback client-side lookup sequence trying `freeipapi.com` (HTTPS), `ipapi.co` (HTTPS), and `ip-api.com` (HTTP-fallback) to determine the user's Indian region.
- **Southern India State Flow**: Users in Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, and Telangana verify their login via **Email OTP** (sent via Nodemailer utilizing an IPv4-forced DNS lookup to bypass network connectivity limitations).
- **Global / Northern India Flow**: Users in other states or regions verify via **Mobile SMS OTP** (via Twilio).
- **Lookup Fail-Safe**: On lookup failures, it defaults to Email OTP for Tamil Nadu to prevent SMS cost overheads.

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph TD
    Client[Next.js React Client] <-->|Socket.io Real-Time Event Sync| Backend[Node/Express Server]
    Client <-->|WebRTC Connection P2P| Peer[Remote Peer Client]
    Client -->|Axios REST API Requests| Backend
    Backend <-->|Mongoose Schemas| DB[(MongoDB Database)]
    Backend -->|Twilio API| SMS[SMS Gateway]
    Backend -->|Nodemailer / SMTP| Mail[Email SMTP Server]
    Client -->|Geo Location APIs| Geo[Geolocation Services]
```

### Frontend
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS & Vanilla CSS
- **Icons**: Lucide Icons
- **HTTP Client**: Axios (custom wrapper instance)
- **RTC / Sockets**: native WebRTC API & Socket.io-client

### Backend
- **Server**: Node.js & Express
- **Database**: MongoDB (Mongoose Object Modeling)
- **Real-Time Gateway**: Socket.io Signaling
- **Communication Gateways**: Twilio SMS API & Nodemailer SMTP

---

## 📁 Repository Directory Structure

```text
youtube-clone/
├── yourtube/                       # Next.js Client Application
│   ├── public/                     # Static assets (including seeded videos)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                 # Custom shadcn UI primitives
│   │   │   ├── Videopplayer.tsx    # Watch page player with autoplay/limit checks
│   │   │   ├── videocard.tsx       # Grid card with duration extractor
│   │   │   ├── SearchResult.tsx    # Search results displaying seeded assets
│   │   │   ├── RelatedVideos.tsx   # Video recommendations
│   │   │   └── OtpVerificationModal.tsx # Unified security OTP handler
│   │   ├── lib/
│   │   │   ├── AuthContext.js      # Geolocator and session manager
│   │   │   └── axiosinstance.js    # Customized axios instances
│   │   └── pages/
│   │       ├── index.tsx           # Homepage feed
│   │       ├── video-call.tsx      # Video calling page (WebRTC / Canvas / Sync)
│   │       └── watch/[id].tsx      # Watch page container
└── server/                         # Express Backend Server
    ├── Modals/                     # Mongoose Schemas (Auth, Video, History, etc.)
    ├── controllers/                # Route handlers (auth, video feeds, payments)
    ├── routes/                     # REST API Endpoint definitions
    ├── uploads/                    # Local storage folder for copy-seeded videos
    ├── utils/                      # Email / Twilio SMS OTP helper engines
    ├── seed-videos.js              # Database & local assets seeding script
    └── index.js                    # Server entrypoint (Express / Mongoose / Sockets)
```

---

## ⚙️ Environment Variables Configuration

Create the following files in the respective directories:

### Backend: `server/.env`
```env
MONGO_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/your_db
PORT=5000
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Client: `yourtube/.env.local`
```env
BACKEND_URL=http://localhost:5000
```

---

## 🚦 Local Startup Instructions

Follow these steps to run both services locally:

### 1. Database Seeding & Server Initialization
Run these commands inside the `server` directory:

```bash
# Install dependencies
npm install

# Run the seeding script to copy video files and populate MongoDB
node seed-videos.js

# Start the nodemon development server
npm start
```
*The server will start listening on port `5000`.*

### 2. Frontend Client Initialization
Run these commands inside the `yourtube` directory:

```bash
# Install dependencies
npm install

# Start the Next.js development server
npm run dev
```
*Open [http://localhost:3000](http://localhost:3000) in your browser.*

---

## 📦 Verified Deliverables & Fixes

1. **Console Logs Cleaned**: Removed verbose connection, sync, and initialization console output statements across client pages and backend socket servers.
2. **Next.js Route Resolution Resolved**: Fixed the dynamic route `/watch/[id]` compilation cache issue by flushing the `.next` workspace compilation output and starting fresh.
3. **Preloaded First Frame**: Appended temporal parameters (`#t=0.1`) and specified `preload="metadata"` across all list pages to display the real first frame of the video instead of a placeholder SVG or black background.
4. **Programmatic Autoplay**: Set up autoplay functionality inside `Videopplayer.tsx` using `autoPlay` property attributes and a custom react hook with restricted dependency arrays to prevent autoplay promise abortion on rendering checks.
5. **Robust SMTP Connections**: Configured Nodemailer to enforce an IPv4 resolution lookup (`lookup: ipv4Lookup`), bypassing connection issues caused by lack of IPv6 connectivity.
6. **Robust Client Geolocator**: Built multiple geolocator API fallbacks (freeipapi -> ipapi -> ip-api -> default Tamil Nadu) in `AuthContext.js` to ensure the dynamically generated OTP code is delivered to the correct channel.
