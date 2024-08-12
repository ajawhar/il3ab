function sendMessageToActiveTab(retries = 3) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "toggleIframe"}, function(response) {
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

chrome.commands.onCommand.addListener(function(command) {
  console.log("Command received:", command);
  if (command === "toggle-iframe") {
    sendMessageToActiveTab();
  }
});