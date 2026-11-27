/* ===================================================================
   ACCESSIBLE INDOOR NAVIGATION & ROUTE PLANNER - MAIN JAVASCRIPT
   Core App State, Accessibility Controller, Toasts & Shared Data
   =================================================================== */

// Global App Namespace
window.NavApp = window.NavApp || {};
const NavApp = window.NavApp;

// Default Obstacle State
const DEFAULT_OBSTACLES = [
  {
    id: 'obs-corridor-b',
    location: 'Corridor B (Central Link)',
    corridorId: 'corridor-b',
    type: 'Floor Maintenance & Wet Surface',
    severity: 'high',
    blocked: true,
    reportedAt: '10 mins ago',
    details: 'Deep tile cleaning and buffing in progress. Slippery floor hazard.'
  },
  {
    id: 'obs-staircase-north',
    location: 'North Stairwell',
    corridorId: 'staircase',
    type: 'Handrail Repair',
    severity: 'medium',
    blocked: false,
    reportedAt: '2 hours ago',
    details: 'Scheduled mechanical handrail reinforcement.'
  },
  {
    id: 'obs-west-ramp',
    location: 'West Wing Ramp Entrance',
    corridorId: 'west-ramp',
    type: 'Temporary Equipment Unloading',
    severity: 'low',
    blocked: false,
    reportedAt: '35 mins ago',
    details: 'Audio-visual equipment delivery. Cleared for pedestrian traffic.'
  }
];

// Default Accessibility Settings
const DEFAULT_SETTINGS = {
  highContrast: false,
  largeText: false,
  wheelchairMode: true,
  avoidStairs: true,
  preferElevator: true,
  voiceGuidance: false,
  audioFeedback: true
};

// Initialize App State from LocalStorage
function initAppState() {
  // Load Settings
  const savedSettings = localStorage.getItem('nav_settings');
  NavApp.settings = savedSettings ? JSON.parse(savedSettings) : { ...DEFAULT_SETTINGS };

  // Load Obstacles
  const savedObstacles = localStorage.getItem('nav_obstacles');
  NavApp.obstacles = savedObstacles ? JSON.parse(savedObstacles) : [ ...DEFAULT_OBSTACLES ];

  // Load History
  const savedHistory = localStorage.getItem('nav_history');
  NavApp.history = savedHistory ? JSON.parse(savedHistory) : [
    {
      id: 'hist-1',
      from: 'Main Entrance',
      to: 'Seminar Hall',
      mode: 'Wheelchair (Stair-Free)',
      distance: '115m',
      time: '2.5 min',
      date: 'Today, 10:15 AM',
      status: 'Rerouted (Obstacle Avoided)'
    },
    {
      id: 'hist-2',
      from: 'Room 101',
      to: 'Library',
      mode: 'Stair-Free / Elevator',
      distance: '85m',
      time: '1.8 min',
      date: 'Yesterday, 3:40 PM',
      status: 'Completed'
    },
    {
      id: 'hist-3',
      from: 'Reception',
      to: 'Computer Lab',
      mode: 'Standard Walk',
      distance: '70m',
      time: '1.4 min',
      date: 'Yesterday, 11:20 AM',
      status: 'Completed'
    }
  ];

  applyA11yPreferences();
}

// Apply accessibility classes to document body
function applyA11yPreferences() {
  const body = document.body;
  if (!body) return;

  if (NavApp.settings.highContrast) {
    body.classList.add('high-contrast');
  } else {
    body.classList.remove('high-contrast');
  }

  if (NavApp.settings.largeText) {
    body.classList.add('large-text');
  } else {
    body.classList.remove('large-text');
  }
}

// Toggle High Contrast Mode
function toggleHighContrast() {
  NavApp.settings.highContrast = !NavApp.settings.highContrast;
  saveSettings();
  applyA11yPreferences();
  showToast(
    'Display Mode Updated',
    NavApp.settings.highContrast ? 'High Contrast Mode enabled for maximum legibility.' : 'Standard color theme restored.',
    'info'
  );
}

// Toggle Large Text Mode
function toggleLargeText() {
  NavApp.settings.largeText = !NavApp.settings.largeText;
  saveSettings();
  applyA11yPreferences();
  showToast(
    'Text Size Adjusted',
    NavApp.settings.largeText ? 'Enlarged text mode active.' : 'Default font size restored.',
    'info'
  );
}

// Save Settings to LocalStorage
function saveSettings() {
  localStorage.setItem('nav_settings', JSON.stringify(NavApp.settings));
}

// Save Obstacles to LocalStorage
function saveObstacles() {
  localStorage.setItem('nav_obstacles', JSON.stringify(NavApp.obstacles));
  // Dispatch custom event so active pages re-sync automatically
  window.dispatchEvent(new CustomEvent('obstacles-updated', { detail: NavApp.obstacles }));
}

// Save History to LocalStorage
function saveHistory() {
  localStorage.setItem('nav_history', JSON.stringify(NavApp.history));
}

// Toast Notification Engine
function showToast(title, message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `saas-toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'warning') iconName = 'alert-triangle';
  if (type === 'danger')  iconName = 'alert-octagon';

  toast.innerHTML = `
    <i data-lucide="${iconName}" style="flex-shrink:0; width:20px; height:20px; margin-top:2px;"></i>
    <div style="flex:1;">
      <div class="toast-title">${title}</div>
      <p class="toast-msg">${message}</p>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close notification">
      <i data-lucide="x" style="width:16px; height:16px;"></i>
    </button>
  `;

  container.appendChild(toast);
  if (window.lucide) {
    lucide.createIcons({ root: toast });
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Voice Speech Synthesis Simulation (Accessible Screen Reader Guidance)
function speakInstruction(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

// Setup Global UI on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initAppState();

  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Sidebar Mobile Toggle
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebar = document.querySelector('.app-sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  if (sidebarToggleBtn && sidebar) {
    sidebarToggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('show');
      if (overlay) overlay.classList.toggle('show');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('show');
      overlay.classList.remove('show');
    });
  }

  // Sidebar Desktop Collapse Toggle
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      if (window.lucide) lucide.createIcons();
    });
  }

  // Bind any high-contrast or font toggles present on current page
  const contrastToggles = document.querySelectorAll('.toggle-contrast-btn');
  contrastToggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleHighContrast();
    });
  });

  const fontToggles = document.querySelectorAll('.toggle-font-btn');
  fontToggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleLargeText();
    });
  });
});
