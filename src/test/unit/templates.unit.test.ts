import * as assert from 'assert';
import {
    Icons,
    getLogo,
    getHeader,
    getControls,
    getSetupSection,
    getTimelineSection,
    getRequirementsSection,
    getTaskSection,
    getLogSection,
    getFooter,
    getSettingsOverlay
} from '../../webview/templates';
import { Task, TaskStatus } from '../../types';

describe('Webview Templates', () => {
    describe('Icons', () => {
        it('should have play icon', () => {
            assert.ok(Icons.play);
            assert.ok(Icons.play.includes('svg'));
        });

        it('should have pause icon', () => {
            assert.ok(Icons.pause);
            assert.ok(Icons.pause.includes('svg'));
        });

        it('should have stop icon', () => {
            assert.ok(Icons.stop);
            assert.ok(Icons.stop.includes('svg'));
        });

        it('should have step icon', () => {
            assert.ok(Icons.step);
            assert.ok(Icons.step.includes('svg'));
        });

        it('should have refresh icon', () => {
            assert.ok(Icons.refresh);
            assert.ok(Icons.refresh.includes('svg'));
        });

        it('should have settings icon', () => {
            assert.ok(Icons.settings);
            assert.ok(Icons.settings.includes('svg'));
        });

        it('should have check icon', () => {
            assert.ok(Icons.check);
            assert.ok(Icons.check.includes('svg'));
        });

        it('should have rocket icon', () => {
            assert.ok(Icons.rocket);
            assert.ok(Icons.rocket.includes('svg'));
        });

        it('should have star icon', () => {
            assert.ok(Icons.star);
            assert.ok(Icons.star.includes('svg'));
        });
    });

    describe('getLogo', () => {
        it('should generate SVG with default size', () => {
            const logo = getLogo();
            assert.ok(logo.includes('svg'));
            assert.ok(logo.includes('width="24"'));
            assert.ok(logo.includes('height="24"'));
        });

        it('should generate SVG with custom size', () => {
            const logo = getLogo(48);
            assert.ok(logo.includes('width="48"'));
            assert.ok(logo.includes('height="48"'));
        });

        it('should include Ralph "R" text', () => {
            const logo = getLogo();
            assert.ok(logo.includes('>R<'));
        });

        it('should include gradient definition', () => {
            const logo = getLogo();
            assert.ok(logo.includes('linearGradient'));
            assert.ok(logo.includes('logoGradient'));
        });

        it('should include circles for the logo shape', () => {
            const logo = getLogo();
            assert.ok(logo.includes('<circle'));
        });
    });

    describe('getHeader', () => {
        it('should generate header HTML', () => {
            const header = getHeader();
            assert.ok(header.includes('class="header'));
            assert.ok(header.includes('id="header"'));
        });

        it('should include status pill', () => {
            const header = getHeader();
            assert.ok(header.includes('status-pill'));
            assert.ok(header.includes('statusText'));
        });

        it('should include timing display', () => {
            const header = getHeader();
            assert.ok(header.includes('timing-display'));
            assert.ok(header.includes('elapsedTime'));
            assert.ok(header.includes('etaTime'));
        });

        it('should include countdown clock', () => {
            const header = getHeader();
            assert.ok(header.includes('countdown'));
            assert.ok(header.includes('clockFill'));
        });

        it('should include Ralph title', () => {
            const header = getHeader();
            assert.ok(header.includes('<h1>Ralph</h1>'));
        });
    });

    describe('getControls', () => {
        it('should generate controls with PRD', () => {
            const controls = getControls(true);
            assert.ok(controls.includes('btnStart'));
            assert.ok(controls.includes('btnPause'));
            assert.ok(controls.includes('btnStop'));
        });

        it('should disable start button when no PRD', () => {
            const controls = getControls(false);
            assert.ok(controls.includes('id="btnStart"'));

            assert.ok(controls.includes('id="btnStart" onclick="send(\'start\')" disabled'));
        });

        it('should enable start button when PRD exists', () => {
            const controls = getControls(true);

            assert.ok(controls.includes('id="btnStart" onclick="send(\'start\')"'));

            const startButtonMatch = controls.match(/id="btnStart"[^>]*>/);
            assert.ok(startButtonMatch);
            assert.ok(!startButtonMatch[0].includes('disabled'));
        });

        it('should include step button', () => {
            const controls = getControls(true);
            assert.ok(controls.includes('btnNext'));
        });

        it('should include refresh button', () => {
            const controls = getControls(true);
            assert.ok(controls.includes("send('refresh')"));
        });

        it('should include settings button', () => {
            const controls = getControls(true);
            assert.ok(controls.includes('openSettings()'));
        });

        it('should include resume button (hidden by default)', () => {
            const controls = getControls(true);
            assert.ok(controls.includes('btnResume'));
            assert.ok(controls.includes('style="display:none"'));
        });
    });

    describe('getSetupSection', () => {
        it('should generate setup section HTML', () => {
            const setup = getSetupSection();
            assert.ok(setup.includes('setup-section'));
        });

        it('should include rocket icon', () => {
            const setup = getSetupSection();
            assert.ok(setup.includes('setup-icon'));
        });

        it('should include task input textarea', () => {
            const setup = getSetupSection();
            assert.ok(setup.includes('taskInput'));
            assert.ok(setup.includes('textarea'));
        });

        it('should include generate PRD button', () => {
            const setup = getSetupSection();
            assert.ok(setup.includes('generatePrd()'));
            assert.ok(setup.includes('generate-btn'));
        });

        it('should include placeholder text', () => {
            const setup = getSetupSection();
            assert.ok(setup.includes('placeholder='));
        });

        it('should include description text', () => {
            const setup = getSetupSection();
            assert.ok(setup.includes('setup-description'));
        });
    });

    describe('getTimelineSection', () => {
        it('should generate timeline section HTML', () => {
            const timeline = getTimelineSection();
            assert.ok(timeline.includes('timeline-section'));
        });

        it('should include timeline header', () => {
            const timeline = getTimelineSection();
            assert.ok(timeline.includes('timeline-header'));
            assert.ok(timeline.includes('Task Timeline'));
        });

        it('should include timeline count', () => {
            const timeline = getTimelineSection();
            assert.ok(timeline.includes('timelineCount'));
            assert.ok(timeline.includes('0/0'));
        });

        it('should include empty state', () => {
            const timeline = getTimelineSection();
            assert.ok(timeline.includes('timelineEmpty'));
            assert.ok(timeline.includes('No tasks completed yet'));
        });

        it('should include bars and labels containers', () => {
            const timeline = getTimelineSection();
            assert.ok(timeline.includes('timelineBars'));
            assert.ok(timeline.includes('timelineLabels'));
        });
    });

    describe('getRequirementsSection', () => {
        it('should generate requirements section HTML', () => {
            const requirements = getRequirementsSection();
            assert.ok(requirements.includes('requirements-section'));
        });

        it('should include all requirement checkboxes', () => {
            const requirements = getRequirementsSection();
            assert.ok(requirements.includes('reqWriteTests'));
            assert.ok(requirements.includes('reqRunTests'));
            assert.ok(requirements.includes('reqTypeCheck'));
            assert.ok(requirements.includes('reqLinting'));
            assert.ok(requirements.includes('reqDocs'));
            assert.ok(requirements.includes('reqCommit'));
        });

        it('should include toggle functionality', () => {
            const requirements = getRequirementsSection();
            assert.ok(requirements.includes('toggleRequirements()'));
            assert.ok(requirements.includes('reqToggle'));
        });

        it('should include updateRequirements handler', () => {
            const requirements = getRequirementsSection();
            assert.ok(requirements.includes('updateRequirements()'));
        });

        it('should include acceptance criteria header', () => {
            const requirements = getRequirementsSection();
            assert.ok(requirements.includes('Acceptance Criteria'));
        });

        it('should include requirements description', () => {
            const requirements = getRequirementsSection();
            assert.ok(requirements.includes('requirements-desc'));
        });
    });

    describe('getTaskSection', () => {
        it('should show current task when task exists', () => {
            const task: Task = {
                id: 'task-1',
                description: 'Test task description',
                status: TaskStatus.PENDING,
                lineNumber: 1,
                rawLine: '- [ ] Test task description'
            };
            const section = getTaskSection(task, true);
            assert.ok(section.includes('Current Task'));
            assert.ok(section.includes('Test task description'));
            assert.ok(section.includes('task-section active'));
        });

        it('should show completed state when no task and has tasks', () => {
            const section = getTaskSection(null, true);
            assert.ok(section.includes('All tasks completed!'));
            assert.ok(section.includes('empty-state'));
        });

        it('should return empty string when no task and no tasks', () => {
            const section = getTaskSection(null, false);
            assert.strictEqual(section, '');
        });

        it('should include task text element', () => {
            const task: Task = {
                id: 'task-1',
                description: 'Another task',
                status: TaskStatus.IN_PROGRESS,
                lineNumber: 2,
                rawLine: '- [~] Another task'
            };
            const section = getTaskSection(task, true);
            assert.ok(section.includes('taskText'));
        });
    });

    describe('getLogSection', () => {
        it('should generate log section HTML', () => {
            const log = getLogSection();
            assert.ok(log.includes('log-section'));
        });

        it('should include log header with Activity title', () => {
            const log = getLogSection();
            assert.ok(log.includes('log-header'));
            assert.ok(log.includes('Activity'));
        });

        it('should include log area', () => {
            const log = getLogSection();
            assert.ok(log.includes('logArea'));
        });

        it('should include initial log entry', () => {
            const log = getLogSection();
            assert.ok(log.includes('log-entry'));
            assert.ok(log.includes('Ready to start'));
        });
    });

    describe('getFooter', () => {
        it('should generate footer HTML', () => {
            const footer = getFooter();
            assert.ok(footer.includes('footer'));
        });

        it('should include cost warning', () => {
            const footer = getFooter();
            assert.ok(footer.includes('footer-warning'));
            assert.ok(footer.includes('Cost Notice'));
        });

        it('should include GitHub link', () => {
            const footer = getFooter();
            assert.ok(footer.includes('https://github.com/aymenfurter/ralph'));
        });

        it('should include disclaimer', () => {
            const footer = getFooter();
            assert.ok(footer.includes('footer-disclaimer'));
            assert.ok(footer.includes('not officially endorsed by or affiliated with'));
        });
    });

    describe('getSettingsOverlay', () => {
        it('should generate settings overlay HTML', () => {
            const overlay = getSettingsOverlay();
            assert.ok(overlay.includes('settings-overlay'));
            assert.ok(overlay.includes('settingsOverlay'));
        });

        it('should include settings header', () => {
            const overlay = getSettingsOverlay();
            assert.ok(overlay.includes('settings-header'));
            assert.ok(overlay.includes('Settings'));
        });

        it('should include close button', () => {
            const overlay = getSettingsOverlay();
            assert.ok(overlay.includes('settings-close'));
            assert.ok(overlay.includes('closeSettings()'));
        });

        it('should include max iterations setting', () => {
            const overlay = getSettingsOverlay();
            assert.ok(overlay.includes('settingMaxIterations'));
            assert.ok(overlay.includes('Max iterations'));
        });

        it('should include updateSettings handler', () => {
            const overlay = getSettingsOverlay();
            assert.ok(overlay.includes('updateSettings()'));
        });

        it('should include help text', () => {
            const overlay = getSettingsOverlay();
            assert.ok(overlay.includes('setting-help'));
        });
    });
});
