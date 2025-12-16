import { Transform4D, Vector4D } from '../hyperengine/transform4d.js';

export class Hyperobject {
    constructor(vertices_in_object, edges, tetras, color, simulate_physics, show_vertices, mass, pose, name) {
        this.vertices_in_object = vertices_in_object; // in object frame
        this.edges = edges;
        this.tetras = tetras;
        this.color = color;
        this.simulate_physics = simulate_physics; // if true, object gets affected by physics
        this.show_vertices = show_vertices;
        this.mass = mass;
        this.pose = pose; // Transform4D from object frame to world frame
        this.name = name;
        // texture info
        // default checkerboard texture
        this.vertices_in_texmap = vertices_in_object;
        let USIZE = 2;
        let VSIZE = 2;
        let WSIZE = 2;
        let A_color = color; // B is darker version of A
        let B_color = ((color & 0xFEFEFE) >> 1); // darker color
        let object_texture = new Uint32Array(USIZE * VSIZE * WSIZE); // RGBA
        for (let u = 0; u < USIZE; u++) {
            for (let v = 0; v < VSIZE; v++) {
                for (let w = 0; w < WSIZE; w++) {
                    // important to use the same indexing as in the shader!
                    let index = (u + (v * USIZE) + (w * USIZE * VSIZE));
                    // checkerboard pattern
                    let is_A = ((u + v + w) % 2 === 0);
                    let color = is_A ? A_color : B_color;
                    // pack color into one u32 RGBA
                    let r_u8 = (color >> 16) & 0xFF;
                    let g_u8 = (color >> 8) & 0xFF;
                    let b_u8 = (color) & 0xFF;
                    let a_u8 = 255;
                    let rgba_u32 = (a_u8 << 24) | (b_u8 << 16) | (g_u8 << 8) | (r_u8);
                    object_texture[index] = rgba_u32;
                }
            }
        }
        this.texture = object_texture; // store in object for now
        this.texture_info = { USIZE: USIZE, VSIZE: VSIZE, WSIZE: WSIZE };
        // variables
        this.velocity_in_world = new Vector4D(0, 0, 0, 0);
        this.rotational_velocity = {xy: 0, xz: 0, xw: 0, yz: 0, yw: 0, zw: 0};
        // computed properties
        this.update_vertices_in_world();
    }

    update_vertices_in_world() {
        this.vertices_in_world = [];
        for (let v of this.vertices_in_object) {
            let v_world = this.pose.transform_point(v);
            this.vertices_in_world.push(v_world);
        }
    }

    get_com() {
        return this.pose.origin();
    }
}