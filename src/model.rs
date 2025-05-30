use burn::{
    nn::{
        Dropout, DropoutConfig, Linear, LinearConfig, 
    },
    tensor::activation::softmax,
    prelude::*,
};
use crate::backend::{get_default_device, SelectedBackend};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Module, Debug, Clone)]
pub struct Model {
    linear1: Linear<SelectedBackend>,
    linear2: Linear<SelectedBackend>,
    dropout: Dropout
}

impl Model {
    
    /*
        Input Dimensions: [batch (episode), observation for each episode]
            Observation values: [pole_velocity, pole_angle, cart_position, cart_velocity]

        Output Tensor: [move direction and magnitude for each episode]
     */
    pub fn forward(&self, 
            cart_positions: Tensor<SelectedBackend, 1>,
            cart_velocities: Tensor<SelectedBackend, 1>,
            pole_angles: Tensor<SelectedBackend, 1>,
            pole_angular_velocities: Tensor<SelectedBackend, 1>) 
        -> Tensor<SelectedBackend, 2> {
        let batched_observations = Tensor::cat(
            [
                        // TODO: Make a CANVAS_WIDTH variable set to 1000 
                        cart_positions.div_scalar(1000.0).unsqueeze::<2>().transpose(), 
                        cart_velocities.div_scalar(1000.0).unsqueeze::<2>().transpose(), 
                        pole_angles.div_scalar(2.0*3.14159265).unsqueeze::<2>().transpose(), 
                        pole_angular_velocities.div_scalar(2.0*3.14159265).unsqueeze::<2>().transpose()
                    ].to_vec(), 
            1);
        let x = self.linear1.forward(batched_observations);
        let x = self.linear2.forward(x);
        let x = self.dropout.forward(x);
        softmax(x, 1)
    }

    /// Returns the initialized model.
    pub fn init(hidden_size: usize, dropout: f64, device: &<SelectedBackend as burn::prelude::Backend>::Device) -> Model {
        Model {
            linear1: LinearConfig::new(4, hidden_size).init(device),
            linear2: LinearConfig::new(hidden_size, 3).init(device),
            dropout: DropoutConfig::new(dropout).init(),
        }
    }
}

impl Default for Model {
    fn default() -> Self {
        let device = get_default_device();
        return Model::init(16, 0.5, &device);
    }
}

#[wasm_bindgen]
impl Model {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self::default()
    }
}
