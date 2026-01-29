export function createIslandFloorShader() {
    let floorShader = `
    if (stage3DebugBuffer.x < 0.5) {
        // add a ground plane with custom texture
        // get camera ray origin and direction from voxel coordinates
        // hypercamera_in_world_5x5 is passed as a uniform buffer
        let ray_origin_in_world = hypercameraPoseBuffer.tr;
        let ray_direction_in_hcam = vec4<f32>(1.0, u, v, l);
        let ray_direction_in_world = vec4<f32>(
            hypercameraPoseBuffer.r0.x * 1.0 + hypercameraPoseBuffer.r1.x * u + hypercameraPoseBuffer.r2.x * v + hypercameraPoseBuffer.r3.x * l,
            hypercameraPoseBuffer.r0.y * 1.0 + hypercameraPoseBuffer.r1.y * u + hypercameraPoseBuffer.r2.y * v + hypercameraPoseBuffer.r3.y * l,
            hypercameraPoseBuffer.r0.z * 1.0 + hypercameraPoseBuffer.r1.z * u + hypercameraPoseBuffer.r2.z * v + hypercameraPoseBuffer.r3.z * l,
            hypercameraPoseBuffer.r0.w * 1.0 + hypercameraPoseBuffer.r1.w * u + hypercameraPoseBuffer.r2.w * v + hypercameraPoseBuffer.r3.w * l
        );
        // solve for intersection with plane z = 0 (ground plane)
        let denominator = ray_direction_in_world.z;
        if (abs(denominator) > 1e-6) {
            let t = -ray_origin_in_world.z / denominator;
            if (t > 0.0) {
                let intersect_point = vec4<f32>(
                    ray_origin_in_world.x + t * ray_direction_in_world.x,
                    ray_origin_in_world.y + t * ray_direction_in_world.y,
                    0.0,
                    ray_origin_in_world.w + t * ray_direction_in_world.w
                );
                best_voxel.r = 1.0;
                best_voxel.g = 1.0;
                best_voxel.b = 0.7;
                // white spotlight for (x^2 + y^2 + w^2) < 5^2, outside of that colors for each axis
                let x = intersect_point.x;
                let y = intersect_point.y;
                let w = intersect_point.w;
                let islandR = 20.0; // spotlight radius
                if (x*x + y*y + w*w) > islandR*islandR {
                    best_voxel.r = 0.0;
                    best_voxel.g = 0.1;
                    best_voxel.b = 0.7;
                    // add waves
                    let osc01_10hz = (0.5 + 0.5 * sin(6.3 * sim_t / 10.0)); // oscillator which does a 0 to 1 loop every 10 sec
                    let wave_width = 3.0;
                    let wave_phase = 6.3 * sim_t / 20.0;
                    best_voxel.b = 0.4 + 0.2 * sin(2.0 * wave_width * x + wave_phase); // * sin(2.0 * wave_width * y + wave_phase) * sin(2.0 * wave_width * w + wave_phase);
                    

                }
                best_voxel.a = 0.2;
                best_voxel.s = t; // use t as "s" value for depth comparison
            }
        }
    } else {
        // add a ground plane with custom texture
        // get camera ray origin and direction from voxel coordinates
        // hypercamera_in_world_5x5 is passed as a uniform buffer
        if (true) {
        let ray_origin_in_world = hypercameraPoseBuffer.tr;
        let ray_direction_in_hcam = vec4<f32>(1.0, u, v, l);
        let ray_direction_in_world = vec4<f32>(
            hypercameraPoseBuffer.r0.x * 1.0 + hypercameraPoseBuffer.r1.x * u + hypercameraPoseBuffer.r2.x * v + hypercameraPoseBuffer.r3.x * l,
            hypercameraPoseBuffer.r0.y * 1.0 + hypercameraPoseBuffer.r1.y * u + hypercameraPoseBuffer.r2.y * v + hypercameraPoseBuffer.r3.y * l,
            hypercameraPoseBuffer.r0.z * 1.0 + hypercameraPoseBuffer.r1.z * u + hypercameraPoseBuffer.r2.z * v + hypercameraPoseBuffer.r3.z * l,
            hypercameraPoseBuffer.r0.w * 1.0 + hypercameraPoseBuffer.r1.w * u + hypercameraPoseBuffer.r2.w * v + hypercameraPoseBuffer.r3.w * l
        );
        // solve for intersection with plane z = 0 (ground plane)
        let denominator = ray_direction_in_world.z;
        if (abs(denominator) > 1e-6) {
            let t = -ray_origin_in_world.z / denominator;
            if (t > 0.0) {
                let intersect_point = vec4<f32>(
                    ray_origin_in_world.x + t * ray_direction_in_world.x,
                    ray_origin_in_world.y + t * ray_direction_in_world.y,
                    0.0,
                    ray_origin_in_world.w + t * ray_direction_in_world.w
                );

                let x = intersect_point.x;
                let y = intersect_point.y;
                let w = intersect_point.w;
                let R = 1000.0; // don't render too far from center
                if (x*x + y*y + w*w) < R*R {
                // checkerboard pattern based on intersect_point.x and intersect_point.y and intersect_point.w
                let checker_size = 5.0;
                
                let check_x = floor(intersect_point.x / checker_size);
                let check_y = floor(intersect_point.y / checker_size);
                let check_w = floor(intersect_point.w / checker_size);
                let in_cell_x = fract(intersect_point.x / checker_size);
                let in_cell_y = fract(intersect_point.y / checker_size);
                let in_cell_w = fract(intersect_point.w / checker_size);

                var in_cell_tetra_index = 0;
                if (in_cell_x + in_cell_y + in_cell_w) < 1.0 {
                    if (in_cell_x >= in_cell_y && in_cell_x >= in_cell_w) {
                        in_cell_tetra_index = 0;
                    } else if (in_cell_y >= in_cell_x && in_cell_y >= in_cell_w) {
                        in_cell_tetra_index = 1;
                    } else {
                        in_cell_tetra_index = 2;
                    }
                } else {
                    if (in_cell_x <= in_cell_y && in_cell_x <= in_cell_w) {
                        in_cell_tetra_index = 3;
                    } else if (in_cell_y <= in_cell_x && in_cell_y <= in_cell_w) {
                        in_cell_tetra_index = 4;
                    } else {
                        in_cell_tetra_index = 5;
                    }
                }
                let cell_index = i32(check_x) + i32(check_y) * 100 + i32(check_w) * 10000;
                let tetra_index = in_cell_tetra_index + abs(cell_index) * 6;
                // color based on tetra index
                let r = f32((tetra_index * 37) % 256) / 255.0;
                let g = f32((tetra_index * 59) % 256) / 255.0;
                let b = f32((tetra_index * 83) % 256) / 255.0;
                // Per-tetra random color, 5-tetra pattern

                best_voxel.r = r;
                best_voxel.g = g;
                best_voxel.b = b;
                best_voxel.a = 0.2;
                best_voxel.s = t; // use t as "s" value for depth comparison
                }
            }
        }
        }

    }
    `;
    return floorShader;
}