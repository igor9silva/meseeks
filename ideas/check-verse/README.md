# CheckVerse

CheckVerse MVP: a 6x6 blitz strategy game with chess-readable roles, stable pawn rows, randomized asymmetric backranks, visible side powers, checkmate, promotion, and 3-minute clocks with configurable increment.

## Run

```sh
bun install
bun run dev
```

Open `http://localhost:3010`.

## MVP Rules

- 6x6 board.
- White king starts on `c1`; black king starts on `d6`.
- Both players always get six pawns.
- Five backrank pieces are drafted randomly from the special-piece pool.
- Each side gets one visible global power.
- Default clock is `3+2`.
- Win by checkmate or flag.
- Stalemate is a draw.
