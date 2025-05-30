import * as wasm from '../wasm/no-simd/burn_polecart_wasm.js';

export interface JSEpisodeRecording {
  cart_positions: Float32Array;
  pole_angles: Float32Array;
}

export default class WorkerInterface {
    private _world: wasm.CartPoleWorld;
    private _episode_batch: wasm.BatchedEpisodeRecord | null;

    constructor() {
        this._world = new wasm.CartPoleWorld();
        this._episode_batch = null;
    }
    // deterministic_rollout(model: wasm.Model): wasm.BatchedEpisodeRecord {
    //     throw new Error('Method not implemented.');
    // }
    // epsilon_greedy_rollout(model: wasm.Model, epsilon_start: number, epsilon_end: number, epsilon_decay_rate: number): wasm.BatchedEpisodeRecord {
    //     throw new Error('Method not implemented.');
    // }

    random_rollout() {
        this._episode_batch = this._world.random_rollout();
    }

    get_episode(episode_number: number): JSEpisodeRecording | null {
        if (this._episode_batch == null) {
            console.warn("Called get_episode() before a rollout has completed!");
            return null;
        }

        const e = this._episode_batch.get_episode(episode_number);
        return { pole_angles: e.pole_angles, cart_positions: e.cart_positions};
    }

    // gravity: number;
    // masscart: number;
    // masspole: number;
    // length: number;
    // force_mag: number;
    // timestep: number;
    // max_steps: number;
}
