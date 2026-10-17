import { BufferGeometry, Float32BufferAttribute } from 'three';

export function carShell(sections) {
  const vertices = [];
  const faces = [];
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
