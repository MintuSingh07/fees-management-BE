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
app.use('/upload', express.static('upload'))

mongoose.connect(process.env.MONGODB_URL)
    .then(() => console.log("DB connected"))
    .catch((err) => console.log(`Error is ${err}`));

//! Middleware to verify student
function verifyStdToken(req, res, next) {
    let token = req.headers.authorization;
    token = token.split(" ")[1];

    if (!token) return res.status(401).json({ error: 'Login first' });

    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
//! Middleware to verify student admin
function verifyAdminToken(req, res, next) {
    let admToken = req.headers.authorization;
    admToken = admToken.split(" ")[1];

    if (!admToken) return res.status(401).json({ error: 'Login first' });

    try {
        const decoded = jwt.verify(admToken, process.env.SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}
//! multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './upload/')
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

const accountSid = process.env.ACCSID;
const authToken = process.env.AUTHTOKEN;
const client = require('twilio')(accountSid, authToken);


//? ADMIN LOGIN ✅
app.post('/admin-login', async (req, res) => {
    const { adminName, adminCode } = req.body;

    try {
        const existAdmin = await Admin.findOne({ adminCode });
        if (existAdmin) {
            const token = jwt.sign({ adminName, adminCode }, process.env.SECRET, { expiresIn: '90d' });
            return res.status(200).json({ message: "Login as admin is Successful", token });
        } else {
            res.status(400).json({ message: "Admin code is not valid" });
        }
    } catch (error) {
        res.status(400).json({ error: error });
    }
});
//? ADD STUDENTS API ✅
app.post('/add-std', async (req, res) => {
    const { fullName, phone, stdClass } = req.body;

    const admToken = req.header('Authorization');

    if (!admToken) {
        return res.status(401).json({ message: "You are unauthorized to access this page..." });
    }

    // let updatedNum = phone;
    // let tempNum = phone.substring(0, 2); // Get the first two characters of the phone number
    // console.log(tempNum);
    // if (tempNum !== '+91') { // Check if the first two characters are not equal to '+91'
    //     updatedNum = '+91' + phone; // Prepend '+91' to the phone number
    //     console.log(updatedNum);
    // }
    
    try {
        const existStudent = await Student.findOne({ phone });

        if (!existStudent) {
            const newStudent = new Student({
                fullName,
                phone,
                stdClass,
                uuid: uuidv4().substring(0, 8),
            });
            await newStudent.save();
            return res.status(200).json({ message: "Student registered successfully", newStudent });
        } else {
            return res.status(400).json({ error: "Student Already Exists" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
//? STUDENT LOGIN ✅
app.post('/std-login', async (req, res) => {
    const { uuid } = req.body;

    try {
        const existStudent = await Student.findOne({ uuid });
        if (existStudent) {
            const token = jwt.sign({ uuid }, process.env.SECRET, { expiresIn: '90d' });
            return res.status(200).json({ message: "Login Successfully", token });
        } else {
            return res.status(400).json({ message: "UUID is not registered or incorrect" });
        }
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
});
//? SHOW STUDENTS API ✅
app.get("/std-list", async (req, res) => {
    const admToken = req.header('Authorization');

    if (!admToken) {
        return res.status(401).json({ message: "You are unauthorized to access this page..." });
    }

    const stdData = await Student.find({});
    res.status(200).json(stdData);
});
//? PROFILE ✅
app.get('/profile', async (req, res) => {
    let token = req.header('Authorization');
    token = token.split(" ")[1];

    if (!token) return res.status(401).json({ message: "You are unauthorized to access this page..." })

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
//? STUDENT PAYMENT UPDATE API ✅
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
//? IMAEG UPLOAD ✅
app.post('/upload', upload.array('images', 10), async (req, res) => {
    let token = req.header('Authorization');
    token = token.split(" ")[1];

    if (!token) return res.status(401).json({ message: "You are unauthorized to access this page..." })

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        if (req.files.length > 10) {
            return res.status(400).json({ message: 'Maximum 10 files are allowed' });
        }
        const imagePaths = req.files.map(file => file.path);

        const postDetails = new ImageSchema({
            forClass: req.body.forClass,
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
//? IMAGE RENDER ✅
app.get('/community', async (req, res) => {
    let token = req.header('Authorization');
    token = token.split(" ")[1];

    if (!token) return res.status(401).json({ message: "You are unauthorized to access this page..." })

    const postDetails = await ImageSchema.find();
    res.status(200).json({ postDetails });
});

//? SAVE CURRENT MONTH DATA
cron.schedule('0 23 28 * *', async () => {
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
//? RESET STUDENTS FEES DATA EVERY MONTH'S 1ST DAY
cron.schedule('0 0 1 * *', async () => {
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

//? SEND MESSAGE TO STUDENTS WHO DOES'NT PAY
cron.schedule('0 10 6 * *', async () => {
    const unpaidStudents = await Student.find({ isPaid: false });
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    const currentYear = currentDate.getFullYear();

    unpaidStudents.forEach(async student => {
        try {
            await client.messages.create({
                from: process.env.NUMBER,
                to: student.phone,
                body: `Reminder: ${student.fullName}, Your payment of ${currentMonth},${currentYear} is pending. Please clear the fees as soon as possible.`
            }).then(message => console.log(message.sid)).done();

        } catch (error) {
            console.error(`Error sending message to ${student.phone}:`, error);
        }
    })
}, {
    scheduled: true,
    timezone: "Asia/Kolkata"
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
