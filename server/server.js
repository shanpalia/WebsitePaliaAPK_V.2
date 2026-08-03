import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PORT = process.env.PORT || 10000;

if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN missing");
    process.exit(1);
}

if (!CHANNEL_ID) {
    console.error("❌ CHANNEL_ID missing");
    process.exit(1);
}

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
        cb(null, `${timestamp}-${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 500 * 1024 * 1024
    },
    fileFilter(req, file, cb) {

        if (
            file.originalname
                .toLowerCase()
                .endsWith(".apk")
        ) {
            cb(null, true);
        } else {
            cb(new Error("Only APK files are allowed"));
        }

    }
});

app.get("/", (req, res) => {

    res.json({
        success: true,
        service: "PaliaAPK Telegram Upload API",
        version: "2.0.0",
        status: "Running",
        storage: "Telegram",
        max_upload: "500 MB"
    });

});

function deleteFile(filePath) {

    if (filePath && fs.existsSync(filePath)) {

        try {
            fs.unlinkSync(filePath);
        } catch (e) {
            console.error("Cleanup error:", e.message);
        }

    }

}
app.post(
    "/upload-apk",
    upload.single("apk"),
    async (req, res) => {

        let uploadedFile = null;

        try {

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    error: "APK file is required."
                });

            }

            uploadedFile = req.file.path;

            const appName =
                req.body.appName || "Unknown App";

            const version =
                req.body.version || "1.0";

            const developer =
                req.body.developer || "Unknown Developer";

            const fileSizeMB =
                req.file.size / 1024 / 1024;

            if (fileSizeMB > 500) {

                deleteFile(uploadedFile);

                return res.json({

                    success: false,

                    manual_upload: true,

                    message:
                        "APK is larger than 500 MB. Please upload manually."

                });

            }

            const telegramForm =
                new FormData();

            telegramForm.append(
                "chat_id",
                CHANNEL_ID
            );

            telegramForm.append(
                "caption",
`📦 ${appName}

📌 Version : ${version}

👨‍💻 Developer : ${developer}

🌐 Uploaded via PaliaAPK HUB`
            );

            telegramForm.append(
                "document",
                fs.createReadStream(uploadedFile),
                {
                    filename:
                        req.file.originalname
                }
            );

            const telegramResponse =
                await axios.post(

`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,

                telegramForm,

                {

                    headers:
                        telegramForm.getHeaders(),

                    maxBodyLength: Infinity,

                    maxContentLength: Infinity,

                    timeout: 1000 * 60 * 15

                }

            );

            if (!telegramResponse.data.ok) {

                deleteFile(uploadedFile);

                return res.status(500).json({

                    success: false,

                    error:
                        "Telegram upload failed."

                });

            }

            const tg =
                telegramResponse.data.result;
            const document = tg.document || {};

            const publicChannel =
                process.env.CHANNEL_USERNAME || "PaliaAPKHUB";

            const downloadUrl =
                `https://t.me/${publicChannel}/${tg.message_id}`;

            deleteFile(uploadedFile);

            return res.json({

                success: true,

                download_url: downloadUrl,

                telegram_file_id:
                    document.file_id,

                telegram_file_unique_id:
                    document.file_unique_id,

                telegram_message_id:
                    tg.message_id,

                file_name:
                    req.file.originalname,

                file_size:
                    req.file.size,

                mime_type:
                    req.file.mimetype ||

                    "application/vnd.android.package-archive"

            });

        } catch (err) {

            console.error(
                "UPLOAD ERROR:",
                err.response?.data || err.message
            );

            deleteFile(uploadedFile);

            return res.status(500).json({

                success: false,

                error:
                    err.response?.data?.description ||

                    err.message ||

                    "Unknown upload error"

            });

        }

    }

);
// ----------------------------------------------------
// 404 Route
// ----------------------------------------------------

app.use((req, res) => {

    res.status(404).json({

        success: false,

        error: "Endpoint not found."

    });

});

// ----------------------------------------------------
// Multer Error Handler
// ----------------------------------------------------

app.use((err, req, res, next) => {

    if (err instanceof multer.MulterError) {

        if (err.code === "LIMIT_FILE_SIZE") {

            return res.status(400).json({

                success: false,

                manual_upload: true,

                error:
                    "APK exceeds 500 MB limit."

            });

        }

        return res.status(400).json({

            success: false,

            error: err.message

        });

    }

    if (err) {

        return res.status(500).json({

            success: false,

            error: err.message

        });

    }

    next();

});

// ----------------------------------------------------
// Graceful Shutdown
// ----------------------------------------------------

process.on("SIGINT", () => {

    console.log("Stopping server...");

    process.exit(0);

});

process.on("SIGTERM", () => {

    console.log("Stopping server...");

    process.exit(0);

});

// ----------------------------------------------------
// Start Server
// ----------------------------------------------------

app.listen(PORT, () => {

    console.log("====================================");
    console.log("PaliaAPK Telegram Upload API");
    console.log("Running on Port :", PORT);
    console.log("Channel ID      :", CHANNEL_ID);
    console.log("====================================");

});
