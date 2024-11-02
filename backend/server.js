

///////////
const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cors = require('cors');
const mongoose = require('mongoose');
const Redis = require('ioredis');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection setup
mongoose.connect('mongodb+srv://shauryaroy2004:yYSY8ldiCGUUENih@cluster0.i36zm.mongodb.net/', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('Failed to connect to MongoDB:', error));

// Define User schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    // Add other fields as needed (e.g., name, password)
});

const User = mongoose.model('User', userSchema);

// Nodemailer configuration
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: "otpchecker69@gmail.com",
        pass: "dykncjebgickpxxp",
    },
});

// Connect to Redis
const redis = new Redis();

// API to check if email exists
app.post('/api/check-email', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        res.json({ exists: !!user });
        console.log("Database query completed. User found:", user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error checking email' });
    }
});

// API to send OTP
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        console.log("Received email:", email);

        const user = await User.findOne({ email });
        console.log("User found:", user);

        if (!user) {
            console.log("Email not found in database");
            return res.status(404).json({ error: "Email not found" });
        }

        function generateOTP() {
            return Math.floor(100000 + Math.random() * 900000); // Generates a 6-digit OTP
        }

        const otp = generateOTP();
        console.log("Generated OTP:", otp);

        const mailOptions = {
            from: 'youremail@gmail.com',
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP is ${otp}`
        };

        await transporter.sendMail(mailOptions);
        console.log("OTP email sent successfully");

        // Store OTP in Redis with an expiration time (e.g., 5 minutes)
        await redis.setex(`otp:${email}`, 300, otp);

        res.status(200).json({ message: "OTP sent" });
    } catch (error) {
        console.error("Error occurred:", error); // Detailed error log
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
    const { email, otpEntered } = req.body;

    // Check if both email and OTP are provided
    if (!email || !otpEntered) {
        return res.status(400).send('Email and OTP are required');
    }

    try {
        // Fetch the stored OTP from Redis
        const storedOtp = await redis.get(`otp:${email}`);

        // Check if OTP is present
        if (!storedOtp) {
            return res.status(400).send('OTP expired or not found');
        }

        console.log(`Stored OTP: ${storedOtp}, Entered OTP: ${otpEntered}`);

        // Verify if entered OTP matches stored OTP
        if (storedOtp === otpEntered) {
            console.log('OTP matched successfully');
            return res.status(200).send('OTP verified successfully');
        } else {
            console.log('OTP did not match');
            return res.status(400).send('Invalid OTP');
        }
    } catch (error) {
        console.error('Error during OTP verification:', error);
        res.status(500).send('Server error');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
