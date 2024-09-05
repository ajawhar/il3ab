console.log("Content script loaded");

let iframe;
let isDragging = false;
let startX, startY;

// Function to create and append the iframe
function createIframe() {
  const headerHeight = '20px';
  const backgroundColor = 'rgb(30 30 30 / 95%)'; // Semi-transparent background
  const hoverBackgroundColor = 'rgb(15 15 15 / 100%)'; // Darker on hover and drag

  // Create a container for the iframe
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.width = '500px';
  container.style.height = '300px';
  container.style.border = 'none';
  container.style.zIndex = '9999';
  container.style.backgroundColor = backgroundColor;
  container.style.borderRadius = '10px';
  container.style.overflow = 'hidden';
  container.style.boxShadow = '0 6px 10px rgba(0, 0, 0, 0.2)';
  
  // Create a draggable header
  const header = document.createElement('div');
  header.style.height = headerHeight;
  header.style.cursor = 'move';
  header.style.padding = '2px 5px';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  // Create storage info element
  const storageInfo = document.createElement('div');
  storageInfo.style.fontSize = '10px';
  storageInfo.style.color = 'white';
  storageInfo.style.marginLeft = 'auto'; // Push to the right
  storageInfo.style.marginRight = '5px';

  // Function to update storage info
  function updateStorageInfo() {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      const totalBytes = chrome.storage.local.QUOTA_BYTES;
      const usedPercentage = ((bytesInUse / totalBytes) * 100).toFixed(2);
      const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
      
      storageInfo.textContent = `${usedPercentage}% of ${totalMB}MB`;
    });
  }

  // Initial update and set interval for periodic updates
  updateStorageInfo();
  setInterval(updateStorageInfo, 5000); // Update every 5 seconds

  // Append storage info to header
  header.appendChild(storageInfo);

  // Add hover effect only for the header
  header.addEventListener('mouseenter', () => {
    header.style.backgroundColor = hoverBackgroundColor; // Darker on hover
  });

  header.addEventListener('mouseleave', () => {
    if (!isDragging) {
      header.style.backgroundColor = 'transparent';
    }
  });

  // Update header color when dragging starts and ends
  const originalStartDragging = startDragging;
  startDragging = (e) => {
    originalStartDragging(e);
    header.style.backgroundColor = hoverBackgroundColor; // Use hover background when dragging
  };

  const originalStopDragging = stopDragging;
  stopDragging = () => {
    originalStopDragging();
    header.style.backgroundColor = 'transparent';
  };

  // Create the iframe
  iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('iframe.html');
  iframe.style.width = '100%';
  iframe.style.height = `calc(100% - ${headerHeight})`; // Use the variable here
  iframe.style.border = 'none';
  iframe.style.backgroundColor = 'transparent';

  // Append elements
  container.appendChild(header);
  container.appendChild(iframe);
  document.body.appendChild(container);

  // Retrieve the last saved position
  chrome.storage.local.get(['iframeX', 'iframeY'], function(result) {
    container.style.left = (result.iframeX || '20') + 'px';
    container.style.top = (result.iframeY || '20') + 'px';
  });

  // Add event listeners for dragging
  header.addEventListener('mousedown', startDragging);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDragging);

  // Store the container reference
  iframe.container = container;
}

let lastUsedPercentage = -1; // Initialize with an impossible value

function startDragging(e) {
  isDragging = true;
  startX = e.clientX - iframe.container.offsetLeft;
  startY = e.clientY - iframe.container.offsetTop;
  document.addEventListener('selectstart', preventDefault);
}

function drag(e) {
  if (isDragging) {
    const newX = e.clientX - startX;
    const newY = e.clientY - startY;
    iframe.container.style.left = newX + 'px';
    iframe.container.style.top = newY + 'px';
    e.preventDefault(); // Prevent any default behavior during drag
  }
}

function stopDragging() {
  if (isDragging) {
    isDragging = false;
    document.removeEventListener('selectstart', preventDefault);
    // Save the new position
    chrome.storage.local.set({
      iframeX: parseInt(iframe.container.style.left),
      iframeY: parseInt(iframe.container.style.top)
    });
    // Notify the background script about the position change
    chrome.runtime.sendMessage({
      action: "updatePosition",
      x: parseInt(iframe.container.style.left),
      y: parseInt(iframe.container.style.top)
    });
  }
}

function preventDefault(e) {
  e.preventDefault();
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("Message received in content script:", request);

  // Handle the toggleIframe action (unchanged)
  if (request.action === "toggleIframe") {
    try {
      if (iframe) {
        // Save content before removing the iframe
        saveContentBeforeClose(function () {
          document.body.removeChild(iframe.container);
          iframe = null;
          sendResponse({ status: "Iframe removed and content saved successfully" });
        });
      } else {
        createIframe();
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
      const contentToCopy = `${selectedText}\n${pageUrl}\n`;

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

// Set up a MutationObserver to watch for changes in storage
const observer = new MutationObserver(updateStorageInfo);
observer.observe(document.body, { subtree: true, childList: true, characterData: true });

// Also update when the window gets focus
window.addEventListener('focus', updateStorageInfo);