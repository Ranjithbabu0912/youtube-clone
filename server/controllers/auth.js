import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import { sendOTPEmail, sendOTPSMS } from "../utils/email.js";

// Helper to generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    let existingUser = await users.findOne({ email });
    const today = new Date().toISOString().split("T")[0];

    if (!existingUser) {
      existingUser = await users.create({ email, name, image, lastActiveDate: today, watchTime: 0 });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    existingUser.otp = otp;
    existingUser.otpExpiry = expiry;
    await existingUser.save();

    // Always send OTP to email
    const emailResult = await sendOTPEmail(email, otp);
    return res.status(200).json({
      status: "OTP_REQUIRED",
      method: "email",
      destination: email,
      userId: existingUser._id,
      // Include simulated OTP in response when real email can't be sent (dev/demo mode)
      ...(emailResult.simulated && emailResult.simulatedOtp
        ? { simulatedOtp: emailResult.simulatedOtp }
        : {}),
    });
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

export const getAllUsers = async (req, res) => {
  try {
    const allUsers = await users.find({}, "name email image plan");
    return res.status(200).json(allUsers);
  } catch (error) {
    console.error("getAllUsers error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const detectLocation = async (req, res) => {
  try {
    let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    
    if (ip.includes(",")) {
      ip = ip.split(",")[0].trim();
    }
    
    if (ip === "::1" || ip === "::ffff:127.0.0.1") {
      ip = "";
    }

    const apiUrl = ip ? `https://freeipapi.com/api/json/${ip}` : "https://freeipapi.com/api/json";
    
    const response = await fetch(apiUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.regionName) {
        console.log(`Detected location on backend for IP ${ip || "local"}:`, data.regionName);
        return res.status(200).json({ region: data.regionName });
      }
    }
    
    console.warn("freeipapi lookup returned non-ok response on backend, defaulting to Tamil Nadu");
    return res.status(200).json({ region: "Tamil Nadu" });
  } catch (error) {
    console.error("detectLocation backend error (falling back to Tamil Nadu):", error);
    return res.status(200).json({ region: "Tamil Nadu" });
  }
};

