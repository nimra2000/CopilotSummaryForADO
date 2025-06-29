document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const summarizeBtn = document.getElementById('summarizeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const summarySection = document.getElementById('summarySection');
    const summaryContent = document.getElementById('summaryContent');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    
    // Personalization elements
    const userRoleSelect = document.getElementById('userRole');
    const summaryStyleSelect = document.getElementById('summaryStyle');
    const personalizationBadge = document.getElementById('personalizationBadge');
    
    // Feedback elements
    const feedbackSection = document.getElementById('feedbackSection');
    const feedbackBtn = document.getElementById('feedbackBtn');

    // Microsoft Forms URL
    const MICROSOFT_FORM_URL = 'https://forms.office.com/Pages/ResponsePage.aspx?id=v4j5cvGGr0GRqy180BHbR3e6Tu54-QdIl7Q76GrVz5hUN0VJOFZPWFlGQllHWjdOM1BHSDJWSEUzWS4u';

    // Event listeners
    summarizeBtn.addEventListener('click', summarizeWorkItem);
    feedbackBtn.addEventListener('click', submitFeedback);
    
    // Make personalization badge clickable to show settings
    personalizationBadge.addEventListener('click', () => {
        document.getElementById('personalizationSection').style.display = 'block';
        personalizationBadge.style.cursor = 'default';
        personalizationBadge.title = '';
    });

    // Initialize the popup
    initializePopup();

    let extractedUserName = '';

    async function initializePopup() {
        try {
            console.log('Initializing popup...');
            await checkIfOnCopilotSummary();
            console.log('Copilot Summary check completed');
            await extractAndSetUserName();
            console.log('User name extraction completed');
            loadUserPreferences();
            console.log('User preferences loaded');
        } catch (error) {
            console.error('Error initializing popup:', error);
        }
    }

    async function checkIfOnCopilotSummary() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const isCopilotSummary = tab.url.includes('visualstudio.com') || tab.url.includes('dev.azure.com');
            
            if (!isCopilotSummary) {
                showError('This extension only works on Azure DevOps pages');
                summarizeBtn.disabled = true;
            }
        } catch (error) {
            console.error('Error checking tab:', error);
        }
    }

    async function extractAndSetUserName() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractUserName' });
            if (response && response.success && response.data) {
                const userData = response.data;
                setPersonalizationGreeting(userData.name || '');
                setProfilePhoto(userData.profilePicUrl || '');
            } else {
                setPersonalizationGreeting('');
                setProfilePhoto('');
            }
        } catch (error) {
            setPersonalizationGreeting('');
            setProfilePhoto('');
        }
    }

    function loadUserPreferences() {
        chrome.storage.sync.get(['userRole', 'summaryStyle'], function(result) {
            if (result.userRole) userRoleSelect.value = result.userRole;
            if (result.summaryStyle) summaryStyleSelect.value = result.summaryStyle;
            updatePersonalizationBadge();
        });
    }

    function saveUserPreferences() {
        chrome.storage.sync.set({
            userRole: userRoleSelect.value,
            summaryStyle: summaryStyleSelect.value
        });
    }

    function updatePersonalizationBadge() {
        const userName = extractedUserName || 'Unknown';
        const role = userRoleSelect.value;
        const style = summaryStyleSelect.value;
        
        const badge = document.getElementById('personalizationBadge');
        const badgeText = badge.querySelector('.badge-text');
        const badgeProfilePic = document.getElementById('badgeProfilePic');
        const userProfilePic = document.getElementById('userProfilePic');
        
        // Update badge text
        badgeText.textContent = `${userName} • ${role}`;
        
        // Show profile picture in badge if available
        if (userProfilePic.src && userProfilePic.src !== window.location.href) {
            badgeProfilePic.src = userProfilePic.src;
            badgeProfilePic.style.display = 'inline-block';
        } else {
            badgeProfilePic.style.display = 'none';
        }
        
        // Show/hide badge based on whether we have user info
        if (userName && userName !== 'Unknown') {
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    userRoleSelect.addEventListener('change', () => {
        saveUserPreferences();
        updatePersonalizationBadge();
    });
    
    summaryStyleSelect.addEventListener('change', () => {
        saveUserPreferences();
        updatePersonalizationBadge();
    });

    async function summarizeWorkItem() {
        try {
            showLoading();
            hideError();

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractWorkItemData' });
            
            if (!response || !response.success) {
                throw new Error(response?.error || 'Failed to extract work item data');
            }

            const workItemData = response.data;
            
            if (!workItemData.title && !workItemData.description && workItemData.comments.length === 0) {
                throw new Error('No work item data found on this page');
            }

            const personalizationData = {
                userName: extractedUserName || 'Unknown',
                userRole: userRoleSelect.value,
                summaryStyle: summaryStyleSelect.value
            };

            const summaryResponse = await chrome.runtime.sendMessage({
                action: 'summarizeWithOpenAI',
                data: workItemData,
                personalization: personalizationData
            });

            if (!summaryResponse.success) {
                throw new Error(summaryResponse.error || 'Failed to generate summary');
            }

            displaySummary(summaryResponse.summary, workItemData);

        } catch (error) {
            console.error('Error summarizing work item:', error);
            showError(error.message);
        }
    }

    function showLoading() {
        summarySection.style.display = 'block';
        loadingIndicator.style.display = 'block';
        summaryContent.innerHTML = '';
        summaryContent.appendChild(loadingIndicator);
        feedbackSection.style.display = 'none';
        
        // Update button state during loading
        summarizeBtn.innerHTML = '<span class="btn-icon">⏳</span> Generating...';
        summarizeBtn.disabled = true;
        
        // Hide personalization section during generation
        document.getElementById('personalizationSection').style.display = 'none';
    }

    function displaySummary(summary, workItemData) {
        loadingIndicator.style.display = 'none';
        
        const summaryHTML = `
            <p><strong>Context:</strong></p>
            <p>${summary.descriptionSummary || 'No description available'}</p>
            
            ${summary.commentsSummary ? `
                <h4>Discussion Summary</h4>
                <p>${summary.commentsSummary}</p>
            ` : ''}

            ${summary.actionItems && summary.actionItems.length > 0 ? `
                <h4>Action Items</h4>
                <ul>
                    ${summary.actionItems.map(item => `<li>${item}</li>`).join('')}
                </ul>
            ` : ''}

            ${summary.openQuestions && summary.openQuestions.length > 0 ? `
                <h4>Open Questions</h4>
                <ul>
                    ${summary.openQuestions.map(question => `<li>${question}</li>`).join('')}
                </ul>
            ` : ''}

            ${summary.askFromMe ? `
                <h4>Your Next Steps or Suggestions</h4>
                <p>${summary.askFromMe}</p>
            ` : ''}
        `;
        
        summaryContent.innerHTML = summaryHTML;
        feedbackSection.style.display = 'block';
        window.currentWorkItemData = workItemData;
        window.currentSummary = summary;
        
        // Update button state after summary is displayed
        summarizeBtn.innerHTML = '<span class="btn-icon">🔄</span> Regenerate';
        summarizeBtn.disabled = false;
        
        // Hide personalization section and make badge clickable
        document.getElementById('personalizationSection').style.display = 'none';
        personalizationBadge.style.cursor = 'pointer';
        personalizationBadge.title = 'Click to edit personalization settings';
    }

    function submitFeedback() {
        try {
            chrome.tabs.create({ url: MICROSOFT_FORM_URL });
            showFeedbackSuccess();
        } catch (error) {
            console.error('Error opening feedback form:', error);
            showError('Failed to open feedback form');
        }
    }

    function showFeedbackSuccess() {
        const successMessage = document.createElement('div');
        successMessage.className = 'feedback-success';
        successMessage.innerHTML = `
            <p style="color: #10b981; font-size: 12px; text-align: center; margin-top: 10px;">
                ✅ Feedback form opened in new tab. Thank you for your feedback!
            </p>
        `;
        feedbackSection.appendChild(successMessage);
        
        setTimeout(() => {
            if (successMessage.parentNode) {
                successMessage.parentNode.removeChild(successMessage);
            }
        }, 3000);
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorSection.style.display = 'block';
        summarySection.style.display = 'none';
    }

    function hideError() {
        errorSection.style.display = 'none';
    }

    // Set greeting and photo in personalization section
    function setPersonalizationGreeting(userName) {
        const greetingEl = document.getElementById('personalizationGreeting');
        let firstName = 'User';
        if (userName && typeof userName === 'string') {
            firstName = userName.split(' ')[0];
        }
        greetingEl.textContent = `Hi, ${firstName}. Tailor your experience.`;
        extractedUserName = firstName;
    }

    function setProfilePhoto(photoUrl) {
        const photoEl = document.getElementById('userProfilePic');
        if (photoUrl) {
            photoEl.src = photoUrl;
            photoEl.style.display = 'block';
        } else {
            photoEl.style.display = 'none';
        }
    }
}); 