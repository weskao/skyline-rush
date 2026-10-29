import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Float32BufferAttribute } from 'three';

export function carShell(sections: readonly (readonly [number, number, number, number])[]): BufferGeometry {
  const vertices: number[] = [];
  const faces: number[] = [];
  sections.forEach(([z, width, bottom, top]) => vertices.push(-width, bottom, z, width, bottom, z, width, top, z, -width, top, z));
  for (let i = 0; i < sections.length - 1; i++) {
    for (let j = 0; j < 4; j++) {
      const a = i * 4 + j, b = i * 4 + (j + 1) % 4;
      faces.push(a, b, a + 4, b, b + 4, a + 4);
    }
  }
  const last = (sections.length - 1) * 4;
  faces.push(0, 2, 1, 0, 3, 2, last, last + 1, last + 2, last, last + 2, last + 3);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

// Canopy frustum: base quad sits inside the body shell (no bottom face), top quad is the roof.
export function canopy(baseWidth: number, frontZ: number, frontY: number, rearZ: number, rearY: number, topWidth: number, topFrontZ: number, topRearZ: number, topY: number): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([
    -baseWidth, frontY, frontZ, baseWidth, frontY, frontZ, baseWidth, rearY, rearZ, -baseWidth, rearY, rearZ,
    -topWidth, topY, topFrontZ, topWidth, topY, topFrontZ, topWidth, topY, topRearZ, -topWidth, topY, topRearZ,
  ], 3));
  geometry.setIndex([0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0, 4, 7, 6, 4, 6, 5]);
  geometry.computeVertexNormals();
  return geometry;
}

// Every road strip starts here: lit materials need a normal per vertex, or the shader yields NaN and bloom blackens
// the frame. Two vertices (left, right) per row; callers rewrite position/normal/index arrays and flag needsUpdate.
export function roadRibbon(rows: number): BufferGeometry {
  const geometry = new BufferGeometry();
  const normals = new Float32Array((rows + 1) * 6);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  const indices = new Uint16Array(rows * 6);
  for (let i = 0; i < rows; i++) indices.set([i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2], i * 6);
  geometry.setAttribute('position', new BufferAttribute(new Float32Array((rows + 1) * 6), 3).setUsage(DynamicDrawUsage));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3).setUsage(DynamicDrawUsage));
  geometry.setIndex(new BufferAttribute(indices, 1).setUsage(DynamicDrawUsage));
  return geometry;
}
