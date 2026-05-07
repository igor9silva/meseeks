export type Side = 'white' | 'black';
export type Phase = 'setup' | 'playing' | 'ended';
export type MoveGuideRole = 'origin' | 'move' | 'capture' | 'screen';
export type PieceKind =
	| 'king'
	| 'pawn'
	| 'lancer'
	| 'knight'
	| 'archer'
	| 'warden'
	| 'cannon'
	| 'mystic'
	| 'duelist';
export type PowerKind = 'tempo' | 'surge' | 'dash' | 'forge';

export interface Coord {
	x: number;
	y: number;
}

export interface PieceDefinition {
	kind: PieceKind;
	label: string;
	shortLabel: string;
	value: number;
	description: string;
}

export interface MoveGuideCell {
	dx: number;
	dy: number;
	role: MoveGuideRole;
}

export interface MoveGuide {
	kind: PieceKind;
	label: string;
	shortLabel: string;
	description: string;
	cells: readonly MoveGuideCell[];
}

export interface PowerDefinition {
	kind: PowerKind;
	label: string;
	description: string;
}

export interface SidePower {
	kind: PowerKind;
	isSpent: boolean;
}

export interface SidePowers {
	white: SidePower;
	black: SidePower;
}

export interface Piece {
	id: string;
	side: Side;
	kind: PieceKind;
	x: number;
	y: number;
	hasMoved: boolean;
}

export interface Move {
	pieceId: string;
	from: Coord;
	to: Coord;
	capturedPieceId: string | null;
	promotionKind: PieceKind | null;
	spentPowerKind: PowerKind | null;
}

export interface GameState {
	phase: Phase;
	pieces: readonly Piece[];
	turn: Side;
	selectedPieceId: string | null;
	legalMoves: readonly Move[];
	whiteTimeMs: number;
	blackTimeMs: number;
	baseTimeMs: number;
	incrementMs: number;
	moveLog: readonly string[];
	winner: Side | null;
	endReason: string | null;
	powers: SidePowers;
	whiteArmy: readonly PieceKind[];
	blackArmy: readonly PieceKind[];
}

interface Direction {
	dx: number;
	dy: number;
}

interface TimeControl {
	baseTimeMs: number;
	incrementMs: number;
}

interface MoveOptions {
	allowQuiet: boolean;
	forAttack: boolean;
}

export const boardSize = 6;
export const defaultTimeControl: TimeControl = {
	baseTimeMs: 180_000,
	incrementMs: 2_000,
};

export const pieceDefinitions: readonly PieceDefinition[] = [
	{
		kind: 'king',
		label: 'King',
		shortLabel: 'K',
		value: 0,
		description: 'Royal piece. One square in any direction.',
	},
	{
		kind: 'pawn',
		label: 'Pawn',
		shortLabel: 'P',
		value: 1,
		description: 'Moves forward, captures diagonally, promotes on the back rank.',
	},
	{
		kind: 'lancer',
		label: 'Lancer',
		shortLabel: 'L',
		value: 4,
		description: 'Orthogonal slider capped at three squares.',
	},
	{
		kind: 'knight',
		label: 'Blink Knight',
		shortLabel: 'N',
		value: 4,
		description: 'Classic knight jump. Fast, rude, good.',
	},
	{
		kind: 'archer',
		label: 'Archer',
		shortLabel: 'A',
		value: 3,
		description: 'Diagonal slider capped at two squares.',
	},
	{
		kind: 'warden',
		label: 'Warden',
		shortLabel: 'W',
		value: 2,
		description: 'Non-royal king movement. Compact defensive glue.',
	},
	{
		kind: 'cannon',
		label: 'Cannon',
		shortLabel: 'C',
		value: 5,
		description: 'Moves like a rook, captures only by jumping one screen piece.',
	},
	{
		kind: 'mystic',
		label: 'Mystic',
		shortLabel: 'M',
		value: 5,
		description: 'Queen-like movement capped at two squares.',
	},
	{
		kind: 'duelist',
		label: 'Duelist',
		shortLabel: 'D',
		value: 3,
		description: 'One diagonal or two orthogonal squares.',
	},
];

export const powerDefinitions: readonly PowerDefinition[] = [
	{
		kind: 'tempo',
		label: 'Tempo Engine',
		description: 'Gain one extra second after every move.',
	},
	{
		kind: 'surge',
		label: 'Pawn Surge',
		description: 'Pawns can double-step from their home row.',
	},
	{
		kind: 'dash',
		label: 'Royal Dash',
		description: 'King can move two clear squares once per game.',
	},
	{
		kind: 'forge',
		label: 'Promotion Forge',
		description: 'First promoted pawn becomes a Cannon instead of a Lancer.',
	},
];

const draftPool: readonly PieceKind[] = [
	'lancer',
	'knight',
	'archer',
	'warden',
	'cannon',
	'mystic',
	'duelist',
];

const fallbackArmy: readonly PieceKind[] = [
	'lancer',
	'knight',
	'archer',
	'warden',
	'cannon',
];

const whiteBacklineSlots: readonly number[] = [0, 1, 3, 4, 5];
const blackBacklineSlots: readonly number[] = [5, 4, 2, 1, 0];

const orthogonalDirections: readonly Direction[] = [
	{ dx: 1, dy: 0 },
	{ dx: -1, dy: 0 },
	{ dx: 0, dy: 1 },
	{ dx: 0, dy: -1 },
];

const diagonalDirections: readonly Direction[] = [
	{ dx: 1, dy: 1 },
	{ dx: -1, dy: 1 },
	{ dx: 1, dy: -1 },
	{ dx: -1, dy: -1 },
];

const allDirections: readonly Direction[] = orthogonalDirections.concat(diagonalDirections);

const knightDirections: readonly Direction[] = [
	{ dx: 1, dy: 2 },
	{ dx: 2, dy: 1 },
	{ dx: -1, dy: 2 },
	{ dx: -2, dy: 1 },
	{ dx: 1, dy: -2 },
	{ dx: 2, dy: -1 },
	{ dx: -1, dy: -2 },
	{ dx: -2, dy: -1 },
];

const duelistDirections: readonly Direction[] = [
	{ dx: 1, dy: 1 },
	{ dx: -1, dy: 1 },
	{ dx: 1, dy: -1 },
	{ dx: -1, dy: -1 },
	{ dx: 2, dy: 0 },
	{ dx: -2, dy: 0 },
	{ dx: 0, dy: 2 },
	{ dx: 0, dy: -2 },
];

export function createGame(timeControl: TimeControl = defaultTimeControl) {
	//
	const whiteArmy = createDraftArmy();
	const blackArmy = createDraftArmy();
	const powers = {
		white: createSidePower(),
		black: createSidePower(),
	};
	const pieces = createSidePieces('white', whiteArmy).concat(createSidePieces('black', blackArmy));

	return createState({
		phase: 'setup',
		pieces,
		turn: 'white',
		selectedPieceId: null,
		legalMoves: [],
		whiteTimeMs: timeControl.baseTimeMs,
		blackTimeMs: timeControl.baseTimeMs,
		baseTimeMs: timeControl.baseTimeMs,
		incrementMs: timeControl.incrementMs,
		moveLog: [],
		winner: null,
		endReason: null,
		powers,
		whiteArmy,
		blackArmy,
	});
}

export function startGame(state: GameState) {
	//
	return createState({
		phase: 'playing',
		pieces: state.pieces,
		turn: 'white',
		selectedPieceId: null,
		legalMoves: [],
		whiteTimeMs: state.baseTimeMs,
		blackTimeMs: state.baseTimeMs,
		baseTimeMs: state.baseTimeMs,
		incrementMs: state.incrementMs,
		moveLog: [],
		winner: null,
		endReason: null,
		powers: clonePowers(state.powers),
		whiteArmy: state.whiteArmy,
		blackArmy: state.blackArmy,
	});
}

export function selectSquare(state: GameState, coord: Coord) {
	//
	if (state.phase !== 'playing') return clearSelection(state);

	const piece = getPieceAt(state, coord.x, coord.y);
	if (!piece || piece.side !== state.turn) return clearSelection(state);

	return withSelection(state, piece.id, getLegalMovesForPiece(state, piece));
}

export function clearSelection(state: GameState) {
	//
	return withSelection(state, null, []);
}

export function moveAtSelectedTarget(state: GameState, coord: Coord) {
	//
	return state.legalMoves.find((move) => move.to.x === coord.x && move.to.y === coord.y) ?? null;
}

export function makeMove(state: GameState, move: Move) {
	//
	if (state.phase !== 'playing') return state;

	const mover = state.turn;
	const afterBoardMove = applyMoveToBoard(state, move);
	const increment = getIncrementForSide(afterBoardMove, mover);
	const whiteTimeMs = mover === 'white' ? afterBoardMove.whiteTimeMs + increment : afterBoardMove.whiteTimeMs;
	const blackTimeMs = mover === 'black' ? afterBoardMove.blackTimeMs + increment : afterBoardMove.blackTimeMs;
	const opponent = otherSide(mover);
	const nextTurnState = createState({
		phase: 'playing',
		pieces: afterBoardMove.pieces,
		turn: opponent,
		selectedPieceId: null,
		legalMoves: [],
		whiteTimeMs,
		blackTimeMs,
		baseTimeMs: afterBoardMove.baseTimeMs,
		incrementMs: afterBoardMove.incrementMs,
		moveLog: afterBoardMove.moveLog.concat(formatMove(afterBoardMove, move)),
		winner: null,
		endReason: null,
		powers: clonePowers(afterBoardMove.powers),
		whiteArmy: afterBoardMove.whiteArmy,
		blackArmy: afterBoardMove.blackArmy,
	});

	return resolveGameEnd(nextTurnState, mover, opponent);
}

export function tickClock(state: GameState, elapsedMs: number) {
	//
	if (state.phase !== 'playing') return state;

	const whiteTimeMs = state.turn === 'white' ? Math.max(0, state.whiteTimeMs - elapsedMs) : state.whiteTimeMs;
	const blackTimeMs = state.turn === 'black' ? Math.max(0, state.blackTimeMs - elapsedMs) : state.blackTimeMs;

	if (whiteTimeMs === 0) return endGame(state, 'black', 'White flagged.');
	if (blackTimeMs === 0) return endGame(state, 'white', 'Black flagged.');

	return createState({
		phase: state.phase,
		pieces: state.pieces,
		turn: state.turn,
		selectedPieceId: state.selectedPieceId,
		legalMoves: state.legalMoves,
		whiteTimeMs,
		blackTimeMs,
		baseTimeMs: state.baseTimeMs,
		incrementMs: state.incrementMs,
		moveLog: state.moveLog,
		winner: state.winner,
		endReason: state.endReason,
		powers: state.powers,
		whiteArmy: state.whiteArmy,
		blackArmy: state.blackArmy,
	});
}

export function getPieceAt(state: GameState, x: number, y: number) {
	//
	return state.pieces.find((piece) => piece.x === x && piece.y === y) ?? null;
}

export function getPieceById(state: GameState, pieceId: string) {
	//
	return state.pieces.find((piece) => piece.id === pieceId) ?? null;
}

export function getPieceDefinition(kind: PieceKind) {
	//
	const definition = pieceDefinitions.find((pieceDefinition) => pieceDefinition.kind === kind);
	if (!definition) throw new Error(`missing piece definition for ${kind}`);
	return definition;
}

export function getPowerDefinition(kind: PowerKind) {
	//
	const definition = powerDefinitions.find((powerDefinition) => powerDefinition.kind === kind);
	if (!definition) throw new Error(`missing power definition for ${kind}`);
	return definition;
}

export function getMoveGuide(kind: PieceKind, side: Side) {
	//
	const definition = getPieceDefinition(kind);
	return {
		kind,
		label: definition.label,
		shortLabel: definition.shortLabel,
		description: definition.description,
		cells: getMoveGuideCells(kind, side),
	};
}

export function otherSide(side: Side): Side {
	//
	return side === 'white' ? 'black' : 'white';
}

export function isInsideBoard(x: number, y: number) {
	//
	return x >= 0 && x < boardSize && y >= 0 && y < boardSize;
}

export function isKingInCheck(state: GameState, side: Side) {
	//
	const king = state.pieces.find((piece) => piece.side === side && piece.kind === 'king');
	if (!king) return true;
	return isSquareAttacked(state, king.x, king.y, otherSide(side));
}

function createState(state: GameState) {
	//
	return state;
}

function createDraftArmy() {
	//
	const shuffled = shufflePieceKinds(draftPool);
	return shuffled.slice(0, 5);
}

function createSidePower() {
	//
	const index = Math.floor(Math.random() * powerDefinitions.length);
	const definition = powerDefinitions[index] ?? powerDefinitions[0];
	if (!definition) throw new Error('missing power definitions');

	return {
		kind: definition.kind,
		isSpent: false,
	};
}

function shufflePieceKinds(kinds: readonly PieceKind[]) {
	//
	const shuffled = kinds.slice();
	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		const current = shuffled[index];
		const replacement = shuffled[swapIndex];
		if (!current || !replacement) continue;
		shuffled[index] = replacement;
		shuffled[swapIndex] = current;
	}
	return shuffled;
}

function createSidePieces(side: Side, army: readonly PieceKind[]) {
	//
	const pieces: Piece[] = [];
	const homeRank = getHomeRank(side);
	const pawnRank = getPawnRank(side);
	const kingX = side === 'white' ? 2 : 3;
	const slots = side === 'white' ? whiteBacklineSlots : blackBacklineSlots;

	for (let x = 0; x < boardSize; x += 1) {
		pieces.push(createPiece(`${side}-pawn-${x}`, side, 'pawn', x, pawnRank));
	}

	pieces.push(createPiece(`${side}-king`, side, 'king', kingX, homeRank));

	for (let index = 0; index < slots.length; index += 1) {
		const slot = slots[index];
		const kind = army[index] ?? fallbackArmy[index] ?? 'lancer';
		if (slot === undefined) continue;
		pieces.push(createPiece(`${side}-${kind}-${index}`, side, kind, slot, homeRank));
	}

	return pieces;
}

function createPiece(id: string, side: Side, kind: PieceKind, x: number, y: number): Piece {
	//
	return {
		id,
		side,
		kind,
		x,
		y,
		hasMoved: false,
	};
}

function withSelection(state: GameState, selectedPieceId: string | null, legalMoves: readonly Move[]) {
	//
	return createState({
		phase: state.phase,
		pieces: state.pieces,
		turn: state.turn,
		selectedPieceId,
		legalMoves,
		whiteTimeMs: state.whiteTimeMs,
		blackTimeMs: state.blackTimeMs,
		baseTimeMs: state.baseTimeMs,
		incrementMs: state.incrementMs,
		moveLog: state.moveLog,
		winner: state.winner,
		endReason: state.endReason,
		powers: state.powers,
		whiteArmy: state.whiteArmy,
		blackArmy: state.blackArmy,
	});
}

function getLegalMovesForPiece(state: GameState, piece: Piece) {
	//
	const pseudoMoves = getPseudoMoves(state, piece, { allowQuiet: true, forAttack: false });
	return pseudoMoves.filter((move) => {
		const next = applyMoveToBoard(state, move);
		return !isKingInCheck(next, piece.side);
	});
}

function getPseudoMoves(state: GameState, piece: Piece, options: MoveOptions) {
	//
	if (piece.kind === 'pawn') return getPawnMoves(state, piece, options);
	if (piece.kind === 'king') return getKingMoves(state, piece, options);
	if (piece.kind === 'lancer') return getRayMoves(state, piece, orthogonalDirections, 3, options);
	if (piece.kind === 'archer') return getRayMoves(state, piece, diagonalDirections, 2, options);
	if (piece.kind === 'warden') return getStepMoves(state, piece, allDirections, options);
	if (piece.kind === 'knight') return getStepMoves(state, piece, knightDirections, options);
	if (piece.kind === 'cannon') return getCannonMoves(state, piece, options);
	if (piece.kind === 'mystic') return getRayMoves(state, piece, allDirections, 2, options);
	if (piece.kind === 'duelist') return getStepMoves(state, piece, duelistDirections, options);

	return [];
}

function getMoveGuideCells(kind: PieceKind, side: Side) {
	//
	const origin = [guideCell(0, 0, 'origin')];
	if (kind === 'pawn') return origin.concat(getPawnGuideCells(side));
	if (kind === 'king') return origin.concat(getStepGuideCells(allDirections));
	if (kind === 'lancer') return origin.concat(getRayGuideCells(orthogonalDirections, 3, 'move'));
	if (kind === 'archer') return origin.concat(getRayGuideCells(diagonalDirections, 2, 'move'));
	if (kind === 'warden') return origin.concat(getStepGuideCells(allDirections));
	if (kind === 'knight') return origin.concat(getStepGuideCells(knightDirections));
	if (kind === 'cannon') return origin.concat(getCannonGuideCells());
	if (kind === 'mystic') return origin.concat(getRayGuideCells(allDirections, 2, 'move'));
	if (kind === 'duelist') return origin.concat(getStepGuideCells(duelistDirections));

	return origin;
}

function getPawnGuideCells(side: Side) {
	//
	const direction = side === 'white' ? 1 : -1;
	return [
		guideCell(0, direction, 'move'),
		guideCell(0, direction * 2, 'move'),
		guideCell(-1, direction, 'capture'),
		guideCell(1, direction, 'capture'),
	];
}

function getStepGuideCells(directions: readonly Direction[]) {
	//
	return directions.map((direction) => guideCell(direction.dx, direction.dy, 'move'));
}

function getRayGuideCells(
	directions: readonly Direction[],
	maxSteps: number,
	role: MoveGuideRole,
) {
	//
	const cells: MoveGuideCell[] = [];
	for (const direction of directions) {
		for (let step = 1; step <= maxSteps; step += 1) {
			cells.push(guideCell(direction.dx * step, direction.dy * step, role));
		}
	}
	return cells;
}

function getCannonGuideCells() {
	//
	const moveCells = getRayGuideCells(orthogonalDirections, 3, 'move');
	const screenCells = getRayGuideCells(orthogonalDirections, 1, 'screen');
	const captureCells = getRayGuideCells(orthogonalDirections, 3, 'capture').filter((cell) => {
		return Math.abs(cell.dx) === 3 || Math.abs(cell.dy) === 3;
	});
	return moveCells.concat(screenCells, captureCells);
}

function guideCell(dx: number, dy: number, role: MoveGuideRole): MoveGuideCell {
	//
	return { dx, dy, role };
}

function getPawnMoves(state: GameState, piece: Piece, options: MoveOptions) {
	//
	const moves: Move[] = [];
	const direction = piece.side === 'white' ? 1 : -1;
	const forwardY = piece.y + direction;

	if (options.allowQuiet && isInsideBoard(piece.x, forwardY) && !getPieceAt(state, piece.x, forwardY)) {
		moves.push(createMove(state, piece, piece.x, forwardY, null, null));

		const doubleY = piece.y + direction * 2;
		const canSurge = hasAvailablePower(state, piece.side, 'surge');
		if (!piece.hasMoved && canSurge && isInsideBoard(piece.x, doubleY) && !getPieceAt(state, piece.x, doubleY)) {
			moves.push(createMove(state, piece, piece.x, doubleY, null, null));
		}
	}

	addPawnCapture(moves, state, piece, piece.x - 1, forwardY, options);
	addPawnCapture(moves, state, piece, piece.x + 1, forwardY, options);

	return moves;
}

function addPawnCapture(
	moves: Move[],
	state: GameState,
	piece: Piece,
	x: number,
	y: number,
	options: MoveOptions,
) {
	//
	if (!isInsideBoard(x, y)) return;

	const target = getPieceAt(state, x, y);
	if (options.forAttack) {
		moves.push(createMove(state, piece, x, y, target ? target.id : null, null));
		return;
	}
	if (!target || target.side === piece.side) return;
	moves.push(createMove(state, piece, x, y, target.id, null));
}

function getKingMoves(state: GameState, piece: Piece, options: MoveOptions) {
	//
	const moves = getStepMoves(state, piece, allDirections, options);
	if (options.forAttack || !hasAvailablePower(state, piece.side, 'dash')) return moves;

	for (const direction of allDirections) {
		const middleX = piece.x + direction.dx;
		const middleY = piece.y + direction.dy;
		const targetX = piece.x + direction.dx * 2;
		const targetY = piece.y + direction.dy * 2;
		if (!isInsideBoard(middleX, middleY) || !isInsideBoard(targetX, targetY)) continue;
		if (getPieceAt(state, middleX, middleY)) continue;

		const target = getPieceAt(state, targetX, targetY);
		if (target && target.side === piece.side) continue;
		moves.push(createMove(state, piece, targetX, targetY, target ? target.id : null, 'dash'));
	}

	return moves;
}

function getStepMoves(
	state: GameState,
	piece: Piece,
	directions: readonly Direction[],
	options: MoveOptions,
) {
	//
	const moves: Move[] = [];
	for (const direction of directions) {
		const targetX = piece.x + direction.dx;
		const targetY = piece.y + direction.dy;
		if (!isInsideBoard(targetX, targetY)) continue;

		const target = getPieceAt(state, targetX, targetY);
		if (!target) {
			if (options.allowQuiet) moves.push(createMove(state, piece, targetX, targetY, null, null));
			continue;
		}
		if (target.side !== piece.side) moves.push(createMove(state, piece, targetX, targetY, target.id, null));
	}
	return moves;
}

function getRayMoves(
	state: GameState,
	piece: Piece,
	directions: readonly Direction[],
	maxSteps: number,
	options: MoveOptions,
) {
	//
	const moves: Move[] = [];
	for (const direction of directions) {
		for (let step = 1; step <= maxSteps; step += 1) {
			const targetX = piece.x + direction.dx * step;
			const targetY = piece.y + direction.dy * step;
			if (!isInsideBoard(targetX, targetY)) break;

			const target = getPieceAt(state, targetX, targetY);
			if (!target) {
				if (options.allowQuiet) moves.push(createMove(state, piece, targetX, targetY, null, null));
				continue;
			}

			if (target.side !== piece.side) moves.push(createMove(state, piece, targetX, targetY, target.id, null));
			break;
		}
	}
	return moves;
}

function getCannonMoves(state: GameState, piece: Piece, options: MoveOptions) {
	//
	const moves: Move[] = [];
	for (const direction of orthogonalDirections) {
		let hasScreen = false;
		for (let step = 1; step < boardSize; step += 1) {
			const targetX = piece.x + direction.dx * step;
			const targetY = piece.y + direction.dy * step;
			if (!isInsideBoard(targetX, targetY)) break;

			const target = getPieceAt(state, targetX, targetY);
			if (!hasScreen) {
				if (!target) {
					if (options.allowQuiet) moves.push(createMove(state, piece, targetX, targetY, null, null));
					continue;
				}
				hasScreen = true;
				continue;
			}

			if (!target) continue;
			if (target.side !== piece.side) moves.push(createMove(state, piece, targetX, targetY, target.id, null));
			break;
		}
	}
	return moves;
}

function createMove(
	state: GameState,
	piece: Piece,
	toX: number,
	toY: number,
	capturedPieceId: string | null,
	spentPowerKind: PowerKind | null,
): Move {
	//
	const promotionKind = getPromotionKind(state, piece, toY);
	const promotionPowerKind = promotionKind === 'cannon' ? 'forge' : null;

	return {
		pieceId: piece.id,
		from: { x: piece.x, y: piece.y },
		to: { x: toX, y: toY },
		capturedPieceId,
		promotionKind,
		spentPowerKind: spentPowerKind ?? promotionPowerKind,
	};
}

function getPromotionKind(state: GameState, piece: Piece, targetY: number) {
	//
	if (piece.kind !== 'pawn') return null;
	if (piece.side === 'white' && targetY !== boardSize - 1) return null;
	if (piece.side === 'black' && targetY !== 0) return null;
	return hasAvailablePower(state, piece.side, 'forge') ? 'cannon' : 'lancer';
}

function applyMoveToBoard(state: GameState, move: Move) {
	//
	const nextPieces: Piece[] = [];

	for (const piece of state.pieces) {
		if (piece.id === move.capturedPieceId) continue;

		if (piece.id !== move.pieceId) {
			nextPieces.push(piece);
			continue;
		}

		const nextKind = move.promotionKind ?? piece.kind;
		nextPieces.push({
			id: piece.id,
			side: piece.side,
			kind: nextKind,
			x: move.to.x,
			y: move.to.y,
			hasMoved: true,
		});
	}

	return createState({
		phase: state.phase,
		pieces: nextPieces,
		turn: state.turn,
		selectedPieceId: state.selectedPieceId,
		legalMoves: state.legalMoves,
		whiteTimeMs: state.whiteTimeMs,
		blackTimeMs: state.blackTimeMs,
		baseTimeMs: state.baseTimeMs,
		incrementMs: state.incrementMs,
		moveLog: state.moveLog,
		winner: state.winner,
		endReason: state.endReason,
		powers: spendPower(state.powers, state.turn, move.spentPowerKind),
		whiteArmy: state.whiteArmy,
		blackArmy: state.blackArmy,
	});
}

function resolveGameEnd(state: GameState, mover: Side, opponent: Side) {
	//
	const isOpponentInCheck = isKingInCheck(state, opponent);
	const hasOpponentMove = hasAnyLegalMove(state, opponent);

	if (isOpponentInCheck && !hasOpponentMove) return endGame(state, mover, `${capitalize(opponent)} is checkmated.`);
	if (!isOpponentInCheck && !hasOpponentMove) return endGame(state, null, 'Stalemate.');

	return state;
}

function hasAnyLegalMove(state: GameState, side: Side) {
	//
	for (const piece of state.pieces) {
		if (piece.side !== side) continue;
		if (getLegalMovesForPiece(state, piece).length > 0) return true;
	}
	return false;
}

function isSquareAttacked(state: GameState, x: number, y: number, attackingSide: Side) {
	//
	for (const piece of state.pieces) {
		if (piece.side !== attackingSide) continue;
		const moves = getPseudoMoves(state, piece, { allowQuiet: false, forAttack: true });
		if (moves.some((move) => move.to.x === x && move.to.y === y)) return true;
	}
	return false;
}

function endGame(state: GameState, winner: Side | null, reason: string) {
	//
	return createState({
		phase: 'ended',
		pieces: state.pieces,
		turn: state.turn,
		selectedPieceId: null,
		legalMoves: [],
		whiteTimeMs: state.whiteTimeMs,
		blackTimeMs: state.blackTimeMs,
		baseTimeMs: state.baseTimeMs,
		incrementMs: state.incrementMs,
		moveLog: state.moveLog,
		winner,
		endReason: reason,
		powers: state.powers,
		whiteArmy: state.whiteArmy,
		blackArmy: state.blackArmy,
	});
}

function spendPower(powers: SidePowers, side: Side, spentPowerKind: PowerKind | null) {
	//
	if (!spentPowerKind) return clonePowers(powers);

	const white = clonePower(powers.white);
	const black = clonePower(powers.black);
	if (side === 'white' && white.kind === spentPowerKind) white.isSpent = true;
	if (side === 'black' && black.kind === spentPowerKind) black.isSpent = true;

	return { white, black };
}

function clonePowers(powers: SidePowers): SidePowers {
	//
	return {
		white: clonePower(powers.white),
		black: clonePower(powers.black),
	};
}

function clonePower(power: SidePower): SidePower {
	//
	return {
		kind: power.kind,
		isSpent: power.isSpent,
	};
}

function hasAvailablePower(state: GameState, side: Side, kind: PowerKind) {
	//
	const power = side === 'white' ? state.powers.white : state.powers.black;
	return power.kind === kind && !power.isSpent;
}

function getIncrementForSide(state: GameState, side: Side) {
	//
	return hasAvailablePower(state, side, 'tempo') ? state.incrementMs + 1_000 : state.incrementMs;
}

function getHomeRank(side: Side) {
	//
	return side === 'white' ? 0 : boardSize - 1;
}

function getPawnRank(side: Side) {
	//
	return side === 'white' ? 1 : boardSize - 2;
}

function formatMove(state: GameState, move: Move) {
	//
	const piece = getPieceById(state, move.pieceId);
	if (!piece) return 'unknown move';

	const definition = getPieceDefinition(piece.kind);
	const capture = move.capturedPieceId ? 'x' : '-';
	const promotion = move.promotionKind ? `=${getPieceDefinition(move.promotionKind).shortLabel}` : '';
	const power = move.spentPowerKind ? ` ${getPowerDefinition(move.spentPowerKind).label}` : '';
	return `${capitalize(piece.side)} ${definition.shortLabel}${coordLabel(move.from)}${capture}${coordLabel(move.to)}${promotion}${power}`;
}

function coordLabel(coord: Coord) {
	//
	const file = String.fromCharCode(97 + coord.x);
	return `${file}${coord.y + 1}`;
}

function capitalize(value: string) {
	//
	const first = value[0] ?? '';
	return `${first.toUpperCase()}${value.slice(1)}`;
}
