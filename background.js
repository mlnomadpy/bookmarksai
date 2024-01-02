chrome.bookmarks.onCreated.addListener(function (id, bookmark) {
    if (bookmark.url) {
        openTab(bookmark.url);
    }
});

function openTab(url) {
    chrome.tabs.query({ url: url, currentWindow: true }, function (tabs) {
        if (tabs.length === 0) {
            // No existing tab with this URL found, create a new one
            chrome.tabs.create({ url: url, active: false }, function (tab) {
                attachTabUpdateListener(tab.id, url);
            });
        } else {
            // Tab already exists, use the first one found
            attachTabUpdateListener(tabs[0].id, url);
        }
    });
}

function attachTabUpdateListener(tabId, url) {
    function updatedTabListener(updatedTabId, changeInfo) {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(updatedTabListener);
            captureTabContent(tabId, url);
        }
    }
    chrome.tabs.onUpdated.addListener(updatedTabListener);
}

function captureTabContent(tabId, url) {
    chrome.tabs.sendMessage(tabId, { action: "captureHTML" }, function (response) {
        if (chrome.runtime.lastError || !response) {
            console.error("Error capturing HTML from", url, ":", chrome.runtime.lastError?.message);
        } else {
            storeHTML(url, response.html);
        }
        chrome.tabs.remove(tabId);
    });
}

function storeHTML(url, htmlContent) {
    chrome.storage.local.set({ [url]: htmlContent }, function() {
        if (chrome.runtime.lastError) {
            console.error("Error storing HTML content for", url, ":", chrome.runtime.lastError.message);
        } else {
            console.log("HTML content stored successfully for", url);
        }
    });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "storeHTML") {
        storeHTML(sender.tab.url, request.html);
        sendResponse({ status: "HTML stored successfully" });
    }
});
