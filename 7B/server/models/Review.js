
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    bookingId:  { type: String, required: true, unique: true },
    userId:     { type: String, required: true, index: true },
    userEmail:  { type: String, default: "" },
    userName:   { type: String, default: "" },
    userInit:   { type: String, default: "" },
    spaceId:    { type: String, required: true },
    spaceLabel: { type: String, default: "" },
    spaceIcon:  { type: String, default: "" },
    stars:      { type: Number, required: true, min: 1, max: 5 },
    text:       { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);