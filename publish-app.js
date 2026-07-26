/**
 * PaliaAPK HUB - publish-app.js
 * Production-ready application publisher matching exact publish-app.html and add-app.html elements.
 */

document.addEventListener('DOMContentLoaded', () => {
    initPublishAppModule();
});

async function initPublishAppModule() {
    let appData = {};
    try {
        const rawPending = sessionStorage.getItem('paliaapk_pending_app') || sessionStorage.getItem('currentApp') || '{}';
        appData = JSON.parse(rawPending);
    } catch (e) {
        appData = {};
    }

    let filePayload = {};
    try {
        filePayload = await loadFilesFromIndexedDB();
    } catch (e) {
        console.error('Failed to load files from IndexedDB:', e);
    }

    const summaryAppName = document.getElementById('summaryAppName');
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
    const appName = appData.name || summaryAppName?.textContent || 'PaliaAPK HUB';

    if (summaryAppName && !summaryAppName.textContent) summaryAppName.textContent = appName;
    if (appVersionInput && !appVersionInput.value) appVersionInput.value = appVersion;
    if (releaseVersionInput && !releaseVersionInput.value) releaseVersionInput.value = `v${appVersion}`;
    if (releaseTitleInput && !releaseTitleInput.value) releaseTitleInput.value = `${appName} v${appVersion}`;
    if (releaseNotesInput && !releaseNotesInput.value) {
        const currentDate = new Date().toISOString().split('T')[0];
        releaseNotesInput.value = appData.whats_new || `New Release\n\nApp Name: ${appName}\nVersion: ${appVersion}\nDeveloper: ${appData.developer || 'shanpalia'}\nCurrent Date: ${currentDate}`;
    }
    if (packageNameInput && !packageNameInput.value) packageNameInput.value = appData.package_name || '';
    if (developerInput && !developerInput.value) developerInput.value = appData.developer || 'shanpalia';
    if (categoryInput && !categoryInput.value) categoryInput.value = appData.category || '';
    if (androidVersionInput && !androidVersionInput.value) androidVersionInput.value = appData.android_version || '';
    if (descriptionInput && !descriptionInput.value) descriptionInput.value = appData.description || '';

    // Auto-fill GitHub Owner and Repo default values if empty
    const repoOwnerInput = document.getElementById('repoOwner');
    const repoNameInput = document.getElementById('repoName');
    if (repoOwnerInput && !repoOwnerInput.value) repoOwnerInput.value = 'shanpalia';
    if (repoNameInput && !repoNameInput.value) repoNameInput.value = 'WebsitePaliaAPK_V.2';

    displayLoadedAssetPreviews(filePayload);

    const patTokenInput = document.getElementById('patToken');
    const saveTokenBtn = document.getElementById('saveTokenBtn');
    const rememberTokenCheckbox = document.getElementById('rememberToken');
    const connectionStatus = document.getElementById('connectionStatus');
    const storageProviderSelect = document.getElementById('storageProvider');
    const supabasePanel = document.getElementById('supabasePanel');
    const githubPanel = document.getElementById('githubPanel');

    const STORAGE_KEY = 'github_pat_token';

    if (storageProviderSelect) {
        storageProviderSelect.addEventListener('change', async (e) => {
            const val = e.target.value;
            if (val === 'github') {
                if (githubPanel) githubPanel.style.display = 'block';
                if (supabasePanel) supabasePanel.style.display = 'none';
                const token = patTokenInput ? patTokenInput.value.trim() : '';
                const owner = repoOwnerInput?.value?.trim() || 'shanpalia';
                const repo = repoNameInput?.value?.trim() || 'WebsitePaliaAPK_V.2';
                if (token && connectionStatus) {
                    await testGitHubConnectionWithRepo(token, owner, repo, connectionStatus);
                }
            } else if (val === 'hybrid') {
                if (githubPanel) githubPanel.style.display = 'block';
                if (supabasePanel) supabasePanel.style.display = 'block';
                const token = patTokenInput ? patTokenInput.value.trim() : '';
                const owner = repoOwnerInput?.value?.trim() || 'shanpalia';
                const repo = repoNameInput?.value?.trim() || 'WebsitePaliaAPK_V.2';
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

    // Load saved token automatically and check remember box by default if token exists
    const savedToken = localStorage.getItem(STORAGE_KEY);
    if (savedToken && patTokenInput) {
        patTokenInput.value = savedToken;
        if (rememberTokenCheckbox) rememberTokenCheckbox.checked = true;
        const owner = repoOwnerInput?.value?.trim() || 'shanpalia';
        const repo = repoNameInput?.value?.trim() || 'WebsitePaliaAPK_V.2';
        if (storageProviderSelect?.value === 'github' || storageProviderSelect?.value === 'hybrid') {
            testGitHubConnectionWithRepo(savedToken, owner, repo, connectionStatus);
        }
    }

    if (saveTokenBtn) {
        saveTokenBtn.addEventListener('click', async () => {
            const tokenValue = patTokenInput.value.trim();
            const owner = repoOwnerInput?.value?.trim() || 'shanpalia';
            const repo = repoNameInput?.value?.trim() || 'WebsitePaliaAPK_V.2';
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
            const owner = repoOwnerInput?.value?.trim() || 'shanpalia';
            const repo = repoNameInput?.value?.trim() || 'WebsitePaliaAPK_V.2';
            if (!rememberTokenCheckbox.checked) {
                localStorage.removeItem(STORAGE_KEY);
                if (connectionStatus) connectionStatus.textContent = '';
            } else {
                const tokenValue = patTokenInput.value.trim();
                if (tokenValue) {
                    localStorage.setItem(STORAGE_KEY, tokenValue);
                    await testGitHubConnectionWithRepo(tokenValue, owner, repo, connectionStatus);
                }
            }
        });
    }

    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
        publishBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            // Automatically save token to storage on publish if remember is checked or token is present
            const tokenValue = patTokenInput?.value?.trim();
            if (tokenValue && rememberTokenCheckbox) {
                rememberTokenCheckbox.checked = true;
                localStorage.setItem(STORAGE_KEY, tokenValue);
            }
            await handlePublishWorkflow(filePayload, appData);
        });
    }

    setupDialogActionButtons();

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

async function loadFilesFromIndexedDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open('PaliaAPKPendingUpload', 1);
        request.onerror = () => resolve({});
        request.onsuccess = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) {
                resolve({});
                return;
            }
            const transaction = db.transaction('files', 'readonly');
            const store = transaction.objectStore('files');
            const getAllRequest = store.getAll();
            const getAllKeysRequest = store.getAllKeys();

            let files = {};
            let keys = [];
            let keysCompleted = false;
            let valuesCompleted = false;

            getAllKeysRequest.onsuccess = (e) => {
                keys = e.target.result || [];
                keysCompleted = true;
                checkDone();
            };

            getAllRequest.onsuccess = (e) => {
                const values = e.target.result || [];
                values.forEach((val, idx) => {
                    if (keys[idx]) {
                        files[keys[idx]] = val;
                    }
                });
                valuesCompleted = true;
                checkDone();
            };

            function checkDone() {
                if (keysCompleted && valuesCompleted) {
                    resolve(files);
                }
            }

            transaction.onerror = () => resolve({});
        };
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files');
            }
        };
    });
}

function displayLoadedAssetPreviews(filePayload) {
    if (!filePayload) return;
    const apkFile = filePayload.apk;
    const iconFile = filePayload.icon;
    const bannerFile = filePayload.banner;

    if (apkFile) {
        const apkIndicator = document.getElementById('apkFileInfo') || document.getElementById('apkNameDisplay');
        if (apkIndicator) apkIndicator.textContent = `${apkFile.name} (${(apkFile.size / (1024 * 1024)).toFixed(2)} MB)`;
    }

    if (iconFile) {
        const iconPreview = document.getElementById('iconPreviewImg') || document.getElementById('iconImg');
        if (iconPreview && iconPreview.tagName === 'IMG') {
            iconPreview.src = URL.createObjectURL(iconFile);
        }
    }

    if (bannerFile) {
        const bannerPreview = document.getElementById('bannerPreviewImg') || document.getElementById('bannerImg');
        if (bannerPreview && bannerPreview.tagName === 'IMG') {
            bannerPreview.src = URL.createObjectURL(bannerFile);
        }
    }
}

async function handlePublishWorkflow(filePayload, appData) {
    const appVersionInput = document.getElementById('appVersion');
    const releaseVersionInput = document.getElementById('releaseVersion');
    const releaseTitleInput = document.getElementById('releaseTitle');
    const releaseNotesInput = document.getElementById('releaseNotes');
    const packageNameInput = document.getElementById('packageName');
    const developerInput = document.getElementById('developer');
    const categoryInput = document.getElementById('category');
    const androidVersionInput = document.getElementById('androidVersion');
    const descriptionInput = document.getElementById('description');
    const storageProviderSelect = document.getElementById('storageProvider');
    const patTokenInput = document.getElementById('patToken');
    const repoOwnerInput = document.getElementById('repoOwner');
    const repoNameInput = document.getElementById('repoName');
    const summaryAppName = document.getElementById('summaryAppName');

    const apkFile = filePayload.apk || null;
    const iconFile = filePayload.icon || null;
    const bannerFile = filePayload.banner || null;
    const screenshotFiles = [];
    for (let i = 0; i < 5; i++) {
        if (filePayload[`screenshot-${i}`]) {
            screenshotFiles.push(filePayload[`screenshot-${i}`]);
        }
    }

    const packageName = packageNameInput?.value?.trim() || appData.package_name || '';
    const currentVersion = appVersionInput?.value?.trim() || appData.version || '1.2.5';
    let provider = storageProviderSelect ? storageProviderSelect.value : 'supabase';

    try {
        if (!apkFile) {
            throw new Error('Validation Error: APK file is required.');
        }
        if (!packageName) {
            throw new Error('Validation Error: Package name is required.');
        }

        const fileSizeMB = apkFile.size / (1024 * 1024);
        if (fileSizeMB > 2048) {
            throw new Error('Validation Error: APK file size exceeds 2GB limit.');
        }

        if (provider === 'hybrid') {
            if (fileSizeMB <= 50) {
                provider = 'supabase';
            } else {
                provider = 'github';
            }
        }

        const token = patTokenInput ? patTokenInput.value.trim() : '';
        const owner = repoOwnerInput?.value?.trim() || 'shanpalia';
        const repo = repoNameInput?.value?.trim() || 'WebsitePaliaAPK_V.2';

        if (provider === 'github') {
            if (!token) {
                throw new Error('Validation Error: GitHub Personal Access Token is required for GitHub Releases.');
            }
            if (!owner || !repo) {
                throw new Error('Validation Error: Repository owner and name are required.');
            }
        }

        showProgressDialog();
        updateProgressState('Authenticating', 10, 'chkStep1');

        const isDuplicate = await checkDuplicateAppByPackageAndVersion(packageName, currentVersion);
        if (isDuplicate) {
            throw new Error('Duplicate Error: An application with this package name and version already exists in the database.');
        }

        updateProgressState('Preparing', 25, 'chkStep1');

        let iconUrl = '';
        let bannerUrl = '';
        let screenshotUrls = [];

        updateProgressState('Uploading', 40, 'chkStep2');
        if (iconFile) {
            iconUrl = await uploadToSupabaseWithRetry(iconFile, 'app-icons', 3);
        }
        if (bannerFile) {
            bannerUrl = await uploadToSupabaseWithRetry(bannerFile, 'app-banners', 3);
        }
        if (Array.isArray(screenshotFiles) && screenshotFiles.length > 0) {
            for (const scFile of screenshotFiles) {
                const scUrl = await uploadToSupabaseWithRetry(scFile, 'app-screenshots', 3);
                if (scUrl) screenshotUrls.push(scUrl);
            }
        }

        let apkDownloadUrl = '';
        if (provider === 'github') {
            const tag = releaseVersionInput ? releaseVersionInput.value.trim() : `v${currentVersion}`;
            const title = releaseTitleInput ? releaseTitleInput.value.trim() : `Release ${currentVersion}`;
            const notes = releaseNotesInput ? releaseNotesInput.value.trim() : '';

            apkDownloadUrl = await uploadToGitHubReleasesSmart({
                token, owner, repo, tag, title, notes, file: apkFile
            });
        } else {
            apkDownloadUrl = await uploadToSupabaseWithRetry(apkFile, 'app-apks', 3);
        }

        updateProgressState('Saving', 75, 'chkStep2');
        const apkSizeVal = `${fileSizeMB.toFixed(2)} MB`;

        const finalPayload = {
            name: summaryAppName?.textContent || appData.name || 'PaliaAPK HUB',
            package_name: packageName,
            version: currentVersion,
            developer: developerInput?.value?.trim() || appData.developer || 'shanpalia',
            category: categoryInput?.value?.trim() || appData.category || 'Tools',
            android_version: androidVersionInput?.value?.trim() || appData.android_version || '5.0 and up',
            description: descriptionInput?.value?.trim() || appData.description || '',
            whats_new: releaseNotesInput?.value?.trim() || appData.whats_new || '',
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

        updateProgressState('Publishing', 90, 'chkStep2');
        await saveAppToDatabaseComplete(finalPayload);

        updateProgressState('Completed', 100, 'chkStep2');
        localStorage.setItem('palia_hub_refresh', Date.now().toString());

        hideProgressDialog();
        showSuccessDialog(apkDownloadUrl);

    } catch (error) {
        console.error('Publishing workflow error:', error);
        hideProgressDialog();
        showFailedDialog(error.message);
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
        }, 20000);

        if (response.ok) {
            statusElement.textContent = 'Connected';
            statusElement.style.color = 'green';
        } else if (response.status === 404) {
            statusElement.textContent = 'Repository not found';
            statusElement.style.color = 'red';
        } else {
            statusElement.textContent = 'Invalid Token';
            statusElement.style.color = 'red';
        }
    } catch (error) {
        statusElement.textContent = 'Invalid Token';
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
        }, 20000);

        if (res.ok) {
            const rows = await res.json();
            return rows && rows.length > 0;
        }
        return false;
    } catch (error) {
        throw new Error(`Duplicate check failed: ${error.message}`);
    }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
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

async function uploadToSupabaseWithRetry(file, bucketName, maxRetries = 3) {
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
            }, 60000);

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
    }, 20000);

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
        }, 30000);

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
        }, 20000).catch(() => {});
    }

    const uploadUrlTemplate = releaseData.upload_url;
    const uploadUrl = uploadUrlTemplate.split('{')[0] + `?name=${encodeURIComponent(file.name)}`;

    let lastError = null;
    const maxRetries = 5;
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
            }, 1800000);

            if (!assetRes.ok) {
                const errText = await assetRes.text();
                throw new Error(`GitHub Asset upload failed (${assetRes.status}): ${errText}`);
            }

            const assetData = await assetRes.json();
            return assetData.browser_download_url;
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
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
    const modal = document.getElementById('publishModal');
    if (modal) modal.style.display = 'flex';
    
    const stateProgress = document.getElementById('modalStateProgress');
    const stateSuccess = document.getElementById('modalStateSuccess');
    const stateFailed = document.getElementById('modalStateFailed');

    if (stateProgress) stateProgress.style.display = 'block';
    if (stateSuccess) stateSuccess.style.display = 'none';
    if (stateFailed) stateFailed.style.display = 'none';
}

function hideProgressDialog() {}

function updateProgressState(statusText, percentage, stepId) {
    const progressStatusText = document.getElementById('progressStatusText');
    const progressBarFill = document.getElementById('progressBarFill');

    if (progressStatusText) progressStatusText.textContent = statusText;
    if (progressBarFill) progressBarFill.style.width = `${percentage}%`;

    if (stepId) {
        const stepElem = document.getElementById(stepId);
        if (stepElem) stepElem.checked = true;
    }
}

function showSuccessDialog(downloadUrl) {
    const modal = document.getElementById('publishModal');
    if (modal) modal.style.display = 'flex';

    const stateProgress = document.getElementById('modalStateProgress');
    const stateSuccess = document.getElementById('modalStateSuccess');
    const stateFailed = document.getElementById('modalStateFailed');

    if (stateProgress) stateProgress.style.display = 'none';
    if (stateSuccess) stateSuccess.style.display = 'block';
    if (stateFailed) stateFailed.style.display = 'none';

    const successUrlDisplay = document.getElementById('successUrlDisplay') || document.getElementById('downloadUrlOutput');
    if (successUrlDisplay) {
        if ('value' in successUrlDisplay) {
            successUrlDisplay.value = downloadUrl;
        } else {
            successUrlDisplay.textContent = downloadUrl;
        }
    }
}

function showFailedDialog(errorMessage) {
    const modal = document.getElementById('publishModal');
    if (modal) modal.style.display = 'flex';

    const stateProgress = document.getElementById('modalStateProgress');
    const stateSuccess = document.getElementById('modalStateSuccess');
    const stateFailed = document.getElementById('modalStateFailed');

    if (stateProgress) stateProgress.style.display = 'none';
    if (stateSuccess) stateSuccess.style.display = 'none';
    if (stateFailed) stateFailed.style.display = 'block';

    const errorMsgDisplay = document.getElementById('errorMessageDisplay') || document.getElementById('failedErrorText');
    if (errorMsgDisplay) {
        errorMsgDisplay.textContent = errorMessage;
    }
}

function setupDialogActionButtons() {
    const copyUrlBtn = document.getElementById('copyUrlBtn');
    if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', () => {
            const successUrlDisplay = document.getElementById('successUrlDisplay') || document.getElementById('downloadUrlOutput');
            const urlToCopy = successUrlDisplay?.value || successUrlDisplay?.textContent || '';
            if (urlToCopy) {
                navigator.clipboard.writeText(urlToCopy).then(() => {
                    copyUrlBtn.textContent = 'Copied!';
                    setTimeout(() => { copyUrlBtn.textContent = 'Copy URL'; }, 2000);
                });
            }
        });
    }

    const successDoneBtn = document.getElementById('successDoneBtn') || document.getElementById('closeSuccessBtn');
    if (successDoneBtn) {
        successDoneBtn.addEventListener('click', () => {
            const modal = document.getElementById('publishModal');
            if (modal) modal.style.display = 'none';
            sessionStorage.removeItem('paliaapk_pending_app');
            sessionStorage.removeItem('currentApp');
            location.href = 'index.html';
        });
    }

    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            const modal = document.getElementById('publishModal');
            if (modal) modal.style.display = 'none';
            const publishBtn = document.getElementById('publishBtn');
            if (publishBtn) publishBtn.click();
        });
    }

    const cancelBtn = document.getElementById('cancelBtn') || document.getElementById('closeFailedBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const modal = document.getElementById('publishModal');
            if (modal) modal.style.display = 'none';
        });
    }
}
