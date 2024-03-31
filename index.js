const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');
require('dotenv').config();

const Student = require("./schema/Student.model");
const FeesData = require('./schema/FeesData.model');
const Admin = require('./schema/Admin.model');

const app = express();
const PORT = 8000;

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log("DB connected"))
    .catch((err) => console.log(`Error is ${err}`));

//! Middleware to verify student
function verifyToken(req, res, next) {
    const token = req.header('Authorization');

    if (!token) return res.status(401).json({ error: 'Login first' });
    try {
        const decoded = jwt.decode(token, process.env.SECRET);
        req.uuid = decoded.uuid;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

//? ADMIN LOGIN
app.post('/admin-login', async (req, res) => {
    const { adminName, adminCode } = req.body;

    try {
        const existAdmin = await Admin.findOne({ adminCode });
        if (existAdmin) {
            const token = jwt.sign({ adminName, adminCode }, process.env.SECRET);
            res.cookie('token', token, { httpOnly: true });
            res.status(200).json({ message: "Login as admin is Successful", existAdmin });
        } else {
            res.status(400).json({ message: "Admin code is not valid" });
        }
    } catch (error) {
        res.status(400).json({ error: error });
    }
});
//? ADD STUDENTS API
app.post('/add-std', async (req, res) => {
    const { fullName, phone, stdClass } = req.body;

    const existStudent = await Student.findOne({ phone });
    if (!existStudent) {
        try {
            const newStudent = new Student({
                fullName,
                phone,
                stdClass,
                uuid: uuidv4().substring(0, 8),
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
//? STUDENT LOGIN
app.post('/login', async (req, res) => {
    const { fullName, uuid, stdClass } = req.body;

    try {
        const existStudent = await Student.findOne({ uuid });
        if (existStudent) {
            const token = jwt.sign({ uuid, fullName, stdClass }, process.env.SECRET);
            res.cookie('token', token, { httpOnly: true });
            res.status(200).json({ message: "Login Successfully", uuid });
        } else {
            res.status(400).json({ message: "UUID is not registered or incorrect" });
        }
    } catch (error) {
        res.status(400).json({ error: error });
    }
});
//? SHOW STUDENTS API
app.get("/std-list", async (req, res) => {
    const stdData = await Student.find({});
    res.status(200).json(stdData);
});
//? Profile
app.get('/profile', verifyToken, async (req, res) => {
    const token = req.cookies.token;

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.decode(token, process.env.SECRET);
        const { uuid } = decoded;

        const existStudent = await Student.findOne({ uuid });
        if (!existStudent) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ existStudent });
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
});
//? STUDENT PAYMENT UPDATE API
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

//? SAVE CURRENT MONTH DATA
cron.schedule('0 23 7 * *', async () => {
    try {
        const students = await Student.find();
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.toLocaleString('default', { month: 'long' });

        // Collect all students data
        let feesData = await FeesData.findOne({ year: currentYear });
        if (!feesData) {
            feesData = new FeesData({ year: currentYear });
        }

        feesData[currentMonth] = students.map(student => ({ name: student.fullName, isPaid: student.isPaid, uuid: student.uuid }));

        // Save students data
        await feesData.save();
        console.log(`Date Stored`);
    }
    catch (error) {
        console.error('Error resetting payment status:', error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});
//? RESET STUDENTS FEES DATA EVERY MONTH'S 8TH DAY
cron.schedule('0 0 8 * *', async () => {
    try {
        const students = await Student.find();
        // Reset payment status for all students
        for (const student of students) {
            student.isPaid = false;
            await student.save();
        }

        console.log(`Reset payment status for all students.`);
    } catch (error) {
        console.error('Error resetting payment status:', error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
})