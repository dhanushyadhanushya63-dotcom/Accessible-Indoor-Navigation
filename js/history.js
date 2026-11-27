/* ===================================================================
   ACCESSIBLE INDOOR NAVIGATION - NAVIGATION HISTORY CONTROLLER
   Search, Filter by Status, Re-run Route & Persistence
   =================================================================== */

window.NavApp = window.NavApp || {};
const NavApp = window.NavApp;

document.addEventListener('DOMContentLoaded', () => {
  initHistoryPage();
});

function initHistoryPage() {
  renderHistoryTable();
  setupHistoryFiltersAndSearch();
  updateHistoryStats();
}

// 1. Render History Table with Filtering
function renderHistoryTable(filteredData = null) {
  const tbody = document.getElementById('history-tbody');
  if (!tbody) return;

  const data = filteredData || NavApp.history || [];

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5 text-muted">
          <i data-lucide="compass" style="width: 32px; height: 32px; color: #cbd5e1; margin-bottom: 8px;"></i>
          <p class="mb-0 fw-semibold">No matching navigation journeys found.</p>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons({ root: tbody });
    return;
  }

  tbody.innerHTML = data.map(item => `
    <tr>
      <td>
        <div class="fw-bold text-navy-950">${item.from}</div>
        <small class="text-muted">Origin Point</small>
      </td>
      <td>
        <div class="fw-bold text-primary">${item.to}</div>
        <small class="text-muted">Destination</small>
      </td>
      <td>
        <span class="badge-custom badge-cyan">${item.mode}</span>
      </td>
      <td>
        <div class="fw-semibold text-navy-900">${item.distance}</div>
        <small class="text-muted">${item.time}</small>
      </td>
      <td>
        <div class="small text-navy-700">${item.date}</div>
      </td>
      <td>
        <span class="badge-custom ${item.status.includes('Rerouted') ? 'badge-amber' : 'badge-emerald'}">
          ${item.status}
        </span>
      </td>
      <td class="text-end">
        <a href="floor-map.html?start=${getMatchingNodeId(item.from)}&dest=${getMatchingNodeId(item.to)}" class="btn btn-sm btn-primary" title="Re-run Route">
          <i data-lucide="navigation" style="width: 14px; height: 14px;"></i>
          <span>Re-run</span>
        </a>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons({ root: tbody });
}

function getMatchingNodeId(name) {
  const nodes = NavApp.graphNodes || {};
  for (const id in nodes) {
    if (nodes[id].name.toLowerCase().includes(name.toLowerCase()) || 
        (nodes[id].shortName && nodes[id].shortName.toLowerCase().includes(name.toLowerCase()))) {
      return id;
    }
  }
  return 'main-entrance';
}

// 2. Setup Search & Filter Handlers
function setupHistoryFiltersAndSearch() {
  const searchInput = document.getElementById('history-search-input');
  const statusFilter = document.getElementById('history-filter-status');
  const clearBtn = document.getElementById('btn-clear-history');

  function applyFilters() {
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const status = statusFilter ? statusFilter.value : 'all';

    let list = NavApp.history || [];

    if (query) {
      list = list.filter(item => 
        item.from.toLowerCase().includes(query) ||
        item.to.toLowerCase().includes(query) ||
        item.mode.toLowerCase().includes(query)
      );
    }

    if (status !== 'all') {
      if (status === 'rerouted') {
        list = list.filter(item => item.status.includes('Rerouted'));
      } else if (status === 'completed') {
        list = list.filter(item => item.status === 'Completed');
      } else if (status === 'wheelchair') {
        list = list.filter(item => item.mode.includes('Wheelchair'));
      }
    }

    renderHistoryTable(list);
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (statusFilter) statusFilter.addEventListener('change', applyFilters);

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your local route navigation history?')) {
        NavApp.history = [];
        saveHistory();
        renderHistoryTable();
        updateHistoryStats();
        showToast('History Cleared', 'Your navigation log has been reset.', 'info');
      }
    });
  }
}

// 3. Update History Stats Summary
function updateHistoryStats() {
  const totalCountEl = document.getElementById('stat-hist-total');
  const reroutedCountEl = document.getElementById('stat-hist-rerouted');
  const totalDistEl = document.getElementById('stat-hist-dist');

  const history = NavApp.history || [];
  if (totalCountEl) totalCountEl.textContent = history.length;

  const rerouted = history.filter(h => h.status.includes('Rerouted')).length;
  if (reroutedCountEl) reroutedCountEl.textContent = rerouted;

  // Approximate total distance
  let totalMeters = 0;
  history.forEach(h => {
    const m = parseInt(h.distance, 10);
    if (!isNaN(m)) totalMeters += m;
  });
  if (totalDistEl) totalDistEl.textContent = totalMeters + 'm';
}
