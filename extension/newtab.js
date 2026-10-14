const DEFAULT_URL = '';
const app = document.getElementById('app');

function setup(message) {
  app.innerHTML = `
    <h3 style="margin:0 0 6px">Point this new tab at your app</h3>
    ${message ? `<p style="color:#ff9a9a">${message}</p>` : ''}
    <input id="url" placeholder="https://your-app.vercel.app" />
    <button id="save">Save & open</button>
    <div class="hint">Use your production URL, a preview URL, or <code>http://localhost:5173</code>.
    Change it any time from the extension's toolbar menu.</div>`;
  document.getElementById('save').onclick = () => {
    const url = document.getElementById('url').value.trim().replace(/\/$/, '');
    if (!/^https?:\/\//.test(url)) return setup('Include https:// or http:// in the URL.');
    chrome.storage.local.set({ appOrigin: url }, () => location.replace(url));
  };
}

(async () => {
  const { appOrigin } = await chrome.storage.local.get('appOrigin');
  const target = appOrigin || DEFAULT_URL;
  if (!target) return setup();

  // Navigate even while offline so the target origin's service worker can serve its cached shell.
  location.replace(target);
})();
