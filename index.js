const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
// const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');
require('dotenv').config();

const Student = require("./schema/Student.model");
const FeesData = require('./schema/FeesData.model');

const app = express();
const PORT = 8000;

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log("DB connected"))
    .catch((err) => console.log(`Error is ${err}`));

// ADD STUDENTS API
app.post('/add-std', async (req, res) => {
    const { fullName, phone } = req.body;

    const existStudent = await Student.findOne({ phone });
    if (!existStudent) {
        try {
            const newStudent = new Student({
                fullName,
                phone,
                uuid: uuidv4().substring(0, 8)
            });
            await newStudent.save();
            res.status(200).json({ message: "Student register sucessfully", newStudent });
        } catch (error) {
            res.status(400).json({ error: error });
        }
    } else {
        res.status(400).json({ error: "Student Already Exists" });
    }
});
// SHOW STUDENTS API
app.get("/std-list", async (req, res) => {
    const stdData = await Student.find({});
    res.status(200).json(stdData);
});
// STUDENT PAYMENT UPDATE API
app.put('/update-payment/:uuid', async (req, res) => {
    const { uuid } = req.params;
    const { isPaid } = req.body;

    try {
        const student = await Student.findOneAndUpdate({ uuid }, { isPaid }, { new: true });

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.json({ message: "Payment status updated successfully", student }); // remove student from json when deploy.
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

});

// SAVE CURRENT MONTH DATA
// cron.schedule('0 23 7 * *', async () => {
//     try {
//         const students = await Student.find();
//         const currentDate = new Date();
//         const currentYear = currentDate.getFullYear();
//         const currentMonth = currentDate.toLocaleString('default', { month: 'long' });

//         // Collect all students data
//         let feesData = await FeesData.findOne({ year: currentYear });
//         if (!feesData) {
//             feesData = new FeesData({ year: currentYear });
//         }

//         feesData[currentMonth] = students.map(student => ({ name: student.fullName, isPaid: student.isPaid, uuid: student.uuid }));

//         // Save students data
//         await feesData.save();
//         console.log(`Date Stored`);
//     }
//     catch (error) {
//         console.error('Error resetting payment status:', error);
//     }
// }, {
//     scheduled: true,
//     timezone: "Asia/Kolkata"
// });

// // RESET STUDENTS FEES DATA EVERY MONTH'S 8TH DAY
// cron.schedule('0 0 8 * *', async () => {
//     try {
//         const students = await Student.find();
//         // Reset payment status for all students
//         for (const student of students) {
//             student.isPaid = false;
//             await student.save();
//         }

//         console.log(`Reset payment status for all students.`);
//     } catch (error) {
//         console.error('Error resetting payment status:', error);
//     }
// }, {
//     scheduled: true,
//     timezone: "Asia/Kolkata"
// });


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})