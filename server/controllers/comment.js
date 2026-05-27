import comment from "../Modals/comment.js";
import mongoose from "mongoose";

// POST /comments
export const postcomment = async (req, res) => {
  const { userid, videoid, commentbody, usercommented, city } = req.body;

  if (!commentbody || !commentbody.trim()) {
    return res.status(400).json({ message: "Comment body cannot be empty" });
  }

  // Unicode-friendly regex validation:
  // We check if the comment contains at least one letter (\p{L}) or number (\p{N}) in any language.
  // If it does not, it means the comment contains only special characters and whitespace, so we block it.
  const hasLettersOrNumbers = /[\p{L}\p{N}]/u.test(commentbody);
  if (!hasLettersOrNumbers) {
    return res.status(400).json({ message: "Comment cannot contain only special characters." });
  }

  try {
    const newComment = new comment({
      userid,
      videoid,
      commentbody,
      usercommented,
      city: city || "Unknown City",
      likes: [],
      dislikes: [],
    });
    await newComment.save();
    return res.status(201).json(newComment);
  } catch (error) {
    console.error("Error posting comment:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// GET /comments/:videoid
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const comments = await comment.find({ videoid }).sort({ commentedon: -1 });
    return res.status(200).json(comments);
  } catch (error) {
    console.error("Error getting comments:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// PATCH /comments/:id/like
export const likecomment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const existingComment = await comment.findById(id);
    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Toggle like
    if (existingComment.likes.includes(userId)) {
      existingComment.likes = existingComment.likes.filter((uid) => uid !== userId);
    } else {
      existingComment.likes.push(userId);
      // Remove dislike if present
      existingComment.dislikes = existingComment.dislikes.filter((uid) => uid !== userId);
    }

    await existingComment.save();
    return res.status(200).json(existingComment);
  } catch (error) {
    console.error("Error liking comment:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// PATCH /comments/:id/dislike
export const dislikecomment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const existingComment = await comment.findById(id);
    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Toggle dislike
    if (existingComment.dislikes.includes(userId)) {
      existingComment.dislikes = existingComment.dislikes.filter((uid) => uid !== userId);
    } else {
      existingComment.dislikes.push(userId);
      // Remove like if present
      existingComment.likes = existingComment.likes.filter((uid) => uid !== userId);
    }

    // Auto delete moderation logic:
    // If the comment receives 2 or more dislikes, delete it from MongoDB
    if (existingComment.dislikes.length >= 2) {
      await comment.findByIdAndDelete(id);
      return res.status(200).json({ message: "Comment automatically deleted due to dislikes limit", deleted: true });
    }

    await existingComment.save();
    return res.status(200).json(existingComment);
  } catch (error) {
    console.error("Error disliking comment:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// POST /translate
export const translateComment = async (req, res) => {
  const { text, targetLang = "en" } = req.body;

  if (!text) {
    return res.status(400).json({ message: "Text is required for translation." });
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const apiRes = await fetch(url);
    const data = await apiRes.json();
    if (data && data[0] && data[0][0] && data[0][0][0]) {
      return res.status(200).json({ translatedText: data[0][0][0] });
    } else {
      return res.status(500).json({ message: "Translation failed" });
    }
  } catch (error) {
    console.error("Translation error:", error);
    return res.status(500).json({ message: "Something went wrong during translation" });
  }
};

// Keep existing deletecomment and editcomment for backwards compatibility
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    }, { new: true });
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
