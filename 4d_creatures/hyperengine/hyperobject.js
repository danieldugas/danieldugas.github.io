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

export function createHypercube(pose) {
    const const_hypercube_vertices = [ 
            new Vector4D(-1, -1, -1, -1),
            new Vector4D( 1, -1, -1, -1),
            new Vector4D( 1,  1, -1, -1),
            new Vector4D(-1,  1, -1, -1),
            new Vector4D(-1, -1,  1, -1),
            new Vector4D( 1, -1,  1, -1),
            new Vector4D( 1,  1,  1, -1),
            new Vector4D(-1,  1,  1, -1),
            new Vector4D(-1, -1, -1,  1),
            new Vector4D( 1, -1, -1,  1),
            new Vector4D( 1,  1, -1,  1),
            new Vector4D(-1,  1, -1,  1),
            new Vector4D(-1, -1,  1,  1),
            new Vector4D( 1, -1,  1,  1),
            new Vector4D( 1,  1,  1,  1),
            new Vector4D(-1,  1,  1,  1)
        ];
    // Tetrahedras
    function create_40_tetrahedra_tiling_of_hypercube(cube_vertices) {
        // cube_vertices need to all be -1 or 1 values (i.e. in unit cube coord system) for this to work!
        const p = 1.0;
        const n = -1.0;
        // for the 3D cube, these are the tetrahedra vertices
        // [[p, n, n], [n, n, n], [p, p, n], [p, n, p]], // tet at corner p n n
        // [[n, p, n], [p, p, n], [n, n, n], [n, p, p]], // tet at corner n p n
        // [[n, n, p], [p, n, p], [n, p, p], [n, n, n]], // tet at corner n n p
        // [[p, p, p], [n, p, p], [p, n, p], [p, p, n]], // tet at corner p p p
        // [[n, n, n], [p, p, n], [n, p, p], [p, n, p]]  // tet at center

        // to create 5 tet at each of the 8 cubes in the hypercube, we set one of the 4dims to either p or n and fill the remaining 3 with the above
        // for example if we tetrahedralize the cube at z = n, we set z = n and fill x=0, y=1, w=2 with the above
        // [[p, n, z, n], [n, n, z, n], [p, p, z, n], [p, n, z, p]]
        const xn = -1.0; // fixed x for this cube
        const xp = 1.0;  // fixed x for this cube
        const yn = -1.0; // fixed y for this cube
        const yp = 1.0;  // fixed y for this cube
        const zn = -1.0; // fixed z for this cube
        const zp = 1.0;  // fixed z for this cube
        const wn = -1.0; // fixed w for this cube
        const wp = 1.0;  // fixed w for this cube
        const tetrahedron_40_tiling_of_hypercube = [
            // cube at x = n
            [[xn, p, n, n], [xn, n, n, n], [xn, p, p, n], [xn, p, n, p]], // tet at corner p n n
            [[xn, n, p, n], [xn, p, p, n], [xn, n, n, n], [xn, n, p, p]], // tet at corner n p n
            [[xn, n, n, p], [xn, p, n, p], [xn, n, p, p], [xn, n, n, n]], // tet at corner n n p
            [[xn, p, p, p], [xn, n, p, p], [xn, p, n, p], [xn, p, p, n]], // tet at corner p p p
            [[xn, n, n, n], [xn, p, p, n], [xn, n, p, p], [xn, p, n, p]], // tet at center
            // cube at x = p
            [[xp, p, n, n], [xp, n, n, n], [xp, p, p, n], [xp, p, n, p]], // tet at corner p n n
            [[xp, n, p, n], [xp, p, p, n], [xp, n, n, n], [xp, n, p, p]], // tet at corner n p n
            [[xp, n, n, p], [xp, p, n, p], [xp, n, p, p], [xp, n, n, n]], // tet at corner n n p
            [[xp, p, p, p], [xp, n, p, p], [xp, p, n, p], [xp, p, p, n]], // tet at corner p p p
            [[xp, n, n, n], [xp, p, p, n], [xp, n, p, p], [xp, p, n, p]], // tet at center
            // cube at y = n
            [[p, yn, n, n], [n, yn, n, n], [p, yn, p, n], [p, yn, n, p]], // tet at corner p n n
            [[n, yn, p, n], [p, yn, p, n], [n, yn, n, n], [n, yn, p, p]], // tet at corner n p n
            [[n, yn, n, p], [p, yn, n, p], [n, yn, p, p], [n, yn, n, n]], // tet at corner n n p
            [[p, yn, p, p], [n, yn, p, p], [p, yn, n, p], [p, yn, p, n]], // tet at corner p p p
            [[n, yn, n, n], [p, yn, p, n], [n, yn, p, p], [p, yn, n, p]], // tet at center
            // cube at y = p
            [[p, yp, n, n], [n, yp, n, n], [p, yp, p, n], [p, yp, n, p]], // tet at corner p n n
            [[n, yp, p, n], [p, yp, p, n], [n, yp, n, n], [n, yp, p, p]], // tet at corner n p n
            [[n, yp, n, p], [p, yp, n, p], [n, yp, p, p], [n, yp, n, n]], // tet at corner n n p
            [[p, yp, p, p], [n, yp, p, p], [p, yp, n, p], [p, yp, p, n]], // tet at corner p p p
            [[n, yp, n, n], [p, yp, p, n], [n, yp, p, p], [p, yp, n, p]], // tet at center
            // cube at z = n
            [[p, n, zn, n], [n, n, zn, n], [p, p, zn, n], [p, n, zn, p]], // tet at corner p n n
            [[n, p, zn, n], [p, p, zn, n], [n, n, zn, n], [n, p, zn, p]], // tet at corner n p n
            [[n, n, zn, p], [p, n, zn, p], [n, p, zn, p], [n, n, zn, n]], // tet at corner n n p
            [[p, p, zn, p], [n, p, zn, p], [p, n, zn, p], [p, p, zn, n]], // tet at corner p p p
            [[n, n, zn, n], [p, p, zn, n], [n, p, zn, p], [p, n, zn, p]], // tet at center
            // cube at z = p 
            [[p, n, zp, n], [n, n, zp, n], [p, p, zp, n], [p, n, zp, p]], // tet at corner p n n
            [[n, p, zp, n], [p, p, zp, n], [n, n, zp, n], [n, p, zp, p]], // tet at corner n p n
            [[n, n, zp, p], [p, n, zp, p], [n, p, zp, p], [n, n, zp, n]], // tet at corner n n p
            [[p, p, zp, p], [n, p, zp, p], [p, n, zp, p], [p, p, zp, n]], // tet at corner p p p
            [[n, n, zp, n], [p, p, zp, n], [n, p, zp, p], [p, n, zp, p]], // tet at center
            // cube at w = n
            [[p, n, n, wn], [n, n, n, wn], [p, p, n, wn], [p, n, p, wn]], // tet at corner p n n
            [[n, p, n, wn], [p, p, n, wn], [n, n, n, wn], [n, p, p, wn]], // tet at corner n p n
            [[n, n, p, wn], [p, n, p, wn], [n, p, p, wn], [n, n, n, wn]], // tet at corner n n p
            [[p, p, p, wn], [n, p, p, wn], [p, n, p, wn], [p, p, n, wn]], // tet at corner p p p
            [[n, n, n, wn], [p, p, n, wn], [n, p, p, wn], [p, n, p, wn]], // tet at center
            // cube at w = p
            [[p, n, n, wp], [n, n, n, wp], [p, p, n, wp], [p, n, p, wp]], // tet at corner p n n
            [[n, p, n, wp], [p, p, n, wp], [n, n, n, wp], [n, p, p, wp]], // tet at corner n p n
            [[n, n, p, wp], [p, n, p, wp], [n, p, p, wp], [n, n, n, wp]], // tet at corner n n p
            [[p, p, p, wp], [n, p, p, wp], [p, n, p, wp], [p, p, n, wp]], // tet at corner p p p
            [[n, n, n, wp], [p, p, n, wp], [n, p, p, wp], [p, n, p, wp]]  // tet at center
        ];

        // convert to index
        let tetrahedra_indices = [];
        for (let tet of tetrahedron_40_tiling_of_hypercube) {
            let tet_indices = [];
            for (let v of tet) {
                // find index in cube_vertices
                for (let i = 0; i < cube_vertices.length; i++) {
                    let cv = cube_vertices[i];
                    if (cv.x === v[0] && cv.y === v[1] && cv.z === v[2] && cv.w === v[3]) {
                        tet_indices.push(i);
                        break;
                    }
                }
            }
            if (tet_indices.length !== 4) {
                console.error("Error creating tetrahedra indices");
            }
            tetrahedra_indices.push(tet_indices);
        }
        return tetrahedra_indices;
    }
    let hypercube = new Hyperobject(
        // vertices in object frame
        const_hypercube_vertices,
        // edges:
        [
            [0,1],[1,2],[2,3],[3,0],
            [4,5],[5,6],[6,7],[7,4],
            [0,4],[1,5],[2,6],[3,7],
            [8,9],[9,10],[10,11],[11,8],
            [12,13],[13,14],[14,15],[15,12],
            [8,12],[9,13],[10,14],[11,15],
            [0,8],[1,9],[2,10],[3,11],
            [4,12],[5,13],[6,14],[7,15]
        ],
        // tetras
        create_40_tetrahedra_tiling_of_hypercube(const_hypercube_vertices),
        // color
        0xff0000,
        // simulate_physics
        true,
        // show_vertices
        true,
        // mass
        1.0,
        // pose (Transform4D)
        pose,
        // name
        "Hypercube"
    );
    return hypercube;
} // function createHypercube()