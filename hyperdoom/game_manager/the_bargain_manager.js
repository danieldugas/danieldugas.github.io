import { Transform4D, Vector4D } from '../../4d_creatures/hyperengine/transform4d.js';
// Custom controls
//      (3D / 4D upgrade)
//       Shooting and guns
// Enemy spawning logic
// Environment logic (doors, keys)
// Inventory
// Player Health
// Dialogue overlays
// Game Over 

export class TheBargainManager {
    constructor() {
    }

    //Called by the hyperengine at every timestep
    updatePlayerControls(engineState) {
        // Else, default controls
        const moveSpeed = 0.1;
        const RELATIVE_MOVEMENT = true;
        if (engineState.keys['w']) {
            engineState.camstand_T.translate_self_by_delta(moveSpeed, 0, 0, 0, RELATIVE_MOVEMENT);
        }
        if (engineState.keys['s']) {
            engineState.camstand_T.translate_self_by_delta(-moveSpeed, 0, 0, 0, RELATIVE_MOVEMENT);
        }
        if (engineState.keys['a']) {
            engineState.camstand_T.translate_self_by_delta(0, moveSpeed, 0, 0, RELATIVE_MOVEMENT);
        }
        if (engineState.keys['d']) {
            engineState.camstand_T.translate_self_by_delta(0,-moveSpeed, 0, 0, RELATIVE_MOVEMENT);
        }
        if (engineState.keys['q']) {
            engineState.camstand_T.translate_self_by_delta(0, 0, 0, -moveSpeed, RELATIVE_MOVEMENT);
        }
        if (engineState.keys['e']) {
            engineState.camstand_T.translate_self_by_delta(0, 0, 0, +moveSpeed, RELATIVE_MOVEMENT);
        }
        if (engineState.keys['r']) {
            engineState.camstand_T.translate_self_by_delta(0, 0, moveSpeed, 0, RELATIVE_MOVEMENT);
        }
        if (engineState.keys['f']) {
            engineState.camstand_T.translate_self_by_delta(0, 0, -moveSpeed, 0, RELATIVE_MOVEMENT);
        }
        // space to jump
        if (engineState.keys[' ']) {
            if (!engineState.player_is_jumping) {
                engineState.last_player_jump_time = engineState.physics_time_s;
                engineState.player_is_jumping = true;
            }
        }

        const rotateSpeed = 0.05;
        if (engineState.keys['i']) {
            engineState.camstandswivel_angle -= rotateSpeed;
        }
        if (engineState.keys['k']) {
            engineState.camstandswivel_angle += rotateSpeed;
        }
        if (engineState.keys['j']) {
            engineState.camstand_T.rotate_self_by_delta('XY', rotateSpeed, true);
        }
        if (engineState.keys['l']) {
            engineState.camstand_T.rotate_self_by_delta('XY', -rotateSpeed, true);
        }
        if (engineState.keys['u']) {
            engineState.camstand_T.rotate_self_by_delta('XW', rotateSpeed, true);
        }
        if (engineState.keys['o']) {
            engineState.camstand_T.rotate_self_by_delta('XW', -rotateSpeed, true);
        }
        if (engineState.keys['y']) {
            engineState.camstand_T.rotate_self_by_delta('YW', -rotateSpeed, true);
        }
        if (engineState.keys['p']) {
            engineState.camstand_T.rotate_self_by_delta('YW', rotateSpeed, true);
        }

        // Box Colliders
        for (let i = 0; i < engineState.scene.visibleHyperobjects.length; i++) {
            const obj = engineState.scene.visibleHyperobjects[i];
            if (obj.collider) {
                obj.collider.constrainTransform(engineState.camstand_T);
            }
        }

                // Debug: print the player pose to a div
                // create div if it doesn't exist
                if (!document.getElementById("player_pose")) {
                    const div = document.createElement("div");
                    div.id = "player_pose";
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
                document.getElementById("player_pose").innerHTML = `Player:<br>`;
                document.getElementById("player_pose").innerHTML += `[${engineState.camstand_T.matrix[0][0].toFixed(2)}, ${engineState.camstand_T.matrix[0][1].toFixed(2)}, ${engineState.camstand_T.matrix[0][2].toFixed(2)}, ${engineState.camstand_T.matrix[0][3].toFixed(2)}, ${engineState.camstand_T.matrix[0][4].toFixed(2)}]<br>`;
                document.getElementById("player_pose").innerHTML += `[${engineState.camstand_T.matrix[1][0].toFixed(2)}, ${engineState.camstand_T.matrix[1][1].toFixed(2)}, ${engineState.camstand_T.matrix[1][2].toFixed(2)}, ${engineState.camstand_T.matrix[1][3].toFixed(2)}, ${engineState.camstand_T.matrix[1][4].toFixed(2)}]<br>`;
                document.getElementById("player_pose").innerHTML += `[${engineState.camstand_T.matrix[2][0].toFixed(2)}, ${engineState.camstand_T.matrix[2][1].toFixed(2)}, ${engineState.camstand_T.matrix[2][2].toFixed(2)}, ${engineState.camstand_T.matrix[2][3].toFixed(2)}, ${engineState.camstand_T.matrix[2][4].toFixed(2)}]<br>`;
                document.getElementById("player_pose").innerHTML += `[${engineState.camstand_T.matrix[3][0].toFixed(2)}, ${engineState.camstand_T.matrix[3][1].toFixed(2)}, ${engineState.camstand_T.matrix[3][2].toFixed(2)}, ${engineState.camstand_T.matrix[3][3].toFixed(2)}, ${engineState.camstand_T.matrix[3][4].toFixed(2)}]<br>`;

        // Compute final camera transform from intermediate poses
        // Jump and camera height
        // reset camera z to 0
        let jump_z = 0;
        const jump_height = 1;
        if (engineState.player_is_jumping) {
            // jump height is a parabola
            const tend = 4; // jump duration
            let dt = engineState.physics_time_s - engineState.last_player_jump_time;
            let jp01 = dt / tend; // jump progress from 0 to 1
            if (dt > tend) {
                engineState.player_is_jumping = false;
            } else {
                jump_z = jump_height * (1.0 - (2.0 * jp01 - 1.0) ** 2);
            }
        }
        engineState.camstand_T.matrix[2][4] = engineState.scene.floor_heightmap(
            engineState.camstand_T.matrix[0][4],
            engineState.camstand_T.matrix[1][4],
            engineState.camstand_T.matrix[3][4]
        ) + jump_z;
        // sine and cosine of swivel angle
        let ss = Math.sin(engineState.camstandswivel_angle);
        let cs = Math.cos(engineState.camstandswivel_angle);
        let h = engineState.camstand_height;
        let hypercam_in_camstand = new Transform4D([
            [cs, 0, ss, 0, 0],
            [0, 1, 0, 0, 0],
            [-ss, 0, cs, 0, h],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ]);
        engineState.hypercamera_T = engineState.camstand_T.transform_transform(hypercam_in_camstand);
    }

}