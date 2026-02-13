import { Transform4D, Vector4D } from '../../4d_creatures/hyperengine/transform4d.js';
import { Hyperobject, createHypercube, removeDuplicates } from '../../4d_creatures/hyperengine/hyperobject.js';
import { runHyperengine } from '../../4d_creatures/hyperengine/hyperengine.js';

// Carcinoma
// Ulcers
// Tenaculus

export function createCrawler() {
    // build a hypersphere surface (mesh)
    const n_i = 9;
    const n_j = 5;
    const n_k = 5;
    let grid_vertices = [];
    let grid_edges = [];
    let grid_tetras = [];
    let grid_vertices_texcoords = [];
    // Shell
    const R = 1.0;
    const shellThickness = 0.2;
    let vertex_index_offset = grid_vertices.length;
    for (let i = 0; i < n_i; i++) {
        for (let j = 0; j < n_j; j++) {
            for (let k = 0; k < n_k; k++) {
                // Spherical coordinates for the points
                // a is the circle on xy plane (9)
                // b is the concentric rings along z (5)
                // c is the concentric spheres along w (5)
                let sphere_Rs = [0.0, 0.707*R, R, 0.707*R, 0.0];
                let sphere_R = sphere_Rs[k];
                let circle_Rs = [0.0, 0.707*sphere_R, sphere_R, 0.707*sphere_R, 0.0];
                let circle_R = circle_Rs[j];
                let x = [0.0,        0.707*circle_R, circle_R, 0.707*circle_R,      0.0, -0.707*circle_R, -circle_R, -0.707*circle_R,       0.0][i];
                let y = [-circle_R, -0.707*circle_R,      0.0, 0.707*circle_R, circle_R,  0.707*circle_R,       0.0, -0.707*circle_R, -circle_R][i];
                let z = [-sphere_R, -0.707*sphere_R,      0.0, 0.707*sphere_R, sphere_R][j] * shellThickness;
                let w = [-R,               -0.707*R,      0.0,        0.707*R,        R][k];
                grid_vertices.push(new Vector4D(x, y, z, w));

                // texture coordinates
                let theta = i / (n_i - 1.0);
                let phi = j / (n_j - 1.0);
                grid_vertices_texcoords.push(new Vector4D(0.375, theta, phi, 0.0));

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
    // Make an eye
    for (let i = 0; i < 6; i++) {
        vertex_index_offset = grid_vertices.length;
        let eyeR = 0.3;
        let eyeCenter = new Vector4D(R, 0.6*R, R*shellThickness, R);
        if (i === 1) { eyeCenter.y = -eyeCenter.y; }
        if (i === 2) { eyeCenter.z = -eyeCenter.z; }
        if (i === 3) { eyeCenter.x = -eyeCenter.x; }
        if (i === 4) { eyeCenter.w = -eyeCenter.w; }
        if (i === 5) { eyeCenter.x = -eyeCenter.x; eyeCenter.y = -eyeCenter.y; eyeCenter.z = -eyeCenter.z; eyeCenter.w = -eyeCenter.w; }
        
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
        grid_vertices_texcoords.push(new Vector4D(0.125, 0.75, 0, 0));
        grid_vertices_texcoords.push(new Vector4D(0.125, 0.25, 0, 0));
        grid_vertices_texcoords.push(new Vector4D(0.125, 0.25, 0, 0));
        grid_vertices_texcoords.push(new Vector4D(0.125, 0.25, 0, 0));
        grid_vertices_texcoords.push(new Vector4D(0.125, 0.25, 0, 0));
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
    // Make leaves
    let legDirs = [ // leaf_dir, leaf_A_dir, leaf_B_dir
        // [Xp, Zp, Yp, Wp],
        // [Xn, Zp, Yn, Wn],
        // [Yp, Zp, Wp, Xp],
        // [Yn, Zp, Wn, Xn],
        // [Wp, Zp, Xp, Yp],
        // [Wn, Zp, Xn, Yn],
        // -- edges --
        // [XpYp, Zp, Wp, XpYn],
        // [XnYn, Zp, Wn, XnYp],
        // [XpYn, Zp, Wn, XpYp],
        // [XnYp, Zp, Wp, XnYn],
        // [XpWp, Zp, Yp, XpWn],
        // [XnWn, Zp, Yn, XnWp],
        // [XpWn, Zp, Yn, XpWp],
        // [XnWp, Zp, Yp, XnWn],
        [YpWp, Zp, Xp, YpWn],
        [YnWn, Zp, Xn, YnWp],
        [YpWn, Zp, Xn, YpWp],
        [YnWp, Zp, Xp, YnWn],
        // // -- corners --
        [XpYpWp, Zp, XpYnWp, XpYpWn],
        [XpYpWn, Zp, XpYnWn, XpYnWp],
        [XpYnWp, Zp, XpYpWn, XpYnWn],
        [XpYnWn, Zp, XpYpWp, XpYpWn],
        [XnYpWp, Zp, XnYnWp, XnYpWn],
        [XnYpWn, Zp, XnYnWn, XnYnWp],
        [XnYnWp, Zp, XnYpWn, XnYnWn],
        [XnYnWn, Zp, XnYpWp, XnYpWn],

    ];
    let legL = 2.0;
    let legT = 0.4;
    let bones = [];
    for (let i = 0; i < legDirs.length; i++) {
        let bone_vertex_idx_and_affinity = [];
        let dir = legDirs[i][0];
        let dirA = legDirs[i][1];
        let dirB = legDirs[i][2];
        let stem = dir.multiply_by_scalar(legL/4.0);
        let leg_mid = stem.add(dir.multiply_by_scalar(legL/2.0));
        let leg_A = leg_mid.add(dirA.multiply_by_scalar(legT));
        let leg_B = leg_mid.add(dirB.multiply_by_scalar(legT));
        let leg_C = leg_mid.add(dirB.multiply_by_scalar(-legT));
        let tip = stem.add(dir.multiply_by_scalar(legL));
        leg_mid.z += 0.5;
        tip.z -= 1.0;
        // create two tetras, [stem, A, B, C] and [tip, A, B, C]
        let vertex_index_offset = grid_vertices.length;
        grid_vertices.push(stem);
        grid_vertices.push(leg_A);
        grid_vertices.push(leg_B);
        grid_vertices.push(leg_C);
        grid_vertices.push(tip);
        grid_vertices_texcoords.push(new Vector4D(0.375, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.375, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.375, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.375, 0.0, 0.0, 0.0));
        grid_vertices_texcoords.push(new Vector4D(0.375, 0.0, 0.0, 0.0));
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
    // [grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras] = removeDuplicates(grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras, 0.001);
    // create the class
    let hypercrab = new Hyperobject(
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
    hypercrab.vertices_in_texmap = grid_vertices_texcoords;
    // Fill texture info, texcoords
    if (true) {
        let obj = hypercrab;
        let eyeColorLight = 0xffffff;
        let eyeColorDark = 0x000000;
        let shellColorLight = 0xbb0000;
        let shellColorDark = 0x770000;
        let hitColorLight = 0xffffff;
        let hitColorDark = 0xcccccc;
        let USIZE = 8; // doubled: first half normal, second half hit flash
        let VSIZE = 2;
        let WSIZE = 8;
        let object_texture = new Uint32Array(USIZE * VSIZE * WSIZE); // RGBA
        for (let u = 0; u < USIZE; u++) {
            for (let v = 0; v < VSIZE; v++) {
                for (let w = 0; w < WSIZE; w++) {
                    // important to use the same indexing as in the shader!
                    let index = (u + (v * USIZE) + (w * USIZE * VSIZE));
                    let color = 0xffffff;
                    let isDark = v === 0;
                    let isHitHalf = u >= 4; // second half of U dimension = hit flash
                    let uNorm = u % 4; // map back to original 0-3 range
                    if (isHitHalf) {
                        color = isDark ? hitColorDark : hitColorLight;
                    } else if (uNorm >= 2) { // shell
                        color = isDark ? shellColorDark : shellColorLight;
                    } else { // eye
                        color = isDark ? eyeColorDark : eyeColorLight;
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
    hypercrab.bones = bones;
    function animationFrame(obj, t) {
        // Trigger new leg falls when targetLegsLost increases
        let currentLost = 0;
        for (let i = 0; i < obj.animState.legStates.length; i++) {
            if (obj.animState.legStates[i] !== 'attached') currentLost++;
        }
        while (currentLost < obj.animState.targetLegsLost && currentLost < obj.bones.length) {
            let attachedLegs = [];
            for (let i = 0; i < obj.animState.legStates.length; i++) {
                if (obj.animState.legStates[i] === 'attached') attachedLegs.push(i);
            }
            if (attachedLegs.length === 0) break;
            let pickIdx = attachedLegs[Math.floor(Math.random() * attachedLegs.length)];
            obj.animState.legStates[pickIdx] = 'falling';
            obj.animState.legFallStartTimes[pickIdx] = t;
            currentLost++;
        }

        for (let i = 0; i < obj.bones.length; i++) {
            let bone = obj.bones[i];
            let bone_vertex_idx_and_affinity = bone;

            if (obj.animState.legStates[i] === 'gone') {
                for (let j = 0; j < bone_vertex_idx_and_affinity.length; j++) {
                    let vertex_index = bone_vertex_idx_and_affinity[j][0];
                    obj.vertices_in_object[vertex_index] = new Vector4D(0, 0, -10000, 0);
                }
                continue;
            }

            if (obj.animState.legStates[i] === 'falling') {
                let fallTime = t - obj.animState.legFallStartTimes[i];
                const fallGravity = 5.0;
                const fallDisappearTime = 2.0;

                if (fallTime > fallDisappearTime) {
                    obj.animState.legStates[i] = 'gone';
                    for (let j = 0; j < bone_vertex_idx_and_affinity.length; j++) {
                        let vertex_index = bone_vertex_idx_and_affinity[j][0];
                        obj.vertices_in_object[vertex_index] = new Vector4D(0, 0, -10000, 0);
                    }
                    continue;
                }

                let fallZ = -0.5 * fallGravity * fallTime * fallTime;
                for (let j = 0; j < bone_vertex_idx_and_affinity.length; j++) {
                    let vertex_index = bone_vertex_idx_and_affinity[j][0];
                    let original_vertex = bone_vertex_idx_and_affinity[j][2];
                    obj.vertices_in_object[vertex_index] = new Vector4D(
                        original_vertex.x, original_vertex.y,
                        original_vertex.z + fallZ, original_vertex.w
                    );
                }
                continue;
            }

            // Normal animation (attached legs)
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

        // Hit flash: shift texture U coords into the flash half when recently hit
        const hitFlashDuration = 0.15;
        const isFlashing = (obj.animState.damageTakenTime >= 0) &&
                           (t - obj.animState.damageTakenTime < hitFlashDuration);
        const texUShift = isFlashing ? 0.5 : 0.0;
        for (let i = 0; i < obj.vertices_in_texmap.length; i++) {
            obj.vertices_in_texmap[i].x = obj.vertices_in_texmap[i].x % 0.5 + texUShift;
        }
    }
    hypercrab.animateFunction = animationFrame;
    hypercrab.is_animated = true;
    hypercrab.animState = {
        legStates: [],        // 'attached', 'falling', 'gone'
        legFallStartTimes: [], // sim time when each leg started falling
        targetLegsLost: 0,
        damageTakenTime: -1
    };
    for (let i = 0; i < bones.length; i++) {
        hypercrab.animState.legStates.push('attached');
        hypercrab.animState.legFallStartTimes.push(0);
    }
    return hypercrab;
} // end function createCrawler()
