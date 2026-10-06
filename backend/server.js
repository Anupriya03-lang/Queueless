const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

const PORT = 5000;

app.use(cors());
app.use(express.json());


// ========================================
// MONGODB CONNECTION
// ========================================

mongoose
    .connect("mongodb://127.0.0.1:27017/queueless")
    .then(() => {
        console.log("MongoDB connected successfully");
        loadTokens();
    })
    .catch((error) => {
        console.log("MongoDB connection failed:", error.message);
    });


// ========================================
// TOKEN SCHEMA
// ========================================

const tokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },

    service: {
        type: String,
        required: true
    },

    registerNumber: {
        type: String,
        required: true
    },

    createdAt: {
        type: Date,
        required: true
    },

    validUntil: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        default: "Waiting"
    }
});

const Token = mongoose.model("Token", tokenSchema);


// ========================================
// SERVICES
// ========================================

const services = [
    {
        id: 1,
        name: "Administration Office"
    },
    {
        id: 2,
        name: "Fees Section"
    },
    {
        id: 3,
        name: "Certificate Section"
    },
    {
        id: 4,
        name: "Academic Section"
    },
    {
        id: 5,
        name: "Placement Cell"
    },
    {
        id: 6,
        name: "Library"
    },
    {
        id: 7,
        name: "Transport Office"
    },
    {
        id: 8,
        name: "IT Support"
    }
];


// ========================================
// ADMIN LOGIN
// ========================================

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";


// ========================================
// MEMORY TOKENS
// ========================================

let tokens = [];

let tokenNumber = 1;


// ========================================
// LOAD TOKENS FROM MONGODB
// ========================================

async function loadTokens() {

    try {

        tokens = await Token.find().sort({
            createdAt: 1
        });

        let highestNumber = 0;

        tokens.forEach((item) => {

            const number = parseInt(
                item.token.replace("Q", "")
            );

            if (!isNaN(number) && number > highestNumber) {
                highestNumber = number;
            }

        });

        tokenNumber = highestNumber + 1;

        console.log(
            `${tokens.length} tokens loaded from MongoDB`
        );

    } catch (error) {

        console.log(
            "Error loading tokens:",
            error.message
        );

    }

}


// ========================================
// INDIA TIME
// ========================================

function getIndiaTime() {

    const now = new Date();

    const indiaTime = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }
    ).formatToParts(now);

    const hour = parseInt(
        indiaTime.find(
            part => part.type === "hour"
        ).value
    );

    const minute = parseInt(
        indiaTime.find(
            part => part.type === "minute"
        ).value
    );

    return {
        hour,
        minute
    };

}


// ========================================
// CHECK BOOKING TIME
// ========================================

function isBookingOpen() {

    const time = getIndiaTime();

    const currentMinutes =
        time.hour * 60 + time.minute;

    const openingTime =
        8 * 60 + 45;

    const closingTime =
        16 * 60;

    return (
        currentMinutes >= openingTime &&
        currentMinutes < closingTime
    );

}


// ========================================
// BOOKING MESSAGE
// ========================================

function getBookingMessage() {

    if (isBookingOpen()) {

        return "Booking is OPEN - 8:45 AM to 4:00 PM";

    }

    return "Booking is CLOSED - Available from 8:45 AM to 4:00 PM";

}


// ========================================
// UPDATE EXPIRED TOKENS
// ========================================

async function updateExpiredTokens() {

    const now = new Date();

    for (const token of tokens) {

        if (
            (token.status === "Waiting" ||
                token.status === "Called") &&
            now >= new Date(token.validUntil)
        ) {

            token.status = "Expired";

            try {

                await Token.updateOne(
                    {
                        token: token.token
                    },
                    {
                        $set: {
                            status: "Expired"
                        }
                    }
                );

            } catch (error) {

                console.log(
                    "Error updating expired token:",
                    error.message
                );

            }

        }

    }

}


// ========================================
// EXPIRE TOKENS EVERY 5 SECONDS
// ========================================

setInterval(() => {

    updateExpiredTokens();

}, 5000);


// ========================================
// GENERATE TOKEN NUMBER
// ========================================

function generateTokenNumber() {

    const number =
        String(tokenNumber).padStart(3, "0");

    tokenNumber++;

    return `Q${number}`;

}


// ========================================
// PEOPLE AHEAD
// ========================================

function getPeopleAhead(token) {

    const waitingTokens =
        tokens.filter((item) => {

            return (
                item.status === "Waiting" &&
                new Date(item.createdAt) <
                new Date(token.createdAt)
            );

        });

    return waitingTokens.length;

}


// ========================================
// HOME API
// ========================================

app.get("/", (req, res) => {

    res.json({
        message: "Queueless Backend is Running",
        status: "success"
    });

});


// ========================================
// GET SERVICES
// ========================================

app.get("/api/services", (req, res) => {

    res.json(services);

});


// ========================================
// BOOKING STATUS
// ========================================

app.get("/api/booking-status", (req, res) => {

    res.json({

        open: isBookingOpen(),

        message: getBookingMessage(),

        openingTime: "8:45 AM",

        closingTime: "4:00 PM",

        tokenValidity: "20 minutes"

    });

});


// ========================================
// CREATE TOKEN
// ========================================

app.post("/api/token", async (req, res) => {

    try {

        await updateExpiredTokens();

        const {
            service,
            registerNumber
        } = req.body;


        // Check booking time

        if (!isBookingOpen()) {

            return res.status(400).json({

                message:
                    "Token booking is available only between 8:45 AM and 4:00 PM."

            });

        }


        // Check service

        if (!service) {

            return res.status(400).json({

                message:
                    "Please select a service."

            });

        }


        // Check register number

        if (!registerNumber) {

            return res.status(400).json({

                message:
                    "Please enter your register number."

            });

        }


        // Check valid service

        const selectedService =
            services.find(
                item => item.name === service
            );


        if (!selectedService) {

            return res.status(400).json({

                message:
                    "Invalid service selected."

            });

        }


        // Check duplicate active token

        const existingToken =
            tokens.find(item =>

                item.registerNumber === registerNumber &&
                (
                    item.status === "Waiting" ||
                    item.status === "Called"
                )

            );


        if (existingToken) {

            return res.status(400).json({

                message:
                    `You already have an active token: ${existingToken.token}`

            });

        }


        // Generate dates

        const createdAt = new Date();

        const validUntil =
            new Date(
                createdAt.getTime() +
                20 * 60 * 1000
            );


        // Generate token

        const token =
            generateTokenNumber();


        // Create MongoDB document

        const newToken =
            new Token({

                token: token,

                service: service,

                registerNumber:
                    registerNumber,

                createdAt:
                    createdAt,

                validUntil:
                    validUntil,

                status:
                    "Waiting"

            });


        // SAVE TO MONGODB

        await newToken.save();


        // Add to memory

        tokens.push(newToken);


        console.log(
            `Token ${token} saved to MongoDB`
        );


        // Response

        res.status(201).json({

            success: true,

            token:
                newToken.token,

            service:
                newToken.service,

            registerNumber:
                newToken.registerNumber,

            createdAt:
                newToken.createdAt,

            validUntil:
                newToken.validUntil,

            status:
                newToken.status,

            peopleAhead:
                getPeopleAhead(newToken)

        });

    } catch (error) {

        console.log(
            "Token creation error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to create token.",

            error:
                error.message

        });

    }

});


// ========================================
// GET PARTICULAR TOKEN
// ========================================

app.get("/api/token/:token", async (req, res) => {

    await updateExpiredTokens();

    const token =
        tokens.find(
            item =>
                item.token ===
                req.params.token
        );


    if (!token) {

        return res.status(404).json({

            message:
                "Token not found."

        });

    }


    res.json({

        token:
            token.token,

        service:
            token.service,

        registerNumber:
            token.registerNumber,

        createdAt:
            token.createdAt,

        validUntil:
            token.validUntil,

        status:
            token.status,

        peopleAhead:
            getPeopleAhead(token)

    });

});


// ========================================
// CANCEL TOKEN
// ========================================

app.delete("/api/token/:token", async (req, res) => {

    const token =
        tokens.find(
            item =>
                item.token ===
                req.params.token
        );


    if (!token) {

        return res.status(404).json({

            message:
                "Token not found."

        });

    }


    if (
        token.status === "Completed" ||
        token.status === "Skipped" ||
        token.status === "Expired"
    ) {

        return res.status(400).json({

            message:
                "This token cannot be cancelled."

        });

    }


    token.status =
        "Cancelled";


    await Token.updateOne(

        {
            token:
                token.token
        },

        {
            $set: {
                status:
                    "Cancelled"
            }
        }

    );


    res.json({

        success: true,

        message:
            "Token cancelled successfully.",

        token:
            token.token

    });

});


// ========================================
// LIVE QUEUE
// ========================================

app.get("/api/live-queue", async (req, res) => {

    await updateExpiredTokens();

    const current =
        tokens.find(
            item =>
                item.status ===
                "Called"
        );


    const waiting =
        tokens.filter(
            item =>
                item.status ===
                "Waiting"
        );


    const completed =
        tokens.filter(
            item =>
                item.status ===
                "Completed"
        );


    res.json({

        currentToken:
            current
                ? current.token
                : null,

        waitingCount:
            waiting.length,

        completedCount:
            completed.length

    });

});


// ========================================
// ADMIN LOGIN
// ========================================

app.post("/api/admin/login", (req, res) => {

    const {
        username,
        password
    } = req.body;


    if (
        username === ADMIN_USERNAME &&
        password === ADMIN_PASSWORD
    ) {

        return res.json({

            success: true,

            message:
                "Admin login successful."

        });

    }


    res.status(401).json({

        success: false,

        message:
            "Invalid username or password."

    });

});


// ========================================
// ADMIN - VIEW ALL TOKENS
// ========================================

app.get("/api/admin/tokens", async (req, res) => {

    await updateExpiredTokens();

    const adminTokens =
        tokens.map(token => ({

            token:
                token.token,

            registerNumber:
                token.registerNumber,

            service:
                token.service,

            createdAt:
                token.createdAt,

            validUntil:
                token.validUntil,

            status:
                token.status

        }));


    res.json(adminTokens);

});


// ========================================
// ADMIN - CALL NEXT TOKEN
// ========================================

app.post("/api/admin/next", async (req, res) => {

    await updateExpiredTokens();


    // Check current called token

    const current =
        tokens.find(
            item =>
                item.status ===
                "Called"
        );


    if (current) {

        return res.status(400).json({

            message:
                `${current.token} is currently being served.`

        });

    }


    // Find first waiting token

    const nextToken =
        tokens.find(
            item =>
                item.status ===
                "Waiting"
        );


    if (!nextToken) {

        return res.status(404).json({

            message:
                "No waiting tokens."

        });

    }


    // Change status

    nextToken.status =
        "Called";


    // Update MongoDB

    await Token.updateOne(

        {
            token:
                nextToken.token
        },

        {
            $set: {
                status:
                    "Called"
            }
        }

    );


    res.json({

        success: true,

        message:
            "Next token called.",

        token:
            nextToken.token,

        service:
            nextToken.service

    });

});


// ========================================
// ADMIN - COMPLETE / SKIP
// ========================================

app.put(
    "/api/admin/token/:token/:action",
    async (req, res) => {

        const token =
            tokens.find(
                item =>
                    item.token ===
                    req.params.token
            );


        if (!token) {

            return res.status(404).json({

                message:
                    "Token not found."

            });

        }


        const action =
            req.params.action;


        if (action === "complete") {

            token.status =
                "Completed";

        }

        else if (action === "skip") {

            token.status =
                "Skipped";

        }

        else {

            return res.status(400).json({

                message:
                    "Invalid action."

            });

        }


        // Update MongoDB

        await Token.updateOne(

            {
                token:
                    token.token
            },

            {
                $set: {
                    status:
                        token.status
                }
            }

        );


        res.json({

            success: true,

            message:
                `Token ${token.token} marked as ${token.status}.`,

            token:
                token.token,

            status:
                token.status

        });

    }
);


// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {

    console.log(
        `Queueless backend running at http://localhost:${PORT}`
    );

});