import { Transform4D, Vector4D } from '../hyperengine/transform4d.js';
import { Hyperobject, createHypercube } from '../hyperengine/hyperobject.js';

export async function runHyperengine(scene, canvas) {
    const VOX = 64; // Voxel grid size

    // Hypercamera definition
    let scene_bound = 10.0; // +10 means the scene goes from -10 to +10 in all dimensions
    const hypercamera_height_above_ground = 1.0;
    let hypercamera_T = new Transform4D([
        [1, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 1, 0, 1],
        [0, 0, 0, 1, 0],
        [0, 0, 0, 0, 1]
    ]); // hypercam in world
    // let hf = 1.0; // hyper focal length
    // let hypercamera_intrinsics = [
        // [hf, 0, 0, 0],
        // [0, hf, 0, 0],
        // [0, 0, hf, 0],
        // [0, 0, 0, 1]
    // ]; // see TODO s , for now assume identity intrinsics
    let hypercamera_sensor_size = 1
    let hypercamera_sensor_uvl_range = [-1, 1, -1, 1, -1, 1]; // u_min, u_max, v_min, v_max, l_min, l_max
    let hypercamera_is_unit_sensor = true;
    let hypercamera_sensor_resolution = VOX;
    // Floor definition
    function floor_heightmap(x, y, w) {
        return 0; //  + x * 0.1;
    }

    // Scene pre-processing and setting up static memory
    // Stage 0: Create buffers and gather all vertices and tetras from visible hyperobjects
    // --------------------------------------
    const s0_start = performance.now();
    let visibleHyperobjects = scene.visibleHyperobjects;
    // let vertices_in_world = hypercube.vertices_in_world;
    // let tetras = hypercube.tetras.map(tetra => ({ indices: tetra, color: hypercube.color }));
    let vertices_in_world = [];
    let tetras = [];
    for (let obj of visibleHyperobjects) {
        const base_index = vertices_in_world.length;
        // add vertices
        for (let v of obj.vertices_in_world) {
            vertices_in_world.push(v);
        }
        // add tetras with adjusted indices
        for (let tet of obj.tetras) {
            tetras.push({ indices: tet.map(vi => vi + base_index), color: obj.color });
        }
    }
    const s0_end = performance.now();
    console.log(`Stage 0: Gathered vertices and tetras from visible hyperobjects in ${(s0_end - s0_start).toFixed(2)} ms`);
    // Create texture buffers
    let object_texture_header_data = new Uint32Array(visibleHyperobjects.length * 4); // offset, USIZE, VSIZE, WSIZE
    let vertices_texcoords_data = new Float32Array(vertices_in_world.length * 3); // u,v,l per vertex
    // Create global texture data buffer and figure out offsets
    let texture_data_offset = 0;
    for (let obj_index = 0; obj_index < visibleHyperobjects.length; obj_index++) {
        let obj = visibleHyperobjects[obj_index];
        let USIZE = obj.texture_info.USIZE;
        let VSIZE = obj.texture_info.VSIZE;
        let WSIZE = obj.texture_info.WSIZE;
        // compute data size
        let data_size = USIZE * VSIZE * WSIZE; // RGBA
        // set header data
        object_texture_header_data[obj_index * 4 + 0] = texture_data_offset; // offset
        object_texture_header_data[obj_index * 4 + 1] = USIZE; // USIZE
        object_texture_header_data[obj_index * 4 + 2] = VSIZE; // VSIZE
        object_texture_header_data[obj_index * 4 + 3] = WSIZE; // WSIZE
        // update offsets
        texture_data_offset += data_size;
    }
    let total_texture_data_size = texture_data_offset;
    // fill global texture data with object textures
    let global_texture_data = new Uint32Array(total_texture_data_size);
    for (let obj_index = 0; obj_index < visibleHyperobjects.length; obj_index++) {
        let obj = visibleHyperobjects[obj_index];
        let offset = object_texture_header_data[obj_index * 4 + 0];
        let USIZE = object_texture_header_data[obj_index * 4 + 1];
        let VSIZE = object_texture_header_data[obj_index * 4 + 2];
        let WSIZE = object_texture_header_data[obj_index * 4 + 3];
        for (let u = 0; u < USIZE; u++) {
            for (let v = 0; v < VSIZE; v++) {
                for (let w = 0; w < WSIZE; w++) {
                    let index = (u + (v * USIZE) + (w * USIZE * VSIZE));
                    let global_index = offset + index;
                    let rgba_u32 = obj.texture[index];
                    global_texture_data[global_index] = rgba_u32;
                }
            }
        }
    }
    // Create buffers with 1. all vertices in object frame, 2. all object poses 3. the object index of each vertex
    let all_vertices_in_object_data = new Float32Array(vertices_in_world.length * 4);
    let all_object_poses_data = new Float32Array(visibleHyperobjects.length * 5 * 5);
    let vertex_object_indices_data = new Uint32Array(vertices_in_world.length);
    let vertex_counter = 0;
    for (let obj_index = 0; obj_index < visibleHyperobjects.length; obj_index++) {
        let obj = visibleHyperobjects[obj_index];
        // object poses
        let pose = obj.pose.matrix;
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                all_object_poses_data[obj_index * 5 * 5 + i * 5 + j] = pose[i][j];
            }
        }
        // vertices
        for (let i_v = 0; i_v < obj.vertices_in_object.length; i_v++) {
            let v = obj.vertices_in_object[i_v];
            let v_tex = obj.vertices_in_texmap[i_v];
            all_vertices_in_object_data[vertex_counter * 4 + 0] = v.x;
            all_vertices_in_object_data[vertex_counter * 4 + 1] = v.y;
            all_vertices_in_object_data[vertex_counter * 4 + 2] = v.z;
            all_vertices_in_object_data[vertex_counter * 4 + 3] = v.w;
            vertex_object_indices_data[vertex_counter] = obj_index;
            // set texcoords for each vertex of this object
            // just map the object coordinates to the texture coordinates directly for now
            vertices_texcoords_data[vertex_counter * 3 + 0] = v_tex.x;
            vertices_texcoords_data[vertex_counter * 3 + 1] = v_tex.y;
            vertices_texcoords_data[vertex_counter * 3 + 2] = v_tex.w;
            // increment counter
            vertex_counter++;
        }
    }
    // Initit Hypercamera Pose buffer
    let hypercamera_inv_pose_data = new Float32Array(5 * 5);
    let hypercamera_pose_data = new Float32Array(5 * 4);
    // Prepare tetra data
    const tetraData = new Uint32Array(tetras.length * 5); // 4 vert idx per tet + 1 color
    for (let i = 0; i < tetras.length; i++) {
        const tetra = tetras[i];
        tetraData[i * 5 + 0] = tetra.indices[0];
        tetraData[i * 5 + 1] = tetra.indices[1];
        tetraData[i * 5 + 2] = tetra.indices[2];
        tetraData[i * 5 + 3] = tetra.indices[3];
        tetraData[i * 5 + 4] = tetra.color;
    }
    // initialize vertex storage
    const vertices1uvlstexData = new Float32Array(vertices_in_world.length * 8);
    for (let i = 0; i < vertices_in_world.length; i++) {
    // 1uvls gets recomputed on GPU at every frame
    vertices1uvlstexData[i * 8 + 0] = 0;
    vertices1uvlstexData[i * 8 + 1] = 0;
    vertices1uvlstexData[i * 8 + 2] = 0;
    vertices1uvlstexData[i * 8 + 3] = 0;
    // texcoords are static and assigned only in the setup
    vertices1uvlstexData[i * 8 + 4] = vertices_texcoords_data[i * 3 + 0];
    vertices1uvlstexData[i * 8 + 5] = vertices_texcoords_data[i * 3 + 1];
    vertices1uvlstexData[i * 8 + 6] = vertices_texcoords_data[i * 3 + 2];
    vertices1uvlstexData[i * 8 + 7] = 0.0; // padding
    }
    // initialize bvh
    const TILE_SZ = 2;
    const TILE_RES = VOX / TILE_SZ;
    const MAX_ACCEL_STRUCTURE_DEPTH = 400;
    const MAX_ACCEL_STRUCTURE_SIZE = TILE_RES*TILE_RES*TILE_RES*MAX_ACCEL_STRUCTURE_DEPTH;
    const accelStructureOffsetsData = new Uint32Array(TILE_RES*TILE_RES*TILE_RES);
    const accelStructureCountsData = new Uint32Array(TILE_RES*TILE_RES*TILE_RES);
    const accelStructureTetraIndicesData = new Uint32Array(MAX_ACCEL_STRUCTURE_SIZE);
    // Initialize voxel grid (4x4x4)
    const voxelData = new Float32Array(VOX*VOX*VOX*8); // 64x64x64 grid for simplicity


  // WebGPU init 
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  
  context.configure({
    device,
    format,
    alphaMode: 'opaque',
  });

  const stage1ShaderCode = `
  // Stage 1: Transform vertices from object space to world space, then to camera space, then to SUVL space
struct Vector4D {
    x: f32,
    y: f32,
    z: f32,
    w: f32,
}

struct Vertex1uvlstex {
    u: f32,
    v: f32,
    l: f32,
    s: f32,
    tex_u: f32,
    tex_v: f32,
    tex_w: f32,
    padding: f32,
}

@group(0) @binding(0) var<storage, read> vertices_in_object: array<Vector4D>;
@group(0) @binding(1) var<storage, read> object_poses_5by5: array<f32>;
@group(0) @binding(2) var<storage, read> vertex_object_indices: array<u32>;
@group(0) @binding(3) var<storage, read> hypercamera_inv_pose_5by5: array<f32>;
@group(0) @binding(4) var<storage, read_write> vertices1uvlstexBuffer: array<Vertex1uvlstex>;

@group(1) @binding(0) var<uniform> vertex_counts: vec4<u32>; // num_vertices, unused, unused, unused

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let vertex_index = global_id.x;
    let num_vertices = vertex_counts.x; // TODO: pass as uniform
    if (vertex_index >= num_vertices) {
        return;
    }

    // Load vertex in object space
    let v_obj = vertices_in_object[vertex_index];
    // Load object pose
    let obj_index = vertex_object_indices[vertex_index];
    var obj_pose: array<array<f32,5>,5>;
    for (var i: u32 = 0u; i < 5u; i++) {
        for (var j: u32 = 0u; j < 5u; j++) {
            obj_pose[i][j] = object_poses_5by5[obj_index * 25u + i * 5u + j];
        }
    }
    // Transform to world space
    var v_world: Vector4D;
    v_world.x = obj_pose[0][0] * v_obj.x + obj_pose[0][1] * v_obj.y + obj_pose[0][2] * v_obj.z + obj_pose[0][3] * v_obj.w + obj_pose[0][4];
    v_world.y = obj_pose[1][0] * v_obj.x + obj_pose[1][1] * v_obj.y + obj_pose[1][2] * v_obj.z + obj_pose[1][3] * v_obj.w + obj_pose[1][4];
    v_world.z = obj_pose[2][0] * v_obj.x + obj_pose[2][1] * v_obj.y + obj_pose[2][2] * v_obj.z + obj_pose[2][3] * v_obj.w + obj_pose[2][4];
    v_world.w = obj_pose[3][0] * v_obj.x + obj_pose[3][1] * v_obj.y + obj_pose[3][2] * v_obj.z + obj_pose[3][3] * v_obj.w + obj_pose[3][4];
    // Load hypercamera pose
    var hc_pose: array<array<f32,5>,5>;
    for (var i: u32 = 0u; i < 5u; i++) {
        for (var j: u32 = 0u; j < 5u; j++) {
            hc_pose[i][j] = hypercamera_inv_pose_5by5[i * 5u + j];
        }
    }
    // Transform to camera space
    var v_cam: Vector4D;
    v_cam.x = hc_pose[0][0] * v_world.x + hc_pose[0][1] * v_world.y + hc_pose[0][2] * v_world.z + hc_pose[0][3] * v_world.w + hc_pose[0][4];
    v_cam.y = hc_pose[1][0] * v_world.x + hc_pose[1][1] * v_world.y + hc_pose[1][2] * v_world.z + hc_pose[1][3] * v_world.w + hc_pose[1][4];
    v_cam.z = hc_pose[2][0] * v_world.x + hc_pose[2][1] * v_world.y + hc_pose[2][2] * v_world.z + hc_pose[2][3] * v_world.w + hc_pose[2][4];
    v_cam.w = hc_pose[3][0] * v_world.x + hc_pose[3][1] * v_world.y + hc_pose[3][2] * v_world.z + hc_pose[3][3] * v_world.w + hc_pose[3][4];
    // Transform to 1UVL space
    // var v_1uvls: Vector4D;
    // v_1uvls.x = v_cam.y / v_cam.x;
    // v_1uvls.y = v_cam.z / v_cam.x;
    // v_1uvls.z = v_cam.w / v_cam.x;
    // v_1uvls.w = v_cam.x;

    // keep the texcoords, only update the suvls
    let prev = vertices1uvlstexBuffer[vertex_index];
    var v_1uvlstex: Vertex1uvlstex;
    v_1uvlstex.u = v_cam.y / v_cam.x;
    v_1uvlstex.v = v_cam.z / v_cam.x;
    v_1uvlstex.l = v_cam.w / v_cam.x;
    v_1uvlstex.s = v_cam.x;
    v_1uvlstex.tex_u = prev.tex_u;
    v_1uvlstex.tex_v = prev.tex_v;
    v_1uvlstex.tex_w = prev.tex_w;
    v_1uvlstex.padding = 0.0;

    // Store result
    vertices1uvlstexBuffer[vertex_index] = v_1uvlstex;
}
`;
  
  // Stage 2.1 - Update counts in Screen Space Tile Acceleration Structure
  const stage2p1ShaderCode = `
struct TetraData {
    i0: u32,
    i1: u32,
    i2: u32,
    i3: u32,
    color: u32,
}

struct Vector4D {
    x: f32,
    y: f32,
    z: f32,
    w: f32,
}

struct Vertex1uvlstex {
    u: f32,
    v: f32,
    l: f32,
    s: f32,
    tex_u: f32,
    tex_v: f32,
    tex_w: f32,
    padding: f32,
}

struct CellCountAndOffset {
    count: u32,
    offset: u32,
}

@group(0) @binding(0) var<storage, read> tetras: array<TetraData>;
@group(0) @binding(1) var<storage, read> vertices1uvlstexBuffer: array<Vertex1uvlstex>;
@group(0) @binding(2) var<storage, read_write> cellCountsAndOffsetsBuffer: array<atomic<u32>>;

@group(1) @binding(0) var<uniform> params: vec4<u32>; // RES, TILE_RES, TILE_SZ, unused
@group(1) @binding(1) var<uniform> tetra_counts: vec4<u32>; // num_valid_tetras, num_vertices, unused, unused

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let tetra_index = global_id.x;
    let num_tetras = tetra_counts.x; // TODO: pass as uniform
    let TILE_RES = params.y;
    
    if (tetra_index >= num_tetras) {
        return;
    }
    
    let tetra = tetras[tetra_index];
    let v0_1uvls = vertices1uvlstexBuffer[tetra.i0];
    let v1_1uvls = vertices1uvlstexBuffer[tetra.i1];
    let v2_1uvls = vertices1uvlstexBuffer[tetra.i2];
    let v3_1uvls = vertices1uvlstexBuffer[tetra.i3];

    // For safety, ignore tetra if any vertex has non-positive S
    if (v0_1uvls.s <= 0.0 || v1_1uvls.s <= 0.0 || v2_1uvls.s <= 0.0 || v3_1uvls.s <= 0.0) {
        return;
    }

    let u_min = min(min(v0_1uvls.u, v1_1uvls.u), min(v2_1uvls.u, v3_1uvls.u));
    let u_max = max(max(v0_1uvls.u, v1_1uvls.u), max(v2_1uvls.u, v3_1uvls.u));
    let v_min = min(min(v0_1uvls.v, v1_1uvls.v), min(v2_1uvls.v, v3_1uvls.v));
    let v_max = max(max(v0_1uvls.v, v1_1uvls.v), max(v2_1uvls.v, v3_1uvls.v));
    let l_min = min(min(v0_1uvls.l, v1_1uvls.l), min(v2_1uvls.l, v3_1uvls.l));
    let l_max = max(max(v0_1uvls.l, v1_1uvls.l), max(v2_1uvls.l, v3_1uvls.l));
    
    let S_U_START = -1.0;
    let S_U_RANGE = 2.0;
    let S_V_START = -1.0;
    let S_V_RANGE = 2.0;
    let S_L_START = -1.0;
    let S_L_RANGE = 2.0;
    
    let TU_min = u32(clamp(floor((u_min - S_U_START) / S_U_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    let TU_max = u32(clamp(ceil((u_max - S_U_START) / S_U_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    let TV_min = u32(clamp(floor((v_min - S_V_START) / S_V_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    let TV_max = u32(clamp(ceil((v_max - S_V_START) / S_V_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    let TL_min = u32(clamp(floor((l_min - S_L_START) / S_L_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    let TL_max = u32(clamp(ceil((l_max - S_L_START) / S_L_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    
    for (var TU = TU_min; TU <= TU_max; TU++) {
        for (var TV = TV_min; TV <= TV_max; TV++) {
            for (var TL = TL_min; TL <= TL_max; TL++) {
                let CELL_ID = TU + TV * TILE_RES + TL * TILE_RES * TILE_RES;
                atomicAdd(&cellCountsAndOffsetsBuffer[CELL_ID * 2], 1u); // * 2 to access the count element
            }
        }
    }
}
`;

// Stage 2.2
// Stage 2.2: Prefix Sum to calculate offsets from counts
// This uses a work-efficient parallel scan algorithm
const stage2p2ShaderCode = `

struct CellCountAndOffset {
    count: u32,
    offset: u32,
}

@group(0) @binding(0) var<storage, read_write> cellCountsAndOffsetsBuffer: array<CellCountAndOffset>;
@group(0) @binding(1) var<storage, read_write> temp: array<u32>;

@group(1) @binding(0) var<uniform> params: vec4<u32>; 

@compute @workgroup_size(256)
fn upsweep(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let tid = global_id.x;
    let level = params.y;
    let num_elements = params.x;
    
    let stride = 1u << (level + 1u);
    let idx = tid * stride;
    
    if (idx + stride - 1u < num_elements) {
        let left = idx + (1u << level) - 1u;
        let right = idx + stride - 1u;
        temp[right] = temp[left] + temp[right];
    }
}

@compute @workgroup_size(256)
fn downsweep(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let tid = global_id.x;
    let level = params.y;
    let num_elements = params.x;
    
    let stride = 1u << (level + 1u);
    let idx = tid * stride;
    
    if (idx + stride - 1u < num_elements) {
        let left = idx + (1u << level) - 1u;
        let right = idx + stride - 1u;
        
        let t = temp[left];
        temp[left] = temp[right];
        temp[right] = t + temp[right];
    }
}

@compute @workgroup_size(256)
fn init(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let tid = global_id.x;
    let num_elements = params.x;
    if (tid < num_elements) {
        temp[tid] = cellCountsAndOffsetsBuffer[tid].count;
    }
}

@compute @workgroup_size(256)
fn finalize(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let tid = global_id.x;
    let num_elements = params.x;
    if (tid < num_elements) {
        cellCountsAndOffsetsBuffer[tid].offset = temp[tid];
    }
}

// NEW: Kernel to clear the root element safely
@compute @workgroup_size(1)
fn clear_root() {
    let num_elements = params.x;
    if (num_elements > 0u) {
        temp[num_elements - 1u] = 0u;
    }
}
`;

// NEW: Shader to clear buffers (replaces queue.writeBuffer)
const clearBufferShaderCode = `
@group(0) @binding(0) var<storage, read_write> buffer: array<u32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let idx = global_id.x;
    if (idx < arrayLength(&buffer)) {
        buffer[idx] = 0u;
    }
}
`;

// NEW: Stage 2.3 - Binning (Writes tetra indices into the grid)
const stage2p3ShaderCode = `
struct TetraData { i0: u32, i1: u32, i2: u32, i3: u32, color: u32 }
struct Vector4D { x: f32, y: f32, z: f32, w: f32 }

struct Vertex1uvlstex {
    u: f32,
    v: f32,
    l: f32,
    s: f32,
    tex_u: f32,
    tex_v: f32,
    tex_w: f32,
    padding: f32,
}

struct CellCountAndOffset {
    count: u32,
    offset: u32,
}

@group(0) @binding(0) var<storage, read> tetras: array<TetraData>;
@group(0) @binding(1) var<storage, read> vertices1uvlstexBuffer: array<Vertex1uvlstex>;
@group(0) @binding(2) var<storage, read> cellCountsAndOffsetsBuffer: array<CellCountAndOffset>;
@group(0) @binding(3) var<storage, read_write> cell_write_counters: array<atomic<u32>>; // Temporary atomic counter
@group(0) @binding(4) var<storage, read_write> cell_tetra_indices: array<u32>; // Output

@group(1) @binding(0) var<uniform> params: vec4<u32>;
@group(1) @binding(1) var<uniform> tetra_counts: vec4<u32>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let tetra_index = global_id.x;
    let num_tetras = tetra_counts.x;
    let TILE_RES = params.y;
    
    if (tetra_index >= num_tetras) { return; }
    
    let tetra = tetras[tetra_index];
    let v0 = vertices1uvlstexBuffer[tetra.i0];
    let v1 = vertices1uvlstexBuffer[tetra.i1];
    let v2 = vertices1uvlstexBuffer[tetra.i2];
    let v3 = vertices1uvlstexBuffer[tetra.i3];

    // For safety, ignore tetra if any vertex has non-positive S
    if (v0.s <= 0.0 || v1.s <= 0.0 || v2.s <= 0.0 || v3.s <= 0.0) {
        return;
    }
    
    // Calculate AABB (Same logic as Stage 2.1)
    let u_min = min(min(v0.u, v1.u), min(v2.u, v3.u));
    let u_max = max(max(v0.u, v1.u), max(v2.u, v3.u));
    let v_min = min(min(v0.v, v1.v), min(v2.v, v3.v));
    let v_max = max(max(v0.v, v1.v), max(v2.v, v3.v));
    let l_min = min(min(v0.l, v1.l), min(v2.l, v3.l));
    let l_max = max(max(v0.l, v1.l), max(v2.l, v3.l));
    
    let S_U_START = -1.0; let S_U_RANGE = 2.0;
    let S_V_START = -1.0; let S_V_RANGE = 2.0;
    let S_L_START = -1.0; let S_L_RANGE = 2.0;
    
    let TU_min = u32(clamp(floor((u_min - S_U_START) / S_U_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    let TU_max = u32(clamp(ceil((u_max - S_U_START) / S_U_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    let TV_min = u32(clamp(floor((v_min - S_V_START) / S_V_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    let TV_max = u32(clamp(ceil((v_max - S_V_START) / S_V_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    let TL_min = u32(clamp(floor((l_min - S_L_START) / S_L_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    let TL_max = u32(clamp(ceil((l_max - S_L_START) / S_L_RANGE * f32(TILE_RES)), 0.0, f32(TILE_RES - 1)));
    
    for (var TU = TU_min; TU <= TU_max; TU++) {
        for (var TV = TV_min; TV <= TV_max; TV++) {
            for (var TL = TL_min; TL <= TL_max; TL++) {
                let CELL_ID = TU + TV * TILE_RES + TL * TILE_RES * TILE_RES;
                
                // CRITICAL FIX: Determine where to write using Offsets + Atomic Increment
                let start_offset = cellCountsAndOffsetsBuffer[CELL_ID].offset;
                let local_idx = atomicAdd(&cell_write_counters[CELL_ID], 1u);
                
                // Safety check: if we exceed allocated size, skip writing
                if (start_offset + local_idx >= arrayLength(&cell_tetra_indices)) {
                    continue; // TODO: raise some kind of error
                }

                // Write the tetra index to the global buffer
                // Note: We should technically check bounds here, but MAX_SIZE is usually large enough
                cell_tetra_indices[start_offset + local_idx] = tetra_index;
            }
        }
    }
}
`;

  // Stage 3 - Per voxel: tetra tests and final compute shader to write to voxels
  const stage3ShaderCode = `
struct TetraData {
    i0: u32,
    i1: u32,
    i2: u32,
    i3: u32,
    color: u32,
}

struct Vector4D {
    x: f32,
    y: f32,
    z: f32,
    w: f32,
}


struct Vertex1uvlstex {
    u: f32,
    v: f32,
    l: f32,
    s: f32,
    tex_u: f32,
    tex_v: f32,
    tex_w: f32,
    padding: f32,
}

struct Voxel {
    r: f32,
    g: f32,
    b: f32,
    a: f32,
    s: f32,
    _pad: u32,
    _pad2: u32,
    _pad3: u32,
}


struct CellCountAndOffset {
    count: u32,
    offset: u32,
}

struct UniformPose4D {
    r0: vec4<f32>,
    r1: vec4<f32>,
    r2: vec4<f32>,
    r3: vec4<f32>,
    tr: vec4<f32>,
}

@group(0) @binding(0) var<storage, read> tetras: array<TetraData>;
@group(0) @binding(1) var<storage, read> vertices1uvlstexBuffer: array<Vertex1uvlstex>;
@group(0) @binding(2) var<storage, read> cellCountsAndOffsetsBuffer: array<CellCountAndOffset>;
@group(0) @binding(3) var<storage, read> cell_tetra_indices: array<u32>;
@group(0) @binding(4) var<storage, read> vertex_object_indices: array<u32>;
@group(0) @binding(5) var<storage, read> object_texture_header: array<vec4<u32>>; // offset, USIZE, VSIZE, WSIZE
@group(0) @binding(6) var<storage, read> texture_data: array<u32>; // combine with above
@group(0) @binding(7) var<storage, read_write> voxels: array<Voxel>;
// @group(0) @binding(4) var<storage, read_write> voxels: array<Voxel>;

@group(1) @binding(0) var<uniform> params: vec4<u32>; // RES, TILE_RES, TILE_SZ, unused
@group(1) @binding(1) var<uniform> hypercameraPoseBuffer: UniformPose4D; // 5x5 matrix

fn signedVolume(a: vec3<f32>, b: vec3<f32>, c: vec3<f32>, d: vec3<f32>) -> f32 {
    let ab = b - a;
    let ac = c - a;
    let ad = d - a;
    return dot(cross(ab, ac), ad) / 6.0;
}

fn barycentricCoordinates(P: vec3<f32>, A: vec3<f32>, B: vec3<f32>, C: vec3<f32>, D: vec3<f32>) -> vec4<f32> {
    let V = signedVolume(A, B, C, D);
    if (abs(V) < 1e-10) {
        return vec4<f32>(-1.0);
    }
    let alpha = signedVolume(P, B, C, D) / V;
    let beta = signedVolume(A, P, C, D) / V;
    let gamma = signedVolume(A, B, P, D) / V;
    let delta = signedVolume(A, B, C, P) / V;
    return vec4<f32>(alpha, beta, gamma, delta);
}

fn getTexture(tetra: TetraData, bary: vec4<f32>) -> vec3<f32> {
    // Get UVMap coordinates from barycentric interpolation
    let object_index = vertex_object_indices[tetra.i0]; // assuming all vertices of tetra belong to same object
    let v0_uvlstexcoord = vertices1uvlstexBuffer[tetra.i0];
    let v1_uvlstexcoord = vertices1uvlstexBuffer[tetra.i1];
    let v2_uvlstexcoord = vertices1uvlstexBuffer[tetra.i2];
    let v3_uvlstexcoord = vertices1uvlstexBuffer[tetra.i3];
    let v0_texcoord = vec3<f32>(v0_uvlstexcoord.tex_u, v0_uvlstexcoord.tex_v, v0_uvlstexcoord.tex_w);
    let v1_texcoord = vec3<f32>(v1_uvlstexcoord.tex_u, v1_uvlstexcoord.tex_v, v1_uvlstexcoord.tex_w);
    let v2_texcoord = vec3<f32>(v2_uvlstexcoord.tex_u, v2_uvlstexcoord.tex_v, v2_uvlstexcoord.tex_w);
    let v3_texcoord = vec3<f32>(v3_uvlstexcoord.tex_u, v3_uvlstexcoord.tex_v, v3_uvlstexcoord.tex_w);
    let texcoord = bary.x * v0_texcoord + bary.y * v1_texcoord + bary.z * v2_texcoord + bary.w * v3_texcoord;
    // modulo texcoord to [0,1] (for repeating textures)
    let texcoord01 = fract(texcoord);
    // Load texture map for that object
    let tex_info = object_texture_header[object_index]; // offset, USIZE, VSIZE, WSIZE
    let tex_offset = tex_info.x; // texture for that object starts at this offset
    let tex_usize = tex_info.y; // number of texels in [0, 1] u direction (aka resolution)
    let tex_vsize = tex_info.z;
    let tex_wsize = tex_info.w;
    let texcoord_discrete = vec3<u32>(u32(texcoord01.x * f32(tex_usize)), u32(texcoord01.y * f32(tex_vsize)), u32(texcoord01.z * f32(tex_wsize)));
    // Clamp to valid range
    let texcoord_discrete_x = min(texcoord_discrete.x, tex_usize - 1u);
    let texcoord_discrete_y = min(texcoord_discrete.y, tex_vsize - 1u);
    let texcoord_discrete_z = min(texcoord_discrete.z, tex_wsize - 1u);
    // Fetch texel
    let texel_index = tex_offset + texcoord_discrete_x + texcoord_discrete_y * tex_usize + texcoord_discrete_z * tex_usize * tex_vsize;
    // We can't store as u8, so we store as one big u32 and unpack here
    let texel_u32 = texture_data[texel_index];
    let texel_u8 = vec4<u32>(
        (texel_u32 >> 0u) & 0xFF,
        (texel_u32 >> 8u) & 0xFF,
        (texel_u32 >> 16u) & 0xFF,
        (texel_u32 >> 24u) & 0xFF,
    );
    let texel = vec3<f32>(f32(texel_u8.x) / 255.0, f32(texel_u8.y) / 255.0, f32(texel_u8.z) / 255.0);
    return texel;
}

@compute @workgroup_size(4, 4, 4)
fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let RES = params.x;
    let TILE_RES = params.y;
    let TILE_SZ = params.z;
    
    let U = global_id.x;
    let V = global_id.y;
    let L = global_id.z;
    
    if (U >= RES || V >= RES || L >= RES) {
        return;
    }

      
    let voxel_index = U + V * RES + L * RES * RES;

    if (U == 0 || U == RES-1 || V == 0 || V == RES-1 || L == 0 || L == RES-1) {
     voxels[voxel_index] = Voxel(1.0, 1.0, 1.0, 0.1, 1.0, 0u, 0u, 0u);
     return;
     } 
    
    let TU = U / TILE_SZ;
    let TV = V / TILE_SZ;
    let TL = L / TILE_SZ;
    
    let S_U_START = -1.0;
    let S_U_RANGE = 2.0;
    let S_V_START = -1.0;
    let S_V_RANGE = 2.0;
    let S_L_START = -1.0;
    let S_L_RANGE = 2.0;
    
    let u = S_U_START + (f32(U) + 0.5) / f32(RES) * S_U_RANGE;
    let v = S_V_START + (f32(V) + 0.5) / f32(RES) * S_V_RANGE;
    let l = S_L_START + (f32(L) + 0.5) / f32(RES) * S_L_RANGE;
    
    let CELL_ID = TU + TV * TILE_RES + TL * TILE_RES * TILE_RES;
    let cell_offset = cellCountsAndOffsetsBuffer[CELL_ID].offset;
    let cell_count = cellCountsAndOffsetsBuffer[CELL_ID].count;
  
    var best_voxel = voxels[voxel_index];
    best_voxel.s = 100000000.0; // TODO inf
    best_voxel.a = 0.0;

    // add a ground plane with custom texture
    // get camera ray origin and direction from voxel coordinates
    // hypercamera_in_world_5x5 is passed as a uniform buffer
    if (true) {
    let ray_origin_in_world = hypercameraPoseBuffer.tr;
    let ray_direction_in_hcam = vec4<f32>(1.0, u, v, l);
    let ray_direction_in_world = vec4<f32>(
        hypercameraPoseBuffer.r0.x * 1.0 + hypercameraPoseBuffer.r1.x * u + hypercameraPoseBuffer.r2.x * v + hypercameraPoseBuffer.r3.x * l,
        hypercameraPoseBuffer.r0.y * 1.0 + hypercameraPoseBuffer.r1.y * u + hypercameraPoseBuffer.r2.y * v + hypercameraPoseBuffer.r3.y * l,
        hypercameraPoseBuffer.r0.z * 1.0 + hypercameraPoseBuffer.r1.z * u + hypercameraPoseBuffer.r2.z * v + hypercameraPoseBuffer.r3.z * l,
        hypercameraPoseBuffer.r0.w * 1.0 + hypercameraPoseBuffer.r1.w * u + hypercameraPoseBuffer.r2.w * v + hypercameraPoseBuffer.r3.w * l
    );
    // solve for intersection with plane z = 0 (ground plane)
    let denominator = ray_direction_in_world.z;
    if (abs(denominator) > 1e-6) {
        let t = -ray_origin_in_world.z / denominator;
        if (t > 0.0) {
            let intersect_point = vec4<f32>(
                ray_origin_in_world.x + t * ray_direction_in_world.x,
                ray_origin_in_world.y + t * ray_direction_in_world.y,
                0.0,
                ray_origin_in_world.w + t * ray_direction_in_world.w
            );
            // checkerboard pattern based on intersect_point.x and intersect_point.y and intersect_point.w
            let checker_size = 1.0;
            let check_x = floor(intersect_point.x / checker_size);
            let check_y = floor(intersect_point.y / checker_size);
            let check_w = floor(intersect_point.w / checker_size);
            let is_white = (i32(check_x) + i32(check_y) + i32(check_w)) % 2 == 0;
            if (is_white) {
                best_voxel.r = 1.0;
                best_voxel.g = 1.0;
                best_voxel.b = 1.0;
                // white spotlight for (x^2 + y^2 + w^2) < 5^2, outside of that colors for each axis
                let x = intersect_point.x;
                let y = intersect_point.y;
                let w = intersect_point.w;
                let R = 10.0; // spotlight radius
                if (x*x + y*y + w*w) > R*R {
                    // decay away from white
                    let dx = abs(x) - R;
                    let dy = abs(y) - R;
                    let dw = abs(w) - R;
                    let dnorm = sqrt(dx*dx + dy*dy + dw*dw);
                    best_voxel.r = max(0.3, 0.6 * dx / dnorm);
                    best_voxel.g = max(0.3, 0.6 * dy / dnorm);
                    best_voxel.b = max(0.3, 0.6 * dw / dnorm);
                }
            } else {
                best_voxel.r = 0.0;
                best_voxel.g = 0.0;
                best_voxel.b = 0.0;
            }
            best_voxel.a = 0.2;
            best_voxel.s = t; // use t as "s" value for depth comparison
        }
    }
    }

    
    for (var i = 0u; i < cell_count; i++) {
        let tetra_index = cell_tetra_indices[cell_offset + i];
        let tetra = tetras[tetra_index];
        
        let v0_1uvls = vertices1uvlstexBuffer[tetra.i0];
        let v1_1uvls = vertices1uvlstexBuffer[tetra.i1];
        let v2_1uvls = vertices1uvlstexBuffer[tetra.i2];
        let v3_1uvls = vertices1uvlstexBuffer[tetra.i3];
        
        let v0_s = v0_1uvls.s;
        let v1_s = v1_1uvls.s;
        let v2_s = v2_1uvls.s;
        let v3_s = v3_1uvls.s;
        
        let A = vec3<f32>(v0_1uvls.u, v0_1uvls.v, v0_1uvls.l);
        let B = vec3<f32>(v1_1uvls.u, v1_1uvls.v, v1_1uvls.l);
        let C = vec3<f32>(v2_1uvls.u, v2_1uvls.v, v2_1uvls.l);
        let D = vec3<f32>(v3_1uvls.u, v3_1uvls.v, v3_1uvls.l);
        let P = vec3<f32>(u, v, l);
        
        let u_min = min(min(v0_1uvls.u, v1_1uvls.u), min(v2_1uvls.u, v3_1uvls.u));
        let u_max = max(max(v0_1uvls.u, v1_1uvls.u), max(v2_1uvls.u, v3_1uvls.u));
        let v_min = min(min(v0_1uvls.v, v1_1uvls.v), min(v2_1uvls.v, v3_1uvls.v));
        let v_max = max(max(v0_1uvls.v, v1_1uvls.v), max(v2_1uvls.v, v3_1uvls.v));
        let l_min = min(min(v0_1uvls.l, v1_1uvls.l), min(v2_1uvls.l, v3_1uvls.l));
        let l_max = max(max(v0_1uvls.l, v1_1uvls.l), max(v2_1uvls.l, v3_1uvls.l));
        
        if (u < u_min || u > u_max || v < v_min || v > v_max || l < l_min || l > l_max) {
            continue;
        }
        
        let bary = barycentricCoordinates(P, A, B, C, D);
        
        if (all(bary >= vec4<f32>(0.0)) && all(bary <= vec4<f32>(1.0))) {
            let s = bary.x * v0_s + bary.y * v1_s + bary.z * v2_s + bary.w * v3_s;
            
            if (s < best_voxel.s) {
                // Fetch texture color
                let texel = getTexture(tetra, bary);
                best_voxel.r = texel.x;
                best_voxel.g = texel.y;
                best_voxel.b = texel.z;
                // DEBUG: Uncomment this to use tetra debug colors instead
                // best_voxel.r = f32(((tetra_index + 1u) * 53u) % 256u) / 256.0;
                // best_voxel.g = f32(((tetra_index + 1u) * 97u) % 256u) / 256.0;
                // best_voxel.b = f32(((tetra_index + 1u) * 193u) % 256u) / 256.0;
                best_voxel.a = 0.2;
                best_voxel.s = s;
            }
        }
    }
    
    voxels[voxel_index] = best_voxel;
}
`;

  // Create shader module
  const stage1ShaderModule = device.createShaderModule({
    code: stage1ShaderCode,
  });
  const stage2p1ShaderModule = device.createShaderModule({
    code: stage2p1ShaderCode,
  });
  const stage2p2ShaderModule = device.createShaderModule({
    code: stage2p2ShaderCode,
  });
  const stage3ShaderModule = device.createShaderModule({
    code: stage3ShaderCode,
  });

  // DDA ray traversal shader code
  const stage4ShaderCode = `
struct Uniforms {
  cameraPos: vec3f,
  cameraDir: vec3f,
  cameraUp: vec3f,
  cameraRight: vec3f,
  resolution: vec2f,
}

struct Voxel {
    r: f32,
    g: f32,
    b: f32,
    a: f32,
    s: f32,
    _pad: u32,
    _pad2: u32,
    _pad3: u32,
}

const fVOX: f32 = 64.0;
const iVOX: i32 = 64;

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> voxelGrid: array<Voxel>;

fn getVoxel(pos: vec3i) -> Voxel {
  if (pos.x < 0 || pos.x >= iVOX || pos.y < 0 || pos.y >= iVOX || pos.z < 0 || pos.z >= iVOX) {
    return Voxel(0.0, 0.0, 0.0, 0.0, 0.0, 0u, 0u, 0u);
  }
  let idx = pos.x + pos.y * iVOX + pos.z * iVOX * iVOX;
  return voxelGrid[idx];
}


fn unpackColor(voxel: Voxel) -> vec4f {
  let r = voxel.r;
  let g = voxel.g;
  let b = voxel.b;
  let a = voxel.a;
  return vec4f(r, g, b, a);
}

// DDA ray traversal through voxel grid
fn traceRay(origin: vec3f, dir: vec3f) -> vec4f {
  // Find intersection with grid bounding box (0,0,0) to (VOX,VOX,VOX)
  let boxMin = vec3f(0.0, 0.0, 0.0);
  let boxMax = vec3f(fVOX, fVOX, fVOX);
  
  let invDir = vec3f(1.0) / dir;
  let t0 = (boxMin - origin) * invDir;
  let t1 = (boxMax - origin) * invDir;
  
  let tmin = min(t0, t1);
  let tmax = max(t0, t1);
  
  let tenter = max(max(tmin.x, tmin.y), tmin.z);
  let texit = min(min(tmax.x, tmax.y), tmax.z);
  
  
  var skyColor = vec4f(0.07, 0.07, 0.07, 1.0);

  // Ray misses box or starts after exit
  if (tenter > texit || texit < 0.0) {
    return skyColor;
  }
  
  // Start ray at entry point (or origin if inside box)
  let tstart = max(tenter, 0.0);
  var rayPos = origin + dir * tstart + dir * 0.001; // Small epsilon to ensure we're inside
  
  // Current voxel position
  var voxelPos = vec3i(floor(rayPos));
  
  // Clamp to valid range
  voxelPos = clamp(voxelPos, vec3i(0), vec3i(iVOX-1));
  
  // Step direction (1 or -1 for each axis)
  let step = vec3i(sign(dir));
  
  // Distance to next voxel boundary along each axis
  let deltaDist = abs(vec3f(1.0) / dir);
  
  // Initial side distances
  var sideDist: vec3f;
  if (dir.x < 0.0) {
    sideDist.x = (rayPos.x - f32(voxelPos.x)) * deltaDist.x;
  } else {
    sideDist.x = (f32(voxelPos.x + 1) - rayPos.x) * deltaDist.x;
  }
  if (dir.y < 0.0) {
    sideDist.y = (rayPos.y - f32(voxelPos.y)) * deltaDist.y;
  } else {
    sideDist.y = (f32(voxelPos.y + 1) - rayPos.y) * deltaDist.y;
  }
  if (dir.z < 0.0) {
    sideDist.z = (rayPos.z - f32(voxelPos.z)) * deltaDist.z;
  } else {
    sideDist.z = (f32(voxelPos.z + 1) - rayPos.z) * deltaDist.z;
  }
  
  // DDA traversal
  var compositeRayColor = vec4f(0.0, 0.0, 0.0, 0.0);
  var side = 0;
  let maxSteps = iVOX * 4;
  
  for (var i = 0; i < maxSteps; i++) {
    // Check current voxel
    let voxel = getVoxel(voxelPos);
    if (true) {
      let color = unpackColor(voxel);
      if (color.a > 0.0) {
        var effectiveAlpha = color.a;
        var srcAlpha = effectiveAlpha * (1 - compositeRayColor.a);
        compositeRayColor = vec4f(compositeRayColor.rgb + color.rgb * srcAlpha, compositeRayColor.a + srcAlpha);
        if (compositeRayColor.a >= 0.99) {
          return compositeRayColor;
        }
      }
    }
    
    // Step to next voxel
    if (sideDist.x < sideDist.y) {
      if (sideDist.x < sideDist.z) {
        sideDist.x += deltaDist.x;
        voxelPos.x += step.x;
        side = 0;
      } else {
        sideDist.z += deltaDist.z;
        voxelPos.z += step.z;
        side = 2;
      }
    } else {
      if (sideDist.y < sideDist.z) {
        sideDist.y += deltaDist.y;
        voxelPos.y += step.y;
        side = 1;
      } else {
        sideDist.z += deltaDist.z;
        voxelPos.z += step.z;
        side = 2;
      }
    }
    
    // Check if ray left grid bounds
    if (voxelPos.x < -1 || voxelPos.x > iVOX || 
        voxelPos.y < -1 || voxelPos.y > iVOX || 
        voxelPos.z < -1 || voxelPos.z > iVOX) {
      break;
    }
  }
  
  // Sky color
  var effectiveAlpha = skyColor.a;
  var srcAlpha = effectiveAlpha * (1 - compositeRayColor.a);
  compositeRayColor = vec4f(compositeRayColor.rgb + skyColor.rbg * srcAlpha, compositeRayColor.a + srcAlpha);

  return compositeRayColor;
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  // Full screen quad
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let uv = (fragCoord.xy / uniforms.resolution) * 2.0 - 1.0;
  let aspect = uniforms.resolution.x / uniforms.resolution.y;
  
  // Construct ray direction
  let rayDir = normalize(
    uniforms.cameraDir + 
    uniforms.cameraRight * uv.x * aspect -
    uniforms.cameraUp * uv.y
  );
  
  return traceRay(uniforms.cameraPos, rayDir);
}
`;
  
  // Create shader module
  const stage4ShaderModule = device.createShaderModule({
    code: stage4ShaderCode,
  });

  // ----------------------
  
  // Create uniform buffer
  // 4 vec4s (camera pos, dir, up, right) + 1 vec2 (resolution) + padding = 80 bytes
  const stage4UniformBuffer = device.createBuffer({
    size: 80,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  
  // Create voxel storage buffer
  const voxelBuffer = device.createBuffer({
    size: voxelData.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  
  // Create bind group layout
  const stage4BindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: 'read-only-storage' },
      },
    ],
  });
  
  const stage4BindGroup = device.createBindGroup({
    layout: stage4BindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: stage4UniformBuffer } },
      { binding: 1, resource: { buffer: voxelBuffer } },
    ],
  });
  
  // Create pipeline
  const stage4Pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [stage4BindGroupLayout],
    }),
    vertex: {
      module: stage4ShaderModule,
      entryPoint: 'vs_main',
    },
    fragment: {
      module: stage4ShaderModule,
      entryPoint: 'fs_main',
      targets: [{ format }],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  // Stage 1 Buffers and Pipeline
    
    const tetraBuffer = device.createBuffer({
        size: tetraData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(tetraBuffer, 0, tetraData);

    const tetraCountsBuffer = device.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(tetraCountsBuffer, 0, new Uint32Array([tetras.length, vertices_in_world.length, 0, 0]));

    const vertices1uvlstexBuffer = device.createBuffer({
        size: vertices1uvlstexData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vertices1uvlstexBuffer, 0, vertices1uvlstexData);
    
  const allVerticesInObjectBuffer = device.createBuffer({
    size: all_vertices_in_object_data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(allVerticesInObjectBuffer, 0, all_vertices_in_object_data);

  const objectPosesBuffer = device.createBuffer({
    size: all_object_poses_data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(objectPosesBuffer, 0, all_object_poses_data);

  const vertexObjectIndicesBuffer = device.createBuffer({
    size: vertex_object_indices_data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(vertexObjectIndicesBuffer, 0, vertex_object_indices_data);

  const hypercameraInvPoseBuffer = device.createBuffer({
    size: hypercamera_inv_pose_data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });

  const hypercameraPoseBuffer = device.createBuffer({ // useful for tracing rays from camera (e.g. ground plane)
    size: hypercamera_pose_data.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  const stage1ParamsBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(stage1ParamsBuffer, 0, new Uint32Array([all_vertices_in_object_data.length, 0, 0, 0]));

  // textures
  const textureHeaderBuffer = device.createBuffer({
    size: object_texture_header_data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(textureHeaderBuffer, 0, object_texture_header_data);

  const textureBuffer = device.createBuffer({
    size: global_texture_data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(textureBuffer, 0, global_texture_data);
 
  const verticesTexcoordBuffer = device.createBuffer({
    size: vertices_texcoords_data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(verticesTexcoordBuffer, 0, vertices_texcoords_data);  

  // Layout and pipeline
  const stage1BindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
    ]
  });
  const stage1ParamsBindGroupLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
    ]
  });
  const stage1PipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [stage1BindGroupLayout, stage1ParamsBindGroupLayout]
  });
  const stage1Pipeline = device.createComputePipeline({
    layout: stage1PipelineLayout,
    compute: {
      module: stage1ShaderModule,
      entryPoint: 'main'
    }
  });
  const stage1BindGroup = device.createBindGroup({
    layout: stage1BindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: allVerticesInObjectBuffer } },
      { binding: 1, resource: { buffer: objectPosesBuffer } },
      { binding: 2, resource: { buffer: vertexObjectIndicesBuffer } },
      { binding: 3, resource: { buffer: hypercameraInvPoseBuffer } },
      { binding: 4, resource: { buffer: vertices1uvlstexBuffer } }
    ]
  });
  const stage1ParamsBindGroup = device.createBindGroup({
    layout: stage1ParamsBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: stage1ParamsBuffer } }
    ]
  });



  // Stage 3 Bind Groups ----
  // Create buffers

    // consolidate into one buffer to reduce bind groups
    const cellCountsAndOffsetsBuffer = device.createBuffer({
        size: accelStructureCountsData.byteLength + accelStructureOffsetsData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });

    const cellTetraIndicesBuffer = device.createBuffer({
        size: accelStructureTetraIndicesData.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(cellTetraIndicesBuffer, 0, accelStructureTetraIndicesData);

  // Stage 2p2 - Buffers
  // Create temp buffer for scan algorithm
  const tempBuffer = device.createBuffer({
      size: accelStructureCountsData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC // NOCOMMIT DEBUG
  });

  //  Create a larger buffer for parameters
  // We need space for ~40 passes. 256 bytes alignment is standard.
  const ALIGNED_SIZE = 256; 
  const MAX_PASSES = 100; // Enough for Init + Up(18) + Clear + Down(18) + Finalize
  const prefixSumParamsBuffer = device.createBuffer({
      size: MAX_PASSES * ALIGNED_SIZE, 
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  // Stage 2p3 - Buffers
  // Buffer for temporary write counts during binning
  const cellWriteCountsBuffer = device.createBuffer({
      size: accelStructureCountsData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });

  // Update params for rasterization
  const rasterParamsData = new Uint32Array([VOX, TILE_RES, TILE_SZ, 0]);
  const rasterParamsBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(rasterParamsBuffer, 0, rasterParamsData);

  const stage2p1BindGroupLayout = device.createBindGroupLayout({
      entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
      ]
  });
  const stage2p1ParamsBindGroupLayout = device.createBindGroupLayout({
      entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
      ]
  });
  const stage2p1PipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [stage2p1BindGroupLayout, stage2p1ParamsBindGroupLayout]
  });
  const stage2p1Pipeline = device.createComputePipeline({
      layout: stage2p1PipelineLayout,
      compute: {
          module: stage2p1ShaderModule,
          entryPoint: 'main'
      }
  });
  const stage2p1BindGroup = device.createBindGroup({
      layout: stage2p1BindGroupLayout,
      entries: [
          { binding: 0, resource: { buffer: tetraBuffer } },
          { binding: 1, resource: { buffer: vertices1uvlstexBuffer } },
          { binding: 2, resource: { buffer: cellCountsAndOffsetsBuffer } }
      ]
  });
  const stage2p1ParamsBindGroup = device.createBindGroup({
      layout: stage2p1ParamsBindGroupLayout,
      entries: [
          { binding: 0, resource: { buffer: rasterParamsBuffer } },
          { binding: 1, resource: { buffer: tetraCountsBuffer } }
      ]
  });

  // 2p2

    const prefixSumBindGroupLayout = device.createBindGroupLayout({
      entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
      ]
  });
   const prefixSumParamsLayout = device.createBindGroupLayout({
      entries: [
          { 
            binding: 0, 
            visibility: GPUShaderStage.COMPUTE, 
            buffer: { type: 'uniform', hasDynamicOffset: true } // Changed to true
          }
      ]
  });
  const prefixSumBindGroup = device.createBindGroup({
      layout: prefixSumBindGroupLayout,
      entries: [
          { binding: 0, resource: { buffer: cellCountsAndOffsetsBuffer } },
          { binding: 1, resource: { buffer: tempBuffer } }
      ]
  });

    const prefixSumParamsBindGroup = device.createBindGroup({
      layout: prefixSumParamsLayout,
      entries: [
          { 
            binding: 0, 
            resource: { 
                buffer: prefixSumParamsBuffer,
                size: 16 // Shader only needs a vec4<u32> (16 bytes)
            } 
          }
      ]
  });
  const prefixSumPipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [prefixSumBindGroupLayout, prefixSumParamsLayout]
  });

    // Create pipelines for each stage
  const initPipeline = device.createComputePipeline({
    layout: prefixSumPipelineLayout,
    compute: {
      module: stage2p2ShaderModule,
      entryPoint: 'init'
    }
  });
  const upsweepPipeline = device.createComputePipeline({
    layout: prefixSumPipelineLayout,
    compute: {
      module: stage2p2ShaderModule,
      entryPoint: 'upsweep'
    }
  });
  const clearRootPipeline = device.createComputePipeline({
    layout: prefixSumPipelineLayout,
    compute: {
      module: stage2p2ShaderModule,
      entryPoint: 'clear_root'
    }
  });
  const downsweepPipeline = device.createComputePipeline({
    layout: prefixSumPipelineLayout,
    compute: {
      module: stage2p2ShaderModule,
      entryPoint: 'downsweep'
    }
  });
  const finalizePipeline = device.createComputePipeline({
    layout: prefixSumPipelineLayout,
    compute: {
      module: stage2p2ShaderModule,
      entryPoint: 'finalize'
    }
  });

  // 2p3

  
// 1. Setup Clear Pipeline
const clearShaderModule = device.createShaderModule({ code: clearBufferShaderCode });
const clearBindGroupLayout = device.createBindGroupLayout({
    entries: [{ binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }]
});
const clearPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [clearBindGroupLayout] });
const clearPipeline = device.createComputePipeline({
    layout: clearPipelineLayout,
    compute: { module: clearShaderModule, entryPoint: 'main' }
});
// Create bind groups for clearing specific buffers
const clearCountsBG = device.createBindGroup({
    layout: clearBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: cellCountsAndOffsetsBuffer } }]
});
const clearWriteCountsBG = device.createBindGroup({
    layout: clearBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: cellWriteCountsBuffer } }]
});

// 2. Setup Stage 2.3 (Binning) Pipeline
const stage2p3ShaderModule = device.createShaderModule({ code: stage2p3ShaderCode });
const stage2p3BindGroupLayout = device.createBindGroupLayout({
    entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } }, // Offsets
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },           // Write Counters (Atomic)
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }            // Tetra Indices (Output)
    ]
});
const stage2p3PipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [stage2p3BindGroupLayout, stage2p1ParamsBindGroupLayout] // Reuse params layout
});
const stage2p3Pipeline = device.createComputePipeline({
    layout: stage2p3PipelineLayout,
    compute: { module: stage2p3ShaderModule, entryPoint: 'main' }
});
const stage2p3BindGroup = device.createBindGroup({
    layout: stage2p3BindGroupLayout,
    entries: [
        { binding: 0, resource: { buffer: tetraBuffer } },
        { binding: 1, resource: { buffer: vertices1uvlstexBuffer } },
        { binding: 2, resource: { buffer: cellCountsAndOffsetsBuffer } },
        { binding: 3, resource: { buffer: cellWriteCountsBuffer } },
        { binding: 4, resource: { buffer: cellTetraIndicesBuffer } }
    ]
});

  // 3

  const stage3BindGroupLayout = device.createBindGroupLayout({
      entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
        //   { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
      ]
  });
  const stage3ParamsBindGroupLayout = device.createBindGroupLayout({
      entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } }
      ]
  });
  const stage3PipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [stage3BindGroupLayout, stage3ParamsBindGroupLayout]
  });
  const stage3Pipeline = device.createComputePipeline({
      layout: stage3PipelineLayout,
      compute: {
          module: stage3ShaderModule,
          entryPoint: 'cs_main'
      }
  });
  const stage3BindGroup = device.createBindGroup({
      layout: stage3BindGroupLayout,
      entries: [
          { binding: 0, resource: { buffer: tetraBuffer } },
          { binding: 1, resource: { buffer: vertices1uvlstexBuffer } },
          { binding: 2, resource: { buffer: cellCountsAndOffsetsBuffer } },
          { binding: 3, resource: { buffer: cellTetraIndicesBuffer } },
          { binding: 4, resource: { buffer: vertexObjectIndicesBuffer } },
          { binding: 5, resource: { buffer: textureHeaderBuffer } },
          { binding: 6, resource: { buffer: textureBuffer } },
          { binding: 7, resource: { buffer: voxelBuffer } }
            // { binding: 4, resource: { buffer: voxelBuffer } }
      ]
  });
  const stage3ParamsBindGroup = device.createBindGroup({
      layout: stage3ParamsBindGroupLayout,
      entries: [
          { binding: 0, resource: { buffer: rasterParamsBuffer } },
          { binding: 1, resource: { buffer: hypercameraPoseBuffer } }
      ]
  });

  let sensorCamRotX = 0;
  let sensorCamRotY = 0;
  let sensorCamDist = 100;
  
  
  function updateDDACamera() {
    const rotY = sensorCamRotX;
    const rotX = sensorCamRotY;
    const dist = sensorCamDist;
    
    // Camera position (orbit around center at 2,2,2)
    const cx = VOX / 2 + Math.cos(rotY) * Math.cos(rotX) * dist;
    const cy = VOX / 2 + Math.sin(rotX) * dist;
    const cz = VOX / 2 + Math.sin(rotY) * Math.cos(rotX) * dist;
    
    // Camera direction (look at center)
    const target = [VOX / 2, VOX / 2, VOX / 2];
    const dx = target[0] - cx;
    const dy = target[1] - cy;
    const dz = target[2] - cz;
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const dir = [dx/len, dy/len, dz/len];
    
    // Camera up and right vectors
    const worldUp = [0, 1, 0];
    const right = [
      dir[1] * worldUp[2] - dir[2] * worldUp[1],
      dir[2] * worldUp[0] - dir[0] * worldUp[2],
      dir[0] * worldUp[1] - dir[1] * worldUp[0],
    ];
    const rlen = Math.sqrt(right[0]**2 + right[1]**2 + right[2]**2);
    right[0] /= rlen; right[1] /= rlen; right[2] /= rlen;
    
    const up = [
      right[1] * dir[2] - right[2] * dir[1],
      right[2] * dir[0] - right[0] * dir[2],
      right[0] * dir[1] - right[1] * dir[0],
    ];
    
    // Update uniform buffer
    const uniforms = new Float32Array([
      cx, cy, cz, 0,
      dir[0], dir[1], dir[2], 0,
      up[0], up[1], up[2], 0,
      right[0], right[1], right[2], 0,
      canvas.width, canvas.height, 0, 0,
    ]);
    device.queue.writeBuffer(stage4UniformBuffer, 0, uniforms);
  }

  let STEP_PHYSICS_ONCE = false;
  let DEBUG_PHYSICS = false;
  let physics_time_s = 0;
  let accumulated_animation_time_s = 0;
  let moved = false;
  let user_has_pushed_object = false;
  
  // Register Keyboard controls
  const keys = {};
  window.addEventListener('keydown', (e) => {
      keys[e.key.toLowerCase()] = true;
  });

  window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
  });
  function updatePlayerControls() {
     if (true) {
                
                const moveSpeed = 0.1;
                const RELATIVE_MOVEMENT = true;
                if (keys['w']) {
                    hypercamera_T.translate_self_by_delta(moveSpeed, 0, 0, 0, RELATIVE_MOVEMENT);
                    moved = true;
                }
                if (keys['s']) {
                    hypercamera_T.translate_self_by_delta(-moveSpeed, 0, 0, 0, RELATIVE_MOVEMENT);
                    moved = true;
                }
                if (keys['a']) {
                    hypercamera_T.translate_self_by_delta(0, moveSpeed, 0, 0, RELATIVE_MOVEMENT);
                    moved = true;
                }
                if (keys['d']) {
                    hypercamera_T.translate_self_by_delta(0,-moveSpeed, 0, 0, RELATIVE_MOVEMENT);
                    moved = true;
                }
                if (keys['q']) {
                    hypercamera_T.translate_self_by_delta(0, 0, 0, moveSpeed, RELATIVE_MOVEMENT);
                    moved = true;
                }
                if (keys['e']) {
                    hypercamera_T.translate_self_by_delta(0, 0, 0, -moveSpeed, RELATIVE_MOVEMENT);
                    moved = true;
                }
                if (keys['r']) {
                    hypercamera_T.translate_self_by_delta(0, 0, moveSpeed, 0, RELATIVE_MOVEMENT);
                    moved = true;
                }
                if (keys['f']) {
                    hypercamera_T.translate_self_by_delta(0, 0, -moveSpeed, 0, RELATIVE_MOVEMENT);
                    moved = true;
                }
                // reset camera z to 0
                hypercamera_T.matrix[2][4] = floor_heightmap(
                    hypercamera_T.matrix[0][4],
                    hypercamera_T.matrix[1][4],
                    hypercamera_T.matrix[3][4]
                ) + hypercamera_height_above_ground;

                if (keys['i']) {
                    hypercamera_T.rotate_self_by_delta('XZ', 0.05, RELATIVE_MOVEMENT);
                    moved = true;
                }
                if (keys['k']) {
                    hypercamera_T.rotate_self_by_delta('XZ', -0.05, RELATIVE_MOVEMENT);
                    moved = true;
                }
                if (keys['j']) {
                    hypercamera_T.rotate_self_by_delta('XY', 0.05, false);
                    moved = true;
                }
                if (keys['l']) {
                    hypercamera_T.rotate_self_by_delta('XY', -0.05, false);
                    moved = true;
                }
                if (keys['u']) {
                    hypercamera_T.rotate_self_by_delta('XW', 0.05, false);
                    moved = true;
                }
                if (keys['o']) {
                    hypercamera_T.rotate_self_by_delta('XW', -0.05, false);
                    moved = true;
                }
                if (keys['y']) {
                    hypercamera_T.rotate_self_by_delta('YW', -0.05, false);
                    moved = true;
                }
                if (keys['p']) {
                    hypercamera_T.rotate_self_by_delta('YW', 0.05, false);
                    moved = true;
                }
              }
  }

  function writeCameraPoseToGPU() {
    let hypercamera_inv_pose_data = new Float32Array(5 * 5);
    let hc_pose = hypercamera_T.inverse().matrix;
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            hypercamera_inv_pose_data[i * 5 + j] = hc_pose[i][j];
        }
    }
    device.queue.writeBuffer(hypercameraInvPoseBuffer, 0, hypercamera_inv_pose_data);
    // uniform buffer for hypercamera pose (so we only pass the first 4 rows of each vector)
    let hypercamera_pose_data = new Float32Array(5 * 4);
    for (let i = 0; i < 5; i++) {
        hypercamera_pose_data[i * 4 + 0] = hypercamera_T.matrix[0][i];
        hypercamera_pose_data[i * 4 + 1] = hypercamera_T.matrix[1][i];
        hypercamera_pose_data[i * 4 + 2] = hypercamera_T.matrix[2][i];
        hypercamera_pose_data[i * 4 + 3] = hypercamera_T.matrix[3][i];
    }
    device.queue.writeBuffer(hypercameraPoseBuffer, 0, hypercamera_pose_data);
  }

  function physicsStepCPU() {
        // Simulate physics
        const SIMULATE_PHYSICS = true;
        for (let n = 0; n < 4; n++) { // substeps for stability
            if (SIMULATE_PHYSICS) {
                moved = true;

                // debug log
                let html_physics_log = '';

                const FLOOR_STIFFNESS = 100;
                const FLOOR_DAMPING = 10;
                const GRAVITY = -9.81;
                const AIR_FRICTION_COEFFICIENT = 1.0;
                const FLOOR_SIDE_FRICTION_COEFFICIENT = 1;
                const dt = 0.016; // ~60fps

                html_physics_log += '<b>Sim Time:</b> ' + physics_time_s.toFixed(2) + ' s<br>';
                html_physics_log += '<b>UI Time:</b> ' + accumulated_animation_time_s.toFixed(2) + ' s<br>';

                for (let hyperobject of visibleHyperobjects) {
                    if (hyperobject.simulate_physics) {

                        html_physics_log += `<b>Object:</b> ${hyperobject.name}<br>`;

                        // calculate hyperobject center of mass 
                        let hyperobject_com = hyperobject.get_com();
                        
                        // mujoco-style forward/backward
                        // 1. apply gravity
                        // 2. apply collision to c.o.m based on vertices penetrating the floor (use z=-2 as the floor height)
                        // 3. resolve c.o.m velocity and rotational velocity
                        // 4. update vertex positions based on c.o.m and rotational velocity
                        
                        // force and torque accumulators
                        let com_force = new Vector4D(0, 0, GRAVITY * hyperobject.mass, 0);
                        let com_torque = {xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0};

                        // If object com is within 1 unit of camera, push it away with small force
                        let to_camera = hyperobject_com.subtract(hypercamera_T.origin());
                        let distance_to_camera = Math.sqrt(to_camera.x**2 + to_camera.y**2 + to_camera.z**2 + to_camera.w**2);
                        if (distance_to_camera < 2.0 && distance_to_camera > 0.01) {
                            // let push_strength = 50 * (1.0 - distance_to_camera);
                            let min_push_strength = 50;
                            let max_push_strength = 500;
                            let push_01 = (2.0 - distance_to_camera) / 2.0;
                            let push_strength = min_push_strength + (max_push_strength - min_push_strength) * push_01;
                            let push_direction = to_camera.multiply_by_scalar(1.0 / distance_to_camera); // normalize
                            let push_force = push_direction.multiply_by_scalar(push_strength);
                            com_force = com_force.add(push_force);
                            // update mission variables
                            user_has_pushed_object = true;
                        }

                        // Add a general friction force
                        let friction_force = hyperobject.velocity_in_world.multiply_by_scalar(-AIR_FRICTION_COEFFICIENT);
                        com_force = com_force.add(friction_force);

                        // Add a general air friction rotational torque
                        com_torque.xy += -AIR_FRICTION_COEFFICIENT * hyperobject.rotational_velocity.xy;
                        com_torque.xz += -AIR_FRICTION_COEFFICIENT * hyperobject.rotational_velocity.xz;
                        com_torque.xw += -AIR_FRICTION_COEFFICIENT * hyperobject.rotational_velocity.xw;
                        com_torque.yz += -AIR_FRICTION_COEFFICIENT * hyperobject.rotational_velocity.yz;
                        com_torque.yw += -AIR_FRICTION_COEFFICIENT * hyperobject.rotational_velocity.yw;
                        com_torque.zw += -AIR_FRICTION_COEFFICIENT * hyperobject.rotational_velocity.zw;
                        
                        // 2. Check for collisions with floor and accumulate forces/torques
                        for (let v of hyperobject.vertices_in_world) {
                            let floor_height = floor_heightmap(v.x, v.y, v.w);
                            let penetration = floor_height - v.z;
                            if (penetration > 0) {
                                // Position relative to CoM
                                let r = v.subtract(hyperobject_com); // position relative to CoM
                                
                                // Calculate velocity of this vertex in world frame
                                let vertex_velocity = new Vector4D(0, 0, 0, 0);

                                // Linear velocity from CoM
                                vertex_velocity = vertex_velocity.add(hyperobject.velocity_in_world)

                                // Velocity due to rotation (v_rot = omega × r in 4D)
                                // too unstable
                                // let v_rot = new Vector4D(
                                    // hyperobject.rotational_velocity.xy * r.y - hyperobject.rotational_velocity.xz * r.z - hyperobject.rotational_velocity.xw * r.w,
                                    // -hyperobject.rotational_velocity.xy * r.x + hyperobject.rotational_velocity.yz * r.z + hyperobject.rotational_velocity.yw * r.w,
                                    // hyperobject.rotational_velocity.xz * r.x - hyperobject.rotational_velocity.yz * r.y + hyperobject.rotational_velocity.zw * r.w,
                                    // hyperobject.rotational_velocity.xw * r.x - hyperobject.rotational_velocity.yw * r.y - hyperobject.rotational_velocity.zw * r.z
                                // );
                                // vertex_velocity = vertex_velocity.add(v_rot);
                                
                                
                                
                                // Spring-damper force (normal direction only, z-axis)
                                let normal_force_z = FLOOR_STIFFNESS * penetration - FLOOR_DAMPING * vertex_velocity.z;
                                
                                let contact_force = new Vector4D(0, 0, normal_force_z, 0);

                                // Add side friction to contact force
                                let lateral_velocity = new Vector4D(vertex_velocity.x, vertex_velocity.y, 0, vertex_velocity.w);
                                let lateral_speed = Math.sqrt(lateral_velocity.x**2 + lateral_velocity.y**2 + lateral_velocity.w**2);
                                if (lateral_speed > 0.01) {
                                    let lateral_direction = lateral_velocity.multiply_by_scalar(1.0 / lateral_speed); // normalize
                                    let lateral_friction_magnitude = FLOOR_SIDE_FRICTION_COEFFICIENT * Math.abs(normal_force_z);
                                    let lateral_friction = lateral_direction.multiply_by_scalar(-lateral_friction_magnitude);
                                    contact_force = contact_force.add(lateral_friction);
                                }
                                
                                // Accumulate force on CoM
                                com_force = com_force.add(contact_force);

                                // Debug
                                if (v.z < -4) {
                                    let aaa = 1;
                                }
                                
                                // Accumulate torque (r × F in 4D gives bivector with 6 components)
                                com_torque.xy += r.x * contact_force.y - r.y * contact_force.x;
                                com_torque.xz += r.x * contact_force.z - r.z * contact_force.x;
                                com_torque.xw += r.x * contact_force.w - r.w * contact_force.x;
                                com_torque.yz += r.y * contact_force.z - r.z * contact_force.y;
                                com_torque.yw += r.y * contact_force.w - r.w * contact_force.y;
                                com_torque.zw += r.z * contact_force.w - r.w * contact_force.z;
                            }
                        }


                        const fmt = (n) => {
                            let str = n.toFixed(3);
                            str = (n < 0 ? str.slice(1) : str); // remove minus for padding
                            str = str.padStart(8, '_');
                            str = (n >= 0 ? '+' + str : '-' + str);
                            return str
                        };

                        html_physics_log += `<table style="border-collapse: collapse; font-family: monospace;">`;
                        html_physics_log += `<tr><th>Property</th><th>x</th><th>y</th><th>z</th><th>w</th><th></th><th></th></tr>`;
                        html_physics_log += `<tr><td>Com Force</td><td>${fmt(com_force.x)}</td><td>${fmt(com_force.y)}</td><td>${fmt(com_force.z)}</td><td>${fmt(com_force.w)}</td><td></td><td></td></tr>`;
                        html_physics_log += `<tr><td>Com Vel</td><td>${fmt(hyperobject.velocity_in_world.x)}</td><td>${fmt(hyperobject.velocity_in_world.y)}</td><td>${fmt(hyperobject.velocity_in_world.z)}</td><td>${fmt(hyperobject.velocity_in_world.w)}</td><td></td><td></td></tr>`;
                        html_physics_log += `<tr><th></th><th>xy</th><th>xz</th><th>xw</th><th>yz</th><th>yw</th><th>zw</th></tr>`;
                        html_physics_log += `<tr><td>Com Torque</td><td>${fmt(com_torque.xy)}</td><td>${fmt(com_torque.xz)}</td><td>${fmt(com_torque.xw)}</td><td>${fmt(com_torque.yz)}</td><td>${fmt(com_torque.yw)}</td><td>${fmt(com_torque.zw)}</td></tr>`;
                        html_physics_log += `<tr><td>Com Ang Vel</td><td>${fmt(hyperobject.rotational_velocity.xy)}</td><td>${fmt(hyperobject.rotational_velocity.xz)}</td><td>${fmt(hyperobject.rotational_velocity.xw)}</td><td>${fmt(hyperobject.rotational_velocity.yz)}</td><td>${fmt(hyperobject.rotational_velocity.yw)}</td><td>${fmt(hyperobject.rotational_velocity.zw)}</td></tr>`;
                        html_physics_log += `</table>`;
                        
                        // 3. Integrate velocities (simple Euler integration)
                        
                        // Linear velocity update: v += (F/m) * dt
                        hyperobject.velocity_in_world = hyperobject.velocity_in_world.add(
                            new Vector4D(
                                com_force.x / hyperobject.mass * dt,
                                com_force.y / hyperobject.mass * dt,
                                com_force.z / hyperobject.mass * dt,
                                com_force.w / hyperobject.mass * dt
                            )
                        );
                        
                        // Angular velocity update: omega += (torque / I) * dt
                        // For uniform hyperobject with edge length 2: I = (2/3) * mass
                        const I = (2/3) * hyperobject.mass;
                        hyperobject.rotational_velocity.xy += (com_torque.xy / I) * dt;
                        hyperobject.rotational_velocity.xz += (com_torque.xz / I) * dt;
                        hyperobject.rotational_velocity.xw += (com_torque.xw / I) * dt;
                        hyperobject.rotational_velocity.yz += (com_torque.yz / I) * dt;
                        hyperobject.rotational_velocity.yw += (com_torque.yw / I) * dt;
                        hyperobject.rotational_velocity.zw += (com_torque.zw / I) * dt;
                        
                        // 4. Update pose based on CoM velocity and rotation, update vertices
                        // Update CoM position
                        // translate the pose matrix by velocity * dt
                        hyperobject.pose.translate_self_by_delta(
                            hyperobject.velocity_in_world.x * dt,
                            hyperobject.velocity_in_world.y * dt,
                            hyperobject.velocity_in_world.z * dt,
                            hyperobject.velocity_in_world.w * dt,
                            false
                        );
                        // rotate the pose matrix by rotational velocity * dt
                        hyperobject.pose.rotate_self_by_delta('XY', hyperobject.rotational_velocity.xy * dt, false);
                        hyperobject.pose.rotate_self_by_delta('XZ', hyperobject.rotational_velocity.xz * dt, false);
                        hyperobject.pose.rotate_self_by_delta('XW', hyperobject.rotational_velocity.xw * dt, false);
                        hyperobject.pose.rotate_self_by_delta('YZ', hyperobject.rotational_velocity.yz * dt, false);
                        hyperobject.pose.rotate_self_by_delta('YW', hyperobject.rotational_velocity.yw * dt, false);
                        hyperobject.pose.rotate_self_by_delta('ZW', hyperobject.rotational_velocity.zw * dt, false);
                        // update vertices
                        hyperobject.update_vertices_in_world();
                    }
                }

                physics_time_s += dt;

                if (DEBUG_PHYSICS) {
                    // document.getElementById('physics-debug-text').innerHTML = html_physics_log;
                } else {
                    // document.getElementById('physics-debug-text').innerHTML = '';
                }

                if (STEP_PHYSICS_ONCE) {
                    SIMULATE_PHYSICS = false;
                    STEP_PHYSICS_ONCE = false;
                }
            } // End of SIMULATE_PHYSICS
        } // end of substeps
    } // end function physicsStepCPU()

  function writeObjectPosesToGPU() {
    let new_object_poses_data = new Float32Array(visibleHyperobjects.length * 5 * 5);
    for (let obj_index = 0; obj_index < visibleHyperobjects.length; obj_index++) {
        let obj = visibleHyperobjects[obj_index];
        // basic physics - move cube up and down 
        let time = performance.now() * 0.001;
        // DEBUG - rotate the hypercube
        // if (obj_index === 0) {
        //     obj.pose.rotate_self_by_delta('ZW', 0.01, false)
        // }
        // object poses
        let pose = obj.pose.matrix;
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                new_object_poses_data[obj_index * 5 * 5 + i * 5 + j] = pose[i][j];
            }
        }
    }
    device.queue.writeBuffer(objectPosesBuffer, 0, new_object_poses_data);
  }

  function render() {
    // update DDA camera
    updateDDACamera();
    // update hypercamera
    updatePlayerControls();
    writeCameraPoseToGPU();
    // update physics
    physicsStepCPU();
    writeObjectPosesToGPU();
    
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    // Stage 1: Vertex Shader
    if (true) {
      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(stage1Pipeline);
      computePass.setBindGroup(0, stage1BindGroup);
      computePass.setBindGroup(1, stage1ParamsBindGroup);
      const workgroupCount = Math.ceil(all_vertices_in_object_data.length / 64);
      computePass.dispatchWorkgroups(workgroupCount);
      computePass.end();
    }

    // Stage 2: Cull tetras, + add clipped tetras if needed
    // TODO

    // Stage 2.0: Clear Counters (Use Compute Shader, NOT writeBuffer for proper sync) ---
    const clearPass = commandEncoder.beginComputePass();
    clearPass.setPipeline(clearPipeline);
    // Clear cell_counts
    clearPass.setBindGroup(0, clearCountsBG);
    clearPass.dispatchWorkgroups(Math.ceil(accelStructureCountsData.length * 2 / 256));
    // Clear cell_write_counters
    clearPass.setBindGroup(0, clearWriteCountsBG);
    clearPass.dispatchWorkgroups(Math.ceil(accelStructureCountsData.length / 256));
    clearPass.end();

    // Stage 2.1: Accel structure counts
    if (true) {
      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(stage2p1Pipeline);
      computePass.setBindGroup(0, stage2p1BindGroup);
      computePass.setBindGroup(1, stage2p1ParamsBindGroup);
      const workgroupCount = Math.ceil(tetras.length / 64);
      computePass.dispatchWorkgroups(workgroupCount);
      computePass.end();
    }

    function computePrefixSum(commandEncoder, numElements) {
        const numLevels = Math.ceil(Math.log2(numElements));
        
        // --- 1. Prepare Data CPU Side ---
        // We calculate all parameters needed for every pass and put them in one array
        const ALIGNED_SIZE = 256;
        // Total steps: Init(1) + Up(numLevels) + Clear(1) + Down(numLevels) + Finalize(1)
        const totalSteps = 1 + numLevels + 1 + numLevels + 1;
        
        // Use a DataView or typed array to write into the buffer
        const uniformData = new Uint8Array(totalSteps * ALIGNED_SIZE);
        const view = new DataView(uniformData.buffer);

        let stepIndex = 0;
        
        // Helper to write params (num_elements, level, 0, 0)
        function addParams(n, l) {
            const offset = stepIndex * ALIGNED_SIZE;
            view.setUint32(offset + 0, n, true); // Little endian
            view.setUint32(offset + 4, l, true);
            view.setUint32(offset + 8, 0, true);
            view.setUint32(offset + 12, 0, true);
            stepIndex++;
            return offset;
        }

        // Generate Offsets
        const offsetInit = addParams(numElements, 0);
        
        const offsetsUp = [];
        for (let level = 0; level < numLevels; level++) {
            offsetsUp.push(addParams(numElements, level));
        }
        
        const offsetClear = addParams(numElements, 0); // params.x used for bounds check
        
        const offsetsDown = [];
        for (let level = numLevels - 1; level >= 0; level--) {
            offsetsDown.push(addParams(numElements, level));
        }
        
        const offsetFinalize = addParams(numElements, 0);

        // --- 2. Upload Data to GPU ---
        // Write the entire sequence of parameters once
        device.queue.writeBuffer(prefixSumParamsBuffer, 0, uniformData);

        // --- 3. Record Commands with Dynamic Offsets ---
        
        // Init
        let pass = commandEncoder.beginComputePass();
        pass.setPipeline(initPipeline);
        pass.setBindGroup(0, prefixSumBindGroup);
        pass.setBindGroup(1, prefixSumParamsBindGroup, [offsetInit]); // Pass offset here
        pass.dispatchWorkgroups(Math.ceil(numElements / 256));
        pass.end();
        
        // Up-sweep
        for (let i = 0; i < numLevels; i++) {
            const level = i;
            pass = commandEncoder.beginComputePass();
            pass.setPipeline(upsweepPipeline);
            pass.setBindGroup(0, prefixSumBindGroup);
            pass.setBindGroup(1, prefixSumParamsBindGroup, [offsetsUp[i]]);
            const workgroups = Math.ceil(numElements / (256 * (1 << (level + 1))));
            pass.dispatchWorkgroups(Math.max(1, workgroups));
            pass.end();
        }
        
        // Clear Root (GPU side)
        pass = commandEncoder.beginComputePass();
        pass.setPipeline(clearRootPipeline);
        pass.setBindGroup(0, prefixSumBindGroup);
        pass.setBindGroup(1, prefixSumParamsBindGroup, [offsetClear]);
        pass.dispatchWorkgroups(1);
        pass.end();
        
        // Down-sweep
        for (let i = 0; i < numLevels; i++) {
            const level = numLevels - 1 - i;
            pass = commandEncoder.beginComputePass();
            pass.setPipeline(downsweepPipeline);
            pass.setBindGroup(0, prefixSumBindGroup);
            pass.setBindGroup(1, prefixSumParamsBindGroup, [offsetsDown[i]]);
            const workgroups = Math.ceil(numElements / (256 * (1 << (level + 1))));
            pass.dispatchWorkgroups(Math.max(1, workgroups));
            pass.end();
        }
        
        // Finalize
        pass = commandEncoder.beginComputePass();
        pass.setPipeline(finalizePipeline);
        pass.setBindGroup(0, prefixSumBindGroup);
        pass.setBindGroup(1, prefixSumParamsBindGroup, [offsetFinalize]);
        pass.dispatchWorkgroups(Math.ceil(numElements / 256));
        pass.end();
    }

    // Stage 2.2: Prefix sum to compute cell offsets
    if (true) {
      computePrefixSum(commandEncoder, TILE_RES * TILE_RES * TILE_RES);
    }

    // Stage 2.3 (Binning - Write Indices) ---
    // populates cellTetraIndicesBuffer with the current frame's data
    const pass3 = commandEncoder.beginComputePass();
    pass3.setPipeline(stage2p3Pipeline);
    pass3.setBindGroup(0, stage2p3BindGroup);
    pass3.setBindGroup(1, stage2p1ParamsBindGroup); // Reusing params
    pass3.dispatchWorkgroups(Math.ceil(tetras.length / 64));
    pass3.end();

    // Stage 3: Intersection tests compute pass to update voxel data
    if (true) {
      const computePass = commandEncoder.beginComputePass();
      computePass.setPipeline(stage3Pipeline);
      computePass.setBindGroup(0, stage3BindGroup);
      computePass.setBindGroup(1, stage3ParamsBindGroup);
      const workgroupCount = Math.ceil(VOX / 4);
      computePass.dispatchWorkgroups(workgroupCount, workgroupCount, workgroupCount);
      computePass.end();
    }


    // Stage 4: DDA Render pass
    const stage4Pass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    stage4Pass.setPipeline(stage4Pipeline);
    stage4Pass.setBindGroup(0, stage4BindGroup);
    stage4Pass.draw(6);
    stage4Pass.end();
    
    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(render);
  }

  // Mouse interaction
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
  });
  canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;


      sensorCamRotY = sensorCamRotY + deltaY * 0.01;
      sensorCamRotX += deltaX * 0.01;
      
      // camera.theta += -deltaX * 0.01;
      // camera.phi = Math.max(0.1, Math.min(Math.PI - 0.1, camera.phi - deltaY * 0.01));
      
      lastX = e.clientX;
      lastY = e.clientY;
      
  });
  canvas.addEventListener('mouseup', () => {
      isDragging = false;
  });
  canvas.addEventListener('mouseleave', () => {
      isDragging = false;
  });
  // Scrolling changes camera distance
  canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      sensorCamDist += e.deltaY * 0.05;
      // camera.distance += e.deltaY * 0.05;
      // camera.distance = Math.max(5, Math.min(hypercamera_sensor_resolution * 4.0, camera.distance));

  });
  
  render();
} // end of function runHyperengine()