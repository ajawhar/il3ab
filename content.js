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
  storageInfo.style.display = 'none'; // Initially hidden

  // Function to update storage info
  function updateStorageInfo() {
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
    updateStorageInfo();
  });

  header.addEventListener('mouseleave', () => {
    if (!isDragging) {
      header.style.backgroundColor = 'transparent';
      storageInfo.style.display = 'none';
    }
  });

  // Update header color and show storage info when dragging starts and ends
  const originalStartDragging = startDragging;
  startDragging = (e) => {
    originalStartDragging(e);
    header.style.backgroundColor = hoverBackgroundColor; // Use hover background when dragging
    storageInfo.style.display = 'block';
    shortcutsIcon.style.display = 'block'; // Ensure this line is present
    updateStorageInfo();
  };

  const originalStopDragging = stopDragging;
  stopDragging = () => {
    originalStopDragging();
    header.style.backgroundColor = 'transparent';
    storageInfo.style.display = 'none';
    shortcutsIcon.style.display = 'none';
    shortcutsPopup.style.display = 'none';
  };

  // Create shortcuts icon
  const shortcutsIcon = document.createElement('div');
  shortcutsIcon.innerHTML = '<img src="' + chrome.runtime.getURL('icons/keyboard_keys_16dp_E8EAED_FILL0_wght400_GRAD0_opsz20.png') + '" alt="Shortcuts">';
  shortcutsIcon.style.marginLeft = '10px';
  shortcutsIcon.style.display = 'flex';
  shortcutsIcon.style.alignItems = 'center';
  shortcutsIcon.style.cursor = 'pointer';

  // Set the image size
  const iconImg = shortcutsIcon.querySelector('img');
  iconImg.style.width = '16px';
  iconImg.style.height = '16px';
  iconImg.style.maxWidth = '16px';
  iconImg.style.maxHeight = '16px';

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
    <p><b>Ctrl+B</b> and <i>Ctrl+I</i> to toggle bold and italic. <u>Underline too</u>.</p>
    <p>Highlight text then open the note taker to automatically paste it.</p>
    <p>Use Shift+Enter or type "- " at the start of a line for bullet points.</p>
    <p>Use Shift+Backspace to toggle <s>strikethrough</s>.</p>
  `;

  // Append shortcuts icon and popup to header
  header.appendChild(shortcutsIcon);
  header.appendChild(shortcutsPopup);

  // Show shortcuts icon on header hover
  header.addEventListener('mouseenter', () => {
    header.style.backgroundColor = hoverBackgroundColor;
    storageInfo.style.display = 'block';
    shortcutsIcon.style.display = 'block'; // Ensure this line is present
    updateStorageInfo();
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