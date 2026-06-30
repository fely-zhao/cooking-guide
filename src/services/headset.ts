/**
 * BLE HID headset button service.
 *
 * Priority 1 input — the primary "next-step" interaction channel.
 * When a headset is connected, the four-level fallback (AGENTS.md §3)
 * skips directly to headset → voice, bypassing screen tap and gesture.
 *
 * ── Dev mode ──
 * No-op.  The service resolves immediately and never fires buttons.
 * Developers test via the on-screen button or keyboard shortcut.
 *
 * ── Production ──
 * Scans for BLE HID devices (UUID 0x1812 = Human Interface Device),
 * connects, subscribes to the HID Input Report characteristic, and
 * maps button report payloads to `single` / `double` / `long` events.
 */
export type ButtonEvent = 'single' | 'double' | 'long';

/** Internal state for a running / stopped service. */
type HeadsetServiceState = 'idle' | 'scanning' | 'connected';

/**
 * Headset-specific error wrapper.
 */
export class HeadsetError extends Error {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'HeadsetError';
    this.cause = cause;
  }
}

/** Reactive mode — `true` when running inside a React Native production build. */
const IS_PRODUCTION = typeof __DEV__ !== 'undefined' ? !__DEV__ : false;

/**
 * Standard BLE HID Service UUID (16-bit → 128‑bit).
 *
 * Reference: Bluetooth SIG 0x1812
 *   https://www.bluetooth.com/specifications/assigned-numbers/
 */
const HID_SERVICE_UUID = '00001812-0000-1000-8000-00805f9b34fb';

/**
 * Manages BLE HID headset connection and button event parsing.
 *
 * Usage:
 * ```ts
 * const headset = new HeadsetService();
 * headset.onButton = (event) => console.log('Button:', event);
 * await headset.start();
 * // ...
 * headset.stop();
 * ```
 */
export class HeadsetService {
  /** External callback — wire this to `InteractionControls.dispatch`. */
  onButton: ((event: ButtonEvent) => void) | null = null;

  private _state: HeadsetServiceState = 'idle';

  // Production BLE references — held here so `stop()` can clean them up.
  // In dev mode these stay `null` / `undefined`.
  private _bleManager: unknown = null;
  private _connectedDevice: unknown = null;
  private _subscription: unknown = null;

  // -------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------

  /**
   * Scan for and connect to a BLE HID headset.
   *
   * **Dev**: resolves immediately, never fires button events.
   * **Prod**: scans for devices advertising the HID service (0x1812),
   * connects to the first match, subscribes to button notifications.
   */
  async start(): Promise<void> {
    if (this._state === 'scanning' || this._state === 'connected') return;

    if (IS_PRODUCTION) {
      // ----------------------------------------------------------------
      // TODO(prod): BLE scan + connect using react-native-ble-plx
      //
      //    import { BleManager } from 'react-native-ble-plx';
      //
      //    this._bleManager = new BleManager();
      //
      //    const device = await this._bleManager.startDeviceScan(
      //      null,
      //      { isServiceUUID: HID_SERVICE_UUID },
      //      (error, scanned) => {
      //        if (error) throw error;
      //        if (scanned) {
      //          this._bleManager.stopDeviceScan();
      //          this._connectAndListen(scanned);
      //        }
      //      },
      //    );
      //
      // `_connectAndListen` should:
      //   1. `device.connect()`
      //   2. `device.discoverAllServicesAndCharacteristics()`
      //   3. Subscribe to the HID Input Report characteristic notifications
      //   4. Parse report data → map to ButtonEvent
      //      (see HID specification for report format)
      // ----------------------------------------------------------------
      throw new HeadsetError('HeadsetService: production BLE scan not yet implemented');
    }

    this._state = 'connected';
  }

  /**
   * Disconnect the headset and release BLE resources.
   */
  stop(): void {
    if (IS_PRODUCTION) {
      // TODO(prod):
      //   this._subscription?.remove();
      //   this._connectedDevice?.cancelConnection();
      //   this._bleManager?.destroy();
      this._bleManager = null;
      this._connectedDevice = null;
      this._subscription = null;
    }

    this._state = 'idle';
  }

  // -------------------------------------------------------------------
  // Internal — kept for symmetry; dev uses a direct `onButton` call
  // -------------------------------------------------------------------

  /**
   * Exposed for testing — allows manual injection of a button event
   * when the headset is in a "connected" state.
   */
  simulateButton(event: ButtonEvent): void {
    if (this._state !== 'connected') return;
    this.onButton?.(event);
  }
}

/**
 * Re-export the HID UUID so consumers can reference it if needed.
 */
export { HID_SERVICE_UUID };
