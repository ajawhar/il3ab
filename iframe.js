document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('editor');

  // Load saved content
  chrome.storage.sync.get('iframeContent', function(result) {
    if (result.iframeContent) {
      editor.value = result.iframeContent;
    }
  });

  // Auto-save content every few seconds
  setInterval(() => {
    const content = editor.value;
    chrome.storage.sync.set({iframeContent: content}, function() {
      console.log('Content auto-saved');
    });
  }, 5000); // Auto-save interval in milliseconds

  // Save content on typing (optional)
  editor.addEventListener('input', () => {
    const content = editor.value;
    chrome.storage.sync.set({iframeContent: content}, function() {
      console.log('Content saved on input');
    });
  });
});