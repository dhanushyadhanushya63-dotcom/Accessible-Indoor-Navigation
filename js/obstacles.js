/* ===================================================================
   ACCESSIBLE INDOOR NAVIGATION - OBSTACLE MANAGER JAVASCRIPT
   Corridor Block/Unblock Toggles, Add Modal, Live Reroute Recalculation
   =================================================================== */

window.NavApp = window.NavApp || {};
const NavApp = window.NavApp;

document.addEventListener('DOMContentLoaded', () => {
  initObstacleManager();
});

function initObstacleManager() {
  renderObstaclesTable();
  setupAddObstacleModal();
  updateLiveRouteImpact();
}

// 1. Render Obstacles Management Table
function renderObstaclesTable() {
  const tbody = document.getElementById('obstacles-tbody');
  if (!tbody) return;

  const obstacles = NavApp.obstacles || [];
  if (obstacles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No corridors or pathways registered.</td></tr>`;
    return;
  }

  tbody.innerHTML = obstacles.map(obs => {
    let badgeClass = 'badge-emerald';
    let statusText = 'Operational / Clear';
    if (obs.blocked) {
      badgeClass = obs.severity === 'high' ? 'badge-rose' : 'badge-amber';
      statusText = obs.blocked ? 'Blocked' : 'Scheduled';
    }

    return `
      <tr id="row-${obs.id}">
        <td>
          <div class="fw-bold text-navy-950">${obs.location}</div>
          <small class="text-muted">${obs.corridorId ? `ID: ${obs.corridorId}` : 'General Transit'}</small>
        </td>
        <td>
          <span class="badge-custom ${badgeClass}">
            <span class="animate-pulse-dot" style="display:inline-block; width:6px; height:6px; background:currentColor; border-radius:50%;"></span>
            ${statusText}
          </span>
        </td>
        <td>
          <div class="text-navy-900 small fw-semibold">${obs.type}</div>
          <div class="text-muted" style="font-size: 0.75rem;">${obs.details}</div>
        </td>
        <td>
          <span class="badge-custom ${obs.severity === 'high' ? 'badge-rose' : (obs.severity === 'medium' ? 'badge-amber' : 'badge-cyan')}">
            ${obs.severity.toUpperCase()}
          </span>
        </td>
        <td>
          <div class="form-check form-switch">
            <input class="form-check-input corridor-toggle" type="checkbox" role="switch" 
                   data-obs-id="${obs.id}" ${obs.blocked ? 'checked' : ''} 
                   id="toggle-${obs.id}">
            <label class="form-check-label small text-muted" for="toggle-${obs.id}">
              ${obs.blocked ? '<span class="text-danger fw-semibold">Blocked</span>' : '<span class="text-success fw-semibold">Open</span>'}
            </label>
          </div>
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-icon btn-light text-danger btn-delete-obs" data-obs-id="${obs.id}" title="Remove Obstacle Record">
            <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons({ root: tbody });

  // Bind Toggle Switches
  document.querySelectorAll('.corridor-toggle').forEach(switchEl => {
    switchEl.addEventListener('change', (e) => {
      const obsId = e.target.getAttribute('data-obs-id');
      const isBlocked = e.target.checked;
      toggleObstacleStatus(obsId, isBlocked);
    });
  });

  // Bind Delete Buttons
  document.querySelectorAll('.btn-delete-obs').forEach(btn => {
    btn.addEventListener('click', () => {
      const obsId = btn.getAttribute('data-obs-id');
      deleteObstacle(obsId);
    });
  });
}

// 2. Toggle Obstacle Block Status
function toggleObstacleStatus(obsId, isBlocked) {
  const obs = NavApp.obstacles.find(o => o.id === obsId);
  if (!obs) return;

  obs.blocked = isBlocked;
  saveObstacles();
  renderObstaclesTable();
  updateLiveRouteImpact();

  if (isBlocked) {
    showToast(
      'Corridor Blocked',
      `${obs.location} is now marked BLOCKED. Routes are automatically recalculating around this path.`,
      'warning'
    );
  } else {
    showToast(
      'Corridor Cleared',
      `${obs.location} is now OPEN. Direct route access has been restored.`,
      'success'
    );
  }
}

// 3. Delete Obstacle
function deleteObstacle(obsId) {
  const index = NavApp.obstacles.findIndex(o => o.id === obsId);
  if (index === -1) return;

  const deletedName = NavApp.obstacles[index].location;
  NavApp.obstacles.splice(index, 1);
  saveObstacles();
  renderObstaclesTable();
  updateLiveRouteImpact();

  showToast('Obstacle Removed', `Cleared incident report for ${deletedName}.`, 'info');
}

// 4. Setup Add Obstacle Modal
function setupAddObstacleModal() {
  const form = document.getElementById('add-obstacle-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const location = document.getElementById('new-obs-location').value;
    const corridorId = document.getElementById('new-obs-corridor-id').value;
    const type = document.getElementById('new-obs-type').value;
    const severity = document.getElementById('new-obs-severity').value;
    const details = document.getElementById('new-obs-details').value;

    const newObs = {
      id: 'obs-' + Date.now(),
      location,
      corridorId,
      type,
      severity,
      blocked: true,
      reportedAt: 'Just now',
      details: details || 'Temporary restriction reported by campus facility team.'
    };

    NavApp.obstacles.unshift(newObs);
    saveObstacles();
    renderObstaclesTable();
    updateLiveRouteImpact();

    // Close Modal via Bootstrap
    const modalEl = document.getElementById('addObstacleModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.hide();
    form.reset();

    showToast('Obstacle Broadcasted', `New blockage logged at ${location}. Real-time reroute active.`, 'danger');
  });
}

// 5. Update Live Route Impact Visualization
function updateLiveRouteImpact() {
  const impactCard = document.getElementById('route-impact-card');
  if (!impactCard) return;

  // Calculate route from Main Entrance to Seminar Hall under current obstacle conditions
  const route = NavApp.findShortestRoute('main-entrance', 'seminar-hall', {
    avoidStairs: true,
    wheelchairMode: true,
    avoidObstacles: true
  });

  const corridorBBlocked = NavApp.obstacles.some(o => o.corridorId === 'corridor-b' && o.blocked);

  const statusTitle = document.getElementById('impact-route-title');
  const statusDesc = document.getElementById('impact-route-desc');
  const statusDist = document.getElementById('impact-route-dist');
  const statusBadge = document.getElementById('impact-route-badge');

  if (corridorBBlocked) {
    if (statusTitle) statusTitle.textContent = 'Detour Route Active (Via Garden Terrace Ramp)';
    if (statusDesc) statusDesc.textContent = 'Corridor B is currently blocked. The navigation engine automatically diverts users around the maintenance zone using the exterior smooth concrete ramp.';
    if (statusDist) statusDist.textContent = route ? `${route.distance}m (~${route.travelTime})` : 'Blocked';
    if (statusBadge) {
      statusBadge.className = 'badge-custom badge-amber';
      statusBadge.textContent = 'Automatic Detour (Corridor B Avoided)';
    }
  } else {
    if (statusTitle) statusTitle.textContent = 'Optimal Direct Corridor Route Active';
    if (statusDesc) statusDesc.textContent = 'Corridor B is fully open. Users follow the straight indoor hallway through Corridor A East directly to Seminar Hall.';
    if (statusDist) statusDist.textContent = route ? `${route.distance}m (~${route.travelTime})` : '86m';
    if (statusBadge) {
      statusBadge.className = 'badge-custom badge-emerald';
      statusBadge.textContent = 'Direct Walkway Restored';
    }
  }
}
