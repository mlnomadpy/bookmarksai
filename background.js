chrome.offscreen.createDocument({
    url: chrome.runtime.getURL('offscreen.html'),
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: 'Parse HTML content for bookmarks',
});

// Use a debounce function for bookmark creation
let debounceTimer;
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (bookmark.url) openTab(bookmark.url);
    }, 500);
});

function openTab(url) {
    chrome.tabs.query({ url: url, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            chrome.tabs.create({ url: url, active: false }, (tab) => attachTabUpdateListener(tab.id, url));
        } else {
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




function getAllBookmarks() {
    return new Promise((resolve) => {
        chrome.bookmarks.getTree((bookmarkTreeNodes) => {
            const bookmarks = [];
            function traverse(node) {
                if (node.url) bookmarks.push(node);
                if (node.children) node.children.forEach(traverse);
            }
            bookmarkTreeNodes.forEach(traverse);
            resolve(bookmarks);
        });
    });
}

async function reloadAllBookmarks() {
    const allBookmarks = await getAllBookmarks();
    let successCount = 0;
    let failureCount = 0;

    for (const bookmark of allBookmarks) {
        if (bookmark.url) {
            try {
                await openTabAndCapture(bookmark.url);
                successCount++;
            } catch (error) {
                console.error(`Failed to reload bookmark: ${bookmark.url}`, error);
                failureCount++;
            }
        }
    }

    return { successCount, failureCount, total: allBookmarks.length };
}

function openTabAndCapture(url) {
    return new Promise((resolve, reject) => {
        chrome.tabs.create({ url: url, active: false }, (tab) => {
            const timeout = setTimeout(() => {
                chrome.tabs.remove(tab.id);
                reject(new Error(`Timeout loading page: ${url}`));
            }, 30000);

            function listener(tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    clearTimeout(timeout);
                    captureTabContent(tab.id, url)
                        .then((content) => {
                            storeHTMLAndTitle(url, content.html, content.title);
                            chrome.tabs.remove(tab.id);
                            resolve();
                        })
                        .catch((error) => {
                            chrome.tabs.remove(tab.id);
                            reject(error);
                        });
                }
            }
            chrome.tabs.onUpdated.addListener(listener);
        });
    });
}

function captureTabContent(tabId, url) {
    chrome.tabs.sendMessage(tabId, { action: "captureHTML" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Error capturing content:", chrome.runtime.lastError);
            storeHTMLAndTitle(url, "Error capturing content", "Error");
            return;
        }
        if (response && response.html) {
            // Send the captured HTML to the offscreen document for parsing
            chrome.runtime.sendMessage({
                action: "parseHTML",
                html: response.html,
                url: url,
                title: response.title || "No Title"
            });
        } else {
            console.error("Invalid response from content script");
            storeHTMLAndTitle(url, "Invalid response from content script", "Error");
        }
    });
}



function storeHTMLAndTitle(url, content, title) {
    chrome.storage.local.set({
        [url]: {
            html: content,
            title: title,
            summarized: false
        }
    }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error storing content for", url, ":", chrome.runtime.lastError.message);
        } else {
            console.log("Content and title stored successfully for", url);
        }
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reloadAllBookmarks") {
        reloadAllBookmarks().then((result) => {
            sendResponse({
                status: "Bookmarks reloading completed",
                successCount: result.successCount,
                failureCount: result.failureCount,
                total: result.total
            });
        }).catch((error) => {
            sendResponse({ status: "Error reloading bookmarks", error: error.message });
        });
        return true;
    }
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install" || details.reason === "update") {
        getAllBookmarks().then((bookmarks) => {
            bookmarks.forEach((bookmark) => {
                if (bookmark.url) {
                    storeHTMLAndTitle(bookmark.url, "", bookmark.title);
                }
            });
        });
    }
});

// Listen for messages from the offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "parsedHTML") {
        storeHTMLAndTitle(message.url, message.content, message.title);
    }
});

// Add this listener to handle bookmark creation
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
    if (bookmark.url) {
        openTab(bookmark.url);
    }
});
