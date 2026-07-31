/**
 * add-app.js
 * PaliaAPK HUB - Production-ready App Publishing Script
 * Integrated with existing UI, uploads object, Cloudflare Worker (Telegram APK upload), 
 * Supabase Storage buckets, and Supabase Database insertion.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { uploadApkToTelegram } from './telegram-publisher.js';

// Supabase Configuration
const SUPABASE_URL = 'https://ralinnuegsbuvlhwpzln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbGlubnVlZ3NidXZsaHdwemxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTU2NDIsImV4cCI6MjA5NTg3MTY0Mn0.hIec6UxRx5gzSMTi5oJ3_xXw3d1QKCmKsPF-stBwIFE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const btnPublish = document.getElementById('btnPublish');
    const progressModal = document.getElementById('progressModal');
    const successModal = document.getElementById('successModal');
    const errorModal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    const successDownloadUrlElement = document.getElementById('successDownloadUrl') || document.getElementById('downloadUrl');

    if (!btnPublish) return;

    // Helper to update progress message safely if an element exists inside progressModal
    const updateProgressText = (text) => {
        const progressTextElem = progressModal?.querySelector('.progress-text') || document.getElementById('progressText');
        if (progressTextElem) progressTextElem.textContent = text;
    };

    btnPublish.addEventListener('click', async () => {
        try {
            // 2. Validate required fields
            const appName = document.getElementById('appName')?.value || document.getElementById('fName')?.value || '';
            const version = document.getElementById('version')?.value || document.getElementById('fVersion')?.value || '';
            const developer = document.getElementById('developer')?.value || document.getElementById('fDeveloper')?.value || '';
            const packageName = document.getElementById('packageName')?.value || document.getElementById('fPackage')?.value || '';
            const category = document.getElementById('category')?.value || document.getElementById('fCategory')?.value || '';
            const androidVersion = document.getElementById('androidVersion')?.value || document.getElementById('fAndroidVersion')?.value || '';
            const description = document.getElementById('description')?.value || document.getElementById('fDescription')?.value || '';
           

            // 4. Read uploaded files from existing uploads object
            const apkFile = window.uploads?.apk?.file;
            const iconFile = window.uploads?.icon?.file;
            const bannerFile = window.uploads?.banner?.file;

            if (!appName.trim() || !version.trim() || !packageName.trim() || !apkFile) {
                throw new Error('Please fill in all required fields and select an APK file.');
            }

            // 8. Show existing progress dialog & set initial state
            if (progressModal) progressModal.style.display = 'flex';
            updateProgressText('Preparing...');

            // 5. Upload APK using telegram-publisher.js
            updateProgressText('Uploading APK...');
            const telegramResult = await uploadApkToTelegram({
                apkFile,
                appName: appName.trim(),
                version: version.trim(),
                developer: developer.trim()
            });

            if (!telegramResult || telegramResult.success === false) {
                throw new Error(telegramResult?.error || 'Failed to upload APK to Telegram Worker.');
            }

            const apkUrl = telegramResult.download_url;
            const telegramFileId = telegramResult.telegram_file_id || telegramResult.file_id;
            const telegramFileUniqueId = telegramResult.telegram_file_unique_id || telegramResult.file_unique_id;
            const telegramMessageId = telegramResult.telegram_message_id || telegramResult.message_id;

            // Helper function to upload images to Supabase Storage buckets
            const uploadImageToSupabase = async (file, bucketName) => {
                if (!file) return null;
                const fileExt = file.name ? file.name.split('.').pop() : 'png';
                const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from(bucketName)
                    .upload(uniqueFileName, file);

                if (uploadError) {
                    throw new Error(`Supabase storage upload failed for ${bucketName}: ${uploadError.message}`);
                }

                const { data: { publicUrl } } = supabase.storage
                    .from(bucketName)
                    .getPublicUrl(uniqueFileName);

                return publicUrl;
            };

            // 6. Upload icon, banner, and screenshots to Supabase Storage
            updateProgressText('Uploading Images...');
            const iconUrl = await uploadImageToSupabase(iconFile, 'app-icons');
            const bannerUrl = await uploadImageToSupabase(bannerFile, 'app-banners');

            const screenshots = [];
            for (let i = 1; i <= 5; i++) {
                const screenKey = `screenshot${i}`;
                const screenFile = window.uploads?.[screenKey]?.file;
                if (screenFile) {
                    const sUrl = await uploadImageToSupabase(screenFile, 'app-screenshots');
                    if (sUrl) screenshots.push(sUrl);
                }
            }

            // 7. Insert database row into apps table
            updateProgressText('Saving Database...');
            const { error: dbError } = await supabase
                .from('apps')
                .insert([
                    {
                        name: appName.trim(),
                        version: version.trim(),
                        developer: developer.trim(),
                        package_name: packageName.trim(),
                        category: category.trim(),
                        android_version: androidVersion.trim(),
                        description: description.trim(),
                        
                        icon_url: iconUrl,
                        banner_url: bannerUrl,
                        screenshots: screenshots,
                        apk_url: apkUrl,
                        telegram_file_id: telegramFileId,
                        telegram_file_unique_id: telegramFileUniqueId,
                        telegram_message_id: telegramMessageId,
                        published: true,
                        created_at: new Date().toISOString()
                    }
                ]);

            if (dbError) {
                throw new Error(`Database insertion failed: ${dbError.message}`);
            }

            updateProgressText('Completed.');

            // Hide progress modal
            if (progressModal) progressModal.style.display = 'none';

            // 10. If publish succeeds, show existing success dialog and display download URL
            if (successDownloadUrlElement) {
                if (successDownloadUrlElement.tagName === 'INPUT' || successDownloadUrlElement.tagName === 'TEXTAREA') {
                    successDownloadUrlElement.value = apkUrl;
                } else {
                    successDownloadUrlElement.textContent = apkUrl;
                    successDownloadUrlElement.href = apkUrl;
                }
            }

            if (successModal) successModal.style.display = 'flex';

            // Reset form and uploads state if available
            const formElement = document.getElementById('appForm') || document.querySelector('form');
            if (formElement) formElement.reset();
            if (window.uploads) {
    Object.keys(window.uploads).forEach(key => delete window.uploads[key]);
}

        } catch (error) {
            console.error('Publish error:', error);
            // 9. If any upload fails, show existing error modal
            if (progressModal) progressModal.style.display = 'none';
            
            if (errorMessage) errorMessage.textContent = error.message || 'An unexpected error occurred during publishing.';
            if (errorModal) errorModal.style.display = 'flex';
        }
    });
});
