import * as Comlink from 'comlink';
import WorkerInterface, { EpisodeData } from './WorkerInterface';

export class WorldWorkerProxy {
  _worker: Worker;
  _comlink: Comlink.Remote<WorkerInterface>;
  _memory: WebAssembly.Memory;

  constructor(worker: Worker, memory: WebAssembly.Memory, remote: Comlink.Remote<WorkerInterface>) {
    this._worker = worker;
    this._memory = memory;
    this._comlink = remote;
  }

  async random_rollout(): Promise<EpisodeData[] | null> {
    if (this._comlink == null) {
      console.error("Called random_rollout() before init() has finished!");
      return null;
    }

    await this._comlink.random_rollout();
    return await this._comlink.get_batch();
  }

  terminate() {
    if (this._worker != null) {
      this._worker.terminate();
    }
  }
}

export default WorldWorkerProxy;

