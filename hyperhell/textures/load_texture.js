// Load a PNG image into a 3D texture (U=width, V=height, W=1)
function loadImageTexture(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);
            const pixels = imageData.data;

            const USIZE = img.width;
            const VSIZE = img.height;
            const WSIZE = 1;
            const texture = new Uint32Array(USIZE * VSIZE * WSIZE);

            for (let v = 0; v < VSIZE; v++) {
                for (let u = 0; u < USIZE; u++) {
                    // Flip vertically: texture V=0 is wall bottom, image row 0 is top
                    const imgRow = VSIZE - 1 - v;
                    const imgIdx = (imgRow * USIZE + u) * 4;
                    const r = pixels[imgIdx];
                    const g = pixels[imgIdx + 1];
                    const b = pixels[imgIdx + 2];
                    const a = pixels[imgIdx + 3];
                    texture[u + v * USIZE] = (a << 24) | (b << 16) | (g << 8) | r;
                }
            }

            resolve({ texture, texture_info: { USIZE, VSIZE, WSIZE } });
        };
        img.onerror = reject;
        img.src = url;
    });
}
const horrorsTex = await loadImageTexture('../textures/horrors_320x180.png');
const applyHorrors = (wall) => {
  if (!APPLY_TEXTURES) return;
  wall.texture = horrorsTex.texture;
  wall.texture_info = horrorsTex.texture_info;
  wall.vertices_in_texmap = wall.vertices_in_object.map(v =>
    new Vector4D(v.y * 0.5 + 0.5, v.z * 0.5 + 0.5, 0, 0)
  );
};