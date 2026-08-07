import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { CustomFile } from "telegram/client/uploads.js";

dotenv.config();
console.log({
  API_ID: process.env.API_ID,
  API_HASH: process.env.API_HASH ? "FOUND" : "MISSING",
  SESSION_STRING: process.env.SESSION_STRING ? "FOUND" : "MISSING",
  CHANNEL_USERNAME: process.env.CHANNEL_USERNAME,
  PORT: process.env.PORT
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const safeName = file.originalname.replace(/[^\w.-]/g, "_");
        cb(null, `${uniquePrefix}-${safeName}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
       fileSize: 2 * 1024 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith(".apk")) {
        cb(null, true);
    } else {
        cb(new Error("Only APK files are allowed."));
    }
}
});

const apiId = parseInt(process.env.API_ID, 10);
const apiHash = process.env.API_HASH;
const sessionString = process.env.SESSION_STRING || "";
const channelUsername = process.env.CHANNEL_USERNAME;
const port = process.env.PORT || 3000;

if (!apiId || isNaN(apiId) || !apiHash || !sessionString || !channelUsername) {
    console.error("CRITICAL ERROR: Missing required environment variables (API_ID, API_HASH, SESSION_STRING, CHANNEL_USERNAME).");
}

const stringSession = new StringSession(sessionString);
const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 10,
    requestRetries: 5,
    retryDelay: 2000,
    useWSS: false
});

let isConnected = false;

async function ensureTelegramClient() {
    if (!isConnected) {
        console.log("Connecting to Telegram MTProto servers via official telegram package...");
        await client.connect();
        const checkAuth = await client.checkAuthorization();
        if (!checkAuth) {
            isConnected = false;
            throw new Error("Telegram SESSION_STRING is unauthorized or expired. Please re-authenticate.");
        }
        isConnected = true;
        console.log("Successfully connected and authorized with Telegram MTProto.");
    }
}

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "UP",
        service: "PaliaAPK HUB Telegram Upload API",
        telegramConnected: isConnected,
        timestamp: new Date().toISOString()
    });
});

app.post("/upload-apk", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    error: "File size exceeds maximum allowed upload limit."
                });
            }
            return res.status(400).json({
                success: false,
                error: `Multer upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(500).json({
                success: false,
                error: `Upload middleware error: ${err.message}`
            });
        }
        next();
    });
}, async (req, res) => {
    let filePath = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No file received in upload request."
            });
        }

        filePath = req.file.path;
        const fileName = req.file.originalname;
        const fileSize = req.file.size;
        const mimeType = req.file.mimetype || "application/vnd.android.package-archive";

        await ensureTelegramClient();

        const formattedChannel = channelUsername.startsWith("@") ? channelUsername : `@${channelUsername}`;

        const customFile = new CustomFile(fileName, fileSize, filePath);

        const uploadedFile = await client.uploadFile({
            file: customFile,
            workers: 4,
            onProgress: (progress) => {
                const percentage = Math.round(progress * 100);
                console.log(`Uploading ${fileName}: ${percentage}%`);
            }
        });

        const result = await client.sendFile(formattedChannel, {
            file: uploadedFile,
           caption: `📦 ${fileName}\n💾 Size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
            forceDocument: true,
            attributes: [
                new Api.DocumentAttributeFilename({
                    fileName: fileName
                })
            ]
        });

        const messageId = result.id;
        const cleanChannelName = formattedChannel.replace("@", "");
        const downloadUrl = `https://t.me/${cleanChannelName}/${messageId}`;

        let telegramFileId = String(messageId);
        let telegramFileUniqueId = String(messageId);

        if (result.media && result.media.document) {
            telegramFileId = String(result.media.document.id);
            telegramFileUniqueId = String(result.media.document.accessHash);
        }

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return res.status(200).json({
            success: true,
            download_url: downloadUrl,
            telegram_file_id: telegramFileId,
            telegram_file_unique_id: telegramFileUniqueId,
            telegram_message_id: messageId,
            file_name: fileName,
            file_size: fileSize,
            mime_type: mimeType
        });

    } catch (error) {
        console.error("APK Upload Error:", error);

        if (filePath && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkErr) {
                console.error("Failed to cleanup temporary file:", unlinkErr);
            }
        }

        if (error.message && error.message.includes("SESSION_STRING")) {
            return res.status(401).json({
                success: false,
                error: "Telegram authentication failed. Invalid or expired session."
            });
        }

        return res.status(500).json({
            success: false,
            error: error.message || "Internal server error occurred during APK processing."
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Route not found"
    });
});

app.use((err, req, res, next) => {
    console.error("Unhandled Global Error:", err);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
            fs.unlinkSync(req.file.path);
        } catch (unlinkErr) {
            console.error("Failed to cleanup temporary file in global error handler:", unlinkErr);
        }
    }
    res.status(500).json({
        success: false,
        error: "An unexpected global server error occurred."
    });
});

const server = app.listen(port, () => {
    console.log(`Server running and listening on port ${port}`);
});
(async () => {
    try {
        await ensureTelegramClient();
        console.log("Telegram Connected Successfully.");
    } catch (err) {
        console.error("Telegram Connection Failed:", err.message);
    }
})();
async function shutdownGracefully(signal) {
    console.log(`Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
        console.log("HTTP server closed.");
        if (isConnected) {
            try {
                await client.disconnect();
                console.log("Telegram client disconnected.");
            } catch (disconnectErr) {
                console.error("Error disconnecting Telegram client:", disconnectErr);
            }
        }
        process.exit(0);
    });
}

process.on("SIGTERM", () => shutdownGracefully("SIGTERM"));
process.on("SIGINT", () => shutdownGracefully("SIGINT"));
