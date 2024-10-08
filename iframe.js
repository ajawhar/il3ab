document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('editor'); // Get the contenteditable element

  // Ensure the editor is focused after content is loaded
  editor.focus();

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
                '<li>More to come..</li>' +
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
        editor.innerHTML = syncResult.iframeContent || '';
      }
    });
  }

  // Load content from storage when the iframe is loaded
  loadContent();

  let lastSavedContent = '';
  let debounceTimer;
  const saveDelay = 5000; // milliseconds

  // Function to save content
  function saveContent(content) {
    if (content !== lastSavedContent) {
      lastSavedContent = content;
      chrome.storage.local.set({ iframeContent: content });
      chrome.storage.sync.set({ iframeContent: content });
    }
  }

  // Debounced save function
  function debouncedSave() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      saveContent(editor.innerHTML);
    }, saveDelay);
  }

  // Save on input (typing)
  editor.addEventListener('input', () => {
    debouncedSave();
  });

  // Save before unload (closing)
  window.addEventListener('beforeunload', () => {
    saveContent(editor.innerHTML);
  });

  // Check and save if content is different from storage on load
  document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get('iframeContent', function(result) {
      if (result.iframeContent !== editor.innerHTML) {
        saveContent(editor.innerHTML);
      }
    });
  });

  // Listen for changes in storage and update the content dynamically
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync' && changes.iframeContent && changes.iframeContent.newValue !== editor.innerHTML) {
      const currentTime = Date.now();
      if (!isEditing && (currentTime - lastEditTime > editThreshold)) {
        editor.innerHTML = changes.iframeContent.newValue;
        lastSavedContent = changes.iframeContent.newValue;
        console.log('Content updated from sync storage');
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

  // Add event listener for blur to save content
  editor.addEventListener('blur', () => {
    isEditing = false;
    saveContent(editor.innerHTML);
  });

  let isEditing = false;
  let lastEditTime = 0;
  const editThreshold = 1000; // 1 second

  editor.addEventListener('focus', () => {
    isEditing = true;
  });

  editor.addEventListener('blur', () => {
    isEditing = false;
  });

  editor.addEventListener('input', () => {
    lastEditTime = Date.now();
  });
});