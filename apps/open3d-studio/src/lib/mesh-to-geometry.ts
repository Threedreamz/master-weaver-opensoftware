import * as THREE from 'three';

interface MeshData {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

export function meshDataToGeometry(mesh: MeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.vertices, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  return geometry;
}

export function geometryToMeshData(geometry: THREE.BufferGeometry): MeshData {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute;
  const norm = geometry.getAttribute('normal') as THREE.BufferAttribute;
  const idx = geometry.getIndex();
  return {
    vertices: new Float32Array(pos.array),
    normals: norm ? new Float32Array(norm.array) : new Float32Array(pos.count * 3),
    indices: idx ? new Uint32Array(idx.array) : new Uint32Array(Array.from({ length: pos.count }, (_, i) => i)),
  };
}
