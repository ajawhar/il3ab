document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('editor'); // Get the contenteditable element

  // Ensure the editor is focused after content is loaded
  editor.focus();

  // Function to load content from storage and set the editor's content
  function loadContent() {
    // First, try to get the content from Chrome's sync storage
    chrome.storage.sync.get(['iframeContent', 'firstUse'], function (syncResult) {
      // Check if there's an error or if no content is found in sync storage
      if (chrome.runtime.lastError || (!syncResult.iframeContent && syncResult.firstUse !== false)) {
        // If no content in sync storage, try local storage
        chrome.storage.local.get(['iframeContent', 'firstUse'], function (localResult) {
          // If content is found in local storage, set it to the editor
          if (localResult.firstUse !== false) {
            editor.innerHTML = '<div id="editor" contenteditable="true">' +
              'Welcome to &#9889; il3ab &#9889;.<br>' +
              '<p>Access this &#128221; anytime with Cmd+Shift+F.</p>' +
              '<ul>' +
                '<li><b>Ctrl+B</b> and <i>Ctrl+I</i> to toggle bold and italic. <u>Underline too</u>.</li>' +
                '<li>Highlight text &#128397; then open the note taker so you can automatically paste it &#128203;.</li>' +
                '<li>More to come..</li>' +
                '<li>Use Shift+Enter or type "- " at the start of a line for bullet points &#9675;.</li>' +
              '</ul>' +
              '<p>Start typing to begin using the extension..or maybe just delete this text first. &#9989;</p>' +
            '</div>';
            chrome.storage.local.set({ firstUse: true });
            chrome.storage.sync.set({ firstUse: true });
          } else if (localResult.iframeContent) {
            editor.innerHTML = localResult.iframeContent;
          }
        });
      } else {
        // If content is found in sync storage, set it to the editor
        editor.innerHTML = syncResult.iframeContent || '';
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

  // Add event listener for bullet point creation
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertUnorderedList', false, null);
    }
  });

  // Function to handle bullet points
  function handleBulletPoints(e) {
    if (e.key === ' ' && e.target.textContent.trim() === '-') {
      e.preventDefault();
      document.execCommand('delete', false);
      document.execCommand('insertUnorderedList', false, null);
    }
  }

  // Add event listener for bullet point creation
  editor.addEventListener('keydown', handleBulletPoints);
});