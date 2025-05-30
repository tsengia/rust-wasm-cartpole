import * as Comlink from 'comlink';

import WorkerInterface, { JSEpisodeRecording } from './WorkerInterface';

export class CartPoleWorldProxy {
  _worker: Worker;
  _comlink: Comlink.Remote<WorkerInterface>;
  _memory: WebAssembly.Memory;

  constructor(worker: Worker, memory: WebAssembly.Memory, remote: Comlink.Remote<WorkerInterface>) {
    this._worker = worker;
    this._memory = memory;
    this._comlink = remote;
  }

  async random_rollout() {
    if (this._comlink == null || this._memory == null) {
      console.error("Called random_rollout() before init() has finished!");
      return;
    }

    await this._comlink.random_rollout();
  }

  async get_episode(episode_id: number): Promise<JSEpisodeRecording> {
    const r = await this._comlink.get_episode(episode_id);
    if (r == null) {
      throw "Got null when getting episode id " + episode_id;
    }
    return r;
  }

  terminate() {
    if (this._worker != null) {
      this._worker.terminate();
    }
  }
}

export default CartPoleWorldProxy;

