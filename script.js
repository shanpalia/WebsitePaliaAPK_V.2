// ===============================
// PaliaAPK HUB
// Production Script v2 - Part 1
// ===============================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ===============================
// Supabase Config
// ===============================

const SUPABASE_URL = "https://ralinnuegsbuvlhwpzln.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbGlubnVlZ3NidXZsaHdwemxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTU2NDIsImV4cCI6MjA5NTg3MTY0Mn0.hIec6UxRx5gzSMTi5oJ3_xXw3d1QKCmKsPF-stBwIFE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===============================
// Global Elements
// ===============================

const appGrid = document.getElementById("app-grid");
const featuredSlider = document.getElementById("featured-slider");
const adminTrigger = document.getElementById("admin-trigger");

// ===============================
// Helper Functions
// ===============================

function formatFileSize(bytes) {

    if (!bytes) return "0 MB";

    return (bytes / 1024 / 1024).toFixed(1) + " MB";

}

function heroImage(app){

    if(app.banner_url) return app.banner_url;

    if(Array.isArray(app.screenshots) && app.screenshots.length){

        return app.screenshots[0];

    }

    return app.icon_url;

}

function escapeHTML(text){

    return String(text || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");

}

// ===============================
// Share Website
// ===============================

window.shareWebsite = async function(){

    const url = window.location.href;

    if(navigator.share){

        try{

            await navigator.share({

                title:"PaliaAPK HUB",

                text:"Premium Android Store",

                url

            });

        }catch(e){}

    }else{

        await navigator.clipboard.writeText(url);

        alert("Website link copied.");

    }

}

// ===============================
// Admin Hidden Button
// ===============================

let clickCount = 0;

if(adminTrigger){

adminTrigger.addEventListener("click",()=>{

clickCount++;

if(clickCount>=5){

location.href="admin.html";

clickCount=0;

}

setTimeout(()=>{

clickCount=0;

},3000);

});

}
// ===============================
// Featured Hero Slider
// ===============================

async function fetchFeaturedApps() {

    if (!featuredSlider) return;

    featuredSlider.innerHTML = `
        <div class="swiper-slide flex items-center justify-center h-full">
            <div class="text-center text-gray-500">
                Loading Featured Apps...
            </div>
        </div>
    `;

    const { data, error } = await supabase
        .from("apps")
        .select("*")
       
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error(error);
        featuredSlider.innerHTML = `
            <div class="swiper-slide flex items-center justify-center h-full">
                <h2 class="text-red-500 text-2xl font-bold">
                    Failed to load featured apps
                </h2>
            </div>
        `;
        return;
    }

    if (!data || data.length === 0) {

        featuredSlider.innerHTML = `
            <div class="swiper-slide flex items-center justify-center h-full bg-gray-100">
                <div class="text-center">
                    <h2 class="text-3xl font-bold">
                        No Featured Apps
                    </h2>
                    <p class="text-gray-500 mt-2">
                        Mark an app as Featured from Admin Panel.
                    </p>
                </div>
            </div>
        `;

        return;

    }

    featuredSlider.innerHTML = "";

    data.forEach(app => {

        const image = heroImage(app);

        featuredSlider.innerHTML += `

<div class="swiper-slide">

<div class="relative h-[430px] rounded-[32px] overflow-hidden">

<img
src="${image}"
class="w-full h-36 object-contain bg-white p-3 rounded-2xl"
alt="${escapeHTML(app.name)}">

<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

<div class="absolute inset-0 flex items-end z-20">

<div class="p-10 max-w-2xl text-white">

<img
src="${app.icon_url}"
alt="${escapeHTML(app.name)}"
class="w-24 h-24 rounded-[28px] bg-white p-3 object-contain shadow-2xl mb-5 border border-white">

<h2 class="text-5xl font-black">

${escapeHTML(app.name)}

</h2>

<p class="mt-4 text-gray-200 line-clamp-3">

${escapeHTML(app.description)}

</p>

<p class="mt-4 text-green-300">

Developer • ${escapeHTML(app.developer)}

</p>

<div class="flex flex-wrap gap-3 mt-5">

<span class="bg-white/20 backdrop-blur px-3 py-2 rounded-full">

⭐ ${app.rating}

</span>

<span class="bg-white/20 backdrop-blur px-3 py-2 rounded-full">

⬇ ${app.downloads}

</span>

<span class="bg-white/20 backdrop-blur px-3 py-2 rounded-full">

📦 ${formatFileSize(app.size)}

</span>

<span class="bg-green-600 px-3 py-2 rounded-full">

v${app.version}

</span>

</div>

<a
href="${app.apk_url}"
class="download-btn inline-flex items-center gap-2 mt-6">

<i class="fa-solid fa-download"></i>

Download Now

</a>

</div>

</div>

</div>

</div>

`;

    });

    new Swiper(".mySwiper", {

       loop: false,

        autoplay: {

            delay: 4000,

            disableOnInteraction: false

        },

        pagination: {

            el: ".swiper-pagination",

            clickable: true

        }

    });

}
// ===============================
// Load Apps Grid
// ===============================

async function fetchApps() {

    if (!appGrid) return;

    appGrid.innerHTML = `
        <div class="col-span-full text-center py-12">
            <p class="text-gray-500">Loading Apps...</p>
        </div>
    `;

    const { data, error } = await supabase
        .from("apps")
        .select("*")
        .order("downloads", { ascending: false });

    if (error) {

        console.error(error);

        appGrid.innerHTML = `
            <div class="col-span-full text-center py-12 text-red-500">
                Failed to load apps.
            </div>
        `;

        return;
    }

    appGrid.innerHTML = "";

    data.forEach(app => {

        appGrid.innerHTML += `

<div class="app-card">

<img
src="${app.icon_url}"
class="w-full h-36 object-contain bg-white p-3 rounded-2xl"
alt="${escapeHTML(app.name)}">

<div class="p-4">

<div class="flex items-center justify-between">

<h3 class="font-bold text-lg">

${escapeHTML(app.name)}

</h3>

<span class="badge">

v${app.version}

</span>

</div>

<p class="text-sm text-gray-500 mt-2">

${escapeHTML(app.developer)}

</p>

<div class="flex flex-wrap gap-2 mt-3">

<span class="badge">

⭐ ${app.rating}

</span>

<span class="badge">

⬇ ${app.downloads}

</span>

<span class="badge">

📦 ${formatFileSize(app.size)}

</span>

</div>

<p class="text-sm text-gray-600 mt-4 line-clamp-2">

${escapeHTML(app.description)}

</p>

<div class="flex gap-3 mt-5">

<a
href="app.html?id=${app.id}"
class="flex-1 text-center border border-green-600 text-green-600 rounded-xl py-3 font-bold">

Details

</a>

<a
href="${app.apk_url}"
class="flex-1 text-center bg-green-600 text-white rounded-xl py-3 font-bold">

Download

</a>

</div>

</div>

</div>

`;

    });

}
// ===============================
// Search
// ===============================

const searchInput = document.querySelector('input[type="text"]');

if (searchInput) {

    searchInput.addEventListener("input", async (e) => {

        const keyword = e.target.value.trim();

        const { data } = await supabase
            .from("apps")
            .select("*")
            .ilike("name", `%${keyword}%`)
            .order("downloads", { ascending: false });

        if (!data) return;

        appGrid.innerHTML = "";

        data.forEach(app => {

            appGrid.innerHTML += `

<div class="app-card">

<img src="${app.icon_url}"
class="w-full h-36 object-cover rounded-2xl">

<div class="p-4">

<h3 class="font-bold">${escapeHTML(app.name)}</h3>

<p class="text-sm text-gray-500">

${escapeHTML(app.developer)}

</p>

<div class="flex gap-2 mt-3">

<span class="badge">⭐ ${app.rating}</span>

<span class="badge">${formatFileSize(app.size)}</span>

</div>

<a
href="${app.apk_url}"
class="download-btn w-full text-center mt-4 block">

Download

</a>

</div>

</div>

`;

        });

    });

}

// ===============================
// Categories
// ===============================

document.querySelectorAll(".category-btn").forEach(btn => {

    btn.addEventListener("click", async () => {

        const category = btn.textContent.trim();

        if (
            category === "All Apps" ||
            category === "All"
        ) {

            fetchApps();
            return;

        }

        const { data } = await supabase
            .from("apps")
            .select("*")
            .eq("category", category);

        appGrid.innerHTML = "";

        data.forEach(app => {

            appGrid.innerHTML += `

<div class="app-card">

<img src="${app.icon_url}"
class="w-full h-36 object-cover rounded-2xl">

<div class="p-4">

<h3 class="font-bold">

${escapeHTML(app.name)}

</h3>

<p class="text-sm text-gray-500">

${escapeHTML(app.developer)}

</p>

<a
href="${app.apk_url}"
class="download-btn block text-center mt-4">

Download

</a>

</div>

</div>

`;

        });

    });

});

// ===============================
// Initialize
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    fetchFeaturedApps();

    fetchApps();

});
