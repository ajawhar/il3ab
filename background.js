chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

// Central hub for real-time sync across all tabs/windows
let lastChecked = 0;
let isProcessingShortcut = false; // Prevent multiple shortcut triggers
let pollInterval = null; // Store interval reference for cleanup

// Initialize polling with proper cleanup
function startPolling() {
  // Clear any existing interval first
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  
  // Poll storage for updates every 50ms (reduced from 100ms)
  pollInterval = setInterval(() => {
    chrome.storage.local.get(['lastUpdate', 'content', 'sessionId'], (result) => {
      if (result.lastUpdate && result.lastUpdate > lastChecked) {
        console.log('Broadcasting update to all tabs');
        // Broadcast to ALL tabs across ALL windows
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'updateContent',
              content: result.content,
              sessionId: result.sessionId
            }).catch(() => {
              // Ignore errors for tabs that can't receive messages
            });
          });
        });
        lastChecked = result.lastUpdate;
      }
    });
  }, 50); // Reduced from 100ms to 50ms
}

// Cleanup function to stop polling
function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('Polling stopped - memory leak prevented');
  }
}

// Start polling when extension loads
startPolling();

function sendMessageToActiveTab(retries = 3) {
  // Prevent multiple simultaneous shortcut triggers
  if (isProcessingShortcut) {
    console.log("Shortcut already being processed, ignoring...");
    return;
  }
  
  isProcessingShortcut = true;
  
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs && tabs.length > 0) {
      const tab = tabs[0];
      
      // Check if the tab is ready to receive messages
      chrome.tabs.sendMessage(tab.id, { action: "ping" }, function (response) {
        if (chrome.runtime.lastError) {
          console.log("Content script not ready yet, injecting...");
          // Inject content script if not ready
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          }, () => {
            // Wait a bit then try again
            setTimeout(() => {
              isProcessingShortcut = false; // Reset flag
              sendMessageToActiveTab(retries);
            }, 200);
          });
          return;
        }
        
        // Content script is ready, send the actual message
        chrome.tabs.sendMessage(tab.id, { action: "toggleIframe" }, function (response) {
          isProcessingShortcut = false; // Reset flag after processing
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError.message);
            if (retries > 0) {
              console.log("Retrying...");
              setTimeout(() => sendMessageToActiveTab(retries - 1), 100);
            }
          } else {
            console.log("Message sent successfully, response:", response);
          }
        });

        // Send a message to check for selected text
        chrome.tabs.sendMessage(tab.id, { action: "checkSelection" }, function (response) {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError.message);
          } else if (response && response.selectedText) {
            console.log("Text selection found:", response.selectedText);
          } else {
            console.log("No text selected.");
          }
        });
      });
    } else {
      console.log("No active tab found. Retries left:", retries);
      isProcessingShortcut = false; // Reset flag
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
    console.log("Keyboard shortcut triggered");
    if (isProcessingShortcut) {
      console.log("Shortcut already being processed, ignoring...");
      return;
    }
    sendMessageToActiveTab();
  }
});

// Enhanced data saving with better error handling and cleanup
chrome.runtime.onSuspend.addListener(() => {
  console.log("Service worker is being suspended, cleaning up...");
  
  // 🛑 CRITICAL: Clean up all listeners to prevent memory leaks
  stopPolling();
  cleanupStorageListener();
  cleanupRuntimeMessageListener();
  
  // Save to both local and sync storage for redundancy
  chrome.storage.sync.get('iframeContent', function (syncData) {
    if (chrome.runtime.lastError) {
      console.error("Error getting sync data:", chrome.runtime.lastError);
      // Try to get from local storage as fallback
      chrome.storage.local.get('iframeContent', function (localData) {
        if (localData.iframeContent) {
          chrome.storage.local.set({ iframeContent: localData.iframeContent }, function () {
            console.log("Content saved locally before service worker suspend.");
          });
        }
      });
    } else {
      // Save sync data to local as backup
      chrome.storage.local.set({ iframeContent: syncData.iframeContent }, function () {
        console.log("Content saved locally before service worker suspend.");
      });
    }
  });
});

// Also cleanup when extension is unloaded
chrome.runtime.onStartup.addListener(() => {
  console.log("Extension starting up, initializing clean state...");
  // Reset all references to ensure clean state
  pollInterval = null;
  storageListener = null;
  runtimeMessageListener = null;
  isProcessingShortcut = false;
  lastChecked = 0;
});

let lastActiveTabId = null;
let iframePosition = { x: 20, y: 20 };

chrome.tabs.onActivated.addListener(function(activeInfo) {
  lastActiveTabId = activeInfo.tabId;
});

// Store runtime message listener reference for cleanup
let runtimeMessageListener = null;

function setupRuntimeMessageListener() {
  // Remove existing listener if any
  if (runtimeMessageListener) {
    chrome.runtime.onMessage.removeListener(runtimeMessageListener);
  }
  
  runtimeMessageListener = function(request, sender, sendResponse) {
    if (request.action === "updatePosition") {
      iframePosition = { x: request.x, y: request.y };
      // Update the position for the current tab
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.storage.local.set({
            [tabs[0].id]: iframePosition
          });
        }
      });
    }
    
    // Handle save content requests
    if (request.action === "saveContent") {
      // This will be handled by the iframe directly
      sendResponse({ status: "Save request received" });
    }

    // Handle broadcast update requests
    if (request.action === "broadcastUpdate") {
      console.log('Broadcasting update from tab:', sender.tab.id);
      // Broadcast to all other tabs immediately
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id !== sender.tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'updateContent',
              content: request.content,
              sessionId: request.sessionId
            }).catch(() => {
              // Ignore errors for tabs that can't receive messages
            });
          }
        });
      });
      sendResponse({ status: "Update broadcasted" });
    }
  };
  
  chrome.runtime.onMessage.addListener(runtimeMessageListener);
}

// Cleanup function for runtime message listener
function cleanupRuntimeMessageListener() {
  if (runtimeMessageListener) {
    chrome.runtime.onMessage.removeListener(runtimeMessageListener);
    runtimeMessageListener = null;
    console.log('Runtime message listener removed - memory leak prevented');
  }
}

// Setup runtime message listener when extension loads
setupRuntimeMessageListener();

chrome.tabs.onCreated.addListener(function(tab) {
  if (lastActiveTabId) {
    // Get the position from the last active tab
    chrome.storage.local.get([lastActiveTabId.toString()], function(result) {
      if (result[lastActiveTabId]) {
        // Set the position for the new tab
        chrome.storage.local.set({
          [tab.id]: result[lastActiveTabId]
        });
      }
    });
  }
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "updateContent" });
        }
    });
});

// Store storage listener reference for cleanup
let storageListener = null;

// Monitor storage changes for sync status
function setupStorageListener() {
  // Remove existing listener if any
  if (storageListener) {
    chrome.storage.onChanged.removeListener(storageListener);
  }
  
  storageListener = function(changes, namespace) {
    if (namespace === 'sync' && changes.iframeContent) {
      console.log('Content synced across tabs/windows');
    }
    
    if (namespace === 'local' && changes.iframeContent) {
      console.log('Content saved locally');
    }
  };
  
  chrome.storage.onChanged.addListener(storageListener);
}

// Cleanup function for storage listener
function cleanupStorageListener() {
  if (storageListener) {
    chrome.storage.onChanged.removeListener(storageListener);
    storageListener = null;
    console.log('Storage listener removed - memory leak prevented');
  }
}

// Setup storage listener when extension loads
setupStorageListener();
