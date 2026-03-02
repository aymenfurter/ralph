import { REVIEW_COUNTDOWN_SECONDS } from '../types';

const CLOCK_CIRCUMFERENCE = 69.115;

export function getClientScripts(): string {

    const totalCountdown = REVIEW_COUNTDOWN_SECONDS;
    const circumference = CLOCK_CIRCUMFERENCE;

    return `
        const vscode = acquireVsCodeApi();

        // ====================================================================
        // Constants (injected from TypeScript)
        // ====================================================================

        const TOTAL_COUNTDOWN = ${totalCountdown};
        const CLOCK_CIRCUMFERENCE = ${circumference};

        // ====================================================================
        // Message Handlers
        // ====================================================================

        function send(command) {
            const btnStart = document.getElementById('btnStart');
            const btnPause = document.getElementById('btnPause');
            const btnStop = document.getElementById('btnStop');

            // Optimistic UI updates for immediate feedback
            if (command === 'start' && btnStart && btnPause && btnStop) {
                btnStart.disabled = true;
                btnPause.disabled = false;
                btnStop.disabled = false;
            } else if (command === 'pause' && btnStart && btnPause && btnStop) {
                btnStart.disabled = false;
                btnPause.disabled = true;
                btnStop.disabled = false;
            } else if (command === 'stop' && btnStart && btnPause && btnStop) {
                btnStart.disabled = false;
                btnPause.disabled = true;
                btnStop.disabled = true;
            }
            vscode.postMessage({ command });
        }

        // ====================================================================
        // Requirements & Settings
        // ====================================================================

        function toggleRequirements() {
            const content = document.getElementById('reqContent');
            const toggle = document.getElementById('reqToggle');
            if (content && toggle) {
                content.classList.toggle('collapsed');
                toggle.classList.toggle('expanded');
            }
        }

        function updateRequirements() {
            const requirements = {
                writeTests: document.getElementById('reqWriteTests')?.checked ?? false,
                runTests: document.getElementById('reqRunTests')?.checked ?? false,
                runTypeCheck: document.getElementById('reqTypeCheck')?.checked ?? false,
                runLinting: document.getElementById('reqLinting')?.checked ?? false,
                updateDocs: document.getElementById('reqDocs')?.checked ?? false,
                commitChanges: document.getElementById('reqCommit')?.checked ?? false
            };
            vscode.postMessage({ command: 'requirementsChanged', requirements });
        }

        function openSettings() {
            const overlay = document.getElementById('settingsOverlay');
            if (overlay) {
                overlay.classList.add('visible');
            }
        }

        function closeSettings() {
            const overlay = document.getElementById('settingsOverlay');
            if (overlay) {
                overlay.classList.remove('visible');
            }
        }

        function updateSettings() {
            const maxIterEl = document.getElementById('settingMaxIterations');
            const settings = {
                maxIterations: parseInt(maxIterEl?.value ?? '50') || 50
            };
            vscode.postMessage({ command: 'settingsChanged', settings });
        }

        // ====================================================================
        // UI Updates
        // ====================================================================

        function updateUI(status, iteration, taskInfo) {
            const wasRunning = window.isRunning || window.isWaiting;
            window.isRunning = status === 'running';
            window.isWaiting = status === 'waiting';
            const isNowRunning = window.isRunning || window.isWaiting;

            const header = document.getElementById('header');
            const statusText = document.getElementById('statusText');
            const btnStart = document.getElementById('btnStart');
            const btnPause = document.getElementById('btnPause');
            const btnResume = document.getElementById('btnResume');
            const btnStop = document.getElementById('btnStop');
            const taskText = document.getElementById('taskText');
            const reqSection = document.getElementById('requirementsSection');

            if (header) {
                header.className = 'header ' + status;
            }

            const statusLabels = {
                'idle': 'Ready',
                'running': 'Working',
                'waiting': 'Working',
                'paused': 'Paused',
                'waiting_for_confirmation': 'Waiting for Confirmation'
            };
            if (statusText) {
                statusText.textContent = statusLabels[status] || status;
            }

            if (reqSection) {
                reqSection.style.display = status === 'idle' ? 'block' : 'none';
            }

            if (taskText && taskInfo) {
                taskText.textContent = taskInfo;
            }

            const isRunning = status === 'running' || status === 'waiting' || status === 'waiting_for_confirmation';
            const isPaused = status === 'paused';

            if (btnStart) btnStart.disabled = isRunning || isPaused;
            if (btnPause) {
                btnPause.disabled = !isRunning;
                btnPause.style.display = isPaused ? 'none' : 'inline-flex';
            }
            if (btnResume) {
                btnResume.disabled = !isPaused;
                btnResume.style.display = isPaused ? 'inline-flex' : 'none';
            }
            if (btnStop) btnStop.disabled = !isRunning && !isPaused;

            if (isNowRunning !== wasRunning) {
                updateTimeline(currentTaskHistory);
            }
        }

        // ====================================================================
        // Countdown Display
        // ====================================================================

        function showCountdown(seconds) {
            const countdown = document.getElementById('countdown');
            const clockFill = document.getElementById('clockFill');

            if (!countdown || !clockFill) return;

            if (seconds > 0) {
                countdown.classList.add('visible');
                const progress = 1 - (seconds / TOTAL_COUNTDOWN);
                const offset = CLOCK_CIRCUMFERENCE * (1 - progress);
                clockFill.style.strokeDashoffset = String(offset);
            } else {
                countdown.classList.remove('visible');
                clockFill.style.strokeDashoffset = String(CLOCK_CIRCUMFERENCE);
            }
        }

        // ====================================================================
        // Activity Log
        // ====================================================================

        function addLog(message, type) {
            type = type || 'info';
            const logArea = document.getElementById('logArea');
            if (!logArea) return;

            const entry = document.createElement('div');
            entry.className = 'log-entry ' + type;

            const time = new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit'
            });

            entry.innerHTML = '<span class="log-time">' + time + '</span>' +
                              '<span class="log-msg">' + escapeHtml(message) + '</span>';
            logArea.appendChild(entry);
            logArea.scrollTop = logArea.scrollHeight;
        }

        /** Escapes HTML to prevent XSS in log messages */
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // ====================================================================
        // PRD Generation
        // ====================================================================

        function generatePrd() {
            const textarea = document.getElementById('taskInput');
            const btn = document.querySelector('.generate-btn');

            if (!textarea) return;

            const taskDescription = textarea.value.trim();

            if (!taskDescription) {
                textarea.style.borderColor = '#dc2626';
                textarea.placeholder = 'Please describe what you want to build...';
                return;
            }

            if (btn) {
                btn.disabled = true;
                btn.textContent = '⏳ Generating...';
            }

            vscode.postMessage({
                command: 'generatePrd',
                taskDescription: taskDescription
            });
        }

        // ====================================================================
        // Message Event Handler
        // ====================================================================

        window.addEventListener('message', function(event) {
            const msg = event.data;
            if (msg.type === 'update') {
                updateUI(msg.status, msg.iteration, msg.taskInfo);
            }
            if (msg.type === 'countdown') {
                showCountdown(msg.seconds);
            }
            if (msg.type === 'log') {
                addLog(msg.message, msg.highlight ? 'success' : 'info');
            }
            if (msg.type === 'prdGenerating') {
                const btn = document.querySelector('.generate-btn');
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = '⏳ Copilot is generating PRD...';
                }
            }
            if (msg.type === 'history') {
                updateTimeline(msg.history);
            }
            if (msg.type === 'timing') {
                updateTiming(msg.startTime, msg.taskHistory, msg.pendingTasks);
            }
            if (msg.type === 'stats') {
                updateStatsDisplay(msg);
            }
        });

        // ====================================================================
        // Stats Display
        // ====================================================================

        function updateStatsDisplay(stats) {
            const taskSection = document.getElementById('taskSection');

            // Handle all tasks completed state
            if (stats.pending === 0 && stats.completed > 0) {
                if (taskSection) {
                    taskSection.className = 'task-section';
                    taskSection.innerHTML = '<div class="empty-state">' +
                        '<div class="empty-state-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>' +
                        '<div>All tasks completed!</div>' +
                        '</div>';
                }
            } else if (stats.nextTask && taskSection) {
                // Restore task section to show current task
                taskSection.className = 'task-section active';
                taskSection.innerHTML = '<div class="task-label">Current Task</div>' +
                    '<div class="task-text" id="taskText">' + escapeHtml(stats.nextTask) + '</div>';
            }

            currentPendingTasks = stats.pending;
            totalTasks = stats.completed + stats.pending;
            updatePipeline(stats.completed, stats.pending);
        }

        function updatePipeline(completed, pending) {
            const track = document.getElementById('pipelineTrack');
            const countEl = document.getElementById('pipelineCount');
            const totalEl = document.getElementById('pipelineTotal');

            if (!track) return;

            const total = completed + pending;
            if (countEl) countEl.textContent = String(completed);
            if (totalEl) totalEl.textContent = String(total);
            track.innerHTML = '';

            if (total === 0) return;

            for (let i = 0; i < completed; i++) {
                const segment = document.createElement('div');
                segment.className = 'pipeline-segment completed';
                segment.style.flex = '1';
                track.appendChild(segment);
            }

            if (pending > 0) {
                const current = document.createElement('div');
                current.className = 'pipeline-segment current';
                current.style.flex = '1';
                track.appendChild(current);

                for (let i = 1; i < pending; i++) {
                    const segment = document.createElement('div');
                    segment.className = 'pipeline-segment pending';
                    segment.style.flex = '1';
                    track.appendChild(segment);
                }
            }
        }

        // ====================================================================
        // Session Timing
        // ====================================================================

        let sessionStartTime = null;
        let elapsedInterval = null;
        let currentTaskHistory = [];
        let currentPendingTasks = 0;
        let currentTaskStartTime = null;
        let totalTasks = 0;

        function getTaskStats() {
            const completed = currentTaskHistory ? currentTaskHistory.length : 0;
            return {
                completed: completed,
                pending: currentPendingTasks,
                total: totalTasks || completed + currentPendingTasks
            };
        }

        function updateTiming(startTime, taskHistory, pendingTasks) {
            const timingDisplay = document.getElementById('timingDisplay');

            if (startTime > 0) {
                sessionStartTime = startTime;
                currentTaskHistory = taskHistory || [];
                currentPendingTasks = pendingTasks;

                const completed = currentTaskHistory.length;
                totalTasks = completed + pendingTasks;

                if (currentTaskHistory.length > 0) {
                    const lastTask = currentTaskHistory[currentTaskHistory.length - 1];
                    currentTaskStartTime = lastTask.completedAt;
                } else {
                    currentTaskStartTime = startTime;
                }

                if (timingDisplay) timingDisplay.classList.add('visible');

                if (!elapsedInterval) {
                    elapsedInterval = setInterval(function() {
                        updateCurrentTaskBar();
                        updateElapsedAndEta();
                    }, 1000);
                }

                updateElapsedAndEta();
            } else {
                if (elapsedInterval) {
                    clearInterval(elapsedInterval);
                    elapsedInterval = null;
                }
                if (timingDisplay) timingDisplay.classList.remove('visible');
            }
        }

        function updateElapsedAndEta() {
            if (!sessionStartTime) return;

            const elapsed = Date.now() - sessionStartTime;
            const elapsedEl = document.getElementById('elapsedTime');
            const etaEl = document.getElementById('etaTime');

            if (elapsedEl) elapsedEl.textContent = formatTime(elapsed);

            if (etaEl) {
                const completed = currentTaskHistory ? currentTaskHistory.length : 0;
                if (completed > 0 && currentPendingTasks > 0) {
                    const totalDuration = currentTaskHistory.reduce(function(sum, h) { return sum + h.duration; }, 0);
                    const avgDuration = totalDuration / completed;
                    const remainingTime = avgDuration * currentPendingTasks;
                    etaEl.textContent = formatTime(remainingTime);
                } else if (currentPendingTasks > 0) {
                    etaEl.textContent = '--:--:--';
                } else {
                    etaEl.textContent = 'Done!';
                }
            }
        }

        function formatTime(ms) {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            return String(hours).padStart(2, '0') + ':' +
                   String(minutes).padStart(2, '0') + ':' +
                   String(seconds).padStart(2, '0');
        }

        // ====================================================================
        // Timeline Visualization
        // ====================================================================

        let currentBarElement = null;
        let currentBarLabel = null;
        let maxDurationForScale = 0;

        function updateTimeline(history) {
            const empty = document.getElementById('timelineEmpty');
            const bars = document.getElementById('timelineBars');
            const labels = document.getElementById('timelineLabels');
            const count = document.getElementById('timelineCount');
            const stats = getTaskStats();

            if (!empty || !bars || !labels) return;

            if (count) {
                count.textContent = stats.completed + '/' + stats.total;
            }

            let avgDuration = 60000;
            if (history && history.length > 0) {
                const totalDuration = history.reduce(function(sum, h) { return sum + h.duration; }, 0);
                avgDuration = totalDuration / history.length;
            }

            if (!history || history.length === 0) {
                if (currentPendingTasks > 0 || (window.isRunning || window.isWaiting)) {
                    empty.style.display = 'none';
                    bars.style.display = 'flex';
                    labels.style.display = 'flex';
                    bars.innerHTML = '';
                    labels.innerHTML = '';
                    addCurrentTaskBar(bars, labels, 1, avgDuration);
                    if (currentPendingTasks > 1) {
                        addPendingBars(bars, labels, 2, currentPendingTasks - 1, avgDuration, avgDuration);
                    }
                } else {
                    empty.innerHTML = 'No tasks completed yet';
                    empty.style.display = 'block';
                    bars.style.display = 'none';
                    labels.style.display = 'none';
                }
                return;
            }

            empty.style.display = 'none';
            bars.style.display = 'flex';
            labels.style.display = 'flex';

            const maxDuration = Math.max.apply(null, history.map(function(h) { return h.duration; }));
            maxDurationForScale = Math.max(maxDuration, avgDuration);

            bars.innerHTML = '';
            labels.innerHTML = '';

            history.forEach(function(task, i) {
                const heightPercent = (task.duration / maxDurationForScale) * 100;
                const bar = document.createElement('div');
                bar.className = 'timeline-bar';
                bar.style.height = Math.max(heightPercent, 10) + '%';
                bar.setAttribute('data-duration', formatDuration(task.duration));
                bar.title = task.taskDescription;
                bars.appendChild(bar);

                const label = document.createElement('div');
                label.className = 'timeline-label';
                label.textContent = '#' + (i + 1);
                labels.appendChild(label);
            });

            if (currentPendingTasks > 0) {
                addCurrentTaskBar(bars, labels, history.length + 1, maxDurationForScale);
                addPendingBars(bars, labels, history.length + 2, currentPendingTasks - 1, avgDuration, maxDurationForScale);
            } else {
                currentBarElement = null;
                currentBarLabel = null;
            }
        }

        function addPendingBars(bars, labels, startNum, count, avgDuration, maxDuration) {
            if (count <= 0) return;

            const heightPercent = (avgDuration / maxDuration) * 100;

            for (let i = 0; i < count; i++) {
                const bar = document.createElement('div');
                bar.className = 'timeline-bar pending';
                bar.style.height = Math.max(heightPercent, 10) + '%';
                bar.setAttribute('data-duration', '~' + formatDuration(avgDuration));
                bar.title = 'Estimated: ' + formatDuration(avgDuration);
                bars.appendChild(bar);

                const label = document.createElement('div');
                label.className = 'timeline-label';
                label.textContent = '#' + (startNum + i);
                label.style.opacity = '0.5';
                labels.appendChild(label);
            }
        }

        function addCurrentTaskBar(bars, labels, taskNum, maxDuration) {
            const bar = document.createElement('div');
            bar.className = 'timeline-bar current';
            bar.style.height = '5%';
            bar.setAttribute('data-duration', '0s');
            bar.title = 'Current task (in progress)';
            bars.appendChild(bar);
            currentBarElement = bar;
            maxDurationForScale = maxDuration;

            const label = document.createElement('div');
            label.className = 'timeline-label';
            label.textContent = '#' + taskNum;
            labels.appendChild(label);
            currentBarLabel = label;
        }

        function updateCurrentTaskBar() {
            if (!currentBarElement || !currentTaskStartTime) return;

            const elapsed = Date.now() - currentTaskStartTime;
            const scale = maxDurationForScale > 0 ? maxDurationForScale : 60000;
            const heightPercent = Math.min((elapsed / scale) * 100, 100);

            currentBarElement.style.height = Math.max(heightPercent, 5) + '%';
            currentBarElement.setAttribute('data-duration', formatDuration(elapsed));
        }

        function formatDuration(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);

            if (hours > 0) return hours + 'h ' + (minutes % 60) + 'm';
            if (minutes > 0) return minutes + 'm ' + (seconds % 60) + 's';
            return seconds + 's';
        }
    `;
}
