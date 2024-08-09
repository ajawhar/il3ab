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
        iframe.style.cssText = 'position:fixed;top:10%;left:10%;width:300px;height:200px;z-index:10000;border:1px solid black;background-color:white;';

        // Add onload event listener to focus on the iframe's textarea
        iframe.onload = function() {
          iframe.contentWindow.document.getElementById('editor').focus();
        };

        document.body.appendChild(iframe);
      }
      sendResponse({status: "Iframe toggled successfully"});
    } catch (error) {
      console.error("Error toggling iframe:", error);
      sendResponse({status: "Error", error: error.toString()});
    }
  }
  return true;  // Indicates that we will send a response asynchronously
});