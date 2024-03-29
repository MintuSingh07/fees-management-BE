const mongoose = require('mongoose');

const feeDataSchema = new mongoose.Schema({
    year: {
        type: Number,
        required: true
    },
    January: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }],
    February: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }],
    March: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }],
    April: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }],
    May: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }],
    June: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }],
    July: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }],
    August: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }],
    September: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }],
    October: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }],
    November: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }],
    December: [{
        name: String,
        isPaid: Boolean,
        uuid: String
    }]
});

const FeeData = mongoose.model('FeeData', feeDataSchema);

module.exports = FeeData;
