const urlInput = document.getElementById('url');
const status = document.getElementById('status');

function clean(value) {
  return value.trim().replace(/\/$/, '');
}

function valid(value) {
  return /^https?:\/\//.test(value);
}

async function selectOrigin(origin, label) {
  if (!valid(origin)) {
    status.textContent = 'Enter a complete http:// or https:// URL.';
    return;
  }
  await chrome.storage.local.set({ appOrigin: origin });
  urlInput.value = origin;
  status.textContent = `${label} selected.`;
}

document.getElementById('production').onclick = async () => {
  const origin = clean(urlInput.value);
  if (!valid(origin)) return selectOrigin(origin, 'Production');
  await chrome.storage.local.set({ appOrigin: origin, productionOrigin: origin });
  status.textContent = 'Production selected.';
};

document.getElementById('preview').onclick = () => selectOrigin(clean(urlInput.value), 'Preview');
document.getElementById('local').onclick = () => selectOrigin('http://localhost:5173', 'Localhost');
document.getElementById('open').onclick = async () => {
  const { appOrigin } = await chrome.storage.local.get('appOrigin');
  if (appOrigin) chrome.tabs.create({ url: appOrigin });
  else status.textContent = 'Select an origin first.';
};

chrome.storage.local.get(['appOrigin', 'productionOrigin']).then(({ appOrigin, productionOrigin }) => {
  urlInput.value = appOrigin || productionOrigin || '';
});
