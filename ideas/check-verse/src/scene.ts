import {
	AmbientLight,
	BoxGeometry,
	CanvasTexture,
	Color,
	CylinderGeometry,
	DirectionalLight,
	Group,
	Mesh,
	MeshBasicMaterial,
	MeshLambertMaterial,
	OrthographicCamera,
	Plane,
	PlaneGeometry,
	Raycaster,
	RingGeometry,
	Scene,
	SphereGeometry,
	Sprite,
	SpriteMaterial,
	Vector2,
	Vector3,
	WebGLRenderer,
} from 'three';
import {
	boardSize,
	getPieceById,
	getPieceDefinition,
	type Coord,
	type GameState,
	type Piece,
	type PieceKind,
} from './game';

interface BoardRendererCallbacks {
	onSquareClick: (coord: Coord) => void;
	onHoverChange: (coord: Coord | null) => void;
}

const squareOffset = (boardSize - 1) / 2;

export class BoardRenderer {
	//
	private readonly canvas: HTMLCanvasElement;
	private readonly callbacks: BoardRendererCallbacks;
	private readonly renderer: WebGLRenderer;
	private readonly scene: Scene;
	private readonly camera: OrthographicCamera;
	private readonly raycaster: Raycaster;
	private readonly pointer: Vector2;
	private readonly boardPlane: Plane;
	private readonly hitPoint: Vector3;
	private readonly boardGroup: Group;
	private readonly piecesGroup: Group;
	private readonly highlightsGroup: Group;
	private readonly labelTextures: Map<string, CanvasTexture>;
	private readonly labelMaterials: Map<string, SpriteMaterial>;
	private readonly lightSquareMaterial: MeshLambertMaterial;
	private readonly darkSquareMaterial: MeshLambertMaterial;
	private readonly whitePieceMaterial: MeshLambertMaterial;
	private readonly blackPieceMaterial: MeshLambertMaterial;
	private readonly selectedMaterial: MeshBasicMaterial;
	private readonly moveMaterial: MeshBasicMaterial;
	private readonly captureMaterial: MeshBasicMaterial;
	private readonly hoverMaterial: MeshBasicMaterial;
	private readonly selectedRingMaterial: MeshBasicMaterial;
	private readonly moveLineMaterial: MeshBasicMaterial;
	private readonly captureLineMaterial: MeshBasicMaterial;
	private readonly squareGeometry: PlaneGeometry;
	private readonly highlightGeometry: PlaneGeometry;
	private readonly selectedRingGeometry: RingGeometry;
	private readonly moveLineGeometry: BoxGeometry;
	private readonly baseGeometry: CylinderGeometry;
	private readonly bodyGeometry: CylinderGeometry;
	private readonly pawnTopGeometry: SphereGeometry;
	private readonly tallBodyGeometry: CylinderGeometry;
	private readonly resizeObserver: ResizeObserver;
	private state: GameState | null;
	private hoverCoord: Coord | null;

	constructor(canvas: HTMLCanvasElement, callbacks: BoardRendererCallbacks) {
		//
		this.canvas = canvas;
		this.callbacks = callbacks;
		this.renderer = new WebGLRenderer({
			canvas,
			antialias: true,
			alpha: true,
			powerPreference: 'high-performance',
			// keep the frame readable for browser pixel verification.
			preserveDrawingBuffer: true,
		});
		this.renderer.setClearColor(new Color(0x101215), 1);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		this.scene = new Scene();
		this.camera = new OrthographicCamera(-4, 4, 4, -4, 0.1, 100);
		this.camera.position.set(0, 8, 0);
		this.camera.up.set(0, 0, 1);
		this.camera.lookAt(0, 0, 0);

		this.raycaster = new Raycaster();
		this.pointer = new Vector2();
		this.boardPlane = new Plane(new Vector3(0, 1, 0), 0);
		this.hitPoint = new Vector3();
		this.boardGroup = new Group();
		this.piecesGroup = new Group();
		this.highlightsGroup = new Group();
		this.labelTextures = new Map();
		this.labelMaterials = new Map();
		this.lightSquareMaterial = new MeshLambertMaterial({ color: 0xd5c9ad });
		this.darkSquareMaterial = new MeshLambertMaterial({ color: 0x425345 });
		this.whitePieceMaterial = new MeshLambertMaterial({ color: 0xf7ead0 });
		this.blackPieceMaterial = new MeshLambertMaterial({ color: 0x27313e });
		this.selectedMaterial = new MeshBasicMaterial({ color: 0xf6d36e, transparent: true, opacity: 0.64 });
		this.moveMaterial = new MeshBasicMaterial({ color: 0x5bd6c4, transparent: true, opacity: 0.42 });
		this.captureMaterial = new MeshBasicMaterial({ color: 0xef6f6c, transparent: true, opacity: 0.56 });
		this.hoverMaterial = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18 });
		this.selectedRingMaterial = new MeshBasicMaterial({ color: 0xfff0a8, transparent: true, opacity: 0.92 });
		this.moveLineMaterial = new MeshBasicMaterial({ color: 0x8ff0df, transparent: true, opacity: 0.72 });
		this.captureLineMaterial = new MeshBasicMaterial({ color: 0xff8d88, transparent: true, opacity: 0.82 });
		this.squareGeometry = new PlaneGeometry(1, 1);
		this.highlightGeometry = new PlaneGeometry(0.82, 0.82);
		this.selectedRingGeometry = new RingGeometry(0.42, 0.58, 40);
		this.moveLineGeometry = new BoxGeometry(1, 0.028, 0.065);
		this.baseGeometry = new CylinderGeometry(0.34, 0.38, 0.16, 24);
		this.bodyGeometry = new CylinderGeometry(0.22, 0.3, 0.52, 24);
		this.pawnTopGeometry = new SphereGeometry(0.2, 20, 12);
		this.tallBodyGeometry = new CylinderGeometry(0.16, 0.3, 0.72, 24);
		this.state = null;
		this.hoverCoord = null;
		this.resizeObserver = new ResizeObserver(this.handleResize);

		this.scene.add(this.boardGroup);
		this.scene.add(this.highlightsGroup);
		this.scene.add(this.piecesGroup);
		this.scene.add(new AmbientLight(0xffffff, 1.2));

		const keyLight = new DirectionalLight(0xfff2d0, 2.2);
		keyLight.position.set(3, 5, 2);
		this.scene.add(keyLight);

		const fillLight = new DirectionalLight(0xb7d9ff, 0.9);
		fillLight.position.set(-4, 3, -5);
		this.scene.add(fillLight);

		this.createBoard();
		this.resizeObserver.observe(this.canvas);
		this.canvas.addEventListener('pointerdown', this.handlePointerDown);
		this.canvas.addEventListener('pointermove', this.handlePointerMove);
		this.canvas.addEventListener('pointerleave', this.handlePointerLeave);
		this.handleResize();
	}

	setState(state: GameState) {
		//
		this.state = state;
		this.renderHighlights();
		this.renderPieces();
		this.render();
	}

	setHover(coord: Coord | null) {
		//
		this.hoverCoord = coord;
		this.renderHighlights();
		this.render();
	}

	dispose() {
		//
		this.resizeObserver.disconnect();
		this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
		this.canvas.removeEventListener('pointermove', this.handlePointerMove);
		this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
		this.renderer.dispose();
	}

	private readonly handleResize = () => {
		//
		const width = Math.max(this.canvas.clientWidth, 1);
		const height = Math.max(this.canvas.clientHeight, 1);
		const aspect = width / height;
		const minHorizontalViewSize = 8.8;
		const viewSize = Math.max(9.6, minHorizontalViewSize / aspect);

		this.camera.left = (-viewSize * aspect) / 2;
		this.camera.right = (viewSize * aspect) / 2;
		this.camera.top = viewSize / 2;
		this.camera.bottom = -viewSize / 2;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height, false);
		this.render();
	};

	private readonly handlePointerDown = (event: PointerEvent) => {
		//
		const coord = this.getCoordFromPointer(event);
		if (!coord) return;
		this.callbacks.onSquareClick(coord);
	};

	private readonly handlePointerMove = (event: PointerEvent) => {
		//
		const coord = this.getCoordFromPointer(event);
		if (sameCoord(coord, this.hoverCoord)) return;
		this.callbacks.onHoverChange(coord);
	};

	private readonly handlePointerLeave = () => {
		//
		this.callbacks.onHoverChange(null);
	};

	private createBoard() {
		//
		for (let y = 0; y < boardSize; y += 1) {
			for (let x = 0; x < boardSize; x += 1) {
				const material = (x + y) % 2 === 0 ? this.lightSquareMaterial : this.darkSquareMaterial;
				const square = new Mesh(this.squareGeometry, material);
				square.rotation.x = -Math.PI / 2;
				square.position.set(toWorld(x), -0.01, toWorld(y));
				this.boardGroup.add(square);
			}
		}

		const rimMaterial = new MeshLambertMaterial({ color: 0x22262c });
		const north = new Mesh(new BoxGeometry(boardSize + 0.16, 0.14, 0.12), rimMaterial);
		north.position.set(0, -0.02, boardSize / 2 + 0.05);
		this.boardGroup.add(north);

		const south = new Mesh(new BoxGeometry(boardSize + 0.16, 0.14, 0.12), rimMaterial);
		south.position.set(0, -0.02, -boardSize / 2 - 0.05);
		this.boardGroup.add(south);

		const east = new Mesh(new BoxGeometry(0.12, 0.14, boardSize + 0.16), rimMaterial);
		east.position.set(boardSize / 2 + 0.05, -0.02, 0);
		this.boardGroup.add(east);

		const west = new Mesh(new BoxGeometry(0.12, 0.14, boardSize + 0.16), rimMaterial);
		west.position.set(-boardSize / 2 - 0.05, -0.02, 0);
		this.boardGroup.add(west);
	}

	private renderHighlights() {
		//
		clearGroup(this.highlightsGroup);
		const state = this.state;
		if (!state) return;

		const selectedPiece = state.selectedPieceId ? getPieceById(state, state.selectedPieceId) : null;
		if (selectedPiece) {
			this.addHighlight(selectedPiece.x, selectedPiece.y, this.selectedMaterial);
			this.addSelectedRing(selectedPiece.x, selectedPiece.y);
		}

		for (const move of state.legalMoves) {
			const material = move.capturedPieceId ? this.captureMaterial : this.moveMaterial;
			this.addHighlight(move.to.x, move.to.y, material);
			if (selectedPiece) this.addMoveLine(selectedPiece, move.to, Boolean(move.capturedPieceId));
		}

		if (this.hoverCoord) this.addHighlight(this.hoverCoord.x, this.hoverCoord.y, this.hoverMaterial);
	}

	private addHighlight(x: number, y: number, material: MeshBasicMaterial) {
		//
		const highlight = new Mesh(this.highlightGeometry, material);
		highlight.rotation.x = -Math.PI / 2;
		highlight.position.set(toWorld(x), 0.012, toWorld(y));
		this.highlightsGroup.add(highlight);
	}

	private addSelectedRing(x: number, y: number) {
		//
		const ring = new Mesh(this.selectedRingGeometry, this.selectedRingMaterial);
		ring.rotation.x = -Math.PI / 2;
		ring.position.set(toWorld(x), 0.075, toWorld(y));
		this.highlightsGroup.add(ring);
	}

	private addMoveLine(from: Piece, to: Coord, isCapture: boolean) {
		//
		const fromX = toWorld(from.x);
		const fromZ = toWorld(from.y);
		const toX = toWorld(to.x);
		const toZ = toWorld(to.y);
		const dx = toX - fromX;
		const dz = toZ - fromZ;
		const length = Math.hypot(dx, dz);
		if (length < 0.2) return;

		const material = isCapture ? this.captureLineMaterial : this.moveLineMaterial;
		const line = new Mesh(this.moveLineGeometry, material);
		line.position.set(fromX + dx / 2, 0.055, fromZ + dz / 2);
		line.scale.set(Math.max(0.12, length - 0.54), 1, 1);
		line.rotation.y = Math.atan2(-dz, dx);
		this.highlightsGroup.add(line);
	}

	private renderPieces() {
		//
		clearGroup(this.piecesGroup);
		const state = this.state;
		if (!state) return;

		for (const piece of state.pieces) {
			this.piecesGroup.add(this.createPieceGroup(piece));
		}
	}

	private createPieceGroup(piece: Piece) {
		//
		const group = new Group();
		const material = piece.side === 'white' ? this.whitePieceMaterial : this.blackPieceMaterial;
		const accentMaterial = new MeshLambertMaterial({ color: getAccentColor(piece.kind, piece.side) });
		const isSelected = this.state?.selectedPieceId === piece.id;

		group.position.set(toWorld(piece.x), 0, toWorld(piece.y));
		if (isSelected) group.scale.set(1.1, 1.1, 1.1);

		const base = new Mesh(this.baseGeometry, material);
		base.position.y = 0.08;
		group.add(base);

		const body = new Mesh(piece.kind === 'pawn' ? this.bodyGeometry : this.tallBodyGeometry, material);
		body.position.y = piece.kind === 'pawn' ? 0.4 : 0.5;
		group.add(body);

		const cap = new Mesh(this.pawnTopGeometry, accentMaterial);
		cap.position.y = piece.kind === 'pawn' ? 0.72 : 0.9;
		group.add(cap);

		const label = this.createLabelSprite(piece, isSelected);
		label.position.y = piece.kind === 'pawn' ? 1.02 : 1.18;
		group.add(label);

		return group;
	}

	private createLabelSprite(piece: Piece, isSelected: boolean) {
		//
		const material = this.getLabelMaterial(piece.kind, piece.side);
		const sprite = new Sprite(material);
		const size = isSelected ? 0.62 : 0.48;
		sprite.scale.set(size, size, 1);
		return sprite;
	}

	private getLabelMaterial(kind: PieceKind, side: string) {
		//
		const cacheKey = `${side}-${kind}`;
		const cached = this.labelMaterials.get(cacheKey);
		if (cached) return cached;

		const material = new SpriteMaterial({
			map: this.getLabelTexture(kind, side),
			transparent: true,
			depthWrite: false,
		});
		this.labelMaterials.set(cacheKey, material);
		return material;
	}

	private getLabelTexture(kind: PieceKind, side: string) {
		//
		const cacheKey = `${side}-${kind}`;
		const cached = this.labelTextures.get(cacheKey);
		if (cached) return cached;

		const definition = getPieceDefinition(kind);
		const canvas = document.createElement('canvas');
		canvas.width = 128;
		canvas.height = 128;
		const context = canvas.getContext('2d');
		if (!context) throw new Error('2d canvas context unavailable');

		context.clearRect(0, 0, canvas.width, canvas.height);
		context.beginPath();
		context.arc(64, 64, 46, 0, Math.PI * 2);
		context.fillStyle = side === 'white' ? '#fff3d8' : '#1b2430';
		context.fill();
		context.lineWidth = 8;
		context.strokeStyle = side === 'white' ? '#2c3541' : '#f0dbc0';
		context.stroke();
		context.font = '700 58px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillStyle = side === 'white' ? '#18202a' : '#ffeccf';
		context.fillText(definition.shortLabel, 64, 68);

		const texture = new CanvasTexture(canvas);
		this.labelTextures.set(cacheKey, texture);
		return texture;
	}

	private getCoordFromPointer(event: PointerEvent) {
		//
		const rect = this.canvas.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return null;

		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
		this.raycaster.setFromCamera(this.pointer, this.camera);

		const hit = this.raycaster.ray.intersectPlane(this.boardPlane, this.hitPoint);
		if (!hit) return null;

		const x = Math.floor(this.hitPoint.x + boardSize / 2);
		const y = Math.floor(this.hitPoint.z + boardSize / 2);
		if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return null;

		return { x, y };
	}

	private render() {
		//
		this.renderer.render(this.scene, this.camera);
	}
}

function clearGroup(group: Group) {
	//
	const children = group.children.slice();
	for (const child of children) {
		group.remove(child);
	}
}

function sameCoord(left: Coord | null, right: Coord | null) {
	//
	if (!left && !right) return true;
	if (!left || !right) return false;
	return left.x === right.x && left.y === right.y;
}

function toWorld(value: number) {
	//
	return value - squareOffset;
}

function getAccentColor(kind: PieceKind, side: string) {
	//
	if (kind === 'king') return side === 'white' ? 0xf2c45f : 0xf29f67;
	if (kind === 'cannon') return 0xd96459;
	if (kind === 'mystic') return 0x7bb7d8;
	if (kind === 'knight') return 0x7fc68e;
	if (kind === 'duelist') return 0xdf86a8;
	return side === 'white' ? 0xd9b98f : 0x617084;
}
