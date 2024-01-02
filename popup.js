import { GoogleGenerativeAI } from "@google/generative-ai";
import { Readability } from "@mozilla/readability";


document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const apiKeyInput = document.getElementById('apiKey');
    const saveApiKeyButton = document.getElementById('saveApiKey');
    const summarizeButton = document.getElementById('summarizeButton');
    let searchTimeout;

    // Load saved API key
    chrome.storage.sync.get('apiKey', function(data) {
        if (data.apiKey) {
            apiKeyInput.value = data.apiKey;
        }
    });

    // Save the API key
    saveApiKeyButton.addEventListener('click', function() {
        chrome.storage.sync.set({'apiKey': apiKeyInput.value}, function() {
            alert('API Key saved');
        });
    });

    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout); // Clear existing timeout to debounce the search
        const query = searchInput.value.trim();

        if (query.length > 2) { // Simple threshold to avoid too many searches
            // Debounce search to reduce the number of searches while typing
            searchTimeout = setTimeout(() => performSearch(query), 300);
        } else {
            searchResults.innerHTML = '';
        }
    });
    function performSearch(query) {
        searchResults.innerHTML = ''; // Clear previous results
        searchResults.textContent = 'Searching...'; // Provide immediate feedback

        // Retrieve stored HTML content and search
        chrome.storage.local.get(null, function(items) {
            searchResults.innerHTML = ''; // Clear the 'Searching...' text
            let found = false;

            Object.keys(items).forEach(url => {
                if (items[url].toLowerCase().includes(query.toLowerCase())) {
                    appendResult(url);
                    found = true;
                }
            });

            if (!found) {
                searchResults.textContent = 'No matches found.';
            }
        });
    }


    summarizeButton.addEventListener('click', function() {
        summarizeSelectedPages();
    });

    function appendResult(url) {
        const resultElement = document.createElement('div');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = url;
        resultElement.appendChild(checkbox);

        const text = document.createTextNode(` ${url}`);
        resultElement.appendChild(text);

        searchResults.appendChild(resultElement);
    }

    async function summarizeSelectedPages() {
        const selectedURLs = Array.from(searchResults.querySelectorAll('input[type="checkbox"]:checked'))
                                 .map(checkbox => checkbox.value);
    
        if (selectedURLs.length === 0) {
            alert('Please select at least one page to summarize.');
            return;
        }
    
        const summariesContainer = document.getElementById('summaries');
        summariesContainer.innerHTML = 'Summarizing...';
        let apiKey = ''; // Placeholder for the API key
    
        // Retrieve the API key from Chrome's storage
        try {
            apiKey = await getApiKey();
        } catch (error) {
            console.error('Error retrieving API key:', error);
            throw new Error('API key retrieval failed');
        }

        for (const url of selectedURLs) {
            try {
                const content = await getContentFromStorage(url);
                const summary = await getSummaryFromGeminiPro(content, apiKey);
                console.log(summary)
                displaySummary(url, summary, summariesContainer);
            } catch (error) {
                console.error('Error summarizing content:', error);
                summariesContainer.innerHTML += `<div>Error occurred while summarizing ${url}.</div>`;
            }
        }
    }
    
    function getContentFromStorage(url) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(url, function(items) {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(items[url]);
            });
        });
    }
    async function getMainContent(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
    
        const readability = new Readability(doc);
        const article = readability.parse();
    
        return article.textContent; // or article.content for HTML content
    }
    

    async function getSummaryFromGeminiPro(content, apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
        // Assuming getMainContent is an async function
        const bodyText = await getMainContent(content);
    
        const prefix = "summarize this: ";
        const fullContent = prefix + bodyText;
    
        console.log(bodyText); // Debugging: Make sure this logs the expected text
    
        try {
            const result = await model.generateContent(fullContent);
            const response = await result.response;
            return await response.text(); // Ensure to await the text() call
        } catch (error) {
            console.error('Error generating summary:', error);
            throw new Error('Summary generation failed');
        }
    }
 
    function getApiKey() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get('apiKey', function(data) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(data.apiKey);
                }
            });
        });
    }
        
    function displaySummary(url, summary, container) {
        const summaryElement = document.createElement('div');
        summaryElement.innerHTML = `<b>Summary for ${url}:</b> ${summary}`;
        container.appendChild(summaryElement);
    }
    });
