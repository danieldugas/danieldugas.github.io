import { Transform4D, Vector4D } from '../../4d_creatures/hyperengine/transform4d.js';
import { Hyperobject, createHypercube, removeDuplicates } from '../../4d_creatures/hyperengine/hyperobject.js';
import { runHyperengine } from '../../4d_creatures/hyperengine/hyperengine.js';

// Shades
// Umbra
// Anima
// Damnati

export class Hitbox {
    constructor(min, max) {
        // in object frame
        this.min = min;
        this.max = max;
    }

    checkBulletCollision(bulletPos, enemyPose, bulletRadius) {
        let worldInEnemy = enemyPose.inverse();
        const position = worldInEnemy.transform_point(bulletPos);
        const bulletRInEnemy = worldInEnemy.transform_vector(new Vector4D(bulletRadius, bulletRadius, bulletRadius, bulletRadius));

        // Clamp position to be within the bounds
        let is_inside_x = position.x > (this.min.x - Math.abs(bulletRInEnemy.x)) && position.x < (this.max.x + Math.abs(bulletRInEnemy.x));
        let is_inside_y = position.y > (this.min.y - Math.abs(bulletRInEnemy.y)) && position.y < (this.max.y + Math.abs(bulletRInEnemy.y));
        let is_inside_z = position.z > (this.min.z - Math.abs(bulletRInEnemy.z)) && position.z < (this.max.z + Math.abs(bulletRInEnemy.z));
        let is_inside_w = position.w > (this.min.w - Math.abs(bulletRInEnemy.w)) && position.w < (this.max.w + Math.abs(bulletRInEnemy.w));
        if (is_inside_x && is_inside_y && is_inside_z && is_inside_w) {
            return true;
        }
        return false;
    }
} // Hitbox


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
    const twy = 0.4;
    let vertex_index_offset = grid_vertices.length;
    if (true) {
        let bone_vertex_idx_and_affinity = [];
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
                    let w = [-sphere_R,               -0.707*sphere_R,      0.0,        0.707*sphere_R,        sphere_R][j]; // I think this should be Sphere_R
                    let z = [tbz,      tbz + thz * 0.7, tbz + thz][k];
                    grid_vertices.push(new Vector4D(x, y, z, w));

                    // texture coordinates
                    let theta = i / (n_i - 1.0);
                    let phi = j / (n_j - 1.0);
                    grid_vertices_texcoords.push(new Vector4D(0.75, theta, phi, 0.0));

                    // Add this vertex to bone
                    bone_vertex_idx_and_affinity.push([grid_vertices.length - 1, 1.0, new Vector4D(x, y, z, w)]);

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
        bones.push({type: "torso", vertex_idx_and_affinity: bone_vertex_idx_and_affinity});
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
        let bone_vertex_idx_and_affinity = [];
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
                    let w = [-sphere_R,               -0.707*sphere_R,      0.0,        0.707*sphere_R,        sphere_R][j];
                    let z = [-sphere_R, -0.707*sphere_R,      0.0, 0.707*sphere_R, sphere_R][k] + sphere_R + tbz;
                    grid_vertices.push(new Vector4D(x, y, z, w));

                    // texture coordinates
                    let theta = i / (n_i - 1.0);
                    let phi = j / (n_j - 1.0);
                    grid_vertices_texcoords.push(new Vector4D(0.75, theta, phi, 0.0));

                    // Add this vertex to bone
                    bone_vertex_idx_and_affinity.push([grid_vertices.length - 1, 1.0, new Vector4D(x, y, z, w)]);

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
        bones.push({type: "head", vertex_idx_and_affinity: bone_vertex_idx_and_affinity});
    }

    // Arms
    for (let li = 0; li < 2; li++) {
        const n_i = 9;
        const n_j = 5;
        const n_k = 2;
        const R = 1.0;
        const tbz = 1.0;
        const thz = 1.0;
        const twy = 0.18;
        const cy = [-0.3, 0.3][li];
        let vertex_index_offset = grid_vertices.length;
        let bone_vertex_idx_and_affinity = [];
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
                    let w = [-sphere_R,               -0.707*sphere_R,      0.0,        0.707*sphere_R,        sphere_R][j];
                    let z = [tbz, tbz + thz][k];
                    grid_vertices.push(new Vector4D(x, y, z, w));

                    // texture coordinates
                    let theta = i / (n_i - 1.0);
                    let phi = j / (n_j - 1.0);
                    grid_vertices_texcoords.push(new Vector4D(0.75, theta, phi, 0.0));

                    // Add this vertex to bone
                    bone_vertex_idx_and_affinity.push([grid_vertices.length - 1, 1.0, new Vector4D(x, y, z, w)]);

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
        const type = ["left_arm", "right_arm"][li];
        bones.push({type: type, vertex_idx_and_affinity: bone_vertex_idx_and_affinity});
    }

    // Leg
    for (let li = 0; li < 4; li++) {
        const n_i = 9;
        const n_j = 5;
        const n_k = 2;
        const R = 1.0;
        const tbz = [0.0, 0.5, 0.0, 0.5][li];
        const thz = 0.5;
        const twy = 0.18;
        const cy = [-0.2, -0.2, 0.2, 0.2][li];
        let vertex_index_offset = grid_vertices.length;
        let bone_vertex_idx_and_affinity = [];
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
                    let w = [-sphere_R,               -0.707*sphere_R,      0.0,        0.707*sphere_R,        sphere_R][j];
                    let z = [tbz, tbz + thz][k];
                    grid_vertices.push(new Vector4D(x, y, z, w));

                    // texture coordinates
                    let theta = i / (n_i - 1.0);
                    let phi = j / (n_j - 1.0);
                    grid_vertices_texcoords.push(new Vector4D(0.75, theta, phi, 0.0));

                    // Add this vertex to bone
                    bone_vertex_idx_and_affinity.push([grid_vertices.length - 1, 1.0, new Vector4D(x, y, z, w)]);

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
        const legType = (li % 2 === 0) ? "lower_leg" : "upper_leg";
        bones.push({type: legType, vertex_idx_and_affinity: bone_vertex_idx_and_affinity});
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
    // Hitbox
    damned.hitbox = new Hitbox(new Vector4D(-ttx/2.0, -twy/2.0, 0, -twy/2.0), new Vector4D(ttx/2.0, twy/2.0, 2.5, twy/2.0));
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
        function rotateXZ(v, pivotX, pivotZ, angle) {
            const c = Math.cos(angle);
            const s = Math.sin(angle);
            const dx = v.x - pivotX;
            const dz = v.z - pivotZ;
            return new Vector4D(pivotX + dx * c - dz * s, v.y, pivotZ + dx * s + dz * c, v.w);
        }

        const hipZ = 1.0;
        const kneeZ = 0.5;

        for (let i = 0; i < obj.bones.length; i++) {
            let bone = obj.bones[i];
            for (let j = 0; j < bone.vertex_idx_and_affinity.length; j++) {
                const vi = bone.vertex_idx_and_affinity[j][0];
                let v = bone.vertex_idx_and_affinity[j][2]; // original vertex
                // time based oscillation
                const alpha = Math.sin(Math.PI * 2.0 * t / 10.0) * Math.PI / 8.0;

                if (obj.animState.isHurt) {
                    const leanAng = Math.PI / 16.0;
                    // Torso, head, arms: tilt forward -90° around hip
                    if (bone.type === "torso" || bone.type === "head" || bone.type === "left_arm" || bone.type === "right_arm") {
                        v = rotateXZ(v, 0, hipZ, leanAng);
                    }
                    // Rotate head around neck
                    if (bone.type === "head") {
                        v = rotateXZ(v, -Math.sin(leanAng), hipZ+Math.cos(leanAng), -leanAng);
                    }
                    // Arms: additionally rotate down +90° around shoulder
                    if (bone.type === "left_arm") {
                        v = rotateXZ(v, -Math.sin(leanAng), hipZ+Math.cos(leanAng), -leanAng);
                    }
                    if (bone.type === "right_arm") {
                        v = rotateXZ(v, -Math.sin(leanAng), hipZ+Math.cos(leanAng), -leanAng);
                    }

                    // All vertices: shift so that head is at 0
                    v = new Vector4D(v.x + 0.707, v.y, v.z, v.w);
                } else if (obj.animState.isCrawling) {
                    // Torso, head, arms: tilt forward -90° around hip
                    if (bone.type === "torso" || bone.type === "head" || bone.type === "left_arm" || bone.type === "right_arm") {
                        v = rotateXZ(v, 0, hipZ, Math.PI / 2);
                    }
                    // Rotate head around neck
                    if (bone.type === "head") {
                        v = rotateXZ(v, -1.0, hipZ, -1.4 );
                    }
                    // Arms: additionally rotate down +90° around shoulder
                    if (bone.type === "left_arm") {
                        v = rotateXZ(v, -1.0, hipZ, -Math.PI / 2 + alpha);
                    }
                    if (bone.type === "right_arm") {
                        v = rotateXZ(v, -1.0, hipZ, -Math.PI / 2 - alpha - 2.2);
                    }
                    // Upper legs: rotate backward -90° around hip
                    if (bone.type === "upper_leg") {
                        // v = rotateXZ(v, 0, hipZ, Math.PI / 2);
                    }
                    // Lower legs: rotate backward around hip, then down around knee
                    if (bone.type === "lower_leg") {
                        // v = rotateXZ(v, 0, hipZ, Math.PI / 2);
                        v = rotateXZ(v, 0, kneeZ, Math.PI / 2);
                    }

                    // All vertices: shift down
                    v = new Vector4D(v.x + 1.0, v.y, v.z - 0.5, v.w);
                }

                obj.vertices_in_object[vi] = v;
            }
        }
    }
    damned.animateFunction = animationFrame;
    damned.is_animated = true;
    damned.animState = {isCrawling: false};
    return damned;
} // end function createDamned()
