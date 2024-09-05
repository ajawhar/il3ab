document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('editor'); // Get the contenteditable element

  // Ensure the editor is focused after content is loaded
  editor.focus();

  // Function to load content from storage and set the editor's content
  function loadContent() {
    // First, try to get the content from Chrome's sync storage
    chrome.storage.sync.get('iframeContent', function (syncResult) {
      // Check if there's an error or if no content is found in sync storage
      if (chrome.runtime.lastError || !syncResult.iframeContent) {
        // If no content in sync storage, try local storage
        chrome.storage.local.get('iframeContent', function (localResult) {
          // If content is found in local storage, set it to the editor
          if (localResult.iframeContent) {
            editor.innerHTML = localResult.iframeContent;
          }
        });
      } else {
        // If content is found in sync storage, set it to the editor
        editor.innerHTML = syncResult.iframeContent;
      }
    });
  }

  // Load content from storage when the iframe is loaded
  loadContent();

  // Auto-save content every second
  setInterval(() => {
    const content = editor.innerHTML; // Get the current content of the editor

    // Save the current content to local storage
    chrome.storage.local.set({ iframeContent: content }, function () {
      console.log('Content auto-saved locally');

      // After saving to local storage, also save it to sync storage
      chrome.storage.sync.set({ iframeContent: content }, function () {
        console.log('Content auto-synced');
      });
    });
  }, 1000); // The save happens every 1000ms (1 second)

  // Save content on typing (input event)
  editor.addEventListener('input', () => {
    const content = editor.innerHTML; // Get the content currently in the editor

    // Save the content to local storage
    chrome.storage.local.set({ iframeContent: content }, function () {
      console.log('Content saved locally on input');

      // After saving to local storage, also save it to sync storage
      chrome.storage.sync.set({ iframeContent: content }, function () {
        console.log('Content synced on input');
      });
    });
  });

  // Listen for changes in storage and update the content dynamically if needed
  chrome.storage.onChanged.addListener(function (changes, namespace) {
    // If the changes come from sync storage and the iframeContent has been updated
    if (namespace === 'sync' && changes.iframeContent) {
      // Only update the editor content if the new value is different from the current content
      if (changes.iframeContent.newValue !== editor.innerHTML) {
        editor.innerHTML = changes.iframeContent.newValue; // Set the new content to the editor
        console.log('Content updated from sync storage');
      }
    }
    // If the changes come from local storage and the iframeContent has been updated
    else if (namespace === 'local' && changes.iframeContent) {
      // Only update the editor content if the new value is different from the current content
      if (changes.iframeContent.newValue !== editor.innerHTML) {
        editor.innerHTML = changes.iframeContent.newValue; // Set the new content to the editor
        console.log('Content updated from local storage');
      }
    }
  });
});