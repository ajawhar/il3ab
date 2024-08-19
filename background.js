function sendMessageToActiveTab(retries = 3) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs && tabs.length > 0) {
      // Send a message to toggle the iframe
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

      // Send a message to the content script to check for selected text and copy it to the clipboard
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

// Listen for keyboard commands (e.g., Ctrl+Shift+F) to toggle the iframe and check for selection
chrome.commands.onCommand.addListener(function (command) {
  console.log("Command received:", command);
  if (command === "toggle-iframe") {
    sendMessageToActiveTab();
  }
});

// Ensure that data is saved before the extension closes or before a window or tab is removed
chrome.windows.onRemoved.addListener(() => {
  console.log("Window closed, ensuring content is saved...");
  chrome.storage.sync.get('iframeContent', function (data) {
    // Make sure the content is saved to both local and sync storage
    chrome.storage.local.set({ iframeContent: data.iframeContent }, function () {
      console.log("Content saved locally before window close");
    });
  });
});

chrome.tabs.onRemoved.addListener(() => {
  console.log("Tab closed, ensuring content is saved...");
  chrome.storage.sync.get('iframeContent', function (data) {
    chrome.storage.local.set({ iframeContent: data.iframeContent }, function () {
      console.log("Content saved locally before tab close");
    });
  });
});