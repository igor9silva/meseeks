import {
	AmbientLight,
	Color,
	DirectionalLight,
	Group,
	HemisphereLight,
	Mesh,
	MeshStandardMaterial,
	OrthographicCamera,
	PCFShadowMap,
	PlaneGeometry,
	Scene,
	Vector3,
	WebGLRenderer,
} from 'three';
import { group } from './lowPoly';
import { createPrimateModel } from './riggedPrimateCore';
import { speciesConfigs } from './species';
import type { AnimationMode, PoseMode, PrimateModel, SpeciesId } from './types';

const minZoom = 0.72;
const maxZoom = 2.15;
const defaultZoom = 0.94;

export class PrimateViewer {
	private readonly canvas: HTMLCanvasElement;
	private readonly renderer: WebGLRenderer;
	private readonly scene: Scene;
	private readonly camera: OrthographicCamera;
	private readonly modelRoot: Group;
	private readonly models: Map<SpeciesId, PrimateModel>;
	private readonly resizeObserver: ResizeObserver;
	private readonly target = new Vector3(0, 1.58, 0.12);
	private selected: SpeciesId = 'chimp';
	private pose: PoseMode = 'relaxed';
	private animationMode: AnimationMode = 'idle';
	private zoom = defaultZoom;
	private frameId = 0;
	private lastHealthAt = -1;
	private dragStartX = 0;
	private dragStartRotation = 0;
	private isDragging = false;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.renderer = new WebGLRenderer({
			canvas,
			antialias: true,
			alpha: false,
			powerPreference: 'high-performance',
			preserveDrawingBuffer: true,
		});
		this.renderer.setClearColor(new Color(0xd8cfba), 1);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = PCFShadowMap;

		this.scene = new Scene();
		this.camera = new OrthographicCamera(-5, 5, 4, -4, 0.1, 100);
		this.camera.position.set(1.75, 3.35, 6.15);
		this.camera.lookAt(this.target);

		this.modelRoot = group('model-root');
		this.models = new Map();
		this.resizeObserver = new ResizeObserver(this.handleResize);

		this.scene.add(this.modelRoot);
		this.createLighting();
		this.createFloor();
		this.createModels();
		this.bindPointerControls();
		this.resizeObserver.observe(canvas);
		this.handleResize();
		this.renderNow(0, true);
		this.start();
	}

	setState(next: { selected: SpeciesId; pose: PoseMode; animationMode: AnimationMode }) {
		this.selected = next.selected;
		this.pose = next.pose;
		this.animationMode = next.animationMode;
		this.updateSelectionState();
		this.renderNow(performance.now() / 1000, true);
	}

	getSelectedModel() {
		const model = this.models.get(this.selected);
		if (!model) throw new Error(`Missing model for ${this.selected}`);
		return model;
	}

	getZoom() {
		return this.zoom;
	}

	setZoom(nextZoom: number) {
		this.zoom = Math.min(maxZoom, Math.max(minZoom, nextZoom));
		this.handleResize();
		this.renderNow(performance.now() / 1000, true);
		this.emitZoomChange();
		return this.zoom;
	}

	zoomIn() {
		return this.setZoom(this.zoom + 0.14);
	}

	zoomOut() {
		return this.setZoom(this.zoom - 0.14);
	}

	resetView() {
		this.zoom = defaultZoom;
		this.modelRoot.rotation.y = 0;
		this.handleResize();
		this.renderNow(performance.now() / 1000, true);
		this.emitZoomChange();
		return this.zoom;
	}

	dispose() {
		cancelAnimationFrame(this.frameId);
		this.resizeObserver.disconnect();
		this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
		this.canvas.removeEventListener('wheel', this.handleWheel);
		window.removeEventListener('pointermove', this.handlePointerMove);
		window.removeEventListener('pointerup', this.handlePointerUp);
		this.renderer.dispose();
	}

	private createLighting() {
		this.scene.add(new AmbientLight(0xffffff, 1.25));
		this.scene.add(new HemisphereLight(0xf7edd7, 0x60664f, 1.32));

		const keyLight = new DirectionalLight(0xffe1b0, 3.45);
		keyLight.position.set(4, 8, 5);
		keyLight.castShadow = true;
		keyLight.shadow.mapSize.set(2048, 2048);
		keyLight.shadow.camera.left = -4;
		keyLight.shadow.camera.right = 4;
		keyLight.shadow.camera.top = 5;
		keyLight.shadow.camera.bottom = -3;
		this.scene.add(keyLight);

		const rimLight = new DirectionalLight(0xb8d4ff, 1.15);
		rimLight.position.set(-4, 4, -3);
		this.scene.add(rimLight);
	}

	private createFloor() {
		const floorMaterial = new MeshStandardMaterial({ color: 0xd8cfba, roughness: 0.9 });
		const ground = new Mesh(new PlaneGeometry(8, 8), floorMaterial);
		ground.name = 'inspection-floor';
		ground.rotation.x = -Math.PI / 2;
		ground.position.y = -0.05;
		ground.receiveShadow = true;
		this.scene.add(ground);

		const shadowMaterial = new MeshStandardMaterial({
			color: 0x5c574c,
			opacity: 0.18,
			transparent: true,
			depthWrite: false,
			roughness: 1,
		});
		const shadow = new Mesh(new PlaneGeometry(2.5, 1.62), shadowMaterial);
		shadow.name = 'character-contact-shadow';
		shadow.rotation.x = -Math.PI / 2;
		shadow.position.set(0, -0.045, 0.16);
		this.scene.add(shadow);
	}

	private createModels() {
		for (const config of speciesConfigs) {
			const model = createPrimateModel(config);
			model.root.visible = config.id === this.selected;
			model.root.position.set(0, 0, 0);
			model.root.scale.setScalar(getViewerScale(config.id));
			this.models.set(config.id, model);
			this.modelRoot.add(model.root);
		}

		this.updateSelectionState();
	}

	private updateSelectionState() {
		for (const [id, model] of this.models) {
			model.root.visible = id === this.selected;
			model.root.position.set(0, 0, 0);
			model.root.scale.setScalar(getViewerScale(id));
		}
	}

	private start() {
		const renderFrame = (timeMs: number) => {
			this.renderNow(timeMs / 1000);
			this.frameId = requestAnimationFrame(renderFrame);
		};
		this.frameId = requestAnimationFrame(renderFrame);
	}

	private renderNow(time: number, forceHealth = false) {
		const model = this.models.get(this.selected);
		if (model) model.update(time, this.animationMode, this.pose, true);
		this.renderer.render(this.scene, this.camera);
		if (forceHealth || time - this.lastHealthAt > 0.75) {
			this.lastHealthAt = time;
			this.updateRenderHealth(time);
		}
	}

	private readonly handleResize = () => {
		const width = Math.max(this.canvas.clientWidth, 1);
		const height = Math.max(this.canvas.clientHeight, 1);
		const aspect = width / height;
		const baseViewHeight = aspect > 1.15 ? 4.72 : 5.35;
		const viewHeight = baseViewHeight / this.zoom;
		this.camera.left = (-viewHeight * aspect) / 2;
		this.camera.right = (viewHeight * aspect) / 2;
		this.camera.top = viewHeight / 2;
		this.camera.bottom = -viewHeight / 2;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height, false);
	};

	private bindPointerControls() {
		this.canvas.addEventListener('pointerdown', this.handlePointerDown);
		this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
		window.addEventListener('pointermove', this.handlePointerMove);
		window.addEventListener('pointerup', this.handlePointerUp);
	}

	private readonly handlePointerDown = (event: PointerEvent) => {
		this.isDragging = true;
		this.dragStartX = event.clientX;
		this.dragStartRotation = this.modelRoot.rotation.y;
		this.canvas.setPointerCapture(event.pointerId);
	};

	private readonly handlePointerMove = (event: PointerEvent) => {
		if (!this.isDragging) return;
		const delta = event.clientX - this.dragStartX;
		this.modelRoot.rotation.y = this.dragStartRotation + delta * 0.006;
	};

	private readonly handlePointerUp = () => {
		this.isDragging = false;
	};

	private readonly handleWheel = (event: WheelEvent) => {
		event.preventDefault();
		const step = event.altKey ? 0.04 : 0.1;
		this.setZoom(this.zoom + (event.deltaY < 0 ? step : -step));
	};

	private updateRenderHealth(time: number) {
		try {
			const health = document.getElementById('render-health');
			if (health) health.textContent = 'Sampling';
			const gl = this.renderer.getContext();
			const width = gl.drawingBufferWidth;
			const height = gl.drawingBufferHeight;
			const samples: string[] = [];
			const points: Array<[number, number]> = [
				[Math.floor(width * 0.5), Math.floor(height * 0.5)],
				[Math.floor(width * 0.36), Math.floor(height * 0.52)],
				[Math.floor(width * 0.64), Math.floor(height * 0.52)],
				[Math.floor(width * 0.5), Math.floor(height * 0.3)],
				[Math.floor(width * 0.5), Math.floor(height * 0.74)],
			];

			for (const [x, y] of points) {
				const pixel = new Uint8Array(4);
				gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
				samples.push(Array.from(pixel).join(','));
			}

			const unique = new Set(samples).size;
			this.canvas.dataset.renderOk = String(unique > 1);
			this.canvas.dataset.renderUnique = String(unique);
			this.canvas.dataset.renderFrame = String(Math.round(time * 1000));
			this.canvas.dataset.renderSize = `${width}x${height}`;
			this.canvas.dataset.renderSignature = samples.join('|');
			if (health) health.textContent = unique > 1 ? `${unique} samples` : 'Flat';

			const preview = document.getElementById('render-preview');
			if (preview instanceof HTMLImageElement) {
				preview.src = this.canvas.toDataURL('image/png');
			}
		} catch (error) {
			this.canvas.dataset.renderOk = 'false';
			this.canvas.dataset.renderError = error instanceof Error ? error.message : 'Unknown render health error';
			const health = document.getElementById('render-health');
			if (health) health.textContent = 'Render error';
		}
	}

	private emitZoomChange() {
		this.canvas.dispatchEvent(new CustomEvent('viewer-zoom-change', { detail: this.zoom }));
	}
}

function getViewerScale(id: SpeciesId) {
	if (id === 'sagui') return 1.36;
	if (id === 'bonobo') return 1.26;
	if (id === 'orangutan') return 1.08;
	return 1.16;
}
