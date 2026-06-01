import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  plan: { type: String, default: "free", enum: ["free", "bronze", "silver", "gold", "premium"] },
  watchTime: { type: Number, default: 0 },
  lastActiveDate: { type: String },
  mobile: { type: String },
  otp: { type: String },
  otpExpiry: { type: Date },
});

export default mongoose.model("user", userschema);
