import mongoose from "mongoose";
import users from "../Modals/Auth.js";

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    const existingUser = await users.findOne({ email });
    const today = new Date().toISOString().split("T")[0];

    if (!existingUser) {
      const newUser = await users.create({ email, name, image, lastActiveDate: today, watchTime: 0 });
      return res.status(201).json({ result: newUser });
    } else {
      if (existingUser.lastActiveDate !== today) {
        existingUser.watchTime = 0;
        existingUser.lastActiveDate = today;
        await existingUser.save();
      }
      return res.status(200).json({ result: existingUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateWatchTime = async (req, res) => {
  const { userId, additionalTime } = req.body;
  const today = new Date().toISOString().split("T")[0];

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let newWatchTime = user.watchTime || 0;
    if (user.lastActiveDate !== today) {
      newWatchTime = additionalTime;
    } else {
      newWatchTime += additionalTime;
    }

    user.watchTime = newWatchTime;
    user.lastActiveDate = today;
    await user.save();

    return res.status(200).json({
      success: true,
      watchTime: user.watchTime,
      plan: user.plan,
      user,
    });
  } catch (error) {
    console.error("Error updating watch time:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
