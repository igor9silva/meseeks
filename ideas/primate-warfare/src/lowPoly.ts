import {
	BoxGeometry,
	BufferGeometry,
	ConeGeometry,
	CylinderGeometry,
	DodecahedronGeometry,
	Group,
	Mesh,
	MeshStandardMaterial,
	Object3D,
	type Material,
	type Object3DEventMap,
} from 'three';

export const geometries = {
	box: new BoxGeometry(1, 1, 1),
	cone: new ConeGeometry(1, 1, 4, 1, false),
	cylinder: new CylinderGeometry(1, 1, 1, 6, 1, false),
	dodecahedron: new DodecahedronGeometry(1, 0),
};

const materialCache = new Map<string, MeshStandardMaterial>();

export function material(color: number, options: { metalness?: number; roughness?: number; emissive?: number } = {}) {
	const key = `${color}:${options.metalness ?? 0.04}:${options.roughness ?? 0.82}:${options.emissive ?? 0x000000}`;
	const cached = materialCache.get(key);
	if (cached) return cached;

	const next = new MeshStandardMaterial({
		color,
		emissive: options.emissive ?? 0x000000,
		flatShading: true,
		metalness: options.metalness ?? 0.04,
		roughness: options.roughness ?? 0.82,
	});
	materialCache.set(key, next);
	return next;
}

export function group(name: string, parent?: Group | Object3D<Object3DEventMap>) {
	const next = new Group();
	next.name = name;
	if (parent) parent.add(next);
	return next;
}

export function box(
	name: string,
	parent: Group | Object3D<Object3DEventMap>,
	materialValue: Material,
	position: readonly [number, number, number],
	scale: readonly [number, number, number],
	rotation: readonly [number, number, number] = [0, 0, 0],
) {
	return mesh(name, geometries.box, parent, materialValue, position, scale, rotation);
}

export function poly(
	name: string,
	parent: Group | Object3D<Object3DEventMap>,
	materialValue: Material,
	position: readonly [number, number, number],
	scale: readonly [number, number, number],
	rotation: readonly [number, number, number] = [0, 0, 0],
) {
	return mesh(name, geometries.dodecahedron, parent, materialValue, position, scale, rotation);
}

export function cylinder(
	name: string,
	parent: Group | Object3D<Object3DEventMap>,
	materialValue: Material,
	position: readonly [number, number, number],
	scale: readonly [number, number, number],
	rotation: readonly [number, number, number] = [0, 0, 0],
) {
	return mesh(name, geometries.cylinder, parent, materialValue, position, scale, rotation);
}

export function cone(
	name: string,
	parent: Group | Object3D<Object3DEventMap>,
	materialValue: Material,
	position: readonly [number, number, number],
	scale: readonly [number, number, number],
	rotation: readonly [number, number, number] = [0, 0, 0],
) {
	return mesh(name, geometries.cone, parent, materialValue, position, scale, rotation);
}

export function collectMeshStats(root: Object3D) {
	let triangleCount = 0;
	let drawCallCount = 0;
	let partCount = 0;

	root.traverse((object) => {
		partCount += 1;
		if (!(object instanceof Mesh)) return;
		drawCallCount += 1;
		triangleCount += countTriangles(object.geometry);
	});

	return { triangleCount, drawCallCount, partCount };
}

function mesh(
	name: string,
	geometry: BufferGeometry,
	parent: Group | Object3D<Object3DEventMap>,
	materialValue: Material,
	position: readonly [number, number, number],
	scale: readonly [number, number, number],
	rotation: readonly [number, number, number],
) {
	const next = new Mesh(geometry, materialValue);
	next.name = name;
	next.position.set(position[0], position[1], position[2]);
	next.scale.set(scale[0], scale[1], scale[2]);
	next.rotation.set(rotation[0], rotation[1], rotation[2]);
	next.castShadow = true;
	next.receiveShadow = true;
	parent.add(next);
	return next;
}

function countTriangles(geometry: BufferGeometry) {
	const indexCount = geometry.index?.count;
	if (indexCount) return indexCount / 3;

	const positionCount = geometry.attributes.position?.count;
	return positionCount ? positionCount / 3 : 0;
}
