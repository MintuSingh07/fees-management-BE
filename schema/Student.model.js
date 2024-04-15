const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
    },
    uuid: {
        type: String,
        unique: true
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    stdClass: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model("Student", studentSchema);