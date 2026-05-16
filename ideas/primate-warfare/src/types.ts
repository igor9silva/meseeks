import type { Group, Mesh } from 'three';

export type SpeciesId = 'baboon' | 'bonobo' | 'chimp' | 'orangutan' | 'sagui';

export type PoseMode = 'tpose' | 'relaxed' | 'aim';

export type AnimationMode = 'idle' | 'walk' | 'run' | 'aim';

export interface SpeciesConfig {
	id: SpeciesId;
	name: string;
	role: string;
	notes: string;
	scale: number;
	body: {
		height: number;
		width: number;
		depth: number;
		belly: number;
	};
	head: {
		width: number;
		height: number;
		depth: number;
		y: number;
		snout: number;
		ear: number;
	};
	limbs: {
		arm: number;
		leg: number;
		hand: number;
		foot: number;
		stance: number;
	};
	armor: {
		shoulder: number;
		chest: number;
		knee: number;
	};
	colors: {
		fur: number;
		furDark: number;
		skin: number;
		skinDark: number;
		face: number;
		muzzle: number;
		armor: number;
		armorDark: number;
		accent: number;
		weaponWood: number;
	};
	features: {
		mane?: boolean;
		blueCheeks?: boolean;
		orangeCoat?: boolean;
		helmet?: boolean;
		saguiTufts?: boolean;
		longArms?: boolean;
	};
}

export interface RigParts {
	root: Group;
	base: Group;
	torso: Group;
	chest: Group;
	head: Group;
	jaw: Group;
	leftUpperArm: Group;
	leftLowerArm: Group;
	leftHand: Group;
	rightUpperArm: Group;
	rightLowerArm: Group;
	rightHand: Group;
	leftUpperLeg: Group;
	leftLowerLeg: Group;
	rightUpperLeg: Group;
	rightLowerLeg: Group;
	weapon: Group;
	muzzleFlash: Mesh;
}

export interface PrimateModel {
	config: SpeciesConfig;
	root: Group;
	parts: RigParts;
	triangleCount: number;
	drawCallCount: number;
	partCount: number;
	update: (timeSeconds: number, mode: AnimationMode, pose: PoseMode, isSelected: boolean) => void;
}
