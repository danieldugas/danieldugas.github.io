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
} // createCorridorTube


export function createCorridorTubeWithHole(objects, center, main_dir, main_length, dir1, dir2, length1, length2, holeOffset, holeSize, lz) {
    //        ^  d1
    //        |
    //     -------- 2
    // 1b // /x 1a/| 
    //   --------   -> main dir (open)
    //  5|  x  4 |/ 
    //   --/-----  3
    //    v d2

    //     ie1b
    // oe1b     ie1a             oe1a
    //  ---------------------------
    //  | . |     | x     .       |  --> main dir
    //  ---------------------------
    //         |<-->|   holeOffset (negative here)
    //      |<--->| holeSize
    //    |<--------| offset1b (in main dir)
    //              |---->| offset1a (in main dir)

    const ie1a = holeOffset + holeSize / 2.0;
    const oe1a = main_length / 2.0;
    const offset1a = (ie1a + oe1a) / 2.0;
    const length1a = oe1a - ie1a;
    const ie1b = holeOffset - holeSize / 2.0;
    const oe1b = -main_length / 2.0;
    const offset1b = (ie1b + oe1b) / 2.0;
    const length1b = ie1b - oe1b;

    const c = center;
    const md = main_dir;
    const ml = main_length;
    const d1 = dir1;
    const d2 = dir2;
    const l1 = length1;
    const l2 = length2;

    // Create 6 walls
    // 1a
    objects.push(createHyperwall(
        new Transform4D([
        [   d1.x, length1a/2.0*md.x,     0, l2/2.0*d2.x, offset1a*md.x+l1/2.0*d1.x+c.x],
        [   d1.y, length1a/2.0*md.y,     0, l2/2.0*d2.y, offset1a*md.y+l1/2.0*d1.y+c.y],
        [   d1.z, length1a/2.0*md.z,    lz, l2/2.0*d2.z, offset1a*md.z+l1/2.0*d1.z+c.z],
        [   d1.w, length1a/2.0*md.w,     0, l2/2.0*d2.w, offset1a*md.w+l1/2.0*d1.w+c.w],
        [      0,           0,     0,           0,               1]
        ]),
        0x770000
    ));
    // 1b
    objects.push(createHyperwall(
        new Transform4D([
        [   d1.x, length1b/2.0*md.x,     0, l2/2.0*d2.x, offset1b*md.x+l1/2.0*d1.x+c.x],
        [   d1.y, length1b/2.0*md.y,     0, l2/2.0*d2.y, offset1b*md.y+l1/2.0*d1.y+c.y],
        [   d1.z, length1b/2.0*md.z,    lz, l2/2.0*d2.z, offset1b*md.z+l1/2.0*d1.z+c.z],
        [   d1.w, length1b/2.0*md.w,     0, l2/2.0*d2.w, offset1b*md.w+l1/2.0*d1.w+c.w],
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
    // 5
    objects.push(createHyperwall(
        new Transform4D([
        [   md.x, l1/2.0*d1.x,     0, l2/2.0*d2.x, -ml/2.0*md.x+c.x],
        [   md.y, l1/2.0*d1.y,     0, l2/2.0*d2.y, -ml/2.0*md.y+c.y],
        [   md.z, l1/2.0*d1.z,    lz, l2/2.0*d2.z, -ml/2.0*md.z+c.z],
        [   md.w, l1/2.0*d1.w,     0, l2/2.0*d2.w, -ml/2.0*md.w+c.w],
        [      0,           0,     0,           0,               1]
        ]),
        0x0000ff
    ));
}