import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import { sendOTPEmail, sendOTPSMS } from "../utils/email.js";

// Helper to generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const login = async (req, res) => {
  const { email, name, image, locationState } = req.body;

  try {
    let existingUser = await users.findOne({ email });
    const today = new Date().toISOString().split("T")[0];

    if (!existingUser) {
      existingUser = await users.create({ email, name, image, lastActiveDate: today, watchTime: 0 });
    }

    // Check locationState to decide dynamic OTP verification method
    const southernStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];
    const isSouthIndia = locationState && southernStates.some(s => locationState.toLowerCase().includes(s.toLowerCase()));

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    existingUser.otp = otp;
    existingUser.otpExpiry = expiry;
    await existingUser.save();

    if (isSouthIndia) {
      // Send OTP to email
      await sendOTPEmail(email, otp);
      return res.status(200).json({
        status: "OTP_REQUIRED",
        method: "email",
        destination: email,
        userId: existingUser._id
      });
    } else {
      // Send OTP to mobile
      if (!existingUser.mobile) {
        return res.status(200).json({
          status: "MOBILE_REQUIRED",
          message: "Mobile number is required for OTP verification.",
          userId: existingUser._id
        });
      } else {
        await sendOTPSMS(existingUser.mobile, otp);
        return res.status(200).json({
          status: "OTP_REQUIRED",
          method: "mobile",
          destination: existingUser.mobile,
          userId: existingUser._id
        });
      }
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

export const verifyMobile = async (req, res) => {
  const { userId, mobile } = req.body;

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    user.mobile = mobile;
    user.otp = otp;
    user.otpExpiry = expiry;
    await user.save();

    await sendOTPSMS(mobile, otp);

    return res.status(200).json({
      status: "OTP_REQUIRED",
      method: "mobile",
      destination: mobile,
      userId: user._id
    });
  } catch (error) {
    console.error("verifyMobile error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.otp || !user.otpExpiry || user.otp !== otp || new Date() > user.otpExpiry) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Reset OTP fields
    user.otp = undefined;
    user.otpExpiry = undefined;
    
    // Set active time logic same as login
    const today = new Date().toISOString().split("T")[0];
    if (user.lastActiveDate !== today) {
      user.watchTime = 0;
      user.lastActiveDate = today;
    }
    await user.save();

    return res.status(200).json({
      status: "SUCCESS",
      result: user
    });
  } catch (error) {
    console.error("verifyOtp error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
