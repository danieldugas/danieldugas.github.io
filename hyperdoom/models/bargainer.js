import { Transform4D, Vector4D } from '../../4d_creatures/hyperengine/transform4d.js';
import { Hyperobject, createHypercube, removeDuplicates } from '../../4d_creatures/hyperengine/hyperobject.js';

export function createBargainer() {
    // constants
    const R = 0.5;
    const shellThickness = 1.0;

    // build a hypersphere surface (mesh)
    let grid_vertices = [];
    let grid_edges = [];
    let grid_tetras = [];
    let grid_vertices_texcoords = [];
    let vertex_index_offset = 0;

    // Body (Pyramid)
    // vertices in object frame
    let body_vertices = [
        new Vector4D(0, 0, 1, 0),
        new Vector4D(0, 1, -1, 1),
        new Vector4D(0, -1, -1, -1),
        new Vector4D(-2, 1, -1, -1),
        new Vector4D(-2, -1, -1, 1)
    ];
    const body_scale = 1.0;
    const body_height = 0.4;
    const body_x = 0;
    for (let i = 0; i < body_vertices.length; i++) {
        body_vertices[i].x *= body_scale;
        body_vertices[i].y *= body_scale;
        body_vertices[i].z *= body_scale;
        body_vertices[i].w *= body_scale;
        body_vertices[i].x += body_x;
        body_vertices[i].z += body_height;
    }
    // tetras
    let body_tetras = [
        [0,1,2,3],
        [0,1,2,4],
        [0,1,3,4],
        [0,2,3,4],
        [1,2,3,4]
    ];

    // Update
    for (let i = 0; i < body_vertices.length; i++) {
        grid_vertices.push(body_vertices[i]);
        grid_vertices_texcoords.push(body_vertices[i]);
    }
    for (let i = 0; i < body_tetras.length; i++) {
        grid_tetras.push(body_tetras[i].map(x => x + vertex_index_offset));
    }

    // Head (inverse pyramid)
    vertex_index_offset = grid_vertices.length;

    let head_vertices = [
        new Vector4D(-1, 0, -1, 0),
        new Vector4D(1, 1, 1, 1),
        new Vector4D(1, -1, 1, -1),
        new Vector4D(-1, 1, 1, -1),
        new Vector4D(-1, -1, 1, 1)
    ]
    // scale down head and move it up
    const head_scale = 0.5;
    const head_height = 0.5;
    const head_x = -0.5;
    for (let i = 0; i < head_vertices.length; i++) {
        head_vertices[i].x *= head_scale;
        head_vertices[i].y *= head_scale;
        head_vertices[i].z *= head_scale;
        head_vertices[i].w *= head_scale;
        head_vertices[i].x += head_x;
        head_vertices[i].z += head_height;
    }

    let head_tetras = [
        [0,1,2,3],
        [0,1,2,4],
        [0,1,3,4],
        [0,2,3,4],
        [1,2,3,4]
    ];
    
    // Update
    for (let i = 0; i < head_vertices.length; i++) {
        grid_vertices.push(head_vertices[i]);
        grid_vertices_texcoords.push(head_vertices[i]);
    }
    for (let i = 0; i < head_tetras.length; i++) {
        grid_tetras.push(head_tetras[i].map(x => x + vertex_index_offset));
    }


    // Make an eye
    for (let i = 0; i < 2; i++) {
        vertex_index_offset = grid_vertices.length;
        let eyeR = 0.3;
        let eyeCenter = new Vector4D(R, 0.6*R, R*shellThickness, R);
        if (i === 1) { eyeCenter.y = -eyeCenter.y; }
        let eyeA = eyeCenter.add(new Vector4D(0, 0, eyeR, 0));
        let eyeB = eyeCenter.add(new Vector4D(eyeR, eyeR, -eyeR, eyeR));
        let eyeC = eyeCenter.add(new Vector4D(eyeR, -eyeR, -eyeR, -eyeR));
        let eyeD = eyeCenter.add(new Vector4D(-eyeR, eyeR, -eyeR, -eyeR));
        let eyeE = eyeCenter.add(new Vector4D(-eyeR, -eyeR, -eyeR, eyeR));
        grid_vertices.push(eyeA);
        grid_vertices.push(eyeB);
        grid_vertices.push(eyeC);
        grid_vertices.push(eyeD);
        grid_vertices.push(eyeE);
        grid_vertices_texcoords.push(new Vector4D(0.25, 0.75, 0, 0));
        grid_vertices_texcoords.push(new Vector4D(0.25, 0.25, 0, 0));
        grid_vertices_texcoords.push(new Vector4D(0.25, 0.25, 0, 0));
        grid_vertices_texcoords.push(new Vector4D(0.25, 0.25, 0, 0));
        grid_vertices_texcoords.push(new Vector4D(0.25, 0.25, 0, 0));
        grid_tetras.push([vertex_index_offset + 0, vertex_index_offset + 1, vertex_index_offset + 2, vertex_index_offset + 3]);
        grid_tetras.push([vertex_index_offset + 0, vertex_index_offset + 1, vertex_index_offset + 2, vertex_index_offset + 4]);
        grid_tetras.push([vertex_index_offset + 0, vertex_index_offset + 1, vertex_index_offset + 3, vertex_index_offset + 4]);
        grid_tetras.push([vertex_index_offset + 0, vertex_index_offset + 2, vertex_index_offset + 3, vertex_index_offset + 4]);
        grid_tetras.push([vertex_index_offset + 1, vertex_index_offset + 2, vertex_index_offset + 3, vertex_index_offset + 4]);
    }
    // Legs
       // face directions (6)
    let Xp = new Vector4D(1.0, 0.0, 0.0, 0.0);
    let Xn = new Vector4D(-1.0, 0.0, 0.0, 0.0);
    let Yp = new Vector4D(0.0, 1.0, 0.0, 0.0);
    let Yn = new Vector4D(0.0, -1.0, 0.0, 0.0);
    let Zp = new Vector4D(0.0, 0.0, 1.0, 0.0);
    let Zn = new Vector4D(0.0, 0.0, -1.0, 0.0);
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
    let XnYnZn = Xn.add(Yn).add(Zn.multiply_by_scalar(0.2)).normalize();
    let XnYpZn = Xn.add(Yp).add(Zn.multiply_by_scalar(0.2)).normalize();
    // Make leaves
    let legDirs = [ // leaf_dir, leaf_A_dir, leaf_B_dir
        [XnYn, Zp, Wp, Xp],
        [XnYp, Zp, Wn, Xn],
        [XnYnZn, Zp, Wp, Xp],
        [XnYpZn, Zp, Wn, Xn],
    ];
    let legL = 2.0;
    let legT = 0.3;
    let bones = [];
    for (let i = 0; i < legDirs.length; i++) {
        let bone_vertex_idx_and_affinity = [];
        let dir = legDirs[i][0];
        let dirA = legDirs[i][1];
        let dirB = legDirs[i][2];
        let stem = dir.multiply_by_scalar(0.5);
        stem.z += 0.6;
        let leg_mid = stem.add(dir.multiply_by_scalar(1.2));
        leg_mid.z -= 0.6;
        leg_mid.y *= 0.6;
        let leg_A = leg_mid.add(dirA.multiply_by_scalar(legT));
        let leg_B = leg_mid.add(dirB.multiply_by_scalar(legT));
        let leg_C = leg_mid.add(dirB.multiply_by_scalar(-legT));
        let tip = stem.add(dir.multiply_by_scalar(legL));
        tip.z -= 0.7;
        tip.y *= 0.1;
        // create two tetras, [stem, A, B, C] and [tip, A, B, C]
        let vertex_index_offset = grid_vertices.length;
        grid_vertices.push(stem);
        grid_vertices.push(leg_A);
        grid_vertices.push(leg_B);
        grid_vertices.push(leg_C);
        grid_vertices.push(tip);
        grid_vertices_texcoords.push(new Vector4D(0.75, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.75, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.75, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.75, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.75, 0.0, 0.0, 0.0));
        grid_tetras.push([vertex_index_offset + 0, vertex_index_offset + 1, vertex_index_offset + 2, vertex_index_offset + 3]);
        grid_tetras.push([vertex_index_offset + 4, vertex_index_offset + 1, vertex_index_offset + 2, vertex_index_offset + 3]);
        bone_vertex_idx_and_affinity.push([vertex_index_offset + 0, 0.0, stem]);
        bone_vertex_idx_and_affinity.push([vertex_index_offset + 1, 0.5, leg_A]);
        bone_vertex_idx_and_affinity.push([vertex_index_offset + 2, 0.5, leg_B]);
        bone_vertex_idx_and_affinity.push([vertex_index_offset + 3, 0.5, leg_C]);
        bone_vertex_idx_and_affinity.push([vertex_index_offset + 4, 1.0, tip]);
        bones.push(bone_vertex_idx_and_affinity);
    }
    
    // remove duplicates
    [grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras] = removeDuplicates(grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras, 0.001);
    // create the class
    let bargainer = new Hyperobject(
        // vertices in object frame
        grid_vertices,
        // edges
        grid_edges,
        // tetras
        grid_tetras,
        // color
        0x000088,
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
        "Bargainer"
    );
    // Custom tree texture
    bargainer.vertices_in_texmap = grid_vertices_texcoords;
    // Fill texture info, texcoords
    if (true) {
        let obj = bargainer;
        let eyeColorLight = 0xffffff;
        let eyeColorDark = 0x000000;
        let shellColorLight = 0xbb0000;
        let shellColorDark = 0x770000;
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
                    let isDark = v === 0;
                    if (u >= USIZE / 2) { // leaves
                        if (isDark) { color = shellColorDark; }
                        else { color = shellColorLight; }
                    } else { // eye
                        if (isDark) { color = eyeColorDark; }
                        else { color = eyeColorLight; }
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
    }
    return bargainer;
} // end function createHypercrab()
