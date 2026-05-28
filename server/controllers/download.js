import DownloadedVideo from "../Modals/download.js";
import users from "../Modals/Auth.js";

export const addDownload = async (req, res) => {
  const { userId, videoId } = req.body;

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Enforce 1 download per 24 hours limit for Free and Bronze plans
    if (user.plan !== "silver" && user.plan !== "gold" && user.plan !== "premium") {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const downloadCount = await DownloadedVideo.countDocuments({
        userId,
        createdAt: { $gte: oneDayAgo },
      });

      if (downloadCount >= 1) {
        return res.status(200).json({
          limitExceeded: true,
          message: "Free users are limited to 1 download per day. Upgrade to Premium for unlimited downloads!",
        });
      }
    }

    // Save download record
    const newDownload = new DownloadedVideo({
      userId,
      videoId,
    });

    await newDownload.save();

    return res.status(201).json({
      message: "Download recorded successfully",
      download: newDownload,
    });
  } catch (error) {
    console.error("Error adding download:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getDownloads = async (req, res) => {
  const { userId } = req.params;

  try {
    const downloads = await DownloadedVideo.find({ userId })
      .populate("videoId")
      .sort({ createdAt: -1 });

    return res.status(200).json(downloads);
  } catch (error) {
    console.error("Error getting downloads:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const removeDownload = async (req, res) => {
  const { id } = req.params;

  try {
    await DownloadedVideo.findByIdAndDelete(id);
    return res.status(200).json({ message: "Download removed successfully" });
  } catch (error) {
    console.error("Error removing download:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
