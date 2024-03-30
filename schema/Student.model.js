const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
    },
    uuid: {
        type: String,
        unique: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    stdClass: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("Student", studentSchema);