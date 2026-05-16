import './styles.css';
import { PrimateViewer } from './primateViewerCore';
import { getSpeciesConfig, speciesConfigs } from './species';
import type { AnimationMode, PoseMode, SpeciesId } from './types';

const canvas = getCanvas('scene-canvas');
const poseSelect = getSelect('pose-select');
const animationSelect = getSelect('animation-select');
const selectedName = getElement('selected-name');
const selectedRole = getElement('selected-role');
const selectedNotes = getElement('selected-notes');
const triangleCount = getElement('triangle-count');
const drawCallCount = getElement('draw-call-count');
const partCount = getElement('part-count');
const speciesButtons = getElement('species-buttons');
const zoomRange = getInput('zoom-range');
const zoomInButton = getButton('zoom-in');
const zoomOutButton = getButton('zoom-out');
const resetViewButton = getButton('reset-view');

let selectedSpecies: SpeciesId = 'chimp';
let pose: PoseMode = 'relaxed';
let animationMode: AnimationMode = 'idle';

const viewer = new PrimateViewer(canvas);

renderSpeciesButtons();
renderSelection();
syncZoomRange(viewer.getZoom());

poseSelect.addEventListener('change', () => {
	pose = poseSelect.value as PoseMode;
	if (pose === 'aim') {
		animationMode = 'aim';
		animationSelect.value = animationMode;
	} else if (animationMode === 'aim') {
		animationMode = 'idle';
		animationSelect.value = animationMode;
	}
	renderSelection();
});

animationSelect.addEventListener('change', () => {
	animationMode = animationSelect.value as AnimationMode;
	if (animationMode === 'aim') {
		pose = 'aim';
		poseSelect.value = pose;
	}
	renderSelection();
});

zoomRange.addEventListener('input', () => {
	syncZoomRange(viewer.setZoom(Number(zoomRange.value)));
});

zoomInButton.addEventListener('click', () => {
	syncZoomRange(viewer.zoomIn());
});

zoomOutButton.addEventListener('click', () => {
	syncZoomRange(viewer.zoomOut());
});

resetViewButton.addEventListener('click', () => {
	syncZoomRange(viewer.resetView());
});

canvas.addEventListener('viewer-zoom-change', (event) => {
	if (event instanceof CustomEvent && typeof event.detail === 'number') {
		syncZoomRange(event.detail);
	}
});

function renderSelection() {
	const config = getSpeciesConfig(selectedSpecies);
	viewer.setState({ selected: selectedSpecies, pose, animationMode });
	const model = viewer.getSelectedModel();
	selectedName.textContent = config.name;
	selectedRole.textContent = config.role;
	selectedNotes.textContent = config.notes;
	triangleCount.textContent = formatNumber(model.triangleCount);
	drawCallCount.textContent = formatNumber(model.drawCallCount);
	partCount.textContent = formatNumber(model.partCount);

	for (const button of speciesButtons.querySelectorAll<HTMLButtonElement>('button[data-species]')) {
		button.classList.toggle('is-selected', button.dataset.species === selectedSpecies);
	}
}

function renderSpeciesButtons() {
	speciesButtons.textContent = '';
	for (const config of speciesConfigs) {
		const button = document.createElement('button');
		button.type = 'button';
		button.dataset.species = config.id;
		button.innerHTML = `<strong>${config.name}</strong><span>${config.role}</span>`;
		button.addEventListener('click', () => {
			selectedSpecies = config.id;
			renderSelection();
		});
		speciesButtons.append(button);
	}
}

function formatNumber(value: number) {
	return new Intl.NumberFormat('en-US').format(value);
}

function syncZoomRange(value: number) {
	zoomRange.value = value.toFixed(2);
}

function getElement(id: string) {
	const element = document.getElementById(id);
	if (!element) throw new Error(`Missing #${id}`);
	return element;
}

function getCanvas(id: string) {
	const element = getElement(id);
	if (!(element instanceof HTMLCanvasElement)) throw new Error(`#${id} is not a canvas`);
	return element;
}

function getSelect(id: string) {
	const element = getElement(id);
	if (!(element instanceof HTMLSelectElement)) throw new Error(`#${id} is not a select`);
	return element;
}

function getInput(id: string) {
	const element = getElement(id);
	if (!(element instanceof HTMLInputElement)) throw new Error(`#${id} is not an input`);
	return element;
}

function getButton(id: string) {
	const element = getElement(id);
	if (!(element instanceof HTMLButtonElement)) throw new Error(`#${id} is not a button`);
	return element;
}
