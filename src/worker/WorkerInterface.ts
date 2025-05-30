import * as wasm from '../wasm/no-simd/burn_polecart_wasm.js';

export interface EpisodeBatchData {
    pole_angles: Float32Array;
    cart_positions: Float32Array;
    total_steps: number;
}

export default class WorkerInterface {
    private _world: wasm.CartPoleWorld;
    private _episode_batch: wasm.BatchedEpisodeRecord | null;


    constructor() {
        this._world = new wasm.CartPoleWorld();
        this._episode_batch = null;
    }

    random_rollout() {
        this._episode_batch = this._world.random_rollout();
    }

    get_episode(episode_id: number): EpisodeBatchData | null {
        if (this._episode_batch == null) {
            return null;
        }
        const e = this._episode_batch.get_episode(episode_id);
        return {pole_angles: e.pole_angles, cart_positions: e.cart_positions, total_steps: this._episode_batch.total_steps};
    } 

    get_batch(): EpisodeBatchData[] | null {
        if (this._episode_batch == null) {
            return null;
        }
        const batch = [];
        for(let i = 0; i < this._episode_batch.len(); i++) {
            const e = this._episode_batch.get_episode(i);
            batch.push({pole_angles: e.pole_angles, cart_positions: e.cart_positions, total_steps: this._episode_batch.total_steps});
        }
        return batch;
    }
}
