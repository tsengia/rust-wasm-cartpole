import { create } from 'zustand';

import { CartPoleWorldProxy } from './worker/WasmWorkerProxy';
import CartPoleWorldWorkerFactory from './worker/WorkerFactory';
import { BatchedEpisodeRecord } from './wasm/no-simd/burn_polecart_wasm';

type AppState = {
    isTraining: boolean,
    isPaused: boolean,
    workerCount: number,
    learningRate: number,
    discountFactor: number,
    epoch: number,
    lossHistory: number[],
    episodes: BatchedEpisodeRecord[],
    _webWorkers: CartPoleWorldProxy[]
}

type AppActions = {
    reset: ()=>void,
    pause: ()=>void,
    resume: ()=>void,
    setWorkerCount: (newWorkerCount: number)=>void,
    setLearningRate: (newRate: number)=>void,
    setDiscountFactor: (newFactor: number)=>void,
    setIsTraining: (isTraining: boolean)=> void,
    finishedRollout: (loss: number, worldWorker: CartPoleWorldProxy) => void
}

const initialState: AppState = {
    isTraining: true,
    isPaused: false,
    workerCount: 0,
    learningRate: 0.1,
    discountFactor: 0.999,
    epoch: 0,
    lossHistory: [],
    episodes: [],
    _webWorkers: []
}

type SetFunctionType = (partial: (AppState & AppActions) | Partial<AppState & AppActions> | ((state: AppState & AppActions) => (AppState & AppActions) | Partial<AppState>), replace?: false) => void;
function _finishedRollout(set: SetFunctionType, loss: number, worldWorker: CartPoleWorldProxy) {
  console.log("_finishedRollout called!");
  // A worker thread finished a rollout
  set((state: AppState & AppActions) => {
    console.log("Worker finished a rollout!");
    if (!state.isPaused) {
      // Not paused, order the worker to start on the next rollout
      _startWorkerRollout(worldWorker, state);
    }

    // TODO: Trigger the worker to start another rollout?
    return {lossHistory: [...state.lossHistory, loss]};
  });
  
}

const useCartpoleAppState = create<AppState & AppActions>((set,get) => ({
  ...initialState,
  reset: ()=>{
    set((prev: AppState) => {
      for (const worker of prev._webWorkers) {
        worker.terminate();
      }
      
      // TODO: Make sure that this does not result in zombie/orphan web workers upon reset
      return initialState;
    });

    const worldWorkerFactory = new CartPoleWorldWorkerFactory();
    worldWorkerFactory.init().then((worldWorker)=> {
      set({
        workerCount: get().workerCount+1,
        _webWorkers: get()._webWorkers.concat([worldWorker])
      });
    });
  },
  finishedRollout: _finishedRollout.bind(null, set),
  pause: () => {
    set(() => ({isPaused: true}));
  },
  resume: () => {
    set(() => ({isPaused: false}));
  },
  setWorkerCount: (newWorkerCount: number) => {
    const workerCount = get().workerCount;
    const diff = newWorkerCount - workerCount;
    if (diff < 0) {

      set((prev: AppState) => {
        let workerList = prev._webWorkers;

        // Kill off web workers
        for (let i = workerCount; i > newWorkerCount; i--) {
          workerList[i-1].terminate();
          workerList = workerList.slice(0,i);
        }
        return {workerCount: newWorkerCount, _webWorkers: workerList};
      });
      
    }

    if (diff > 0) {
      // Add new workers
      for (let i = workerCount; i < newWorkerCount; i++) {
        
        const worldWorkerFactory = new CartPoleWorldWorkerFactory();
        worldWorkerFactory.init().then((worldWorker) => {
          set((prev: AppState & AppActions) => {
            console.log("Worker spawned.");
            if (!prev.isPaused) {
              // Tell the worker to start working
              _startWorkerRollout(worldWorker, prev);
            }
            console.log("Setting worker count to " + (prev.workerCount+1));
            return {
              workerCount: prev.workerCount+1,
              _webWorkers: prev._webWorkers.concat([worldWorker]),
            };
          });
        });
      }
    }
    
  },
  setLearningRate: (newRate: number)=> set( () => ({learningRate: newRate})),
  setDiscountFactor: (newFactor: number)=> set( () => ({discountFactor: newFactor})),
  setIsTraining: (newTrainingSetting: boolean) => set(() => ({isTraining: newTrainingSetting}))
}));

// TODO: Add random/deterministic/epsilon greedy rollout options
function _startWorkerRollout(worldWorker: CartPoleWorldProxy, state: AppState & AppActions) {
  console.log("Starting rollout for worker");
  worldWorker._comlink?.random_rollout().then(() => {
    state.finishedRollout(0, worldWorker);
  });
}

export default useCartpoleAppState;
export type {AppState, AppActions};
