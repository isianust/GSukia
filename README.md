# 🍉 Suika Game

A browser-based fruit-merging puzzle game inspired by [SuikaGame.com](https://suikagame.com), built with vanilla HTML, CSS, and JavaScript — no external dependencies required.

## 🎮 Play Now

**[Play Suika Game](https://isianust.github.io/GSukia/)**

## How to Play

1. **Open** the [live game](https://isianust.github.io/GSukia/) or `index.html` in any modern browser.
2. **Move** your mouse (or use arrow keys) to position the fruit above the container.
3. **Click** (or press Space/Enter) to drop the fruit.
4. When **two identical fruits** collide, they merge into the next larger fruit.
5. The game ends when fruits stack above the **danger line**.

## Fruit Evolution Chain

🍒 Cherry → 🍓 Strawberry → 🍇 Grape → 🍊 Dekopon → 🟠 Orange → 🍎 Apple → 🍐 Pear → 🍑 Peach → 🍍 Pineapple → 🍈 Melon → 🍉 Watermelon

## Controls

| Input | Action |
|-------|--------|
| Mouse move | Position fruit |
| Click / Tap | Drop fruit |
| ← → Arrow keys | Move drop position |
| Space / Enter | Drop fruit |

## Project Structure

```
├── index.html      # Main HTML page
├── css/
│   └── style.css   # Game styling and animations
├── js/
│   └── game.js     # Game logic, physics, and rendering
└── README.md
```

## Features

- **Custom physics engine** — gravity, collision detection and response, momentum transfer
- **Fruit merging** — identical fruits combine into the next tier
- **Score tracking** — points awarded on each merge
- **Visual effects** — merge animations, score popups, gradient fruit rendering
- **Mobile support** — touch controls for phones and tablets
- **Keyboard support** — arrow keys and spacebar
- **No dependencies** — pure HTML, CSS, and JavaScript
