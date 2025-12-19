import { Transform4D, Vector4D } from '../hyperengine/transform4d.js';
import { Hyperobject, createHypercube, removeDuplicates } from '../hyperengine/hyperobject.js';

export function createEscapePod() {
  // build a hypersphere surface (mesh)
  const n_i = 9;
  const n_j = 5;
  const n_k = 3;
  let grid_vertices = [];
  let grid_edges = [];
  let grid_tetras = [];
  let grid_vertices_texcoords = [];
  // Outside surface, white
  let vertex_index_offset = grid_vertices.length;
  for (let i = 0; i < n_i; i++) {
      for (let j = 0; j < n_j; j++) {
          for (let k = 0; k < n_k; k++) {
              // Spherical coordinates for the points
              // a is the circle on xy plane (9) (theta)
              // b is the concentric rings along z (5) (phi)
              // c is the concentric spheres along w (5)
              let R = 5.0;
              let sphere_Rs = [R, R, R];
              let sphere_R = sphere_Rs[k];
              let circle_Rs = [0.0, 0.707*sphere_R, sphere_R, 0.707*sphere_R, 0.0];
              let circle_R = circle_Rs[j];
              let x = [0.0,        0.707*circle_R, circle_R, 0.707*circle_R,      0.0, -0.707*circle_R, -circle_R, -0.707*circle_R,       0.0][i];
              let y = [-circle_R, -0.707*circle_R,      0.0, 0.707*circle_R, circle_R,  0.707*circle_R,       0.0, -0.707*circle_R, -circle_R][i];
              let z = [-sphere_R, -0.707*sphere_R,      0.0, 0.707*sphere_R, sphere_R][j];
              let w = [-0.5,      0.0,        0.5][k];
              grid_vertices.push(new Vector4D(x, y, z, w));
              let theta = i / (n_i-1);
              let phi = j / (n_j-1);
              grid_vertices_texcoords.push(new Vector4D(0.75, theta, phi, 0));
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
                  let nnn = vertex_index_offset + i * n_j * n_k + j * n_k + k;
                  let pnn = vertex_index_offset + (i + 1) * n_j * n_k + j * n_k + k;
                  let npn = vertex_index_offset + i * n_j * n_k + (j + 1) * n_k + k;
                  let ppn = vertex_index_offset + (i + 1) * n_j * n_k + (j + 1) * n_k + k;
                  let nnp = vertex_index_offset + i * n_j * n_k + j * n_k + (k + 1);
                  let pnp = vertex_index_offset + (i + 1) * n_j * n_k + j * n_k + (k + 1);
                  let npp = vertex_index_offset + i * n_j * n_k + (j + 1) * n_k + (k + 1);
                  let ppp = vertex_index_offset + (i + 1) * n_j * n_k + (j + 1) * n_k + (k + 1);
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
  // inside surface, blue
  vertex_index_offset = grid_vertices.length;
  for (let i = 0; i < n_i; i++) {
      for (let j = 0; j < n_j; j++) {
          for (let k = 0; k < n_k; k++) {
              // Spherical coordinates for the points
              // a is the circle on xy plane (9)
              // b is the concentric rings along z (5)
              // c is the concentric spheres along w (5)
              let R = 4;
              let sphere_Rs = [R, R, R];
              let sphere_R = sphere_Rs[k];
              let circle_Rs = [0.0, 0.707*sphere_R, sphere_R, 0.707*sphere_R, 0.0];
              let circle_R = circle_Rs[j];
              let x = [0.0,        0.707*circle_R, circle_R, 0.707*circle_R,      0.0, -0.707*circle_R, -circle_R, -0.707*circle_R,       0.0][i];
              let y = [-circle_R, -0.707*circle_R,      0.0, 0.707*circle_R, circle_R,  0.707*circle_R,       0.0, -0.707*circle_R, -circle_R][i];
              let z = [-sphere_R, -0.707*sphere_R,      0.0, 0.707*sphere_R, sphere_R][j];
              let w = [-0.5,      0.0,        0.5][k];
              grid_vertices.push(new Vector4D(x, y, z, w));
              let theta = i / (n_i-1);
              let phi = j / (n_j-1);
              grid_vertices_texcoords.push(new Vector4D(0.25, theta, phi, 0));
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
                  let nnn = vertex_index_offset + i * n_j * n_k + j * n_k + k;
                  let pnn = vertex_index_offset + (i + 1) * n_j * n_k + j * n_k + k;
                  let npn = vertex_index_offset + i * n_j * n_k + (j + 1) * n_k + k;
                  let ppn = vertex_index_offset + (i + 1) * n_j * n_k + (j + 1) * n_k + k;
                  let nnp = vertex_index_offset + i * n_j * n_k + j * n_k + (k + 1);
                  let pnp = vertex_index_offset + (i + 1) * n_j * n_k + j * n_k + (k + 1);
                  let npp = vertex_index_offset + i * n_j * n_k + (j + 1) * n_k + (k + 1);
                  let ppp = vertex_index_offset + (i + 1) * n_j * n_k + (j + 1) * n_k + (k + 1);
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
  // [grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras] = removeDuplicates(grid_vertices, grid_vertices_texcoords, grid_edges, grid_tetras, 0.0001);
  // create the class
  let hypersphere = new Hyperobject(
      // vertices in object frame
      grid_vertices,
      // edges
      grid_edges,
      // tetras
      grid_tetras,
      // color
      0x000088,
      // simulate_physics
      false,
      // show_vertices
      false,
      // mass
      1.0,
      // pose (Transform4D)
      new Transform4D([
          [1, 0, 0, 0, 0],
          [0, 1, 0, 0, 0],
          [0, 0, 1, 0, 0],
          [0, 0, 0, 1, 0],
          [0, 0, 0, 0, 1]
      ]),
      // name
      "Hypersphere"
  );
  // Custom texture
  hypersphere.vertices_in_texmap = grid_vertices_texcoords;
  // Fill texture info, texcoords
  if (true) {
      let obj = hypersphere;
      let insideColorLight = 0x000099;
      let insideColorDark = 0x880000;
      let outsideColorLight = 0xcccccc;
      let outsideColorDark = 0x888888;
      let USIZE = 2;
      let VSIZE = 64;
      let WSIZE = 64;
      let object_texture = new Uint32Array(USIZE * VSIZE * WSIZE); // RGBA
      for (let u = 0; u < USIZE; u++) {
          for (let v = 0; v < VSIZE; v++) {
              for (let w = 0; w < WSIZE; w++) {
                  // important to use the same indexing as in the shader!
                  let index = (u + (v * USIZE) + (w * USIZE * VSIZE));
                  // checkerboard pattern
                  let color = 0xffffff;
                  let isCheck = (v % 8 === 0) || (w % 8 === 0);
                  if (u >= 1) { // outside
                    if (isCheck) { color = outsideColorDark; }
                    else { color = outsideColorLight; }
                  } else { // inside
                    if (isCheck) { color = insideColorDark; }
                    else { color = insideColorLight; }
                  }
                  // pack color into one u32 RGBA
                  let r_u8 = (color >> 16) & 0xFF;
                  let g_u8 = (color >> 8) & 0xFF;
                  let b_u8 = (color) & 0xFF;
                  let a_u8 = 255;
                  let rgba_u32 = (a_u8 << 24) | (b_u8 << 16) | (g_u8 << 8) | (r_u8);
                  object_texture[index] = rgba_u32;
              }
          }
      }
      obj.texture = object_texture; // store in object for now
      obj.texture_info = { USIZE: USIZE, VSIZE: VSIZE, WSIZE: WSIZE };
      // 
  }
  return hypersphere;
} // end function createEscapePod()