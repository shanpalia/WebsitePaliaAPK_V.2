/**
 * PaliaAPK HUB - Reusable Publish Progress Dialog Component
 * File: publish-popup.js
 * 
 * Dynamically injects glassmorphism modal styles and HTML.
 * Exposes API functions for step, progress, screenshot, completion, and error states.
 */

(function () {
    'use strict';

    // Prevent duplicate injection
    if (window.PublishProgressDialogInjected) return;
    window.PublishProgressDialogInjected = true;

    /* ==========================================================================
       1. INJECT CSS STYLES
       ========================================================================== */
    const styles = `
        :root {
            --pub-primary: #2563eb;
            --pub-primary-glow: rgba(37, 99, 235, 0.2);
            --pub-success: #10b981;
            --pub-success-glow: rgba(16, 185, 129, 0.2);
            --pub-success-light: #ecfdf5;
            --pub-error: #ef4444;
            --pub-error-glow: rgba(239, 68, 68, 0.2);
            --pub-error-light: #fef2f2;
            --pub-text-main: #0f172a;
            --pub-text-muted: #64748b;
            --pub-border-light: rgba(226, 232, 240, 0.8);
            --pub-bg-glass: rgba(255, 255, 255, 0.92);
            --pub-card-bg: rgba(255, 255, 255, 0.75);
            --pub-radius-lg: 24px;
            --pub-radius-md: 16px;
            --pub-radius-sm: 12px;
            --pub-shadow-modal: 0 25px 50px -12px rgba(15, 23, 42, 0.3);
            --pub-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .pub-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.55);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.35s ease, visibility 0.35s ease;
            z-index: 99999;
            padding: 16px;
            box-sizing: border-box;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        .pub-modal-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        .pub-modal-card {
            background: var(--pub-bg-glass);
            border: 1px solid rgba(255, 255, 255, 0.95);
            border-radius: var(--pub-radius-lg);
            width: 560px;
            max-width: 95%;
            box-shadow: var(--pub-shadow-modal);
            transform: scale(0.92) translateY(18px);
            transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            max-height: 88vh;
            color: var(--pub-text-main);
            box-sizing: border-box;
        }

        .pub-modal-overlay.active .pub-modal-card {
            transform: scale(1) translateY(0);
        }

        /* Header */
        .pub-modal-header {
            padding: 24px 28px 16px 28px;
            border-bottom: 1px solid var(--pub-border-light);
            background: rgba(255, 255, 255, 0.5);
        }

        .pub-modal-title {
            margin: 0;
            font-size: 21px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--pub-text-main);
        }

        .pub-modal-subtitle {
            margin: 4px 0 0 0;
            color: var(--pub-text-muted);
            font-size: 13.5px;
        }

        /* Body & Steps Container */
        .pub-modal-body {
            padding: 20px 28px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        /* Upload Step Card */
        .pub-step-card {
            background: var(--pub-card-bg);
            border: 1px solid var(--pub-border-light);
            border-radius: var(--pub-radius-md);
            padding: 14px 16px;
            display: flex;
            align-items: center;
            gap: 14px;
            transition: var(--pub-transition);
            box-sizing: border-box;
        }

        .pub-step-card.pending {
            opacity: 0.5;
            filter: grayscale(80%);
        }

        .pub-step-card.active {
            opacity: 1;
            filter: none;
            border-color: var(--pub-primary);
            box-shadow: 0 0 0 4px var(--pub-primary-glow);
            background: #ffffff;
            transform: scale(1.01);
        }

        .pub-step-card.completed {
            opacity: 1;
            filter: none;
            border-color: rgba(16, 185, 129, 0.35);
            background: var(--pub-success-light);
        }

        .pub-step-card.failed {
            opacity: 1;
            filter: none;
            border-color: rgba(239, 68, 68, 0.4);
            background: var(--pub-error-light);
            box-shadow: 0 0 0 4px var(--pub-error-glow);
        }

        /* Thumb Box */
        .pub-thumb-box {
            width: 52px;
            height: 52px;
            border-radius: var(--pub-radius-sm);
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
            border: 1px solid rgba(0, 0, 0, 0.06);
            position: relative;
        }

        .pub-thumb-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .pub-thumb-box svg {
            width: 24px;
            height: 24px;
            color: var(--pub-text-muted);
        }

        /* Step Info */
        .pub-step-info {
            flex-grow: 1;
            min-width: 0;
        }

        .pub-step-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }

        .pub-step-title {
            font-weight: 600;
            font-size: 14px;
            color: var(--pub-text-main);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .pub-step-percentage {
            font-size: 13px;
            font-weight: 700;
            color: var(--pub-primary);
        }

        .pub-step-card.completed .pub-step-percentage {
            color: var(--pub-success);
        }

        .pub-step-card.failed .pub-step-percentage {
            color: var(--pub-error);
        }

        /* Progress Bar */
        .pub-progress-track {
            height: 8px;
            width: 100%;
            background: #e2e8f0;
            border-radius: 99px;
            overflow: hidden;
            position: relative;
        }

        .pub-progress-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #3b82f6, #2563eb);
            border-radius: 99px;
            transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }

        .pub-step-card.active .pub-progress-fill::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 100%);
            animation: pub-shimmer 1.5s infinite;
        }

        @keyframes pub-shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }

        .pub-step-card.completed .pub-progress-fill {
            background: linear-gradient(90deg, #34d399, #10b981);
        }

        .pub-step-card.failed .pub-progress-fill {
            background: linear-gradient(90deg, #f87171, #ef4444);
        }

        /* State Views: Success & Error */
        .pub-completion-screen, .pub-error-screen {
            display: none;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 32px 20px 28px 20px;
            animation: pub-fadeIn 0.4s ease forwards;
        }

        @keyframes pub-fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .pub-status-icon-wrapper {
            width: 76px;
            height: 76px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 18px;
            animation: pub-popIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .pub-status-icon-wrapper.success-mode {
            background: var(--pub-success-light);
            box-shadow: 0 0 0 10px rgba(16, 185, 129, 0.12);
        }

        .pub-status-icon-wrapper.error-mode {
            background: var(--pub-error-light);
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.12);
        }

        @keyframes pub-popIn {
            0% { transform: scale(0); }
            100% { transform: scale(1); }
        }

        .pub-status-icon-wrapper svg {
            width: 42px;
            height: 42px;
        }

        .pub-status-icon-wrapper.success-mode svg {
            color: var(--pub-success);
        }

        .pub-status-icon-wrapper.error-mode svg {
            color: var(--pub-error);
        }

        .pub-state-title {
            margin: 0 0 8px 0;
            font-size: 22px;
            font-weight: 700;
            color: var(--pub-text-main);
        }

        .pub-state-subtitle {
            margin: 0 0 24px 0;
            color: var(--pub-text-muted);
            font-size: 14px;
            max-width: 380px;
            line-height: 1.5;
        }

        /* Buttons */
        .pub-btn-done {
            background: linear-gradient(135deg, #10b981, #059669);
            color: #ffffff;
            border: none;
            padding: 13px 40px;
            font-size: 15px;
            font-weight: 600;
            border-radius: 99px;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
            transition: var(--pub-transition);
            width: 100%;
            max-width: 220px;
        }

        .pub-btn-done:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
        }

        .pub-btn-retry {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: #ffffff;
            border: none;
            padding: 13px 40px;
            font-size: 15px;
            font-weight: 600;
            border-radius: 99px;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
            transition: var(--pub-transition);
            width: 100%;
            max-width: 220px;
        }

        .pub-btn-retry:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(239, 68, 68, 0.45);
        }

        .pub-checkmark-path {
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
            animation: pub-stroke 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.15s forwards;
        }

        @keyframes pub-stroke {
            100% { stroke-dashoffset: 0; }
        }

        body.pub-fade-out {
            opacity: 0;
            transition: opacity 0.8s ease;
        }
    `;

    const styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    styleEl.appendChild(document.createTextNode(styles));
    document.head.appendChild(styleEl);

    /* ==========================================================================
       2. INJECT HTML DIALOG DOM
       ========================================================================== */
    const dialogHTML = `
        <div class="pub-modal-card">
            <!-- Modal Header -->
            <div class="pub-modal-header" id="pubModalHeader">
                <h2 class="pub-modal-title">🚀 Publishing App</h2>
                <p class="pub-modal-subtitle">Please wait while your app is being published.</p>
            </div>

            <!-- Upload List Area -->
            <div class="pub-modal-body" id="pubUploadBody">
                
                <!-- Step 1: App Icon -->
                <div class="pub-step-card pending" id="step-icon">
                    <div class="pub-thumb-box" id="thumb-step-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                    </div>
                    <div class="pub-step-info">
                        <div class="pub-step-header">
                            <span class="pub-step-title" id="title-step-icon">Uploading App Icon</span>
                            <span class="pub-step-percentage" id="percent-step-icon">0%</span>
                        </div>
                        <div class="pub-progress-track">
                            <div class="pub-progress-fill" id="fill-step-icon"></div>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Banner -->
                <div class="pub-step-card pending" id="step-banner">
                    <div class="pub-thumb-box" id="thumb-step-banner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <div class="pub-step-info">
                        <div class="pub-step-header">
                            <span class="pub-step-title" id="title-step-banner">Uploading Banner</span>
                            <span class="pub-step-percentage" id="percent-step-banner">0%</span>
                        </div>
                        <div class="pub-progress-track">
                            <div class="pub-progress-fill" id="fill-step-banner"></div>
                        </div>
                    </div>
                </div>

                <!-- Step 3: Screenshots -->
                <div class="pub-step-card pending" id="step-screenshot">
                    <div class="pub-thumb-box" id="thumb-step-screenshot">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                    </div>
                    <div class="pub-step-info">
                        <div class="pub-step-header">
                            <span class="pub-step-title" id="title-step-screenshot">Uploading Screenshot 1 / 1</span>
                            <span class="pub-step-percentage" id="percent-step-screenshot">0%</span>
                        </div>
                        <div class="pub-progress-track">
                            <div class="pub-progress-fill" id="fill-step-screenshot"></div>
                        </div>
                    </div>
                </div>

                <!-- Step 4: APK -->
                <div class="pub-step-card pending" id="step-apk">
                    <div class="pub-thumb-box" id="thumb-step-apk">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </div>
                    <div class="pub-step-info">
                        <div class="pub-step-header">
                            <span class="pub-step-title" id="title-step-apk">Uploading APK</span>
                            <span class="pub-step-percentage" id="percent-step-apk">0%</span>
                        </div>
                        <div class="pub-progress-track">
                            <div class="pub-progress-fill" id="fill-step-apk"></div>
                        </div>
                    </div>
                </div>

                <!-- Step 5: Info -->
                <div class="pub-step-card pending" id="step-info">
                    <div class="pub-thumb-box" id="thumb-step-info">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    </div>
                    <div class="pub-step-info">
                        <div class="pub-step-header">
                            <span class="pub-step-title" id="title-step-info">Saving App Information</span>
                            <span class="pub-step-percentage" id="percent-step-info">0%</span>
                        </div>
                        <div class="pub-progress-track">
                            <div class="pub-progress-fill" id="fill-step-info"></div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Completion Screen -->
            <div class="pub-completion-screen" id="pubCompletionScreen">
                <div class="pub-status-icon-wrapper success-mode">
                    <svg viewBox="0 0 52 52">
                        <path class="pub-checkmark-path" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="M14 27 l10 10 L38 16"/>
                    </svg>
                </div>
                <h3 class="pub-state-title">🎉 App Published Successfully</h3>
                <p class="pub-state-subtitle">Your application has been published successfully.</p>
                <button class="pub-btn-done" id="pubDoneBtn">Done</button>
            </div>

            <!-- Error Screen -->
            <div class="pub-error-screen" id="pubErrorScreen">
                <div class="pub-status-icon-wrapper error-mode">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <h3 class="pub-state-title">Upload Failed</h3>
                <p class="pub-state-subtitle" id="pubErrorMessage">An unexpected error occurred during upload.</p>
                <button class="pub-btn-retry" id="pubRetryBtn">Retry</button>
            </div>

        </div>
    `;

    const overlayEl = document.createElement('div');
    overlayEl.className = 'pub-modal-overlay';
    overlayEl.id = 'publishProgressModal';
    overlayEl.setAttribute('aria-hidden', 'true');
    overlayEl.innerHTML = dialogHTML;
    document.body.appendChild(overlayEl);

    /* ==========================================================================
       3. STATE MANAGERS & API IMPLEMENTATION
       ========================================================================== */
    let lastFailedStep = null;

    const defaultTitles = {
        'step-icon': 'Uploading App Icon',
        'step-banner': 'Uploading Banner',
        'step-screenshot': 'Uploading Screenshot',
        'step-apk': 'Uploading APK',
        'step-info': 'Saving App Information'
    };

    /**
     * Opens the Publish Progress Dialog Popup
     */
    window.openPublishProgressDialog = function () {
        const modal = document.getElementById('publishProgressModal');
        const header = document.getElementById('pubModalHeader');
        const body = document.getElementById('pubUploadBody');
        const completionScreen = document.getElementById('pubCompletionScreen');
        const errorScreen = document.getElementById('pubErrorScreen');

        // Reset views
        header.style.display = 'block';
        body.style.display = 'flex';
        completionScreen.style.display = 'none';
        errorScreen.style.display = 'none';
        lastFailedStep = null;

        // Reset step states
        const steps = ['step-icon', 'step-banner', 'step-screenshot', 'step-apk', 'step-info'];
        steps.forEach(stepId => {
            const card = document.getElementById(stepId);
            const fill = document.getElementById(`fill-${stepId}`);
            const percentText = document.getElementById(`percent-${stepId}`);
            const titleText = document.getElementById(`title-${stepId}`);

            card.className = 'pub-step-card pending';
            fill.style.width = '0%';
            percentText.textContent = '0%';
            if (defaultTitles[stepId]) {
                titleText.textContent = defaultTitles[stepId];
            }
        });

        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
    };

    /**
     * Closes the Publish Progress Dialog Popup
     */
    window.closePublishProgressDialog = function () {
        const modal = document.getElementById('publishProgressModal');
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
    };

    /**
     * Sets preview image for a specific step
     * @param {string} step - 'step-icon', 'step-banner', 'step-screenshot', 'step-apk', 'step-info'
     * @param {string} imageUrl - Image URL or Data URI
     */
    window.setPublishPreview = function (step, imageUrl) {
        const thumbBox = document.getElementById(`thumb-${step}`);
        if (thumbBox && imageUrl) {
            thumbBox.innerHTML = `<img src="${imageUrl}" alt="preview">`;
        }
    };

    /**
     * Sets progress percentage & status for a specific step
     * @param {string} step - Supported step ID
     * @param {number} percent - 0 to 100
     * @param {string} [message] - Custom completion or status text
     */
    window.setPublishStep = function (step, percent, message) {
        const card = document.getElementById(step);
        const fill = document.getElementById(`fill-${step}`);
        const percentText = document.getElementById(`percent-${step}`);

        if (!card || !fill || !percentText) return;

        const p = Math.min(Math.max(Math.round(percent), 0), 100);

        if (p < 100) {
            card.className = 'pub-step-card active';
            fill.style.width = p + '%';
            percentText.textContent = p + '%';
        } else {
            card.className = 'pub-step-card completed';
            fill.style.width = '100%';

            if (message) {
                percentText.innerHTML = message;
            } else {
                if (step === 'step-icon') percentText.innerHTML = '✔ Icon Uploaded';
                else if (step === 'step-banner') percentText.innerHTML = '✔ Banner Uploaded';
                else if (step === 'step-apk') percentText.innerHTML = '✔ APK Uploaded';
                else if (step === 'step-info') percentText.innerHTML = '✔ Saved Successfully';
                else percentText.innerHTML = '✔ Completed';
            }
        }
    };

    /**
     * Sets screenshot step details dynamically
     * @param {number} index - Current index (e.g., 1)
     * @param {number} total - Total count (e.g., 5)
     * @param {string} [imageUrl] - Preview image URL
     */
    window.nextScreenshot = function (index, total, imageUrl) {
        const titleText = document.getElementById('title-step-screenshot');
        if (titleText) {
            titleText.textContent = `Uploading Screenshot ${index} / ${total}`;
        }
        if (imageUrl) {
            window.setPublishPreview('step-screenshot', imageUrl);
        }
    };

    /**
     * Shows completion screen upon successful publication
     */
    window.publishCompleted = function () {
        const header = document.getElementById('pubModalHeader');
        const body = document.getElementById('pubUploadBody');
        const completionScreen = document.getElementById('pubCompletionScreen');
        const errorScreen = document.getElementById('pubErrorScreen');

        header.style.display = 'none';
        body.style.display = 'none';
        errorScreen.style.display = 'none';
        completionScreen.style.display = 'flex';
    };

    /**
     * Triggers error state in dialog
     * @param {string} message - Error description
     * @param {string} [failedStep] - Optional step ID that failed
     */
    window.publishFailed = function (message, failedStep) {
        const header = document.getElementById('pubModalHeader');
        const body = document.getElementById('pubUploadBody');
        const completionScreen = document.getElementById('pubCompletionScreen');
        const errorScreen = document.getElementById('pubErrorScreen');
        const errorMsgEl = document.getElementById('pubErrorMessage');

        if (failedStep) {
            lastFailedStep = failedStep;
            const card = document.getElementById(failedStep);
            const percentText = document.getElementById(`percent-${failedStep}`);
            if (card && percentText) {
                card.className = 'pub-step-card failed';
                percentText.textContent = 'Failed';
            }
        }

        header.style.display = 'none';
        body.style.display = 'none';
        completionScreen.style.display = 'none';

        errorMsgEl.textContent = message || 'An unexpected error occurred during publication.';
        errorScreen.style.display = 'flex';
    };

    /* ==========================================================================
       4. BUTTON HANDLERS
       ========================================================================== */
    const doneBtn = document.getElementById('pubDoneBtn');
    const retryBtn = document.getElementById('pubRetryBtn');

    doneBtn.addEventListener('click', function () {
        window.closePublishProgressDialog();
        setTimeout(function () {
            document.body.classList.add('pub-fade-out');
            setTimeout(function () {
                window.location.href = 'dashboard.html';
            }, 800);
        }, 300);
    });

    retryBtn.addEventListener('click', function () {
        const header = document.getElementById('pubModalHeader');
        const body = document.getElementById('pubUploadBody');
        const errorScreen = document.getElementById('pubErrorScreen');

        errorScreen.style.display = 'none';
        header.style.display = 'block';
        body.style.display = 'flex';

        if (lastFailedStep) {
            const card = document.getElementById(lastFailedStep);
            const fill = document.getElementById(`fill-${lastFailedStep}`);
            const percentText = document.getElementById(`percent-${lastFailedStep}`);

            if (card && fill && percentText) {
                card.className = 'pub-step-card active';
                fill.style.width = '0%';
                percentText.textContent = '0%';
            }
        }
    });

})();
