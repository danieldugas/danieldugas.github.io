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

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);

// Create 4D articulated creature
const body_pos = [0, 0, 1, 0];
const foot1_pos = [1, 0, 0, 0];
const foot2_pos = [-1, 1, 0, 0];
const foot3_pos = [-1, -1, 0, 0];
const objects = [body_pos, foot1_pos, foot2_pos, foot3_pos];
const radii = [0.3, 0.1, 0.1, 0.1];

// slice along the 4th dimension and if within object radius create a sphere
const slice_range = [-1, 1];
const slice_step = 0.1;
const slices = [];
for (let i = slice_range[0]; i <= slice_range[1]; i += slice_step) {
    const slice = [i, i - slice_step / 2.0, i + slice_step / 2.0]; // middle, min, max
    slices.push(slice);
}




// Create spheres
const spheres = [];
const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0x0077ff, transparent: true, opacity: 1 });

// for (let i = 0; i < 3; i++) {
//     const geometry = new THREE.SphereGeometry(0.5, 32, 32);
//     const sphere = new THREE.Mesh(geometry, sphereMaterial.clone());
//     sphere.position.x = (i - 1) * 2; // Spread spheres out
//     scene.add(sphere);
//     spheres.push(sphere);
// }

//for each slice, check if object is within slice w dim, instantiate
for (let i = 0; i < slices.length; i++) {
    const slice_mid = slices[i][0];
    const slice_min = slices[i][1];
    const slice_max = slices[i][2];

    for (let j = 0; j < objects.length; j++) {
        const obj_pos = objects[j];
        if (obj_pos[3] >= slice_min && obj_pos[3] < slice_max) {
            const geometry = new THREE.SphereGeometry(radii[j], 32, 32);
            const sphere = new THREE.Mesh(geometry, sphereMaterial.clone());
            sphere.position.x = obj_pos[0];
            sphere.position.y = obj_pos[2];
            sphere.position.z = obj_pos[1];
            scene.add(sphere);
            spheres.push(sphere);
        }
    }


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
boundingBox.position.set(0, 0, 0); // Center the box
scene.add(boundingBox);

// GUI setup
const gui = new GUI();
const settings = {
    transparency: 1,
    dimension_4: 0,
};

gui.add(settings, 'transparency', 0, 1).onChange((value) => {
    spheres.forEach(sphere => {
        sphere.material.opacity = value;
    });
});

gui.add(settings, 'dimension_4', -1, 1).onChange((value) => {
    for (let i = 0; i < 3; i++) {
        spheres[i].position.z = value;
    }
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
