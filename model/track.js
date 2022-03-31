const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema({
  track_name: { type: String, default: null },
  artist_name: { type: String, default: null },
  play_id: { type: String, unique: true },
});

module.exports = mongoose.model("track", trackSchema);