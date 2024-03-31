const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    adminName: {
        type: String,
        required: true
    },
    isAdmin: {
        type: Boolean,
        default: true
    },
    adminCode: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Admin', adminSchema);