// Background service worker for handling Azure Function API calls
console.log('Copilot Summary: Background script loaded');

// Azure Function Configuration - Update this URL after deploying your function
const AZURE_FUNCTION_URL = "https://ado-summary-function.azurewebsites.net/api/summarize";

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);
    
    if (request.action === 'test') {
        // Test message handler
        console.log('Background script: Handling test message');
        sendResponse({ success: true, message: 'Background script is working!', data: request.data });
        return true;
    }
    
    if (request.action === 'summarizeWithOpenAI') {
        console.log('Background script: Handling summarize request');
        handleSummarizeRequest(request, sendResponse);
        return true; // Keep the message channel open for async response
    }
    
    // Handle unknown actions
    console.log('Background script: Unknown action:', request.action);
    sendResponse({ success: false, error: 'Unknown action: ' + request.action });
    return true;
});

async function handleSummarizeRequest(request, sendResponse) {
    try {
        const { data: workItemData, personalization } = request;
        
        // Validate that we have the required configuration
        if (!AZURE_FUNCTION_URL) {
            throw new Error('Azure Function URL is not configured. Please check the hardcoded settings.');
        }

        // Call Azure Function with work item data and personalization
        const summary = await callAzureFunction(workItemData, personalization);
        
        sendResponse({ success: true, summary: summary });
        
    } catch (error) {
        console.error('Error in handleSummarizeRequest:', error);
        sendResponse({ success: false, error: error.message });
    }
}

async function callAzureFunction(workItemData, personalization) {
    const url = AZURE_FUNCTION_URL;
    
    const requestBody = {
        workItemData: workItemData,
        personalization: personalization
    };

    try {
        console.log('Making request to Azure Function...');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Azure Function API error:', response.status, errorText);
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Check for errors in the response body
        if (data?.error !== undefined) {
            throw new Error(`API Error: ${data.error.message || 'Unknown error'}`);
        }
        
        if (!data.success || !data.summary) {
            throw new Error('Invalid response from Azure Function API');
        }

        return data.summary;

    } catch (error) {
        console.error('Error calling Azure Function:', error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection and function URL.');
        }
        
        throw error;
    }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('Copilot Summary: Extension installed');
    }
});

console.log('Copilot Summary: Background script initialized'); 