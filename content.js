console.log("Content script loaded");

let iframe = null;

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("Message received in content script:", request);

  // Handle the toggleIframe action (unchanged)
  if (request.action === "toggleIframe") {
    try {
      if (iframe) {
        // Save content before removing the iframe
        saveContentBeforeClose(function () {
          document.body.removeChild(iframe);
          iframe = null;
          sendResponse({ status: "Iframe removed and content saved successfully" });
        });
      } else {
        iframe = document.createElement('iframe');
        iframe.src = chrome.runtime.getURL('iframe.html');
        iframe.style.cssText = `
          position: fixed;
          top: 30%;
          left: 50%;
          width: 500px;
          height: 300px;
          z-index: 10000;
          border: none;
          transform: translate(-50%, -50%);
          border-radius: 15px;
          overflow: hidden;
          background-color: rgba(0, 0, 0, 0.5);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5); /* Stronger shadow with more blur */
        `;
        document.body.appendChild(iframe);

        // Post a message to the iframe to focus the textarea after loading
        iframe.onload = function () {
          iframe.contentWindow.postMessage({ action: 'focusEditor' }, '*');
        };
        sendResponse({ status: "Iframe created successfully" });
      }
    } catch (error) {
      console.error("Error toggling iframe:", error);
      sendResponse({ status: "Error", error: error.toString() });
    }
  }

  // Handle the checkSelection action
  if (request.action === "checkSelection") {
    const selectedText = window.getSelection().toString();  // Get the selected text
    const pageUrl = window.location.href;  // Get the URL of the current page

    if (selectedText) {
      const contentToCopy = `Selected Text: ${selectedText}\nSource URL: ${pageUrl}`;

      // Perform the clipboard operation
      navigator.clipboard.writeText(contentToCopy).then(() => {
        console.log("Text and URL copied to clipboard:", contentToCopy);
        sendResponse({ selectedText: selectedText, pageUrl: pageUrl });
      }).catch(err => {
        console.error("Failed to copy text:", err);
        sendResponse({ selectedText: null });
      });
    } else {
      console.log("No text selected.");
      sendResponse({ selectedText: null });
    }
  }

  return true;  // Indicates that we will send a response asynchronously
});

// Function to explicitly save content before closing or toggling iframe
function saveContentBeforeClose(callback) {
  chrome.storage.sync.get('iframeContent', function (data) {
    chrome.storage.local.set({ iframeContent: data.iframeContent }, function () {
      console.log("Content saved before closing the iframe");
      if (callback) callback();  // Proceed to the next step (e.g., closing the iframe)
    });
  });
}