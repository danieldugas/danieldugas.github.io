import { Transform4D, Vector4D } from '../transform4d.js';

const results = [];

function assert_near(a, b, tol, msg) {
    const pass = Math.abs(a - b) < tol;
    const entry = { pass, msg: msg + (pass ? '' : ` (got ${a}, expected ${b})`) };
    results.push(entry);
    console.log(pass ? `PASS: ${msg}` : `FAIL: ${entry.msg}`);
}

function assert_matrix_near_identity(T, tol, msg) {
    const m = T.matrix;
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const expected = (i === j) ? 1 : 0;
            const pass = Math.abs(m[i][j] - expected) < tol;
            if (!pass) {
                const entry = { pass: false, msg: `${msg} [${i}][${j}] got ${m[i][j]}, expected ${expected}` };
                results.push(entry);
                console.log(`FAIL: ${entry.msg}`);
                return;
            }
        }
    }
    results.push({ pass: true, msg });
    console.log(`PASS: ${msg}`);
}

function assert_vector_near(a, b, tol, msg) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    const dz = Math.abs(a.z - b.z);
    const dw = Math.abs(a.w - b.w);
    const pass = dx < tol && dy < tol && dz < tol && dw < tol;
    const entry = { pass, msg: msg + (pass ? '' : ` (got [${a.x},${a.y},${a.z},${a.w}], expected [${b.x},${b.y},${b.z},${b.w}])`) };
    results.push(entry);
    console.log(pass ? `PASS: ${msg}` : `FAIL: ${entry.msg}`);
}

const EPS = 1e-9;

// --- Test 1: Identity inverse is identity ---
{
    const I = new Transform4D([
        [1,0,0,0,0],
        [0,1,0,0,0],
        [0,0,1,0,0],
        [0,0,0,1,0],
        [0,0,0,0,1]
    ]);
    assert_matrix_near_identity(I.inverse(), EPS, "Identity inverse is identity");
}

// --- Test 2: Pure translation inverse ---
{
    const T = new Transform4D([
        [1,0,0,0, 3],
        [0,1,0,0,-1],
        [0,0,1,0, 7],
        [0,0,0,1, 2],
        [0,0,0,0, 1]
    ]);
    const TT_inv = T.transform_transform(T.inverse());
    assert_matrix_near_identity(TT_inv, EPS, "Translation * its inverse = identity");
}

// --- Test 3: Pure rotation inverse (XY plane) ---
{
    const a = Math.PI / 3;
    const c = Math.cos(a), s = Math.sin(a);
    const R = new Transform4D([
        [ c, s, 0, 0, 0],
        [-s, c, 0, 0, 0],
        [ 0, 0, 1, 0, 0],
        [ 0, 0, 0, 1, 0],
        [ 0, 0, 0, 0, 1]
    ]);
    const RR_inv = R.transform_transform(R.inverse());
    assert_matrix_near_identity(RR_inv, EPS, "Rotation * its inverse = identity");
}

// --- Test 4: Uniform scaling inverse ---
{
    const s = 3;
    const S = new Transform4D([
        [s,0,0,0, 0],
        [0,s,0,0, 0],
        [0,0,s,0, 0],
        [0,0,0,s, 0],
        [0,0,0,0, 1]
    ]);
    const Si = S.inverse();
    assert_near(Si.matrix[0][0], 1/s, EPS, "Uniform scale inverse diagonal");
    const SS_inv = S.transform_transform(Si);
    assert_matrix_near_identity(SS_inv, EPS, "Uniform scale * its inverse = identity");
}

// --- Test 5: Non-uniform scaling inverse ---
{
    const S = new Transform4D([
        [2,0,0,0, 0],
        [0,3,0,0, 0],
        [0,0,5,0, 0],
        [0,0,0,7, 0],
        [0,0,0,0, 1]
    ]);
    const SS_inv = S.transform_transform(S.inverse());
    assert_matrix_near_identity(SS_inv, EPS, "Non-uniform scale * its inverse = identity");
}

// --- Test 6: Combined rotation + translation + scale ---
{
    const a = 0.7;
    const c = Math.cos(a), s = Math.sin(a);
    const T = new Transform4D([
        [ 2*c, 2*s, 0, 0,  5],
        [-2*s, 2*c, 0, 0, -3],
        [   0,   0, 3, 0,  1],
        [   0,   0, 0, 4,  2],
        [   0,   0, 0, 0,  1]
    ]);
    const TT_inv = T.transform_transform(T.inverse());
    assert_matrix_near_identity(TT_inv, EPS, "Rotation+scale+translation * inverse = identity");
}

// --- Test 7: Inverse undoes transform on a point ---
{
    const a = 1.2;
    const c = Math.cos(a), s = Math.sin(a);
    const T = new Transform4D([
        [ c, s, 0, 0, 10],
        [-s, c, 0, 0, 20],
        [ 0, 0, 2, 0, 30],
        [ 0, 0, 0, 3, 40],
        [ 0, 0, 0, 0,  1]
    ]);
    const p = new Vector4D(1, 2, 3, 4);
    const round_trip = T.inverse().transform_point(T.transform_point(p));
    assert_vector_near(round_trip, p, EPS, "T_inv(T(p)) == p");
}

// --- Test 8: Singular matrix throws ---
{
    const S = new Transform4D([
        [0,0,0,0,0],
        [0,1,0,0,0],
        [0,0,1,0,0],
        [0,0,0,1,0],
        [0,0,0,0,1]
    ]);
    let threw = false;
    try { S.inverse(); } catch(e) { threw = true; }
    const entry = { pass: threw, msg: "Singular matrix throws" + (threw ? '' : ' (no error thrown)') };
    results.push(entry);
    console.log(threw ? `PASS: ${entry.msg}` : `FAIL: ${entry.msg}`);
}

// --- Render results to page ---
const div = document.getElementById('results');
if (div) {
    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    div.innerHTML = `<h2>Transform4D.inverse() Tests: ${passed}/${total} passed</h2>` +
        results.map(r =>
            `<div style="color:${r.pass ? 'green' : 'red'}">${r.pass ? '✓' : '✗'} ${r.msg}</div>`
        ).join('');
}
