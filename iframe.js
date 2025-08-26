const editor = document.getElementById('editor'); // Assuming this is your content-editable div

// Real-time sync variables
let isCurrentlyEditing = false;
let lastEditTime = 0;
let editingTimeout;
const editThreshold = 500; // Reduced from 1000ms to 500ms
let lastSavedContent = '';
let debounceTimer;
const saveDelay = 50; // Reduced from 100ms to 50ms for near-instant sync
let currentTabId = Date.now() + Math.random(); // Unique tab ID

document.addEventListener('DOMContentLoaded', () => {
  // Ensure the editor is focused after content is loaded
  editor.focus();

  // Create sync indicator
  createSyncIndicator();

  // Function to load content from storage and set the editor's content
  function loadContent() {
    chrome.storage.sync.get(['iframeContent', 'firstUse'], function (syncResult) {
      if (chrome.runtime.lastError || (!syncResult.iframeContent && syncResult.firstUse !== false)) {
        chrome.storage.local.get(['iframeContent', 'firstUse'], function (localResult) {
          if (localResult.firstUse !== false) {
            editor.innerHTML = '<div id="editor" contenteditable="true">' +
              'Welcome to &#9889; il3ab &#9889;.<br>' +
              '<p>Access this &#128221; anytime with Cmd+Shift+F.</p>' +
              '<ul>' +
                '<li><b>Ctrl+B</b> and <i>Ctrl+I</i> to toggle bold and italic. <u>Underline too</u>.</li>' +
                '<li>Highlight text &#128397; then open the note taker so you can automatically paste it &#128203;.</li>' +
                '<li>Use &#8679;+Enter or type "- " at the start of a line for bullet points &#9675;.</li>' +
                '<li>Use &#8679;+Backspace to toggle  strikethrough.</li>' +
                '<li>Hover over the navigation bar icon <img src="' + chrome.runtime.getURL('icons/keyboard_keys_16dp_E8EAED_FILL0_wght400_GRAD0_opsz20.png') + '" alt="Shortcuts Icon" style="width: 16px; height: 16px;"> to view these shortcuts.</li>' +
                '<li>More to come..</li>' +
              '</ul>' +
              '<p>Start typing to begin using the extension..or maybe just delete this text first. &#9989;</p>' + 
            '</div>';
            chrome.storage.local.set({ firstUse: true });
            chrome.storage.sync.set({ firstUse: true });
          } else if (localResult.iframeContent) {
            // Handle new content structure with timestamp
            if (typeof localResult.iframeContent === 'object' && localResult.iframeContent.content) {
              editor.innerHTML = localResult.iframeContent.content;
            } else {
              editor.innerHTML = localResult.iframeContent;
            }
          }
        });
      } else {
        // Handle new content structure with timestamp
        if (typeof syncResult.iframeContent === 'object' && syncResult.iframeContent.content) {
          editor.innerHTML = syncResult.iframeContent.content;
        } else {
          editor.innerHTML = syncResult.iframeContent || '';
        }
      }
    });
  }

  // Load content from storage when the iframe is loaded
  loadContent();

  // Function to save content with real-time sync
  function realTimeSave(content) {
    if (content === lastSavedContent) return; // Don't save if content hasn't changed
    
    const saveData = {
      content: content,
      timestamp: Date.now(),
      tabId: currentTabId,
      isEditing: isCurrentlyEditing
    };
    
    lastSavedContent = content;
    
    // PRIMARY: Send update to background script for immediate broadcast
    chrome.runtime.sendMessage({
      action: 'broadcastUpdate',
      content: content,
      sessionId: currentTabId,
      timestamp: Date.now()
    }, (response) => {
      if (response && response.status === 'Update broadcasted') {
        console.log('Update broadcasted to all tabs');
        showSyncIndicator('synced');
      }
    });
    
    // SECONDARY: Save to local storage for background script polling
    chrome.storage.local.set({ 
      iframeContent: saveData,
      lastUpdate: Date.now(),
      content: content,
      sessionId: currentTabId
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Local save failed:', chrome.runtime.lastError);
        showSyncIndicator('error');
      } else {
        showSyncIndicator('syncing');
      }
    });
  }

  // Debounced save function for better performance
  function debouncedSave() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      realTimeSave(editor.innerHTML);
    }, saveDelay);
  }

  // Enhanced input handling with active tab detection
  editor.addEventListener('input', () => {
    isCurrentlyEditing = true;
    lastEditTime = Date.now();
    
    // Clear the editing timeout
    clearTimeout(editingTimeout);
    editingTimeout = setTimeout(() => {
      isCurrentlyEditing = false;
    }, editThreshold);
    
    debouncedSave();
  });

  // Save before unload (closing)
  window.addEventListener('beforeunload', () => {
    realTimeSave(editor.innerHTML);
  });

  // Listen for updates from background script (PRIMARY SYNC METHOD)
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateContent') {
      console.log('Received update from background script:', request);
      if (request.sessionId !== currentTabId && !isCurrentlyEditing) {
        const mergedContent = mergeContent(editor.innerHTML, request.content);
        editor.innerHTML = mergedContent;
        lastSavedContent = mergedContent;
        showSyncIndicator('synced');
        console.log('Content updated from background script');
      }
    }
    
    if (request.action === "saveContent") {
      try {
        realTimeSave(editor.innerHTML);
        sendResponse({ status: "Content saved successfully" });
      } catch (error) {
        console.error("Error saving content:", error);
        sendResponse({ status: "Error saving content", error: error.toString() });
      }
    }
    
    return false; // Don't keep message channel open
  });

  // Listen for changes in storage (BACKUP SYNC METHOD)
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync' && changes.iframeContent) {
      const newData = changes.iframeContent.newValue;
      const currentContent = editor.innerHTML;
      
      // Only update if content is different and we're not actively editing
      if (newData && newData.content !== currentContent && !isCurrentlyEditing) {
        // Use intelligent merging
        const mergedContent = mergeContent(currentContent, newData.content);
        editor.innerHTML = mergedContent;
        lastSavedContent = mergedContent;
        showSyncIndicator('synced');
        console.log('Content updated from sync storage');
      }
    }
  });

  // Listen for messages from content script
  window.addEventListener('message', function(event) {
    if (event.data && event.data.action) {
      switch(event.data.action) {
        case 'updateContent':
          if (event.data.content && !isCurrentlyEditing) {
            const mergedContent = mergeContent(editor.innerHTML, event.data.content);
            editor.innerHTML = mergedContent;
            lastSavedContent = mergedContent;
            showSyncIndicator('synced');
            console.log('Content updated from content script');
          }
          break;
        case 'saveContent':
          realTimeSave(editor.innerHTML);
          break;
        case 'loadContent':
          if (event.data.content) {
            console.log('Loading content from storage:', event.data.content);
            editor.innerHTML = event.data.content;
            lastSavedContent = event.data.content;
            showSyncIndicator('synced');
            console.log('Content loaded from storage successfully');
          }
          break;
      }
    }
  });

  // Intelligent content merging function
  function mergeContent(oldContent, newContent) {
    // Simple line-based merging
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    
    // If content is very different, prefer the newer content
    const similarity = calculateSimilarity(oldLines, newLines);
    if (similarity < 0.3) {
      return newContent; // Content is too different, use new
    }
    
    // Merge by preserving structure and adding new content
    let mergedContent = oldContent;
    
    // Add new lines that don't exist in old content
    newLines.forEach(line => {
      if (!oldLines.includes(line) && line.trim() !== '') {
        mergedContent += '\n' + line;
      }
    });
    
    return mergedContent;
  }

  // Calculate similarity between two content arrays
  function calculateSimilarity(oldLines, newLines) {
    const commonLines = oldLines.filter(line => newLines.includes(line));
    return commonLines.length / Math.max(oldLines.length, newLines.length);
  }

  // Create sync indicator element
  function createSyncIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'sync-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 5px;
      right: 5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #4CAF50;
      z-index: 10000;
      transition: background-color 0.3s ease;
    `;
    indicator.title = 'Synced';
    document.body.appendChild(indicator);
  }

  // Show sync indicator with different states
  function showSyncIndicator(status) {
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;
    
    switch(status) {
      case 'syncing':
        indicator.style.backgroundColor = '#ffa500'; // Orange
        indicator.title = 'Syncing...';
        break;
      case 'synced':
        indicator.style.backgroundColor = '#4CAF50'; // Green
        indicator.title = 'Synced';
        break;
      case 'error':
        indicator.style.backgroundColor = '#f44336'; // Red
        indicator.title = 'Sync Error - Retrying...';
        break;
    }
  }

  // Function to handle first input and set firstUse to false
  function handleFirstInput() {
    chrome.storage.sync.get('firstUse', function(syncResult) {
      if (syncResult.firstUse === true) {
        editor.innerHTML = '';
        chrome.storage.sync.set({ firstUse: false });
        chrome.storage.local.set({ firstUse: false });
        editor.removeEventListener('input', handleFirstInput);
      }
    });
  }

  // Add event listener for first input
  editor.addEventListener('input', handleFirstInput);

  // Add custom styles for unordered lists
  const style = document.createElement('style');
  style.textContent = `
    #editor ul {
      padding-left: 15px;
      margin: 0;
      list-style-type: disc;
    }
    #editor li {
      padding-left: 5px;
      margin: 0;
    }
  `;
  document.head.appendChild(style);

  // Add event listener for bullet point creation
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertUnorderedList', false, null);
    }
  });

  // Function to handle strikethrough
  function handleStrikethrough(e) {
    if (e.key === 'Backspace' && e.shiftKey) {
      e.preventDefault();
      document.execCommand('strikeThrough', false, null);
    }
  }

  // Add event listener for strikethrough
  editor.addEventListener('keydown', handleStrikethrough);

  // Enhanced blur handling
  editor.addEventListener('blur', () => {
    isCurrentlyEditing = false;
    realTimeSave(editor.innerHTML); // Save content when the editor loses focus
  });

  // Enhanced focus handling
  editor.addEventListener('focus', () => {
    isCurrentlyEditing = true;
  });
});