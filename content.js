function captureHTML() {
    // Check if the document is fully loaded
    if (document.readyState === "complete") {
        // Capture the HTML of the current document
        return document.documentElement.outerHTML;
    } else {
        // If the document is not fully loaded, return an error message
        return null;
    }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "captureHTML") {
        try {
            let htmlContent = captureHTML();
            if (htmlContent) {
                // Send the HTML content back to the background script
                sendResponse({ html: htmlContent });
            } else {
                console.error("Document is not fully loaded.");
                sendResponse({ error: "Document is not fully loaded." });
            }
        } catch (error) {
            console.error("Error capturing HTML:", error);
            sendResponse({ error: "Error capturing HTML." });
        }
    }
});

// Optional: Add a check to re-capture the HTML if the initial attempt was made too early
document.addEventListener('readystatechange', function() {
    if (document.readyState === "complete") {
        // Trigger capturing of HTML again if needed
        chrome.runtime.sendMessage({ action: "retryCapture" });
    }
});
