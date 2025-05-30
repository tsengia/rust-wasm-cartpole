import { create } from 'zustand';

import { WorldWorkerProxy } from './worker/WorldWorkerProxy';
import WorldWorkerFactory from './worker/WorldWorkerFactory';
import { EpisodeData } from './worker/WorkerInterface';

type AppState = {
    isTraining: boolean,
    isPaused: boolean,
    learningRate: number,
    discountFactor: number,
    epoch: number,
    lossHistory: number[],
    episodes: EpisodeData[],
    webWorkers: WorldWorkerProxy[]
}

type AppActions = {
    reset: ()=>void,
    pause: ()=>void,
    resume: ()=>void,
    setWorkerCount: (newWorkerCount: number)=>void,
    setLearningRate: (newRate: number)=>void,
    setDiscountFactor: (newFactor: number)=>void,
    setIsTraining: (isTraining: boolean)=> void,
    finishedRollout: (episode_batch: EpisodeData[], loss: number, worldWorker: WorldWorkerProxy) => void
}

const initialState: AppState = {
    isTraining: true,
    isPaused: false,
    learningRate: 0.1,
    discountFactor: 0.999,
    epoch: 0,
    lossHistory: [],
    episodes: [],
    webWorkers: []
}

type SetFunctionType = (partial: (AppState & AppActions) | Partial<AppState & AppActions> | ((state: AppState & AppActions) => (AppState & AppActions) | Partial<AppState>), replace?: false) => void;
function _finishedRollout(set: SetFunctionType, episode_batch: EpisodeData[], loss: number, worldWorker: WorldWorkerProxy) {
  console.log("_finishedRollout called!");
  // A worker thread finished a rollout
  set((state: AppState & AppActions) => {
    console.log("Worker finished a rollout!");
    if (!state.isPaused) {
      // Not paused, order the worker to start on the next rollout
      _startWorkerRollout(worldWorker, state);
    }

    // TODO: Trigger the worker to start another rollout?
    return {lossHistory: [...state.lossHistory, loss], episodes: state.episodes.concat(episode_batch)};
  });
  
}

const useCartpoleAppState = create<AppState & AppActions>((set,get) => ({
  ...initialState,
  reset: ()=>{
    set((prev: AppState) => {
      for (const worker of prev.webWorkers) {
        worker.terminate();
      }
      
      // TODO: Make sure that this does not result in zombie/orphan web workers upon reset
      return initialState;
    });

    const worldWorkerFactory = new WorldWorkerFactory();
    worldWorkerFactory.init().then((worldWorker)=> {
      set({
        webWorkers: get().webWorkers.concat([worldWorker])
      });
    });
  },
  finishedRollout: _finishedRollout.bind(null, set),
  pause: () => {
    set(() => {
      console.log("Pause rollout");
      return {isPaused: true};
    });
  },
  resume: () => {
    set(() => ({isPaused: false}));
  },
  setWorkerCount: (newWorkerCount: number) => {
    const workerCount = get().webWorkers.length;
    const diff = newWorkerCount - workerCount;
    if (diff < 0) {

      set((prev: AppState) => {
        let workerList = prev.webWorkers;

        // Kill off web workers
        for (let i = workerCount; i > newWorkerCount; i--) {
          workerList[i-1].terminate();
          workerList = workerList.slice(0,i);
        }
        return {workerCount: newWorkerCount, webWorkers: workerList};
      });
      
    }

    if (diff > 0) {
      // Add new workers
      for (let i = workerCount; i < newWorkerCount; i++) {
        
        const worldWorkerFactory = new WorldWorkerFactory();
        worldWorkerFactory.init().then((worldWorker) => {
          set((prev: AppState & AppActions) => {
            console.log("Worker spawned.");
            if (!prev.isPaused) {
              // Tell the worker to start working
              _startWorkerRollout(worldWorker, prev);
            }
            console.log("Setting worker count to " + (prev.webWorkers.length+1));
            return {
              workerCount: prev.webWorkers.length+1,
              webWorkers: prev.webWorkers.concat([worldWorker]),
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
function _startWorkerRollout(worldWorker: WorldWorkerProxy, state: AppState & AppActions) {
  console.log("Starting rollout for worker");
  worldWorker.random_rollout().then((episode_batch) => {
    if (episode_batch == null) {
      console.error("Failed to episode batch from worker rollout! Terminating worker!");
      worldWorker.terminate();
      return;
    }
    state.finishedRollout(episode_batch, 0, worldWorker);
  });
}

export default useCartpoleAppState;
export type {AppState, AppActions};
