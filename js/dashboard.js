/* ===================================================================
   ACCESSIBLE INDOOR NAVIGATION - DASHBOARD CONTROLLER
   Animated Stat Counters, Quick Route Launcher, History Feed & Alerts
   =================================================================== */

window.NavApp = window.NavApp || {};
const NavApp = window.NavApp;

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

function initDashboard() {
  animateCounters();
  populateQuickNavDropdowns();
  renderDashboardObstacleAlerts();
  renderRecentHistory();
  setupQuickNavHandler();
}

// 1. Animate Numerical Counters
function animateCounters() {
  const counters = document.querySelectorAll('.animate-counter');
  counters.forEach(counter => {
    const target = parseFloat(counter.getAttribute('data-target'));
    const isDecimal = counter.getAttribute('data-decimal') === 'true';
    const suffix = counter.getAttribute('data-suffix') || '';
    const duration = 1200; // ms
    const startTime = performance.now();

    function updateCount(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = easeProgress * target;

      if (isDecimal) {
        counter.textContent = currentVal.toFixed(1) + suffix;
      } else {
        counter.textContent = Math.floor(currentVal) + suffix;
      }

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        if (isDecimal) counter.textContent = target.toFixed(1) + suffix;
        else counter.textContent = target + suffix;
      }
    }

    requestAnimationFrame(updateCount);
  });
}

// 2. Populate Quick Navigation Dropdowns
function populateQuickNavDropdowns() {
  const startSelect = document.getElementById('dash-start-select');
  const destSelect = document.getElementById('dash-dest-select');

  if (!startSelect || !destSelect || !NavApp.graphNodes) return;

  startSelect.innerHTML = '';
  destSelect.innerHTML = '';

  const nodes = NavApp.graphNodes;
  for (const id in nodes) {
    const node = nodes[id];
    // Exclude simple hallway waypoints from primary room choices for clarity
    if (node.category === 'Hallway') continue;

    const optStart = document.createElement('option');
    optStart.value = id;
    optStart.textContent = `${node.shortName || node.name} (${node.category})`;
    if (id === 'main-entrance') optStart.selected = true;
    startSelect.appendChild(optStart);

    const optDest = document.createElement('option');
    optDest.value = id;
    optDest.textContent = `${node.shortName || node.name} (${node.category})`;
    if (id === 'seminar-hall') optDest.selected = true;
    destSelect.appendChild(optDest);
  }
}

// 3. Render Dashboard Obstacle Alerts
function renderDashboardObstacleAlerts() {
  const container = document.getElementById('dash-obstacle-alerts');
  if (!container) return;

  const obstacles = NavApp.obstacles || [];
  const activeObstacles = obstacles.filter(o => o.blocked);

  if (activeObstacles.length === 0) {
    container.innerHTML = `
      <div class="p-3 rounded-3 bg-success-subtle border border-success-subtle d-flex align-items-center gap-3">
        <i data-lucide="check-circle" class="text-success" style="width: 20px; height: 20px;"></i>
        <div class="small">
          <strong class="text-success d-block">All Corridors Fully Operational</strong>
          <span class="text-muted">Zero active obstacles detected across Campus Building 1.</span>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = activeObstacles.map(obs => `
      <div class="p-3 rounded-3 bg-danger-subtle border border-danger-subtle d-flex align-items-start justify-content-between gap-3 mb-2">
        <div class="d-flex align-items-start gap-2">
          <i data-lucide="alert-octagon" class="text-danger flex-shrink-0 mt-1" style="width: 18px; height: 18px;"></i>
          <div>
            <div class="fw-bold text-danger small">${obs.location} - ${obs.type}</div>
            <div class="text-muted" style="font-size: 0.775rem;">${obs.details} (Reported ${obs.reportedAt})</div>
          </div>
        </div>
        <a href="floor-map.html" class="btn btn-sm btn-soft-rose text-nowrap">View on Map</a>
      </div>
    `).join('');
  }

  if (window.lucide) lucide.createIcons({ root: container });
}

// 4. Render Recent Navigation History
function renderRecentHistory() {
  const tbody = document.getElementById('dash-history-tbody');
  if (!tbody) return;

  const history = NavApp.history || [];
  if (history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No navigation history yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = history.slice(0, 5).map(item => `
    <tr>
      <td class="fw-semibold text-navy-900">${item.from}</td>
      <td class="fw-semibold text-primary">${item.to}</td>
      <td>
        <span class="badge-custom badge-cyan">${item.mode}</span>
      </td>
      <td>
        <span class="small fw-semibold text-navy-800">${item.distance}</span>
        <span class="text-muted small">(${item.time})</span>
      </td>
      <td>
        <span class="badge-custom ${item.status.includes('Rerouted') ? 'badge-amber' : 'badge-emerald'}">
          ${item.status}
        </span>
      </td>
      <td class="text-end">
        <a href="floor-map.html?start=${getMatchingNodeId(item.from)}&dest=${getMatchingNodeId(item.to)}" class="btn btn-sm btn-soft-primary" title="Re-run Route">
          <i data-lucide="navigation" style="width: 14px; height: 14px;"></i>
          <span class="d-none d-md-inline ms-1">Navigate</span>
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

// 5. Quick Nav Form Submit
function setupQuickNavHandler() {
  const form = document.getElementById('dash-quick-nav-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const start = document.getElementById('dash-start-select').value;
    const dest = document.getElementById('dash-dest-select').value;

    if (start === dest) {
      showToast('Same Origin & Destination', 'Please select a different destination room.', 'warning');
      return;
    }

    showToast('Calculating Accessible Route', 'Opening interactive floor plan...', 'info');
    setTimeout(() => {
      window.location.href = `floor-map.html?start=${start}&dest=${dest}`;
    }, 400);
  });
}
