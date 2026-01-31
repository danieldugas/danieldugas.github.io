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
// One hole corridor model
// Per room Floor
// Falling logic
// Enemy models
// Texturing

// Modelling tool?

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
        this.GOD_MODE = true;
        this.playerSpeed = 0.1;
        this.isFirstStep = true; // Used for debugging
        this.bulletCooldownLastFiredTime = 0;

        // Eye opening animation state
        this.playerEyeMode = "Lidded"; // Lidded or WideOpen
        this.eyeAnimationProgress = 0; // 0 to 1 within current phase
        this.eyeAnimationSpeed = 2.0; // How fast the animation progresses
        this.lastEyeUpdateTime = 0;
        this.rKeyWasPressed = false;

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
        

        // Debug panel
        this.pendingTeleport = null;
        this.createDebugPanel();
    }

    createDebugPanel() {
        // Create container
        const panel = document.createElement("div");
        panel.id = "debug_panel";
        panel.style.position = "absolute";
        panel.style.bottom = "10px";
        panel.style.left = "10px";
        panel.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        panel.style.color = "#9c9c9c";
        panel.style.fontFamily = "monospace";
        panel.style.fontSize = "12px";
        panel.style.padding = "8px";
        panel.style.borderRadius = "4px";
        panel.style.zIndex = "1000";
        panel.style.userSelect = "none";

        // Create header (collapsible toggle)
        const header = document.createElement("div");
        header.style.cursor = "pointer";
        header.style.fontWeight = "bold";
        header.style.marginBottom = "8px";
        header.innerHTML = "▼ Debug Panel";

        // Create content container
        const content = document.createElement("div");
        content.id = "debug_panel_content";

        // Toggle collapse
        let collapsed = false;
        header.addEventListener("click", () => {
            collapsed = !collapsed;
            content.style.display = collapsed ? "none" : "block";
            header.innerHTML = collapsed ? "▶ Debug Panel" : "▼ Debug Panel";
        });

        // GOD_MODE toggle
        const godModeRow = document.createElement("div");
        godModeRow.style.marginBottom = "8px";
        const godModeCheckbox = document.createElement("input");
        godModeCheckbox.type = "checkbox";
        godModeCheckbox.id = "god_mode_checkbox";
        godModeCheckbox.checked = this.GOD_MODE;
        godModeCheckbox.addEventListener("change", (e) => {
            this.GOD_MODE = e.target.checked;
        });
        const godModeLabel = document.createElement("label");
        godModeLabel.htmlFor = "god_mode_checkbox";
        godModeLabel.innerHTML = " GOD_MODE";
        godModeRow.appendChild(godModeCheckbox);
        godModeRow.appendChild(godModeLabel);
        content.appendChild(godModeRow);

        // Player speed slider
        const speedRow = document.createElement("div");
        speedRow.style.marginBottom = "8px";
        const speedLabel = document.createElement("label");
        speedLabel.innerHTML = "Speed: ";
        const speedValue = document.createElement("span");
        speedValue.innerHTML = this.playerSpeed.toFixed(2);
        const speedSlider = document.createElement("input");
        speedSlider.type = "range";
        speedSlider.min = "0.01";
        speedSlider.max = "1.0";
        speedSlider.step = "0.01";
        speedSlider.value = this.playerSpeed;
        speedSlider.style.width = "100%";
        speedSlider.style.marginTop = "4px";
        speedSlider.addEventListener("input", (e) => {
            this.playerSpeed = parseFloat(e.target.value);
            speedValue.innerHTML = this.playerSpeed.toFixed(2);
        });
        speedRow.appendChild(speedLabel);
        speedRow.appendChild(speedValue);
        speedRow.appendChild(speedSlider);
        content.appendChild(speedRow);

        // Teleport section
        const teleportLabel = document.createElement("div");
        teleportLabel.innerHTML = "Teleport to:";
        teleportLabel.style.marginBottom = "4px";
        content.appendChild(teleportLabel);

        // Room positions (x, y, z, w)
        const rooms = [
            { name: "Spawn", pos: [0, 0, 0, 0] },
            { name: "Room 1", pos: [10, 0, 0, 0] },
            { name: "Room 2", pos: [20, 0, 0, 0] },
            { name: "Room 3", pos: [30, 0, 0, 0] },
            { name: "Corridor 1", pos: [0, 10, 0, 0] },
            { name: "Corridor 2", pos: [0, 20, 0, 0] },
        ];

        rooms.forEach(room => {
            const btn = document.createElement("button");
            btn.innerHTML = room.name;
            btn.style.display = "block";
            btn.style.marginBottom = "4px";
            btn.style.padding = "4px 8px";
            btn.style.cursor = "pointer";
            btn.style.backgroundColor = "#333";
            btn.style.color = "#9c9c9c";
            btn.style.border = "1px solid #555";
            btn.style.borderRadius = "2px";
            btn.style.width = "100%";
            btn.addEventListener("click", () => {
                this.teleportTo(room.pos[0], room.pos[1], room.pos[2], room.pos[3]);
            });
            content.appendChild(btn);
        });

        panel.appendChild(header);
        panel.appendChild(content);
        document.body.appendChild(panel);

        this.debugPanel = panel;
    }

    teleportTo(x, y, z, w) {
        this.pendingTeleport = { x, y, z, w };
    }

    //Called by the hyperengine at every timestep
    updatePlayerControls(engineState) {
        // Apply pending teleport from debug panel
        if (this.pendingTeleport) {
            engineState.camstand_T.matrix[0][4] = this.pendingTeleport.x;
            engineState.camstand_T.matrix[1][4] = this.pendingTeleport.y;
            engineState.camstand_T.matrix[2][4] = this.pendingTeleport.z;
            engineState.camstand_T.matrix[3][4] = this.pendingTeleport.w;
            this.pendingTeleport = null;
        }

        // First Step callback (debugging)
        if (this.isFirstStep) {
            this.isFirstStep = false;
            if (this.onFirstStepCallback) { this.onFirstStepCallback(engineState); }
        }
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

        const moveSpeed = this.playerSpeed;
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
        // R key: Eye mode toggle with easing animation
        this.updateEyeMode(engineState);
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

    updateEyeMode(engineState) {
        const dt = engineState.physics_time_s - this.lastEyeUpdateTime;
        this.lastEyeUpdateTime = engineState.physics_time_s;

        const rKeyPressed = engineState.keys['r'];

        let changed = false;

        // Detect key press/release transitions
        if (rKeyPressed && !this.rKeyWasPressed) {
            // R just pressed - start opening animation
            this.playerEyeMode = "Lidded->WideOpen";
            // If we were closing, open from the current progress
            if (this.eyeAnimationProgress !== 0) {
                this.eyeAnimationProgress = 1.0 - this.eyeAnimationProgress;
            }
            changed = true;
        } else if (!rKeyPressed && this.rKeyWasPressed) {
            // R just released - start closing animation
            this.playerEyeMode = "WideOpen->Lidded";
            // If we were opening, close from the current progress
            if (this.eyeAnimationProgress !== 0) {
                this.eyeAnimationProgress = 1.0 - this.eyeAnimationProgress;
            }
            changed = true;
        }
        this.rKeyWasPressed = rKeyPressed;

        // Progress the animation
        if (this.playerEyeMode === "Lidded->WideOpen" || this.playerEyeMode === "WideOpen->Lidded") {
            this.eyeAnimationProgress += dt * this.eyeAnimationSpeed;

            const liddedCamRot = [-Math.PI / 2.0, 0.1];
            const wideOpenCamRot = [-Math.PI / 2.0, 1.3];

            if (this.eyeAnimationProgress >= 1.0) {
                this.eyeAnimationProgress = 0;
                // Advance to next phase
                if (this.playerEyeMode === "Lidded->WideOpen") {
                    this.playerEyeMode = "WideOpen";
                    engineState.SENSOR_MODE = 3.0;
                } else if (this.playerEyeMode === "WideOpen->Lidded") {
                    this.playerEyeMode = "Lidded";
                    engineState.SENSOR_MODE = 2.0;
                }
            } else {
                // Set the sensor mode according to current anim
                const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                const easedProgress = easeInOut(this.eyeAnimationProgress);
                if (this.playerEyeMode === "Lidded->WideOpen") {
                    engineState.SENSOR_MODE = 2.0 + 2.99 * easedProgress;
                    // update camera 
                    engineState.sensorCamRotX = liddedCamRot[0] + (wideOpenCamRot[0] - liddedCamRot[0]) * easedProgress;
                    engineState.sensorCamRotY = liddedCamRot[1] + (wideOpenCamRot[1] - liddedCamRot[1]) * easedProgress;
                } else if (this.playerEyeMode === "WideOpen->Lidded") {
                    engineState.SENSOR_MODE = 2.99 - 0.99 * easedProgress;
                    // update Camera
                    engineState.sensorCamRotX = wideOpenCamRot[0] + (liddedCamRot[0] - wideOpenCamRot[0]) * easedProgress;
                    engineState.sensorCamRotY = wideOpenCamRot[1] + (liddedCamRot[1] - wideOpenCamRot[1]) * easedProgress;
                }
            }

            changed = true;
        }

        // Debug
        if (true && changed) {
            // log mode, progress, and sensormode
            console.log(this.playerEyeMode, this.eyeAnimationProgress, engineState.SENSOR_MODE);

        }
    }

}