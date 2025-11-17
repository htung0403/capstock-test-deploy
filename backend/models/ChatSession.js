const mongoose = require("mongoose");
const chatSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    messages: [{ role: String, content: String }],
});
module.exports = mongoose.model("ChatSession", chatSessionSchema);
