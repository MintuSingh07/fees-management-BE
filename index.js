const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const { default: mongoose } = require('mongoose');
require('dotenv').config();

const Student = require("./schema/Student.model");
const FeesData = require('./schema/FeesData.model');
const Admin = require('./schema/Admin.model');
const ImageSchema = require('./schema/Images.model');

const app = express();
const PORT = 8000;

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log("DB connected"))
    .catch((err) => console.log(`Error is ${err}`));

//! Middleware to verify student
function verifyToken(req, res, next) {
    const token = req.headers.authorization;
    
    if (!token) return res.status(401).json({ error: 'Login first' });

    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        req.user = decoded; // Assuming the decoded token contains user data including uuid
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
//! multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
//! Multer Error Handeler
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        res.status(400).json({ error: 'File upload error' });
    } else {
        res.status(500).json({ error: 'Internal server error' });
    }
});

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
app.post('/std-login', async (req, res) => {
    const { fullName, uuid, stdClass } = req.body;

    try {
        const existStudent = await Student.findOne({ uuid });
        if (existStudent) {
            const token = jwt.sign({ uuid, fullName, stdClass }, process.env.SECRET, {expiresIn: '90d'});
            console.log("token is", token);
            return res.status(200).json({ message: "Login Successfully", token });
        } else {
            return res.status(400).json({ message: "UUID is not registered or incorrect" });
        }
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});
//? SHOW STUDENTS API
app.get("/std-list", async (req, res) => {
    const stdData = await Student.find({});
    res.status(200).json(stdData);
});
//? PROFILE
app.get('/profile', verifyToken, async (req, res) => {
    const token = req.header('Authorization');
    
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
//? IMAEG UPLOAD
app.post('/upload', verifyToken, upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        if (req.files.length > 10) {
            return res.status(400).json({ message: 'Maximum 10 files are allowed' });
        }
        const imagePaths = req.files.map(file => file.path);

        const postDetails = new ImageSchema({
            desc: req.body.desc,
            imageUrls: imagePaths
        });
        console.log(postDetails);
        await postDetails.save();

        console.log(req.body.desc);
        console.log(imagePaths);

        res.status(200).json({ message: 'Images uploaded successfully', imagePaths });

    } catch (error) {
        console.error('Error uploading images:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
//? IMAGE RENDER
app.get('/community', verifyToken, async (req, res) => {
    const postDetails = await ImageSchema.find();
    res.status(200).json({ postDetails });
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
});