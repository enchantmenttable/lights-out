const domainInput = document.getElementById('domainInput');
const timerInput = document.getElementById('timerInput');
const addBtn = document.getElementById('addBtn');
const siteList = document.getElementById('siteList');
const toastContainer = document.getElementById('toastContainer');

let allSites = [];

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
    <span>${message}</span>
    <span class="toast-close">×</span>
  `;

    toastContainer.appendChild(toast);

    const closeToast = () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    };

    toast.querySelector('.toast-close').onclick = closeToast;

    // Auto-fade after 4 seconds
    setTimeout(closeToast, 4000);
}

function cleanDomain(input) {
    if (!input) return null;
    let domain = input.trim().toLowerCase();
    try {
        if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
            domain = 'https://' + domain;
        }
        const url = new URL(domain);
        return url.hostname.replace(/^www\./, '');
    } catch (e) {
        // Fallback for partial domains or strings with paths
        return domain.split('/')[0].replace(/^www\./, '');
    }
}

async function loadSites() {
    const { sites = [] } = await chrome.storage.sync.get('sites');
    allSites = sites;
    renderSites();
    filterAndRender();
}

function filterAndRender() {
    const rawQuery = domainInput.value.trim().toLowerCase();
    const cleanedQuery = cleanDomain(rawQuery);
    const items = siteList.querySelectorAll('.site-item');
    let hasVisible = false;

    items.forEach(item => {
        const domain = item.querySelector('.site-domain').innerText.toLowerCase();

        // Match if:
        // 1. Raw query is inside domain (e.g. "exa" in "example.com")
        // 2. Domain is inside cleaned query (e.g. "example.com" in "example.com/abc")
        // 3. Cleaned query matches domain exactly
        const isMatch = domain.includes(rawQuery) ||
            (cleanedQuery && (cleanedQuery === domain || cleanedQuery.includes(domain)));

        if (isMatch) {
            item.classList.remove('hidden');
            hasVisible = true;
        } else {
            item.classList.add('hidden');
        }
    });

    // Handle empty search results message
    let emptyMsg = siteList.querySelector('.empty-search-msg');

    if (!hasVisible && allSites.length > 0) {
        if (!emptyMsg) {
            emptyMsg = document.createElement('p');
            emptyMsg.className = 'empty-search-msg';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = '#999';
            emptyMsg.style.marginTop = '40px';
            emptyMsg.innerText = 'NO MATCHING SITES';
            siteList.appendChild(emptyMsg);
        }
        emptyMsg.style.display = 'block';
    } else if (emptyMsg) {
        emptyMsg.style.display = 'none';
    }
}

function renderSites() {
    siteList.innerHTML = '';
    if (allSites.length === 0) {
        siteList.innerHTML = '<p style="text-align: center; color: #999; margin-top: 40px;">NO SITES TRACKED</p>';
        return;
    }

    allSites.forEach((site) => {
        const div = document.createElement('div');
        div.className = 'site-item';
        div.innerHTML = `
      <span class="site-domain">${site.domain}</span>
      <div class="site-controls">
        <div class="timer-edit-wrapper">
          <input type="number" class="timer-input-inline" value="${site.timer}" min="1">
          <span class="timer-unit">MINS</span>
        </div>
        <button class="delete-btn" data-domain="${site.domain}">REMOVE</button>
      </div>
    `;

        // Add event listener for inline edit
        const tInput = div.querySelector('.timer-input-inline');
        tInput.addEventListener('change', async () => {
            const newTimer = parseInt(tInput.value) || 1;
            const index = allSites.findIndex(s => s.domain === site.domain);
            if (index > -1) {
                allSites[index].timer = newTimer;
                await chrome.storage.sync.set({ sites: allSites });
            }
        });

        siteList.appendChild(div);
    });
}

async function handleAddSite() {
    const rawInput = domainInput.value.trim();
    const domain = cleanDomain(rawInput);
    const timer = parseInt(timerInput.value) || 10;

    if (domain) {
        // Check for duplicates
        const existing = allSites.find(s => s.domain === domain);

        if (existing) {
            if (existing.domain === rawInput || domain === rawInput) {
                showToast("Site already added");
            } else {
                showToast(`Site already added ("${domain}" and "${rawInput}" are considered the same)`);
            }
            return;
        }

        // Unshift to top
        allSites.unshift({ domain, timer });
        await chrome.storage.sync.set({ sites: allSites });

        domainInput.value = '';
        timerInput.value = '';
        renderSites();
        filterAndRender();
    } else {
        showToast('Please enter a valid domain');
    }
}

addBtn.addEventListener('click', handleAddSite);

// Press Enter to add site
[domainInput, timerInput].forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleAddSite();
        }
    });
});

// Live search as user types
domainInput.addEventListener('input', filterAndRender);

siteList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const domain = e.target.dataset.domain;
        allSites = allSites.filter(s => s.domain !== domain);
        await chrome.storage.sync.set({ sites: allSites });
        renderSites();
        filterAndRender();
    }
});

loadSites();
