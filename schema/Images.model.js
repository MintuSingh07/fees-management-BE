const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    desc: String,
    imageUrls: [String]
});

module.exports = mongoose.model('ImageSchema', imageSchema);