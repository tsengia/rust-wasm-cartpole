use crate::{backend::{get_default_device, SelectedBackend}, model::Model};

use burn::{prelude::Backend, tensor::{Device, Distribution, Shape, Tensor}};

use log::info;
use wasm_bindgen::prelude::*;
use js_sys::Math::exp;

#[wasm_bindgen]
#[derive(Default, Clone, Copy)]
pub struct CartPoleObservation {
    pub cart_position: f32,
    pub pole_angle: f32,
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct BatchedCartPoleState {
    pole_angles: Tensor<SelectedBackend, 1>,
    pole_angular_velocities: Tensor<SelectedBackend, 1>,
    cart_positions: Tensor<SelectedBackend, 1>,
    cart_velocities: Tensor<SelectedBackend, 1>
}

impl Default for BatchedCartPoleState {
    fn default() -> Self {
        let device = <SelectedBackend as Backend>::Device::default();
        Self {
            pole_angles: Tensor::<SelectedBackend, 1>::zeros(Shape::new([128]), &device),
            pole_angular_velocities: Tensor::<SelectedBackend, 1>::zeros(Shape::new([128]), &device),
            cart_positions: Tensor::<SelectedBackend, 1>::zeros(Shape::new([128]), &device),
            cart_velocities: Tensor::<SelectedBackend, 1>::zeros(Shape::new([128]), &device),
        }
    }
}

impl BatchedCartPoleState {

    pub fn random() -> Self {
        const PI: f64 = 3.14159265;
        let device = <SelectedBackend as Backend>::Device::default();
        let distribution = Distribution::Uniform(PI/4.0, 3.0 * PI / 4.0);
        Self {
            pole_angles: Tensor::<SelectedBackend, 1>::random(Shape::new([128]), distribution, &device),
            pole_angular_velocities: Tensor::<SelectedBackend, 1>::zeros(Shape::new([128]), &device),
            cart_positions: Tensor::<SelectedBackend, 1>::zeros(Shape::new([128]), &device),
            cart_velocities: Tensor::<SelectedBackend, 1>::zeros(Shape::new([128]), &device),
        }
    }

    pub fn to_vec_observations(self: Self) -> Vec<CartPoleObservation> {
        let batch_size: usize = self.cart_positions.shape().dims[0];
        let mut observations = Vec::with_capacity(batch_size);

        let cart_positions = self.cart_positions.to_data().clone();
        let pole_angles  = self.pole_angles.to_data().clone();
        
        for i in 0..batch_size {
            observations.push(CartPoleObservation {
                cart_position: cart_positions.as_slice().unwrap()[i],
                pole_angle: pole_angles.as_slice().unwrap()[i],
            });
        }
        return observations;
    }
}

#[derive(Clone)]
pub struct StepResult<ObservationType> {
    pub terminated: bool,
    pub reward: Tensor<SelectedBackend, 1>,
    pub observation: ObservationType
}

#[wasm_bindgen]
#[wasm_bindgen(getter_with_clone)]
pub struct EpisodeRecording {
    pub cart_positions: Box<[f32]>,
    pub pole_angles: Box<[f32]>
}

#[wasm_bindgen]
#[wasm_bindgen(getter_with_clone)]
pub struct BatchedEpisodeRecord {
    cart_positions: Box<[f32]>,
    pole_angles: Box<[f32]>,
    pub episode_count: usize,
    pub total_steps: usize
}

#[wasm_bindgen]
impl BatchedEpisodeRecord {

    pub fn len(&self) -> usize {
        self.episode_count
    }

    fn from_batches(observations: Vec<BatchedCartPoleState>) -> Self {
        let num_steps = observations.len();
        let batch_size = observations.get(0).unwrap().pole_angles.shape().dims[0];
        let total_size = num_steps * batch_size;
        info!("num_steps = {num_steps}");
        info!("batch_size = {batch_size}");
        info!("total_size = {total_size}");
        let mut c = Vec::<f32>::new();
        c.resize(total_size, 0.0);
        let mut p = Vec::<f32>::new();
        p.resize(total_size, 0.0);

        let mut i = 0;
        for o in observations.iter() {
            c[i..(i+batch_size)].copy_from_slice(o.cart_positions.to_data().clone().as_slice().unwrap());
            p[i..(i+batch_size)].copy_from_slice(o.pole_angles.to_data().clone().as_slice().unwrap());
            i += batch_size;
        }

        Self {
            cart_positions: c.into(),
            pole_angles: p.into(),
            episode_count: batch_size,
            total_steps: num_steps
        }
    }

    #[wasm_bindgen]
    pub fn get_episode(&self, episode: usize) -> Result<EpisodeRecording, JsError> {
        if episode > self.episode_count {
            return Err(JsError::new("That episode ID does not exist in this batch!"));
        }

        let steps = self.total_steps as usize;
        let mut c = Vec::<f32>::new();
        c.resize(steps, 0.0);
        let mut p = Vec::<f32>::new();
        p.resize(steps, 0.0);

        for i in 0..steps {
            let index = ((i*self.episode_count) + episode) as usize;
            c[i] = self.cart_positions[index];
            p[i] = self.pole_angles[index];
        }

        return Ok(EpisodeRecording {
            pole_angles: p.into(),
            cart_positions: c.into()
        })
    }
}

#[wasm_bindgen]
pub struct CartPoleWorld {
    device: Device<SelectedBackend>,
    pub gravity: f32,
    pub masscart: f32,
    pub masspole: f32,
    pub length: f32,
    pub force_mag: f32,
    pub timestep: f32,
    pub max_steps: u16
}

impl Default for CartPoleWorld {
    fn default() -> Self {
        CartPoleWorld {
            masscart: 1.0,
            masspole: 0.1,
            length: 0.5,
            force_mag: 10.0,
            timestep: 0.02,
            gravity: 9.8,
            // With timestep=0.015 seconds and max_steps=1000, then we get 15 seconds of steps
            max_steps: 1000,
            device: <SelectedBackend as Backend>::Device::default()
        }
    }
}

#[wasm_bindgen]
impl CartPoleWorld {

    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self::default()
    }

    #[wasm_bindgen]
    pub fn deterministic_rollout(&self, model: Model) -> BatchedEpisodeRecord {
        return self.rollout_with_model(model, |_:u16, outputs: Tensor<SelectedBackend, 2>| {
            outputs.argmax(1).squeeze(1).sub_scalar(1).float()
        });
    }

    
    #[wasm_bindgen]
    pub fn epsilon_greedy_rollout(&self, model: Model, epsilon_start: f32, epsilon_end: f32, epsilon_decay_rate: f32) -> BatchedEpisodeRecord {
        let epsilon_range = epsilon_start - epsilon_end;
        let distribution = Distribution::Uniform(0.0, 1.0);
        
        return self.rollout_with_model(model, |step: u16, outputs: Tensor<SelectedBackend, 2>| {
            // Select random action with chance \epsilon and max-likely action with chance 1-\epsilon
            let epsilon_threshold = epsilon_end + epsilon_range * exp(-1.0 * (step as f32 / epsilon_decay_rate) as f64) as f32;
            let shape = Shape::new([outputs.shape().dims[0]]);

            // Generate random actions
            let random_action = Tensor::<SelectedBackend, 1>::random(Shape::new([128]), distribution, &self.device);
            let random_action = random_action.floor();
            let random_action = random_action.clamp_max(1.0);

            // Determine the most likely actions
            let max_likely_output = outputs.argmax(1).squeeze(1).sub_scalar(1).float();
            
            // If random(0,1) > epsilon_threshold, then perform the most likely action
            let sample = Tensor::<SelectedBackend, 1>::random(shape, distribution, &get_default_device());
            let mask = sample.lower_elem(epsilon_threshold);
            random_action.mask_where(mask, max_likely_output)
        });
    }

    #[wasm_bindgen]
    pub fn random_rollout(&mut self) -> BatchedEpisodeRecord {
        let mut frames = Vec::<BatchedCartPoleState>::new();
        frames.reserve_exact(self.max_steps as usize);

        let mut state = BatchedCartPoleState::random();
        frames.push(state.clone());
        
        let distribution = Distribution::Uniform(-1.0, 2.0);
        
        for _ in 0..self.max_steps {
            let action = Tensor::random(Shape::new([128]), distribution, &self.device);
            let action = action.floor();
            let action = action.clamp_max(1.0);
            let result = self.step(state, &action);
            frames.push(result.observation.clone());
            state = result.observation;
            if result.terminated {
                break;
            }
        }
    
        BatchedEpisodeRecord::from_batches(frames)
    }
}

impl CartPoleWorld {
    pub fn step(&self, mut state: BatchedCartPoleState, actions: &Tensor<SelectedBackend, 1>) -> StepResult::<BatchedCartPoleState> {
        // Based off of: https://github.com/Farama-Foundation/Gymnasium/blob/main/gymnasium/envs/classic_control/cartpole.py#L164
        let force = actions.clone() * self.force_mag;
        const PI: f32 = 3.14159265;

        let c = state.pole_angles.clone() * -1.0 - PI/2.0;
        let costheta = c.clone().cos();
        let sintheta = c.sin();

        let totalmass = self.masscart + self.masspole;
        let polemass_length = self.masspole * self.length;

        // For the interested reader:
        // https://coneural.org/florian/papers/05_cart_pole.pdf
        let temp = 
            (force +
            state.pole_angular_velocities.clone().powi_scalar(2)
            * sintheta.clone()
            * polemass_length)
            / totalmass;

        let thetacc_numerator = 
            (sintheta.clone() * self.gravity) - (costheta.clone().mul(temp.clone()));

        let thetacc_denominator = 
            (Tensor::full_like(&costheta, 4.0 / 3.0) - costheta.clone().powi_scalar(2) * self.masspole / totalmass) * self.length;

        let thetaacc = thetacc_numerator / thetacc_denominator;

        let xacc = temp - (thetaacc.clone() * costheta * polemass_length / totalmass);
        
        state.cart_positions = state.cart_positions.clone() + state.cart_velocities.clone() * self.timestep;
        state.cart_velocities = state.cart_velocities.clone() + xacc * self.timestep;
        state.pole_angles = state.pole_angles.clone() + (state.pole_angular_velocities.clone() * self.timestep);
        state.pole_angular_velocities = (state.pole_angular_velocities.clone() + (thetaacc * self.timestep)) / 1.02;

        state.pole_angles = state.pole_angles.clone().remainder_scalar(2.0*PI);

        let mut in_bounds = state.pole_angles.clone().lower_elem(3.0*PI/4.0).float();
        in_bounds = in_bounds.mul(state.pole_angles.clone().greater_elem(PI/4.0).float());

        // TODO: Potentially add logic to check if cart position is within the canvas

        StepResult::<BatchedCartPoleState> {
            terminated: false,
            reward: in_bounds,
            observation: state.clone()
        }
    }

    
    pub fn rollout_with_model<F: Fn(u16, Tensor<SelectedBackend, 2>) -> Tensor<SelectedBackend, 1>>(&self, model: Model, action_selector: F) -> BatchedEpisodeRecord {
        let mut frames = Vec::<BatchedCartPoleState>::new();
        frames.reserve_exact(self.max_steps as usize);

        let mut state = BatchedCartPoleState::default();

        frames.push(state.clone());

        for step in 0..self.max_steps {
            let action = model.forward(
                state.cart_positions.clone(),
                state.cart_velocities.clone(),
                state.pole_angles.clone(),
                state.pole_angular_velocities.clone());

            let selected_action: Tensor<SelectedBackend, 1> = action_selector(step, action);

            // if deterministic {
            //     // Deterministic policy, useful for inference
            //     selected_action = action.argmax(1).squeeze(1).sub_scalar(1).float();
            // }
            // else {
            //     // Non-deterministic policy, useful for training because it leads to exploration
            //     let action_shape = Shape::new([action.shape().dims[0]]);
            //     let distribution = Distribution::Uniform(0.0, action.shape().dims[1] as f32);
            //     selected_action = Tensor::<SelectedBackend, 1>::random(action_shape, distribution, &get_default_device());
            //     let selected_action = selected_action.sub_scalar(-1.5).ceil();              
            // }

            let result = self.step(state, &selected_action);
            frames.push(result.observation.clone());
            state = result.observation;
            if result.terminated {
                break;
            }
        }
    
        BatchedEpisodeRecord::from_batches(frames)
    }
}

