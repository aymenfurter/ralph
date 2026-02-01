# Changelog

All notable changes to the Ralph extension will be documented in this file.

## [0.5.1]

### Fixed
- Fixed task parsing for Windows CRLF line endings (Issue: "No pending tasks found" on Windows 11)
- PRD files created on Windows are now parsed correctly regardless of line ending style (CRLF, LF, or CR)

### Added
- Comprehensive test suite for cross-platform line ending support (42 fixture files)

## [0.3.16]

### Changed
- Fresh chat per task now enabled by default
- Simplified timeline and progress bar visuals - solid green/blue instead of gradients
- Current task section now has animated gradient border (modern tech startup look)
- Fixed potential button state issues with null checks
- Timeline bars already show task title on hover

## [0.3.15]

### Changed
- Settings moved to separate overlay view (accessible via settings icon)
- Pre-completion checks now visible only before starting (hidden while running)
- Removed duplicate Ralph logo from pipeline progress bar
- Countdown timer extended from 5 to 12 seconds with circular clock animation
- "Watching" status renamed to "Working"

## [0.3.14]

### Changed
- Simplified UI: Removed Done/Remaining/Iterations stats cards
- Simplified UI: Removed Elapsed/ETA time cards
- Simplified UI: Removed Avg/Fastest/Slowest/Total timeline stats
- New segmented pipeline progress bar showing task segments
- Cleaner, less cluttered interface

## [0.1.0] - 2026-01-12

### Added
- Initial release
- Autonomous development loop with GitHub Copilot integration
- Chat participant (@ralph) with commands:
  - `/start` - Start the autonomous loop
  - `/stop` - Stop the running loop
  - `/status` - Display current status
  - `/task` - Execute a single task
  - `/reset` - Reset the circuit breaker
  - `/config` - Show configuration
  - `/help` - Show help
- Circuit breaker pattern for preventing infinite loops
  - No-progress detection
  - Repeated error detection
  - CLOSED, HALF_OPEN, OPEN states
- Rate limiting (configurable hourly limit)
- Completion detection with confidence scoring
  - RALPH_STATUS block parsing
  - Natural language fallback detection
- Status bar integration
- Monitor webview panel
- Configurable settings
- File persistence for state recovery
- Git integration for change tracking
- Auto-commit support (optional)
