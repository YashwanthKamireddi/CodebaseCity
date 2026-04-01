use wasm_bindgen::prelude::*;
use js_sys::Float32Array;

#[wasm_bindgen]
pub struct PhysicsEngine {
    positions: Vec<f32>,
    velocities: Vec<f32>,
    masses: Vec<f32>,
    node_count: usize,
}

#[wasm_bindgen]
impl PhysicsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(count: usize) -> PhysicsEngine {
        console_error_panic_hook::set_once();
        
        PhysicsEngine {
            positions: vec![0.0; count * 3],
            velocities: vec![0.0; count * 3],
            masses: vec![1.0; count],
            node_count: count,
        }
    }

    /// Advance the simulation by 1 tick (zero GC overhead)
    pub fn tick(&mut self, dt: f32) {
        let n = self.node_count;
        // Stub: A real Barnes-Hut or Louvain implementation will calculate physics here
        // Currently, just jitter for proof of concept
        for i in 0..n {
            let idx = i * 3;
            // Fake physics stub
            self.velocities[idx] -= self.positions[idx] * dt * 0.1;
            self.positions[idx] += self.velocities[idx] * dt;
        }
    }

    /// Retrieve raw memory pointer to feed DIRECTLY into ThreeJS InstancedMesh
    pub fn get_positions_ptr(&self) -> *const f32 {
        self.positions.as_ptr()
    }
}
