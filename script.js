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
// Featured Hero Slider (Updated for White Background & Fixed Icons)
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
            <div class="swiper-slide flex items-center justify-center h-full bg-white">
                <div class="text-center p-8">
                    <h2 class="text-3xl font-bold text-slate-800">
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
        // Screenshots HTML map safely
        const screenshotsHTML = Array.isArray(app.screenshots) && app.screenshots.length > 0
            ? app.screenshots.map(img => `<img src="${img}" class="hero-screenshot-img flex-shrink-0" alt="Screenshot">`).join('')
            : '<p class="text-xs text-gray-400 self-center">No screenshots</p>';

        featuredSlider.innerHTML += `
            <div class="swiper-slide h-full">
                <div class="hero-slide-item bg-white text-slate-900 rounded-[32px] shadow-sm border border-gray-100">
                    
                    <!-- Left: Details -->
                    <div class="hero-slide-content">
                        <div class="flex items-center gap-4 mb-4">
                            <img src="${app.icon_url}" alt="${escapeHTML(app.name)}" class="w-20 h-20 rounded-2xl object-cover shadow-md border border-gray-100 flex-shrink-0 bg-white p-1">
                            <div>
                                <h2 class="text-2xl font-black text-slate-900">${escapeHTML(app.name)}</h2>
                                <p class="text-xs text-gray-500 mt-1">Developer • <span class="text-green-600 font-semibold">${escapeHTML(app.developer || 'ShanPalia')}</span></p>
                            </div>
                        </div>

                        <p class="text-sm text-gray-600 line-clamp-2 mb-5 leading-relaxed">
                            ${escapeHTML(app.description)}
                        </p>

                        <div class="flex flex-wrap gap-2 mb-6">
                            <span class="badge">⭐ ${app.rating || '4.9'}</span>
                            <span class="badge">⬇ ${app.downloads || '1M+'}</span>
                            <span class="badge">📦 ${formatFileSize(app.size)}</span>
                            <span class="badge bg-green-600 text-white">v${app.version || '1.0'}</span>
                        </div>

                        <div class="flex items-center gap-3">
                            <a href="app.html?id=${app.id}" class="bg-green-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition shadow-lg shadow-green-600/20 inline-flex items-center gap-2">
                                <i class="fa-solid fa-download"></i> Download APK
                            </a>
                        </div>
                    </div>

                    <!-- Right: Sliding Screenshots -->
                    <div class="hero-screenshots-container no-scrollbar">
                        <div class="hero-screenshots-track">
                            ${screenshotsHTML}
                        </div>
                    </div>

                </div>
            </div>
        `;
    });

    new Swiper(".mySwiper", {
        loop: true,
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
                <img src="${app.icon_url}" class="w-full h-36 object-contain bg-white p-3 rounded-2xl" alt="${escapeHTML(app.name)}">
                <div class="p-4">
                    <div class="flex items-center justify-between">
                        <h3 class="font-bold text-lg">${escapeHTML(app.name)}</h3>
                        <span class="badge">v${app.version}</span>
                    </div>
                    <p class="text-sm text-gray-500 mt-2">${escapeHTML(app.developer)}</p>
                    <div class="flex flex-wrap gap-2 mt-3">
                        <span class="badge">⭐ ${app.rating}</span>
                        <span class="badge">⬇ ${app.downloads}</span>
                        <span class="badge">📦 ${formatFileSize(app.size)}</span>
                    </div>
                    <p class="text-sm text-gray-600 mt-4 line-clamp-2">${escapeHTML(app.description)}</p>
                    <div class="flex gap-3 mt-5">
                        <a href="app.html?id=${app.id}" class="flex-1 text-center border border-green-600 text-green-600 rounded-xl py-3 font-bold text-sm">Details</a>
                        <a href="${app.apk_url}" class="flex-1 text-center bg-green-600 text-white rounded-xl py-3 font-bold text-sm">Download</a>
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
                    <img src="${app.icon_url}" class="w-full h-36 object-contain bg-white p-3 rounded-2xl" alt="${escapeHTML(app.name)}">
                    <div class="p-4">
                        <h3 class="font-bold">${escapeHTML(app.name)}</h3>
                        <p class="text-sm text-gray-500">${escapeHTML(app.developer)}</p>
                        <div class="flex gap-2 mt-3">
                            <span class="badge">⭐ ${app.rating}</span>
                            <span class="badge">${formatFileSize(app.size)}</span>
                        </div>
                        <a href="${app.apk_url}" class="download-btn w-full text-center mt-4 block">Download</a>
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
        if (category === "All Apps" || category === "All") {
            fetchApps();
            return;
        }

        const { data } = await supabase
            .from("apps")
            .select("*")
            .eq("category", category);

        if (!data) return;

        appGrid.innerHTML = "";
        data.forEach(app => {
            appGrid.innerHTML += `
                <div class="app-card">
                    <img src="${app.icon_url}" class="w-full h-36 object-contain bg-white p-3 rounded-2xl" alt="${escapeHTML(app.name)}">
                    <div class="p-4">
                        <h3 class="font-bold">${escapeHTML(app.name)}</h3>
                        <p class="text-sm text-gray-500">${escapeHTML(app.developer)}</p>
                        <a href="${app.apk_url}" class="download-btn block text-center mt-4">Download</a>
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
