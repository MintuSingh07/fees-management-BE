const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    img_desc: String,
    image_urls: Array
});

module.exports = mongoose.model('Image', imageSchema);