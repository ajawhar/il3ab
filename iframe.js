document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('editor');

  // Ensure the editor is focused after content is loaded
  editor.focus();

  // Function to load content from storage
  function loadContent() {
    chrome.storage.sync.get('iframeContent', function(result) {
      if (result.iframeContent) {
        editor.value = result.iframeContent;
      }
    });
  }

  // Load content when the iframe is loaded
  loadContent();

  // Auto-save content every second
  setInterval(() => {
    const content = editor.value;
    chrome.storage.sync.set({ iframeContent: content }, function() {
      console.log('Content auto-saved');
    });
  }, 1000);

  // Save content on typing
  editor.addEventListener('input', () => {
    const content = editor.value;
    chrome.storage.sync.set({ iframeContent: content }, function() {
      console.log('Content saved on input');
    });
  });

  // Listen for changes in storage and update the content dynamically
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (changes.iframeContent) {
      editor.value = changes.iframeContent.newValue;
      console.log('Content updated from storage');
    }
  });

  // Listen for messages from the parent document
  window.addEventListener('message', (event) => {
    // Check the action sent in the message
    if (event.data.action === 'focusEditor') {
      // Focus the textarea element when the action is 'focusEditor'
      editor.focus();
    }
  });
});