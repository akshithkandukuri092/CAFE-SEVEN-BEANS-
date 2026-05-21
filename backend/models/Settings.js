/* models/Settings.js */
const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  announcementText: {
    type: String,
    default: "Welcome to Seven Beans Café!",
  },
  announcementActive: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("Settings", settingsSchema);
