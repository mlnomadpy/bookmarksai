chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "parseHTML") {
        const parser = new DOMParser();
        const doc = parser.parseFromString(message.html, 'text/html');
        const mainContent = doc.body ? (doc.body.textContent || doc.body.innerText || "") : "";
        const truncatedContent = mainContent.substring(0, 10000);

        chrome.runtime.sendMessage({
            action: "parsedHTML",
            url: message.url,
            content: truncatedContent,
            title: message.title
        });
    }
});