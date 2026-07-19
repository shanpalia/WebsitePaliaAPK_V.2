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
        const card = `
            <div class="bg-white p-4 rounded-3xl border border-gray-100 hover:shadow-xl transition">
                <img src="${app.icon_url}" class="w-full h-32 object-cover rounded-2xl mb-4" alt="${app.name}">
                <h3 class="font-bold">${app.name}</h3>
                <p class="text-xs text-gray-400 mb-4">v${app.version}</p>
                <a href="${app.download_url}" class="block text-center w-full bg-green-50 text-green-700 py-3 rounded-xl font-bold text-sm">Download</a>
            </div>
        `;
        appGrid.innerHTML += card;
    });
}

// Page load hote hi apps load karein
fetchApps();
