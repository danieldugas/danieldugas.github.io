import { Transform4D, Vector4D } from '../../4d_creatures/hyperengine/transform4d.js';
import { Hyperobject } from '../../4d_creatures/hyperengine/hyperobject.js';

export function createGem(pose, color) {
    // Gem shape: bottom hyperpyramid + hypercube + top hyperpyramid
    // The hypercube spans [-1,1] in all 4 dimensions.
    // Pyramids taper along z from the cube's z-faces to apex points.
    //
    //  3    /\       z+  (top apex)
    //      /  \
    //     /    \
    //  1 |------|    hypercube [-1,1]
    //    |  __  |
    //    |      |
    // -1 |------|    
    //     \    /
    //      \  /
    // -3    \/       z-  (bottom apex)

    // build a hypersphere surface (mesh)
    let grid_vertices = [];
    let grid_edges = [];
    let grid_tetras = [];
    let grid_vertices_texcoords = [];
    // Hypercube

    const const_hypercube_vertices = [ 
            new Vector4D(-1, -1, -1, -1),
            new Vector4D( 1, -1, -1, -1),
            new Vector4D( 1,  1, -1, -1),
            new Vector4D(-1,  1, -1, -1),
            new Vector4D(-1, -1,  1, -1),
            new Vector4D( 1, -1,  1, -1),
            new Vector4D( 1,  1,  1, -1),
            new Vector4D(-1,  1,  1, -1),
            new Vector4D(-1, -1, -1,  1),
            new Vector4D( 1, -1, -1,  1),
            new Vector4D( 1,  1, -1,  1),
            new Vector4D(-1,  1, -1,  1),
            new Vector4D(-1, -1,  1,  1),
            new Vector4D( 1, -1,  1,  1),
            new Vector4D( 1,  1,  1,  1),
            new Vector4D(-1,  1,  1,  1)
        ];
    // Tetrahedras
    function create_40_tetrahedra_tiling_of_hypercube(cube_vertices) {
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
        const xn = -1.0; // fixed x for this cube
        const xp = 1.0;  // fixed x for this cube
        const yn = -1.0; // fixed y for this cube
        const yp = 1.0;  // fixed y for this cube
        const zn = -1.0; // fixed z for this cube
        const zp = 1.0;  // fixed z for this cube
        const wn = -1.0; // fixed w for this cube
        const wp = 1.0;  // fixed w for this cube
        const tetrahedron_40_tiling_of_hypercube = [
            // cube at x = n
            [[xn, p, n, n], [xn, n, n, n], [xn, p, p, n], [xn, p, n, p]], // tet at corner p n n
            [[xn, n, p, n], [xn, p, p, n], [xn, n, n, n], [xn, n, p, p]], // tet at corner n p n
            [[xn, n, n, p], [xn, p, n, p], [xn, n, p, p], [xn, n, n, n]], // tet at corner n n p
            [[xn, p, p, p], [xn, n, p, p], [xn, p, n, p], [xn, p, p, n]], // tet at corner p p p
            [[xn, n, n, n], [xn, p, p, n], [xn, n, p, p], [xn, p, n, p]], // tet at center
            // cube at x = p
            [[xp, p, n, n], [xp, n, n, n], [xp, p, p, n], [xp, p, n, p]], // tet at corner p n n
            [[xp, n, p, n], [xp, p, p, n], [xp, n, n, n], [xp, n, p, p]], // tet at corner n p n
            [[xp, n, n, p], [xp, p, n, p], [xp, n, p, p], [xp, n, n, n]], // tet at corner n n p
            [[xp, p, p, p], [xp, n, p, p], [xp, p, n, p], [xp, p, p, n]], // tet at corner p p p
            [[xp, n, n, n], [xp, p, p, n], [xp, n, p, p], [xp, p, n, p]], // tet at center
            // cube at y = n
            [[p, yn, n, n], [n, yn, n, n], [p, yn, p, n], [p, yn, n, p]], // tet at corner p n n
            [[n, yn, p, n], [p, yn, p, n], [n, yn, n, n], [n, yn, p, p]], // tet at corner n p n
            [[n, yn, n, p], [p, yn, n, p], [n, yn, p, p], [n, yn, n, n]], // tet at corner n n p
            [[p, yn, p, p], [n, yn, p, p], [p, yn, n, p], [p, yn, p, n]], // tet at corner p p p
            [[n, yn, n, n], [p, yn, p, n], [n, yn, p, p], [p, yn, n, p]], // tet at center
            // cube at y = p
            [[p, yp, n, n], [n, yp, n, n], [p, yp, p, n], [p, yp, n, p]], // tet at corner p n n
            [[n, yp, p, n], [p, yp, p, n], [n, yp, n, n], [n, yp, p, p]], // tet at corner n p n
            [[n, yp, n, p], [p, yp, n, p], [n, yp, p, p], [n, yp, n, n]], // tet at corner n n p
            [[p, yp, p, p], [n, yp, p, p], [p, yp, n, p], [p, yp, p, n]], // tet at corner p p p
            [[n, yp, n, n], [p, yp, p, n], [n, yp, p, p], [p, yp, n, p]], // tet at center
            // cube at z = n
            [[p, n, zn, n], [n, n, zn, n], [p, p, zn, n], [p, n, zn, p]], // tet at corner p n n
            [[n, p, zn, n], [p, p, zn, n], [n, n, zn, n], [n, p, zn, p]], // tet at corner n p n
            [[n, n, zn, p], [p, n, zn, p], [n, p, zn, p], [n, n, zn, n]], // tet at corner n n p
            [[p, p, zn, p], [n, p, zn, p], [p, n, zn, p], [p, p, zn, n]], // tet at corner p p p
            [[n, n, zn, n], [p, p, zn, n], [n, p, zn, p], [p, n, zn, p]], // tet at center
            // cube at z = p 
            [[p, n, zp, n], [n, n, zp, n], [p, p, zp, n], [p, n, zp, p]], // tet at corner p n n
            [[n, p, zp, n], [p, p, zp, n], [n, n, zp, n], [n, p, zp, p]], // tet at corner n p n
            [[n, n, zp, p], [p, n, zp, p], [n, p, zp, p], [n, n, zp, n]], // tet at corner n n p
            [[p, p, zp, p], [n, p, zp, p], [p, n, zp, p], [p, p, zp, n]], // tet at corner p p p
            [[n, n, zp, n], [p, p, zp, n], [n, p, zp, p], [p, n, zp, p]], // tet at center
            // cube at w = n
            [[p, n, n, wn], [n, n, n, wn], [p, p, n, wn], [p, n, p, wn]], // tet at corner p n n
            [[n, p, n, wn], [p, p, n, wn], [n, n, n, wn], [n, p, p, wn]], // tet at corner n p n
            [[n, n, p, wn], [p, n, p, wn], [n, p, p, wn], [n, n, n, wn]], // tet at corner n n p
            [[p, p, p, wn], [n, p, p, wn], [p, n, p, wn], [p, p, n, wn]], // tet at corner p p p
            [[n, n, n, wn], [p, p, n, wn], [n, p, p, wn], [p, n, p, wn]], // tet at center
            // cube at w = p
            [[p, n, n, wp], [n, n, n, wp], [p, p, n, wp], [p, n, p, wp]], // tet at corner p n n
            [[n, p, n, wp], [p, p, n, wp], [n, n, n, wp], [n, p, p, wp]], // tet at corner n p n
            [[n, n, p, wp], [p, n, p, wp], [n, p, p, wp], [n, n, n, wp]], // tet at corner n n p
            [[p, p, p, wp], [n, p, p, wp], [p, n, p, wp], [p, p, n, wp]], // tet at corner p p p
            [[n, n, n, wp], [p, p, n, wp], [n, p, p, wp], [p, n, p, wp]]  // tet at center
        ];

        // convert to index
        let tetrahedra_indices = [];
        for (let tet of tetrahedron_40_tiling_of_hypercube) {
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

    for (let i = 0; i < const_hypercube_vertices.length; i++) {
        grid_vertices.push(const_hypercube_vertices[i]);
        grid_vertices_texcoords.push(const_hypercube_vertices[i]);
    }
    const cube_tetras = create_40_tetrahedra_tiling_of_hypercube(const_hypercube_vertices); 
    for (let i = 0; i < cube_tetras.length; i++) {
        grid_tetras.push(cube_tetras[i]);
    } 

    // Top pyramid
    let vertex_index_offset = grid_vertices.length;
    const top_pyramid_vertices = [
                new Vector4D(0, 0, 3, 0),
                new Vector4D(-1, -1,  1, -1), // 1
                new Vector4D( 1, -1,  1, -1), // 2
                new Vector4D( 1,  1,  1, -1), // 3
                new Vector4D(-1,  1,  1, -1), // 4
                new Vector4D(-1, -1,  1,  1), // 5
                new Vector4D( 1, -1,  1,  1), // 6
                new Vector4D( 1,  1,  1,  1), // 7
                new Vector4D(-1,  1,  1,  1)  // 8
            ];
    const top_pyramid_tetras = [
                [0, 1, 2, 4], // connect to w-
                [0, 2, 3, 4], // connect to w-
                [0, 5, 6, 8], // connect to w+
                [0, 6, 7, 8], // connect to w+
                [0, 1, 4, 5], // connect to x-
                [0, 4, 5, 8], // connect to x-
                [0, 2, 3, 6], // connect to x+
                [0, 3, 6, 7], // connect to x+
                [0, 1, 2, 5], // connect to y-
                [0, 2, 5, 6], // connect to y-
                [0, 3, 4, 8], // connect to y+
                [0, 3, 7, 8], // connect to y+
            ];
    for (let i = 0; i < top_pyramid_vertices.length; i++) {
        grid_vertices.push(top_pyramid_vertices[i]);
        grid_vertices_texcoords.push(top_pyramid_vertices[i]);
    }
    for (let i = 0; i < top_pyramid_tetras.length; i++) {
        grid_tetras.push(top_pyramid_tetras[i].map(v => v + vertex_index_offset));
    }

    // Bottom Pyramid
    vertex_index_offset = grid_vertices.length;
    const bot_pyramid_vertices = [
                new Vector4D(0, 0, -3, 0),
                new Vector4D(-1, -1,  -1, -1), // 1
                new Vector4D( 1, -1,  -1, -1), // 2
                new Vector4D( 1,  1,  -1, -1), // 3
                new Vector4D(-1,  1,  -1, -1), // 4
                new Vector4D(-1, -1,  -1,  1), // 5
                new Vector4D( 1, -1,  -1,  1), // 6
                new Vector4D( 1,  1,  -1,  1), // 7
                new Vector4D(-1,  1,  -1,  1)  // 8
            ];
    const bot_pyramid_tetras = [
                [0, 1, 2, 4], // connect to w-
                [0, 2, 3, 4], // connect to w-
                [0, 5, 6, 8], // connect to w+
                [0, 6, 7, 8], // connect to w+
                [0, 1, 4, 5], // connect to x-
                [0, 4, 5, 8], // connect to x-
                [0, 2, 3, 6], // connect to x+
                [0, 3, 6, 7], // connect to x+
                [0, 1, 2, 5], // connect to y-
                [0, 2, 5, 6], // connect to y-
                [0, 3, 4, 8], // connect to y+
                [0, 3, 7, 8], // connect to y+
            ];
    for (let i = 0; i < bot_pyramid_vertices.length; i++) {
        grid_vertices.push(bot_pyramid_vertices[i]);
        grid_vertices_texcoords.push(bot_pyramid_vertices[i]);
    }
    for (let i = 0; i < bot_pyramid_tetras.length; i++) {
        grid_tetras.push(bot_pyramid_tetras[i].map(v => v + vertex_index_offset));
    }
    
    // remove duplicates
    // [grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras] = removeDuplicates(grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras, 0.001);
    // create the class
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
        "HyperGem"
    );
    return object;
}
