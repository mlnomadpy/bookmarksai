function captureHTML(timeout = 5000) {
    return new Promise((resolve, reject) => {
        const captureContent = () => ({
            html: document.documentElement.outerHTML,
            title: document.title
        });
        console.log(captureContent);
        if (document.readyState === "complete") {
            resolve(captureContent());
            return;
        }

        const timer = setTimeout(() => {
            reject(new Error("Timeout waiting for document to load"));
        }, timeout);

        document.addEventListener('readystatechange', function listener() {
            if (document.readyState === "complete") {
                document.removeEventListener('readystatechange', listener);
                clearTimeout(timer);
                resolve(captureContent());
            }
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureHTML") {
        captureHTML()
            .then(content => sendResponse(content))
            .catch(error => {
                console.error("Error capturing HTML:", error);
                sendResponse({ error: error.message });
            });
        return true; // Indicates that the response is sent asynchronously
    }
});

// Optional: Add a check to re-capture the HTML if the initial attempt was made too early
document.addEventListener('readystatechange', () => {
    if (document.readyState === "complete") {
        chrome.runtime.sendMessage({ action: "retryCapture" });
    }
});