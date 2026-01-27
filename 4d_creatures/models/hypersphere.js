import { Transform4D, Vector4D } from '../hyperengine/transform4d.js';
import { Hyperobject, createHypercube, removeDuplicates } from '../hyperengine/hyperobject.js';

export function createHypersphere(size, color, pose) {
  // if pose is not set, use the default pose
  if (pose === undefined) {
      pose = new Transform4D([
          [1, 0, 0, 0, 0],
          [0, 1, 0, 0, 0],
          [0, 0, 1, 0, 0],
          [0, 0, 0, 1, 0],
          [0, 0, 0, 0, 1]
      ])
  }
  // build a hypersphere surface (mesh)
  const n_i = 9;
  const n_j = 5;
  const n_k = 5;
  let grid_vertices = [];
  let grid_edges = [];
  let grid_tetras = [];
  let grid_vertices_texcoords = [];
  for (let i = 0; i < n_i; i++) {
      for (let j = 0; j < n_j; j++) {
          for (let k = 0; k < n_k; k++) {
              // Spherical coordinates for the points
              // a is the circle on xy plane (9)
              // b is the concentric rings along z (5)
              // c is the concentric spheres along w (5)
              let R = 1.0;
              let sphere_Rs = [0.0, 0.707*R, R, 0.707*R, 0.0];
              let sphere_R = sphere_Rs[k];
              let circle_Rs = [0.0, 0.707*sphere_R, sphere_R, 0.707*sphere_R, 0.0];
              let circle_R = circle_Rs[j];
              let x = [0.0,        0.707*circle_R, circle_R, 0.707*circle_R,      0.0, -0.707*circle_R, -circle_R, -0.707*circle_R,       0.0][i];
              let y = [-circle_R, -0.707*circle_R,      0.0, 0.707*circle_R, circle_R,  0.707*circle_R,       0.0, -0.707*circle_R, -circle_R][i];
              let z = [-sphere_R, -0.707*sphere_R,      0.0, 0.707*sphere_R, sphere_R][j];
              let w = [-R,               -0.707*R,      0.0,        0.707*R,        R][k];
              // let norm = Math.sqrt(x*x + y*y + z*z + w*w);
              // console.log(norm);

              grid_vertices.push(new Vector4D(x, y, z, w));
              // add an edge to the next vertex in x
              if (i < n_i - 1) {
                  let next_index = grid_vertices.length + (n_j * n_k) - 1;
                  grid_edges.push([grid_vertices.length - 1, next_index]);
              }
              // add an edge to the next vertex in y
              if (j < n_j - 1) {
                  let next_index = grid_vertices.length + n_k - 1;
                  grid_edges.push([grid_vertices.length - 1, next_index]);
              }
              // add an edge to the next vertex in w
              if (k < n_k - 1) {
                  let next_index = grid_vertices.length;
                  grid_edges.push([grid_vertices.length - 1, next_index]);
              }
              // add an edge between next x and next y
              if (i < n_i - 1 && j < n_j - 1) {
                  let next_x_index = grid_vertices.length + (n_j * n_k) - 1;
                  let next_y_index = grid_vertices.length + n_k - 1;
                  grid_edges.push([next_x_index, next_y_index]);
              }
              // add an edge between next x and next w
              if (i < n_i - 1 && k < n_k - 1) {
                  let next_x_index = grid_vertices.length + (n_j * n_k) - 1;
                  let next_w_index = grid_vertices.length;
                  grid_edges.push([next_x_index, next_w_index]);
              }
              // add an edge between next y and next w
              if (j < n_j - 1 && k < n_k - 1) {
                  let next_y_index = grid_vertices.length + n_k - 1;
                  let next_w_index = grid_vertices.length;
                  grid_edges.push([next_y_index, next_w_index]);
              }
              // add 5 tetras between this grid point and the next in x,y,w
              if (i < n_i - 1 && j < n_j - 1 && k < n_k - 1) {
                  let nnn = i * n_j * n_k + j * n_k + k;
                  let pnn = (i + 1) * n_j * n_k + j * n_k + k;
                  let npn = i * n_j * n_k + (j + 1) * n_k + k;
                  let ppn = (i + 1) * n_j * n_k + (j + 1) * n_k + k;
                  let nnp = i * n_j * n_k + j * n_k + (k + 1);
                  let pnp = (i + 1) * n_j * n_k + j * n_k + (k + 1);
                  let npp = i * n_j * n_k + (j + 1) * n_k + (k + 1);
                  let ppp = (i + 1) * n_j * n_k + (j + 1) * n_k + (k + 1);
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
  // remove duplicates
  [grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras] = removeDuplicates(grid_vertices, null, grid_edges, grid_tetras, 0.001);
  // create the class
  let hypersphere = new Hyperobject(
      // vertices in object frame
      grid_vertices.map(v => v.multiply_by_scalar(size)),
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
      "Hypersphere"
  );
  return hypersphere;
} // end function createHypersphere()