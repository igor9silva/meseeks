import { Group, Mesh, MeshStandardMaterial, MathUtils, Vector3 } from 'three';
import { box, collectMeshStats, cone, cylinder, group, material, poly } from './lowPoly';
import type { AnimationMode, PoseMode, PrimateModel, RigParts, SpeciesConfig } from './types';

const PI = Math.PI;
const upAxis = new Vector3(0, 1, 0);

export function createPrimateModel(config: SpeciesConfig): PrimateModel {
	const root = group(`${config.id}-root`);
	const base = group(`${config.id}-base`, root);
	base.scale.setScalar(config.scale);

	const skin = material(config.colors.skin);
	const skinDark = material(config.colors.skinDark);
	const fur = material(config.colors.fur);
	const furDark = material(config.colors.furDark);
	const face = material(config.colors.face);
	const muzzle = material(config.colors.muzzle);
	const armor = material(config.colors.armor, { metalness: 0.08, roughness: 0.7 });
	const armorDark = material(config.colors.armorDark, { metalness: 0.1, roughness: 0.68 });
	const accent = material(config.colors.accent);
	const black = material(0x090a08);
	const weaponDark = material(0x222520, { metalness: 0.16, roughness: 0.56 });
	const weaponMetal = material(0x3d4039, { metalness: 0.28, roughness: 0.48 });
	const weaponWood = material(config.colors.weaponWood);
	const flashMaterial = material(0xffc757, { emissive: 0x6b3200, metalness: 0, roughness: 0.36 });

	const torso = group('torso-pivot', base);
	torso.position.set(0, 1.78, 0);
	poly('torso-fur', torso, fur, [0, 0.18, 0], [config.body.width * 0.5, config.body.height * 0.5, config.body.depth * 0.5]);
	poly('belly-mass', torso, config.features.orangeCoat ? fur : furDark, [0, -0.2, 0.04], [
		config.body.belly * 0.48,
		config.body.height * 0.42,
		config.body.depth * 0.5,
	]);

	const chest = group('chest-armor', torso);
	chest.position.set(0, 0.32, config.body.depth * 0.31);
	box('neck-collar', chest, armorDark, [0, 0.39, -0.04], [config.armor.chest * 0.7, 0.16, 0.14]);
	box('center-chest-plate', chest, armor, [0, 0.05, 0], [config.armor.chest * 0.68, 0.52, 0.1], [MathUtils.degToRad(-4), 0, 0]);
	box('left-chest-plate', chest, armor, [-config.armor.chest * 0.23, -0.08, 0.02], [config.armor.chest * 0.34, 0.38, 0.1], [0, 0, MathUtils.degToRad(-10)]);
	box('right-chest-plate', chest, armor, [config.armor.chest * 0.23, -0.08, 0.02], [config.armor.chest * 0.34, 0.38, 0.1], [0, 0, MathUtils.degToRad(10)]);
	box('lower-chest-lip', chest, armorDark, [0, -0.28, 0.04], [config.armor.chest * 0.68, 0.08, 0.12]);
	box('belt', torso, armorDark, [0, -0.62, config.body.depth * 0.16], [config.body.width * 1.04, 0.16, 0.14]);
	poly('belt-buckle', torso, armor, [0, -0.62, config.body.depth * 0.28], [0.18, 0.16, 0.08]);
	box('front-skirt-plate', torso, armor, [0, -0.88, config.body.depth * 0.18], [0.38, 0.46, 0.12], [0, 0, 0]);
	box('left-hip-plate', torso, armor, [-0.38, -0.76, config.body.depth * 0.1], [0.24, 0.42, 0.1], [0, 0, MathUtils.degToRad(10)]);
	box('right-hip-plate', torso, armor, [0.38, -0.76, config.body.depth * 0.1], [0.24, 0.42, 0.1], [0, 0, MathUtils.degToRad(-10)]);

	const head = group('head-pivot', base);
	head.position.set(0, config.head.y, 0.03);
	poly('head-fur', head, config.features.orangeCoat ? furDark : fur, [0, 0, 0], [
		config.head.width * 0.5,
		config.head.height * 0.5,
		config.head.depth * 0.5,
	]);
	poly('face-mask', head, face, [0, -0.03, config.head.depth * 0.28], [
		config.head.width * 0.6,
		config.head.height * 0.52,
		0.08,
	]);

	const jaw = group('jaw-pivot', head);
	jaw.position.set(0, -0.16, config.head.depth * 0.36);
	const muzzleDepth = config.id === 'baboon' ? config.head.snout * 1.04 : config.head.snout * 0.74;
	const muzzleWidth = config.head.width * (config.id === 'baboon' ? 0.42 : 0.5);
	const muzzleHeight = config.head.height * (config.id === 'baboon' ? 0.3 : 0.26);
	poly('muzzle-block', jaw, muzzle, [0, 0, muzzleDepth * 0.25], [
		muzzleWidth,
		muzzleHeight,
		muzzleDepth,
	]);
	box('mouth-line', jaw, black, [0, -0.1, muzzleDepth * 0.54], [config.head.width * 0.34, 0.025, 0.028]);
	box('left-nostril', jaw, black, [-config.head.width * 0.12, 0.08, muzzleDepth * 0.55], [0.055, 0.055, 0.03]);
	box('right-nostril', jaw, black, [config.head.width * 0.12, 0.08, muzzleDepth * 0.55], [0.055, 0.055, 0.03]);
	box('left-eye', head, black, [-config.head.width * 0.17, 0.16, config.head.depth * 0.34], [0.1, 0.08, 0.04]);
	box('right-eye', head, black, [config.head.width * 0.17, 0.16, config.head.depth * 0.34], [0.1, 0.08, 0.04]);
	box('brow', head, config.features.saguiTufts ? accent : skinDark, [0, 0.24, config.head.depth * 0.32], [
		config.head.width * 0.62,
		0.08,
		0.08,
	]);

	for (const side of [-1, 1] as const) {
		const ear = group(side < 0 ? 'left-ear' : 'right-ear', head);
		ear.position.set(side * config.head.width * 0.56, 0.04, -0.02);
		poly('ear-outer', ear, skin, [0, 0, 0], [config.head.ear * 0.5, config.head.ear * 0.64, config.head.ear * 0.26]);
		poly('ear-inner', ear, skinDark, [side * 0.01, -0.01, 0.02], [
			config.head.ear * 0.32,
			config.head.ear * 0.42,
			config.head.ear * 0.14,
		]);
	}

	if (config.features.mane) addMane(head, furDark, config);
	if (config.features.blueCheeks) addBaboonCheeks(head, accent, config);
	if (config.features.helmet) addHelmet(head, armorDark, armor, config);
	if (config.features.orangeCoat) addOrangutanCoat(head, fur, config);
	if (config.features.saguiTufts) addSaguiTufts(head, furDark, accent, config);
	addSpeciesFaceDetails(head, jaw, config, { skin, skinDark, face, muzzle, fur, furDark, armor, armorDark, accent, black });

	const arms = createArms(base, config, { fur, furDark, skin, armor, armorDark });
	const legs = createLegs(base, config, { fur, furDark, skin, armor, armorDark });
	const weapon = createWeapon(base, { weaponDark, weaponMetal, weaponWood, flashMaterial });
	const muzzleFlash = weapon.getObjectByName('muzzle-flash');
	if (!(muzzleFlash instanceof Mesh)) throw new Error('Missing muzzle flash mesh');

	const parts: RigParts = {
		root,
		base,
		torso,
		chest,
		head,
		jaw,
		leftUpperArm: arms.leftUpperArm,
		leftLowerArm: arms.leftLowerArm,
		leftHand: arms.leftHand,
		rightUpperArm: arms.rightUpperArm,
		rightLowerArm: arms.rightLowerArm,
		rightHand: arms.rightHand,
		leftUpperLeg: legs.leftUpperLeg,
		leftLowerLeg: legs.leftLowerLeg,
		rightUpperLeg: legs.rightUpperLeg,
		rightLowerLeg: legs.rightLowerLeg,
		weapon,
		muzzleFlash,
	};

	const stats = collectMeshStats(root);

	return {
		config,
		root,
		parts,
		triangleCount: Math.round(stats.triangleCount),
		drawCallCount: stats.drawCallCount,
		partCount: stats.partCount,
		update: (timeSeconds, mode, pose, isSelected) => {
			updatePrimate(config, parts, timeSeconds, mode, pose, isSelected);
		},
	};
}

function createArms(
	base: Group,
	config: SpeciesConfig,
	materials: Record<'fur' | 'furDark' | 'skin' | 'armor' | 'armorDark', MeshStandardMaterial>,
) {
	const sideData = [-1, 1] as const;
	const armLength = config.limbs.arm * (config.features.longArms ? 1.08 : 1);
	const shoulderY = 2.45;
	const shoulderX = config.body.width * 0.56;

	const result = {
		leftUpperArm: new Group(),
		leftLowerArm: new Group(),
		leftHand: new Group(),
		rightUpperArm: new Group(),
		rightLowerArm: new Group(),
		rightHand: new Group(),
	};

	for (const side of sideData) {
		const sideName = side < 0 ? 'left' : 'right';
		const upper = group(`${sideName}-upper-arm`, base);
		cylinder(`${sideName}-upper-arm-fur`, upper, materials.fur, [0, 0, 0], [0.14, 1, 0.16]);
		poly(`${sideName}-shoulder-pad`, base, materials.armor, [side * shoulderX, shoulderY - 0.08, 0.06], [
			config.armor.shoulder * 0.44,
			config.armor.shoulder * 0.28,
			config.armor.shoulder * 0.36,
		]);
		box(`${sideName}-shoulder-underplate`, base, materials.armorDark, [side * shoulderX, shoulderY - 0.25, 0.04], [
			config.armor.shoulder * 0.48,
			0.08,
			config.armor.shoulder * 0.38,
		], [0, 0, side * MathUtils.degToRad(5)]);

		const lower = group(`${sideName}-lower-arm`, base);
		cylinder(`${sideName}-lower-arm-fur`, lower, materials.furDark, [0, 0, 0], [0.12, 1, 0.14]);
		box(`${sideName}-forearm-bracer`, lower, materials.armorDark, [0, -0.18, 0.02], [0.26, 0.18, 0.22]);
		box(`${sideName}-forearm-plate`, lower, materials.armor, [0, -0.02, 0.1], [0.28, 0.34, 0.08]);

		const hand = group(`${sideName}-hand`, base);
		poly(`${sideName}-palm`, hand, materials.skin, [0, 0, 0], [
			config.limbs.hand,
			config.limbs.hand * 0.72,
			config.limbs.hand * 0.7,
		]);

		for (let finger = 0; finger < 3; finger += 1) {
			box(`${sideName}-finger-${finger + 1}`, hand, materials.skin, [
				(finger - 1) * config.limbs.hand * 0.34,
				-config.limbs.hand * 0.32,
				config.limbs.hand * 0.46,
			], [config.limbs.hand * 0.18, config.limbs.hand * 0.38, config.limbs.hand * 0.16]);
		}

		if (side < 0) {
			result.leftUpperArm = upper;
			result.leftLowerArm = lower;
			result.leftHand = hand;
		} else {
			result.rightUpperArm = upper;
			result.rightLowerArm = lower;
			result.rightHand = hand;
		}
	}

	return result;
}

function createLegs(
	base: Group,
	config: SpeciesConfig,
	materials: Record<'fur' | 'furDark' | 'skin' | 'armor' | 'armorDark', MeshStandardMaterial>,
) {
	const sideData = [-1, 1] as const;
	const upperLength = config.limbs.leg * 0.52;
	const lowerLength = config.limbs.leg * 0.48;
	const hipY = 1.3;

	const result = {
		leftUpperLeg: new Group(),
		leftLowerLeg: new Group(),
		rightUpperLeg: new Group(),
		rightLowerLeg: new Group(),
	};

	for (const side of sideData) {
		const sideName = side < 0 ? 'left' : 'right';
		const upper = group(`${sideName}-upper-leg`, base);
		upper.position.set(side * config.limbs.stance, hipY, -0.02);
		cylinder(`${sideName}-upper-leg-fur`, upper, materials.fur, [0, -upperLength * 0.5, 0], [0.17, upperLength, 0.18]);
		poly(`${sideName}-knee-pad`, upper, materials.armor, [0, -upperLength * 0.94, 0.12], [
			config.armor.knee,
			config.armor.knee * 0.72,
			config.armor.knee * 0.32,
		]);

		const lower = group(`${sideName}-lower-leg`, upper);
		lower.position.set(0, -upperLength, 0);
		cylinder(`${sideName}-lower-leg-fur`, lower, materials.furDark, [0, -lowerLength * 0.5, 0], [0.15, lowerLength, 0.16]);
		box(`${sideName}-shin-plate`, lower, materials.armorDark, [0, -lowerLength * 0.52, 0.15], [
			config.armor.knee * 0.86,
			lowerLength * 0.55,
			0.08,
		]);
		poly(`${sideName}-foot`, lower, materials.skin, [0, -lowerLength - 0.06, 0.16], [
			config.limbs.foot,
			config.limbs.foot * 0.28,
			config.limbs.foot * 0.62,
		]);

		for (let toe = 0; toe < 3; toe += 1) {
			box(`${sideName}-toe-${toe + 1}`, lower, materials.skin, [
				(toe - 1) * config.limbs.foot * 0.24,
				-lowerLength - 0.08,
				0.36,
			], [config.limbs.foot * 0.18, config.limbs.foot * 0.18, config.limbs.foot * 0.28]);
		}

		if (side < 0) {
			result.leftUpperLeg = upper;
			result.leftLowerLeg = lower;
		} else {
			result.rightUpperLeg = upper;
			result.rightLowerLeg = lower;
		}
	}

	return result;
}

function createWeapon(
	parent: Group,
	materials: Record<'weaponDark' | 'weaponMetal' | 'weaponWood' | 'flashMaterial', MeshStandardMaterial>,
) {
	const weapon = group('rifle', parent);
	box('receiver', weapon, materials.weaponDark, [0, 0, 0.12], [0.2, 0.16, 0.58]);
	box('top-cover', weapon, materials.weaponMetal, [0, 0.08, 0.06], [0.22, 0.08, 0.44]);
	box('wood-handguard', weapon, materials.weaponWood, [0, 0.01, 0.5], [0.22, 0.15, 0.32]);
	box('stock', weapon, materials.weaponWood, [0, -0.02, -0.34], [0.22, 0.16, 0.38], [0, MathUtils.degToRad(8), 0]);
	box('grip', weapon, materials.weaponDark, [0, -0.22, 0.02], [0.12, 0.28, 0.12], [MathUtils.degToRad(-10), 0, 0]);
	box('magazine', weapon, materials.weaponMetal, [0, -0.28, 0.24], [0.16, 0.38, 0.18], [MathUtils.degToRad(-18), 0, 0]);
	cylinder('barrel', weapon, materials.weaponMetal, [0, 0.02, 0.9], [0.035, 0.72, 0.035], [PI / 2, 0, 0]);
	cylinder('muzzle', weapon, materials.weaponDark, [0, 0.02, 1.28], [0.05, 0.14, 0.05], [PI / 2, 0, 0]);
	box('front-sight', weapon, materials.weaponDark, [0, 0.18, 1.03], [0.08, 0.22, 0.05]);
	box('rear-sight', weapon, materials.weaponDark, [0, 0.15, 0.08], [0.12, 0.1, 0.05]);
	const flash = cone('muzzle-flash', weapon, materials.flashMaterial, [0, 0.02, 1.42], [0.09, 0.22, 0.09], [PI / 2, 0, 0]);
	flash.visible = false;
	return weapon;
}

function addSpeciesFaceDetails(
	head: Group,
	jaw: Group,
	config: SpeciesConfig,
	materials: Record<
		'skin' | 'skinDark' | 'face' | 'muzzle' | 'fur' | 'furDark' | 'armor' | 'armorDark' | 'accent' | 'black',
		MeshStandardMaterial
	>,
) {
	const width = config.head.width;
	const height = config.head.height;
	const depth = config.head.depth;

	if (config.id === 'baboon') {
		box('baboon-brow-slab', head, materials.skinDark, [0, height * 0.3, depth * 0.36], [
			width * 0.76,
			0.09,
			0.1,
		]);
		box('baboon-red-nose-ridge', head, materials.muzzle, [0, height * 0.04, depth * 0.49], [
			width * 0.16,
			height * 0.5,
			0.09,
		]);
		poly('baboon-heavy-beard', head, materials.furDark, [0, -height * 0.46, depth * 0.07], [
			width * 0.3,
			height * 0.22,
			depth * 0.22,
		]);
		for (const side of [-1, 1] as const) {
			box(`baboon-cheek-shadow-${side}`, head, materials.furDark, [side * width * 0.34, -height * 0.08, depth * 0.31], [
				width * 0.08,
				height * 0.44,
				0.08,
			], [0, 0, side * MathUtils.degToRad(12)]);
		}
		return;
	}

	if (config.id === 'bonobo') {
		box('bonobo-brow-mask', head, materials.skinDark, [0, height * 0.2, depth * 0.38], [width * 0.64, 0.08, 0.08]);
		box('bonobo-mouth-plane', jaw, materials.face, [0, -height * 0.07, config.head.snout * 0.58], [
			width * 0.54,
			0.1,
			0.04,
		]);
		for (const side of [-1, 1] as const) {
			poly(`bonobo-cheek-plane-${side}`, head, materials.face, [side * width * 0.2, -height * 0.04, depth * 0.38], [
				width * 0.16,
				height * 0.26,
				0.05,
			]);
		}
		return;
	}

	if (config.id === 'chimp') {
		box('chimp-forehead-mask', head, materials.skin, [0, height * 0.24, depth * 0.38], [width * 0.68, 0.1, 0.09]);
		box('chimp-muzzle-bridge', head, materials.muzzle, [0, height * 0.02, depth * 0.5], [
			width * 0.24,
			height * 0.3,
			0.07,
		]);
		for (const side of [-1, 1] as const) {
			box(`chimp-cheek-plane-${side}`, head, materials.face, [side * width * 0.18, -height * 0.07, depth * 0.42], [
				width * 0.2,
				height * 0.22,
				0.06,
			], [0, 0, side * MathUtils.degToRad(6)]);
		}
		return;
	}

	if (config.id === 'orangutan') {
		box('orangutan-gray-brow', head, materials.skinDark, [0, height * 0.2, depth * 0.37], [width * 0.58, 0.1, 0.08]);
		poly('orangutan-wide-nose-plane', head, materials.face, [0, height * 0.02, depth * 0.48], [
			width * 0.3,
			height * 0.28,
			0.08,
		]);
		for (const side of [-1, 1] as const) {
			box(`orangutan-gray-cheek-${side}`, head, materials.face, [side * width * 0.17, -height * 0.12, depth * 0.43], [
				width * 0.18,
				height * 0.24,
				0.06,
			], [0, 0, side * MathUtils.degToRad(8)]);
		}
		return;
	}

	if (config.id === 'sagui') {
		box('sagui-gold-eye-mask', head, materials.accent, [0, height * 0.15, depth * 0.39], [width * 0.72, 0.18, 0.07]);
		box('sagui-dark-brow-edge', head, materials.furDark, [0, height * 0.27, depth * 0.38], [width * 0.78, 0.08, 0.08]);
		poly('sagui-small-chin', jaw, materials.muzzle, [0, -height * 0.16, config.head.snout * 0.54], [
			width * 0.22,
			height * 0.18,
			0.06,
		]);
	}
}

function addMane(head: Group, furDark: MeshStandardMaterial, config: SpeciesConfig) {
	poly('left-mane-mass', head, furDark, [-config.head.width * 0.42, 0, -0.08], [
		config.head.width * 0.24,
		config.head.height * 0.52,
		config.head.depth * 0.28,
	], [0, 0, MathUtils.degToRad(-10)]);
	poly('right-mane-mass', head, furDark, [config.head.width * 0.42, 0, -0.08], [
		config.head.width * 0.24,
		config.head.height * 0.52,
		config.head.depth * 0.28,
	], [0, 0, MathUtils.degToRad(10)]);
	poly('top-mane-cap', head, furDark, [0, config.head.height * 0.28, -0.09], [
		config.head.width * 0.38,
		config.head.height * 0.24,
		config.head.depth * 0.28,
	]);

	const positions: Array<[number, number, number, number]> = [
		[-0.38, 0.12, -0.2, -18],
		[0.38, 0.12, -0.2, 18],
		[-0.33, -0.18, -0.16, -28],
		[0.33, -0.18, -0.16, 28],
		[-0.12, 0.38, -0.16, -8],
		[0.12, 0.38, -0.16, 8],
		[0, -0.36, -0.12, 0],
	];

	for (const [x, y, z, rz] of positions) {
		cone('mane-tuft', head, furDark, [x * config.head.width, y * config.head.height, z], [
			0.18,
			0.34,
			0.18,
		], [0, 0, MathUtils.degToRad(rz)]);
	}
}

function addBaboonCheeks(head: Group, accent: MeshStandardMaterial, config: SpeciesConfig) {
	box('left-blue-cheek', head, accent, [-config.head.width * 0.23, -0.02, config.head.depth * 0.39], [
		config.head.width * 0.14,
		config.head.height * 0.5,
		0.05,
	], [
		0,
		0,
		MathUtils.degToRad(-10),
	]);
	box('right-blue-cheek', head, accent, [config.head.width * 0.23, -0.02, config.head.depth * 0.39], [
		config.head.width * 0.14,
		config.head.height * 0.5,
		0.05,
	], [
		0,
		0,
		MathUtils.degToRad(10),
	]);
	for (const side of [-1, 1] as const) {
		box(`baboon-cheek-stripe-${side}`, head, accent, [side * config.head.width * 0.16, -config.head.height * 0.06, config.head.depth * 0.43], [
			config.head.width * 0.06,
			config.head.height * 0.42,
			0.055,
		], [0, 0, side * MathUtils.degToRad(4)]);
	}
}

function addHelmet(head: Group, armorDark: MeshStandardMaterial, armor: MeshStandardMaterial, config: SpeciesConfig) {
	poly('helmet-dome', head, armorDark, [0, 0.2, -0.01], [
		config.head.width * 0.5,
		config.head.height * 0.28,
		config.head.depth * 0.56,
	]);
	box('helmet-brim', head, armor, [0, 0.14, config.head.depth * 0.36], [config.head.width * 0.78, 0.08, 0.14]);
	box('helmet-front-shadow', head, armorDark, [0, 0.08, config.head.depth * 0.34], [config.head.width * 0.64, 0.06, 0.1]);
	box('left-cheek-guard', head, armorDark, [-config.head.width * 0.42, -0.12, config.head.depth * 0.12], [0.12, 0.42, 0.16]);
	box('right-cheek-guard', head, armorDark, [config.head.width * 0.42, -0.12, config.head.depth * 0.12], [0.12, 0.42, 0.16]);
}

function addOrangutanCoat(head: Group, fur: MeshStandardMaterial, config: SpeciesConfig) {
	box('left-orange-cheek-hair', head, fur, [-config.head.width * 0.48, -0.08, 0.03], [0.24, 0.74, 0.22], [
		0,
		0,
		MathUtils.degToRad(-6),
	]);
	box('right-orange-cheek-hair', head, fur, [config.head.width * 0.48, -0.08, 0.03], [0.24, 0.74, 0.22], [
		0,
		0,
		MathUtils.degToRad(6),
	]);
	poly('orange-hood-cap', head, fur, [0, config.head.height * 0.22, -0.1], [
		config.head.width * 0.42,
		config.head.height * 0.34,
		config.head.depth * 0.3,
	]);
}

function addSaguiTufts(head: Group, furDark: MeshStandardMaterial, accent: MeshStandardMaterial, config: SpeciesConfig) {
	cone('crest', head, furDark, [0, config.head.height * 0.5, -0.04], [0.28, 0.56, 0.28], [0, 0, 0]);
	for (const side of [-1, 1] as const) {
		const fan = group(side < 0 ? 'left-sagui-ear-fan' : 'right-sagui-ear-fan', head);
		fan.position.set(side * config.head.width * 0.64, 0.04, -0.08);
		poly('ear-fan-core', fan, furDark, [0, 0, 0], [0.18, 0.34, 0.12]);
		for (let i = 0; i < 7; i += 1) {
			const offset = i - 3;
			cone('ear-fan-spike', fan, i === 3 ? accent : furDark, [
				side * Math.abs(offset) * 0.02,
				offset * 0.08,
				0,
			], [0.12, 0.4, 0.09], [0, 0, side * -PI / 2 + offset * 0.12]);
		}
	}
}

function updatePrimate(
	config: SpeciesConfig,
	parts: RigParts,
	time: number,
	mode: AnimationMode,
	pose: PoseMode,
	isSelected: boolean,
) {
	const effectivePose = mode === 'aim' ? 'aim' : pose;
	resetPose(config, parts, effectivePose);

	const speed = mode === 'run' ? 9.5 : mode === 'walk' ? 5.2 : 2.2;
	const stride = Math.sin(time * speed);
	const counterStride = Math.sin(time * speed + PI);
	const bob = mode === 'run' ? Math.abs(stride) * 0.08 : mode === 'walk' ? Math.abs(stride) * 0.035 : Math.sin(time * 2.1) * 0.015;
	parts.base.position.y = (isSelected ? 0.05 : 0) + bob;
	parts.base.rotation.y = isSelected ? Math.sin(time * 0.28) * 0.04 : 0;
	parts.head.rotation.y += Math.sin(time * 0.9) * 0.035;
	parts.jaw.rotation.x = Math.sin(time * 1.6) * 0.015;
	parts.chest.scale.setScalar(1 + Math.sin(time * 2.4) * 0.012);

	if (mode === 'walk' || mode === 'run') {
		const legAmp = mode === 'run' ? 0.68 : 0.36;
		const kneeAmp = mode === 'run' ? 0.5 : 0.28;
		parts.leftUpperLeg.rotation.x += stride * legAmp;
		parts.rightUpperLeg.rotation.x += counterStride * legAmp;
		parts.leftLowerLeg.rotation.x += Math.max(0, -stride) * kneeAmp;
		parts.rightLowerLeg.rotation.x += Math.max(0, -counterStride) * kneeAmp;
		parts.torso.rotation.x += mode === 'run' ? MathUtils.degToRad(-5) : MathUtils.degToRad(-2);

		if (effectivePose !== 'aim') poseRelaxedArms(config, parts, stride * (mode === 'run' ? 0.14 : 0.08));
	}

	if (effectivePose === 'aim') {
		const recoil = Math.max(0, Math.sin(time * 13.5)) * 0.05;
		poseAimWeaponAndArms(config, parts, recoil);
		parts.weapon.rotation.x += Math.sin(time * 5.8) * 0.012;
		parts.head.rotation.x += Math.sin(time * 2.1) * 0.01;
		parts.muzzleFlash.visible = mode === 'aim' && Math.sin(time * 13.5) > 0.86;
		const flashPulse = 1 + Math.sin(time * 27) * 0.18;
		parts.muzzleFlash.scale.set(0.09 * flashPulse, 0.22 * flashPulse, 0.09 * flashPulse);
	} else {
		parts.muzzleFlash.visible = false;
	}
}

function resetPose(config: SpeciesConfig, parts: RigParts, pose: PoseMode) {
	for (const item of [
		parts.torso,
		parts.chest,
		parts.head,
		parts.jaw,
		parts.leftUpperArm,
		parts.leftLowerArm,
		parts.leftHand,
		parts.rightUpperArm,
		parts.rightLowerArm,
		parts.rightHand,
		parts.leftUpperLeg,
		parts.leftLowerLeg,
		parts.rightUpperLeg,
		parts.rightLowerLeg,
		parts.weapon,
	]) {
		item.rotation.set(0, 0, 0);
		item.scale.setScalar(1);
	}

	parts.weapon.visible = pose !== 'tpose';
	parts.weapon.position.set(0.08, 2.12, 0.5);
	parts.weapon.rotation.set(MathUtils.degToRad(-8), MathUtils.degToRad(62), MathUtils.degToRad(-4));

	if (pose === 'tpose') {
		poseTArms(config, parts);
		parts.leftUpperLeg.rotation.z = MathUtils.degToRad(4);
		parts.rightUpperLeg.rotation.z = MathUtils.degToRad(-4);
		return;
	}

	if (pose === 'aim') {
		parts.torso.rotation.x = MathUtils.degToRad(-6);
		parts.head.rotation.x = MathUtils.degToRad(-3);
		poseAimWeaponAndArms(config, parts, 0);
		parts.leftUpperLeg.rotation.z = MathUtils.degToRad(6);
		parts.rightUpperLeg.rotation.z = MathUtils.degToRad(-6);
		return;
	}

	poseRelaxedWeapon(parts);
	poseRelaxedArms(config, parts, 0);
	parts.leftUpperLeg.rotation.z = MathUtils.degToRad(5);
	parts.rightUpperLeg.rotation.z = MathUtils.degToRad(-5);
}

function poseTArms(config: SpeciesConfig, parts: RigParts) {
	const shoulderX = config.body.width * 0.56;
	const shoulderY = 2.45;
	const armReach = config.limbs.arm * 0.88;
	for (const side of [-1, 1] as const) {
		const shoulder = v(side * shoulderX, shoulderY, 0);
		const elbow = v(side * (shoulderX + armReach * 0.52), shoulderY, 0);
		const hand = v(side * (shoulderX + armReach), shoulderY, 0.02);
		poseArm(parts, side, shoulder, elbow, hand, 0);
	}
}

function poseRelaxedWeapon(parts: RigParts) {
	parts.weapon.position.set(0.08, 1.96, 0.56);
	parts.weapon.rotation.set(MathUtils.degToRad(-8), MathUtils.degToRad(58), MathUtils.degToRad(-8));
}

function poseRelaxedArms(config: SpeciesConfig, parts: RigParts, swing: number) {
	const shoulderX = config.body.width * 0.56;
	const shoulderY = 2.45;
	const leftShoulder = v(-shoulderX, shoulderY, 0.02);
	const rightShoulder = v(shoulderX, shoulderY, 0.02);
	const leftElbow = v(-shoulderX * 0.86, 2.02 + swing, 0.26);
	const rightElbow = v(shoulderX * 0.86, 1.94 - swing * 0.55, 0.22);
	const leftHand = v(-0.12, 1.82 + swing * 0.32, 0.7);
	const rightHand = v(0.24, 1.74 - swing * 0.22, 0.5);
	poseArm(parts, -1, leftShoulder, leftElbow, leftHand, MathUtils.degToRad(-20));
	poseArm(parts, 1, rightShoulder, rightElbow, rightHand, MathUtils.degToRad(22));
}

function poseAimWeaponAndArms(config: SpeciesConfig, parts: RigParts, recoil: number) {
	parts.weapon.position.set(0.05, 2.25, 0.6 - recoil);
	parts.weapon.rotation.set(MathUtils.degToRad(-5), MathUtils.degToRad(62), MathUtils.degToRad(-5));

	const shoulderX = config.body.width * 0.56;
	const shoulderY = 2.45;
	const leftShoulder = v(-shoulderX, shoulderY, 0.02);
	const rightShoulder = v(shoulderX, shoulderY, 0.02);
	const leftElbow = v(-shoulderX * 0.18, 2.22, 0.32 - recoil * 0.28);
	const rightElbow = v(shoulderX * 0.34, 2.16, 0.3 - recoil * 0.22);
	const leftHand = v(0.34, 2.2, 0.9 - recoil);
	const rightHand = v(-0.08, 2.05, 0.55 - recoil);
	poseArm(parts, -1, leftShoulder, leftElbow, leftHand, MathUtils.degToRad(-5));
	poseArm(parts, 1, rightShoulder, rightElbow, rightHand, MathUtils.degToRad(10));
}

function poseArm(parts: RigParts, side: -1 | 1, shoulder: Vector3, elbow: Vector3, hand: Vector3, handRoll: number) {
	const upper = side < 0 ? parts.leftUpperArm : parts.rightUpperArm;
	const lower = side < 0 ? parts.leftLowerArm : parts.rightLowerArm;
	const handPart = side < 0 ? parts.leftHand : parts.rightHand;
	placeSegment(upper, shoulder, elbow);
	placeSegment(lower, elbow, hand);
	handPart.position.copy(hand);
	handPart.rotation.set(MathUtils.degToRad(82), 0, handRoll);
}

function placeSegment(segment: Group, start: Vector3, end: Vector3) {
	const direction = end.clone().sub(start);
	const length = Math.max(direction.length(), 0.001);
	segment.position.copy(start).add(end).multiplyScalar(0.5);
	segment.quaternion.setFromUnitVectors(upAxis, direction.normalize());
	segment.scale.set(1, length, 1);
}

function v(x: number, y: number, z: number) {
	return new Vector3(x, y, z);
}
