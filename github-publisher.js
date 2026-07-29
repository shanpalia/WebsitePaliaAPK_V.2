(function () {
"use strict";

/* ==========================================================
   PALIAAPK HUB
   GitHub Publisher v3
   Part 1
========================================================== */

const patInput = document.getElementById("ghToken");
const ownerInput = document.getElementById("ghOwner");
const repoInput = document.getElementById("ghRepo");

const startBtn = document.getElementById("btnPublishGithub");

const progressContainer =
document.getElementById("publishModal");

const statusText =
document.getElementById("progressStatusText");
const progressBar =
    document.getElementById("progressBarFill");
const DB_NAME="PaliaAPKPendingUpload";
const STORE_NAME="files";

const SUPABASE_URL="https://ralinnuegsbuvlhwpzln.supabase.co";

const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbGlubnVlZ3NidXZsaHdwemxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTU2NDIsImV4cCI6MjA5NTg3MTY0Mn0.hIec6UxRx5gzSMTi5oJ3_xXw3d1QKCmKsPF-stBwIFE";

const sb=window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

const ctx={

pat:null,

repo:null,

app:null,

apk:null,

icon:null,

banner:null,

screenshots:[],

release:null,

asset:null,

iconUrl:null,

bannerUrl:null,

screenshotUrls:[]

};

patInput.value=
localStorage.getItem("github_pat")||"";

const savedRepo = localStorage.getItem("github_repo") || "";

if (savedRepo.includes("/")) {
    const [owner, repo] = savedRepo.split("/");
    ownerInput.value = owner;
    repoInput.value = repo;
}

function saveGithubSettings() {

    localStorage.setItem(
        "github_pat",
        patInput.value.trim()
    );

    localStorage.setItem(
        "github_repo",
        ownerInput.value.trim() + "/" + repoInput.value.trim()
    );

}

function updateProgress(percent,text){

progressContainer.style.display="block";

progressBar.style.width=
percent+"%";

statusText.textContent=text;

console.log(
"[Publisher]",
percent+"%",
text
);

}

function showError(err){

console.error(err);

alert(err);

updateProgress(
0,
err
);

}

function openDB(){

return new Promise(function(resolve,reject){

const request=
indexedDB.open(
DB_NAME,
1
);

request.onerror=function(){

reject(
new Error(
"Cannot open IndexedDB."
)
);

};

request.onsuccess=function(e){

resolve(
e.target.result
);

};

});

}

function readFile(key){

return new Promise(async function(resolve,reject){

const db=
await openDB();

const tx=
db.transaction(
STORE_NAME,
"readonly"
);

const store=
tx.objectStore(
STORE_NAME
);

const req=
store.get(key);

req.onsuccess=function(){

resolve(
req.result
);

};

req.onerror=function(){

reject(
new Error(
"Missing "+key
)
);

};

});

}

async function loadPublishData(){

ctx.app=
JSON.parse(
sessionStorage.getItem(
"paliaapk_pending_app"
)
);

if(!ctx.app){

throw new Error(
"No pending app found."
);

}

ctx.apk=
await readFile("apk");

ctx.icon=
await readFile("icon");

ctx.banner=
await readFile("banner");

for(let i=0;i<5;i++){

const file=
await readFile(
"screenshot-"+i
);

if(file){

ctx.screenshots.push(
file
);

}

}

if(!ctx.apk){

throw new Error(
"APK file missing."
);

}

ctx.pat=
patInput.value.trim();

ctx.repo =
    ownerInput.value.trim() + "/" +
    repoInput.value.trim();

if(!ctx.pat){

throw new Error(
"GitHub PAT required."
);

}

if(!ctx.repo){

throw new Error(
"Repository required."
);

}

}

startBtn.addEventListener(
"click",
async function(){

try{

saveGithubSettings();

updateProgress(
5,
"Preparing..."
);

await loadPublishData();

updateProgress(
10,
"Initialization Complete"
);

publishPart2();

}
catch(e){

showError(
e.message
);

}

});
    /* ==========================================================
   PART 2
   GitHub Release Create / Reuse
========================================================== */

async function githubApi(url, options = {}) {

    options.headers = options.headers || {};

    options.headers.Authorization =
        "Bearer " + ctx.pat;

    options.headers.Accept =
        "application/vnd.github+json";

    options.headers["X-GitHub-Api-Version"] =
        "2022-11-28";

    const response = await fetch(url, options);

    if (!response.ok) {

        const errorText = await response.text();

        throw new Error(errorText);

    }

    return response;

}

async function publishPart2() {

    updateProgress(
        20,
        "Checking GitHub Release..."
    );

    const version =
        ctx.app.version || "1.0.0";

    const tag =
        version.startsWith("v")
        ? version
        : "v" + version;

    let release = null;

    try {

        const res =
            await githubApi(

                "https://api.github.com/repos/" +
                ctx.repo +
                "/releases/tags/" +
                tag

            );

        release =
            await res.json();

    }

    catch {

        updateProgress(
            30,
            "Creating GitHub Release..."
        );

        const res =
            await githubApi(

                "https://api.github.com/repos/" +
                ctx.repo +
                "/releases",

                {

                    method:"POST",

                    headers:{
                        "Content-Type":
                        "application/json"
                    },

                    body:JSON.stringify({

                        tag_name:tag,

                        name:
                        ctx.app.name+
                        " "+
                        version,

                        body:
                        ctx.app.description ||
                        "",

                        draft:false,

                        prerelease:false

                    })

                }

            );

        release =
            await res.json();

    }

    ctx.release = release;

    updateProgress(
        40,
        "GitHub Release Ready"
    );

    publishPart3();

}
    /* ==========================================================
   PART 3
   Upload APK Asset to GitHub Release
========================================================== */

async function publishPart3() {

    updateProgress(
        50,
        "Checking existing release assets..."
    );

    const headers = {

        Authorization:
            "Bearer " + ctx.pat,

        Accept:
            "application/vnd.github+json",

        "X-GitHub-Api-Version":
            "2022-11-28"

    };

    //----------------------------------------------------------
    // Load Existing Assets
    //----------------------------------------------------------

    const assetsResponse =
        await fetch(

            "https://api.github.com/repos/" +
            ctx.repo +
            "/releases/" +
            ctx.release.id +
            "/assets",

            {
                headers
            }

        );

    if(!assetsResponse.ok){

        throw new Error(
            "Unable to load GitHub Release assets."
        );

    }

    const assets =
        await assetsResponse.json();

    //----------------------------------------------------------
    // Delete old APK if exists
    //----------------------------------------------------------

    const existingAsset =
        assets.find(function(asset){

            return asset.name===ctx.apk.name;

        });

    if(existingAsset){

        updateProgress(
            60,
            "Removing old APK..."
        );

        const deleteResponse =
            await fetch(

                "https://api.github.com/repos/" +
                ctx.repo +
                "/releases/assets/" +
                existingAsset.id,

                {

                    method:"DELETE",

                    headers

                }

            );

        if(
            deleteResponse.status!==204 &&
            !deleteResponse.ok
        ){

            throw new Error(
                "Unable to remove existing APK."
            );

        }

    }

    //----------------------------------------------------------
    // Upload APK
    //----------------------------------------------------------

    updateProgress(
        70,
        "Uploading APK..."
    );

    const uploadUrl =

        ctx.release.upload_url

        .replace(/\{.*$/,"")

        + "?name="

        + encodeURIComponent(ctx.apk.name);

    const uploadResponse =
        await fetch(

            uploadUrl,

            {

                method:"POST",

                headers:{

                    Authorization:
                        "Bearer "+ctx.pat,

                    Accept:
                        "application/vnd.github+json",

                    "Content-Type":
                        "application/vnd.android.package-archive"

                },

                body:ctx.apk

            }

        );

    if(!uploadResponse.ok){

        const txt=
            await uploadResponse.text();

        throw new Error(
            txt
        );

    }

    ctx.asset=
        await uploadResponse.json();

    console.log(
        "GitHub Asset",
        ctx.asset
    );

    updateProgress(
        80,
        "APK uploaded successfully."
    );

    publishPart4();

}
    /* ==========================================================
   PART 4
   Upload Images to Supabase Storage
========================================================== */

async function uploadFileToBucket(file, bucket) {

    if (!file) return null;

    const fileName =
        Date.now() +
        "-" +
        Math.random().toString(36).substring(2) +
        "-" +
        file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const { error } =
        await sb.storage
            .from(bucket)
            .upload(
                fileName,
                file,
                {
                    cacheControl: "3600",
                    upsert: true
                }
            );

    if (error) {

        throw error;

    }

    const { data } =
        sb.storage
          .from(bucket)
          .getPublicUrl(fileName);

    return data.publicUrl;

}

async function publishPart4() {

    updateProgress(
        85,
        "Uploading images..."
    );

    //--------------------------------------------------
    // Icon
    //--------------------------------------------------

    ctx.iconUrl =
        await uploadFileToBucket(
            ctx.icon,
            "app-icons"
        );

    //--------------------------------------------------
    // Banner
    //--------------------------------------------------

    ctx.bannerUrl =
        await uploadFileToBucket(
            ctx.banner,
            "app-banners"
        );

    //--------------------------------------------------
    // Screenshots
    //--------------------------------------------------

    ctx.screenshotUrls = [];

    for (const shot of ctx.screenshots) {

        const url =
            await uploadFileToBucket(
                shot,
                "app-screenshots"
            );

        ctx.screenshotUrls.push(url);

    }

    console.log("Icon:",ctx.iconUrl);
    console.log("Banner:",ctx.bannerUrl);
    console.log("Screens:",ctx.screenshotUrls);

    updateProgress(
        90,
        "Images uploaded."
    );

    publishPart5();

}
    /* ==========================================================
   PART 5
   Save App + Cleanup + Finish
========================================================== */

async function publishPart5() {

    try {

        updateProgress(
            95,
            "Saving app to Supabase..."
        );

        //--------------------------------------------------
        // Download URL
        //--------------------------------------------------

        const downloadUrl =
            ctx.asset.browser_download_url;

        //--------------------------------------------------
        // Payload
        //--------------------------------------------------

        const payload = {

            app_name:
                ctx.app.name,

            package_name:
                ctx.app.package_name || null,

            version:
                ctx.app.version,

            developer:
                ctx.app.developer || null,

            category:
                ctx.app.category || null,

            android_version:
                ctx.app.android_version || null,

            description:
                ctx.app.description || null,

            whats_new:
                ctx.app.whats_new || null,

            icon_url:
                ctx.iconUrl,

            banner_url:
                ctx.bannerUrl,

            screenshots:
                ctx.screenshotUrls,

            apk_url:
                downloadUrl,

            download_count:0,

            created_at:
                new Date().toISOString()

        };

        //--------------------------------------------------
        // Insert Database
        //--------------------------------------------------

        const {error}=

            await sb
            .from("apps")
            .insert([payload]);

        if(error){

            throw error;

        }

        //--------------------------------------------------
        // Cleanup IndexedDB
        //--------------------------------------------------

        const db=
            await openDB();

        const tx=
            db.transaction(
                STORE_NAME,
                "readwrite"
            );

        tx.objectStore(STORE_NAME).clear();

        await new Promise(function(resolve,reject){

            tx.oncomplete=resolve;

            tx.onerror=reject;

        });

        //--------------------------------------------------
        // Cleanup Session
        //--------------------------------------------------

        sessionStorage.removeItem(
            "paliaapk_pending_app"
        );

        //--------------------------------------------------
        // Finish
        //--------------------------------------------------

        updateProgress(
            100,
            "Publish Completed Successfully"
        );

        alert(
            "App published successfully!"
        );

        setTimeout(function(){

            window.location.href=
                "dashboard.html";

        },1000);

    }

    catch(err){

        console.error(err);

        updateProgress(
            0,
            "Publish Failed"
        );

        alert(
            err.message
        );

    }

}

/* ==========================================================
   END
========================================================== */

})();
    
