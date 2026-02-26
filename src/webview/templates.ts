import { Task } from '../types';

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Use this for any user-generated or external content rendered in webviews.
 */
export function escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

export const Icons = {
    play: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    pause: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
    stop: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>',
    step: '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><rect x="15" y="4" width="4" height="16"/></svg>',
    refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
    settings: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
    check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    rocket: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    star: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; margin-right: 6px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
};

export function getLogo(size: number = 24): string {
    return `<svg class="ralph-logo" width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#f97316"/>
                <stop offset="50%" style="stop-color:#ec4899"/>
                <stop offset="100%" style="stop-color:#8b5cf6"/>
            </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="13" fill="white"/>
        <circle cx="16" cy="16" r="13" stroke="url(#logoGradient)" stroke-width="3" fill="none"/>
        <text x="16" y="21" text-anchor="middle" font-size="14" font-weight="bold" fill="url(#logoGradient)">R</text>
    </svg>`;
}

export function getHeader(): string {
    return `
    <div class="header idle" id="header">
        <div class="header-content">
            <div class="title">
                ${getLogo()}
                <h1>Ralph</h1>
                <div class="status-pill" id="statusPill">
                    <span class="status-dot"></span>
                    <span id="statusText">Ready</span>
                </div>
            </div>
            <div class="header-right">
                <div class="timing-display" id="timingDisplay">
                    <div class="timing-item">
                        <span class="timing-label">Elapsed</span>
                        <span class="timing-value" id="elapsedTime">00:00:00</span>
                    </div>
                    <div class="timing-item">
                        <span class="timing-label">ETA</span>
                        <span class="timing-value" id="etaTime">--:--:--</span>
                    </div>
                </div>
                <div class="countdown" id="countdown">
                    <div class="countdown-clock">
                        <svg width="28" height="28" viewBox="0 0 28 28">
                            <defs>
                                <linearGradient id="clockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style="stop-color:#f97316"/>
                                    <stop offset="100%" style="stop-color:#8b5cf6"/>
                                </linearGradient>
                            </defs>
                            <circle class="countdown-clock-bg" cx="14" cy="14" r="11"/>
                            <circle class="countdown-clock-fill" id="clockFill" cx="14" cy="14" r="11" stroke-dasharray="69.115" stroke-dashoffset="69.115"/>
                        </svg>
                    </div>
                    <span>Next task</span>
                </div>
            </div>
        </div>
    </div>`;
}

export function getControls(hasPrd: boolean): string {
    return `
    <div class="controls">
        <button class="primary" id="btnStart" onclick="send('start')" ${!hasPrd ? 'disabled' : ''}>
            ${Icons.play} Start
        </button>
        <button class="secondary" id="btnPause" onclick="send('pause')" disabled>
            ${Icons.pause} Pause
        </button>
        <button class="secondary" id="btnResume" onclick="send('resume')" disabled style="display:none">
            ${Icons.play} Resume
        </button>
        <button class="danger" id="btnStop" onclick="send('stop')" disabled>
            ${Icons.stop} Stop
        </button>
        <div class="spacer"></div>
        <button class="secondary" id="btnNext" onclick="send('next')" ${!hasPrd ? 'disabled' : ''}>
            ${Icons.step} Step
        </button>
        <button class="secondary icon-only" onclick="send('refresh')" title="Refresh">
            ${Icons.refresh}
        </button>
        <button class="secondary icon-only" onclick="openSettings()" title="Settings">
            ${Icons.settings}
        </button>
    </div>`;
}

export function getSetupSection(): string {
    return `
    <div class="setup-section">
        <div class="setup-header">
            <span class="setup-icon">${Icons.rocket}</span>
            <span>Get Started with Ralph</span>
        </div>
        <p class="setup-description">
            Describe what you want to build and Ralph will create a PRD.md with structured tasks.
        </p>
        <div class="setup-input-group">
            <textarea
                id="taskInput"
                class="setup-textarea"
                placeholder="Example: Build a todo app with React that has add, delete, and mark complete functionality. Use TypeScript and Tailwind CSS for styling."
                rows="4"
            ></textarea>
            <button class="primary generate-btn" onclick="generatePrd()">
                ${Icons.star}Generate PRD & Tasks
            </button>
        </div>
    </div>`;
}

export function getTimelineSection(): string {
    return `
    <div class="timeline-section" id="timelineSection">
        <div class="timeline-header">
            <span>Task Timeline</span>
            <span id="timelineCount">0/0</span>
        </div>
        <div class="timeline-content">
            <div class="timeline-empty" id="timelineEmpty">No tasks completed yet</div>
            <div class="timeline-bars" id="timelineBars" style="display: none;"></div>
            <div class="timeline-labels" id="timelineLabels" style="display: none;"></div>
        </div>
    </div>`;
}

function getRequirementItem(id: string, label: string, icon: string): string {
    return `
    <div class="requirement-item">
        <input type="checkbox" id="${id}" onchange="updateRequirements()">
        <label for="${id}">${icon} ${label}</label>
    </div>`;
}

export function getRequirementsSection(): string {
    const checkIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>';
    const testIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>';
    const playIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    const typeIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>';
    const lintIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';
    const docIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
    const commitIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><line x1="1.05" y1="12" x2="7" y2="12"/><line x1="17.01" y1="12" x2="22.96" y2="12"/></svg>';

    return `
    <div class="requirements-section" id="requirementsSection">
        <div class="requirements-header" onclick="toggleRequirements()">
            <span class="requirements-header-title">
                ${checkIcon}
                Acceptance Criteria
            </span>
            <span class="requirements-toggle expanded" id="reqToggle">▼</span>
        </div>
        <div class="requirements-content" id="reqContent">
            <div class="requirements-desc">Actions the agent must complete before moving to the next task:</div>
            ${getRequirementItem('reqWriteTests', 'Write unit tests', testIcon)}
            ${getRequirementItem('reqRunTests', 'Run tests', playIcon)}
            ${getRequirementItem('reqTypeCheck', 'Type check (tsc)', typeIcon)}
            ${getRequirementItem('reqLinting', 'Run linting', lintIcon)}
            ${getRequirementItem('reqDocs', 'Update documentation', docIcon)}
            ${getRequirementItem('reqCommit', 'Commit changes', commitIcon)}
        </div>
    </div>`;
}

export function getTaskSection(nextTask: Task | null, hasAnyTasks: boolean): string {
    if (nextTask) {
        return `
        <div class="task-section active" id="taskSection">
            <div class="task-label">Current Task</div>
            <div class="task-text" id="taskText">${escapeHtml(nextTask.description)}</div>
        </div>`;
    } else if (hasAnyTasks) {
        return `
        <div class="task-section">
            <div class="empty-state">
                <div class="empty-state-icon">${Icons.check}</div>
                <div>All tasks completed!</div>
            </div>
        </div>`;
    }
    return '';
}

export function getLogSection(): string {
    return `
    <div class="log-section">
        <div class="log-header">
            <span>Activity</span>
        </div>
        <div class="log-content" id="logArea">
            <div class="log-entry info">
                <span class="log-time">--:--</span>
                <span class="log-msg">Ready to start</span>
            </div>
        </div>
    </div>`;
}

const EXTENSION_VERSION = '0.5.0';

export function getFooter(): string {
    return `
    <div class="footer">
        <div class="footer-warning">
            ⚠️ <strong>Cost Notice:</strong> Each task step spawns one new chat session using your selected model.
        </div>
        <div>
            <a href="https://github.com/aymenfurter/ralph" target="_blank">GitHub: aymenfurter/ralph</a>
            <span class="footer-version">v${EXTENSION_VERSION}</span>
        </div>
        <div class="footer-disclaimer">
            Side project, not officially endorsed by or affiliated with the GitHub Copilot team. "GitHub Copilot" is a trademark of GitHub, Inc.
        </div>
    </div>`;
}

export function getSettingsOverlay(): string {
    const settingsIcon = Icons.settings;
    const closeIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const clockIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>';

    return `
    <div class="settings-overlay" id="settingsOverlay">
        <div class="settings-header">
            <h2>${settingsIcon} Settings</h2>
            <button class="settings-close" onclick="closeSettings()">${closeIcon}</button>
        </div>
        <div class="settings-body">
            <div class="settings-section">
                <div class="settings-section-title">Safety Limits</div>
                <div class="requirement-item">
                    <label for="settingMaxIterations" style="display: flex; align-items: center; gap: 8px;">
                        ${clockIcon}
                        Max iterations:
                        <input type="number" id="settingMaxIterations" min="0" max="100" value="50" onchange="updateSettings()" style="width: 60px; padding: 4px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 3px;">
                    </label>
                </div>
                <div class="setting-help">Maximum number of task iterations before auto-stop (0 = unlimited).</div>
            </div>
        </div>
    </div>`;
}
