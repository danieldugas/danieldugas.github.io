import { Transform4D, Vector4D } from '../../4d_creatures/hyperengine/transform4d.js';
import { Hyperobject, createHypercube, removeDuplicates } from '../../4d_creatures/hyperengine/hyperobject.js';

class StaticObjectFrameBoxCollider {
    constructor(parentObjectStaticPose) {
        this.parentObjectStaticPose = parentObjectStaticPose; // parent in world
        this.parentObjectStaticPoseInverse = parentObjectStaticPose.inverse();
        console.log("parentObjectStaticPoseInverse", this.parentObjectStaticPoseInverse);
        // by default collider spans -1, -1, -1, -1 to 1, 1, 1, 1 in object frame
        this.min = new Vector4D(-1, -1, -1, -1); // in object
        this.max = new Vector4D(1, 1, 1, 1); // in object
    }

    updateParentPose(parentObjectStaticPose) {
        this.parentObjectStaticPose = parentObjectStaticPose;
        this.parentObjectStaticPoseInverse = parentObjectStaticPose.inverse();
    }

    constrainTransform(transform) {
        // player in parent frame = T_world_in_parent * T_player_in_world
        const pos_in_world = transform.origin();
        const position = this.parentObjectStaticPoseInverse.transform_point(pos_in_world);
        const orig_position = position.multiply_by_scalar(1.0); // for debugging

        // Constrain the transform matrix to stay outside the bounds of this collider
        const size = this.max.subtract(this.min);
        const halfSize = size.multiply_by_scalar(0.5);
        const center = this.min.add(halfSize);

        // For debugging, print position to a div
        if (false) {
          // Debug: print the player pose to a div
          // create div if it doesn't exist
          if (!document.getElementById("collider_debug")) {
              const div = document.createElement("div");
              div.id = "collider_debug";
              document.body.appendChild(div);
              div.style.position = "absolute";
              div.style.bottom = "10px";
              div.style.right = "10px";
              div.style.color = "rgb(156, 156, 156)";
              div.style.fontFamily = "monospace";
              div.style.fontSize = "12px";
              console.log("created div");
          }
          // update div
          document.getElementById("collider_debug").innerHTML = `Player:<br>`;
          document.getElementById("collider_debug").innerHTML += `[${position.x.toFixed(2)}]<br>`;
          document.getElementById("collider_debug").innerHTML += `[${position.y.toFixed(2)}]<br>`;
          document.getElementById("collider_debug").innerHTML += `[${position.z.toFixed(2)}]<br>`;
          document.getElementById("collider_debug").innerHTML += `[${position.w.toFixed(2)}]<br>`;
        }

        // Clamp position to be within the bounds
        let is_inside_x = position.x > this.min.x && position.x < this.max.x;
        let is_inside_y = position.y > this.min.y && position.y < this.max.y;
        let is_inside_z = position.z > this.min.z && position.z < this.max.z;
        let is_inside_w = position.w > this.min.w && position.w < this.max.w;
        if (is_inside_x && is_inside_y && is_inside_z && is_inside_w) {
            // Find the closest face and push the position out along that axis
            let distances = [
                position.x - this.min.x,
                this.max.x - position.x,
                position.y - this.min.y,
                this.max.y - position.y,
                position.z - this.min.z,
                this.max.z - position.z,
                position.w - this.min.w,
                this.max.w - position.w
            ];
            let minDistance = Math.min(...distances);
            let closestFaceIndex = distances.indexOf(minDistance);
            switch (closestFaceIndex) {
                case 0: // left face
                    position.x = this.min.x;
                    break;
                case 1: // right face
                    position.x = this.max.x;
                    break;
                case 2: // front face
                    position.y = this.min.y;
                    break;
                case 3: // back face
                    position.y = this.max.y;
                    break;
                case 4: // near face
                    position.z = this.min.z;
                    break;
                case 5: // far face
                    position.z = this.max.z;
                    break;
                case 6: // near w face
                    position.w = this.min.w;
                    break;
                case 7: // far w face
                    position.w = this.max.w;
                    break;
            }

            // Update the translation in the transform matrix
            let position_in_world = this.parentObjectStaticPose.transform_point(position);

            transform.setTranslation(position_in_world);
            return true;
        }
        return false;
    }

}

export function createHyperwall(pose, color=0xff0000) {
  // Create a 3D Wall surface, spanning from [-1, 1] in y, z, and w (thin in x)
    const const_hypercube_vertices = [ 
            new Vector4D(0, -1, -1, -1),
            new Vector4D(0,  1, -1, -1),
            new Vector4D(0, -1,  1, -1),
            new Vector4D(0,  1,  1, -1),
            new Vector4D(0, -1, -1,  1),
            new Vector4D(0,  1, -1,  1),
            new Vector4D(0, -1,  1,  1),
            new Vector4D(0,  1,  1,  1)
        ];
    // Tetrahedras
    function create_5_tetrahedra_tiling_of_3D_cube(cube_vertices) {
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
        const x0 = 0.0; // fixed x for this cube
        const tetrahedron_5_tiling_of_hypercube = [
            // cube at x = n
            [[x0, p, n, n], [x0, n, n, n], [x0, p, p, n], [x0, p, n, p]], // tet at corner p n n
            [[x0, n, p, n], [x0, p, p, n], [x0, n, n, n], [x0, n, p, p]], // tet at corner n p n
            [[x0, n, n, p], [x0, p, n, p], [x0, n, p, p], [x0, n, n, n]], // tet at corner n n p
            [[x0, p, p, p], [x0, n, p, p], [x0, p, n, p], [x0, p, p, n]], // tet at corner p p p
            [[x0, n, n, n], [x0, p, p, n], [x0, n, p, p], [x0, p, n, p]], // tet at center
        ];

        // convert to index
        let tetrahedra_indices = [];
        for (let tet of tetrahedron_5_tiling_of_hypercube) {
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
    let hyperwall = new Hyperobject(
        // vertices in object frame
        const_hypercube_vertices,
        // edges:
        [],
        // tetras
        create_5_tetrahedra_tiling_of_3D_cube(const_hypercube_vertices),
        // color
        color,
        // simulate_physics
        false,
        // show_vertices
        true,
        // mass
        1.0,
        // pose (Transform4D)
        pose,
        // name
        "Hyperwall"
    );
    hyperwall.vertices_in_texmap = hyperwall.vertices_in_object.map(v => new Vector4D(v.y*0.5 + 0.5, v.z*0.5 + 0.5, v.w*0.5 + 0.5, 0.0)); // Map 4D surface coords to 3D texture
    hyperwall.collider = new StaticObjectFrameBoxCollider(hyperwall.pose);
    // extend collider by +- 1 in y and w frame, to account for player thickness (fixes clipping through corners)
    //  (there is already +-1 margin in the x dim due to the object frame being [-1 to 1] in x but the actual geom is thin at 0)
    // first figure out the y and w size of the wall in world
    let yUnitVecInWorld = pose.transform_vector(new Vector4D(0, 1, 0, 0)); // in world
    let yUnitMagInWorld = yUnitVecInWorld.magnitude(); // 1 wall unit = this distance in world
    let wUnitVecInWorld = pose.transform_vector(new Vector4D(0, 0, 0, 1)); // in world
    let wUnitMagInWorld = wUnitVecInWorld.magnitude(); // 1 wall unit = this distance in world
    let oneMeterInWallY = 1.0 / yUnitMagInWorld; // 1 meter in wall = this many wall units
    let oneMeterInWallW = 1.0 / wUnitMagInWorld; // 1 meter in wall = this many wall units
    hyperwall.collider.min = new Vector4D(-1, -1 - oneMeterInWallY, -1, -1 - oneMeterInWallW); // in object
    hyperwall.collider.max = new Vector4D(1, 1 + oneMeterInWallY, 1, 1 + oneMeterInWallW);
    return hyperwall;
} // function createHyperwall()

export function createHyperwallWithCenterHole(objectlist, pose, holeRatio1, holeRatio2, color) {
  // pose: wall frame (x is thin dir, z is height) in world
  // holeRatio1: 0-1 ratio of hole 1 to wall length 1 (0.5 means half)
    // Creates 4 walls 
    // 
    // in wall frame
    //             ^ w
    //             |
    //  1 _ _______________
    //      |      1      |
    //      |_ _  ___  _ _|  _
    //  0 _ |  4 |   | 3  |  | hole length 2   --> y
    //      |_ _ |___| _ _|  _
    //      |      2      |
    // -1 _ |_____________|   
    //
    //           |---| hole length 1
    // 
    // Wall 1 pose in wall frame
    // (remember default wall has x as thin dir and z as height)
    // (remember that wall has default length 2.0, as it goes from -1 to 1 in object frame)
    // - For texturing, it is best to keep the overall object pose for all objects, and move the vertices and bounding boxes
    let w1_scale1 = 1.0; // scale of 1 means the subwall is the same size as the original (2 units)
    let w1_offset1 = 0.0; // offset of 0 means the subwall is centered at the original wall
    let w1_length2 = 1.0 - holeRatio2;
    let w1_scale2 = w1_length2 / 2.0;
    let w1_offset2 = 1.0 - w1_length2 / 2.0; // e.g. if hR2 = 0.33 then 02 = 0.66
    // wall 2
    let w3_length1 = 1.0 - holeRatio1;
    let w3_scale1 = w3_length1 / 2.0;
    let w3_offset1 = 1.0 - w3_length1 / 2.0;
    let w3_length2 = 2.0 * holeRatio2; // e.g. if hR1 = 0.33 then l1 = 0.66
    let w3_scale2 = w3_length2 / 2.0;
    let w3_offset2 = 0.0;
    // poses
    let wall1PoseInWallFrame = new Transform4D([
      [1.0, 0.0, 0.0, 0.0, 0.0],
      [0.0, w1_scale1, 0.0, 0.0, w1_offset1],
      [0.0, 0.0, 1.0, 0.0, 0.0],
      [0.0, 0.0, 0.0, w1_scale2, w1_offset2],
      [0.0, 0.0, 0.0, 0.0, 1.0]
    ]);
    let wall2PoseInWallFrame = new Transform4D([
      [1.0, 0.0, 0.0, 0.0, 0.0],
      [0.0, w1_scale1, 0.0, 0.0, w1_offset1],
      [0.0, 0.0, 1.0, 0.0, 0.0],
      [0.0, 0.0, 0.0, w1_scale2, -w1_offset2],
      [0.0, 0.0, 0.0, 0.0, 1.0]
    ]);
    let wall3PoseInWallFrame = new Transform4D([
      [1.0, 0.0, 0.0, 0.0, 0.0],
      [0.0, w3_scale1, 0.0, 0.0, w3_offset1],
      [0.0, 0.0, 1.0, 0.0, 0.0],
      [0.0, 0.0, 0.0, w3_scale2, w3_offset2],
      [0.0, 0.0, 0.0, 0.0, 1.0]
    ]);
    let wall4PoseInWallFrame = new Transform4D([
      [1.0, 0.0, 0.0, 0.0, 0.0],
      [0.0, w3_scale1, 0.0, 0.0, -w3_offset1],
      [0.0, 0.0, 1.0, 0.0, 0.0],
      [0.0, 0.0, 0.0, w3_scale2, w3_offset2],
      [0.0, 0.0, 0.0, 0.0, 1.0]
    ]);
    // Manually fix colliders
    //                 ^ w      pY
    //                 |        |-|
    //      -----------------------
    //  1 _ '  _________________  '
    //      '  |       1       |  '
    //      '  |_-_- _ _ _ -_-_|  '
    //      '  |    | - - |    |
    //  0 - '  |  4 ||   || 3  |  ' --> y
    //      '  |_ _ |_-_-_| _ _|  '
    //      '  | - -   2   - - |  '
    // -1 _ '  |_______________|  ' _
    //      '                     ' | pW
    //      ----------------------- -
    //
    // Figure out metric equivalent in wall frame to extend colliders properly
    // extend collider by +- 1 in y and w frame, to account for player thickness (fixes clipping through corners)
    //  (there is already +-1 margin in the x dim due to the object frame being [-1 to 1] in x but the actual geom is thin at 0)
    let yUnitVecInWorld = pose.transform_vector(new Vector4D(0, 1, 0, 0)); // in world
    let yUnitMagInWorld = yUnitVecInWorld.magnitude(); // 1 wall unit = this distance in world
    let wUnitVecInWorld = pose.transform_vector(new Vector4D(0, 0, 0, 1)); // in world
    let wUnitMagInWorld = wUnitVecInWorld.magnitude(); // 1 wall unit = this distance in world
    let oneMeterInWallY = 1.0 / yUnitMagInWorld; // 1 meter in wall = this many wall units
    let oneMeterInWallW = 1.0 / wUnitMagInWorld; // 1 meter in wall = this many wall units
    let hY = holeRatio1; // hole start in wall coords
    let hW = holeRatio2; // hole start in wall coords
    let pY = oneMeterInWallY; // y padding for colliders
    let pW = oneMeterInWallW; // w padding for colliders
    let wall1ColliderMax = new Vector4D(1.0, 1.0 + pY, 1.0, 1.0 + pW); // in wall
    let wall1ColliderMin = new Vector4D(-1.0, -1.0 - pY, -1.0, hW - pW); // in wall
    let wall2ColliderMax = new Vector4D(1.0, 1.0 + pY, 1.0, -hW + pW); // in wall
    let wall2ColliderMin = new Vector4D(-1.0, -1.0 - pY, -1.0, -1.0 - pW); // in wall
    let wall4ColliderMin = new Vector4D(-1.0, -1.0 - pY, -1.0, -hW - pW); // in wall
    let wall4ColliderMax = new Vector4D(1.0, -hY + pY, 1.0, hW + pW); // in wall
    let wall3ColliderMin = new Vector4D(-1.0, hY - pY, -1.0, -hW - pW); // in wall
    let wall3ColliderMax = new Vector4D(1.0, 1.0 + pY, 1.0, hW + pW); // in wall
    // Create subwalls and transform their vertices and collider
    // for each subwall frame
    for (let i = 0; i < 4; i++) {
        let subwallPoseInWallFrame = [wall1PoseInWallFrame, wall2PoseInWallFrame, wall3PoseInWallFrame, wall4PoseInWallFrame][i];
        let subwall = createHyperwall(pose, color);
        subwall.vertices_in_object = subwall.vertices_in_object.map(vertex => subwallPoseInWallFrame.transform_point(vertex));
        subwall.collider.min = [wall1ColliderMin, wall2ColliderMin, wall3ColliderMin, wall4ColliderMin][i];
        subwall.collider.max = [wall1ColliderMax, wall2ColliderMax, wall3ColliderMax, wall4ColliderMax][i];
        subwall.vertices_in_texmap = subwall.vertices_in_object.map(vertex => new Vector4D(vertex.y, vertex.z, vertex.w, 1.0));
        objectlist.push(subwall);
    }
    


} // createHyperwallWithCenterHole

// Spherical wall with opening
// Two XYW spheres, one at z+ and one at z-
// Collider is just a sphere collider with an exception for the entrance
class StaticObjectSphericalShellColliderWithHole {
    // R=1 is assumed, cutout is in x+
    constructor(parentObjectStaticPose, cutoutFactor) {
        this.parentObjectStaticPose = parentObjectStaticPose;
        this.cutoutFactor = cutoutFactor;
        this.parentObjectStaticPoseInverse = this.parentObjectStaticPose.inverse();
        this.innerR = 0.85;
        this.outerR = 1.1;
        const openingAlpha = Math.acos((this.innerR - cutoutFactor) / this.innerR);
        this.cutoutRadius = this.innerR * Math.sin(openingAlpha);
    }

    constrainTransform(transform) {
        // player in parent frame = T_world_in_parent * T_player_in_world
        const pos_in_world = transform.origin();
        let position = this.parentObjectStaticPoseInverse.transform_point(pos_in_world);
        const orig_position = position.multiply_by_scalar(1.0); // for debugging

        // Radius check
        const r = Math.sqrt(position.x * position.x + position.y * position.y + position.w * position.w); // ignore z
        const is_within_shell = r < this.outerR && r > this.innerR && position.z > -1.0 && position.z < 1.0;
        const is_inside_entrance = position.x > 0.0 && (position.y * position.y + position.w * position.w) < (this.cutoutRadius * this.cutoutRadius);
        const is_colliding = is_within_shell && !is_inside_entrance;
        const closestR = (r - this.innerR) < (this.outerR - r) ? this.innerR : this.outerR;

        // For debugging, print position to a div
        if (false) {
          // Debug: print the player pose to a div
          // create div if it doesn't exist
          if (!document.getElementById("collider_debug")) {
              const div = document.createElement("div");
              div.id = "collider_debug";
              document.body.appendChild(div);
              div.style.position = "absolute";
              div.style.bottom = "400px";
              div.style.right = "10px";
              div.style.color = "rgb(156, 156, 156)";
              div.style.fontFamily = "monospace";
              div.style.fontSize = "12px";
              console.log("created div");
          }
          // update div
          document.getElementById("collider_debug").innerHTML = `Player:<br>`;
          document.getElementById("collider_debug").innerHTML += `[${position.x.toFixed(2)}]<br>`;
          document.getElementById("collider_debug").innerHTML += `[${position.y.toFixed(2)}]<br>`;
          document.getElementById("collider_debug").innerHTML += `[${position.z.toFixed(2)}]<br>`;
          document.getElementById("collider_debug").innerHTML += `[${position.w.toFixed(2)}]<br>`;
          document.getElementById("collider_debug").innerHTML += `R: ${r.toFixed(2)}<br>`;
          document.getElementById("collider_debug").innerHTML += `is_colliding: ${is_colliding}<br>`;
          document.getElementById("collider_debug").innerHTML += `is_inside_entrance: ${is_inside_entrance}<br>`;
          document.getElementById("collider_debug").innerHTML += `ywRadius: ${Math.sqrt(position.y * position.y + position.w * position.w).toFixed(2)}<br>`;
          document.getElementById("collider_debug").innerHTML += `cutoutRadius: ${this.cutoutRadius.toFixed(2)}<br>`;
          document.getElementById("collider_debug").innerHTML += `closestR: ${closestR.toFixed(2)}<br>`;
        }

        if (is_colliding) {
            // position = position.normalize().multiply_by_scalar(closestR);
            position = position.normalize().multiply_by_scalar(this.innerR); // default to teleport inside

            // Update the translation in the transform matrix
            let position_in_world = this.parentObjectStaticPose.transform_point(position);

            transform.setTranslation(position_in_world);
            return true;
        }
        return false;
    }
    
}

export function createSphericalWallWithHole(pose, cutoutFactor, color) {
    // build a hypersphere surface (mesh)
    let grid_vertices = [];
    let grid_edges = [];
    let grid_tetras = [];
    let grid_vertices_texcoords = [];
    // Shell
    const n_i = 9;
    const n_j = 5; // we cut out the last ring, leaving an entrance in x+
    const n_k = 2;
    const R = 1.0;
    let vertex_index_offset = grid_vertices.length;
    for (let i = 0; i < n_i; i++) {
        for (let j = 0; j < n_j; j++) {
            for (let k = 0; k < n_k; k++) {
                // Spherical coordinates for the points
                // a is the circle on xy plane (9)
                // b is the concentric rings along z (5)
                // c is the concentric spheres along w (5)
                let sphere_Rs = [R, R];
                let sphere_R = sphere_Rs[k];
                // cos(alpha) = (R - cutoutFactor) / R
                const openingAlpha = Math.acos((sphere_R - cutoutFactor) / sphere_R);
                const cutoutRadius = sphere_R * Math.sin(openingAlpha);
                let circle_Rs = [0.0, 0.707*sphere_R, sphere_R, 0.707*sphere_R, cutoutRadius*sphere_R];
                let circle_R = circle_Rs[j];
                let y = [      0.0,  0.707*circle_R, circle_R, 0.707*circle_R,      0.0, -0.707*circle_R, -circle_R, -0.707*circle_R,       0.0][i];
                let w = [-circle_R, -0.707*circle_R,      0.0, 0.707*circle_R, circle_R,  0.707*circle_R,       0.0, -0.707*circle_R, -circle_R][i];
                let x = [-sphere_R, -0.707*sphere_R,      0.0, 0.707*sphere_R, sphere_R - cutoutFactor][j];
                let z = [-1.0,  1.0][k];
                grid_vertices.push(new Vector4D(x, y, z, w));

                // texture coordinates
                let alpha = k / (n_k - 1.0);
                let theta = i / (n_i - 1.0);
                let phi = j / (n_j - 1.0);
                grid_vertices_texcoords.push(new Vector4D(alpha, theta, phi, 0.0));

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

    
    let object = new Hyperobject(
        // vertices in object frame
        grid_vertices,
        // edges
        grid_edges,
        // tetras
        grid_tetras,
        // color
        color,
        // simulate_physics
        false,
        // show_vertices
        false,
        // mass
        1.0,
        // pose (Transform4D)
        pose,
        // name
        "SphericalWallWithHole"
    );
    object.collider = new StaticObjectSphericalShellColliderWithHole(pose, cutoutFactor);

    return object;
} // createSphericalWallWithHole

export function createSphericalFloor(pose, color) {
    // build a hypersphere surface (mesh)
    let grid_vertices = [];
    let grid_edges = [];
    let grid_tetras = [];
    let grid_vertices_texcoords = [];
    // Shell
    const n_i = 9;
    const n_j = 5;
    const n_k = 2;
    const R = 1.0;
    let vertex_index_offset = grid_vertices.length;
    for (let i = 0; i < n_i; i++) {
        for (let j = 0; j < n_j; j++) {
            for (let k = 0; k < n_k; k++) {
                // Spherical coordinates for the points
                // a is the circle on xy plane (9)
                // b is the concentric rings along z (5)
                // c is the concentric spheres along w (5)
                let sphere_Rs = [0, R];
                let sphere_R = sphere_Rs[k];
                let circle_Rs = [0.0, 0.707*sphere_R, sphere_R, 0.707*sphere_R, 0.0];
                let circle_R = circle_Rs[j];
                let y = [      0.0,  0.707*circle_R, circle_R, 0.707*circle_R,      0.0, -0.707*circle_R, -circle_R, -0.707*circle_R,       0.0][i];
                let w = [-circle_R, -0.707*circle_R,      0.0, 0.707*circle_R, circle_R,  0.707*circle_R,       0.0, -0.707*circle_R, -circle_R][i];
                let x = [-sphere_R, -0.707*sphere_R,      0.0, 0.707*sphere_R, sphere_R][j];
                let z = [0.0,  0.0][k];
                grid_vertices.push(new Vector4D(x, y, z, w));

                // texture coordinates
                let alpha = k / (n_k - 1.0);
                let theta = i / (n_i - 1.0);
                let phi = j / (n_j - 1.0);
                grid_vertices_texcoords.push(new Vector4D(alpha, theta, phi, 0.0));

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

    
    let object = new Hyperobject(
        // vertices in object frame
        grid_vertices,
        // edges
        grid_edges,
        // tetras
        grid_tetras,
        // color
        color,
        // simulate_physics
        false,
        // show_vertices
        false,
        // mass
        1.0,
        // pose (Transform4D)
        pose,
        // name
        "SphericalFloor"
    );

    return object;
} // createSphericalFloor

export function createSphericalBridge(pose, innerRFactor, outerRFactor, color) {
    // We connect 5 spheres (z-, innerR), (z-, outerR), (z+, outerR), (z+, innerR) (z-, innerR) to create a loop that encloses the spherical shell
    // build a hypersphere surface (mesh)
    let grid_vertices = [];
    let grid_edges = [];
    let grid_tetras = [];
    let grid_vertices_texcoords = [];
    // Shell
    const n_i = 9;
    const n_j = 5;
    const n_k = 5; // this one is a little bit more complicated
    const R = 1.0;
    let vertex_index_offset = grid_vertices.length;
    for (let i = 0; i < n_i; i++) {
        for (let j = 0; j < n_j; j++) {
            for (let k = 0; k < n_k; k++) {
                // Spherical coordinates for the points
                // a is the circle on xy plane (9)
                // b is the concentric rings along z (5)
                // c is the concentric spheres along w (5)
                let sphere_Rs = [R*innerRFactor, R*outerRFactor, R*outerRFactor, R*innerRFactor, R*innerRFactor];
                let sphere_R = sphere_Rs[k];
                let circle_Rs = [0.0, 0.707*sphere_R, sphere_R, 0.707*sphere_R, 0.0];
                let circle_R = circle_Rs[j];
                let y = [      0.0,  0.707*circle_R, circle_R, 0.707*circle_R,      0.0, -0.707*circle_R, -circle_R, -0.707*circle_R,       0.0][i];
                let w = [-circle_R, -0.707*circle_R,      0.0, 0.707*circle_R, circle_R,  0.707*circle_R,       0.0, -0.707*circle_R, -circle_R][i];
                let x = [-sphere_R, -0.707*sphere_R,      0.0, 0.707*sphere_R, sphere_R][j];
                let z = [0.0,  0.0, 1.0, 1.0, 0.0][k];
                grid_vertices.push(new Vector4D(x, y, z, w));

                // texture coordinates
                let alpha = k / (n_k - 1.0);
                let theta = i / (n_i - 1.0);
                let phi = j / (n_j - 1.0);
                grid_vertices_texcoords.push(new Vector4D(alpha, theta, phi, 0.0));

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

    
    let object = new Hyperobject(
        // vertices in object frame
        grid_vertices,
        // edges
        grid_edges,
        // tetras
        grid_tetras,
        // color
        color,
        // simulate_physics
        false,
        // show_vertices
        false,
        // mass
        1.0,
        // pose (Transform4D)
        pose,
        // name
        "SphericalFloor"
    );

    return object;
} // createSphericalFloor

// Create obstacle cube
export function createObstacleCube(pose, color) {
    let hypercube = createHypercube(pose, color);
    hypercube.collider = new StaticObjectFrameBoxCollider(hypercube.pose);
    // extend collider by +- 1 in all dims to account for player thickness
    // first figure out the y and w size of the wall in world
    let xUnitInWorld = pose.transform_vector(new Vector4D(1, 0, 0, 0)).magnitude(); // in world
    let oneMeterInWallX = 1.0 / xUnitInWorld; // 1 meter in wall = this many wall units
    let yUnitInWorld = pose.transform_vector(new Vector4D(0, 1, 0, 0)).magnitude(); // in world
    let oneMeterInWallY = 1.0 / yUnitInWorld; // 1 meter in wall = this many wall units
    let wUnitInWorld = pose.transform_vector(new Vector4D(0, 0, 0, 1)).magnitude(); // in world
    let oneMeterInWallW = 1.0 / wUnitInWorld; // 1 meter in wall = this many wall units
    hypercube.collider.min = new Vector4D(-1 - oneMeterInWallX, -1 - oneMeterInWallY, -1, -1 - oneMeterInWallW); // in object
    hypercube.collider.max = new Vector4D(1 + oneMeterInWallX, 1 + oneMeterInWallY, 1, 1 + oneMeterInWallW);
    hypercube.simulate_physics = false;
    return hypercube;
}