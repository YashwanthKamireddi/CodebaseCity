use wasm_bindgen::prelude::*;
use js_sys::Math;

#[wasm_bindgen]
pub struct PhysicsEngine {
    matrices: Vec<f32>,
    velocities: Vec<f32>,
    target_positions: Vec<f32>,
    node_count: usize,
}

#[wasm_bindgen]
impl PhysicsEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(count: usize) -> PhysicsEngine {
        console_error_panic_hook::set_once();
        
        let mut matrices = vec![0.0; count * 16];
        for i in 0..count {
            let offset = i * 16;
            matrices[offset] = 1.0;
            matrices[offset + 5] = 1.0;
            matrices[offset + 10] = 1.0;
            matrices[offset + 15] = 1.0;
        }

        PhysicsEngine {
            matrices,
            velocities: vec![0.0; count * 3],
            target_positions: vec![0.0; count * 3],
            node_count: count,
        }
    }

    pub fn set_building(&mut self, i: usize, x: f32, y: f32, z: f32, sx: f32, sy: f32, sz: f32) {
        if i >= self.node_count { return; }
        
        let m_idx = i * 16;
        let t_idx = i * 3;
        
        self.target_positions[t_idx] = x;
        self.target_positions[t_idx + 1] = y;
        self.target_positions[t_idx + 2] = z;
        
        self.matrices[m_idx] = sx;
        self.matrices[m_idx + 5] = sy;
        self.matrices[m_idx + 10] = sz;

        self.matrices[m_idx + 12] = x + (Math::random() as f32 - 0.5) * 500.0;
        self.matrices[m_idx + 13] = 0.0;
        self.matrices[m_idx + 14] = z + (Math::random() as f32 - 0.5) * 500.0;
    }

    pub fn tick(&mut self, dt: f32, time: f32) {
        let n = self.node_count;
        let dt = dt.min(0.05);
        for i in 0..n {
            let m_idx = i * 16;
            let v_idx = i * 3;
            let tx = self.target_positions[v_idx];
            let ty = self.target_positions[v_idx + 1];
            let tz = self.target_positions[v_idx + 2];
            let px = self.matrices[m_idx + 12];
            let py = self.matrices[m_idx + 13];
            let pz = self.matrices[m_idx + 14];
            let k = 15.0;
            let damp = 0.85;
            self.velocities[v_idx] += (tx - px) * k * dt;
            self.velocities[v_idx + 1] += (ty - py) * k * dt;
            self.velocities[v_idx + 2] += (tz - pz) * k * dt;
            let height_offset = (time * 2.0 + (i as f32) * 0.1).cos() * 0.5;
            self.velocities[v_idx + 1] += height_offset * dt;
            self.velocities[v_idx] *= damp;
            self.velocities[v_idx + 1] *= damp;
            self.velocities[v_idx + 2] *= damp;
            self.matrices[m_idx + 12] += self.velocities[v_idx] * dt;
            self.matrices[m_idx + 13] += self.velocities[v_idx + 1] * dt;
            self.matrices[m_idx + 14] += self.velocities[v_idx + 2] * dt;
        }
    }

    pub fn get_matrices_ptr(&self) -> *const f32 {
        self.matrices.as_ptr()
    }
}
