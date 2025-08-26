console.log("Content script loaded");

let iframe;
let isDragging = false;
let startX, startY;

// Store event listener references for cleanup
let dragListeners = {
  mousemove: null,
  mouseup: null,
  selectstart: null
};

// Function to create and append the iframe
function createIframe() {
  const headerHeight = '20px';
  const backgroundColor = 'rgb(30, 30, 30)'; // Solid dark background
  const hoverBackgroundColor = 'rgb(15, 15, 15)'; // Darker on hover

  // Create container for the iframe
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed !important;
    width: 500px !important;
    height: 300px !important;
    border: none !important;
    z-index: 9999 !important;
    background-color: ${backgroundColor} !important;
    border-radius: 10px !important;
    overflow: hidden !important;
    box-shadow: 0 6px 10px rgba(0, 0, 0, 0.2) !important;
    font-family: Inter, 'Helvetica Neue', Arial, sans-serif !important;
    font-size: 14px !important;
    line-height: 22.4px !important;
    letter-spacing: 0.028px !important;
    color: white !important;
    background: ${backgroundColor} !important;
  `;
  
  // Create draggable header
  const header = document.createElement('div');
  header.style.cssText = `
    height: ${headerHeight} !important;
    cursor: move !important;
    padding: 2px 5px !important;
    display: flex !important;
    justify-content: flex-end !important;
    align-items: center !important;
    background-color: transparent !important;
    font-family: Inter, 'Helvetica Neue', Arial, sans-serif !important;
    font-size: 10px !important;
    color: white !important;
  `;
  
  // Create storage info element
  const storageInfo = document.createElement('div');
  storageInfo.style.cssText = `
    font-size: 10px !important;
    color: white !important;
    margin-right: 5px !important;
    display: none !important;
    font-family: Inter, 'Helvetica Neue', Arial, sans-serif !important;
  `;

  // Function to update storage info display
  function updateStorageInfoDisplay() {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      const totalBytes = chrome.storage.local.QUOTA_BYTES;
      const usedPercentage = ((bytesInUse / totalBytes) * 100).toFixed(2);
      const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
      
      storageInfo.textContent = `${usedPercentage}% of ${totalMB}MB`;
    });
  }

  // Append storage info to header
  header.appendChild(storageInfo);

  // Show storage info on hover and drag
  header.addEventListener('mouseenter', () => {
    header.style.backgroundColor = hoverBackgroundColor;
    storageInfo.style.display = 'block';
    updateStorageInfoDisplay();
  });

  header.addEventListener('mouseleave', () => {
    if (!isDragging) {
      header.style.backgroundColor = 'transparent';
      storageInfo.style.display = 'none';
    }
  });

  // Create shortcuts icon
  const shortcutsIcon = document.createElement('div');
  shortcutsIcon.innerHTML = '<img src="' + chrome.runtime.getURL('icons/keyboard_keys_16dp_E8EAED_FILL0_wght400_GRAD0_opsz20.png') + '" alt="Shortcuts">';
  shortcutsIcon.style.cssText = `
    display: flex !important;
    align-items: center !important;
    cursor: pointer !important;
    margin-left: 5px !important;
    font-family: Inter, 'Helvetica Neue', Arial, sans-serif !important;
  `;

  // Set the image size
  const iconImg = shortcutsIcon.querySelector('img');
  iconImg.style.cssText = `
    width: 16px !important;
    height: 16px !important;
    max-width: 16px !important;
    max-height: 16px !important;
    vertical-align: middle !important;
  `;

  // Initially hidden
  shortcutsIcon.style.display = 'none';

  // Create shortcuts popup
  const shortcutsPopup = document.createElement('div');
  shortcutsPopup.style.cssText = `
    position: absolute !important;
    top: 25px !important;
    right: 5px !important;
    background-color: #333 !important;
    padding: 10px !important;
    border-radius: 5px !important;
    z-index: 10000 !important;
    max-width: 300px !important;
    display: none !important;
    color: white !important;
    font-family: Inter, 'Helvetica Neue', Arial, sans-serif !important;
    font-size: 14px !important;
    line-height: 22.4px !important;
    letter-spacing: 0.028px !important;
  `;
  shortcutsPopup.innerHTML = `
    <p>&#8963;+B for <b>bold</b>, &#8963;+I for <i>italic</i>. &#8963;+U for <u>underline too</u>.</p>
    <p>Highlight text then open the note taker to automatically paste it.</p>
    <p>Use &#8679; +&#9166; for bullet points.</p>
    <p>Use &#8679; +&#9003; to toggle <s>strikethrough</s>.</p>
  `;

  // Append shortcuts icon and popup to header
  header.appendChild(storageInfo);
  header.appendChild(shortcutsIcon);
  header.appendChild(shortcutsPopup);

  // Show shortcuts icon on header hover
  header.addEventListener('mouseenter', () => {
    header.style.backgroundColor = hoverBackgroundColor;
    storageInfo.style.display = 'block';
    shortcutsIcon.style.display = 'block';
    updateStorageInfoDisplay();
  });

  header.addEventListener('mouseleave', () => {
    if (!isDragging) {
      header.style.backgroundColor = 'transparent';
      storageInfo.style.display = 'none';
      shortcutsIcon.style.display = 'none';
      shortcutsPopup.style.display = 'none';
    }
  });

  // Show shortcuts popup on icon hover
  shortcutsIcon.addEventListener('mouseenter', () => {
    shortcutsPopup.style.display = 'block';
  });

  shortcutsIcon.addEventListener('mouseleave', () => {
    shortcutsPopup.style.display = 'none';
  });

  // Create the iframe
  iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('iframe.html');
  iframe.style.cssText = `
    width: 100% !important;
    height: calc(100% - ${headerHeight}) !important;
    border: none !important;
    background-color: transparent !important;
  `;

  // Append elements
  container.appendChild(header);
  container.appendChild(iframe);
  document.body.appendChild(container);

  // Retrieve the last saved position
  chrome.storage.local.get(['iframeX', 'iframeY'], function(result) {
    container.style.left = (result.iframeX || '20') + 'px';
    container.style.top = (result.iframeY || '20') + 'px';
  });

  // Add event listeners for dragging with proper cleanup
  header.addEventListener('mousedown', startDragging);
  
  // Store drag listeners for cleanup
  dragListeners.mousemove = drag;
  dragListeners.mouseup = stopDragging;
  dragListeners.selectstart = preventDefault;
  
  document.addEventListener('mousemove', dragListeners.mousemove);
  document.addEventListener('mouseup', dragListeners.mouseup);

  // Store the container reference
  iframe.container = container;
  
  // Load content from storage when iframe is created
  iframe.addEventListener('load', () => {
    console.log('Iframe loaded, checking for content in storage...');
    // Load the latest content from storage
    chrome.storage.local.get(['iframeContent'], function(result) {
      if (result.iframeContent) {
        console.log('Found content in storage, loading into iframe...');
        // Handle new content structure with timestamp
        const content = typeof result.iframeContent === 'object' && result.iframeContent.content 
          ? result.iframeContent.content 
          : result.iframeContent;
        
        // Send message to iframe to load content
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            action: 'loadContent',
            content: content
          }, '*');
        }
      } else {
        console.log('No content found in storage');
      }
    });
  });
}

function startDragging(e) {
  isDragging = true;
  startX = e.clientX - iframe.container.offsetLeft;
  startY = e.clientY - iframe.container.offsetTop;
  document.addEventListener('selectstart', dragListeners.selectstart);
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
    document.removeEventListener('selectstart', dragListeners.selectstart);
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

// 🛑 CRITICAL: Cleanup function to prevent memory leaks
function cleanupIframeListeners() {
  console.log('Cleaning up iframe event listeners...');
  
  // Remove all drag-related event listeners
  if (dragListeners.mousemove) {
    document.removeEventListener('mousemove', dragListeners.mousemove);
    dragListeners.mousemove = null;
  }
  
  if (dragListeners.mouseup) {
    document.removeEventListener('mouseup', dragListeners.mouseup);
    dragListeners.mouseup = null;
  }
  
  if (dragListeners.selectstart) {
    document.removeEventListener('selectstart', dragListeners.selectstart);
    dragListeners.selectstart = null;
  }
  
  // Reset drag state
  isDragging = false;
  startX = null;
  startY = null;
  
  console.log('Iframe event listeners cleaned up - memory leak prevented');
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("Message received in content script:", request);

  // Handle ping messages for connection testing
  if (request.action === "ping") {
    sendResponse({ status: "pong" });
    return false; // Don't keep message channel open for simple responses
  }

  // Handle the toggleIframe action
  if (request.action === "toggleIframe") {
    try {
      console.log("Toggle iframe called. Current iframe state:", iframe ? "exists" : "null");
      
      if (iframe && iframe.container) {
        console.log("Removing existing iframe...");
        
        // Save content directly to iframe before closing
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage({ action: 'saveContent' }, '*');
        }
        
        // 🛑 CRITICAL: Clean up all event listeners to prevent memory leaks
        cleanupIframeListeners();
        
        // Remove iframe immediately
        if (document.body.contains(iframe.container)) {
          document.body.removeChild(iframe.container);
          console.log("Iframe container removed from DOM");
        } else {
          console.log("Iframe container not found in DOM");
        }
        
        iframe = null;
        console.log("Iframe reference set to null");
        sendResponse({ status: "Iframe removed and content saved successfully" });
      } else {
        console.log("Creating new iframe...");
        createIframe();
        console.log("Iframe created successfully");
        sendResponse({ status: "Iframe created successfully" });
      }
    } catch (error) {
      console.error("Error toggling iframe:", error);
      // Reset iframe state on error
      iframe = null;
      sendResponse({ status: "Error", error: error.toString() });
    }
    return true; // Keep message channel open for async response
  }

  // Handle the checkSelection action
  if (request.action === "checkSelection") {
    const selectedText = window.getSelection().toString().trim();
    const pageUrl = window.location.href;

    if (selectedText) {
      const formattedLink = `- <a href="${pageUrl}" style="color: blue; text-decoration: underline;">Link</a>`;
      const htmlContent = `<p>${selectedText} ${formattedLink}</p>`;

      // Create a temporary element to hold the HTML content
      const tempElement = document.createElement('div');
      tempElement.innerHTML = htmlContent;

      // Use the Clipboard API to write both HTML and plain text
      navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([`${selectedText} - ${pageUrl}`], { type: 'text/plain' }),
          'text/html': new Blob([tempElement.innerHTML], { type: 'text/html' })
        })
      ]).then(() => {
        console.log("Text and formatted link copied to clipboard");
        sendResponse({ status: "success", content: htmlContent });
      }).catch(err => {
        console.error("Failed to copy text:", err);
        sendResponse({ status: "error", error: err.toString() });
      });
    } else {
      console.log("No text selected.");
      sendResponse({ status: "error", error: "No text selected" });
    }
    return true; // Keep message channel open for async response
  }

  // Handle the updateContent action - pass through to iframe
  if (request.action === "updateContent") {
    console.log("Content script received updateContent:", request);
    // Pass the message to the iframe
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        action: 'updateContent',
        content: request.content,
        sessionId: request.sessionId
      }, '*');
    }
    sendResponse({ status: "Content update passed to iframe" });
    return false; // Don't keep message channel open for this
  }

  // Default response for unknown actions
  sendResponse({ status: "Unknown action" });
  return false;
});

// Function to explicitly save content before closing or toggling iframe
function saveContentBeforeClose(editor, callback) {
    const content = editor.innerHTML; // Get the current content from the editor
    const saveData = {
      content: content,
      timestamp: Date.now(),
      tabId: chrome.tabs.TAB_ID_NONE,
      isEditing: false
    };
    
    chrome.storage.sync.set({ iframeContent: saveData }, function () {
        chrome.storage.local.set({ iframeContent: saveData }, function () {
            console.log("Content saved before closing the iframe");
            if (callback) callback();  // Proceed to the next step (e.g., closing the iframe)
        });
    });
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // Save content when the tab is hidden
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            action: 'saveContent'
          }, '*');
        }
    }
});