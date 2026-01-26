
// 4D transform class prototype
export class Vector4D {
    constructor(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }
    add(v) {
        return new Vector4D(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w);
    }
    subtract(v) {
        return new Vector4D(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w);
    }
    normalize() {
        let mag = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        if (mag === 0) return new Vector4D(0, 0, 0, 0);
        return new Vector4D(this.x / mag, this.y / mag, this.z / mag, this.w / mag);
    }
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }
    multiply_by_scalar(s) {
        return new Vector4D(this.x * s, this.y * s, this.z * s, this.w * s);
    }
}
export class Transform4D {
    // constructor() {
    //     this.matrix = [
    //         [1, 0, 0, 0, 0],
    //         [0, 1, 0, 0, 0],
    //         [0, 0, 1, 0, 0],
    //         [0, 0, 0, 1, 0],
    //         [0, 0, 0, 0, 1]
    //     ];
    // }
    constructor(matrix) {
        this.matrix = matrix;
    }

    origin() {
        return new Vector4D(this.matrix[0][4], this.matrix[1][4], this.matrix[2][4], this.matrix[3][4]);
    }

    // transform_point(v: Vector4D): Vector4D
    transform_point(v) {
        let x = this.matrix[0][0] * v.x + this.matrix[0][1] * v.y + this.matrix[0][2] * v.z + this.matrix[0][3] * v.w + this.matrix[0][4];
        let y = this.matrix[1][0] * v.x + this.matrix[1][1] * v.y + this.matrix[1][2] * v.z + this.matrix[1][3] * v.w + this.matrix[1][4];
        let z = this.matrix[2][0] * v.x + this.matrix[2][1] * v.y + this.matrix[2][2] * v.z + this.matrix[2][3] * v.w + this.matrix[2][4];
        let w = this.matrix[3][0] * v.x + this.matrix[3][1] * v.y + this.matrix[3][2] * v.z + this.matrix[3][3] * v.w + this.matrix[3][4];
        return new Vector4D(x, y, z, w);
    }

    transform_vector(v) {
        let x = this.matrix[0][0] * v.x + this.matrix[0][1] * v.y + this.matrix[0][2] * v.z + this.matrix[0][3] * v.w;
        let y = this.matrix[1][0] * v.x + this.matrix[1][1] * v.y + this.matrix[1][2] * v.z + this.matrix[1][3] * v.w;
        let z = this.matrix[2][0] * v.x + this.matrix[2][1] * v.y + this.matrix[2][2] * v.z + this.matrix[2][3] * v.w;
        let w = this.matrix[3][0] * v.x + this.matrix[3][1] * v.y + this.matrix[3][2] * v.z + this.matrix[3][3] * v.w;
        return new Vector4D(x, y, z, w);
    }

    transform_transform(T) {
        // matrix multiplication: this.matrix * T.matrix
        // inC_T_B * inB_T_A  -> inC_T_A
        // inC_T_B.transform_transform(inB_T_A) -> inC_T_A
        let Tl = this.matrix;
        let Tr = T.matrix;
        let Tn = [
            [
                Tl[0][0] * Tr[0][0] + Tl[0][1] * Tr[1][0] + Tl[0][2] * Tr[2][0] + Tl[0][3] * Tr[3][0],
                Tl[0][0] * Tr[0][1] + Tl[0][1] * Tr[1][1] + Tl[0][2] * Tr[2][1] + Tl[0][3] * Tr[3][1],
                Tl[0][0] * Tr[0][2] + Tl[0][1] * Tr[1][2] + Tl[0][2] * Tr[2][2] + Tl[0][3] * Tr[3][2],
                Tl[0][0] * Tr[0][3] + Tl[0][1] * Tr[1][3] + Tl[0][2] * Tr[2][3] + Tl[0][3] * Tr[3][3],
                Tl[0][0] * Tr[0][4] + Tl[0][1] * Tr[1][4] + Tl[0][2] * Tr[2][4] + Tl[0][3] * Tr[3][4] + Tl[0][4]
            ],
            [
                Tl[1][0] * Tr[0][0] + Tl[1][1] * Tr[1][0] + Tl[1][2] * Tr[2][0] + Tl[1][3] * Tr[3][0],
                Tl[1][0] * Tr[0][1] + Tl[1][1] * Tr[1][1] + Tl[1][2] * Tr[2][1] + Tl[1][3] * Tr[3][1],
                Tl[1][0] * Tr[0][2] + Tl[1][1] * Tr[1][2] + Tl[1][2] * Tr[2][2] + Tl[1][3] * Tr[3][2],
                Tl[1][0] * Tr[0][3] + Tl[1][1] * Tr[1][3] + Tl[1][2] * Tr[2][3] + Tl[1][3] * Tr[3][3],
                Tl[1][0] * Tr[0][4] + Tl[1][1] * Tr[1][4] + Tl[1][2] * Tr[2][4] + Tl[1][3] * Tr[3][4] + Tl[1][4]
            ],
            [
                Tl[2][0] * Tr[0][0] + Tl[2][1] * Tr[1][0] + Tl[2][2] * Tr[2][0] + Tl[2][3] * Tr[3][0],
                Tl[2][0] * Tr[0][1] + Tl[2][1] * Tr[1][1] + Tl[2][2] * Tr[2][1] + Tl[2][3] * Tr[3][1],
                Tl[2][0] * Tr[0][2] + Tl[2][1] * Tr[1][2] + Tl[2][2] * Tr[2][2] + Tl[2][3] * Tr[3][2],
                Tl[2][0] * Tr[0][3] + Tl[2][1] * Tr[1][3] + Tl[2][2] * Tr[2][3] + Tl[2][3] * Tr[3][3],
                Tl[2][0] * Tr[0][4] + Tl[2][1] * Tr[1][4] + Tl[2][2] * Tr[2][4] + Tl[2][3] * Tr[3][4] + Tl[2][4]
            ],
            [
                Tl[3][0] * Tr[0][0] + Tl[3][1] * Tr[1][0] + Tl[3][2] * Tr[2][0] + Tl[3][3] * Tr[3][0],
                Tl[3][0] * Tr[0][1] + Tl[3][1] * Tr[1][1] + Tl[3][2] * Tr[2][1] + Tl[3][3] * Tr[3][1],
                Tl[3][0] * Tr[0][2] + Tl[3][1] * Tr[1][2] + Tl[3][2] * Tr[2][2] + Tl[3][3] * Tr[3][2],
                Tl[3][0] * Tr[0][3] + Tl[3][1] * Tr[1][3] + Tl[3][2] * Tr[2][3] + Tl[3][3] * Tr[3][3],
                Tl[3][0] * Tr[0][4] + Tl[3][1] * Tr[1][4] + Tl[3][2] * Tr[2][4] + Tl[3][3] * Tr[3][4] + Tl[3][4]
            ],
            [0, 0, 0, 0, 1]
        ];
        return new Transform4D(Tn);
    }


    translate_self_by_delta(dx, dy, dz, dw, is_in_own_frame) {
        if (is_in_own_frame) {
            // translation in own frame
            let delta_in_parent = this.transform_vector(new Vector4D(dx, dy, dz, dw));
            this.matrix[0][4] += delta_in_parent.x;
            this.matrix[1][4] += delta_in_parent.y;
            this.matrix[2][4] += delta_in_parent.z;
            this.matrix[3][4] += delta_in_parent.w;
        } else {
            // translation in parent frame
            this.matrix[0][4] += dx;
            this.matrix[1][4] += dy;
            this.matrix[2][4] += dz;
            this.matrix[3][4] += dw;
        }
    }

    rotate_self_by_delta(plane_string, angle_rad, is_in_own_frame) {
        // plane string: 'XY', 'XZ', 'XW', 'YZ', 'YW', 'ZW'
        let c = Math.cos(angle_rad);
        let s = Math.sin(angle_rad);
        let R = [
            [1, 0, 0, 0,  0],
            [0, 1, 0, 0,  0],
            [0, 0, 1, 0,  0],
            [0, 0, 0, 1,  0],

            [0, 0, 0, 0,  1]
        ];
        switch (plane_string) {
            case 'XY':
                R[0][0] = c; R[0][1] = -s;
                R[1][0] = s; R[1][1] = c;
                break;
            case 'XZ':
                R[0][0] = c; R[0][2] = -s;
                R[2][0] = s; R[2][2] = c;
                break;
            case 'XW':
                R[0][0] = c; R[0][3] = -s;
                R[3][0] = s; R[3][3] = c;
                break;
            case 'YZ':
                R[1][1] = c; R[1][2] = -s;
                R[2][1] = s; R[2][2] = c;
                break;
            case 'YW':
                R[1][1] = c; R[1][3] = -s;
                R[3][1] = s; R[3][3] = c;
                break;
            case 'ZW':
                R[2][2] = c; R[2][3] = -s;
                R[3][2] = s; R[3][3] = c;
                break;
            default:
                console.error('Invalid plane string for rotation');
                return;
        }
        // let newT = this.transform_transform(new Transform4D(R));
        // this.matrix = newT.matrix;
        let Rdelta = new Transform4D(R);
        if (is_in_own_frame) {
            // Apply rotation in own frame
            let newT = this.transform_transform(Rdelta);
            this.matrix = newT.matrix;
        } else {
            // Apply rotation in parent frame
            let newT = Rdelta.transform_transform(this);
            // this.matrix = newT.matrix;
            // only copy the rotation part, keep the translation part
            // without rotation_only, we rotate around the parent origin instead of our own origin
            this.matrix = [
                [newT.matrix[0][0], newT.matrix[0][1], newT.matrix[0][2], newT.matrix[0][3], this.matrix[0][4]],
                [newT.matrix[1][0], newT.matrix[1][1], newT.matrix[1][2], newT.matrix[1][3], this.matrix[1][4]],
                [newT.matrix[2][0], newT.matrix[2][1], newT.matrix[2][2], newT.matrix[2][3], this.matrix[2][4]],
                [newT.matrix[3][0], newT.matrix[3][1], newT.matrix[3][2], newT.matrix[3][3], this.matrix[3][4]],
                [0, 0, 0, 0, 1]
            ];
        }
    }

    setTranslation(v) {
        this.matrix[0][4] = v.x;
        this.matrix[1][4] = v.y;
        this.matrix[2][4] = v.z;
        this.matrix[3][4] = v.w;
    }
            
    rotation_only() {
        let R = [
            [this.matrix[0][0], this.matrix[0][1], this.matrix[0][2], this.matrix[0][3], 0],
            [this.matrix[1][0], this.matrix[1][1], this.matrix[1][2], this.matrix[1][3], 0],
            [this.matrix[2][0], this.matrix[2][1], this.matrix[2][2], this.matrix[2][3], 0],
            [this.matrix[3][0], this.matrix[3][1], this.matrix[3][2], this.matrix[3][3], 0],
            [0, 0, 0, 0, 1]
        ];
        return new Transform4D(R);
    }

    inverse() {
        // separate rotation and translation
        let R = [
            [this.matrix[0][0], this.matrix[0][1], this.matrix[0][2], this.matrix[0][3]],
            [this.matrix[1][0], this.matrix[1][1], this.matrix[1][2], this.matrix[1][3]],
            [this.matrix[2][0], this.matrix[2][1], this.matrix[2][2], this.matrix[2][3]],
            [this.matrix[3][0], this.matrix[3][1], this.matrix[3][2], this.matrix[3][3]]
        ];
        let t = [
            this.matrix[0][4],
            this.matrix[1][4],
            this.matrix[2][4],
            this.matrix[3][4]
        ];
        // transpose rotation
        let R_inv = [
            [R[0][0], R[1][0], R[2][0], R[3][0]],
            [R[0][1], R[1][1], R[2][1], R[3][1]],
            [R[0][2], R[1][2], R[2][2], R[3][2]],
            [R[0][3], R[1][3], R[2][3], R[3][3]]
        ];
        // new translation
        let t_inv = [
            -(R_inv[0][0] * t[0] + R_inv[0][1] * t[1] + R_inv[0][2] * t[2] + R_inv[0][3] * t[3]),
            -(R_inv[1][0] * t[0] + R_inv[1][1] * t[1] + R_inv[1][2] * t[2] + R_inv[1][3] * t[3]),
            -(R_inv[2][0] * t[0] + R_inv[2][1] * t[1] + R_inv[2][2] * t[2] + R_inv[2][3] * t[3]),
            -(R_inv[3][0] * t[0] + R_inv[3][1] * t[1] + R_inv[3][2] * t[2] + R_inv[3][3] * t[3])
        ];
        // combine into new matrix
        let invMatrix = [
            [R_inv[0][0], R_inv[0][1], R_inv[0][2], R_inv[0][3], t_inv[0]],
            [R_inv[1][0], R_inv[1][1], R_inv[1][2], R_inv[1][3], t_inv[1]],
            [R_inv[2][0], R_inv[2][1], R_inv[2][2], R_inv[2][3], t_inv[2]],
            [R_inv[3][0], R_inv[3][1], R_inv[3][2], R_inv[3][3], t_inv[3]],
            [0, 0, 0, 0, 1]
        ];
        return new Transform4D(invMatrix);
    }

    clone() {
        let newMatrix = [];
        for (let i = 0; i < 5; i++) {
            newMatrix[i] = [];
            for (let j = 0; j < 5; j++) {
                newMatrix[i][j] = this.matrix[i][j];
            }
        }
        return new Transform4D(newMatrix);
    }
} // class Transform4D