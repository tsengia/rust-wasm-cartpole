
#[cfg(feature = "wgpu")]
use burn::backend::wgpu::{init_setup_async, AutoGraphicsApi, Wgpu, WgpuDevice};

#[cfg(feature = "wgpu")]
pub type SelectedBackend = Wgpu<f32, i32>;

#[cfg(all(feature = "ndarray", not(feature = "wgpu")))]
pub type SelectedBackend = burn::backend::ndarray::NdArray<f32>;


pub fn get_default_device() -> <SelectedBackend as burn::prelude::Backend>::Device {
    <SelectedBackend as burn::prelude::Backend>::Device::default()
}
