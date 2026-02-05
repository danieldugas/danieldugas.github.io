import { Transform4D, Vector4D } from '../hyperengine/transform4d.js';

export class AABBoxCollider {
    constructor(
        min, // Vector4D
        max  // Vector4D
    ) {
        this.min = min;
        this.max = max;
    }

    constrainTransform(transform) {
        // Constrain the transform matrix to stay outside the bounds of this collider
        const position = transform.origin();
        const size = this.max.subtract(this.min);
        const halfSize = size.multiply_by_scalar(0.5);
        const center = this.min.add(halfSize);

        // Clamp position to be within the bounds
        let is_inside_x = position.x > this.min.x && position.x < this.max.x;
        let is_inside_y = position.y > this.min.y && position.y < this.max.y;
        let is_inside_z = position.z > this.min.z && position.z < this.max.z;
        let is_inside_w = position.w > this.min.w && position.w < this.max.w;
        if (is_inside_x && is_inside_y && is_inside_z && is_inside_w) {
            // Find the closest face and push the position out along that axis
            let distances = [
                position.x - this.min.x,
                this.max.x - position.x,
                position.y - this.min.y,
                this.max.y - position.y,
                position.z - this.min.z,
                this.max.z - position.z,
                position.w - this.min.w,
                this.max.w - position.w
            ];
            let minDistance = Math.min(...distances);
            let closestFaceIndex = distances.indexOf(minDistance);
            switch (closestFaceIndex) {
                case 0: // left face
                    position.x = this.min.x;
                    break;
                case 1: // right face
                    position.x = this.max.x;
                    break;
                case 2: // front face
                    position.y = this.min.y;
                    break;
                case 3: // back face
                    position.y = this.max.y;
                    break;
                case 4: // near face
                    position.z = this.min.z;
                    break;
                case 5: // far face
                    position.z = this.max.z;
                    break;
                case 6: // near w face
                    position.w = this.min.w;
                    break;
                case 7: // far w face
                    position.w = this.max.w;
                    break;
            }

            // Update the translation in the transform matrix
            transform.setTranslation(position);
            return true;
        }

        return false;
    }
} // class AABBoxCollider