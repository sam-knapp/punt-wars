# Side Bet City

Customize fantasy football side bets for weekly matchups with friends. Flip toggles across cash, shame, sweat, chores, and social stakes — then share a link or copy the bet slip.

## Run

```bash
npm install
npm run dev
```

## Invent a stake

Copy `.env.example` to `.env` and set `OPENAI_API_KEY`. The draw calls `gpt-4o-mini` through the Vite server, so the key stays off the page. With no key, the same lottery lands on a matching bet from the board.

## Stack

Vite · React · TypeScript
