import { Transform4D, Vector4D } from '../../4d_creatures/hyperengine/transform4d.js';
import { Hyperobject, createHypercube, removeDuplicates } from '../../4d_creatures/hyperengine/hyperobject.js';

class StaticObjectFrameBoxCollider {
    constructor(
        parentObjectStaticPose,
    ) {
        this.parentObjectStaticPose = parentObjectStaticPose; // parent in world
        this.parentObjectStaticPoseInverse = parentObjectStaticPose.inverse();
        console.log("parentObjectStaticPoseInverse", this.parentObjectStaticPoseInverse);
        // by default collider spans -1, -1, -1, -1 to 1, 1, 1, 1 in object frame
        this.min = new Vector4D(-1, -1, -1, -1);
        this.max = new Vector4D(1, 1, 1, 1);
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
        if (true) {
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
        }
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
    hyperwall.collider = new StaticObjectFrameBoxCollider(hyperwall.pose);
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
    let wall1PoseInWorld = pose.transform_transform(wall1PoseInWallFrame);
    let wall2PoseInWorld = pose.transform_transform(wall2PoseInWallFrame);
    let wall3PoseInWorld = pose.transform_transform(wall3PoseInWallFrame);
    let wall4PoseInWorld = pose.transform_transform(wall4PoseInWallFrame);
    objectlist.push(createHyperwall(wall1PoseInWorld, color));
    objectlist.push(createHyperwall(wall2PoseInWorld, color));
    objectlist.push(createHyperwall(wall3PoseInWorld, color));
    objectlist.push(createHyperwall(wall4PoseInWorld, color));
} // createHyperwallWithCenterHole