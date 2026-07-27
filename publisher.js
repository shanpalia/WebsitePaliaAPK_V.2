/**
 * production-ready publisher.js
 */

(function () {
    "use strict";

    const SUPABASE_URL = "https://ralinnuegsbuvlhwpzln.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbGlubnVlZ3NidXZsaHdwemxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTU2NDIsImV4cCI6MjA5NTg3MTY0Mn0.hIec6UxRx5gzSMTi5oJ3_xXw3d1QKCmKsPF-stBwIFE";

    // Initialize Supabase Client
    const supabaseClient = window.supabase && typeof window.supabase.createClient === 'function'
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        : null;

    // UI Elements from publish-app.html
    const summaryAppName = document.getElementById('summaryAppName');
    const btnPublishSupabase = document.getElementById('btnPublishSupabase');
    const btnPublishGithub = document.getElementById('btnPublishGithub');
    const btnTestConnection = document.getElementById('btnTestConnection');
    const connectionStatusText = document.getElementById('connectionStatusText');
    const btnToggleToken = document.getElementById('btnToggleToken');
    const ghTokenInput = document.getElementById('ghToken');
    const eyeIcon = document.getElementById('eyeIcon');

    // Modal & Progress Elements
    const publishModal = document.getElementById('publishModal');
    const modalStateProgress = document.getElementById('modalStateProgress');
    const modalStateSuccess = document.getElementById('modalStateSuccess');
    const modalStateFailed = document.getElementById('modalStateFailed');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressDetail = document.getElementById('progressDetail');
    const progressStatusText = document.getElementById('progressStatusText');
    const successDeploymentUrl = document.getElementById('successDeploymentUrl');
    const btnCopyUrl = document.getElementById('btnCopyUrl');
    const btnCloseSuccess = document.getElementById('btnCloseSuccess');
    const btnCancelPublish = document.getElementById('btnCancelPublish');
    const btnRetryPublish = document.getElementById('btnRetryPublish');
    const failedReasonText = document.getElementById('failedReasonText');
    const errorLogBox = document.getElementById('errorLogBox');

    // Checklist Items
    const chkStep1 = document.getElementById('chkStep1');
    const chkStep2 = document.getElementById('chkStep2');
    const chkStep3 = document.getElementById('chkStep3');
    const chkStep4 = document.getElementById('chkStep4');

    // Storage Provider Switcher Tabs
    const providerOptions = document.querySelectorAll('.provider-option');
    const configPanels = document.querySelectorAll('.config-panel');

    let activeProvider = 'supabase';

    providerOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (option.classList.contains('disabled')) return;
            providerOptions.forEach(opt => opt.classList.remove('active'));
            configPanels.forEach(panel => panel.classList.remove('active'));

            option.classList.add('active');
            activeProvider = option.getAttribute('data-provider');
            const targetPanel = document.getElementById(`panel-${activeProvider}`);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });

    // Token Eye Toggle
    if (btnToggleToken && ghTokenInput) {
        btnToggleToken.addEventListener('click', () => {
            const type = ghTokenInput.getAttribute('type') === 'password' ? 'text' : 'password';
            ghTokenInput.setAttribute('type', type);
            if (eyeIcon) {
                eyeIcon.className = type === 'password' ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash';
            }
        });
    }

    // Load App Data from sessionStorage
    let appData = {};
    try {
        const rawData = sessionStorage.getItem('paliaapk_pending_app');
        if (rawData) {
            appData = JSON.parse(rawData);
        }
    } catch (e) {
        console.error('Failed to parse app data from sessionStorage:', e);
    }

    if (summaryAppName) {
        summaryAppName.textContent = appData.name || appData.fName || 'Unnamed Application';
    }

    // IndexedDB Helper to read files
    function getFileFromIndexedDB(keyName) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('PaliaAPKPendingUpload', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('files')) {
                    resolve(null);
                    return;
                }
                const transaction = db.transaction('files', 'readonly');
                const store = transaction.objectStore('files');
                const getReq = store.get(keyName);
                getReq.onsuccess = () => resolve(getReq.result || null);
                getReq.onerror = () => reject(getReq.error);
            };
        });
    }

    // Helper to format file size
    function formatBytes(bytes) {
        if (!bytes) return '0 MB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // Modal Controls
    function showModal() {
        if (publishModal) publishModal.style.display = 'flex';
        modalStateProgress.style.display = 'block';
        modalStateSuccess.style.display = 'none';
        modalStateFailed.style.display = 'none';
    }

    function hideModal() {
        if (publishModal) publishModal.style.display = 'none';
    }

    if (btnCloseSuccess) btnCloseSuccess.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    if (btnCancelPublish) btnCancelPublish.addEventListener('click', hideModal);
    if (btnRetryPublish) btnRetryPublish.addEventListener('click', () => {
        executePublishWorkflow();
    });

    function setStepStatus(stepEl, status, text) {
        if (!stepEl) return;
        stepEl.className = `checklist-item ${status}`;
        const icon = stepEl.querySelector('i');
        if (icon) {
            if (status === 'completed') icon.className = 'fa-solid fa-circle-check';
            else if (status === 'active') icon.className = 'fa-solid fa-spinner fa-spin';
            else icon.className = 'fa-regular fa-circle';
        }
        if (text) {
            stepEl.innerHTML = `<i class="${icon.className}"></i> ${text}`;
        }
    }

    function updateProgress(percent, detailStr, statusText) {
        if (progressBarFill) progressBarFill.style.width = `${percent}%`;
        if (progressPercent) progressPercent.textContent = `${percent}%`;
        if (progressDetail) progressDetail.textContent = detailStr;
        if (progressStatusText) progressStatusText.textContent = statusText;
    }

    // Test GitHub Connection
    if (btnTestConnection) {
        btnTestConnection.addEventListener('click', async () => {
            const owner = document.getElementById('ghOwner').value.trim();
            const repo = document.getElementById('ghRepo').value.trim();
            const token = document.getElementById('ghToken').value.trim();

            if (!owner || !repo || !token) {
                connectionStatusText.textContent = 'Please enter Owner, Repo, and Token';
                connectionStatusText.style.color = 'var(--danger)';
                return;
            }

            connectionStatusText.textContent = 'Testing...';
            connectionStatusText.style.color = 'var(--ink-500)';

            try {
                const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json'
                    }
                });

                if (response.ok) {
                    connectionStatusText.textContent = 'Connection Successful!';
                    connectionStatusText.style.color = 'var(--ok)';
                } else {
                    connectionStatusText.textContent = `Failed (${response.status} ${response.statusText})`;
                    connectionStatusText.style.color = 'var(--danger)';
                }
            } catch (err) {
                connectionStatusText.textContent = `Error: ${err.message}`;
                connectionStatusText.style.color = 'var(--danger)';
            }
        });
    }

    // Upload to Supabase Storage Bucket
    async function uploadToSupabaseStorage(file, bucketName, folderPath) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `${folderPath}/${fileName}`;

        const { data, error } = await supabaseClient.storage
            .from(bucketName)
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: publicUrlData } = supabaseClient.storage
            .from(bucketName)
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
    }

    // Create GitHub Release and Upload APK Asset
    async function uploadToGitHubReleases(apkFile) {
        const owner = document.getElementById('ghOwner').value.trim();
        const repo = document.getElementById('ghRepo').value.trim();
        const token = document.getElementById('ghToken').value.trim();
        const tag = document.getElementById('ghVersion').value.trim() || 'v1.0.0';
        const title = document.getElementById('ghTitle').value.trim() || tag;
        const notes = document.getElementById('ghNotes').value.trim();
        const draft = document.getElementById('ghDraft').checked;
        const prerelease = document.getElementById('ghPreRelease').checked;

        // 1. Create Release
        const releaseRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tag_name: tag,
                name: title,
                body: notes,
                draft: draft,
                prerelease: prerelease
            })
        });

        if (!releaseRes.ok) {
            const errJson = await releaseRes.json();
            throw new Error(errJson.message || 'Failed to create GitHub release');
        }

        const releaseData = await releaseRes.json();
        const uploadUrlTemplate = releaseData.upload_url; // contains {?name,label}
        const uploadUrl = uploadUrlTemplate.split('{')[0] + `?name=${encodeURIComponent(apkFile.name)}`;

        // 2. Upload Asset
        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/vnd.android.package-archive'
            },
            body: apkFile
        });

        if (!uploadRes.ok) {
            throw new Error('Failed to upload APK file to GitHub Release assets');
        }

        const assetData = await uploadRes.json();
        return assetData.browser_download_url;
    }

    // Main Publishing Execution Workflow
    async function executePublishWorkflow() {
        if (!supabaseClient) {
            alert('Supabase client failed to initialize.');
            return;
        }

        showModal();
        updateProgress(10, '0 MB / 0 MB', 'Authenticating Storage Provider...');
        setStepStatus(chkStep1, 'active', 'Authenticating Storage Provider');

        try {
            // Step 1: Read Files from IndexedDB
            setStepStatus(chkStep1, 'completed', 'Authenticated Storage Provider');
            setStepStatus(chkStep2, 'active', 'Validating APK Binary Payload');
            updateProgress(25, 'Reading files...', 'Validating files from database...');

            const apkFile = await getFileFromIndexedDB('apk');
            const iconFile = await getFileFromIndexedDB('icon');
            const bannerFile = await getFileFromIndexedDB('banner');

            const screenshotFiles = [];
            for (let i = 0; i < 5; i++) {
                const shot = await getFileFromIndexedDB(`screenshot-${i}`);
                if (shot) screenshotFiles.push(shot);
            }

            if (!apkFile) {
                throw new Error('APK file not found in IndexedDB storage.');
            }

            setStepStatus(chkStep2, 'completed', 'Validating APK Binary Payload');
            setStepStatus(chkStep3, 'active', 'Uploading Application Package');
            updateProgress(40, formatBytes(apkFile.size), 'Uploading assets and binaries...');

            // Upload standard assets to Supabase buckets
            let iconUrl = iconFile ? await uploadToSupabaseStorage(iconFile, 'app-icons', 'icons') : null;
            let bannerUrl = bannerFile ? await uploadToSupabaseStorage(bannerFile, 'app-banners', 'banners') : null;

            const screenshotUrls = [];
            for (const shot of screenshotFiles) {
                const url = await uploadToSupabaseStorage(shot, 'app-screenshots', 'screenshots');
                screenshotUrls.push(url);
            }

            let apkUrl = '';
            const apkSizeMB = apkFile.size / (1024 * 1024);
            const formattedSizeStr = formatBytes(apkFile.size);

            if (apkSizeMB <= 50 || activeProvider === 'supabase') {
                updateProgress(70, formattedSizeStr, 'Uploading APK to Supabase Bucket...');
                apkUrl = await uploadToSupabaseStorage(apkFile, 'app-apks', 'apks');
            } else {
                updateProgress(70, formattedSizeStr, 'Creating GitHub Release & Uploading APK...');
                apkUrl = await uploadToGitHubReleases(apkFile);
            }

            setStepStatus(chkStep3, 'completed', 'Uploading Application Package');
            setStepStatus(chkStep4, 'active', 'Finalizing Endpoint & Generating URL');
            updateProgress(90, formattedSizeStr, 'Inserting row into database...');

            // Insert row into Supabase table: apps
            const appRowPayload = {
                name: appData.name || appData.fName || 'Untitled App',
                package_name: appData.packageName || appData.package_name || 'com.app.palia',
                version: appData.version || appData.fVersion || '1.0.0',
                developer: appData.developer || appData.fDeveloper || 'PaliaAPK',
                category: appData.category || appData.fCategory || 'Games',
                android_version: appData.androidVersion || appData.android_version || 'Android 8.0+',
                description: appData.description || appData.fDescription || '',
                whats_new: appData.whatsNew || 'Initial release',
                icon_url: iconUrl,
                banner_url: bannerUrl,
                apk_url: apkUrl,
                screenshots: screenshotUrls,
                downloads: 0,
                views: 0,
                rating: 5.0,
                featured: false,
                trending: false,
                new_app: true,
                storage_provider: (apkSizeMB <= 50 || activeProvider === 'supabase') ? 'Supabase Storage' : 'GitHub Releases',
                apk_size: formattedSizeStr
            };

            const { error: insertError } = await supabaseClient
                .from('apps')
                .insert([appRowPayload]);

            if (insertError) throw insertError;

            setStepStatus(chkStep4, 'completed', 'Finalizing Endpoint & Generating URL');
            updateProgress(100, formattedSizeStr, 'Published Successfully!');

            // Show Success State
            setTimeout(() => {
                modalStateProgress.style.display = 'none';
                modalStateSuccess.style.display = 'block';
                if (successDeploymentUrl) successDeploymentUrl.textContent = apkUrl;
            }, 500);

        } catch (err) {
            console.error(err);
            modalStateProgress.style.display = 'none';
            modalStateFailed.style.display = 'block';
            if (failedReasonText) failedReasonText.textContent = err.message || 'An unexpected error occurred during publishing.';
            if (errorLogBox) errorLogBox.textContent = err.stack || JSON.stringify(err, null, 2);
        }
    }

    if (btnPublishSupabase) {
        btnPublishSupabase.addEventListener('click', () => {
            activeProvider = 'supabase';
            executePublishWorkflow();
        });
    }

    if (btnPublishGithub) {
        btnPublishGithub.addEventListener('click', () => {
            activeProvider = 'github';
            executePublishWorkflow();
        });
    }

    if (btnCopyUrl && successDeploymentUrl) {
        btnCopyUrl.addEventListener('click', () => {
            navigator.clipboard.writeText(successDeploymentUrl.textContent);
            btnCopyUrl.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
                btnCopyUrl.innerHTML = '<i class="fa-regular fa-copy"></i>';
            }, 2000);
        });
    }

})();
```[cite: 2]
