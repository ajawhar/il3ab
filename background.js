chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

function sendMessageToActiveTab(retries = 3) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs && tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggleIframe" }, function (response) {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError.message);
          if (retries > 0 && chrome.runtime.lastError.message.includes("Receiving end does not exist")) {
            console.log("Retrying...");
            setTimeout(() => sendMessageToActiveTab(retries - 1), 100);
          }
        } else {
          console.log("Message sent successfully, response:", response);
        }
      });

      // Send a message to check for selected text
      chrome.tabs.sendMessage(tabs[0].id, { action: "checkSelection" }, function (response) {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError.message);
        } else if (response && response.selectedText) {
          console.log("Text selection found:", response.selectedText);
        } else {
          console.log("No text selected.");
        }
      });
    } else {
      console.log("No active tab found. Retries left:", retries);
      if (retries > 0) {
        setTimeout(() => sendMessageToActiveTab(retries - 1), 100);
      } else {
        console.error("Failed to find active tab after retries");
      }
    }
  });
}

// Listen for keyboard commands
chrome.commands.onCommand.addListener(function (command) {
  if (command === "toggle-iframe") {
    sendMessageToActiveTab();
  }
});

// Ensure data is saved before extension closes
chrome.runtime.onSuspend.addListener(() => {
  console.log("Service worker is being suspended, saving data...");
  chrome.storage.sync.get('iframeContent', function (data) {
    chrome.storage.local.set({ iframeContent: data.iframeContent }, function () {
      console.log("Content saved locally before service worker suspend.");
    });
  });
});