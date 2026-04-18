/* tslint:disable */
/* eslint-disable */

export class PhysicsEngine {
    free(): void;
    [Symbol.dispose](): void;
    get_matrices_ptr(): number;
    constructor(count: number);
    set_building(i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number): void;
    tick(dt: number, time: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_physicsengine_free: (a: number, b: number) => void;
    readonly physicsengine_get_matrices_ptr: (a: number) => number;
    readonly physicsengine_new: (a: number) => number;
    readonly physicsengine_set_building: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly physicsengine_tick: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export2: (a: number, b: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
