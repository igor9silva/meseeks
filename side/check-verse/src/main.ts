import './styles.css';
import {
	clearSelection,
	createGame,
	defaultTimeControl,
	getMoveGuide,
	getPieceById,
	getPieceDefinition,
	getPowerDefinition,
	makeMove,
	moveAtSelectedTarget,
	pieceDefinitions,
	selectSquare,
	startGame,
	tickClock,
	type GameState,
	type PieceKind,
	type Side,
} from './game';
import { BoardRenderer } from './scene';

interface TimeControlOption {
	id: string;
	label: string;
	baseTimeMs: number;
	incrementMs: number;
}

const timeControls: readonly TimeControlOption[] = [
	{ id: '3+0', label: '3+0', baseTimeMs: 180_000, incrementMs: 0 },
	{ id: '3+1', label: '3+1', baseTimeMs: 180_000, incrementMs: 1_000 },
	{ id: '3+2', label: '3+2', baseTimeMs: 180_000, incrementMs: 2_000 },
	{ id: '3+3', label: '3+3', baseTimeMs: 180_000, incrementMs: 3_000 },
];

const canvas = getCanvas('game-canvas');
const timeControlSelect = getSelect('time-control-select');
const rerollButton = getButton('reroll-button');
const startButton = getButton('start-button');
const whiteTime = getElement('white-time');
const blackTime = getElement('black-time');
const whiteClock = getElement('white-clock');
const blackClock = getElement('black-clock');
const whitePower = getElement('white-power');
const blackPower = getElement('black-power');
const turnLabel = getElement('turn-label');
const statusLabel = getElement('status-label');
const selectedGuide = getElement('selected-guide');
const armyList = getElement('army-list');
const pieceLegend = getElement('piece-legend');
const moveLog = getElement('move-log');

let game = createGame(defaultTimeControl);
let lastTickAt = performance.now();

const boardRenderer = new BoardRenderer(canvas, {
	onSquareClick: (coord) => {
		//
		handleSquareClick(coord.x, coord.y);
	},
	onHoverChange: (coord) => {
		//
		boardRenderer.setHover(coord);
	},
});

renderStaticLegend();
renderAll();

timeControlSelect.addEventListener('change', () => {
	//
	if (game.phase === 'playing') return;
	const timeControl = getSelectedTimeControl();
	game = createGame({
		baseTimeMs: timeControl.baseTimeMs,
		incrementMs: timeControl.incrementMs,
	});
	renderAll();
});

rerollButton.addEventListener('click', () => {
	//
	if (game.phase === 'playing') return;
	const timeControl = getSelectedTimeControl();
	game = createGame({
		baseTimeMs: timeControl.baseTimeMs,
		incrementMs: timeControl.incrementMs,
	});
	renderAll();
});

startButton.addEventListener('click', () => {
	//
	if (game.phase === 'playing') {
		game = clearSelection(game);
		renderAll();
		return;
	}

	game = startGame(game);
	lastTickAt = performance.now();
	renderAll();
});

window.setInterval(() => {
	//
	const now = performance.now();
	const elapsedMs = now - lastTickAt;
	lastTickAt = now;
	const nextGame = tickClock(game, elapsedMs);
	if (nextGame !== game) {
		game = nextGame;
		renderAll();
		return;
	}
	renderClockUi(game);
}, 100);

function handleSquareClick(x: number, y: number) {
	//
	if (game.phase !== 'playing') return;

	const selectedMove = moveAtSelectedTarget(game, { x, y });
	if (selectedMove) {
		game = makeMove(game, selectedMove);
		lastTickAt = performance.now();
		renderAll();
		return;
	}

	game = selectSquare(game, { x, y });
	renderAll();
}

function renderAll() {
	//
	boardRenderer.setState(game);
	renderControls(game);
	renderClockUi(game);
	renderStatus(game);
	renderSelectedGuide(game);
	renderArmies(game);
	renderMoveLog(game);
}

function renderControls(state: GameState) {
	//
	const isPlaying = state.phase === 'playing';
	timeControlSelect.disabled = isPlaying;
	rerollButton.disabled = isPlaying;
	startButton.textContent = isPlaying ? 'Clear' : 'Start';
}

function renderClockUi(state: GameState) {
	//
	whiteTime.textContent = formatClock(state.whiteTimeMs);
	blackTime.textContent = formatClock(state.blackTimeMs);
	whiteClock.classList.toggle('is-active', state.phase === 'playing' && state.turn === 'white');
	blackClock.classList.toggle('is-active', state.phase === 'playing' && state.turn === 'black');
	whiteClock.classList.toggle('is-danger', state.whiteTimeMs <= 10_000);
	blackClock.classList.toggle('is-danger', state.blackTimeMs <= 10_000);
}

function renderStatus(state: GameState) {
	//
	if (state.phase === 'setup') {
		turnLabel.textContent = 'Draft ready';
		statusLabel.textContent = `${formatTimeControl(state)} blitz. Reroll until the backrank looks spicy.`;
		return;
	}

	if (state.phase === 'ended') {
		turnLabel.textContent = state.winner ? `${capitalize(state.winner)} wins` : 'Draw';
		statusLabel.textContent = state.endReason ?? 'Game ended.';
		return;
	}

	turnLabel.textContent = `${capitalize(state.turn)} to move`;
	statusLabel.textContent = 'Click a piece, then a highlighted square.';
}

function renderArmies(state: GameState) {
	//
	whitePower.textContent = formatPowerLabel(state, 'white');
	blackPower.textContent = formatPowerLabel(state, 'black');

	armyList.replaceChildren(
		createArmyBlock('White', state.whiteArmy, formatPowerLabel(state, 'white')),
		createArmyBlock('Black', state.blackArmy, formatPowerLabel(state, 'black')),
	);
}

function renderStaticLegend() {
	//
	const fragment = document.createDocumentFragment();
	for (const definition of pieceDefinitions) {
		if (definition.kind === 'king' || definition.kind === 'pawn') continue;
		const item = document.createElement('div');
		item.className = 'legend-item';

		const diagram = createMoveDiagram(definition.kind, 'white');

		const text = document.createElement('span');
		text.textContent = `${definition.label}: ${definition.description}`;

		item.append(diagram, text);
		fragment.append(item);
	}
	pieceLegend.replaceChildren(fragment);
}

function renderSelectedGuide(state: GameState) {
	//
	const selectedPiece = state.selectedPieceId ? getPieceById(state, state.selectedPieceId) : null;
	if (!selectedPiece) {
		selectedGuide.replaceChildren(createSelectedGuidePlaceholder());
		return;
	}

	const guide = getMoveGuide(selectedPiece.kind, selectedPiece.side);
	const block = document.createElement('div');
	block.className = 'selected-guide-card';

	const title = document.createElement('div');
	title.className = 'selected-guide-title';

	const badge = document.createElement('strong');
	badge.textContent = guide.shortLabel;

	const label = document.createElement('span');
	label.textContent = guide.label;

	title.append(badge, label);

	const diagram = createMoveDiagram(selectedPiece.kind, selectedPiece.side);
	diagram.classList.add('is-large');

	const detail = document.createElement('p');
	detail.textContent = guide.description;

	block.append(title, diagram, detail);
	selectedGuide.replaceChildren(block);
}

function renderMoveLog(state: GameState) {
	//
	const recentMoves = state.moveLog.slice(-12);
	const fragment = document.createDocumentFragment();
	for (const move of recentMoves) {
		const item = document.createElement('li');
		item.textContent = move;
		fragment.append(item);
	}
	moveLog.replaceChildren(fragment);
}

function createArmyBlock(label: string, army: readonly PieceKind[], powerLabel: string) {
	//
	const block = document.createElement('div');
	block.className = 'army-block';

	const heading = document.createElement('div');
	heading.className = 'army-heading';

	const title = document.createElement('strong');
	title.textContent = label;

	const power = document.createElement('span');
	power.textContent = powerLabel;

	heading.append(title, power);
	block.append(heading);

	const pieces = document.createElement('div');
	pieces.className = 'army-pieces';

	for (const kind of army) {
		const definition = getPieceDefinition(kind);
		const badge = document.createElement('span');
		badge.textContent = definition.shortLabel;
		badge.title = definition.label;
		pieces.append(badge);
	}

	block.append(pieces);
	return block;
}

function createMoveDiagram(kind: PieceKind, side: Side) {
	//
	const guide = getMoveGuide(kind, side);
	const diagram = document.createElement('div');
	diagram.className = 'move-diagram';
	diagram.title = guide.label;

	for (let y = 3; y >= -3; y -= 1) {
		for (let x = -3; x <= 3; x += 1) {
			const cell = document.createElement('span');
			const guideCell = guide.cells.find((candidate) => candidate.dx === x && candidate.dy === y);
			cell.className = guideCell ? `guide-cell is-${guideCell.role}` : 'guide-cell';
			if (guideCell?.role === 'origin') cell.textContent = guide.shortLabel;
			diagram.append(cell);
		}
	}

	return diagram;
}

function createSelectedGuidePlaceholder() {
	//
	const block = document.createElement('div');
	block.className = 'selected-guide-card is-empty';

	const diagram = document.createElement('div');
	diagram.className = 'move-diagram is-large';

	for (let index = 0; index < 49; index += 1) {
		const cell = document.createElement('span');
		cell.className = index === 24 ? 'guide-cell is-origin' : 'guide-cell';
		if (index === 24) cell.textContent = '?';
		diagram.append(cell);
	}

	const detail = document.createElement('p');
	detail.textContent = 'Select a piece to preview its shape.';

	block.append(diagram, detail);
	return block;
}

function formatPowerLabel(state: GameState, side: Side) {
	//
	const power = side === 'white' ? state.powers.white : state.powers.black;
	const definition = getPowerDefinition(power.kind);
	return power.isSpent ? `${definition.label} spent` : definition.label;
}

function getSelectedTimeControl() {
	//
	const selected = timeControls.find((timeControl) => timeControl.id === timeControlSelect.value);
	return selected ?? timeControls[2] ?? {
		id: '3+2',
		label: '3+2',
		baseTimeMs: defaultTimeControl.baseTimeMs,
		incrementMs: defaultTimeControl.incrementMs,
	};
}

function formatTimeControl(state: GameState) {
	//
	const minutes = Math.round(state.baseTimeMs / 60_000);
	const increment = Math.round(state.incrementMs / 1_000);
	return `${minutes}+${increment}`;
}

function formatClock(ms: number) {
	//
	const totalSeconds = Math.max(0, Math.ceil(ms / 1_000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getElement(id: string) {
	//
	const element = document.getElementById(id);
	if (!element) throw new Error(`missing #${id}`);
	return element;
}

function getCanvas(id: string) {
	//
	const element = getElement(id);
	if (!(element instanceof HTMLCanvasElement)) throw new Error(`#${id} is not a canvas`);
	return element;
}

function getSelect(id: string) {
	//
	const element = getElement(id);
	if (!(element instanceof HTMLSelectElement)) throw new Error(`#${id} is not a select`);
	return element;
}

function getButton(id: string) {
	//
	const element = getElement(id);
	if (!(element instanceof HTMLButtonElement)) throw new Error(`#${id} is not a button`);
	return element;
}

function capitalize(value: string) {
	//
	const first = value[0] ?? '';
	return `${first.toUpperCase()}${value.slice(1)}`;
}
