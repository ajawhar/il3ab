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
  header.style.justifyContent = 'flex-end'; // Align items to the right
  header.style.alignItems = 'center';
  
  // Create storage info element
  const storageInfo = document.createElement('div');
  storageInfo.style.fontSize = '10px';
  storageInfo.style.color = 'white';
  storageInfo.style.marginRight = '5px';
  storageInfo.style.display = 'none'; // Initially hidden

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
    header.style.backgroundColor = hoverBackgroundColor; // Darker on hover
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
  shortcutsIcon.style.display = 'flex';
  shortcutsIcon.style.alignItems = 'center';
  shortcutsIcon.style.cursor = 'pointer';
  shortcutsIcon.style.marginLeft = '5px';

  // Set the image size
  const iconImg = shortcutsIcon.querySelector('img');
  iconImg.style.width = '16px';
  iconImg.style.height = '16px';
  iconImg.style.maxWidth = '16px';
  iconImg.style.maxHeight = '16px';
  iconImg.style.verticalAlign = 'middle';

  // Initially hidden
  shortcutsIcon.style.display = 'none';

  // Create shortcuts popup
  const shortcutsPopup = document.createElement('div');
  shortcutsPopup.style.position = 'absolute';
  shortcutsPopup.style.top = '25px';
  shortcutsPopup.style.right = '5px';
  shortcutsPopup.style.backgroundColor = '#333';
  shortcutsPopup.style.padding = '10px';
  shortcutsPopup.style.borderRadius = '5px';
  shortcutsPopup.style.zIndex = '10000';
  shortcutsPopup.style.maxWidth = '300px';
  shortcutsPopup.style.display = 'none';
  shortcutsPopup.style.color = 'white';
  shortcutsPopup.style.fontFamily = "Inter, 'Helvetica Neue', Arial, sans-serif";
  shortcutsPopup.style.fontSize = '14px';
  shortcutsPopup.style.lineHeight = '22.4px';
  shortcutsPopup.style.letterSpacing = '0.028px';
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
  iframe.style.width = '100%';
  iframe.style.height = `calc(100% - ${headerHeight})`;
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