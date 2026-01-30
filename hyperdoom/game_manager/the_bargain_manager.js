import { Transform4D, Vector4D } from '../../4d_creatures/hyperengine/transform4d.js';
import { createBullet } from '../models/bullet.js';
import { createCrawler } from '../models/crawler.js';
// Custom controls
//      (3D / 4D upgrade)
//       Shooting and guns
//       Jumping and multiple heights
// Enemy spawning logic
// Environment logic (doors, keys, floor damage)
// Inventory
// Player Health
// Dialogue overlays
// Game Over 

// Other TODOs:
// Per room Floor
// Bargainer / The Shackled / Redeemer of Flesh / Collector / Absolver / Exactor / Flesher / Sinewwright / Curator / Penitent / Hierarch / Lost One / Surgeon / ???
// Bargainer dialogue:
// [You were not supposed to be here.
// You will never be able to leave this place. 
// Unless...]
//    or if returning: [You have returned]
// I could make you more, let you see through their eyes. Move in their dimensions.
// But there is a price.
// Oh, you may lose your sanity.
// But that is not what I will require for you.
// Parts of you must be abandoned. Exchanged. Irreversibly.
// > Surrender your spleen
// > Surrender your spleen, and eyes
// > Refuse
// Your decision. The bargain is sealed.

// You wake up alone. And in horrible pain.


// Enemy models
// Texturing

// Modelling tool?

class FiredBullet {
    constructor(scene, primitiveIndex, firedOrigin, firedDirection, firedSimTime) {
        this.scene = scene;
        this.primitiveIndex = primitiveIndex;
        this.firedOrigin = firedOrigin;
        this.firedDirection = firedDirection;
        this.firedSimTime = firedSimTime;

        this.lastUpdateTime = firedSimTime;

        let newPos = firedOrigin.add(firedDirection.multiply_by_scalar(2.0));
        this.lastUpdatePos = newPos;

        // Move primitive to origin
        this.scene.visibleHyperobjects[primitiveIndex].pose.setTranslation(newPos);
    }

    updateBullet(physics_time_s, bulletPrimitives, parentList, indexInParentList) {
        // move by direction * velocity * dt
        const velocity = 2.0;
        let newPos = this.lastUpdatePos.add(this.firedDirection.multiply_by_scalar(velocity * (physics_time_s - this.lastUpdateTime)));
        this.scene.visibleHyperobjects[this.primitiveIndex].pose.setTranslation(newPos);

        this.lastUpdateTime = physics_time_s;
        this.lastUpdatePos = newPos;

        // Bullets destroy themselves after 100 sec
        if (physics_time_s - this.firedSimTime > 100.0) {
            this.destroyBullet(bulletPrimitives, parentList, indexInParentList);
        }

        // Check colliders, do damage, etc

    }

    destroyBullet(bulletPrimitives, parentList, indexInParentList) {
        // Return primitive to pool
        bulletPrimitives.push(this.primitiveIndex);
        // Remove self from parentList
        parentList.splice(indexInParentList, 1);
    }
}

export class TheBargainManager {
    constructor(scene) {
        this.scene = scene;

        // state
        this.GOD_MODE = false;
        this.bulletCooldownLastFiredTime = 0;

        // bullets
        this.playerBullets = [];
        this.bulletPrimitives = [];
        // enemies

        // Pre-allocate 100 bullets
        // createHypersphere(size, color)
        for (let i = 0; i < 100; i++) { // NOCOMMIT
            let dx = Math.random() * 20 - 10;
            let dy = Math.random() * 20 - 10;
            let dw = Math.random() * 20 - 10;
            let pose = new Transform4D([
                [1, 0, 0, 0, 30 + dx],
                [0, 1, 0, 0, 0 + dy],
                [0, 0, 1, 0, 3],
                [0, 0, 0, 1, 0 + dw],
                [0, 0, 0, 0, 1]
            ])
            let sphere = createBullet(1, 0xffff00, pose);
            this.bulletPrimitives.push(this.scene.visibleHyperobjects.length);
            this.scene.visibleHyperobjects.push(sphere);
        }

    }

    //Called by the hyperengine at every timestep
    updatePlayerControls(engineState) {
        // Mouse
        if (engineState.isDraggingLeftClick) {
            const deltaX = engineState.mouseCurrentClickedX - engineState.lastX;
            const deltaY = engineState.mouseCurrentClickedY - engineState.lastY;
            
            engineState.camstand_T.rotate_self_by_delta('XY', deltaX * 0.01, true);
            engineState.camstand_T.rotate_self_by_delta('XW', deltaY * 0.01, true);
            
            engineState.lastX = engineState.mouseCurrentClickedX;
            engineState.lastY = engineState.mouseCurrentClickedY;
        }
        if (engineState.isDraggingRightClick) {
            const deltaX = engineState.mouseCurrentClickedX - engineState.lastXRight;
            const deltaY = engineState.mouseCurrentClickedY - engineState.lastYRight;
            engineState.camstand_T.rotate_self_by_delta('YW', deltaX * 0.01, true);
            engineState.camstandswivel_angle += deltaY * 0.01;
            engineState.lastXRight = engineState.mouseCurrentClickedX;
            engineState.lastYRight = engineState.mouseCurrentClickedY;
        }
        if (engineState.isDraggingMiddleClick) {
            const deltaX = engineState.mouseCurrentClickedX - engineState.lastXMiddle;
            const deltaY = engineState.mouseCurrentClickedY - engineState.lastYMiddle;
            engineState.sensorCamRotY += deltaY * 0.01;
            engineState.sensorCamRotX += deltaX * 0.01;
            engineState.lastXMiddle = engineState.mouseCurrentClickedX;
            engineState.lastYMiddle = engineState.mouseCurrentClickedY;
        }
        engineState.sensorCamDist = engineState.mouseScroll01 * 100 + 1;

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

        // C to shoot
        if (engineState.keys['c']) {
            let timeSinceCooldown = engineState.physics_time_s - this.bulletCooldownLastFiredTime;
            if (timeSinceCooldown > 1.0) {
                if (this.bulletPrimitives.length == 0) {
                    this.playerBullets[0].destroyBullet(this.bulletPrimitives, this.playerBullets, 0); // Clear the first (oldest)
                }
                // pop first available primitive
                let primIndex = this.bulletPrimitives.pop();
                let newBullet = new FiredBullet(this.scene, primIndex, engineState.hypercamera_T.origin(), engineState.camstand_T.transform_vector(new Vector4D(1, 0, 0, 0)), engineState.physics_time_s);
                this.playerBullets.push(newBullet);
                this.bulletCooldownLastFiredTime = engineState.physics_time_s;
            }
        }
        // Update all live bullets (while as the list size changes mid loop)
        let bullet_i = 0;
        while (true) {
            if (bullet_i >= this.playerBullets.length) {
                break;
            }
            // this may delete the bullet
            this.playerBullets[bullet_i].updateBullet(engineState.physics_time_s, this.bulletPrimitives, this.playerBullets, bullet_i);
            // increment
            bullet_i++;
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
        if (!this.GOD_MODE) {
            for (let i = 0; i < engineState.scene.visibleHyperobjects.length; i++) {
                const obj = engineState.scene.visibleHyperobjects[i];
                if (obj.collider) {
                    obj.collider.constrainTransform(engineState.camstand_T);
                }
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