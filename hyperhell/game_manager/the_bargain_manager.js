import { Transform4D, Vector4D } from '../../4d_creatures/hyperengine/transform4d.js';
import { createBullet } from '../models/bullet.js';
import { createCrawler } from '../models/crawler.js';
import { createOphane } from '../models/ophane.js';
import { createDamned, Hitbox } from '../models/damned.js';
import { createGem } from '../models/gem.js';
// TODOs:
// Jump down / Falling logic [DONE]
// Lava damage
// Death / reset
// Enemy models
// Visible enemy damage
// Boss healthbar
// Door close
// Dialogue
// Tips
// Texturing
// Per room Floor shader
// Audio

// Custom controls
//      (3D / 4D upgrade)
//       Shooting and guns
//       Jumping and multiple heights
// Enemy spawning logic and AI
// Environment logic (doors, keys, floor damage)
// Inventory
// Player Health
// Dialogue overlays
// Game Over 

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

        this.bulletVelocity = 10.0;
        this.bulletRadius = 0.5;

        // Move primitive to origin
        this.scene.visibleHyperobjects[primitiveIndex].pose.setTranslation(newPos);
        this.scene.visibleHyperobjects[primitiveIndex].pose.matrix[0][0] = this.bulletRadius;
        this.scene.visibleHyperobjects[primitiveIndex].pose.matrix[1][1] = this.bulletRadius;
        this.scene.visibleHyperobjects[primitiveIndex].pose.matrix[2][2] = this.bulletRadius;
        this.scene.visibleHyperobjects[primitiveIndex].pose.matrix[3][3] = this.bulletRadius;
    }

    currentPos() {
        return this.scene.visibleHyperobjects[this.primitiveIndex].pose.origin();
    }

    updateBullet(physics_time_s, bulletPrimitives, parentList, indexInParentList) {
        // move by direction * velocity * dt
        let newPos = this.lastUpdatePos.add(this.firedDirection.multiply_by_scalar(this.bulletVelocity * (physics_time_s - this.lastUpdateTime)));
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
        // Move pose to far away
        this.scene.visibleHyperobjects[this.primitiveIndex].pose.setTranslation(new Vector4D([0, 0, -10000, 0]));
        // Return primitive to pool
        bulletPrimitives.push(this.primitiveIndex);
        // Remove self from parentList
        parentList.splice(indexInParentList, 1);
    }
}

class ShadeEnemy {
    constructor(primitiveIndex, returnToPose) {
        this.primitiveIndex = primitiveIndex;
        this.returnToPose = returnToPose;

        // enemy state
        this.hp = 50;
    }

    updateShade(gameState, engineState) {
        // Check own hitbox against player bullets
        let primitive = engineState.scene.visibleHyperobjects[this.primitiveIndex];
        let i = 0;
        while (true) {
            if (i >= gameState.playerBullets.length) { break; }
            let playerBullet = gameState.playerBullets[i];
            if (primitive.hitbox.checkBulletCollision(playerBullet.currentPos(), primitive.pose, playerBullet.bulletRadius)) {
                this.hp -= 10; // hit
                playerBullet.destroyBullet(gameState.bulletPrimitives, gameState.playerBullets, i);
            }
            i++;
        }

        // Check own hitbox against player
        const playerRadius = 1.0; // TODO use more precise hitbox
        if (primitive.hitbox.checkBulletCollision(engineState.hypercamera_T.origin(), primitive.pose, playerRadius)) {
            if (gameState.playerInvulnLastHitTime + gameState.playerInvulnTime < engineState.physics_time_s) {
                gameState.playerHealth -= 10;
                gameState.playerInvulnLastHitTime = engineState.physics_time_s;
            }
        }

        const shadeMoveSpeed = 0.05;
        const shadeRotationSpeed = 0.005;
        const shadeAggroDistance = 10.0;
        const smolDist = 0.01;
        // Move towards the player
        let playerPos = engineState.hypercamera_T.origin();
        let delta = playerPos.subtract(primitive.pose.origin());
        if (delta.magnitude() < smolDist) { // do nothing if close to the player
        } else if (delta.magnitude() < shadeAggroDistance) {
            let direction = delta.normalize();
            direction.z = 0;
            let newPos = primitive.pose.origin().add(direction.multiply_by_scalar(shadeMoveSpeed));
            primitive.pose.setTranslation(newPos);
            // Slowly rotate along XY plane towards the player (until creature X is aligned with direction)
            let angle = Math.atan2(direction.y, direction.x);
            let otherAngle = Math.atan2(primitive.pose.matrix[1][0], primitive.pose.matrix[0][0]);
            let rotation = angle - otherAngle;
            if (rotation > Math.PI) { rotation -= Math.PI * 2; }
            if (rotation < -Math.PI) { rotation += Math.PI * 2; }
            if (Math.abs(rotation) < smolDist) { rotation = 0; }
            let newRotation = -Math.sign(rotation) * shadeRotationSpeed;
            primitive.pose.rotate_self_by_delta('XY', newRotation, false);
            // Apply colliders to self
            for (let i = 0; i < engineState.scene.visibleHyperobjects.length; i++) {
                const obj = engineState.scene.visibleHyperobjects[i];
                if (obj.collider) {
                    obj.collider.constrainTransform(primitive.pose);
                }
            }
        } else {
            // return home
            let homeDelta = this.returnToPose.origin().subtract(primitive.pose.origin());
            if (homeDelta.magnitude() < smolDist) {
            } else {
                let direction = homeDelta.normalize();
                let newPos = primitive.pose.origin().add(direction.multiply_by_scalar(shadeMoveSpeed));
                primitive.pose.setTranslation(newPos);
            }
        }


        // Die if hp <= 0
        if (this.hp <= 0) {
            primitive.pose.setTranslation(new Vector4D([0, 0, -10000, 0]));
        }
        
    }
} // ShadeEnemy

class CrawlerEnemy {
    constructor(primitiveIndex, homePose, volumeMin, volumeMax) {
        this.primitiveIndex = primitiveIndex;
        this.homePose = homePose;
        this.volumeMin = volumeMin;
        this.volumeMax = volumeMax;

        this.hp = 80;
        this.state = 'idle'; // 'idle', 'moving', 'shooting'
        this.lastActionTime = 0;
        this.idleDuration = 2.0; // seconds between actions
        this.moveSpeed = 0.03;
        this.rotateSpeed = 0.01;
        this.targetPos = null;
    }

    updateCrawler(gameState, engineState) {
        let primitive = engineState.scene.visibleHyperobjects[this.primitiveIndex];

        // Check own hitbox against player bullets
        let i = 0;
        while (i < gameState.playerBullets.length) {
            let playerBullet = gameState.playerBullets[i];
            if (primitive.hitbox && primitive.hitbox.checkBulletCollision(playerBullet.currentPos(), primitive.pose, playerBullet.bulletRadius)) {
                this.hp -= 10;
                playerBullet.destroyBullet(gameState.bulletPrimitives, gameState.playerBullets, i);
            } else {
                i++;
            }
        }

        // Check own hitbox against player
        const playerRadius = 1.0;
        if (primitive.hitbox && primitive.hitbox.checkBulletCollision(engineState.hypercamera_T.origin(), primitive.pose, playerRadius)) {
            if (gameState.playerInvulnLastHitTime + gameState.playerInvulnTime < engineState.physics_time_s) {
                gameState.playerHealth -= 10;
                gameState.playerInvulnLastHitTime = engineState.physics_time_s;
            }
        }

        // Die if hp <= 0
        if (this.hp <= 0) {
            primitive.pose.setTranslation(new Vector4D([0, 0, -10000, 0]));
            return;
        }

        const smolDist = 0.5;
        const crawlerAggroDistance = 15.0;

        if (this.state === 'idle') {
            if (engineState.physics_time_s - this.lastActionTime > this.idleDuration) {
                // Pick a random point in the constrained volume
                this.targetPos = new Vector4D(
                    this.volumeMin.x + Math.random() * (this.volumeMax.x - this.volumeMin.x),
                    this.volumeMin.y + Math.random() * (this.volumeMax.y - this.volumeMin.y),
                    0,
                    this.volumeMin.w + Math.random() * (this.volumeMax.w - this.volumeMin.w)
                );
                this.state = 'moving';
            }
        } else if (this.state === 'moving') {
            let delta = this.targetPos.subtract(primitive.pose.origin());
            delta.z = 0;
            if (delta.magnitude() < smolDist) {
                // Arrived at target, switch to shooting
                this.state = 'shooting';
                this.lastActionTime = engineState.physics_time_s;
            } else {
                let direction = delta.normalize();
                let newPos = primitive.pose.origin().add(direction.multiply_by_scalar(this.moveSpeed));
                primitive.pose.setTranslation(newPos);

                // Rotate towards movement direction in XY plane
                let angle = Math.atan2(direction.y, direction.x);
                let otherAngle = Math.atan2(primitive.pose.matrix[1][0], primitive.pose.matrix[0][0]);
                let rotation = angle - otherAngle;
                if (rotation > Math.PI) rotation -= Math.PI * 2;
                if (rotation < -Math.PI) rotation += Math.PI * 2;
                if (Math.abs(rotation) > 0.01) {
                    primitive.pose.rotate_self_by_delta('XY', -Math.sign(rotation) * this.rotateSpeed, false);
                }

                // Apply colliders
                for (let j = 0; j < engineState.scene.visibleHyperobjects.length; j++) {
                    const obj = engineState.scene.visibleHyperobjects[j];
                    if (obj.collider) {
                        obj.collider.constrainTransform(primitive.pose);
                    }
                }
            }
        } else if (this.state === 'shooting') {
            // Rotate towards player
            let playerPos = engineState.hypercamera_T.origin();
            let delta = playerPos.subtract(primitive.pose.origin());
            delta.z = 0;
            if (delta.magnitude() > 0.01) {
                let direction = delta.normalize();
                let angle = Math.atan2(direction.y, direction.x);
                let otherAngle = Math.atan2(primitive.pose.matrix[1][0], primitive.pose.matrix[0][0]);
                let rotation = angle - otherAngle;
                if (rotation > Math.PI) rotation -= Math.PI * 2;
                if (rotation < -Math.PI) rotation += Math.PI * 2;
                if (Math.abs(rotation) > 0.01) {
                    primitive.pose.rotate_self_by_delta('XY', -Math.sign(rotation) * this.rotateSpeed, false);
                }
            }

            // Fire bullet at player after aiming delay
            if (engineState.physics_time_s - this.lastActionTime > 0.5) {
                if (delta.magnitude() < crawlerAggroDistance) {
                    this.fireBulletAtPlayer(gameState, engineState);
                }
                this.state = 'idle';
                this.lastActionTime = engineState.physics_time_s;
            }
        }
    }

    fireBulletAtPlayer(gameState, engineState) {
        let primitive = engineState.scene.visibleHyperobjects[this.primitiveIndex];
        let playerPos = engineState.hypercamera_T.origin();
        let bulletOrigin = primitive.pose.origin();
        let direction = playerPos.subtract(bulletOrigin);
        direction.z = 0;
        if (direction.magnitude() < 0.01) return;
        direction = direction.normalize();

        if (gameState.enemyBulletPrimitives.length === 0) return;
        let primIndex = gameState.enemyBulletPrimitives.pop();
        let newBullet = new FiredBullet(
            engineState.scene, primIndex,
            bulletOrigin, direction,
            engineState.physics_time_s
        );
        newBullet.bulletVelocity = 5.0; // slower than player bullets
        gameState.enemyBullets.push(newBullet);
    }
} // CrawlerEnemy

class OphaneEnemy {
    constructor(primitiveIndex, homePose, volumeCenter, volumeRadius) {
        this.primitiveIndex = primitiveIndex;
        this.homePose = homePose;
        this.volumeCenter = volumeCenter;
        this.volumeRadius = volumeRadius;

        this.hp = 80;
        this.state = 'idle'; // 'idle', 'moving', 'shooting'
        this.lastActionTime = 0;
        this.idleDuration = 2.0; // seconds between actions
        this.moveSpeed = 0.03;
        this.rotateSpeed = 0.01;
        this.targetPos = null;
    }

    updateOphane(gameState, engineState) {
        let primitive = engineState.scene.visibleHyperobjects[this.primitiveIndex];

        // Check own hitbox against player bullets
        let i = 0;
        while (i < gameState.playerBullets.length) {
            let playerBullet = gameState.playerBullets[i];
            if (primitive.hitbox && primitive.hitbox.checkBulletCollision(playerBullet.currentPos(), primitive.pose, playerBullet.bulletRadius)) {
                this.hp -= 10;
                playerBullet.destroyBullet(gameState.bulletPrimitives, gameState.playerBullets, i);
            } else {
                i++;
            }
        }

        // Check own hitbox against player
        const playerRadius = 1.0;
        if (primitive.hitbox && primitive.hitbox.checkBulletCollision(engineState.hypercamera_T.origin(), primitive.pose, playerRadius)) {
            if (gameState.playerInvulnLastHitTime + gameState.playerInvulnTime < engineState.physics_time_s) {
                gameState.playerHealth -= 10;
                gameState.playerInvulnLastHitTime = engineState.physics_time_s;
            }
        }

        // Die if hp <= 0
        if (this.hp <= 0) {
            primitive.pose.setTranslation(new Vector4D([0, 0, -10000, 0]));
            return;
        }

        const smolDist = 0.5;
        const ophaneAggroDistance = this.volumeRadius;

        if (this.state === 'idle') {
            if (engineState.physics_time_s - this.lastActionTime > this.idleDuration) {
                // Pick a random point in the constrained volume
                this.targetPos = new Vector4D(
                    this.volumeCenter.x + Math.random() * this.volumeRadius,
                    this.volumeCenter.y + Math.random() * this.volumeRadius,
                    0,
                    this.volumeCenter.w + Math.random() * this.volumeRadius
                );
                this.state = 'moving';
            }
        } else if (this.state === 'moving') {
            let delta = this.targetPos.subtract(primitive.pose.origin());
            delta.z = 0;
            if (delta.magnitude() < smolDist) {
                // Arrived at target, switch to shooting
                this.state = 'shooting';
                this.lastActionTime = engineState.physics_time_s;
            } else {
                let direction = delta.normalize();
                let newPos = primitive.pose.origin().add(direction.multiply_by_scalar(this.moveSpeed));
                primitive.pose.setTranslation(newPos);

                // Rotate towards movement direction in XY plane
                let angle = Math.atan2(direction.y, direction.x);
                let otherAngle = Math.atan2(primitive.pose.matrix[1][0], primitive.pose.matrix[0][0]);
                let rotation = angle - otherAngle;
                if (rotation > Math.PI) rotation -= Math.PI * 2;
                if (rotation < -Math.PI) rotation += Math.PI * 2;
                if (Math.abs(rotation) > 0.01) {
                    primitive.pose.rotate_self_by_delta('XY', -Math.sign(rotation) * this.rotateSpeed, false);
                }

                // Apply colliders
                for (let j = 0; j < engineState.scene.visibleHyperobjects.length; j++) {
                    const obj = engineState.scene.visibleHyperobjects[j];
                    if (obj.collider) {
                        obj.collider.constrainTransform(primitive.pose);
                    }
                }
            }
        } else if (this.state === 'shooting') {
            // Rotate towards player
            let playerPos = engineState.hypercamera_T.origin();
            let delta = playerPos.subtract(primitive.pose.origin());
            delta.z = 0;
            if (delta.magnitude() > 0.01) {
                let direction = delta.normalize();
                let angle = Math.atan2(direction.y, direction.x);
                let otherAngle = Math.atan2(primitive.pose.matrix[1][0], primitive.pose.matrix[0][0]);
                let rotation = angle - otherAngle;
                if (rotation > Math.PI) rotation -= Math.PI * 2;
                if (rotation < -Math.PI) rotation += Math.PI * 2;
                if (Math.abs(rotation) > 0.01) {
                    primitive.pose.rotate_self_by_delta('XY', -Math.sign(rotation) * this.rotateSpeed, false);
                }
            }

            // Fire bullet at player after aiming delay
            if (engineState.physics_time_s - this.lastActionTime > 0.5) {
                if (delta.magnitude() < ophaneAggroDistance) {
                    this.fireBulletAtPlayer(gameState, engineState);
                }
                this.state = 'idle';
                this.lastActionTime = engineState.physics_time_s;
            }
        }
    }

    fireBulletAtPlayer(gameState, engineState) {
        let primitive = engineState.scene.visibleHyperobjects[this.primitiveIndex];
        let playerPos = engineState.hypercamera_T.origin();
        let bulletOrigin = primitive.pose.origin();
        let direction = playerPos.subtract(bulletOrigin);
        direction.z = 0;
        if (direction.magnitude() < 0.01) return;
        direction = direction.normalize();

        if (gameState.enemyBulletPrimitives.length === 0) return;
        let primIndex = gameState.enemyBulletPrimitives.pop();
        let newBullet = new FiredBullet(
            engineState.scene, primIndex,
            bulletOrigin, direction,
            engineState.physics_time_s
        );
        newBullet.bulletVelocity = 5.0; // slower than player bullets
        gameState.enemyBullets.push(newBullet);
    }
} // OphaneEnemy

class GameState {
    constructor() {
        // state
        this.GOD_MODE = false;
        this.playerSpeed = 0.1;
        this.isFirstStep = true; // Used for debugging
        this.bulletCooldownLastFiredTime = 0;
        // Player stats
        this.playerHealth = 100;
        this.playerMaxHealth = 100;
        this.playerAmmo = 50;
        this.playerMaxAmmo = 100;
        this.playerInvulnLastHitTime = 0;
        this.playerInvulnTime = 1.0;
        // Eye opening animation state
        this.playerEyeMode = "WideOpen->Lidded"; // Lidded or WideOpen
        this.eyeAnimationProgress = 0; // 0 to 1 within current phase
        this.eyeAnimationSpeed = 4.0; // How fast the animation progresses
        this.lastEyeUpdateTime = 0;
        this.rKeyWasPressed = false;
        // bullets
        this.playerBullets = [];
        this.bulletPrimitives = [];
        // enemies
        this.shadeEnemies = [];
        this.crawlerEnemies = [];
        this.ophaneEnemies = [];
        // enemy bullets
        this.enemyBullets = [];
        this.enemyBulletPrimitives = [];
        // Fall tracking
        this.previousFloorHeight = 0;
        this.playerIsFalling = false;
        this.fallStartTime = 0;
        this.fallFromZ = 0; // absolute Z at start of fall
        // Debug
        this.pendingTeleport = null;
    }
}

export class TheBargainManager {
    constructor(scene, poIs) {
        this.scene = scene;
        this.poIs = poIs;
        // State
        this.gameState = new GameState();

        // Pre-allocate 100 bullets
        // createHypersphere(size, color)
        for (let i = 0; i < 100; i++) {
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
            this.gameState.bulletPrimitives.push(this.scene.visibleHyperobjects.length);
            this.scene.visibleHyperobjects.push(sphere);
        }
        
        // Pre-allocate 10 Shades, 10 Crawlers, 5 Ophanes
        for (let i = 0; i < this.poIs.shadeSpawns.length; i++) {
            let p = this.poIs.shadeSpawns[i];
            let pose = new Transform4D([
                [1, 0, 0, 0, p.x],
                [0, 1, 0, 0, p.y],
                [0, 0, 1, 0, p.z],
                [0, 0, 0, 1, p.w],
                [0, 0, 0, 0, 1]
            ])
            let creature = createDamned();
            creature.pose = pose;
            let primitiveIndex = this.scene.visibleHyperobjects.length; // this line must be before pushing to scene
            this.gameState.shadeEnemies.push(new ShadeEnemy(primitiveIndex, pose.clone()));
            this.scene.visibleHyperobjects.push(creature);
        }

        // Pre-allocate 50 enemy bullets (red)
        for (let i = 0; i < 50; i++) {
            let pose = new Transform4D([
                [1, 0, 0, 0, 0],
                [0, 1, 0, 0, 0],
                [0, 0, 1, 0, -10000],
                [0, 0, 0, 1, 0],
                [0, 0, 0, 0, 1]
            ]);
            let sphere = createBullet(1, 0xff0000, pose);
            this.gameState.enemyBulletPrimitives.push(this.scene.visibleHyperobjects.length);
            this.scene.visibleHyperobjects.push(sphere);
        }

        // Pre-allocate Crawlers
        for (let i = 0; i < this.poIs.crawlerSpawns.length; i++) {
            let spawn = this.poIs.crawlerSpawns[i];
            let p = spawn.pos;
            let pose = new Transform4D([
                [1, 0, 0, 0, p.x],
                [0, 1, 0, 0, p.y],
                [0, 0, 1, 0, p.z],
                [0, 0, 0, 1, p.w],
                [0, 0, 0, 0, 1]
            ]);
            let creature = createCrawler();
            creature.pose = pose;
            creature.hitbox = new Hitbox(new Vector4D(-2, -2, -1, -2), new Vector4D(2, 2, 2, 2));
            let primitiveIndex = this.scene.visibleHyperobjects.length;
            this.gameState.crawlerEnemies.push(new CrawlerEnemy(primitiveIndex, pose.clone(), spawn.volumeMin, spawn.volumeMax));
            this.scene.visibleHyperobjects.push(creature);
        }

        // Pre-allocate Ophanes
        for (let i = 0; i < this.poIs.ophaneSpawns.length; i++) {
            let spawn = this.poIs.ophaneSpawns[i];
            let p = spawn.pos;
            let pose = new Transform4D([
                [4, 0, 0, 0, p.x],
                [0, 4, 0, 0, p.y],
                [0, 0, 4, 0, p.z],
                [0, 0, 0, 4, p.w],
                [0, 0, 0, 0, 1]
            ]);
            let creature = createOphane();
            creature.pose = pose;
            creature.hitbox = new Hitbox(new Vector4D(-2, -2, -1, -2), new Vector4D(2, 2, 2, 2));
            let primitiveIndex = this.scene.visibleHyperobjects.length;
            this.gameState.ophaneEnemies.push(new OphaneEnemy(primitiveIndex, pose.clone(), spawn.volumeCenter, spawn.volumeRadius));
            this.scene.visibleHyperobjects.push(creature);
            
        }

        // End gem
        if (true) {
            const EndGemH = 4.0;
            const EndGemZ = 3.0;
            const EndGemW = 1.0;
            const EndGemC = this.poIs.room6Center.add(new Vector4D(0, 0, EndGemZ, 0));
            let gemPose = new Transform4D([
                [EndGemW/2.0, 0, 0, 0, EndGemC.x],
                [0, EndGemW/2.0, 0, 0, EndGemC.y],
                [0, 0, EndGemH/6.0, 0, EndGemC.z],
                [0, 0, 0, 1, EndGemC.w],
                [0, 0, 0, 0, 1]
            ]);
            let gem = createGem(gemPose, 0xffff00);
            this.endGemPrimitiveIndex = this.scene.visibleHyperobjects.length;
            this.endGemBaseZ = EndGemC.z;
            this.scene.visibleHyperobjects.push(gem);
        }

        // Debug panel
        this.createDebugPanel();
        this.createHUDBar();
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
        godModeCheckbox.checked = this.gameState.GOD_MODE;
        godModeCheckbox.addEventListener("change", (e) => {
            this.gameState.GOD_MODE = e.target.checked;
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
        speedValue.innerHTML = this.gameState.playerSpeed.toFixed(2);
        const speedSlider = document.createElement("input");
        speedSlider.type = "range";
        speedSlider.min = "0.01";
        speedSlider.max = "1.0";
        speedSlider.step = "0.01";
        speedSlider.value = this.gameState.playerSpeed;
        speedSlider.style.width = "100%";
        speedSlider.style.marginTop = "4px";
        speedSlider.addEventListener("input", (e) => {
            this.gameState.playerSpeed = parseFloat(e.target.value);
            speedValue.innerHTML = this.gameState.playerSpeed.toFixed(2);
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
        const rooms = this.poIs.roomCenters;

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
                this.teleportTo(room.pos.x, room.pos.y, room.pos.z, room.pos.w);
            });
            content.appendChild(btn);
        });

        panel.appendChild(header);
        panel.appendChild(content);
        document.body.appendChild(panel);

        this.debugPanel = panel;
    }

    createHUDBar() {
        // Main HUD container
        const hud = document.createElement("div");
        hud.id = "hud_bar";
        hud.style.position = "absolute";
        hud.style.bottom = "20px";
        hud.style.left = "50%";
        hud.style.transform = "translateX(-50%)";
        hud.style.backgroundColor = "rgba(20, 20, 20, 0.85)";
        hud.style.border = "2px solid #444";
        hud.style.borderRadius = "4px";
        hud.style.padding = "8px 16px";
        hud.style.display = "flex";
        hud.style.alignItems = "center";
        hud.style.gap = "16px";
        hud.style.zIndex = "999";
        hud.style.fontFamily = "monospace";
        hud.style.color = "#ccc";
        hud.style.userSelect = "none";

        // Left icon (player face/status)
        const leftIcon = document.createElement("div");
        leftIcon.id = "hud_left_icon";
        leftIcon.style.width = "32px";
        leftIcon.style.height = "32px";
        leftIcon.style.backgroundColor = "#333";
        leftIcon.style.border = "1px solid #555";
        leftIcon.style.borderRadius = "4px";
        leftIcon.style.display = "flex";
        leftIcon.style.alignItems = "center";
        leftIcon.style.justifyContent = "center";
        leftIcon.style.fontSize = "24px";
        leftIcon.innerHTML = `<img src="../icons/dimensional_eye_half_lidded_64x64.png"></img>`;
        hud.appendChild(leftIcon);

        // Health bar container
        const healthContainer = document.createElement("div");
        healthContainer.style.display = "flex";
        healthContainer.style.flexDirection = "column";
        healthContainer.style.gap = "2px";

        const healthLabel = document.createElement("div");
        healthLabel.style.fontSize = "10px";
        healthLabel.style.color = "#888";
        healthLabel.innerHTML = "HEALTH";

        const healthBarOuter = document.createElement("div");
        healthBarOuter.style.width = "120px";
        healthBarOuter.style.height = "16px";
        healthBarOuter.style.backgroundColor = "#222";
        healthBarOuter.style.border = "1px solid #555";
        healthBarOuter.style.borderRadius = "2px";
        healthBarOuter.style.overflow = "hidden";
        healthBarOuter.style.position = "relative";

        const healthBarInner = document.createElement("div");
        healthBarInner.id = "hud_health_bar";
        healthBarInner.style.width = "100%";
        healthBarInner.style.height = "100%";
        healthBarInner.style.backgroundColor = "#c22";
        healthBarInner.style.transition = "width 0.2s";

        const healthValue = document.createElement("div");
        healthValue.id = "hud_health_value";
        healthValue.style.position = "absolute";
        healthValue.style.top = "0";
        healthValue.style.left = "0";
        healthValue.style.width = "100%";
        healthValue.style.height = "100%";
        healthValue.style.display = "flex";
        healthValue.style.alignItems = "center";
        healthValue.style.justifyContent = "center";
        healthValue.style.fontSize = "11px";
        healthValue.style.fontWeight = "bold";
        healthValue.style.color = "#fff";
        healthValue.style.textShadow = "1px 1px 1px #000";
        healthValue.innerHTML = "100";

        healthBarOuter.appendChild(healthBarInner);
        healthBarOuter.appendChild(healthValue);
        healthContainer.appendChild(healthLabel);
        healthContainer.appendChild(healthBarOuter);
        hud.appendChild(healthContainer);

        // Ammo bar container
        const ammoContainer = document.createElement("div");
        ammoContainer.style.display = "flex";
        ammoContainer.style.flexDirection = "column";
        ammoContainer.style.gap = "2px";

        const ammoLabel = document.createElement("div");
        ammoLabel.style.fontSize = "10px";
        ammoLabel.style.color = "#888";
        ammoLabel.innerHTML = "AMMO";

        const ammoBarOuter = document.createElement("div");
        ammoBarOuter.style.width = "120px";
        ammoBarOuter.style.height = "16px";
        ammoBarOuter.style.backgroundColor = "#222";
        ammoBarOuter.style.border = "1px solid #555";
        ammoBarOuter.style.borderRadius = "2px";
        ammoBarOuter.style.overflow = "hidden";
        ammoBarOuter.style.position = "relative";

        const ammoBarInner = document.createElement("div");
        ammoBarInner.id = "hud_ammo_bar";
        ammoBarInner.style.width = "50%";
        ammoBarInner.style.height = "100%";
        ammoBarInner.style.backgroundColor = "#c90";
        ammoBarInner.style.transition = "width 0.2s";

        const ammoValue = document.createElement("div");
        ammoValue.id = "hud_ammo_value";
        ammoValue.style.position = "absolute";
        ammoValue.style.top = "0";
        ammoValue.style.left = "0";
        ammoValue.style.width = "100%";
        ammoValue.style.height = "100%";
        ammoValue.style.display = "flex";
        ammoValue.style.alignItems = "center";
        ammoValue.style.justifyContent = "center";
        ammoValue.style.fontSize = "11px";
        ammoValue.style.fontWeight = "bold";
        ammoValue.style.color = "#fff";
        ammoValue.style.textShadow = "1px 1px 1px #000";
        ammoValue.innerHTML = "50";

        ammoBarOuter.appendChild(ammoBarInner);
        ammoBarOuter.appendChild(ammoValue);
        ammoContainer.appendChild(ammoLabel);
        ammoContainer.appendChild(ammoBarOuter);
        hud.appendChild(ammoContainer);

        // Weapon icon (right side)
        const weaponIcon = document.createElement("div");
        weaponIcon.id = "hud_weapon_icon";
        weaponIcon.style.width = "40px";
        weaponIcon.style.height = "40px";
        weaponIcon.style.backgroundColor = "#333";
        weaponIcon.style.border = "1px solid #555";
        weaponIcon.style.borderRadius = "4px";
        weaponIcon.style.display = "flex";
        weaponIcon.style.alignItems = "center";
        weaponIcon.style.justifyContent = "center";
        weaponIcon.style.fontSize = "20px";
        weaponIcon.innerHTML = "🔫";
        hud.appendChild(weaponIcon);

        document.body.appendChild(hud);
        this.hudBar = hud;
    }

    updateHUD() {
        const healthBar = document.getElementById("hud_health_bar");
        const healthValue = document.getElementById("hud_health_value");
        const ammoBar = document.getElementById("hud_ammo_bar");
        const ammoValue = document.getElementById("hud_ammo_value");

        if (healthBar && healthValue) {
            const healthPercent = (this.gameState.playerHealth / this.gameState.playerMaxHealth) * 100;
            healthBar.style.width = healthPercent + "%";
            healthValue.innerHTML = Math.round(this.gameState.playerHealth);
        }

        if (ammoBar && ammoValue) {
            const ammoPercent = (this.gameState.playerAmmo / this.gameState.playerMaxAmmo) * 100;
            ammoBar.style.width = ammoPercent + "%";
            ammoValue.innerHTML = Math.round(this.gameState.playerAmmo);
        }

        if (this.gameState.playerEyeMode === "Lidded") {
            const eyeIcon = document.getElementById("hud_left_icon");
            if (eyeIcon) {
                eyeIcon.innerHTML = `<img src="../icons/dimensional_eye_half_lidded_64x64.png"></img>`;
            }
        }
        if (this.gameState.playerEyeMode === "WideOpen") {
            const eyeIcon = document.getElementById("hud_left_icon");
            if (eyeIcon) {
                eyeIcon.innerHTML = `<img src="../icons/dimensional_eye_wideopen_4D_64x64.png"></img>`;
            }
        }
        if (this.gameState.playerEyeMode === "Lidded->WideOpen" || this.gameState.playerEyeMode === "WideOpen->Lidded") {
            const eyeIcon = document.getElementById("hud_left_icon");
            if (eyeIcon) {
                eyeIcon.innerHTML = `<img src="../icons/dimensional_eye_lidded_64x64.png"></img>`;
            }
        }
    }

    teleportTo(x, y, z, w) {
        this.gameState.pendingTeleport = { x, y, z, w };
    }

    updateEnemies(engineState) {
        // Shades:
        for (let i = 0; i < this.gameState.shadeEnemies.length; i++) {
            this.gameState.shadeEnemies[i].updateShade(this.gameState, engineState);
        }

        // Crawlers:
        for (let i = 0; i < this.gameState.crawlerEnemies.length; i++) {
            this.gameState.crawlerEnemies[i].updateCrawler(this.gameState, engineState);
        }

        // Ophanes
        for (let i = 0; i < this.gameState.ophaneEnemies.length; i++) {
            this.gameState.ophaneEnemies[i].updateOphane(this.gameState, engineState);
        }

        // Update enemy bullets
        let eb_i = 0;
        while (eb_i < this.gameState.enemyBullets.length) {
            this.gameState.enemyBullets[eb_i].updateBullet(
                engineState.physics_time_s,
                this.gameState.enemyBulletPrimitives,
                this.gameState.enemyBullets,
                eb_i
            );
            eb_i++;
        }

        // Check enemy bullets against player
        eb_i = 0;
        while (eb_i < this.gameState.enemyBullets.length) {
            let enemyBullet = this.gameState.enemyBullets[eb_i];
            let bulletPos = enemyBullet.currentPos();
            let playerPos = engineState.hypercamera_T.origin();
            let dist = bulletPos.subtract(playerPos).magnitude();
            if (dist < 1.0 + enemyBullet.bulletRadius) {
                if (this.gameState.playerInvulnLastHitTime + this.gameState.playerInvulnTime < engineState.physics_time_s) {
                    this.gameState.playerHealth -= 15;
                    this.gameState.playerInvulnLastHitTime = engineState.physics_time_s;
                }
                enemyBullet.destroyBullet(this.gameState.enemyBulletPrimitives, this.gameState.enemyBullets, eb_i);
            } else {
                eb_i++;
            }
        }
    }

    //Called by the hyperengine at every timestep
    updatePlayerControls(engineState) {
        // Apply pending teleport from debug panel
        if (this.gameState.pendingTeleport) {
            engineState.camstand_T.matrix[0][4] = this.gameState.pendingTeleport.x;
            engineState.camstand_T.matrix[1][4] = this.gameState.pendingTeleport.y;
            engineState.camstand_T.matrix[2][4] = this.gameState.pendingTeleport.z;
            engineState.camstand_T.matrix[3][4] = this.gameState.pendingTeleport.w;
            // Reset fall state so we don't trigger a spurious fall after teleport
            this.gameState.previousFloorHeight = engineState.scene.floor_heightmap(
                this.gameState.pendingTeleport.x,
                this.gameState.pendingTeleport.y,
                this.gameState.pendingTeleport.w
            );
            this.gameState.playerIsFalling = false;
            engineState.player_is_jumping = false;
            this.gameState.pendingTeleport = null;
        }

        // First Step callback (debugging)
        if (this.gameState.isFirstStep) {
            this.gameState.isFirstStep = false;
            // Set a few things
            engineState.SENSOR_MODE = 2.0;
            // Initialize floor height tracking
            this.gameState.previousFloorHeight = engineState.scene.floor_heightmap(
                engineState.camstand_T.matrix[0][4],
                engineState.camstand_T.matrix[1][4],
                engineState.camstand_T.matrix[3][4]
            );
        }

        // Update enemies
        this.updateEnemies(engineState);
        
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
        if (engineState.mouseScrollActive) {
            engineState.sensorCamDist = engineState.mouseScroll01 * 100 + 1;
            engineState.mouseScrollActive = false;
        }

        const moveSpeed = this.gameState.playerSpeed;
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
        // R key: "Unblink" - Eye mode toggle with easing animation
        this.updateEyeMode(engineState);
        if (engineState.keys['f']) {
            engineState.camstand_T.translate_self_by_delta(0, 0, -moveSpeed, 0, RELATIVE_MOVEMENT);
        }
        // c to jump (can't jump while falling)
        if (engineState.keys['c']) {
            if (!engineState.player_is_jumping && !this.gameState.playerIsFalling) {
                engineState.last_player_jump_time = engineState.physics_time_s;
                engineState.player_is_jumping = true;
            }
        }

        // space to shoot
        const pistolCooldown = 0.20;
        if (engineState.keys[' ']) {
            let timeSinceCooldown = engineState.physics_time_s - this.gameState.bulletCooldownLastFiredTime;
            if (timeSinceCooldown > pistolCooldown && this.gameState.playerAmmo > 0) {
                if (this.gameState.bulletPrimitives.length == 0) {
                    this.gameState.playerBullets[0].destroyBullet(this.gameState.bulletPrimitives, this.gameState.playerBullets, 0); // Clear the first (oldest)
                }
                // pop first available primitive
                let primIndex = this.gameState.bulletPrimitives.pop();
                let newBullet = new FiredBullet(this.scene, primIndex, engineState.hypercamera_T.origin(), engineState.hypercamera_T.transform_vector(new Vector4D(1, 0, 0, 0)), engineState.physics_time_s);
                this.gameState.playerBullets.push(newBullet);
                this.gameState.bulletCooldownLastFiredTime = engineState.physics_time_s;
                this.gameState.playerAmmo--;
            }
        }
        // Update all live bullets (while as the list size changes mid loop)
        let bullet_i = 0;
        while (true) {
            if (bullet_i >= this.gameState.playerBullets.length) {
                break;
            }
            // this may delete the bullet
            this.gameState.playerBullets[bullet_i].updateBullet(engineState.physics_time_s, this.gameState.bulletPrimitives, this.gameState.playerBullets, bullet_i);
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
        let collidingObjects = [];
        if (!this.gameState.GOD_MODE) {
            for (let i = 0; i < engineState.scene.visibleHyperobjects.length; i++) {
                const obj = engineState.scene.visibleHyperobjects[i];
                if (obj.collider) {
                    let isCollided = obj.collider.constrainTransform(engineState.camstand_T);
                    if (isCollided) { collidingObjects.push(`${obj.name || 'unnamed'}[${i}]`); }
                }
            }
        }

                // Debug: collision info
                if (!document.getElementById("collision_debug")) {
                    const div = document.createElement("div");
                    div.id = "collision_debug";
                    document.body.appendChild(div);
                    div.style.position = "absolute";
                    div.style.top = "10px";
                    div.style.left = "320px";
                    div.style.color = "rgb(255, 200, 100)";
                    div.style.fontFamily = "monospace";
                    div.style.fontSize = "12px";
                }
                const collDiv = document.getElementById("collision_debug");
                if (collidingObjects.length > 0) {
                    collDiv.innerHTML = `Colliding:<br>` + collidingObjects.join('<br>');
                } else {
                    collDiv.innerHTML = `Colliding:<br>(none)`;
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
        // Floor height, jumping, and falling
        const currentFloorHeight = engineState.scene.floor_heightmap(
            engineState.camstand_T.matrix[0][4],
            engineState.camstand_T.matrix[1][4],
            engineState.camstand_T.matrix[3][4]
        );
        const floorDelta = currentFloorHeight - this.gameState.previousFloorHeight;

        // Detect floor transitions
        if (floorDelta < -0.01 && !this.gameState.playerIsFalling) {
            // Floor dropped (high → low): start falling from current absolute Z
            let currentAbsoluteZ;
            if (engineState.player_is_jumping) {
                const tend = 1;
                const jump_height = 1;
                let jdt = engineState.physics_time_s - engineState.last_player_jump_time;
                let jp01 = Math.min(jdt / tend, 1.0);
                let jump_z = jump_height * (1.0 - (2.0 * jp01 - 1.0) ** 2);
                currentAbsoluteZ = this.gameState.previousFloorHeight + jump_z;
            } else {
                currentAbsoluteZ = this.gameState.previousFloorHeight;
            }
            this.gameState.playerIsFalling = true;
            this.gameState.fallStartTime = engineState.physics_time_s;
            this.gameState.fallFromZ = currentAbsoluteZ;
            engineState.player_is_jumping = false;
        } else if (floorDelta > 0.01 && this.gameState.playerIsFalling) {
            // Floor rose while falling: check if new floor catches us
            const FALL_GRAVITY = 40.0;
            const fdt = engineState.physics_time_s - this.gameState.fallStartTime;
            const fallingZ = this.gameState.fallFromZ - 0.5 * FALL_GRAVITY * fdt * fdt;
            if (fallingZ <= currentFloorHeight) {
                this.gameState.playerIsFalling = false;
            }
        }

        // Compute player Z
        let playerAbsoluteZ;
        if (this.gameState.playerIsFalling) {
            const FALL_GRAVITY = 40.0;
            const fdt = engineState.physics_time_s - this.gameState.fallStartTime;
            playerAbsoluteZ = this.gameState.fallFromZ - 0.5 * FALL_GRAVITY * fdt * fdt;
            if (playerAbsoluteZ <= currentFloorHeight) {
                playerAbsoluteZ = currentFloorHeight;
                this.gameState.playerIsFalling = false;
            }
        } else {
            // Normal: on ground or jumping
            let jump_z = 0;
            if (engineState.player_is_jumping) {
                const tend = 1;
                const jump_height = 1;
                let jdt = engineState.physics_time_s - engineState.last_player_jump_time;
                let jp01 = jdt / tend;
                if (jdt > tend) {
                    engineState.player_is_jumping = false;
                } else {
                    jump_z = jump_height * (1.0 - (2.0 * jp01 - 1.0) ** 2);
                }
            }
            playerAbsoluteZ = currentFloorHeight + jump_z;
        }

        engineState.camstand_T.matrix[2][4] = playerAbsoluteZ;
        this.gameState.previousFloorHeight = currentFloorHeight;
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

        // Animate end gem (rotate + bob up and down)
        if (this.endGemPrimitiveIndex !== undefined) {
            let gem = this.scene.visibleHyperobjects[this.endGemPrimitiveIndex];
            gem.pose.rotate_self_by_delta('XY', 0.02, false);
            const bobAmplitude = 0.5;
            const bobSpeed = 2.0;
            const bobZ = this.endGemBaseZ + Math.sin(engineState.physics_time_s * bobSpeed) * bobAmplitude;
            gem.pose.matrix[2][4] = bobZ;
        }

        // Update HUD
        this.updateHUD();
    }

    updateEyeMode(engineState) {
        const dt = engineState.physics_time_s - this.gameState.lastEyeUpdateTime;
        this.gameState.lastEyeUpdateTime = engineState.physics_time_s;

        const rKeyPressed = engineState.keys['r'];

        let changed = false;

        // Detect key press/release transitions
        if (rKeyPressed && !this.gameState.rKeyWasPressed) {
            // R just pressed - start opening animation
            this.gameState.playerEyeMode = "Lidded->WideOpen";
            // If we were closing, open from the current progress
            if (this.gameState.eyeAnimationProgress !== 0) {
                this.gameState.eyeAnimationProgress = 1.0 - this.gameState.eyeAnimationProgress;
            }
            changed = true;
        } else if (!rKeyPressed && this.gameState.rKeyWasPressed) {
            // R just released - start closing animation
            this.gameState.playerEyeMode = "WideOpen->Lidded";
            // If we were opening, close from the current progress
            if (this.gameState.eyeAnimationProgress !== 0) {
                this.gameState.eyeAnimationProgress = 1.0 - this.gameState.eyeAnimationProgress;
            }
            changed = true;
        }
        this.gameState.rKeyWasPressed = rKeyPressed;

        // Progress the animation
        if (this.gameState.playerEyeMode === "Lidded->WideOpen" || this.gameState.playerEyeMode === "WideOpen->Lidded") {
            this.gameState.eyeAnimationProgress += dt * this.gameState.eyeAnimationSpeed;

            const liddedCamRot = [-Math.PI / 2.0, 0.1, 40];
            const wideOpenCamRot = [-Math.PI / 2.0, 0.9, 80];

            if (this.gameState.eyeAnimationProgress >= 1.0) {
                this.gameState.eyeAnimationProgress = 0;
                // Advance to next phase
                if (this.gameState.playerEyeMode === "Lidded->WideOpen") {
                    this.gameState.playerEyeMode = "WideOpen";
                    engineState.SENSOR_MODE = 3.0;
                } else if (this.gameState.playerEyeMode === "WideOpen->Lidded") {
                    this.gameState.playerEyeMode = "Lidded";
                    engineState.SENSOR_MODE = 2.0;
                }
            } else {
                // Set the sensor mode according to current anim
                const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                if (this.gameState.playerEyeMode === "Lidded->WideOpen") {
                    // Cam moves linearly, lid only starts moving after half the time
                    const easedProgressCam = easeInOut(this.gameState.eyeAnimationProgress);
                    let lid01 = Math.min(Math.max(this.gameState.eyeAnimationProgress - 0.5, 0), 1);
                    const easedProgressLid = easeInOut(lid01);
                    engineState.SENSOR_MODE = 2.0 + 2.99 * easedProgressLid;
                    // update camera 
                    engineState.sensorCamRotX = liddedCamRot[0] + (wideOpenCamRot[0] - liddedCamRot[0]) * easedProgressCam;
                    engineState.sensorCamRotY = liddedCamRot[1] + (wideOpenCamRot[1] - liddedCamRot[1]) * easedProgressCam;
                    engineState.sensorCamDist = liddedCamRot[2] + (wideOpenCamRot[2] - liddedCamRot[2]) * easedProgressCam;
                } else if (this.gameState.playerEyeMode === "WideOpen->Lidded") {
                    // Cam moves linearly, lid only starts moving after half the time
                    const easedProgressCam = easeInOut(this.gameState.eyeAnimationProgress);
                    let lid01 = Math.min(Math.max(this.gameState.eyeAnimationProgress / 0.5, 0), 1);
                    const easedProgressLid = easeInOut(lid01);
                    engineState.SENSOR_MODE = 2.99 - 0.99 * easedProgressLid;
                    // update Camera
                    engineState.sensorCamRotX = wideOpenCamRot[0] + (liddedCamRot[0] - wideOpenCamRot[0]) * easedProgressCam;
                    engineState.sensorCamRotY = wideOpenCamRot[1] + (liddedCamRot[1] - wideOpenCamRot[1]) * easedProgressCam;
                    engineState.sensorCamDist = wideOpenCamRot[2] + (liddedCamRot[2] - wideOpenCamRot[2]) * easedProgressCam;
                }
            }

            changed = true;
        }

        // Debug
        if (true && changed) {
            // log mode, progress, and sensormode
            console.log(this.gameState.playerEyeMode, this.gameState.eyeAnimationProgress, engineState.SENSOR_MODE);

        }
    }

}