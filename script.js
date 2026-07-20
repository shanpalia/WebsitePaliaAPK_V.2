// Supabase ka configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://ralinnuegsbuvlhwpzln.supabase.co'; // Apne Supabase Dashboard se lein
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbGlubnVlZ3NidXZsaHdwemxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTU2NDIsImV4cCI6MjA5NTg3MTY0Mn0.hIec6UxRx5gzSMTi5oJ3_xXw3d1QKCmKsPF-stBwIFE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Apps fetch karne ka function
async function fetchApps() {
    const { data, error } = await supabase
        .from('apps') // Supabase mein aapke table ka naam
        .select('*');

    if (error) {
        console.error("Error fetching apps:", error);
        return;
    }

    const appGrid = document.getElementById('app-grid');
    appGrid.innerHTML = ''; // Pehle grid khali karein

    data.forEach(app => {
        data.forEach(app => {

    console.log(app);

    let screenshots = [];
        const card = `
            <div class="bg-white p-4 rounded-3xl border border-gray-100 hover:shadow-xl transition">
                <img src="${app.icon_url}" class="w-full h-32 object-cover rounded-2xl mb-4" alt="${app.name}">
                <h3 class="font-bold">${app.name}</h3>
                <p class="text-xs text-gray-400 mb-4">v${app.version}</p>
                <a href="${app.apk_url}" class="block text-center w-full bg-green-50 text-green-700 py-3 rounded-xl font-bold text-sm">Download</a>
            </div>
        `;
        appGrid.innerHTML += card;
    });
}

// Page load hote hi apps load karein
fetchFeaturedApps();
fetchApps();
// Admin Security Page Logic
let clickCount = 0;
const adminTrigger = document.getElementById('admin-trigger');

adminTrigger.addEventListener('click', () => {
    clickCount++;
    
    if (clickCount === 5) {
        // 5 clicks hone par admin page par le jayega
        window.location.href = 'admin.html';
        clickCount = 0; // reset
    }
});
async function shareWebsite(){

const url=window.location.href;

if(navigator.share){

try{

await navigator.share({

title:"PaliaAPK HUB",

text:"Premium Android Store",

url:url

});

}catch(e){}

}else{

navigator.clipboard.writeText(url);

alert("Website link copied.");

}

}
// Optional: Agar user 3 second tak click na kare to count reset ho jaye
setTimeout(() => {
    clickCount = 0;
}, 3000);
async function fetchFeaturedApps(){

const {data,error}=await supabase

.from("apps")

.select("*")



.limit(5);

if(error){

console.error(error);

return;

}

const slider=document.getElementById("featured-slider");

slider.innerHTML="";

data.forEach(app=>{

const image=app.banner_url || (app.screenshots?.[0]) || app.icon_url;

slider.innerHTML+=`

<div class="swiper-slide">

<div class="relative h-[430px] rounded-[32px] overflow-hidden">

<img src="${image}"

class="w-full h-full object-cover">

<div class="absolute inset-0 bg-black/50"></div>

<div class="absolute left-10 bottom-10 text-white max-w-xl">

<img src="${app.icon_url}"

class="w-20 h-20 rounded-3xl mb-4">

<h2 class="text-5xl font-black">

${app.name}

</h2>

<p class="mt-2">

${app.description}

</p>

<div class="flex gap-6 mt-4">

<span>⭐ ${app.rating}</span>

<span>⬇ ${app.downloads}</span>

<span>📦 ${app.size}</span>

</div>

<a href="${app.apk_url}"

class="download-btn inline-block mt-6">

Download Now

</a>

</div>

</div>

</div>

`;

});

new Swiper(".mySwiper",{

loop:true,

autoplay:{delay:4000},

pagination:{el:".swiper-pagination"}

});

}
