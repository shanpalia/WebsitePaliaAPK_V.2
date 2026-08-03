import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (req,file,cb)=>{
        cb(null,file.originalname);
    }
})

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {

    res.json({
        success: true,
        service: "PaliaAPK Telegram Upload API",
        version: "1.0.0",
        status: "Running"
    });

});

app.post(
    "/upload-apk",
    upload.single("apk"),
    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    error: "APK file missing"
                });

            }

            const sizeMB =
                req.file.size /
                1024 /
                1024;

            if (sizeMB > 500) {

                return res.json({

                    success: false,

                    manual_upload: true,

                    message:
                        "APK is larger than 500 MB. Upload manually to Telegram."

                });

            }

            const form = new FormData();

            form.append(
                "chat_id",
                CHANNEL_ID
            );

            form.append(
                "caption",
`
📦 ${req.body.app_name}

Version : ${req.body.version}

Developer : ${req.body.developer}
`
            );

            form.append(
                "document",
                req.file.buffer,
                req.file.originalname
            );

            const telegram =
                await axios.post(

`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,

                    form,

                    {

                        headers:
                            form.getHeaders(),

                        maxBodyLength: Infinity,

                        maxContentLength: Infinity

                    }

                );

            if (
                !telegram.data.ok
            ) {

                return res.status(500).json({

                    success: false,

                    error:
                        "Telegram upload failed"

                });

            }

            const result =
                telegram.data.result;

            res.json({

                success: true,

                download_url:
https://t.me/PaliaAPKHUB/${result.message_id}

                telegram_file_id:
                    result.document.file_id,

                telegram_file_unique_id:
                    result.document.file_unique_id,

                telegram_message_id:
                    result.message_id

            });

        }

        catch (err) {

            console.error(err);

            res.status(500).json({

                success: false,

                error:
                    err.message

            });

        }

    }

);

app.listen(

    PORT,

    () => {

        console.log(

            "Server running on port",

            PORT

        );

    }

);
