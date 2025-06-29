// Content script for extracting work item data from Azure DevOps pages
console.log('Copilot Summary: Content script loaded');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractWorkItemData') {
        try {
            const workItemData = extractWorkItemData();
            sendResponse({ success: true, data: workItemData });
        } catch (error) {
            console.error('Error extracting work item data:', error);
            sendResponse({ success: false, error: error.message });
        }
    } else if (request.action === 'extractUserName') {
        try {
            const userName = extractUserName();
            sendResponse({ success: true, data: userName });
        } catch (error) {
            console.error('Error extracting user name:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    return true; // Keep the message channel open for async response
});

function extractWorkItemData() {
    const data = {
        title: '',
        description: '',
        comments: [],
        assignedTo: '',

    };

    try {
  
        // Extract title
        const titleElement = document.querySelector('[aria-label="Title"]');
        if (titleElement) {
            data.title = titleElement.value || titleElement.textContent || titleElement.innerText || '';
        }

        // Extract description
        const descElement = document.querySelector('[aria-label="Description"]');
        if (descElement) {
            data.description = extractTextFromHTML(descElement.innerHTML);
        }

        // Extract assigned to
        const assignedElement = document.querySelector('[aria-label="Assigned To"], .assigned-to');
        if (assignedElement) {
            data.assignedTo = assignedElement.textContent || assignedElement.innerText || '';
        }


        // Extract comments
        data.comments = extractComments();

        // Clean up the data
        data.title = data.title.trim();
        data.description = data.description.trim();
        data.assignedTo = data.assignedTo.trim();

        return data;

    } catch (error) {
        console.error('Error in extractWorkItemData:', error);
        throw new Error('Failed to extract work item data from the page');
    }
}

function extractComments() {
    const comments = [];
    try {
        // Select all comment elements
        const commentElements = document.querySelectorAll('.comment-item');
        commentElements.forEach((commentElement, index) => {
            const author = commentElement.querySelector('.user-display-name')?.textContent.trim() || 'Unknown';
            const timestamp = commentElement.querySelector('.comment-timestamp')?.textContent.trim() || '';
            const text = commentElement.querySelector('.markdown-content')?.textContent.trim() || '';
            if (text.length > 0) {
                comments.push({
                    id: index,
                    author,
                    timestamp,
                    text
                });
            }
        });
    } catch (error) {
        console.error('Error extracting comments:', error);
    }
    return comments;
}

function extractTextFromHTML(html) {
    if (!html) return '';
    
    try {
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Remove script and style elements
        const scripts = tempDiv.querySelectorAll('script, style');
        scripts.forEach(script => script.remove());
        
        // Get text content and clean it up
        let text = tempDiv.textContent || tempDiv.innerText || '';
        
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    } catch (error) {
        console.error('Error extracting text from HTML:', error);
        return html.replace(/<[^>]*>/g, '').trim();
    }
}

function extractUserName() {
    try {
        let name = '';
        const element = document.querySelector('.mectrl_screen_reader_text');
        if (element) {
            name = element.textContent || element.getAttribute('aria-label') || '';
            if (name.includes('Account manager for')) {
                name = name.replace('Account manager for', '').trim();
            }
        }

        let profilePicUrl = '';
        const profilePicElement = document.querySelector('#mectrl_headerPicture');
        if (profilePicElement) {
            const backgroundImage = profilePicElement.style.backgroundImage;
            if (backgroundImage && backgroundImage.includes('url(')) {
                // Extract URL from background-image style
                const urlMatch = backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
                if (urlMatch) {
                    profilePicUrl = urlMatch[1];
                }
            }
        }

        return {
            name: name || '',
            profilePicUrl: profilePicUrl || ''
        };
    } catch (error) {
        console.error('Error extracting user name:', error);
        return { name: '', profilePicUrl: '' };
    }
}

// Log when the script is loaded
console.log('Copilot Summary: Content script initialized'); 