document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('editor');

  // Ensure the editor is focused after content is loaded
  editor.focus();

  // Function to load content from storage
  function loadContent() {
    // Try to load from chrome.storage.sync first
    chrome.storage.sync.get('iframeContent', function(syncResult) {
      if (chrome.runtime.lastError || !syncResult.iframeContent) {
        // If sync storage fails or is empty, fallback to local storage
        chrome.storage.local.get('iframeContent', function(localResult) {
          if (localResult.iframeContent) {
            editor.value = localResult.iframeContent;
          }
        });
      } else {
        editor.value = syncResult.iframeContent;
      }
    });
  }

  // Load content when the iframe is loaded
  loadContent();

  // Auto-save content every second
  setInterval(() => {
    const content = editor.value;
    // Save locally first
    chrome.storage.local.set({ iframeContent: content }, function() {
      console.log('Content auto-saved locally');
      // Then attempt to sync
      chrome.storage.sync.set({ iframeContent: content }, function() {
        console.log('Content auto-synced');
      });
    });
  }, 1000);

  // Save content on typing
  editor.addEventListener('input', () => {
    const content = editor.value;
    chrome.storage.local.set({ iframeContent: content }, function() {
      console.log('Content saved locally on input');
      chrome.storage.sync.set({ iframeContent: content }, function() {
        console.log('Content synced on input');
      });
    });
  });

  // Listen for changes in storage and update the content dynamically
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync' && changes.iframeContent) {
      editor.value = changes.iframeContent.newValue;
      console.log('Content updated from sync storage');
    } else if (namespace === 'local' && changes.iframeContent) {
      editor.value = changes.iframeContent.newValue;
      console.log('Content updated from local storage');
    }
  });
});