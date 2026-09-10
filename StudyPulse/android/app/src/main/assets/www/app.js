/**
 * StudyPulse - iPhone Liquidity Minimalist Offline Engine
 * Clean Onboarding & User Setup First | Blank-Slate Workspace
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'studypulse_liquid_v2';

  // State Structure
  let state = {
    user: {
      name: '',
      level: 'Senior High School (SHS)',
      track: 'General Science',
      subjects: [],
      prepGoal: 60,
      isSetupComplete: false
    },
    activeDay: new Date().getDay() === 0 ? 0 : new Date().getDay(), // 0=Sun, 1=Mon, ...
    activeFilter: 'all',
    timetable: [],
    assignments: [],
    dailyGoals: [],
    habits: [],
    customTimerPresets: [],
    studyStats: {
      todayMinutes: 0,
      lastDate: new Date().toISOString().split('T')[0]
    }
  };

  // Preset subject maps by track
  const TRACK_SUBJECTS = {
    'General Science': 'Core Mathematics, Integrated Science, English Language, Social Studies, Elective Mathematics, Physics, Chemistry, Biology',
    'General Arts': 'Core Mathematics, Integrated Science, English Language, Social Studies, Government, Literature in English, Economics, History',
    'Business': 'Core Mathematics, Integrated Science, English Language, Social Studies, Financial Accounting, Business Management, Cost Accounting, Economics',
    'Visual Arts': 'Core Mathematics, Integrated Science, English Language, Social Studies, Graphic Design, Picture Making, Textiles',
    'Home Economics': 'Core Mathematics, Integrated Science, English Language, Social Studies, Food & Nutrition, Clothing & Textiles, Management in Living',
    'Custom': ''
  };

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state = JSON.parse(saved);
        if (!state.customTimerPresets) state.customTimerPresets = [];
        const todayStr = new Date().toISOString().split('T')[0];
        if (state.studyStats && state.studyStats.lastDate !== todayStr) {
          state.studyStats.todayMinutes = 0;
          state.studyStats.lastDate = todayStr;
        }
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  // ==========================================================================
  // 1. Initial Screen Routing: Intro Onboarding vs. Dashboard
  // ==========================================================================
  function renderScreen() {
    const viewIntro = document.getElementById('view-intro');
    const viewDash = document.getElementById('view-dashboard');
    const userLabel = document.getElementById('header-user-label');

    if (!state.user.isSetupComplete) {
      if (viewIntro) viewIntro.style.display = 'block';
      if (viewDash) viewDash.style.display = 'none';
      if (userLabel) userLabel.textContent = 'Setup';
    } else {
      if (viewIntro) viewIntro.style.display = 'none';
      if (viewDash) viewDash.style.display = 'flex';
      if (userLabel) userLabel.textContent = state.user.name || 'Profile';
      updateSubjectDatalists();
      renderDashboard();
    }
  }

  function updateSubjectDatalists() {
    const datalist = document.getElementById('user-subjects-datalist');
    if (!datalist) return;
    datalist.innerHTML = state.user.subjects.map(s => `<option value="${escapeHTML(s)}">`).join('');
  }

  // ==========================================================================
  // 2. Intro Setup Interactions
  // ==========================================================================
  function setupIntroForm() {
    const form = document.getElementById('form-intro-setup');
    const subjectsInput = document.getElementById('intro-subjects-input');

    // School Level Chips
    setupChipGroup('#school-level-chips .select-chip', (chip) => {
      state.user.level = chip.dataset.level;
    });

    // Program Track Chips
    setupChipGroup('#program-track-chips .select-chip', (chip) => {
      state.user.track = chip.dataset.track;
      if (subjectsInput && TRACK_SUBJECTS[chip.dataset.track] !== undefined) {
        subjectsInput.value = TRACK_SUBJECTS[chip.dataset.track];
      }
    });

    // Prep Goal Chips
    setupChipGroup('#prep-goal-chips .select-chip', (chip) => {
      state.user.prepGoal = parseInt(chip.dataset.goal, 10);
    });

    // Handle Form Submit
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('intro-name').value.trim();
        const rawSubs = subjectsInput ? subjectsInput.value : '';

        const subjectsList = rawSubs.split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        state.user.name = name;
        state.user.subjects = subjectsList.length > 0 ? subjectsList : ['Core Mathematics', 'Integrated Science', 'English Language', 'Social Studies'];
        state.user.isSetupComplete = true;

        saveState();
        renderScreen();
      });
    }
  }

  function setupChipGroup(selector, onSelect) {
    const chips = document.querySelectorAll(selector);
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (onSelect) onSelect(chip);
      });
    });
  }

  // ==========================================================================
  // 3. Dashboard Segment Navigation
  // ==========================================================================
  function setupDashboardNavigation() {
    const navButtons = document.querySelectorAll('.segment-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        tabPanes.forEach(pane => {
          if (pane.id === `tab-${targetTab}`) {
            pane.style.display = 'block';
          } else {
            pane.style.display = 'none';
          }
        });

        if (targetTab === 'assistant') renderAssistantTab();
        if (targetTab === 'timetable') renderTimetableTab();
        if (targetTab === 'assignments') renderAssignmentsTab();
        if (targetTab === 'goals') renderGoalsTab();
        if (targetTab === 'focus') updateTimerDisplay();
      });
    });

    // Quick Action button shortcuts in Assistant card
    const btnQuickAddTask = document.getElementById('btn-quick-add-task');
    if (btnQuickAddTask) {
      btnQuickAddTask.addEventListener('click', () => openModal('modal-assignment'));
    }

    const btnQuickAddPeriod = document.getElementById('btn-quick-add-period');
    if (btnQuickAddPeriod) {
      btnQuickAddPeriod.addEventListener('click', () => openModal('modal-timetable'));
    }

    const btnQuickTimer = document.getElementById('btn-quick-timer');
    if (btnQuickTimer) {
      btnQuickTimer.addEventListener('click', () => {
        const focusBtn = document.querySelector('.segment-btn[data-tab="focus"]');
        if (focusBtn) focusBtn.click();
      });
    }
  }

  // ==========================================================================
  // 4. Assistant Tab
  // ==========================================================================
  function renderAssistantTab() {
    const greetingEl = document.getElementById('dash-greeting');
    const messageEl = document.getElementById('dash-assistant-msg');
    const tasksContainer = document.getElementById('dash-tasks-container');
    const badgeUrgent = document.getElementById('badge-urgent-count');
    const calloutTitle = document.getElementById('dash-callout-title');
    const calloutDesc = document.getElementById('dash-callout-desc');

    if (greetingEl) greetingEl.textContent = `Hello, ${state.user.name || 'Student'}`;

    const pending = state.assignments.filter(a => !a.completed);
    if (badgeUrgent) badgeUrgent.textContent = `${pending.length} tasks`;

    if (pending.length === 0) {
      if (messageEl) messageEl.textContent = `Your schedule is completely clear right now. Add your classes or upcoming homework to stay organized.`;
      if (calloutTitle) calloutTitle.textContent = `All caught up!`;
      if (calloutDesc) calloutDesc.textContent = `You have no pending assignments. You can start a ${state.user.prepGoal}m prep session or add tomorrow's classes.`;
      if (tasksContainer) {
        tasksContainer.innerHTML = `
          <div class="empty-state-card">
            <div class="empty-state-icon">✨</div>
            <div class="empty-state-title">No assignments or homework yet</div>
            <p class="empty-state-desc">Whenever you get homework or a group project, add it here to track deadlines and members.</p>
            <button class="btn-liquid btn-liquid-primary" style="margin-top: 6px;" onclick="window.StudyPulse.openModal('modal-assignment')">+ Add Assignment</button>
          </div>
        `;
      }
    } else {
      const topTask = pending[0];
      if (messageEl) messageEl.textContent = `You have ${pending.length} active assignment(s). Focus on completing them one at a time.`;
      if (calloutTitle) calloutTitle.textContent = `Upcoming: ${escapeHTML(topTask.title)}`;
      if (calloutDesc) calloutDesc.textContent = `Subject: ${escapeHTML(topTask.subject)} • Due: ${escapeHTML(topTask.due)}`;
      if (tasksContainer) {
        tasksContainer.innerHTML = pending.slice(0, 3).map(task => renderTaskItemRow(task)).join('');
      }
    }

    renderNotificationWheel();
  }

  // ==========================================================================
  // 4b. iOS Notification Bubble Stack & 3D Wheel Physics
  // ==========================================================================
  let isStackExpanded = false;

  function renderNotificationWheel() {
    const stream = document.getElementById('ios-notif-stream');
    const toggleBtn = document.getElementById('btn-toggle-stack-mode');
    if (!stream) return;

    // Generate dynamic notifications based on user's setup
    const notifs = [
      {
        icon: '🌙',
        tag: 'Prep Goal',
        time: 'now',
        title: `${state.user.prepGoal || 60}m Daily Evening Prep Target`,
        text: `You have set a goal of ${state.user.prepGoal || 60} minutes of focused study today. Tap to begin.`
      },
      {
        icon: '📚',
        tag: 'Curriculum',
        time: '15m ago',
        title: `${state.user.track || 'General'} Track Ready`,
        text: `Your subjects (${(state.user.subjects || []).slice(0, 3).join(', ')}...) are linked to your timetable.`
      },
      {
        icon: '💡',
        tag: 'Study Copilot',
        time: '1h ago',
        title: 'Spaced Repetition Tip',
        text: 'Review notes within 24 hours of each lesson to lock formulas into long-term memory.'
      }
    ];

    // If pending tasks exist, add the top task as an urgent notification
    const pendingTasks = state.assignments.filter(a => !a.completed);
    if (pendingTasks.length > 0) {
      const top = pendingTasks[0];
      notifs.unshift({
        icon: '⚠️',
        tag: 'Urgent Task',
        time: 'Just now',
        title: `Due Soon: ${top.title}`,
        text: `Subject: ${top.subject} • Due on ${top.due}. Schedule time to finish it.`
      });
    }

    stream.innerHTML = notifs.map(n => `
      <div class="ios-bubble-card">
        <div class="ios-bubble-header">
          <div class="ios-bubble-app-tag">
            <span>${n.icon}</span>
            <span>${escapeHTML(n.tag)}</span>
          </div>
          <span class="ios-bubble-time">${escapeHTML(n.time)}</span>
        </div>
        <div class="ios-bubble-title">${escapeHTML(n.title)}</div>
        <div class="ios-bubble-text">${escapeHTML(n.text)}</div>
      </div>
    `).join('');

    // Update Stack / Wheel classes
    if (isStackExpanded) {
      stream.classList.remove('stacked');
      stream.classList.add('wheel');
      if (toggleBtn) toggleBtn.textContent = 'Collapse Stack ▴';
    } else {
      stream.classList.add('stacked');
      stream.classList.remove('wheel');
      if (toggleBtn) toggleBtn.textContent = 'Expand Wheel ▾';
    }

    // Toggle button handler
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        isStackExpanded = !isStackExpanded;
        renderNotificationWheel();
      };
    }

    // Clicking stacked deck also expands it
    stream.onclick = (e) => {
      if (!isStackExpanded) {
        isStackExpanded = true;
        renderNotificationWheel();
      }
    };

    // Attach 3D Cylindrical Barrel Wheel Scroll Physics
    attachWheelScrollPhysics();
  }

  function attachWheelScrollPhysics() {
    const cards = document.querySelectorAll('.ios-notif-stream.wheel .ios-bubble-card');
    if (cards.length === 0) return;

    function onScroll() {
      const viewportHeight = window.innerHeight;
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const distFromCenter = (cardCenter - viewportHeight / 2) / (viewportHeight / 2); // -1 to 1

        // 3D Barrel Wheel Rotation Angle (rotateX)
        const maxAngle = 28; // degrees
        const angle = Math.max(-maxAngle, Math.min(maxAngle, distFromCenter * maxAngle));
        
        // Scale down slightly away from center
        const scale = 1 - Math.min(0.08, Math.abs(distFromCenter) * 0.08);

        card.style.transform = `perspective(1000px) rotateX(${angle.toFixed(1)}deg) scale(${scale.toFixed(2)})`;
      });
    }

    window.removeEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ==========================================================================
  // 5. Timetable Tab
  // ==========================================================================
  function renderTimetableTab() {
    const dayChips = document.querySelectorAll('#timetable-day-chips .select-chip');
    dayChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.dataset.day, 10) === state.activeDay);
    });

    const contentCard = document.getElementById('timetable-content-card');
    if (!contentCard) return;

    const daySlots = state.timetable
      .filter(s => s.day === state.activeDay)
      .sort((a, b) => a.start.localeCompare(b.start));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDayName = dayNames[state.activeDay];

    if (daySlots.length === 0) {
      contentCard.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">📅</div>
          <div class="empty-state-title">No classes scheduled for ${currentDayName}</div>
          <p class="empty-state-desc">Add your class periods, labs, or evening prep time for this day.</p>
          <button class="btn-liquid btn-liquid-primary" style="margin-top: 6px;" onclick="window.StudyPulse.openModal('modal-timetable')">+ Add Schedule Slot</button>
        </div>
      `;
    } else {
      contentCard.innerHTML = daySlots.map(slot => `
        <div class="item-row">
          <div class="item-left">
            <div>
              <div class="item-title">${escapeHTML(slot.subject)}</div>
              <div class="item-subtitle">${escapeHTML(slot.start)} – ${escapeHTML(slot.end)} ${slot.room ? `• ${escapeHTML(slot.room)}` : ''}</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="item-tag ${slot.type === 'prep' ? 'tag-amber' : 'tag-blue'}">${slot.type === 'prep' ? '🌙 Prep' : 'Class'}</span>
            <button class="modal-close-icon" style="width: 26px; height: 26px; font-size: 11px;" onclick="window.StudyPulse.deleteTimetableSlot('${slot.id}')" title="Delete">✕</button>
          </div>
        </div>
      `).join('');
    }
  }

  // ==========================================================================
  // 6. Assignments Tab
  // ==========================================================================
  function renderTaskItemRow(task) {
    const isGroup = task.type === 'group';
    return `
      <div class="item-row">
        <div class="item-left">
          <div class="ios-checkbox ${task.completed ? 'checked' : ''}" onclick="window.StudyPulse.toggleTask('${task.id}')"></div>
          <div>
            <div class="item-title" style="${task.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${escapeHTML(task.title)}</div>
            <div class="item-subtitle">
              ${escapeHTML(task.subject)} • Due ${escapeHTML(task.due)}
              ${isGroup && task.members ? ` • 👥 ${escapeHTML(task.members)}` : ''}
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="item-tag ${task.priority === 'high' ? 'tag-amber' : 'tag-blue'}">${escapeHTML(task.priority)}</span>
          <button class="modal-close-icon" style="width: 26px; height: 26px; font-size: 11px;" onclick="window.StudyPulse.deleteTask('${task.id}')" title="Delete">✕</button>
        </div>
      </div>
    `;
  }

  function renderAssignmentsTab() {
    const contentCard = document.getElementById('assignments-content-card');
    if (!contentCard) return;

    let filtered = [...state.assignments];
    if (state.activeFilter === 'pending') {
      filtered = filtered.filter(a => !a.completed);
    } else if (state.activeFilter === 'group') {
      filtered = filtered.filter(a => a.type === 'group');
    } else if (state.activeFilter === 'completed') {
      filtered = filtered.filter(a => a.completed);
    }

    if (filtered.length === 0) {
      contentCard.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-title">No assignments recorded</div>
          <p class="empty-state-desc">Stay ahead of your coursework by logging assignments and group tasks.</p>
          <button class="btn-liquid btn-liquid-primary" style="margin-top: 6px;" onclick="window.StudyPulse.openModal('modal-assignment')">+ New Assignment</button>
        </div>
      `;
    } else {
      contentCard.innerHTML = filtered.map(t => renderTaskItemRow(t)).join('');
    }
  }

  // ==========================================================================
  // 7. Goals & Habits Tab
  // ==========================================================================
  function renderGoalsTab() {
    const contentCard = document.getElementById('goals-content-card');
    if (!contentCard) return;

    const hasDaily = state.dailyGoals.length > 0;
    const hasHabits = state.habits.length > 0;

    if (!hasDaily && !hasHabits) {
      contentCard.innerHTML = `
        <div class="empty-state-card">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-title">No goals or study habits added yet</div>
          <p class="empty-state-desc">Set a daily target or create a study habit to build momentum.</p>
          <button class="btn-liquid btn-liquid-primary" style="margin-top: 6px;" onclick="window.StudyPulse.openModal('modal-goal')">+ Add First Target</button>
        </div>
      `;
    } else {
      let html = '';
      if (hasDaily) {
        html += `<h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 10px; color: var(--text-secondary);">Today's Targets</h4>`;
        html += state.dailyGoals.map(g => `
          <div class="item-row">
            <div class="item-left">
              <div class="ios-checkbox ${g.completed ? 'checked' : ''}" onclick="window.StudyPulse.toggleGoal('${g.id}')"></div>
              <div>
                <div class="item-title" style="${g.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${escapeHTML(g.text)}</div>
                ${g.subject ? `<div class="item-subtitle">${escapeHTML(g.subject)}</div>` : ''}
              </div>
            </div>
            <button class="modal-close-icon" style="width: 26px; height: 26px; font-size: 11px;" onclick="window.StudyPulse.deleteGoal('${g.id}')">✕</button>
          </div>
        `).join('');
      }

      if (hasHabits) {
        html += `<h4 style="font-size: 0.88rem; font-weight: 700; margin: 18px 0 10px 0; color: var(--text-secondary);">Habit Streaks</h4>`;
        html += state.habits.map(h => `
          <div class="item-row">
            <div class="item-left">
              <div>
                <div class="item-title">🔥 ${escapeHTML(h.name)}</div>
                <div class="item-subtitle">${h.streak} Day Streak</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn-liquid btn-liquid-secondary" style="font-size: 0.75rem; padding: 5px 12px;" onclick="window.StudyPulse.incrementHabit('${h.id}')">+ Log Today</button>
              <button class="modal-close-icon" style="width: 26px; height: 26px; font-size: 11px;" onclick="window.StudyPulse.deleteHabit('${h.id}')">✕</button>
            </div>
          </div>
        `).join('');
      }
      contentCard.innerHTML = html;
    }
  }

  // ==========================================================================
  // ==========================================================================
  // 8. Offline Prep Timer with 5 Presets & Dynamic Rest Sessions
  // ==========================================================================
  const DEFAULT_TIMER_PRESETS = [
    { id: 'p-15', focus: 15, rest: 3, label: '15m (3m rest)' },
    { id: 'p-25', focus: 25, rest: 5, label: '25m (5m rest)' },
    { id: 'p-45', focus: 45, rest: 10, label: '45m (10m rest)' },
    { id: 'p-60', focus: 60, rest: 15, label: '60m (15m rest)' },
    { id: 'p-90', focus: 90, rest: 20, label: '90m (20m rest)' }
  ];

  let currentPreset = DEFAULT_TIMER_PRESETS[1]; // default 25m
  let timerMode = 'focus'; // 'focus' or 'rest'
  let timerInterval = null;
  let timerRemainingSeconds = 25 * 60;
  let timerTotalSeconds = 25 * 60;
  let timerIsRunning = false;

  // Web Audio API Synthesizer for 100% Offline Chimes
  let audioContext = null;
  function playOfflineChime(type = 'bell') {
    try {
      if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) audioContext = new AudioCtx();
      }
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      if (!audioContext) return;

      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);

      if (type === 'bell') {
        // Double tone school bell
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.2);
      } else {
        // Upbeat chime for rest completion
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
      }

      if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
    } catch (e) {
      console.log('Chime error:', e);
    }
  }

  function renderPresetChips() {
    const container = document.getElementById('timer-preset-chips');
    if (!container) return;

    if (!state.customTimerPresets) state.customTimerPresets = [];
    const allPresets = [...DEFAULT_TIMER_PRESETS, ...state.customTimerPresets];

    let html = allPresets.map(p => {
      const isAct = currentPreset && currentPreset.id === p.id;
      const isCustom = p.id.startsWith('cust-');
      return `
        <button type="button" class="select-chip ${isAct ? 'active' : ''}" onclick="window.StudyPulse.selectTimerPreset('${p.id}')">
          ${escapeHTML(p.label)}
          ${isCustom ? `<span style="margin-left: 6px; opacity: 0.6; font-size: 10px;" onclick="event.stopPropagation(); window.StudyPulse.deleteCustomPreset('${p.id}')">✕</span>` : ''}
        </button>
      `;
    }).join('');

    // Add + Custom Button
    html += `
      <button type="button" id="btn-custom-timer" class="select-chip" data-open-modal="modal-custom-timer" style="background: rgba(15, 23, 42, 0.05); font-weight: 700;" onclick="window.StudyPulse.openModal('modal-custom-timer')">
        + Custom
      </button>
    `;

    container.innerHTML = html;
  }

  function updateTimerDisplay() {
    const displayEl = document.getElementById('timer-display');
    const todayMinsEl = document.getElementById('timer-today-mins');
    const modeEl = document.getElementById('timer-mode-name');

    const mins = Math.floor(timerRemainingSeconds / 60);
    const secs = timerRemainingSeconds % 60;
    if (displayEl) {
      displayEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    if (todayMinsEl) {
      todayMinsEl.textContent = `${state.studyStats.todayMinutes} mins`;
    }

    if (modeEl) {
      if (timerMode === 'focus') {
        modeEl.textContent = `Focus Session • ${currentPreset.rest}m Rest Scheduled`;
        modeEl.style.color = 'var(--text-muted)';
      } else {
        modeEl.textContent = `☕ Recharge Rest Break • ${mins}m Remaining`;
        modeEl.style.color = 'var(--accent-blue)';
      }
    }
  }

  function selectTimerPreset(id) {
    if (!state.customTimerPresets) state.customTimerPresets = [];
    const all = [...DEFAULT_TIMER_PRESETS, ...state.customTimerPresets];
    const found = all.find(p => p.id === id);
    if (!found) return;

    pauseTimer();
    timerMode = 'focus';
    currentPreset = found;
    timerTotalSeconds = found.focus * 60;
    timerRemainingSeconds = timerTotalSeconds;

    hideRestCard();
    renderPresetChips();
    updateTimerDisplay();
  }

  function toggleTimer() {
    if (timerIsRunning) pauseTimer();
    else startTimer();
  }

  function startTimer() {
    timerIsRunning = true;
    const label = document.getElementById('timer-toggle-label');
    if (label) label.textContent = 'Pause';

    timerInterval = setInterval(() => {
      if (timerRemainingSeconds > 0) {
        timerRemainingSeconds--;
        updateTimerDisplay();
      } else {
        // Finished current countdown
        pauseTimer();

        if (timerMode === 'focus') {
          // Focus completed!
          playOfflineChime('bell');
          const studyMins = Math.round(timerTotalSeconds / 60);
          state.studyStats.todayMinutes += studyMins;
          saveState();
          updateTimerDisplay();
          showRestCard(studyMins, currentPreset.rest);
        } else {
          // Rest completed!
          playOfflineChime('success');
          alert(`Break complete! You are refreshed and ready for your next study session.`);
          hideRestCard();
          timerMode = 'focus';
          timerTotalSeconds = currentPreset.focus * 60;
          timerRemainingSeconds = timerTotalSeconds;
          updateTimerDisplay();
        }
      }
    }, 1000);
  }

  function pauseTimer() {
    timerIsRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    const label = document.getElementById('timer-toggle-label');
    if (label) label.textContent = timerMode === 'focus' ? 'Start Focus' : 'Resume Rest';
  }

  function resetTimer() {
    pauseTimer();
    timerMode = 'focus';
    timerTotalSeconds = currentPreset.focus * 60;
    timerRemainingSeconds = timerTotalSeconds;
    hideRestCard();
    updateTimerDisplay();
  }

  function showRestCard(studyMins, restMins) {
    const card = document.getElementById('timer-rest-card');
    const heading = document.getElementById('rest-card-heading');
    const desc = document.getElementById('rest-card-desc');
    const restText = document.getElementById('rest-duration-text');

    if (heading) heading.textContent = `Focus Session Complete (${studyMins}m)!`;
    if (desc) desc.textContent = `Outstanding concentration! Taking a ${restMins}-minute break lets your mind consolidate what you just learned.`;
    if (restText) restText.textContent = `${restMins}m`;
    if (card) card.style.display = 'flex';
  }

  function hideRestCard() {
    const card = document.getElementById('timer-rest-card');
    if (card) card.style.display = 'none';
  }

  function startRestSession() {
    hideRestCard();
    timerMode = 'rest';
    timerTotalSeconds = currentPreset.rest * 60;
    timerRemainingSeconds = timerTotalSeconds;
    updateTimerDisplay();
    startTimer();
  }

  function skipRestSession() {
    hideRestCard();
    timerMode = 'focus';
    timerTotalSeconds = currentPreset.focus * 60;
    timerRemainingSeconds = timerTotalSeconds;
    updateTimerDisplay();
  }

  // ==========================================================================
  // 9. Modals & Action Listeners
  // ==========================================================================
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('active');
      const firstInput = el.querySelector('input:not([type="hidden"]), select, textarea');
      if (firstInput) {
        setTimeout(() => firstInput.focus(), 80);
      }
    }
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  }

  function setupModals() {
    // Delegated Modal Openers (for dynamic and static buttons)
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-open-modal]');
      if (opener) {
        e.preventDefault();
        openModal(opener.dataset.openModal);
      }
    });

    // Modal Openers
    const btnModalAddTimetable = document.getElementById('btn-modal-add-timetable');
    if (btnModalAddTimetable) btnModalAddTimetable.addEventListener('click', () => openModal('modal-timetable'));

    const btnModalAddAssignment = document.getElementById('btn-modal-add-assignment');
    if (btnModalAddAssignment) {
      btnModalAddAssignment.addEventListener('click', () => {
        document.getElementById('form-add-assignment').reset();
        document.getElementById('task-due').value = new Date().toISOString().split('T')[0];
        document.getElementById('group-task-members-field').style.display = 'none';
        openModal('modal-assignment');
      });
    }

    const btnModalAddGoal = document.getElementById('btn-modal-add-goal');
    if (btnModalAddGoal) btnModalAddGoal.addEventListener('click', () => openModal('modal-goal'));

    const btnProfile = document.getElementById('btn-header-profile');
    if (btnProfile) {
      btnProfile.addEventListener('click', () => {
        if (!state.user.isSetupComplete) return;
        document.getElementById('prof-display-name').textContent = state.user.name;
        document.getElementById('prof-display-track').textContent = `${state.user.level} • ${state.user.track}`;
        document.getElementById('prof-display-subjects').textContent = `Subjects: ${state.user.subjects.join(', ')}`;
        openModal('modal-profile');
      });
    }

    // Modal Closers
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    document.querySelectorAll('.liquid-modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });

    // Form: Add Assignment
    const formAssignment = document.getElementById('form-add-assignment');
    const taskTypeSelect = document.getElementById('task-type');
    if (taskTypeSelect) {
      taskTypeSelect.addEventListener('change', () => {
        const groupField = document.getElementById('group-task-members-field');
        if (groupField) groupField.style.display = taskTypeSelect.value === 'group' ? 'block' : 'none';
      });
    }

    if (formAssignment) {
      formAssignment.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value.trim();
        const subject = document.getElementById('task-subject').value.trim();
        const due = document.getElementById('task-due').value;
        const type = document.getElementById('task-type').value;
        const priority = document.getElementById('task-priority').value;
        const members = document.getElementById('task-members').value.trim();

        state.assignments.unshift({
          id: 'task-' + Date.now(),
          title,
          subject,
          due,
          type,
          priority,
          members,
          completed: false
        });

        saveState();
        closeModal('modal-assignment');
        renderAssignmentsTab();
        renderAssistantTab();
      });
    }

    // Form: Add Timetable Slot
    const formTimetable = document.getElementById('form-add-timetable');
    if (formTimetable) {
      formTimetable.addEventListener('submit', (e) => {
        e.preventDefault();
        const subject = document.getElementById('slot-subject').value.trim();
        const day = parseInt(document.getElementById('slot-day').value, 10);
        const type = document.getElementById('slot-type').value;
        const start = document.getElementById('slot-start').value;
        const end = document.getElementById('slot-end').value;
        const room = document.getElementById('slot-room').value.trim();

        state.timetable.push({
          id: 'slot-' + Date.now(),
          day,
          subject,
          type,
          start,
          end,
          room
        });

        state.activeDay = day;
        saveState();
        closeModal('modal-timetable');
        renderTimetableTab();
      });
    }

    // Form: Add Goal / Habit
    const formGoal = document.getElementById('form-add-goal');
    if (formGoal) {
      formGoal.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('goal-type').value;
        const desc = document.getElementById('goal-desc').value.trim();
        const subject = document.getElementById('goal-subject-input').value.trim();

        if (type === 'daily') {
          state.dailyGoals.push({ id: 'dg-' + Date.now(), text: desc, subject, completed: false });
        } else {
          state.habits.push({ id: 'hb-' + Date.now(), name: desc, subject, streak: 1 });
        }

        saveState();
        closeModal('modal-goal');
        renderGoalsTab();
      });
    }

    // Profile & Reset Buttons
    const btnEditSetup = document.getElementById('btn-edit-setup');
    if (btnEditSetup) {
      btnEditSetup.addEventListener('click', () => {
        closeModal('modal-profile');
        state.user.isSetupComplete = false;
        renderScreen();
        // Populate intro fields with existing
        document.getElementById('intro-name').value = state.user.name;
        document.getElementById('intro-subjects-input').value = state.user.subjects.join(', ');
      });
    }

    const btnResetAll = document.getElementById('btn-reset-all');
    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        if (confirm('Clear all schedule data, assignments, and start fresh?')) {
          localStorage.removeItem(STORAGE_KEY);
          location.reload();
        }
      });
    }

    // Timetable Day Filter Chips
    const ttDayChips = document.querySelectorAll('#timetable-day-chips .select-chip');
    ttDayChips.forEach(chip => {
      chip.addEventListener('click', () => {
        state.activeDay = parseInt(chip.dataset.day, 10);
        renderTimetableTab();
      });
    });

    // Assignment Filter Chips
    const assignChips = document.querySelectorAll('#assignment-filter-chips .select-chip');
    assignChips.forEach(chip => {
      chip.addEventListener('click', () => {
        assignChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeFilter = chip.dataset.filter;
        renderAssignmentsTab();
      });
    });

    // Rest Session Action Buttons
    const btnStartRest = document.getElementById('btn-start-rest');
    if (btnStartRest) btnStartRest.addEventListener('click', startRestSession);

    const btnSkipRest = document.getElementById('btn-skip-rest');
    if (btnSkipRest) btnSkipRest.addEventListener('click', skipRestSession);

    // Custom Timer Modal Form
    const customStudyInput = document.getElementById('custom-study-mins');
    const customRestInput = document.getElementById('custom-rest-mins');
    if (customStudyInput && customRestInput) {
      customStudyInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) || 0;
        customRestInput.value = Math.max(1, Math.round(val * 0.2));
      });
    }

    const formCustomTimer = document.getElementById('form-custom-timer');
    if (formCustomTimer) {
      formCustomTimer.addEventListener('submit', (e) => {
        e.preventDefault();
        const focus = parseInt(document.getElementById('custom-study-mins').value, 10);
        const rest = parseInt(document.getElementById('custom-rest-mins').value, 10);
        const labelInput = document.getElementById('custom-timer-label').value.trim();
        const label = labelInput || `${focus}m (${rest}m rest)`;

        const newPreset = {
          id: 'cust-' + Date.now(),
          focus,
          rest,
          label
        };

        if (!state.customTimerPresets) state.customTimerPresets = [];
        state.customTimerPresets.push(newPreset);
        saveState();

        selectTimerPreset(newPreset.id);
        closeModal('modal-custom-timer');
        formCustomTimer.reset();
      });
    }

    // Timer Controls
    const btnTimerToggle = document.getElementById('btn-timer-toggle');
    if (btnTimerToggle) btnTimerToggle.addEventListener('click', toggleTimer);

    const btnTimerReset = document.getElementById('btn-timer-reset');
    if (btnTimerReset) btnTimerReset.addEventListener('click', resetTimer);
  }

  // ==========================================================================
  // 10. Public API
  // ==========================================================================
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  window.StudyPulse = {
    openModal,
    closeModal,

    selectTimerPreset: (id) => selectTimerPreset(id),

    deleteCustomPreset: (id) => {
      state.customTimerPresets = (state.customTimerPresets || []).filter(p => p.id !== id);
      saveState();
      if (currentPreset && currentPreset.id === id) {
        selectTimerPreset('p-25');
      } else {
        renderPresetChips();
      }
    },

    toggleTask: (id) => {
      const task = state.assignments.find(a => a.id === id);
      if (task) {
        task.completed = !task.completed;
        saveState();
        renderAssignmentsTab();
        renderAssistantTab();
      }
    },

    deleteTask: (id) => {
      state.assignments = state.assignments.filter(a => a.id !== id);
      saveState();
      renderAssignmentsTab();
      renderAssistantTab();
    },

    deleteTimetableSlot: (id) => {
      state.timetable = state.timetable.filter(s => s.id !== id);
      saveState();
      renderTimetableTab();
    },

    toggleGoal: (id) => {
      const g = state.dailyGoals.find(item => item.id === id);
      if (g) {
        g.completed = !g.completed;
        saveState();
        renderGoalsTab();
      }
    },

    deleteGoal: (id) => {
      state.dailyGoals = state.dailyGoals.filter(item => item.id !== id);
      saveState();
      renderGoalsTab();
    },

    incrementHabit: (id) => {
      const h = state.habits.find(item => item.id === id);
      if (h) {
        h.streak += 1;
        saveState();
        renderGoalsTab();
      }
    },

    deleteHabit: (id) => {
      state.habits = state.habits.filter(item => item.id !== id);
      saveState();
      renderGoalsTab();
    }
  };

  function renderDashboard() {
    renderAssistantTab();
    renderTimetableTab();
    renderAssignmentsTab();
    renderGoalsTab();
    renderPresetChips();
    updateTimerDisplay();
  }

  function init() {
    loadState();
    setupIntroForm();
    setupDashboardNavigation();
    setupModals();
    renderScreen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
