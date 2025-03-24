import * as THREE from 'three';
import { GUI } from '../mujoco_wasm/node_modules/three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from '../mujoco_wasm/node_modules/three/examples/jsm/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff); // Set background color to white
document.body.appendChild(renderer.domElement);


class Transform4D {
    constructor(pos, rot) {
        // create 5x5 matrix
        this.matrix = [
            [1, 0, 0, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 0, 1]
        ];
    }
};

// Class spherebody
// pose: 5x5 matrix (in parent)
// radius: r
// mass: m
// children: []
// name: ""
class SphereBody {
    constructor(name, pos, radius, mass, children) {
        this.name = name;
        this.radius = radius;
        this.mass = mass;
        this.children = [];
        this.pose = new Transform4D(pos, null);
    }
};

// Class simplelegjoint
// type: leg (spherical around body)
// origin: [x, y, z, w] (in parent)
// lengths: [lx, ly, lz, lw] (can be actuated)
// children: []
class SimpleLegJoint {
    constructor(init_lengths, children) {
        this.origin = [0, 0, 0, 0];
        this.lengths = init_lengths;
        this.children = children;
    }
};

// Class freejoint
// type: free (free in all directions)
// children: []
class FreeJoint {
    constructor(children) {
        this.children = children;
    }
};

// Crawler
// world -> freejoint:
//   - carapace:
//      - eye1
//      - eye2
//      - leg1 (simplelegjoint):
//         - foot1
//      - leg2 (simplelegjoint):
//         - foot2
// const world = {
//     bboxbody: { pos: [0, 0, 0, 0], radius: 0.5, mass: 1, children: [] },
//     freejoint: { children: [
//         spherebody: { name: "carapace", pos: [0, 0, 1, 0], radius: 0.3, children: [
//         ]}
//     ]}
// }

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);

// Create 4D articulated creature
const body_pos = [0, 0, 1, 0];
const leye_pos = [0.3, 0.1, 1, 0];
const reye_pos = [0.3, -0.1, 1, 0];
const foot1_pos = [1, -1, 0, 0];
const foot2_pos = [-1, 1, 0, 0];
const foot3_pos = [-1, -1, 0, -1];
const foot4_pos = [1, 1, 0, 1];
const objects = [body_pos, leye_pos, reye_pos, foot1_pos, foot2_pos, foot3_pos, foot4_pos];
const radii = [0.3, 0.05, 0.05, 0.1, 0.1, 0.1, 0.1];

// function: draw 3D projections of hyperobjects
function draw_hyperobjects(objects, current_w) {
    // Delete all existing objects in scene
    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }

    // Create spheres
    const spheres = [];
    const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x0077ff, transparent: true, opacity: 1 });

    // slice along the 4th dimension and if within object radius create a sphere
    const slice_range = [-1, 1];
    const slice_step = 0.05;
    const slices = [];
    for (let i = slice_range[0]; i <= slice_range[1]; i += slice_step) {
        const slice = [i, i - slice_step / 2.0, i + slice_step / 2.0]; // middle, min, max
        slices.push(slice);
    }
    // sort slices by distance to current w (otherwise 3js "hides" some close objects)
    slices.sort((a, b) => Math.abs(a[0] - current_w) - Math.abs(b[0] - current_w));
    //for each slice, check if object is within slice w dim, instantiate
    for (let i = 0; i < slices.length; i++) {
        const slice_mid_w = slices[i][0];
        const slice_min_w = slices[i][1];
        const slice_max_w = slices[i][2];
        // slices away from current slice have less opacity
        // gaussian curve away from current dw = 0
        const dw = current_w - slice_mid_w;
        const min_opacity = 0.1;
        const max_opacity = 0.5;
        // const slice_opacity = Math.max(min_opacity, max_opacity - Math.abs(dw) / 2.0);
        const gaussian = Math.exp(0.0-(dw ** 2) / 0.05);
        const slice_opacity = min_opacity + (max_opacity - min_opacity) * gaussian;
        // slice color: rainbow gradient
        const slice_01 = (slice_mid_w - slice_range[0]) / (slice_range[1] - slice_range[0]);
        const slice_color = new THREE.Color();
        // matlab rainbow gradient (red -> green -> blue)
        slice_color.setHSL(slice_01 * 0.67, 1.0, 0.5);

        for (let j = 0; j < objects.length; j++) {
            // project the hypersphere to 3d
            const obj_pos = objects[j];
            const obj_radius = radii[j];
            // sphere radius is smaller away from the object center. r3d^2 + rw^2 = r^2
            const rw2 = (slice_mid_w - obj_pos[3]) ** 2;
            if (rw2 < obj_radius ** 2) {
                const radius_3d = Math.sqrt(obj_radius ** 2 - rw2);
                const geometry = new THREE.SphereGeometry(radius_3d, 32, 32);
                const sphere = new THREE.Mesh(geometry, sphereMaterial.clone());
                sphere.material.opacity = slice_opacity;
                sphere.material.color = slice_color;
                sphere.position.x = obj_pos[0];
                sphere.position.y = obj_pos[2];
                sphere.position.z = obj_pos[1];
                scene.add(sphere);
                spheres.push(sphere);
            }
        }
    }
    
    // draw lines between body and feet
    const leg_idx_pairs = [[0, 3], [0, 4], [0, 5], [0, 6]];
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x777777 });
    for (let i = 0; i < leg_idx_pairs.length; i++) {
        const lineGeometry = new THREE.BufferGeometry();
        const idx1 = leg_idx_pairs[i][0];
        const idx2 = leg_idx_pairs[i][1];
        const pos1 = new THREE.Vector3(objects[idx1][0], objects[idx1][2], objects[idx1][1]);
        const pos2 = new THREE.Vector3(objects[idx2][0], objects[idx2][2], objects[idx2][1]);
        // move pos1 towards pos2 by radius 1
        const dir = new THREE.Vector3().subVectors(pos2, pos1).normalize();
        pos1.add(dir.multiplyScalar(radii[idx1]));
        pos2.sub(dir.multiplyScalar(radii[idx2]));
        lineGeometry.setFromPoints([pos1, pos2]);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
    }

    // Add light
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Create a bounding box
    const boxGeometry = new THREE.BoxGeometry(6, 6, 6);
    const boxMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const boundingBox = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeometry), boxMaterial);
    boundingBox.position.set(0, 3, 0); // Center the box
    scene.add(boundingBox);
}

// draw
draw_hyperobjects(objects, 0);

// GUI setup
const gui = new GUI();
const settings = {
    transparency: 0.5,
    dimension_4: 0,
};

gui.add(settings, 'transparency', 0, 1).onChange((value) => {
    spheres.forEach(sphere => {
        sphere.material.opacity = value;
    });
});

gui.add(settings, 'dimension_4', -1, 1).onChange((value) => {
    draw_hyperobjects(objects, value);
});

// Camera position
camera.position.z = 5;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
