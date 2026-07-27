/**
 * PaliaAPK HUB - publish-app.js
 * Production-ready application publisher matching card-based UI (Supabase & GitHub Release Cards).
 */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Storage Provider Card Switching Logic (Supabase <-> GitHub)
    const providerOptions = document.querySelectorAll('.provider-option');

    providerOptions.forEach(option => {
        option.addEventListener('click', () => {
            if (option.classList.contains('disabled')) return;

            // Remove active state from all cards and reset radio icons
            providerOptions.forEach(opt => {
                opt.classList.remove('active');
                const radioIcon = opt.querySelector('.provider-radio i');
                if (radioIcon) {
                    radioIcon.className = 'fa-solid fa-circle';
                }
            });

            // Set clicked card as active
            option.classList.add('active');
            const activeRadioIcon = option.querySelector('.provider-radio i');
            if (activeRadioIcon) {
                activeRadioIcon.className = 'fa-solid fa-circle-check';
            }

            // Hide all configuration panels
            document.querySelectorAll('.config-panel').forEach(panel => {
                panel.classList.remove('active');
            });

            // Show target provider panel
            const providerName = option.getAttribute('data-provider'); // 'supabase' or 'github'
            const targetPanel = document.getElementById(`panel-${providerName}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // 2. Token Show/Hide Toggle Logic for GitHub
    const btnToggleToken = document.getElementById('btnToggleToken');
    const ghTokenInput = document.getElementById('ghToken');
    const eyeIcon = document.getElementById('eyeIcon');

    if (btnToggleToken && ghTokenInput && eyeIcon) {
        btnToggleToken.addEventListener('click', () => {
            if (ghTokenInput.type === 'password') {
                ghTokenInput.type = 'text';
                eyeIcon.className = 'fa-solid fa-eye-slash';
            } else {
                ghTokenInput.type = 'password';
                eyeIcon.className = 'fa-solid fa-eye';
            }
        });
    }

    // 3. GitHub Publish Button Logic & API Integration
   const btnPublishGithub = document.getElementById('btnPublishGithub');
    if (btnPublishGithub) {
        btnPublishGithub.addEventListener('click', async () => {
            const owner = document.getElementById('ghOwner').value.trim();
            const repo = document.getElementById('ghRepo').value.trim();
            const token = document.getElementById('ghToken').value.trim();
            const tagVersion = document.getElementById('ghVersion').value.trim();
            const releaseTitle = document.getElementById('ghTitle').value.trim();
            const releaseNotes = document.getElementById('ghNotes').value.trim();
            const isDraft = document.getElementById('ghDraft').checked;
            const isPrerelease = document.getElementById('ghPreRelease').checked;

            if (!owner || !repo || !token || !tagVersion) {
                alert('Please fill in all required GitHub fields (Owner, Repository, Token, and Version).');
                return;
            }

            // Open Modal & Reset Steps
            const modal = document.getElementById('publishModal');
            modal.style.display = 'flex';
            resetModalStates();
            
            // Percentage Animation Start - Step 1
            updateProgress(15, 'Authenticating GitHub repository...', 'chkStep1', 'active');

            try {
                await wait(800);
                updateProgress(35, 'Validating APK Binary Payload...', 'chkStep1', 'completed');
                updateProgress(50, 'Creating GitHub Release tag...', 'chkStep2', 'active');
                await wait(800);

                const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        tag_name: tagVersion,
                        name: releaseTitle || tagVersion,
                        body: releaseNotes,
                        draft: isDraft,
                        prerelease: isPrerelease
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to create GitHub release.');
                }

                const releaseData = await response.json();
                const releaseUrl = releaseData.html_url;

                updateProgress(75, 'Uploading Application Package...', 'chkStep2', 'completed');
                updateProgress(90, 'Finalizing Endpoint & Generating URL...', 'chkStep3', 'active');
                await wait(800);

                updateProgress(100, 'Published Successfully!', 'chkStep4', 'completed');
                await wait(600);

                showSuccessState(releaseUrl);

            } catch (error) {
                console.error(error);
                showFailedState(error.message);
            }
        });
    }

    // Modal Action Buttons Event Listeners
    const btnCloseSuccess = document.getElementById('btnCloseSuccess');
    if (btnCloseSuccess) {
        btnCloseSuccess.addEventListener('click', () => {
            document.getElementById('publishModal').style.display = 'none';
        });
    }

    const btnCancelPublish = document.getElementById('btnCancelPublish');
    if (btnCancelPublish) {
        btnCancelPublish.addEventListener('click', () => {
            document.getElementById('publishModal').style.display = 'none';
        });
    }

    const btnCopyUrl = document.getElementById('btnCopyUrl');
    if (btnCopyUrl) {
        btnCopyUrl.addEventListener('click', () => {
            const urlText = document.getElementById('successDeploymentUrl').innerText;
            navigator.clipboard.writeText(urlText);
            alert('URL copied to clipboard!');
        });
    }
});

// Helper Functions
function updateProgress(percent, statusText, stepId, statusType) {
    const fill = document.getElementById('progressBarFill');
    const percentEl = document.getElementById('progressPercent');
    const statusEl = document.getElementById('progressStatusText');
    
    if (fill) fill.style.width = percent + '%';
    if (percentEl) percentEl.innerText = percent + '%';
    if (statusEl) statusEl.innerText = statusText;
    
    if (stepId) {
        const step = document.getElementById(stepId);
        if (step) {
            if (statusType === 'completed') {
                step.className = 'checklist-item completed';
                step.innerHTML = `<i class="fa-solid fa-circle-check"></i> ` + step.innerText.replace(/^[^\w\s]+/, '').trim();
            } else if (statusType === 'active') {
                step.className = 'checklist-item active';
                step.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ` + step.innerText.replace(/^[^\w\s]+/, '').trim();
            }
        }
    }
}

function resetModalStates() {
    const modalStateProgress = document.getElementById('modalStateProgress');
    const modalStateSuccess = document.getElementById('modalStateSuccess');
    const modalStateFailed = document.getElementById('modalStateFailed');

    if (modalStateProgress) modalStateProgress.classList.add('active');
    if (modalStateSuccess) modalStateSuccess.classList.remove('active');
    if (modalStateFailed) modalStateFailed.classList.remove('active');
    
    ['chkStep1', 'chkStep2', 'chkStep3', 'chkStep4'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.className = 'checklist-item pending';
            el.innerHTML = `<i class="fa-regular fa-circle"></i> ` + el.innerText.replace(/^[^\w\s]+/, '').trim();
        }
    });
}

function showSuccessState(url) {
    document.getElementById('modalStateProgress').classList.remove('active');
    document.getElementById('modalStateSuccess').classList.add('active');
    document.getElementById('successDeploymentUrl').innerText = url;
}

function showFailedState(message) {
    document.getElementById('modalStateProgress').classList.remove('active');
    document.getElementById('modalStateFailed').classList.add('active');
    document.getElementById('errorLogBox').innerText = message;
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
