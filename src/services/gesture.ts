/**
 * Gesture recognition service via MediaPipe HandLandmarker.
 *
 * Priority 4 input — used when no BLE headset is connected.
 *
 * Architecture (AGENTS.md §3.3):
 *   gesture → onGesture('next') → InteractionControls → FSM NEXT
 *
 * ── Dev mode ──
 * Simulates random `next` gestures every 500 ms so UI/FSM integration
 * can be tested without a camera or a model file.
 *
 * ── Production ──
 * Loads `@mediapipe/tasks-vision` `HandLandmarker`, runs it on each
 * camera frame, evaluates landmarks for a swipe-right gesture, and
 * fires `onGesture('next')` when detected.
 */
export type GestureKind = 'next';

/** Internal state for a running / stopped service. */
type GestureServiceState = 'idle' | 'running';

/**
 * Gesture-specific error wrapper.
 */
export class GestureError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'GestureError';
    this.cause = cause;
  }
}

/** Reactive mode — `true` when running inside a React Native production build. */
const IS_PRODUCTION = typeof __DEV__ !== 'undefined' ? !__DEV__ : false;

/** Mock interval period in milliseconds (development only). */
const MOCK_INTERVAL_MS = 500;

/**
 * Handles MediaPipe HandLandmarker lifecycle and gesture detection.
 *
 * Usage:
 * ```ts
 * const gesture = new GestureService();
 * gesture.onGesture = (kind) => console.log('Gesture:', kind);
 * await gesture.start();
 * // ...
 * gesture.stop();
 * ```
 */
export class GestureService {
  /** External callback — wire this to `InteractionControls.dispatch`. */
  onGesture: ((gesture: GestureKind) => void) | null = null;

  private _state: GestureServiceState = 'idle';
  private _mockTimer: ReturnType<typeof setInterval> | null = null;

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Initialise and start gesture detection.
   *
   * **Dev**: immediately resolves, starts a mock interval.
   * **Prod**: loads the MediaPipe HandLandmarker model, starts frame
   * capture, then resolves.
   */
  async start(): Promise<void> {
    if (this._state === 'running') return;

    if (IS_PRODUCTION) {
      // ----------------------------------------------------------------
      // TODO(prod): Load @mediapipe/tasks-vision HandLandmarker
      //
      //    import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
      //
      //    const vision = await FilesetResolver.forVisionTasks(
      //      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
      //    );
      //    this._landmarker = await HandLandmarker.createFromOptions(vision, {
      //      baseOptions: {
      //        modelAssetPath: 'https://storage.googleapis.com/.../hand_landmarker.task',
      //      },
      //      runningMode: 'VIDEO',
      //      numHands: 1,
      //    });
      //
      // Then wire each camera frame through `this._landmarker.detectForVideo()`
      // and evaluate `landmarks` for a swipe-right gesture.
      // ----------------------------------------------------------------
      throw new GestureError('GestureService: production HandLandmarker not yet implemented');
    }

    this._state = 'running';
    this._startMockInterval();
  }

  /**
   * Stop gesture detection and release resources.
   */
  stop(): void {
    this._state = 'idle';
    this._clearMockInterval();

    if (IS_PRODUCTION) {
      // TODO(prod): Close HandLandmarker, release WASM resources, stop camera.
      //   this._landmarker?.close();
    }
  }

  // -------------------------------------------------------------------
  // Internal — dev mock
  // -------------------------------------------------------------------

  /**
   * Periodically fire a random `next` gesture to simulate user input.
   * Roughly 30 % of ticks produce a gesture so the interaction isn't
   * completely saturated.
   */
  private _startMockInterval(): void {
    this._mockTimer = setInterval(() => {
      if (this._state !== 'running') return;

      // ~30 % chance per tick → average 1 gesture every ~1.6 s.
      if (Math.random() < 0.3) {
        this.onGesture?.('next');
      }
    }, MOCK_INTERVAL_MS);
  }

  private _clearMockInterval(): void {
    if (this._mockTimer !== null) {
      clearInterval(this._mockTimer);
      this._mockTimer = null;
    }
  }
}
