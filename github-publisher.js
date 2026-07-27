// github-publisher.js

/**
 * Helper to update progress UI matching the existing DOM elements.
 * Steps: Preparing, Uploading assets, Creating Release, Uploading APK, Saving database, Finished
 */
function updateProgress(step, percent, message) {
    const progressBar = document.getElementById('progress-bar');
    const progressStatus = document.getElementById('progress-status');
    const progressPercent = document.getElementById('progress-percent');

    if (progressBar) {
        progressBar.style.width = `${percent}%`;
        progressBar.setAttribute('aria-valuenow', percent);
    }
    if (progressPercent) {
        progressPercent.textContent = `${percent}%`;
    }
    if (progressStatus) {
        progressStatus.textContent = message || step;
    }
}

/**
 * Utility to retry fetch requests up to 3 times for GitHub operations.
 */
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
    // Ensure Content-Length is never included
    if (options.headers) {
        delete options.headers['Content-Length'];
        delete options.headers['content-length'];
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                // If it's a client error (4xx except 404/422 depending on context), might not want to retry, 
                // but requirement says retry failed GitHub requests up to 3 times.
                if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                    const errorBody = await response.text();
                    throw new Error(`GitHub API error (${response.status}): ${errorBody}`);
                }
                if (attempt === retries) {
                    const errorBody = await response.text();
                    throw new Error(`GitHub API failed after ${retries} attempts (${response.status}): ${errorBody}`);
                }
            } else {
                return response;
            }
        } catch (error) {
            if (attempt === retries) throw error;
        }
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
}

/**
 * Opens and validates IndexedDB contents for the app publishing session.
 */
async function validateAndGetIndexedDBData() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('AppPublisherDB', 1);
        request.onerror = () => reject(new Error('Failed to open IndexedDB.'));
        request.onsuccess = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('appData')) {
                reject(new Error('IndexedDB object store "appData" not found.'));
                return;
            }
            const transaction = db.transaction(['appData'], 'readonly');
            const store = transaction.objectStore('appData');
            const getReq = store.get('currentApp');
            getReq.onerror = () => reject(new Error('Failed to read app data from IndexedDB.'));
            getReq.onsuccess = () => {
                const data = getReq.result;
                if (!data) {
                    reject(new Error('No app data found in IndexedDB.'));
                    return;
                }
                resolve(data);
            };
        };
        // If DB doesn't exist yet, it's invalid for publishing
        request.onupgradeneeded = (event) => {
            event.target.transaction.abort();
            reject(new Error('IndexedDB not initialized.'));
        };
    });
}

/**
 * Clear IndexedDB and sessionStorage after successful publish.
 */
async function clearStorageData() {
    sessionStorage.clear();
    await new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase('AppPublisherDB');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to clear IndexedDB.'));
        request.onblocked = () => resolve();
    });
}

/**
 * Main publish workflow triggered by UI buttons/forms.
 */
async function handlePublishApp() {
    try {
        // 1. Show Preparing state
        updateProgress('Preparing', 5, 'Validating inputs and storage...');

        // Retrieve config from sessionStorage or DOM inputs keeping existing IDs
        const patInput = document.getElementById('github-pat');
        const repoInput = document.getElementById('github-repo');
        
        const pat = patInput ? patInput.value.trim() : sessionStorage.getItem('github_pat');
        const repo = repoInput ? repoInput.value.trim() : sessionStorage.getItem('github_repo');

        // 1. Validate GitHub PAT
        if (!pat || !pat.startsWith('ghp_') && !pat.startsWith('github_pat_') && pat.length < 20) {
            throw new Error('Invalid GitHub Personal Access Token (PAT) format.');
        }

        // 2. Validate owner/repository format (e.g., owner/repo)
        const repoRegex = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
        if (!repo || !repoRegex.test(repo)) {
            throw new Error('Invalid repository format. Must be "owner/repository".');
        }

        // 3. Validate IndexedDB before publishing
        const appData = await validateAndGetIndexedDBData();

        // 4. Ensure apk/icon/banner exist before upload
        if (!appData.apkFile) {
            throw new Error('APK file is missing in session data.');
        }
        if (!appData.iconFile) {
            throw new Error('Icon file is missing in session data.');
        }
        if (!appData.bannerFile) {
            throw new Error('Banner file is missing in session data.');
        }

        const version = appData.version || 'v1.0.0';
        const tagName = version.startsWith('v') ? version : `v${version}`;
        const appName = appData.name || 'App';
        const packageName = appData.packageName || 'com.app.slug';

        // 2. Uploading assets (Supabase Storage for icon, banner, screenshots)
        updateProgress('Uploading assets', 25, 'Uploading icon, banner, and screenshots to Supabase Storage...');
        
        // Assuming supabase client is globally available or imported
        if (typeof supabase === 'undefined' && typeof window.supabase === 'undefined') {
            throw new Error('Supabase client is not initialized.');
        }
        const sb = window.supabase || supabase;

        const uploadFileToSupabase = async (file, folder) => {
            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = `${folder}/${fileName}`;
            const { error: uploadError } = await sb.storage
                .from('app-assets')
                .upload(filePath, file, { upsert: true, duplex: 'half' });
            
            if (uploadError) {
                throw new Error(`Supabase Storage error: ${uploadError.message}`);
            }
            const { data: publicUrlData } = sb.storage.from('app-assets').getPublicUrl(filePath);
            return publicUrlData.publicUrl;
        };

        const iconUrl = await uploadFileToSupabase(appData.iconFile, 'icons');
        const bannerUrl = await uploadFileToSupabase(appData.bannerFile, 'banners');
        
        const screenshotUrls = [];
        if (appData.screenshots && Array.isArray(appData.screenshots)) {
            for (const ss of appData.screenshots) {
                const url = await uploadFileToSupabase(ss, 'screenshots');
                screenshotUrls.push(url);
            }
        }

        // 3. Creating Release / 6. Create Release if missing / 7. Reuse Release if same version already exists
        updateProgress('Creating Release', 50, 'Checking or creating GitHub Release...');
        
        const releasesUrl = `https://api.github.com/repos/${repo}/releases`;
        const headers = {
            'Authorization': `token ${pat}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'App-Publisher'
        };

        // Check if release exists
        let releaseId;
        let uploadUrl;
        
        const existingReleaseRes = await fetchWithRetry(`https://api.github.com/repos/${repo}/releases/tags/${tagName}`, {
            method: 'GET',
            headers
        });

        if (existingReleaseRes.ok) {
            const releaseData = await existingReleaseRes.json();
            releaseId = releaseData.id;
            uploadUrl = releaseData.upload_url;
        } else if (existingReleaseRes.status === 404) {
            // Create release
            const createRes = await fetchWithRetry(releasesUrl, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tag_name: tagName,
                    name: `Release ${tagName}`,
                    body: `Automated release for ${appName} version ${tagName}`,
                    draft: false,
                    prerelease: false
                })
            });
            const createData = await createRes.json();
            releaseId = createData.id;
            uploadUrl = createData.upload_url;
        } else {
            const errText = await existingReleaseRes.text();
            throw new Error(`Failed to check existing release: ${errText}`);
        }

        // 4. Uploading APK / 5. Remove/Do not use Content-Length header / 8. Replace existing APK asset if same filename already exists
        updateProgress('Uploading APK', 70, 'Uploading APK file to GitHub Release...');

        const apkFile = appData.apkFile;
        const apkFileName = apkFile.name.replace(/[^a-zA-Z0-9_.-]/g, '_');

        // Check if asset with same name already exists in release and delete it to replace
        const assetsRes = await fetchWithRetry(`https://api.github.com/repos/${repo}/releases/${releaseId}/assets`, {
            method: 'GET',
            headers
        });
        if (assetsRes.ok) {
            const assets = await assetsRes.json();
            const existingAsset = assets.find(a => a.name === apkFileName);
            if (existingAsset) {
                await fetchWithRetry(`https://api.github.com/repos/${repo}/releases/assets/${existingAsset.id}`, {
                    method: 'DELETE',
                    headers
                });
            }
        }

        // Clean template URL for uploads (remove {?name,label})
        const cleanUploadUrl = uploadUrl.split('{')[0];
        const apkBuffer = await apkFile.arrayBuffer();

        const uploadApkRes = await fetchWithRetry(`${cleanUploadUrl}?name=${encodeURIComponent(apkFileName)}`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/vnd.android.package-archive'
            },
            body: apkBuffer,
            duplex: 'half'
        });

        const apkAssetData = await uploadApkRes.json();
        // 10. Save browser_download_url
        const browserDownloadUrl = apkAssetData.browser_download_url;
        if (!browserDownloadUrl) {
            throw new Error('Failed to retrieve APK download URL from GitHub.');
        }

        // 5. Saving database / 11. Upload icon/banner/screenshots / 12. Insert app record into Supabase
        updateProgress('Saving database', 85, 'Saving app details to Supabase database...');

        const { error: dbError } = await sb.from('apps').insert([
            {
                name: appName,
                package_name: packageName,
                version: version,
                download_url: browserDownloadUrl,
                icon_url: iconUrl,
                banner_url: bannerUrl,
                screenshots: screenshotUrls,
                repository: repo,
                created_at: new Date().toISOString()
            }
        ]);

        if (dbError) {
            throw new Error(`Supabase database error: ${dbError.message}`);
        }

        // 13. Finished
        updateProgress('Finished', 100, 'Publishing complete successfully!');

        // 16. Clear IndexedDB and sessionStorage after successful publish
        await clearStorageData();

        // 17. Redirect to dashboard.html after success
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1200);

    } catch (error) {
        // 14. Show detailed errors from GitHub and Supabase
        console.error('Publishing Error:', error);
        const errorContainer = document.getElementById('error-message') || document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.textContent = error.message;
            errorContainer.style.display = 'block';
        } else {
            alert(`Publishing failed: ${error.message}`);
        }
        
        // Reset progress bar indication on error
        const progressStatus = document.getElementById('progress-status');
        if (progressStatus) {
            progressStatus.textContent = 'Failed: ' + error.message;
        }
    }
}

// Bind event listener to publish trigger button if present in existing DOM
document.addEventListener('DOMContentLoaded', () => {
    const publishBtn = document.getElementById('publish-btn') || document.getElementById('start-publish-btn');
    if (publishBtn) {
        publishBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handlePublishApp();
        });
    }
});
