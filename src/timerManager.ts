/// <reference types="node" />
// Use global NodeJS.Timeout and global setInterval/clearInterval
import { INACTIVITY_TIMEOUT_MS, INACTIVITY_CHECK_INTERVAL_MS } from './types';

export type InactivityCallback = () => Promise<void>;

export type CountdownTickCallback = (remaining: number) => void;

export class CountdownTimer {
    private timer: NodeJS.Timeout | null = null;
    private onTick: CountdownTickCallback | null = null;

    start(seconds: number, onTick: CountdownTickCallback): Promise<void> {
        this.stop();
        this.onTick = onTick;
        let remaining = seconds;

        onTick(remaining);

        return new Promise<void>((resolve) => {
            this.timer = setInterval(() => {
                remaining--;
                this.onTick?.(remaining);

                if (remaining <= 0) {
                    this.stop();
                    resolve();
                }
            }, 1000);
        });
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.onTick?.(0);
    }

    isActive(): boolean {
        return this.timer !== null;
    }
}

export class InactivityMonitor {
    private timer: NodeJS.Timeout | null = null;
    private lastActivityTime: number = 0;
    private callback: InactivityCallback | null = null;
    private isWaiting: boolean = false;
    private isPaused: boolean = false;

    start(callback: InactivityCallback): void {
        this.stop();
        this.callback = callback;
        this.lastActivityTime = Date.now();
        this.isWaiting = true;
        this.isPaused = false;

        this.timer = setInterval(async () => {
            if (!this.isWaiting || this.isPaused) {
                return;
            }

            const timeSinceActivity = Date.now() - this.lastActivityTime;

            if (timeSinceActivity >= INACTIVITY_TIMEOUT_MS) {
                this.stop();
                await this.callback?.();
            }
        }, INACTIVITY_CHECK_INTERVAL_MS);
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isWaiting = false;
    }

    recordActivity(): void {
        this.lastActivityTime = Date.now();
    }

    setWaiting(waiting: boolean): void {
        this.isWaiting = waiting;
        if (waiting) {
            this.lastActivityTime = Date.now();
        }
    }

    pause(): void {
        this.isPaused = true;
    }

    resume(): void {
        this.isPaused = false;
        this.lastActivityTime = Date.now();
    }

    isActive(): boolean {
        return this.timer !== null;
    }

    getLastActivityTime(): number {
        return this.lastActivityTime;
    }
}

export function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}
