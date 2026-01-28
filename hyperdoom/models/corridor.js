import { Transform4D, Vector4D } from '../../4d_creatures/hyperengine/transform4d.js';
import { Hyperobject, createHypercube, removeDuplicates } from '../../4d_creatures/hyperengine/hyperobject.js';
import { createHyperwall } from './wall.js';

export function createCorridorTube(objects, center, main_dir, main_length, dir1, dir2, length1, length2, lz) {
    //      ^  d1
    //      |
    //    -------- 2
    //  /   x 1 /| 
    // --------   -> main dir
    // |  x  4 |/ 
    // --/-----  3
    //  v d2

    const c = center;
    const md = main_dir;
    const ml = main_length;
    const d1 = dir1;
    const d2 = dir2;
    const l1 = length1;
    const l2 = length2;

    // Create 4 walls
    // 1
    objects.push(createHyperwall(
        new Transform4D([
        [   d1.x, ml/2.0*md.x,     0, l2/2.0*d2.x, l1/2.0*d1.x+c.x],
        [   d1.y, ml/2.0*md.y,     0, l2/2.0*d2.y, l1/2.0*d1.y+c.y],
        [   d1.z, ml/2.0*md.z,    lz, l2/2.0*d2.z, l1/2.0*d1.z+c.z],
        [   d1.w, ml/2.0*md.w,     0, l2/2.0*d2.w, l1/2.0*d1.w+c.w],
        [      0,           0,     0,           0,               1]
        ]),
        0x770000
    ));
    // 2
    objects.push(createHyperwall(
        new Transform4D([
        [  -d2.x, ml/2.0*md.x,     0, l1/2.0*d1.x, l2/2.0*-d2.x+c.x],
        [  -d2.y, ml/2.0*md.y,     0, l1/2.0*d1.y, l2/2.0*-d2.y+c.y],
        [  -d2.z, ml/2.0*md.z,    lz, l1/2.0*d1.z, l2/2.0*-d2.z+c.z],
        [  -d2.w, ml/2.0*md.w,     0, l1/2.0*d1.w, l2/2.0*-d2.w+c.w],
        [      0,           0,     0,           0,               1]
        ]),
        0x007700
    ));
    // 3
    objects.push(createHyperwall(
        new Transform4D([
        [  -d1.x, ml/2.0*md.x,     0, l2/2.0*d2.x, -l1/2.0*d1.x+c.x],
        [  -d1.y, ml/2.0*md.y,     0, l2/2.0*d2.y, -l1/2.0*d1.y+c.y],
        [  -d1.z, ml/2.0*md.z,    lz, l2/2.0*d2.z, -l1/2.0*d1.z+c.z],
        [  -d1.w, ml/2.0*md.w,     0, l2/2.0*d2.w, -l1/2.0*d1.w+c.w],
        [      0,           0,     0,           0,                1]
        ]),
        0xff0000
    ));
    // 4
    objects.push(createHyperwall(
        new Transform4D([
        [   d2.x, ml/2.0*md.x,     0, l1/2.0*d1.x, l2/2.0*d2.x+c.x],
        [   d2.y, ml/2.0*md.y,     0, l1/2.0*d1.y, l2/2.0*d2.y+c.y],
        [   d2.z, ml/2.0*md.z,    lz, l1/2.0*d1.z, l2/2.0*d2.z+c.z],
        [   d2.w, ml/2.0*md.w,     0, l1/2.0*d1.w, l2/2.0*d2.w+c.w],
        [      0,           0,     0,           0,               1]
        ]),
        0x00ff00
    ));
}