/* routes/settingsRoutes.js */
const express = require("express");
const router = express.Router();
const Settings = require("../models/Settings");

// GET /api/settings - Get site settings (will create default if not exists)
router.get("/", async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (err) {
    console.error("Fetch settings error:", err.message);
    res.status(500).json({ error: "Server error. Could not fetch settings." });
  }
});

// PUT /api/settings - Update site settings
router.put("/", async (req, res) => {
  try {
    const { announcementText, announcementActive } = req.body;
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings({ announcementText, announcementActive });
    } else {
      if (announcementText !== undefined) settings.announcementText = announcementText;
      if (announcementActive !== undefined) settings.announcementActive = announcementActive;
    }
    
    await settings.save();
    console.log(`⚙️ Settings updated: ${announcementActive ? "Active" : "Inactive"}`);
    res.json({ success: true, settings });
  } catch (err) {
    console.error("Update settings error:", err.message);
    res.status(500).json({ error: "Server error. Could not update settings." });
  }
});

module.exports = router;
