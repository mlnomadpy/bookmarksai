import { GoogleGenerativeAI } from "@google/generative-ai";
import { Readability } from "@mozilla/readability";
import { marked } from 'marked';
import * as DOMPurify from 'dompurify';

marked.setOptions({
    sanitize: true,
    sanitizer: function (html) {
        return DOMPurify.sanitize(html);
    }
});


document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const apiKeyInput = document.getElementById('apiKey');
    const saveApiKeyButton = document.getElementById('saveApiKey');
    const summarizeButton = document.getElementById('summarizeButton');
    const viewToggle = document.querySelectorAll('input[name="viewMode"]');
    const backupButton = document.getElementById('backupButton');
    const loadBackupButton = document.getElementById('loadBackupButton');
    const loadBackupInput = document.getElementById('loadBackupInput');
    const reloadAllBookmarksButton = document.getElementById('reloadAllBookmarksButton');
    const cleanAllBookmarksButton = document.getElementById('cleanAllBookmarksButton');
    const customPromptInput = document.getElementById('customPrompt');
    const predefinedPromptsSelect = document.getElementById('predefinedPrompts');
    const saveCustomPromptButton = document.getElementById('saveCustomPrompt');
    const deleteCustomPromptButton = document.getElementById('deleteCustomPrompt');

    // Load saved custom prompts
    loadCustomPrompts();
    // Event listeners for custom prompt actions
    saveCustomPromptButton.addEventListener('click', saveCustomPrompt);
    deleteCustomPromptButton.addEventListener('click', deleteCustomPrompt);
    predefinedPromptsSelect.addEventListener('change', handlePredefinedPromptChange);

    let currentPage = 1;
    let allItems = [];

    let searchTimeout;

    // Load saved API key
    chrome.storage.sync.get('apiKey', function (data) {
        if (data.apiKey) {
            apiKeyInput.value = data.apiKey;
        }
    });

    // Save the API key
    saveApiKeyButton.addEventListener('click', function () {
        chrome.storage.sync.set({ 'apiKey': apiKeyInput.value }, function () {
            alert('API Key saved');
        });
    });

    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();

        if (query.length > 2) {
            searchTimeout = setTimeout(() => performSearch(query), 300);
        } else {
            searchResults.innerHTML = '';
        }
    });

    backupButton.addEventListener('click', backupBookmarks);
    loadBackupButton.addEventListener('click', function() {
        loadBackupInput.click();
    });
    loadBackupInput.addEventListener('change', loadBackup);

    viewToggle.forEach(radio => {
        radio.addEventListener('change', function () {
            const view = this.value;
            searchResults.className = view === 'list' ? 'list-view' : 'card-view';
            renderResults();
        });
    });

    reloadAllBookmarksButton.addEventListener('click', function () {
        updateButtonState(reloadAllBookmarksButton, true);

        chrome.runtime.sendMessage({ action: "reloadAllBookmarks" }, function (response) {
            updateButtonState(reloadAllBookmarksButton, false);

            if (response.status === "Bookmarks reloading completed") {
                alert(`Bookmark reloading completed:\n
                    Successfully reloaded: ${response.successCount}\n
                    Failed to reload: ${response.failureCount}\n
                    Total bookmarks: ${response.total}`);
            } else {
                alert('Error reloading bookmarks: ' + response.error);
            }
        });
    });

    cleanAllBookmarksButton.addEventListener('click', function () {
        if (confirm('Are you sure you want to clean all stored bookmarks? This action cannot be undone.')) {
            cleanAllBookmarks();
        }
    });

    function loadCustomPrompts() {
        chrome.storage.sync.get('customPrompts', function(data) {
            const customPrompts = data.customPrompts || [];
            customPrompts.forEach(prompt => {
                const option = document.createElement('option');
                option.value = prompt;
                option.textContent = prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '');
                predefinedPromptsSelect.appendChild(option);
            });
        });
    }

    function saveCustomPrompt() {
        const newPrompt = customPromptInput.value.trim();
        if (newPrompt) {
            chrome.storage.sync.get('customPrompts', function(data) {
                const customPrompts = data.customPrompts || [];
                if (!customPrompts.includes(newPrompt)) {
                    customPrompts.push(newPrompt);
                    chrome.storage.sync.set({ customPrompts: customPrompts }, function() {
                        const option = document.createElement('option');
                        option.value = newPrompt;
                        option.textContent = newPrompt.substring(0, 30) + (newPrompt.length > 30 ? '...' : '');
                        predefinedPromptsSelect.appendChild(option);
                        customPromptInput.value = '';
                        alert('Custom prompt saved successfully!');
                    });
                } else {
                    alert('This prompt already exists!');
                }
            });
        }
    }

    function deleteCustomPrompt() {
        const selectedPrompt = predefinedPromptsSelect.value;
        if (selectedPrompt && confirm('Are you sure you want to delete this custom prompt?')) {
            chrome.storage.sync.get('customPrompts', function(data) {
                let customPrompts = data.customPrompts || [];
                customPrompts = customPrompts.filter(prompt => prompt !== selectedPrompt);
                chrome.storage.sync.set({ customPrompts: customPrompts }, function() {
                    predefinedPromptsSelect.remove(predefinedPromptsSelect.selectedIndex);
                    customPromptInput.value = '';
                    alert('Custom prompt deleted successfully!');
                });
            });
        }
    }

    function handlePredefinedPromptChange() {
        const selectedPrompt = predefinedPromptsSelect.value;
        customPromptInput.value = selectedPrompt;
    }

    async function cleanAllBookmarks() {
        try {
            await chrome.storage.local.clear();
            alert('All stored bookmarks have been cleaned successfully.');
            // Optionally, refresh the search results or page here
            searchResults.innerHTML = '';
            allItems = {};
        } catch (error) {
            console.error('Error cleaning bookmarks:', error);
            alert('An error occurred while cleaning bookmarks. Please try again.');
        }
    }
    function updateButtonState(button, isLoading) {
        button.disabled = isLoading;
        const icon = button.querySelector('i');
        if (isLoading) {
            icon.classList.add('fa-spin');
        } else {
            icon.classList.remove('fa-spin');
        }
    }


    // Consolidated API interaction
    async function callGeminiPro(prompt, apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        try {
            const result = await model.generateContent(prompt);
            return await result.response.text();
        } catch (error) {
            console.error('Error calling Gemini Pro:', error);
            throw error;
        }
    }

    // Simplified tag generation
    async function generateTags(summary, apiKey) {
        const prompt = `Based on the following summary, generate 3-5 relevant tags (single words or short phrases) that categorize the content. Separate the tags with commas:\n\n${summary}`;
        try {
            const tags = await callGeminiPro(prompt, apiKey);
            return tags.split(',').map(tag => tag.trim());
        } catch (error) {
            console.error('Error generating tags:', error);
            return [];
        }
    }

    function extractTextFromHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }

    // Simplified citation generation
    async function generateCitation(htmlContent, url, title, apiKey) {
        const textContent = extractTextFromHTML(htmlContent);
        const limitedContent = textContent.substring(0, 2000);
        const prompt = `Based on the following content from a web page, generate a BibTeX citation. Use the information available in the content to fill in as many fields as possible (e.g., author, date, publisher). If information is not available, omit those fields.

Title: ${title}
URL: ${url}
Access Date: ${new Date().toISOString().split('T')[0]}
Content: ${limitedContent}

Please provide only the BibTeX entry, without any additional text.`;

        try {
            return await callGeminiPro(prompt, apiKey);
        } catch (error) {
            console.error('Error generating citation:', error);
            return `@misc{${title.replace(/\s/g, '')},
  title = {${title}},
  url = {${url}},
  note = {Accessed: ${new Date().toISOString().split('T')[0]}}
}`;
        }
    }

    // Simplified summary generation
    async function generateSummary(htmlContent, url, title, existingTags = null, existingCitation = null) {
        const apiKey = await getApiKey();
        const textContent = extractTextFromHTML(htmlContent);
        const limitedContent = textContent.substring(0, 2000);
        const prompt = "Summarize this content in a short paragraph: " + limitedContent;

        try {
            const summary = await callGeminiPro(prompt, apiKey);
            const tags = existingTags || await generateTags(summary, apiKey);
            const citation = existingCitation || await generateCitation(htmlContent, url, title, apiKey);
            return { summary, tags, citation };
        } catch (error) {
            console.error('Error generating summary:', error);
            return {
                summary: "Error generating summary",
                tags: existingTags || [],
                citation: existingCitation || await generateCitation(htmlContent, url, title, apiKey)
            };
        }
    }

    async function performSearch(query) {
        searchResults.innerHTML = '';
        searchResults.textContent = 'Searching...';

        allItems = await chrome.storage.local.get(null);
        renderResults(query);
    }


    function renderResults(query = '') {
        searchResults.innerHTML = '';
        const lowerQuery = query.toLowerCase();

        const matchingItems = Object.entries(allItems)
            .filter(([url, item]) => {
                const titleMatch = item.title && item.title.toLowerCase().includes(lowerQuery);
                const tagMatch = item.tags && Array.isArray(item.tags) && item.tags.some(tag => tag && tag.toLowerCase().includes(lowerQuery));
                const contentMatch = item.html && item.html.toLowerCase().includes(lowerQuery);
                const summaryMatch = item.summary && item.summary.toLowerCase().includes(lowerQuery);
                return titleMatch || tagMatch || contentMatch || summaryMatch;
            });

        if (matchingItems.length === 0) {
            searchResults.textContent = 'No matches found.';
            return;
        }

        matchingItems.forEach(([url, item]) => {
            appendResult(
                url,
                item.title || 'No Title',
                item.summarized ? item.summary : item.summary,
                item.tags,
                item.citation
            );
        });
    }


    async function getMainContent(htmlContent) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        const readability = new Readability(doc);
        const article = readability.parse();

        return article.textContent;
    }

    summarizeButton.addEventListener('click', function () {
        const customPrompt = document.getElementById('customPrompt').value;
        const predefinedPrompt = document.getElementById('predefinedPrompts').value;
        const prompt = customPrompt || predefinedPrompt;

        const treatment = document.querySelector('input[name="pageTreatment"]:checked').value;
        summarizeSelectedPages(prompt, treatment);
    });

    function appendResult(url, title, summary, tags = [], citation = '') {
        const resultElement = document.createElement('div');
        resultElement.className = 'result';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = url;
        resultElement.appendChild(checkbox);

        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        resultElement.appendChild(titleElement);

        const detailsElement = document.createElement('div');
        detailsElement.className = 'details';
        detailsElement.style.display = 'none';

        const urlElement = document.createElement('a');
        urlElement.href = url;
        urlElement.textContent = url;
        urlElement.target = '_blank';
        detailsElement.appendChild(urlElement);

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';

        const summaryToggle = document.createElement('button');
        summaryToggle.className = 'icon-button';
        summaryToggle.innerHTML = '<i class="fas fa-align-left"></i>';
        summaryToggle.title = 'Toggle Summary';
        buttonGroup.appendChild(summaryToggle);

        const citationToggle = document.createElement('button');
        citationToggle.className = 'icon-button';
        citationToggle.innerHTML = '<i class="fas fa-quote-right"></i>';
        citationToggle.title = 'Toggle Citation';
        buttonGroup.appendChild(citationToggle);

        detailsElement.appendChild(buttonGroup);

        const summaryElement = document.createElement('p');
        summaryElement.textContent = summary || 'Loading summary...';
        summaryElement.style.display = 'none';
        detailsElement.appendChild(summaryElement);

        const citationElement = document.createElement('pre');
        citationElement.className = 'citation';
        citationElement.textContent = citation;
        citationElement.style.display = 'none';
        detailsElement.appendChild(citationElement);

        const tagsElement = document.createElement('div');
        tagsElement.className = 'tags';
        tagsElement.innerHTML = tags.map(tag => `<span class="tag">${tag}</span>`).join(' ');
        detailsElement.appendChild(tagsElement);

        summaryToggle.addEventListener('click', async () => {
            if (!summary) {
                try {
                    const item = await chrome.storage.local.get(url);
                    if (!item[url].summarized) {
                        summaryElement.textContent = 'Generating summary...';
                        summaryElement.style.display = 'block';
                        const { summary: generatedSummary } = await generateSummary(item[url].html, url, item[url].title);
                        item[url].summary = generatedSummary;
                        item[url].summarized = true;
                        await chrome.storage.local.set({ [url]: item[url] });
                        summaryElement.textContent = generatedSummary;
                    } else {
                        summaryElement.textContent = item[url].summary;
                    }
                    summary = item[url].summary;
                } catch (error) {
                    console.error('Error generating or retrieving summary:', error);
                    summaryElement.textContent = 'Error generating summary';
                }
            }
            summaryElement.style.display = summaryElement.style.display === 'none' ? 'block' : 'none';
        });

        citationToggle.addEventListener('click', () => {
            citationElement.style.display = citationElement.style.display === 'none' ? 'block' : 'none';
        });

        const toggleDetails = document.createElement('button');
        toggleDetails.className = 'icon-button toggle-details';
        toggleDetails.innerHTML = '<i class="fas fa-chevron-down"></i>';
        toggleDetails.title = 'Toggle Details';
        toggleDetails.addEventListener('click', async () => {
            if (detailsElement.style.display === 'none') {
                const item = await chrome.storage.local.get(url);
                if (!item[url] || !item[url].html) {
                    try {
                        const capturedContent = await captureHTML(url);
                        await chrome.storage.local.set({
                            [url]: {
                                ...item[url],
                                html: capturedContent.html,
                                title: capturedContent.title || title
                            }
                        });
                        console.log('HTML captured and stored for', url);
                    } catch (error) {
                        console.error('Error capturing HTML:', error);
                    }
                }
                toggleDetails.innerHTML = '<i class="fas fa-chevron-up"></i>';
            } else {
                toggleDetails.innerHTML = '<i class="fas fa-chevron-down"></i>';
            }
            detailsElement.style.display = detailsElement.style.display === 'none' ? 'block' : 'none';
        });
        resultElement.appendChild(toggleDetails);
    
        resultElement.appendChild(detailsElement);
        searchResults.appendChild(resultElement);
    }
// Add this new function to capture HTML
async function captureHTML(url) {
    return new Promise((resolve, reject) => {
        chrome.tabs.create({ url: url, active: false }, (tab) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                if (tabId === tab.id && info.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    chrome.tabs.sendMessage(tab.id, { action: "captureHTML" }, (response) => {
                        chrome.tabs.remove(tab.id);
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else if (response && response.html) {
                            resolve(response);
                        } else {
                            reject(new Error('Failed to capture HTML'));
                        }
                    });
                }
            });
        });
    });
}

    searchResults.addEventListener('scroll', () => {
        if (searchResults.scrollTop + searchResults.clientHeight >= searchResults.scrollHeight - 20) {
            currentPage++;
            renderResults();
        }
    });

    async function summarizeSelectedPages(prompt, treatment) {
        const selectedURLs = Array.from(searchResults.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);

        if (selectedURLs.length === 0) {
            alert('Please select at least one page to process.');
            return;
        }

        const summariesContainer = document.getElementById('summaries');
        summariesContainer.innerHTML = 'Processing...';

        const apiKey = await getApiKey();
        let summarizedContent = treatment === 'combine' ? '' : [];

        for (const url of selectedURLs) {
            try {
                const content = await getContentFromStorage(url);
                const bodyText = await getMainContent(content);
                const summary = await callGeminiPro("summarize this: " + bodyText, apiKey);

                if (treatment === 'combine') {
                    summarizedContent += `Article from ${url}: ${summary}\n\n`;
                } else {
                    summarizedContent.push({ url, summary });
                }
            } catch (error) {
                console.error('Error summarizing content:', error);
                summariesContainer.innerHTML += `<div>Error occurred while processing ${url}.</div>`;
            }
        }

        if (treatment === 'combine') {
            try {
                const finalSummary = await callGeminiPro(prompt + summarizedContent, apiKey);
                displaySummary('Combined Content', finalSummary, summariesContainer);
            } catch (error) {
                console.error('Error in final processing:', error);
                summariesContainer.innerHTML += `<div>Error occurred while processing combined content.</div>`;
            }
        } else {
            for (const { url, summary } of summarizedContent) {
                try {
                    const finalSummary = await callGeminiPro(prompt + summary, apiKey);
                    displaySummary(url, finalSummary, summariesContainer);
                } catch (error) {
                    console.error('Error in final processing for url:', url, error);
                    summariesContainer.innerHTML += `<div>Error occurred while processing summary for ${url}.</div>`;
                }
            }
        }
    }

    function getContentFromStorage(url) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(url, function (items) {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(items[url].html);
            });
        });
    }

    function getApiKey() {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get('apiKey', function (data) {
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
        summaryElement.innerHTML = `<b>Processing for ${url}:</b> ${marked(summary)}`;
        container.appendChild(summaryElement);
    }

    async function backupBookmarks() {
        try {
            const items = await chrome.storage.local.get(null);
            const backup = JSON.stringify(items);
            const blob = new Blob([backup], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bookmarks_backup.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error backing up bookmarks:', error);
            alert('Error backing up bookmarks. Please try again.');
        }
    }

    async function loadBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const backup = JSON.parse(e.target.result);
                await chrome.storage.local.clear();
                await chrome.storage.local.set(backup);
                alert('Bookmarks restored successfully!');
                // Optionally, refresh the search results or page here
            } catch (error) {
                console.error('Error loading backup:', error);
                alert('Error loading backup. Please make sure the file is valid.');
            }
        };
        reader.readAsText(file);
    }
});