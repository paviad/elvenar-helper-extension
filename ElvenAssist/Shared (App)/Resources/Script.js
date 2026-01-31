function show(platform, enabled, useSettingsInsteadOfPreferences) {
  // 1. Set Platform (mostly for CSS hooks if needed)
  document.body.classList.add(`platform-${platform}`);

  const statusBox = document.getElementById('status-message');
  const button = document.getElementById('open-btn');
  const instructions = document.querySelector('.instructions');
  const footer = document.querySelector('.footer');

  // 2. Update Text based on macOS version (Settings vs Preferences)
  if (useSettingsInsteadOfPreferences) {
    button.innerText = 'Open Safari Settings';
  } else {
    button.innerText = 'Open Safari Preferences';
  }

  // 3. Handle State (On vs Off)
  if (enabled === true) {
    // STATE: Extension is ON
    document.body.classList.add('state-on');
    document.body.classList.remove('state-off');

    statusBox.innerText = '✅ ElvenAssist is active!';
    statusBox.classList.add('active'); // Makes it green via CSS

    // Hide button and instructions since it's already working
    button.style.display = 'none';
    instructions.style.display = 'none';
    footer.style.display = 'none';
  } else {
    // STATE: Extension is OFF (or unknown)
    document.body.classList.add('state-off');
    document.body.classList.remove('state-on');

    statusBox.innerText = 'Extension is currently disabled.';
    statusBox.classList.remove('active');

    // Show everything needed to fix it
    button.style.display = 'block';
    instructions.style.display = 'block';
    footer.style.display = 'block';
  }
}

function openPreferences() {
  webkit.messageHandlers.controller.postMessage('open-preferences');
}

// Bind the click event to the new button ID
document.getElementById('open-btn').addEventListener('click', openPreferences);
