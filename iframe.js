document.addEventListener('DOMContentLoaded', () => {
  const editor = document.getElementById('editor');

  editor.focus();

  function loadContent() {
    chrome.storage.sync.get('iframeContent', function (syncResult) {
      if (chrome.runtime.lastError || !syncResult.iframeContent) {
        chrome.storage.local.get('iframeContent', function (localResult) {
          if (localResult.iframeContent) {
            editor.innerHTML = localResult.iframeContent;
          }
        });
      } else {
        editor.innerHTML = syncResult.iframeContent;
      }
    });
  }

  loadContent();

  setInterval(() => {
    const content = editor.innerHTML;
    chrome.storage.local.set({ iframeContent: content }, function () {
      console.log('Content auto-saved locally');
      chrome.storage.sync.set({ iframeContent: content }, function () {
        console.log('Content auto-synced');
      });
    });
  }, 1000);

  editor.addEventListener('input', () => {
    const content = editor.innerHTML;
    chrome.storage.local.set({ iframeContent: content }, function () {
      console.log('Content saved locally on input');
      chrome.storage.sync.set({ iframeContent: content }, function () {
        console.log('Content synced on input');
      });
    });
  });

  chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'sync' && changes.iframeContent) {
      if (changes.iframeContent.newValue !== editor.innerHTML) {
        editor.innerHTML = changes.iframeContent.newValue;
        console.log('Content updated from sync storage');
      }
    } else if (namespace === 'local' && changes.iframeContent) {
      if (changes.iframeContent.newValue !== editor.innerHTML) {
        editor.innerHTML = changes.iframeContent.newValue;
        console.log('Content updated from local storage');
      }
    }
  });

  // Function to format selected text as a bullet list
  function formatBulletList() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      if (selectedText) {
        const lines = selectedText.split('\n');
        const bulletedLines = lines.map(line => `• ${line.trim()}`).join('\n');
        const newNode = document.createElement('div');
        newNode.innerHTML = bulletedLines;
        range.deleteContents();
        range.insertNode(newNode);
      }
    }
  }

  // Add event listener for a keyboard shortcut (e.g., Ctrl+B or Cmd+B)
  editor.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      formatBulletList();
    }
  });
});