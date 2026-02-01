import { Transform4D, Vector4D } from '../../4d_creatures/hyperengine/transform4d.js';
import { Hyperobject, createHypercube, removeDuplicates } from '../../4d_creatures/hyperengine/hyperobject.js';
import { runHyperengine } from '../../4d_creatures/hyperengine/hyperengine.js';

// Shades
// Umbra
// Anima
// Damnati

export function createDamned() {
    // build a hypersphere surface (mesh)
    let grid_vertices = [];
    let grid_edges = [];
    let grid_tetras = [];
    let grid_vertices_texcoords = [];
    let bones = [];
    // Torso
    const n_i = 9;
    const n_j = 5;
    const n_k = 3;
    const R = 1.0;
    const tbz = 1.0;
    const thz = 1.0;
    const ttx = 0.3;
    const twy = 0.6;
    let vertex_index_offset = grid_vertices.length;
    for (let i = 0; i < n_i; i++) {
        for (let j = 0; j < n_j; j++) {
            for (let k = 0; k < n_k; k++) {
                // Spherical coordinates for the points
                // a is the circle on xy plane (9)
                // b is the concentric rings along z (5)
                // c is the concentric spheres along w (5)
                let sphere_Rs = [twy * 0.9, twy, twy * 0.9];
                let sphere_R = sphere_Rs[k];
                let circle_Rs = [0.0, 0.707*sphere_R, sphere_R, 0.707*sphere_R, 0.0];
                let circle_R = circle_Rs[j];
                let x = [0.0,        0.707*circle_R, circle_R, 0.707*circle_R,      0.0, -0.707*circle_R, -circle_R, -0.707*circle_R,       0.0][i] * ttx;
                let y = [-circle_R, -0.707*circle_R,      0.0, 0.707*circle_R, circle_R,  0.707*circle_R,       0.0, -0.707*circle_R, -circle_R][i];
                let w = [-R,               -0.707*R,      0.0,        0.707*R,        R][j];
                let z = [tbz,      tbz + thz * 0.7, tbz + thz][k];
                grid_vertices.push(new Vector4D(x, y, z, w));

                // texture coordinates
                let theta = i / (n_i - 1.0);
                let phi = j / (n_j - 1.0);
                grid_vertices_texcoords.push(new Vector4D(0.75, theta, phi, 0.0));

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

    // Head
    if (true) {
        const n_i = 9;
        const n_j = 5;
        const n_k = 5;
        const R = 1.0;
        const tbz = 2.0;
        const thz = 0.5;
        const ttx = 0.6;
        const twy = 0.6;
        let vertex_index_offset = grid_vertices.length;
        for (let i = 0; i < n_i; i++) {
            for (let j = 0; j < n_j; j++) {
                for (let k = 0; k < n_k; k++) {
                    // Spherical coordinates for the points
                    // a is the circle on xy plane (9)
                    // b is the concentric rings along z (5)
                    // c is the concentric spheres along w (5)
                    let sphere_R = [0.0, 0.707*thz, thz, 0.707*thz, 0.0][k];
                    let circle_R = [0.0, 0.707*sphere_R, sphere_R, 0.707*sphere_R, 0.0][j];
                    let x = [0.0,        0.707*circle_R, circle_R, 0.707*circle_R,      0.0, -0.707*circle_R, -circle_R, -0.707*circle_R,       0.0][i] * ttx;
                    let y = [-circle_R, -0.707*circle_R,      0.0, 0.707*circle_R, circle_R,  0.707*circle_R,       0.0, -0.707*circle_R, -circle_R][i] * twy;
                    let w = [-R,               -0.707*R,      0.0,        0.707*R,        R][j];
                    let z = [-sphere_R, -0.707*sphere_R,      0.0, 0.707*sphere_R, sphere_R][k] + sphere_R + tbz;
                    grid_vertices.push(new Vector4D(x, y, z, w));

                    // texture coordinates
                    let theta = i / (n_i - 1.0);
                    let phi = j / (n_j - 1.0);
                    grid_vertices_texcoords.push(new Vector4D(0.75, theta, phi, 0.0));

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
    }

    // Leg
    for (let li = 0; li < 2; li++) {
        const n_i = 9;
        const n_j = 5;
        const n_k = 2;
        const R = 1.0;
        const tbz = 0.0;
        const thz = 1.0;
        const twy = 0.18;
        const cy = [-0.2, 0.2][li];
        let vertex_index_offset = grid_vertices.length;
        for (let i = 0; i < n_i; i++) {
            for (let j = 0; j < n_j; j++) {
                for (let k = 0; k < n_k; k++) {
                    // Spherical coordinates for the points
                    // a is the circle on xy plane (9)
                    // b is the concentric rings along z (5)
                    // c is the concentric spheres along w (5)
                    let sphere_R = [twy, twy][k];
                    let circle_R = [0.0, 0.707*sphere_R, sphere_R, 0.707*sphere_R, 0.0][j];
                    let x = [0.0,        0.707*circle_R, circle_R, 0.707*circle_R,      0.0, -0.707*circle_R, -circle_R, -0.707*circle_R,       0.0][i];
                    let y = [-circle_R, -0.707*circle_R,      0.0, 0.707*circle_R, circle_R,  0.707*circle_R,       0.0, -0.707*circle_R, -circle_R][i] + cy;
                    let w = [-R,               -0.707*R,      0.0,        0.707*R,        R][j];
                    let z = [tbz, tbz + thz][k];
                    grid_vertices.push(new Vector4D(x, y, z, w));

                    // texture coordinates
                    let theta = i / (n_i - 1.0);
                    let phi = j / (n_j - 1.0);
                    grid_vertices_texcoords.push(new Vector4D(0.75, theta, phi, 0.0));

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
    }
    
    // remove duplicates
    // [grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras] = removeDuplicates(grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras, 0.001);
    // create the class
    let damned = new Hyperobject(
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
        "Hypercrab"
    );
    // Custom tree texture
    damned.vertices_in_texmap = grid_vertices_texcoords;
    // Fill texture info, texcoords
    if (true) {
        let obj = damned;
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
    // Animator
    damned.bones = bones;
    function animationFrame(obj, t) {
        for (let i = 0; i < obj.bones.length; i++) {
            let bone = obj.bones[i];
            let bone_vertex_idx_and_affinity = bone;
            for (let j = 0; j < bone_vertex_idx_and_affinity.length; j++) {
                let vertex_index = bone_vertex_idx_and_affinity[j][0];
                let affinity = bone_vertex_idx_and_affinity[j][1];
                let original_vertex = bone_vertex_idx_and_affinity[j][2];
                let phase = (i % 2 === 0) * Math.PI;
                let woffset = affinity * Math.sin(Math.PI * 2.0 * t / 10.0 + phase);
                let bone_xyzw_offset = new Vector4D(0, 0, 0, woffset);
                let animated_vertex = bone_xyzw_offset.add(original_vertex);
                obj.vertices_in_object[vertex_index] = animated_vertex;
            }
        }
        // Update pose
        if (false) {
            const islandR = 20.0;
            obj.pose.translate_self_by_delta(0, 0, 0, 0.01, true);
            // Start sinking if crab is in the water
            const crabPos = obj.pose.origin();
            const waterlineDist = Math.max(0.0, Math.sqrt(crabPos.x * crabPos.x + crabPos.y * crabPos.y + crabPos.w * crabPos.w) - islandR);
            const z = 2.0 - waterlineDist;
            obj.pose.matrix[2][4] = z;
            // Respawn somewhere else if too deep
            if (z < -2.0) {
                const randDir = new Vector4D(Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0, 0.0, Math.random() * 2.0 - 1.0).normalize();
                var randPos = randDir.multiply_by_scalar(islandR + 3.9);
                obj.pose.matrix[0][4] = randPos.x;
                obj.pose.matrix[1][4] = randPos.y;
                obj.pose.matrix[3][4] = randPos.w;
                // set rotation so that crab w axis faces the island center
                const newCrabW = randDir.multiply_by_scalar(-1.0);
                const newCrabZ = new Vector4D(0.0, 0.0, 1.0, 0.0);
                // pick a random vector and make it orthogonal to newCrabW and Z
                while (true) {
                    const randVec = new Vector4D(Math.random(), Math.random(), 0.0, Math.random()).normalize();
                    if (newCrabW.dot(randVec) > 0.9) { continue; }
                    const newCrabX = randVec.subtract(newCrabW.multiply_by_scalar(newCrabW.dot(randVec))).normalize();
                    // Y is perpendicular to X and Z (cross product in xy_w axes)
                    const newCrabY = new Vector4D(
                        newCrabX.y * newCrabW.w - newCrabX.w * newCrabW.y,
                        newCrabX.w * newCrabW.x - newCrabX.x * newCrabW.w,
                        0.0,
                        newCrabX.x * newCrabW.y - newCrabX.y * newCrabW.x,
                    );
                    obj.pose.matrix[0][0] = newCrabX.x;
                    obj.pose.matrix[1][0] = newCrabX.y;
                    obj.pose.matrix[2][0] = newCrabX.z;
                    obj.pose.matrix[3][0] = newCrabX.w;
                    obj.pose.matrix[0][1] = newCrabY.x;
                    obj.pose.matrix[1][1] = newCrabY.y;
                    obj.pose.matrix[2][1] = newCrabY.z;
                    obj.pose.matrix[3][1] = newCrabY.w;
                    obj.pose.matrix[0][2] = newCrabZ.x;
                    obj.pose.matrix[1][2] = newCrabZ.y;
                    obj.pose.matrix[2][2] = newCrabZ.z;
                    obj.pose.matrix[3][2] = newCrabZ.w;
                    obj.pose.matrix[0][3] = newCrabW.x;
                    obj.pose.matrix[1][3] = newCrabW.y;
                    obj.pose.matrix[2][3] = newCrabW.z;
                    obj.pose.matrix[3][3] = newCrabW.w;
                    break;
                }
            }
        }
                // Debug: print the crab pose to a div on the window
                // create div if it doesn't exist
            if (false) {
                if (!document.getElementById("crab_pose")) {
                    const div = document.createElement("div");
                    div.id = "crab_pose";
                    document.body.appendChild(div);
                    div.style.position = "absolute";
                    div.style.top = "10px";
                    div.style.right = "10px";
                    div.style.color = "rgb(156, 156, 156)";
                    div.style.fontFamily = "monospace";
                    div.style.fontSize = "12px";
                    console.log("created div");
                }
                // update div
                document.getElementById("crab_pose").innerHTML = `Crab:<br>`;
                document.getElementById("crab_pose").innerHTML += `[${obj.pose.matrix[0][0].toFixed(2)}, ${obj.pose.matrix[0][1].toFixed(2)}, ${obj.pose.matrix[0][2].toFixed(2)}, ${obj.pose.matrix[0][3].toFixed(2)}, ${obj.pose.matrix[0][4].toFixed(2)}]<br>`;
                document.getElementById("crab_pose").innerHTML += `[${obj.pose.matrix[1][0].toFixed(2)}, ${obj.pose.matrix[1][1].toFixed(2)}, ${obj.pose.matrix[1][2].toFixed(2)}, ${obj.pose.matrix[1][3].toFixed(2)}, ${obj.pose.matrix[1][4].toFixed(2)}]<br>`;
                document.getElementById("crab_pose").innerHTML += `[${obj.pose.matrix[2][0].toFixed(2)}, ${obj.pose.matrix[2][1].toFixed(2)}, ${obj.pose.matrix[2][2].toFixed(2)}, ${obj.pose.matrix[2][3].toFixed(2)}, ${obj.pose.matrix[2][4].toFixed(2)}]<br>`;
                document.getElementById("crab_pose").innerHTML += `[${obj.pose.matrix[3][0].toFixed(2)}, ${obj.pose.matrix[3][1].toFixed(2)}, ${obj.pose.matrix[3][2].toFixed(2)}, ${obj.pose.matrix[3][3].toFixed(2)}, ${obj.pose.matrix[3][4].toFixed(2)}]<br>`;
            }

    }
    damned.animateFunction = animationFrame;
    damned.is_animated = true;
    return damned;
} // end function createDamned()
