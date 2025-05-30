import { Box, Button, Flex, Heading, Select, Text, TextField } from '@radix-ui/themes';
import { PauseIcon, PlayIcon, SymbolIcon } from '@radix-ui/react-icons';
import useCartpoleAppState, { AppActions, AppState } from '../AppState';


function ControlsPanel() {
  const isPaused: boolean = useCartpoleAppState((state: AppState) => state.isPaused);
  const isTraining: boolean = useCartpoleAppState((state: AppState) => state.isTraining);
  const workerCount: number = useCartpoleAppState((state: AppState) => state.webWorkers.length);
  const discountFactor: number = useCartpoleAppState((state: AppState) => state.discountFactor);
  const learningRate: number = useCartpoleAppState((state: AppState) => state.learningRate);

  const setIsTraining = useCartpoleAppState((state: AppActions) => state.setIsTraining);
  const setDiscountFactor = useCartpoleAppState((state: AppActions) => state.setDiscountFactor);
  const setLearningRate = useCartpoleAppState((state: AppActions) => state.setLearningRate);
  const setWorkerCount = useCartpoleAppState((state: AppActions) => state.setWorkerCount);
  const pause = useCartpoleAppState((state: AppActions) => state.pause);
  const resume = useCartpoleAppState((state: AppActions) => state.resume);
  const reset = useCartpoleAppState((state: AppActions) => state.reset);

  return (<Flex direction='column' gapY="3" >
    <Heading>Controls</Heading>
    <Button variant='outline' color='red' id='reset-button' onClick={reset} > 
      <SymbolIcon /> Reset
    </Button>

    <Button variant='outline' color='gray' id='pause-button' onClick={isPaused ? resume : pause} > 
       {isPaused ? <PlayIcon /> : <PauseIcon />} {isPaused ? "Resume" : "Pause"}
    </Button>

    <Box>
      <Text as="label">Mode: </Text> 
      <Select.Root value={isTraining ? "training" : "inference"} onValueChange={(e)=>setIsTraining(e=="training")} >
        <Select.Trigger />
        <Select.Content>
            <Select.Item value="training">Training</Select.Item>
            <Select.Item value="inference">Inference</Select.Item>
        </Select.Content>
      </Select.Root>
    </Box>
    
    <Box>
      <Text as="label" >Training Algorithm: </Text> 
      <Select.Root defaultValue="dqn" onValueChange={(e)=>console.log(e)} >
        <Select.Trigger />
        <Select.Content>
            <Select.Item value="dqn">DQN</Select.Item>
            <Select.Item disabled value="ppo">PPO</Select.Item>
            <Select.Item disabled value="rlhf">
              RLHF
            </Select.Item>
        </Select.Content>
      </Select.Root>
    </Box>

    <Box>
      <Text as="label" >Worker Threads: </Text> 
      <Select.Root value={""+workerCount} onValueChange={(selection)=>setWorkerCount(parseInt(selection))} > 
        <Select.Trigger />
        <Select.Content>
            <Select.Item value="1">1</Select.Item>
            <Select.Item value="2">2</Select.Item>
            <Select.Item value="3">3</Select.Item>
            <Select.Item value="4">4</Select.Item>
            <Select.Item value="5">5</Select.Item>
            <Select.Item value="6">6</Select.Item>
        </Select.Content>
      </Select.Root>
    </Box>

    <Box>
      <Text as="label" >
        Learning Rate: <TextField.Root onChange={(e)=>{if (!Number.isNaN(parseFloat(e.target.value))) { setLearningRate(parseFloat(e.target.value))} }} style={{display:'inline-block'}} value={learningRate} type="number" placeholder="Enter learning rate here…" />
      </Text>                  
    </Box>

    <Box>
      <Text as="label" >
        Discount Factor: <TextField.Root value={discountFactor} onChange={(e)=>{if (!Number.isNaN(parseFloat(e.target.value))) { setDiscountFactor(parseFloat(e.target.value))} }} style={{display:'inline-block'}} type="number" placeholder="Enter discount factor here…" />
      </Text>                  
    </Box>

  </Flex>);
}

export default ControlsPanel
