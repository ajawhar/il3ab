console.log("Content script loaded");

let iframe = null;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Message received in content script:", request);
  if (request.action === "toggleIframe") {
    try {
      if (iframe) {
        document.body.removeChild(iframe);
        iframe = null;
      } else {
        iframe = document.createElement('iframe');
        iframe.src = chrome.runtime.getURL('iframe.html');
        iframe.style.cssText = `
          position: fixed;
          top: 50%;
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

        // Append the iframe to the document
        document.body.appendChild(iframe);

        // Post a message to the iframe to focus the textarea after loading
        iframe.onload = function() {
          iframe.contentWindow.postMessage({ action: 'focusEditor' }, '*');
        };
      }
      sendResponse({status: "Iframe toggled successfully"});
    } catch (error) {
      console.error("Error toggling iframe:", error);
      sendResponse({status: "Error", error: error.toString()});
    }
  }
  return true;  // Indicates that we will send a response asynchronously
});