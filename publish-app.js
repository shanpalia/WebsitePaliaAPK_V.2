/**
 * PaliaAPK HUB - publish-app.js
 * Production-ready application publisher supporting Supabase Storage and GitHub Releases.
 */

document.addEventListener('DOMContentLoaded', () => {
    initPublishAppModule();
});

function initPublishAppModule() {
    const appData = JSON.parse(sessionStorage.getItem('currentApp') || '{}');
    const rawFiles = window.appFilePayload || {};

    const appNameInput = document.getElementById('appName');
    const appVersionInput = document.getElementById('appVersion');
    const releaseVersionInput = document.getElementById('releaseVersion');
    const releaseTitleInput = document.getElementById('releaseTitle');
    const releaseNotesInput = document.getElementById('releaseNotes');
    const packageNameInput = document.getElementById('packageName');
    const developerInput = document.getElementById('developer');
    const categoryInput = document.getElementById('category');
    const androidVersionInput = document.getElementById('androidVersion');
    const descriptionInput = document.getElementById('description');

    const appVersion = appData.version || appVersionInput?.value || '1.2.5';
    const appName = appData.name || appNameInput?.value || 'PaliaAPK HUB';

    if (appVersionInput && !appVersionInput.value) appVersionInput.value = appVersion;
    if (appNameInput && !appNameInput.value) appNameInput.value = appName;
    if (releaseVersionInput && !releaseVersionInput.value) releaseVersionInput.value = `v${appVersion}`;
    if (releaseTitleInput && !releaseTitleInput.value) releaseTitleInput.value = `${appName} v${appVersion}`;
    if (releaseNotesInput && !releaseNotesInput.value) {
        const currentDate = new Date().toISOString().split('T')[0];
        releaseNotesInput.value = `New Release\n\nApp Name: ${appName}\nVersion: ${appVersion}\nDeveloper: shanpalia\nCurrent Date: ${currentDate}`;
    }

    const patInput = document.getElementById('patToken');
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    const rememberTokenCheckbox = document.getElementById('rememberToken');
    const connectionStatus = document.getElementById('connectionStatus');
    const storageProviderSelect = document.getElementById('storageProvider');
    const supabasePanel = document.getElementById('supabasePanel');
    const githubPanel = document.getElementById('githubPanel');
    const repoOwnerInput = document.getElementById('repoOwner');
    const repoNameInput = document.getElementById('repoName');

    const STORAGE_KEY = 'github_pat_token';

    if (storageProviderSelect) {
        storageProviderSelect.addEventListener('change', async (e) => {
            const val = e.target.value;
            if (val === 'github') {
                if (githubPanel) githubPanel.style.display = 'block';
                if (supabasePanel) supabasePanel.style.display = 'none';
                const token = patInput ? patInput.value.trim() : '';
                const owner = repoOwnerInput?.value || 'shanpalia';
                const repo = repoNameInput?.value || 'WebsitePaliaAPK_V.2';
                if (token && connectionStatus) {
                    await testGitHubConnectionWithRepo(token, owner, repo, connectionStatus);
                }
            } else {
                if (githubPanel) githubPanel.style.display = 'none';
                if (supabasePanel) supabasePanel.style.display = 'block';
                if (connectionStatus) connectionStatus.textContent = '';
            }
        });
        storageProviderSelect.dispatchEvent(new Event('change'));
    }

    const savedToken = localStorage.getItem(STORAGE_KEY);
    if (savedToken && patInput) {
        patInput.value = savedToken;
        if (rememberTokenCheckbox) rememberTokenCheckbox.checked = true;
        const owner = repoOwnerInput?.value || 'shanpalia';
        const repo = repoNameInput?.value || 'WebsitePaliaAPK_V.2';
        if (storageProviderSelect?.value === 'github') {
            testGitHubConnectionWithRepo(savedToken, owner, repo, connectionStatus);
        }
    }

    if (saveTokenBtn) {
        saveTokenBtn.addEventListener('click', async () => {
            const tokenValue = patInput.value.trim();
            const owner = repoOwnerInput?.value || 'shanpalia';
            const repo = repoNameInput?.value || 'WebsitePaliaAPK_V.2';
            if (rememberTokenCheckbox && rememberTokenCheckbox.checked) {
                if (tokenValue) {
                    localStorage.setItem(STORAGE_KEY, tokenValue);
                    await testGitHubConnectionWithRepo(tokenValue, owner, repo, connectionStatus);
                }
            } else {
                localStorage.removeItem(STORAGE_KEY);
                if (connectionStatus) connectionStatus.textContent = '';
            }
        });
    }

    if (rememberTokenCheckbox) {
        rememberTokenCheckbox.addEventListener('change', async () => {
            const owner = repoOwnerInput?.value || 'shanpalia';
            const repo = repoNameInput?.value || 'WebsitePaliaAPK_V.2';
            if (!rememberTokenCheckbox.checked) {
                localStorage.removeItem(STORAGE_KEY);
                if (connectionStatus) connectionStatus.textContent = '';
            } else {
                const tokenValue = patInput.value.trim();
                if (tokenValue) {
                    localStorage.setItem(STORAGE_KEY, tokenValue);
                    await testGitHubConnectionWithRepo(tokenValue, owner, repo, connectionStatus);
                }
            }
        });
    }

    const publishForm = document.getElementById('publishForm');
    if (publishForm) {
        publishForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const apkFile = rawFiles.apkFile || appData.apkFile || null;
            const iconFile = rawFiles.iconFile || rawFiles.imageFile || appData.iconFile || null;
            const bannerFile = rawFiles.bannerFile || appData.bannerFile || null;
            const screenshotFiles = rawFiles.screenshotFiles || appData.screenshotFiles || [];

            const packageName = packageNameInput?.value || appData.package_name || '';
            const currentVersion = appVersionInput?.value || appVersion;
            const provider = storageProviderSelect ? storageProviderSelect.value : 'supabase';
            const token = patInput ? patInput.value.trim() : '';
            const owner = repoOwnerInput?.value || 'shanpalia';
            const repo = repoNameInput?.value || 'WebsitePaliaAPK_V.2';

            try {
                if (!apkFile) {
                    throw new Error('Validation Error: APK file is required.');
                }
                if (!packageName) {
                    throw new Error('Validation Error: Package name is required.');
                }
                if (provider === 'github') {
                    if (!token) {
                        throw new Error('Validation Error: GitHub Personal Access Token is required for GitHub Releases.');
                    }
                    if (!owner || !repo) {
                        throw new Error('Validation Error: Repository owner and name are required.');
                    }
                }

                const isDuplicate = await checkDuplicateAppByPackageAndVersion(packageName, currentVersion);
                if (isDuplicate) {
                    throw new Error('Duplicate Error: An application with this package name and version already exists in the database.');
                }

                showProgressDialog();

                let iconUrl = '';
                let bannerUrl = '';
                let screenshotUrls = [];

                if (iconFile) {
                    iconUrl = await uploadWithRetryAndTimeout(iconFile, 'app-icons');
                }
                if (bannerFile) {
                    bannerUrl = await uploadWithRetryAndTimeout(bannerFile, 'app-banners');
                }
                if (Array.isArray(screenshotFiles) && screenshotFiles.length > 0) {
                    for (const scFile of screenshotFiles) {
                        const scUrl = await uploadWithRetryAndTimeout(scFile, 'app-screenshots');
                        if (scUrl) screenshotUrls.push(scUrl);
                    }
                }

                let apkDownloadUrl = '';
                if (provider === 'github') {
                    const tag = releaseVersionInput ? releaseVersionInput.value : `v${currentVersion}`;
                    const title = releaseTitleInput ? releaseTitleInput.value : `Release ${currentVersion}`;
                    const notes = releaseNotesInput ? releaseNotesInput.value : '';

                    apkDownloadUrl = await uploadToGitHubReleasesSmart({
                        token, owner, repo, tag, title, notes, file: apkFile
                    });
                } else {
                    apkDownloadUrl = await uploadWithRetryAndTimeout(apkFile, 'app-apks');
                }

                const apkSizeVal = apkFile && apkFile.size ? `${(apkFile.size / (1024 * 1024)).toFixed(2)} MB` : '0 MB';

                const finalPayload = {
                    name: appNameInput?.value || appName,
                    package_name: packageName,
                    version: currentVersion,
                    developer: developerInput?.value || 'shanpalia',
                    category: categoryInput?.value || 'Tools',
                    android_version: androidVersionInput?.value || '5.0 and up',
                    description: descriptionInput?.value || '',
                    whats_new: releaseNotesInput?.value || '',
                    icon_url: iconUrl,
                    banner_url: bannerUrl,
                    apk_url: apkDownloadUrl,
                    screenshots: screenshotUrls,
                    downloads: 0,
                    views: 0,
                    rating: 5.0,
                    featured: false,
                    trending: false,
                    new_app: true,
                    apk_size: apkSizeVal,
                    storage_provider: provider
                };

                await saveAppToDatabaseComplete(finalPayload);

                localStorage.setItem('palia_hub_refresh', Date.now().toString());

                hideProgressDialog();
                showSuccessDialog();

            } catch (error) {
                console.error('Publishing workflow error:', error);
                hideProgressDialog();
                showFailedDialog(error.message);
            }
        });
    }

    if (!window.__palia_hub_storage_listener_initialized) {
        window.__palia_hub_storage_listener_initialized = true;
        window.addEventListener('storage', (event) => {
            if (event.key === 'palia_hub_refresh') {
                if (typeof window.fetchAppData === 'function') {
                    window.fetchAppData();
                } else if (document.getElementById('appList') || document.getElementById('dashboardStats')) {
                    location.reload();
                }
            }
        });
    }
}

async function testGitHubConnectionWithRepo(token, owner, repo, statusElement) {
    if (!statusElement) return;
    statusElement.textContent = 'Testing connection & repo access...';
    
    try {
        const response = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        }, 10000);

        if (response.ok) {
            statusElement.textContent = '✅ Connected';
            statusElement.style.color = 'green';
        } else {
            statusElement.textContent = '❌ Invalid Token or Repo';
            statusElement.style.color = 'red';
        }
    } catch (error) {
        statusElement.textContent = '❌ Connection Failed';
        statusElement.style.color = 'red';
    }
}

async function checkDuplicateAppByPackageAndVersion(packageName, version) {
    const supabaseUrl = window.SUPABASE_URL || '';
    const supabaseKey = window.SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseKey) return false;

    try {
        const res = await fetchWithTimeout(`${supabaseUrl}/rest/v1/apps?package_name=eq.${encodeURIComponent(packageName)}&version=eq.${encodeURIComponent(version)}`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        }, 10000);

        if (res.ok) {
            const rows = await res.json();
            return rows && rows.length > 0;
        }
        return false;
    } catch (error) {
        throw new Error(`Duplicate check failed: ${error.message}`);
    }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Network request timed out. Please check your connection.');
        }
        throw error;
    }
}

async function uploadWithRetryAndTimeout(file, bucketName, maxRetries = 3) {
    if (!file) return '';
    const supabaseUrl = window.SUPABASE_URL || '';
    const supabaseKey = window.SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration is missing.');

    const cleanFileName = file.name ? file.name.replace(/[^a-zA-Z0-9_.-]/g, '_') : 'file';
    const fileName = `${Date.now()}_${cleanFileName}`;
    const endpoint = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`;

    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(endpoint, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': file.type || 'application/octet-stream'
                },
                body: file
            }, 120000);

            if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`Storage upload failed (${response.status}): ${errBody || response.statusText}`);
            }

            return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
    }
    throw new Error(`Upload to ${bucketName} failed after ${maxRetries} attempts: ${lastError.message}`);
}

async function uploadToGitHubReleasesSmart({ token, owner, repo, tag, title, notes, file }) {
    if (!file) throw new Error('APK file is required for GitHub release upload.');

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };

    let releaseData = null;
    const tagRes = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    }, 15000);

    if (tagRes.ok) {
        releaseData = await tagRes.json();
    } else {
        const createRes = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/releases`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                tag_name: tag,
                name: title,
                body: notes,
                draft: false,
                prerelease: false
            })
        }, 20000);

        if (!createRes.ok) {
            const errJson = await createRes.json().catch(() => ({}));
            throw new Error(`GitHub Release creation failed: ${errJson.message || createRes.statusText}`);
        }
        releaseData = await createRes.json();
    }

    const assets = releaseData.assets || [];
    const existingAsset = assets.find(a => a.name === file.name);
    if (existingAsset) {
        await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        }, 15000).catch(() => {});
    }

    const uploadUrlTemplate = releaseData.upload_url;
    const uploadUrl = uploadUrlTemplate.split('{')[0] + `?name=${encodeURIComponent(file.name)}`;

    let lastError = null;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const assetRes = await fetchWithTimeout(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': file.type || 'application/vnd.android.package-archive',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: file
            }, 300000);

            if (!assetRes.ok) {
                const errText = await assetRes.text();
                throw new Error(`GitHub Asset upload failed (${assetRes.status}): ${errText}`);
            }

            const assetData = await assetRes.json();
            return assetData.browser_download_url;
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
            }
        }
    }
    throw new Error(`GitHub asset upload failed after ${maxRetries} attempts: ${lastError.message}`);
}

async function saveAppToDatabaseComplete(payload) {
    const supabaseUrl = window.SUPABASE_URL || '';
    const supabaseKey = window.SUPABASE_ANON_KEY || '';
    if (!supabaseUrl || !supabaseKey) throw new Error('Supabase database configuration missing.');

    const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/apps`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
    }, 20000);

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Database insertion failed (${response.status}): ${errText}`);
    }
}

function showProgressDialog() {
    if (typeof window.showProgressModal === 'function') {
        window.showProgressModal();
        return;
    }
    if (typeof window.showProgressDialog === 'function') {
        window.showProgressDialog();
        return;
    }
    let dlg = document.getElementById('progressDialog') || document.getElementById('progressModal');
    if (dlg) {
        dlg.style.display = 'flex';
    }
}

function hideProgressDialog() {
    if (typeof window.hideProgressModal === 'function') {
        window.hideProgressModal();
        return;
    }
    if (typeof window.hideProgressDialog === 'function') {
        window.hideProgressDialog();
        return;
    }
    let dlg = document.getElementById('progressDialog') || document.getElementById('progressModal');
    if (dlg) {
        dlg.style.display = 'none';
    }
}

function showSuccessDialog() {
    if (typeof window.showSuccessModal === 'function') {
        window.showSuccessModal();
        return;
    }
    let dlg = document.getElementById('successDialog') || document.getElementById('successModal');
    if (dlg) {
        dlg.style.display = 'flex';
    } else {
        alert('App successfully published!');
    }
}

function showFailedDialog(message) {
    if (typeof window.showFailedModal === 'function') {
        window.showFailedModal(message);
        return;
    }
    let dlg = document.getElementById('failedDialog') || document.getElementById('failedModal');
    if (dlg) {
        dlg.style.display = 'flex';
    } else {
        alert(`Publishing failed: ${message}`);
    }
}
