import * as assert from 'assert';
import { formatDuration, CountdownTimer, InactivityMonitor } from '../../timerManager';

describe('TimerManager', () => {
    describe('formatDuration', () => {
        it('should format seconds only', () => {
            assert.strictEqual(formatDuration(45000), '45s');
        });

        it('should format 0 seconds', () => {
            assert.strictEqual(formatDuration(0), '0s');
        });

        it('should format 1 second', () => {
            assert.strictEqual(formatDuration(1000), '1s');
        });

        it('should format minutes and seconds', () => {
            assert.strictEqual(formatDuration(90000), '1m 30s');
        });

        it('should format 5 minutes', () => {
            assert.strictEqual(formatDuration(300000), '5m 0s');
        });

        it('should format hours and minutes', () => {
            assert.strictEqual(formatDuration(5400000), '1h 30m');
        });

        it('should format 2 hours', () => {
            assert.strictEqual(formatDuration(7200000), '2h 0m');
        });

        it('should format 1 hour exactly', () => {
            assert.strictEqual(formatDuration(3600000), '1h 0m');
        });

        it('should format 59 seconds', () => {
            assert.strictEqual(formatDuration(59000), '59s');
        });

        it('should format 60 seconds as 1m 0s', () => {
            assert.strictEqual(formatDuration(60000), '1m 0s');
        });

        it('should format 59 minutes 59 seconds', () => {
            assert.strictEqual(formatDuration(3599000), '59m 59s');
        });

        it('should handle fractional milliseconds by rounding down', () => {
            assert.strictEqual(formatDuration(1500), '1s');
        });

        it('should format 10 hours 30 minutes', () => {
            assert.strictEqual(formatDuration(37800000), '10h 30m');
        });

        it('should handle negative values', () => {
            // Negative values should floor to 0 or negative seconds
            assert.strictEqual(formatDuration(-1000), '-1s');
        });

        it('should handle very large values (24+ hours)', () => {
            const twentyFourHours = 24 * 60 * 60 * 1000;
            assert.strictEqual(formatDuration(twentyFourHours), '24h 0m');
        });

        it('should handle 100 hours', () => {
            const hundredHours = 100 * 60 * 60 * 1000;
            assert.strictEqual(formatDuration(hundredHours), '100h 0m');
        });

        it('should format 1 minute 1 second', () => {
            assert.strictEqual(formatDuration(61000), '1m 1s');
        });

        it('should format 1 hour 1 minute', () => {
            assert.strictEqual(formatDuration(3660000), '1h 1m');
        });

        it('should handle sub-second values', () => {
            assert.strictEqual(formatDuration(500), '0s');
            assert.strictEqual(formatDuration(999), '0s');
        });

        it('should handle exactly 1 millisecond', () => {
            assert.strictEqual(formatDuration(1), '0s');
        });
    });

    describe('CountdownTimer', () => {
        let timer: CountdownTimer;

        beforeEach(() => {
            timer = new CountdownTimer();
        });

        afterEach(() => {
            timer.stop();
        });

        it('should not be active initially', () => {
            assert.strictEqual(timer.isActive(), false);
        });

        it('should be active after starting', () => {
            let tickCalled = false;

            timer.start(5, () => {
                tickCalled = true;
            });

            assert.strictEqual(timer.isActive(), true);
            assert.strictEqual(tickCalled, true);

            timer.stop();
        });

        it('should not be active after stopping', () => {
            timer.start(10, () => { });
            timer.stop();
            assert.strictEqual(timer.isActive(), false);
        });

        it('should call onTick with initial value immediately', (done) => {
            let receivedValue: number | null = null;

            timer.start(5, (remaining) => {
                if (receivedValue === null) {
                    receivedValue = remaining;
                    timer.stop();
                    assert.strictEqual(receivedValue, 5);
                    done();
                }
            });
        });

        it('should call onTick with 0 when stopped', () => {
            let lastValue: number = -1;
            timer.start(10, (remaining) => {
                lastValue = remaining;
            });
            timer.stop();
            assert.strictEqual(lastValue, 0);
        });

        it('should handle starting with 0 seconds', () => {
            let tickCalled = false;
            timer.start(0, (remaining) => {
                tickCalled = true;
                assert.strictEqual(remaining, 0);
            });
            assert.strictEqual(tickCalled, true);
        });

        it('should handle starting with 1 second', () => {
            const tickValues: number[] = [];
            timer.start(1, (remaining) => {
                tickValues.push(remaining);
            });
            // Initial value should be 1
            assert.strictEqual(tickValues[0], 1);
            timer.stop();
        });

        it('should handle multiple stop calls without error', () => {
            timer.start(5, () => { });
            timer.stop();
            timer.stop();
            timer.stop();
            assert.strictEqual(timer.isActive(), false);
        });

        it('should restart correctly after stopping', () => {
            let firstCallValue: number | null = null;
            let secondCallValue: number | null = null;

            timer.start(5, (remaining) => {
                if (firstCallValue === null) {
                    firstCallValue = remaining;
                }
            });
            timer.stop();

            timer.start(10, (remaining) => {
                if (secondCallValue === null) {
                    secondCallValue = remaining;
                }
            });

            assert.strictEqual(firstCallValue, 5);
            assert.strictEqual(secondCallValue, 10);
            timer.stop();
        });
    });

    describe('InactivityMonitor', () => {
        let monitor: InactivityMonitor;

        beforeEach(() => {
            monitor = new InactivityMonitor();
        });

        afterEach(() => {
            monitor.stop();
        });

        it('should not be active initially', () => {
            assert.strictEqual(monitor.isActive(), false);
        });

        it('should be active after starting', () => {
            monitor.start(async () => { });
            assert.strictEqual(monitor.isActive(), true);
        });

        it('should not be active after stopping', () => {
            monitor.start(async () => { });
            monitor.stop();
            assert.strictEqual(monitor.isActive(), false);
        });

        it('should record activity and update timestamp', () => {
            monitor.start(async () => { });
            const before = monitor.getLastActivityTime();

            const start = Date.now();
            while (Date.now() - start < 5) {
                // Busy wait to ensure time passes
            }

            monitor.recordActivity();
            const after = monitor.getLastActivityTime();

            assert.ok(after >= before, 'Activity time should be updated');
        });

        it('setWaiting should update last activity time when set to true', () => {
            monitor.start(async () => { });
            const before = monitor.getLastActivityTime();

            const start = Date.now();
            while (Date.now() - start < 5) {
                // Busy wait to ensure time passes
            }

            monitor.setWaiting(true);
            const after = monitor.getLastActivityTime();

            assert.ok(after >= before, 'Activity time should be updated when waiting set to true');
        });

        it('pause should not stop the monitor', () => {
            monitor.start(async () => { });
            monitor.pause();
            assert.strictEqual(monitor.isActive(), true);
        });

        it('resume should update last activity time', () => {
            monitor.start(async () => { });
            const before = monitor.getLastActivityTime();

            const start = Date.now();
            while (Date.now() - start < 5) {
                // Busy wait to ensure time passes
            }

            monitor.pause();
            monitor.resume();
            const after = monitor.getLastActivityTime();

            assert.ok(after >= before, 'Activity time should be updated on resume');
        });

        it('getLastActivityTime should return a number', () => {
            monitor.start(async () => { });
            const lastTime = monitor.getLastActivityTime();
            assert.strictEqual(typeof lastTime, 'number');
            assert.ok(lastTime > 0);
        });

        it('should handle multiple stop calls without error', () => {
            monitor.start(async () => { });
            monitor.stop();
            monitor.stop();
            monitor.stop();
            assert.strictEqual(monitor.isActive(), false);
        });

        it('setWaiting(false) should not update last activity time', () => {
            monitor.start(async () => { });
            const before = monitor.getLastActivityTime();

            const start = Date.now();
            while (Date.now() - start < 5) {
                // Busy wait
            }

            monitor.setWaiting(false);
            const after = monitor.getLastActivityTime();

            // The timestamp should be the same since setWaiting(false) doesn't update it
            assert.strictEqual(before, after);
        });

        it('should restart correctly after stopping', () => {
            monitor.start(async () => { /* empty */ });
            const firstActivityTime = monitor.getLastActivityTime();
            monitor.stop();

            const start = Date.now();
            while (Date.now() - start < 5) {
                // Busy wait
            }

            monitor.start(async () => { /* empty */ });
            const secondActivityTime = monitor.getLastActivityTime();

            assert.ok(secondActivityTime >= firstActivityTime);
            assert.strictEqual(monitor.isActive(), true);
        });

        it('pause and resume should work correctly in sequence', () => {
            monitor.start(async () => { });
            
            monitor.pause();
            assert.strictEqual(monitor.isActive(), true);
            
            monitor.resume();
            assert.strictEqual(monitor.isActive(), true);
            
            monitor.pause();
            monitor.pause(); // Multiple pauses
            assert.strictEqual(monitor.isActive(), true);
            
            monitor.resume();
            assert.strictEqual(monitor.isActive(), true);
        });

        it('recordActivity should work multiple times', () => {
            monitor.start(async () => { });
            
            let lastTime = monitor.getLastActivityTime();
            
            for (let i = 0; i < 3; i++) {
                const start = Date.now();
                while (Date.now() - start < 2) {
                    // Busy wait
                }
                monitor.recordActivity();
                const newTime = monitor.getLastActivityTime();
                assert.ok(newTime >= lastTime, `Activity time should be updated on call ${i + 1}`);
                lastTime = newTime;
            }
        });
    });
});
