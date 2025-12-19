import { Transform4D, Vector4D } from '../hyperengine/transform4d.js';
import { Hyperobject, createHypercube, removeDuplicates } from '../hyperengine/hyperobject.js';

export function createPalmTree() {
    // build a tree based on a hypergrid surface
    const n_i = 9;
    const n_j = 5;
    const n_k = 2;
    let grid_vertices = [];
    let grid_vertices_texcoords = [];
    let grid_edges = [];
    let grid_tetras = [];
    // Trunk
    let vertex_index_offset = grid_vertices.length;
    let trunk_L = 10.0;
    let trunk_R = 1.0;
    let foliage_R = 5.0;
    for (let i = 0; i < n_i; i++) {
        for (let j = 0; j < n_j; j++) {
            for (let k = 0; k < n_k; k++) {
                // Spherical coordinates for the points
                // a is the circle on xy plane (9)
                // b is the concentric rings along z (5)
                // c is the concentric spheres along w (5)
                let sphere_Rs = [trunk_R, trunk_R];
                let sphere_R = sphere_Rs[k];
                let circle_Rs = [0.0, 0.707*sphere_R, sphere_R, 0.707*sphere_R, 0.0];
                let circle_R = circle_Rs[j];
                let x = [0.0,        0.707*circle_R, circle_R, 0.707*circle_R,      0.0, -0.707*circle_R, -circle_R, -0.707*circle_R,       0.0][i];
                let y = [-circle_R, -0.707*circle_R,      0.0, 0.707*circle_R, circle_R,  0.707*circle_R,       0.0, -0.707*circle_R, -circle_R][i];
                let w = [-sphere_R, -0.707*sphere_R,      0.0, 0.707*sphere_R, sphere_R][j];
                let z = [      0.0,         trunk_L][k];
                // let norm = Math.sqrt(x*x + y*y + z*z + w*w);
                // console.log(norm);

                grid_vertices.push(new Vector4D(x, y, z, w));

                // texture coordinates
                let H = trunk_L + foliage_R;
                let theta = i / (n_i - 1.0);
                let phi = j / (n_j - 1.0);
                let h = 5 * z / trunk_L;
                let v = 0.01 + theta * 0.49;
                grid_vertices_texcoords.push(new Vector4D(v, phi, h, 0.0));

                // add an edge to the next vertex in x
                if (i < n_i - 1) {
                    let next_index = grid_vertices.length + (n_j * n_k) - 1;
                    grid_edges.push([grid_vertices.length - 1, next_index]);
                }
                // add an edge to the next vertex in y
                if (j < n_j - 1) {
                    let next_index = grid_vertices.length + n_k - 1;
                    grid_edges.push([grid_vertices.length - 1, next_index]);
                }
                // add an edge to the next vertex in w
                if (k < n_k - 1) {
                    let next_index = grid_vertices.length;
                    grid_edges.push([grid_vertices.length - 1, next_index]);
                }
                // add an edge between next x and next y
                if (i < n_i - 1 && j < n_j - 1) {
                    let next_x_index = grid_vertices.length + (n_j * n_k) - 1;
                    let next_y_index = grid_vertices.length + n_k - 1;
                    grid_edges.push([next_x_index, next_y_index]);
                }
                // add an edge between next x and next w
                if (i < n_i - 1 && k < n_k - 1) {
                    let next_x_index = grid_vertices.length + (n_j * n_k) - 1;
                    let next_w_index = grid_vertices.length;
                    grid_edges.push([next_x_index, next_w_index]);
                }
                // add an edge between next y and next w
                if (j < n_j - 1 && k < n_k - 1) {
                    let next_y_index = grid_vertices.length + n_k - 1;
                    let next_w_index = grid_vertices.length;
                    grid_edges.push([next_y_index, next_w_index]);
                }
                // add 5 tetras between this grid point and the next in x,y,w
                if (i < n_i - 1 && j < n_j - 1 && k < n_k - 1) {
                    let nnn = vertex_index_offset + i * n_j * n_k + j * n_k + k;
                    let pnn = vertex_index_offset + (i + 1) * n_j * n_k + j * n_k + k;
                    let npn = vertex_index_offset + i * n_j * n_k + (j + 1) * n_k + k;
                    let ppn = vertex_index_offset + (i + 1) * n_j * n_k + (j + 1) * n_k + k;
                    let nnp = vertex_index_offset + i * n_j * n_k + j * n_k + (k + 1);
                    let pnp = vertex_index_offset + (i + 1) * n_j * n_k + j * n_k + (k + 1);
                    let npp = vertex_index_offset + i * n_j * n_k + (j + 1) * n_k + (k + 1);
                    let ppp = vertex_index_offset + (i + 1) * n_j * n_k + (j + 1) * n_k + (k + 1);
                    let cell_tetras = [
                        [pnn, nnn, ppn, pnp], // tet at corner p n n
                        [npn, ppn, nnn, npp], // tet at corner n p n
                        [nnp, pnp, npp, nnn], // tet at corner n n p
                        [ppp, npp, pnp, ppn], // tet at corner p p p
                        [nnn, ppn, npp, pnp]  // tet at center
                    ];
                    for (let tet of cell_tetras) { grid_tetras.push(tet); }
                }
            }
        }
    }
    // face directions (6)
    let Xp = new Vector4D(1.0, 0.0, 0.0, 0.0);
    let Xn = new Vector4D(-1.0, 0.0, 0.0, 0.0);
    let Yp = new Vector4D(0.0, 1.0, 0.0, 0.0);
    let Yn = new Vector4D(0.0, -1.0, 0.0, 0.0);
    let Wp = new Vector4D(0.0, 0.0, 0.0, 1.0);
    let Wn = new Vector4D(0.0, 0.0, 0.0, -1.0);
    // edge directions (12)
    let XpYp = Xp.add(Yp).normalize();
    let XpYn = Xp.add(Yn).normalize();
    let XnYp = Xn.add(Yp).normalize();
    let XnYn = Xn.add(Yn).normalize();
    let XpWp = Xp.add(Wp).normalize();
    let XpWn = Xp.add(Wn).normalize();
    let XnWp = Xn.add(Wp).normalize();
    let XnWn = Xn.add(Wn).normalize();
    let YpWp = Yp.add(Wp).normalize();
    let YpWn = Yp.add(Wn).normalize();
    let YnWp = Yn.add(Wp).normalize();
    let YnWn = Yn.add(Wn).normalize();
    // corner directions (8)
    let XpYpWp = Xp.add(Yp).add(Wp).normalize();
    let XpYpWn = Xp.add(Yp).add(Wn).normalize();
    let XpYnWp = Xp.add(Yn).add(Wp).normalize();
    let XpYnWn = Xp.add(Yn).add(Wn).normalize();
    let XnYpWp = Xn.add(Yp).add(Wp).normalize();
    let XnYpWn = Xn.add(Yp).add(Wn).normalize();
    let XnYnWp = Xn.add(Yn).add(Wp).normalize();
    let XnYnWn = Xn.add(Yn).add(Wn).normalize();
    // Make leaves
    let leaf_dirs = [ // leaf_dir, leaf_A_dir, leaf_B_dir
        [Xp, Yp, Wp],
        // [Xn, Yn, Wn],
        [Yp, Wp, Xp],
        [Yn, Wn, Xn],
        // [Wp, Xp, Yp],
        [Wn, Xn, Yn],
        // -- edges --
        [XpYp, Wp, XpYn],
        [XnYn, Wn, XnYp],
        [XpYn, Wn, XpYp],
        // [XnYp, Wp, XnYn],
        [XpWp, Yp, XpWn],
        [XnWn, Yn, XnWp],
        // [XpWn, Yn, XpWp],
        [XnWp, Yp, XnWn],
        [YpWp, Xp, YpWn],
        // [YnWn, Xn, YnWp],
        [YpWn, Xn, YpWp],
        [YnWp, Xp, YnWn],
        // -- corners --
        [XpYpWp, XpYnWp, XpYpWn],
        // [XpYpWn, XpYnWn, XpYnWp],
        [XpYnWp, XpYpWn, XpYnWn],
        // [XpYnWn, XpYpWp, XpYpWn],
        [XnYpWp, XnYnWp, XnYpWn],
        // [XnYpWn, XnYnWn, XnYnWp],
        [XnYnWp, XnYpWn, XnYnWn],
        [XnYnWn, XnYpWp, XnYpWn],

    ];
    const leaf_L = 8.0;
    const leaf_thickness = 2.0;
    const leaf_R = 4.0; // falling radius
    // for each leaf
    for (let i = 0; i < leaf_dirs.length; i++) {
        // stem
        let leaf_dir = leaf_dirs[i][0];
        let leaf_A_dir = leaf_dirs[i][1];
        let leaf_B_dir = leaf_dirs[i][2];
        let trunk_top = new Vector4D(0.0, 0.0, trunk_L, 0.0);
        let stem = trunk_top.add(leaf_dir.multiply_by_scalar(trunk_R * 0.0));
        let tip = trunk_top.add(leaf_dir.multiply_by_scalar(trunk_R + leaf_L));
        tip.z = trunk_L - leaf_R;
        let mid = trunk_top.add(leaf_dir.multiply_by_scalar(trunk_R + leaf_L / 2.0));
        mid.z = trunk_L - leaf_R * (1 - 0.707);
        let mid_A = mid.add(leaf_A_dir.multiply_by_scalar(leaf_thickness));
        let mid_B = mid.add(leaf_B_dir.multiply_by_scalar(leaf_thickness));
        let mid_C = mid.add(leaf_B_dir.multiply_by_scalar(-leaf_thickness));
        // create two tetras, [stem, A, B, C] and [tip, A, B, C]
        let vertex_index_offset = grid_vertices.length;
        grid_vertices.push(stem);
        grid_vertices.push(mid_A);
        grid_vertices.push(mid_B);
        grid_vertices.push(mid_C);
        grid_vertices.push(tip);
        grid_vertices_texcoords.push(new Vector4D(0.75, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.75, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.75, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.75, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.75, 0.0, 0.0, 0.0));
        grid_tetras.push([vertex_index_offset + 0, vertex_index_offset + 1, vertex_index_offset + 2, vertex_index_offset + 3]);
        grid_tetras.push([vertex_index_offset + 4, vertex_index_offset + 1, vertex_index_offset + 2, vertex_index_offset + 3]);
    }
    // remove duplicates
    [grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras] = removeDuplicates(grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras, 0.001);
    // create the class
    let hypertree = new Hyperobject(
        // vertices in object frame
        grid_vertices,
        // edges
        grid_edges,
        // tetras
        grid_tetras,
        // color
        0x008800,
        // simulate_physics
        false,
        // show_vertices
        false,
        // mass
        1.0,
        // pose (Transform4D)
        new Transform4D([
            [1, 0, 0, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ]),
        // name
        "Hypertree"
    );
    // Custom tree texture
    hypertree.vertices_in_texmap = grid_vertices_texcoords;
    // Fill texture info, texcoords
    if (true) {
        let obj = hypertree;
        let trunkColorLight = 0x333300;
        let trunkColorDark = 0x111100;
        let leafColorLight = 0x009900;
        let leafColorDark = 0x007700;
        let USIZE = 4;
        let VSIZE = 2;
        let WSIZE = 8;
        let object_texture = new Uint32Array(USIZE * VSIZE * WSIZE); // RGBA
        for (let u = 0; u < USIZE; u++) {
            for (let v = 0; v < VSIZE; v++) {
                for (let w = 0; w < WSIZE; w++) {
                    // important to use the same indexing as in the shader!
                    let index = (u + (v * USIZE) + (w * USIZE * VSIZE));
                    // checkerboard pattern
                    let color = 0xffffff;
                    let isCheck = (u % 2 ===0) || (v % 2 === 0) || (w === 0);
                    if (u >= USIZE / 2) { // leaves
                        if (isCheck) { color = leafColorDark; }
                        else { color = leafColorLight; }
                    } else { // trunk
                        if (isCheck) { color = trunkColorDark; }
                        else { color = trunkColorLight; }
                    }
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
        obj.texture = object_texture; // store in object for now
        obj.texture_info = { USIZE: USIZE, VSIZE: VSIZE, WSIZE: WSIZE };
        // 
    }
    return hypertree;
}