document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('editor');

  function loadContent() {
    chrome.storage.local.get(['iframeContent', 'firstUse'], function (result) {
      if (result.firstUse !== false) {
        // First-time use
        editor.innerHTML = 'Welcome to il3ab Shortcut Extension!<br><br>This is your personal notepad that you can access anytime with Ctrl+Shift+F (or Cmd+Shift+F on Mac).<br><br>Start typing to begin using the extension.';
        chrome.storage.local.set({ firstUse: true });
      } else if (result.iframeContent) {
        // Returning user, load saved content
        editor.innerHTML = result.iframeContent;
      }
    });
  }

  loadContent();

  function handleFirstInput() {
    chrome.storage.local.get('firstUse', function(result) {
      if (result.firstUse === true) {
        // Clear the welcome message on first input
        editor.innerHTML = '';
        chrome.storage.local.set({ firstUse: false });
        // Remove this event listener after first use
        editor.removeEventListener('input', handleFirstInput);
      }
    });
  }

  editor.addEventListener('input', handleFirstInput);

  // Existing auto-save functionality
  setInterval(() => {
    const content = editor.innerHTML;
    chrome.storage.local.set({ iframeContent: content }, function () {
      console.log('Content auto-saved locally');
    });
  }, 1000);

  // ... (rest of your existing code)
});