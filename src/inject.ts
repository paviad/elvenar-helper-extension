injectScriptTag();

function injectScriptTag() {
  const script = document.createElement('script');
  script.setAttribute('type', 'text/javascript');
  script.setAttribute('src', chrome.runtime.getURL('elvenassist-inject.bundle.js'));
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    (document.head || document.documentElement).appendChild(script);
  }
}
