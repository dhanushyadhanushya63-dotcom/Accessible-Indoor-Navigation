/* ===================================================================
   ACCESSIBLE INDOOR NAVIGATION - INTERACTIVE SVG FLOOR MAP CONTROLLER
   Pan & Zoom, Neon Route Drawing, Pulsing Pins, Obstacle Overlay & Popups
   =================================================================== */

window.NavApp = window.NavApp || {};
const NavApp = window.NavApp;

class FloorMapController {
  constructor(options = {}) {
    this.container = document.querySelector(options.containerSelector || '.map-viewport');
    this.canvasLayer = document.querySelector(options.canvasSelector || '.map-canvas-layer');
    this.svgElement = document.getElementById(options.svgId || 'floor-plan-svg');

    // Pan & Zoom state
    this.scale = 1;
    this.minScale = 0.6;
    this.maxScale = 2.4;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;

    // Navigation state
    this.startNodeId = options.initialStart || 'main-entrance';
    this.destNodeId = options.initialDest || 'seminar-hall';
    this.activeFloor = 0; // 0: Ground Floor, 1: Level 1, 2: Level 2
    this.avoidStairs = true;
    this.wheelchairMode = true;

    this.init();
  }

  init() {
    if (!this.svgElement) return;

    this.setupPanAndZoom();
    this.setupRoomInteractions();
    this.setupFloorSwitchers();
    this.renderObstacleOverlays();
    this.calculateAndRenderRoute();

    // Listen for global obstacle changes from obstacles.html or storage
    window.addEventListener('obstacles-updated', () => {
      this.renderObstacleOverlays();
      this.calculateAndRenderRoute();
    });
  }

  // Pan and Zoom Controls
  setupPanAndZoom() {
    if (!this.container || !this.canvasLayer) return;

    // Mouse drag pan
    this.container.addEventListener('mousedown', (e) => {
      // Don't pan if clicking an interactive button or room directly
      if (e.target.closest('.map-floating-controls') || e.target.closest('.room-details-card')) return;
      this.isDragging = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      this.container.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.container) this.container.style.cursor = 'grab';
      }
    });

    // Mouse wheel zoom
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      this.zoom(zoomFactor);
    }, { passive: false });

    // Floating Zoom Buttons
    const btnZoomIn = document.getElementById('map-btn-zoom-in');
    const btnZoomOut = document.getElementById('map-btn-zoom-out');
    const btnReset = document.getElementById('map-btn-reset');
    const btnCenter = document.getElementById('map-btn-center');

    if (btnZoomIn) btnZoomIn.addEventListener('click', () => this.zoom(1.2));
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => this.zoom(0.8));
    if (btnReset) btnReset.addEventListener('click', () => this.resetView());
    if (btnCenter) btnCenter.addEventListener('click', () => this.centerOnRoute());
  }

  zoom(factor) {
    const newScale = Math.min(Math.max(this.scale * factor, this.minScale), this.maxScale);
    this.scale = newScale;
    this.updateTransform();
  }

  resetView() {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.updateTransform();
  }

  centerOnRoute() {
    this.scale = 1.05;
    this.panX = 0;
    this.panY = -20;
    this.updateTransform();
  }

  updateTransform() {
    if (this.canvasLayer) {
      this.canvasLayer.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    }
  }

  // Room Click & Hover Interactions
  setupRoomInteractions() {
    const rooms = this.svgElement.querySelectorAll('.map-room');
    rooms.forEach(room => {
      room.addEventListener('click', (e) => {
        e.stopPropagation();
        const roomId = room.getAttribute('data-room-id');
        this.showRoomDetails(roomId);
      });
    });

    // Close room card when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.room-details-card') && !e.target.closest('.map-room')) {
        const card = document.getElementById('room-details-card');
        if (card) card.classList.remove('show');
      }
    });
  }

  // Show Room Details Card
  showRoomDetails(nodeId) {
    const node = NavApp.graphNodes[nodeId];
    if (!node) return;

    const card = document.getElementById('room-details-card');
    if (!card) return;

    const titleEl = card.querySelector('.room-details-title');
    const catEl = card.querySelector('.room-details-category');
    const descEl = card.querySelector('.room-details-desc');
    const startBtn = card.querySelector('.btn-set-start');
    const destBtn = card.querySelector('.btn-set-dest');

    if (titleEl) titleEl.textContent = node.name;
    if (catEl) catEl.textContent = node.category || 'Academic Facility';
    if (descEl) descEl.textContent = node.description || 'Wheelchair accessible indoor space with broad door clearance and level threshold.';

    // Bind action buttons
    if (startBtn) {
      startBtn.onclick = () => {
        this.setStartLocation(nodeId);
        card.classList.remove('show');
        showToast('Start Location Set', `Route will start from ${node.name}.`, 'info');
      };
    }

    if (destBtn) {
      destBtn.onclick = () => {
        this.setDestinationLocation(nodeId);
        card.classList.remove('show');
        showToast('Destination Set', `Guiding you directly to ${node.name}.`, 'success');
      };
    }

    card.classList.add('show');
    if (window.lucide) lucide.createIcons({ root: card });
  }

  // Floor Switcher
  setupFloorSwitchers() {
    const floorBtns = document.querySelectorAll('.floor-btn');
    floorBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        floorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const floor = parseInt(btn.getAttribute('data-floor'), 10);
        this.activeFloor = floor;
        
        if (floor === 0) {
          showToast('Floor Switched', 'Viewing Ground Floor (Level 0). Main accessible routes active.', 'info');
        } else {
          showToast('Floor Switched', `Viewing Level ${floor}. Access via Elevator A recommended for wheelchair users.`, 'info');
        }
        this.calculateAndRenderRoute();
      });
    });
  }

  // Render Obstacle Overlays on SVG
  renderObstacleOverlays() {
    const obstacleGroup = document.getElementById('svg-obstacles-layer');
    if (!obstacleGroup) return;
    obstacleGroup.innerHTML = '';

    const obstacles = NavApp.obstacles || [];
    obstacles.forEach(obs => {
      if (!obs.blocked) return;

      // Obstacle in Corridor B
      if (obs.corridorId === 'corridor-b') {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', '710');
        rect.setAttribute('y', '360');
        rect.setAttribute('width', '60');
        rect.setAttribute('height', '110');
        rect.setAttribute('rx', '8');
        rect.setAttribute('class', 'blocked-corridor-zone');
        rect.setAttribute('data-obs-id', obs.id);
        
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `Blocked: ${obs.type} - ${obs.details}`;
        rect.appendChild(title);
        obstacleGroup.appendChild(rect);

        // Warning Icon text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '740');
        text.setAttribute('y', '420');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '18');
        text.setAttribute('class', 'obstacle-marker');
        text.textContent = '⛔';
        obstacleGroup.appendChild(text);
      }
    });
  }

  // Set Start Location
  setStartLocation(nodeId) {
    this.startNodeId = nodeId;
    const startSelect = document.getElementById('select-start-loc');
    if (startSelect) startSelect.value = nodeId;
    this.calculateAndRenderRoute();
  }

  // Set Destination
  setDestinationLocation(nodeId) {
    this.destNodeId = nodeId;
    const destSelect = document.getElementById('select-dest-loc');
    if (destSelect) destSelect.value = nodeId;
    this.calculateAndRenderRoute();
  }

  // Calculate & Draw Route Path
  calculateAndRenderRoute() {
    const routeLayer = document.getElementById('svg-routes-layer');
    const pinsLayer = document.getElementById('svg-pins-layer');
    if (!routeLayer || !pinsLayer) return;

    routeLayer.innerHTML = '';
    pinsLayer.innerHTML = '';

    // Clear previous room highlight classes
    this.svgElement.querySelectorAll('.map-room').forEach(rm => {
      rm.classList.remove('is-start', 'is-destination');
    });

    const startNode = NavApp.graphNodes[this.startNodeId];
    const destNode = NavApp.graphNodes[this.destNodeId];

    if (!startNode || !destNode) return;

    // Highlight rooms
    const startRoomEl = this.svgElement.querySelector(`[data-room-id="${this.startNodeId}"]`);
    if (startRoomEl) startRoomEl.classList.add('is-start');

    const destRoomEl = this.svgElement.querySelector(`[data-room-id="${this.destNodeId}"]`);
    if (destRoomEl) destRoomEl.classList.add('is-destination');

    // Calculate Accessible Shortest Route with Obstacle Awareness
    const result = NavApp.findShortestRoute(this.startNodeId, this.destNodeId, {
      avoidStairs: this.avoidStairs,
      wheelchairMode: this.wheelchairMode,
      avoidObstacles: true
    });

    if (!result || !result.path || result.path.length < 2) {
      this.updateHudMetrics('0m', '0 min', 'No clear path (Obstacles block access)');
      return;
    }

    // Convert path nodes to SVG coordinates
    const points = result.path.map(nodeId => {
      const n = NavApp.graphNodes[nodeId];
      return { x: n.x, y: n.y };
    });

    // Build SVG path data string
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }

    // 1. Draw glowing background blur path
    const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glowPath.setAttribute('d', d);
    glowPath.setAttribute('class', 'route-path-accessible-glow');
    routeLayer.appendChild(glowPath);

    // 2. Draw animated cyan route line
    const activePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    activePath.setAttribute('d', d);
    activePath.setAttribute('class', 'route-path-accessible');
    routeLayer.appendChild(activePath);

    // 3. Render Start Pin (Pulsing Emerald Beacon)
    this.renderStartPin(pinsLayer, points[0].x, points[0].y);

    // 4. Render Destination Pin (Pulsing Royal Blue Beacon)
    const lastPoint = points[points.length - 1];
    this.renderDestinationPin(pinsLayer, lastPoint.x, lastPoint.y);

    // 5. Update Metrics & HUD
    this.updateHudMetrics(result.distance + 'm', result.travelTime, result.isAccessible ? '100% Step-Free Accessible' : 'Standard Pedestrian Path');
    this.updateGuidanceHud(result.instructions);
  }

  renderStartPin(layer, x, y) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${x}, ${y})`);

    // Radar pulse circle
    const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pulse.setAttribute('r', '8');
    pulse.setAttribute('class', 'pin-start-pulse');
    g.appendChild(pulse);

    // Center core pin
    const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    core.setAttribute('r', '9');
    core.setAttribute('class', 'pin-start-circle');
    g.appendChild(core);

    layer.appendChild(g);
  }

  renderDestinationPin(layer, x, y) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${x}, ${y})`);

    // Radar pulse circle
    const pulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pulse.setAttribute('r', '8');
    pulse.setAttribute('class', 'pin-dest-pulse');
    g.appendChild(pulse);

    // Center core pin
    const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    core.setAttribute('r', '10');
    core.setAttribute('class', 'pin-dest-circle');
    g.appendChild(core);

    layer.appendChild(g);
  }

  updateHudMetrics(distance, time, status) {
    const distEl = document.getElementById('hud-metric-distance');
    const timeEl = document.getElementById('hud-metric-time');
    const statusEl = document.getElementById('hud-metric-status');

    if (distEl) distEl.textContent = distance;
    if (timeEl) timeEl.textContent = time;
    if (statusEl) statusEl.textContent = status;
  }

  updateGuidanceHud(instructions) {
    const hud = document.getElementById('map-guidance-hud');
    if (!hud || !instructions || instructions.length === 0) return;

    const firstStep = instructions[0];
    const textEl = hud.querySelector('.hud-text');
    const subtextEl = hud.querySelector('.hud-subtext');

    if (textEl) textEl.textContent = firstStep.text;
    if (subtextEl) subtextEl.textContent = firstStep.subtext;
  }
}

// Export controller
NavApp.FloorMapController = FloorMapController;
