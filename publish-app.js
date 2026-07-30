import { uploadApkToTelegram } from "./telegram-publisher.js";

const WORKER_URL =
"https://paliaapk-worker.shanpalia786.workers.dev";

document.addEventListener("DOMContentLoaded", () => {

const btnPublishTelegram =
document.getElementById("btnPublishTelegram");

if(!btnPublishTelegram) return;

btnPublishTelegram.addEventListener("click", publishTelegram);

});

async function publishTelegram(){

try{

openPublishModal();

updateProgress(
5,
"Preparing upload...",
"chkStep1",
"active"
);

const appData = JSON.parse(
localStorage.getItem("publish_app") || "{}"
);

if(!appData){
throw new Error("Application data not found.");
}

const apkBlob = await getApkBlob();

if(!apkBlob){
throw new Error("APK file not found.");
}

updateProgress(
20,
"Uploading APK to Telegram...",
"chkStep2",
"active"
);

const telegramResult =
await uploadApkToTelegram({

apkFile: apkBlob,

appName: appData.name,

version: appData.version,

developer: appData.developer,

workerUrl: WORKER_URL

});

if(!telegramResult.success){

throw new Error(
telegramResult.message ||
"Telegram upload failed."
);

}

updateProgress(
55,
"Telegram upload completed.",
"chkStep2",
"completed"
);

window.telegramUpload = telegramResult;

await uploadAssetsToSupabase(appData);

updateProgress(
80,
"Saving app information...",
"chkStep3",
"active"
);

await saveAppToDatabase(
appData,
telegramResult
);

updateProgress(
100,
"Publish completed.",
"chkStep4",
"completed"
);

showSuccessState(
telegramResult.download_url
);

}catch(err){

console.error(err);

showFailedState(
err.message
);

}

}/* ==========================================================
   PART 2
   APK + SUPABASE HELPERS
========================================================== */

async function getApkBlob() {

    // Try IndexedDB
    if (window.appUploadFiles?.apk) {
        return window.appUploadFiles.apk;
    }

    // Try File Input
    const apkInput = document.querySelector(
        'input[type="file"][accept=".apk,application/vnd.android.package-archive"]'
    );

    if (apkInput?.files?.length) {
        return apkInput.files[0];
    }

    throw new Error("APK file not selected.");

}


async function uploadAssetsToSupabase(appData){

    updateProgress(
        65,
        "Uploading images...",
        "chkStep3",
        "active"
    );

    appData.icon_url =
        await uploadImageToBucket(
            window.appUploadFiles?.icon,
            "app-icons"
        );

    appData.banner_url =
        await uploadImageToBucket(
            window.appUploadFiles?.banner,
            "app-banners"
        );

    appData.screenshots = [];

    if(window.appUploadFiles?.screenshots){

        for(const shot of window.appUploadFiles.screenshots){

            const url =
                await uploadImageToBucket(
                    shot,
                    "app-screenshots"
                );

            appData.screenshots.push(url);

        }

    }

    updateProgress(
        75,
        "Images uploaded.",
        "chkStep3",
        "completed"
    );

}


async function uploadImageToBucket(file,bucket){

    if(!file) return null;

    const fileName =
        Date.now() +
        "-" +
        file.name.replace(/\s+/g,"_");

    const {data,error} =
        await supabase.storage
        .from(bucket)
        .upload(fileName,file,{
            cacheControl:"3600",
            upsert:false
        });

    if(error)
        throw error;

    const {
        data:publicData
    }=
    supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

    return publicData.publicUrl;

}


async function saveAppToDatabase(
    appData,
    telegram
){

    const payload={

        name:appData.name,

        version:appData.version,

        developer:appData.developer,

        package_name:appData.packageName,

        category:appData.category,

        description:appData.description,

        android_version:appData.androidVersion,

        tags:appData.tags,

        icon_url:appData.icon_url,

        banner_url:appData.banner_url,

        screenshots:appData.screenshots,

        telegram_file_id:
            telegram.telegram_file_id,

        telegram_file_unique_id:
            telegram.telegram_file_unique_id,

        telegram_message_id:
            telegram.telegram_message_id,

        apk_url:
            telegram.download_url,

        published:true,

        created_at:
            new Date().toISOString()

    };

    const {error}=
    await supabase
    .from("apps")
    .insert(payload);

    if(error)
        throw error;

}
