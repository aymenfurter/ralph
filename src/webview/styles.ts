export function getStyles(): string {
    return `
        :root {
            --gradient-1: #f97316;
            --gradient-2: #ec4899;
            --gradient-3: #8b5cf6;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 0;
            overflow-x: hidden;
        }

        /* Animated gradient header */
        .header {
            background: linear-gradient(-45deg, var(--gradient-1), var(--gradient-2), var(--gradient-3), var(--gradient-2));
            background-size: 400% 400%;
            padding: 20px 24px;
            position: relative;
            overflow: hidden;
        }

        .header.idle {
            animation: none;
            background: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        .header.running { animation: gradientShift 3s ease infinite; }
        .header.waiting { animation: gradientShift 6s ease infinite; }

        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        /* Shimmer effect overlay */
        .header.running::after,
        .header.waiting::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
            animation: shimmer 2s infinite;
        }

        @keyframes shimmer { 100% { left: 100%; } }

        .header-content {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .title {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .title h1 {
            font-size: 16px;
            font-weight: 600;
            color: inherit;
        }

        .ralph-logo { flex-shrink: 0; }
        .header.idle .title h1 { color: var(--vscode-foreground); }
        .header.running .title h1, .header.waiting .title h1 { color: white; }

        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 100px;
            font-size: 11px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .header.idle .status-pill {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        .header.running .status-pill, .header.waiting .status-pill {
            background: rgba(255,255,255,0.2);
            color: white;
            backdrop-filter: blur(4px);
        }
        .telegram-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            margin-left: 8px;
            position: relative;
            cursor: help;
            transition: all 0.3s ease;
        }

        .telegram-pill svg {
            width: 14px;
            height: 14px;
        }

        .telegram-status-dot {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--vscode-testing-iconPassed);
            border: 2px solid var(--vscode-editor-background);
        }

        .telegram-pill.disabled {
            opacity: 0.3;
            background: rgba(128, 128, 128, 0.1);
        }
        
        .telegram-pill.disabled .telegram-status-dot {
            background-color: var(--vscode-disabledForeground);
        }

        .telegram-pill.error {
            background: rgba(255, 0, 0, 0.1);
            color: var(--vscode-errorForeground);
        }

        .telegram-pill.error .telegram-status-dot {
            background-color: var(--vscode-errorForeground);
        }

        .telegram-pill.active {
            background: rgba(59, 130, 246, 0.15); /* Telegram blue-ish */
            color: #3b82f6; 
        }

        .telegram-pill.active .telegram-status-dot {
             background-color: #22c55e; /* Green for connected */
             box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
             animation: pulse 2s infinite;
        }

        .header.running .telegram-pill.active, 
        .header.waiting .telegram-pill.active {
            background: rgba(255, 255, 255, 0.2);
            color: white;
        }

        .header.running .telegram-status-dot,
        .header.waiting .telegram-status-dot {
            border-color: transparent;
        }

        @keyframes pulse {
            0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); }
            100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
        }

        .header.running .status-dot { animation: pulse 1s infinite; }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
        }

        /* Timing displays */
        .header-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .timing-display {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 6px 12px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            color: white;
            font-size: 11px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s, visibility 0.2s;
        }

        .timing-display.visible { opacity: 1; visibility: visible; }

        .timing-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        }

        .timing-label {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.7;
        }

        .timing-value {
            font-size: 13px;
            font-weight: 600;
            font-family: var(--vscode-editor-font-family);
        }

        /* Countdown clock display */
        .countdown {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            color: white;
            font-size: 12px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s, visibility 0.2s;
        }

        .countdown.visible { opacity: 1; visibility: visible; }

        .countdown-clock {
            width: 28px;
            height: 28px;
            position: relative;
        }

        .countdown-clock svg { transform: rotate(-90deg); }

        .countdown-clock-bg {
            fill: none;
            stroke: rgba(255,255,255,0.2);
            stroke-width: 3;
        }

        .countdown-clock-fill {
            fill: none;
            stroke: url(#clockGradient);
            stroke-width: 3;
            stroke-linecap: round;
            transition: stroke-dashoffset 1s linear;
        }

        /* Main content */
        .content { padding: 16px; }

        /* Controls */
        .controls {
            display: flex;
            gap: 8px;
            padding: 16px;
            background: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-widget-border);
        }

        button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        button.primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        button.primary:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }

        button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        button.secondary:hover:not(:disabled) {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        button.danger { background: #dc2626; color: white; }
        button.danger:hover:not(:disabled) { background: #b91c1c; }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        button.icon-only { padding: 6px; min-width: 28px; }
        .spacer { flex: 1; }

        /* Current task */
        .task-section {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 16px;
        }

        .task-section.active {
            border-color: #3b82f6;
            border-width: 2px;
            padding: 11px;
        }

        .task-label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }

        .task-text { font-size: 13px; line-height: 1.4; }

        /* Activity log */
        .log-section {
            background: var(--vscode-terminal-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            overflow: hidden;
        }

        .log-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: var(--vscode-sideBarSectionHeader-background);
            border-bottom: 1px solid var(--vscode-widget-border);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
        }

        .log-content {
            padding: 8px;
            max-height: 180px;
            overflow-y: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }

        .log-entry {
            padding: 4px 8px;
            border-radius: 3px;
            margin-bottom: 2px;
            display: flex;
            gap: 8px;
        }

        .log-entry:hover { background: var(--vscode-list-hoverBackground); }
        .log-time { color: var(--vscode-descriptionForeground); flex-shrink: 0; }
        .log-msg { flex: 1; }
        .log-entry.success .log-msg { color: #22c55e; }
        .log-entry.info .log-msg { color: var(--vscode-textLink-foreground); }

        /* Footer */
        .footer {
            margin-top: 20px;
            padding: 12px;
            border-top: 1px solid var(--vscode-widget-border);
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            text-align: center;
            line-height: 1.6;
        }

        .footer a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }

        .footer a:hover { text-decoration: underline; }

        .footer-version {
            margin-left: 8px;
            padding: 2px 6px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
        }

        .footer-warning {
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid rgba(234, 179, 8, 0.3);
            border-radius: 4px;
            padding: 8px 10px;
            margin-bottom: 10px;
            font-size: 11px;
            color: #eab308;
        }

        .footer-disclaimer { opacity: 0.7; font-size: 10px; margin-top: 8px; }

        /* Warning banner */
        .warning-banner {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            background: rgba(234, 179, 8, 0.1);
            border: 1px solid rgba(234, 179, 8, 0.3);
            border-radius: 6px;
            margin-bottom: 16px;
            font-size: 13px;
        }

        .warning-banner code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
        }

        /* Empty state */
        .empty-state {
            text-align: center;
            padding: 32px;
            color: var(--vscode-descriptionForeground);
        }

        .empty-state-icon { font-size: 32px; margin-bottom: 12px; }

        /* Setup section for PRD generation */
        .setup-section {
            background: linear-gradient(135deg,
                rgba(124, 58, 237, 0.08),
                rgba(37, 99, 235, 0.08),
                rgba(6, 182, 212, 0.08)
            );
            border: 1px solid rgba(124, 58, 237, 0.3);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
        }

        .setup-header {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .setup-icon { font-size: 20px; }

        .setup-description {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            margin-bottom: 12px;
            line-height: 1.5;
        }

        .setup-input-group {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .setup-textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: 13px;
            resize: vertical;
            min-height: 80px;
        }

        .setup-textarea:focus {
            outline: none;
            border-color: var(--gradient-2);
            box-shadow: 0 0 0 1px var(--gradient-2);
        }

        .setup-textarea::placeholder { color: var(--vscode-input-placeholderForeground); }

        .generate-btn {
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 500;
            background: linear-gradient(135deg, var(--gradient-1), var(--gradient-2));
            border: none;
            color: white;
        }

        .generate-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .generate-btn:disabled { opacity: 0.5; cursor: wait; }

        /* Task Timeline / Histogram */
        .timeline-section {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            margin-bottom: 16px;
            overflow: hidden;
        }

        .timeline-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: var(--vscode-sideBarSectionHeader-background);
            border-bottom: 1px solid var(--vscode-widget-border);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
        }

        .timeline-content { padding: 12px; min-height: 60px; }

        .timeline-empty {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            padding: 16px;
        }

        .timeline-bars {
            display: flex;
            align-items: flex-end;
            gap: 4px;
            height: 50px;
        }

        .timeline-bar {
            flex: 1;
            min-width: 20px;
            max-width: 40px;
            background: #22c55e;
            border-radius: 3px 3px 0 0;
            position: relative;
            cursor: pointer;
            transition: opacity 0.15s, height 1s linear;
        }

        .timeline-bar.current {
            background: #3b82f6;
            animation: barPulse 2s ease-in-out infinite;
        }

        @keyframes barPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .timeline-bar.pending { background: var(--vscode-widget-border); opacity: 0.4; }
        .timeline-bar:hover { opacity: 0.8; }

        .timeline-bar::after {
            content: attr(data-duration);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 9px;
            color: var(--vscode-descriptionForeground);
            white-space: nowrap;
            padding-bottom: 2px;
            opacity: 0;
            transition: opacity 0.15s;
        }

        .timeline-bar:hover::after { opacity: 1; }

        .timeline-labels {
            display: flex;
            gap: 4px;
            margin-top: 4px;
        }

        .timeline-label {
            flex: 1;
            min-width: 20px;
            max-width: 40px;
            text-align: center;
            font-size: 9px;
            color: var(--vscode-descriptionForeground);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        /* Requirements section */
        .requirements-section {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            margin-bottom: 16px;
            overflow: hidden;
        }

        .requirements-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 12px;
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(37, 99, 235, 0.08));
            border-bottom: 1px solid var(--vscode-widget-border);
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-foreground);
            cursor: pointer;
        }

        .requirements-header:hover {
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(37, 99, 235, 0.12));
        }

        .requirements-header-title {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .requirements-header-title svg { opacity: 0.8; }
        .requirements-toggle { font-size: 10px; transition: transform 0.2s; }
        .requirements-toggle.expanded { transform: rotate(180deg); }
        .requirements-content { padding: 12px; display: block; }
        .requirements-content.collapsed { display: none; }

        .requirements-desc {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 12px;
            line-height: 1.4;
        }

        .requirement-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            font-size: 12px;
            border-radius: 4px;
            margin-bottom: 4px;
            transition: background 0.15s;
        }

        .requirement-item:hover { background: var(--vscode-list-hoverBackground); }
        .requirement-item:last-child { margin-bottom: 0; }

        .requirement-item input[type="checkbox"] {
            width: 16px;
            height: 16px;
            accent-color: var(--gradient-2);
            cursor: pointer;
            flex-shrink: 0;
        }

        .requirement-item label {
            cursor: pointer;
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .requirement-item svg { opacity: 0.7; flex-shrink: 0; }

        .requirement-item .req-desc {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            margin-left: 22px;
            margin-top: 2px;
        }

        .setting-help {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
            padding: 8px 10px;
            background: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
            line-height: 1.4;
        }

        /* Settings overlay view */
        .settings-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--vscode-editor-background);
            z-index: 100;
            display: none;
            flex-direction: column;
        }

        .settings-overlay.visible { display: flex; }

        .settings-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: linear-gradient(135deg, var(--gradient-1), var(--gradient-2));
            color: white;
        }

        .settings-header h2 {
            font-size: 14px;
            font-weight: 600;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .settings-close {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .settings-close:hover { background: rgba(255,255,255,0.3); }
        .settings-body { flex: 1; padding: 16px; overflow-y: auto; }
        .settings-section { margin-bottom: 24px; }

        .settings-section-title {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
    `;
}
