# Glaze World 🍩

An interactive 3D globe NFT minting experience. Select regions on the globe to extract your unique Glazelet NFT.

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- D3.js + TopoJSON (3D Globe)
- Tone.js (Audio)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deploy to GitHub Pages

### 1. Create GitHub Repository

Create a new repository on GitHub (e.g., `glaze-world`)

### 2. Update Base URL

In `vite.config.ts`, update the `base` property to match your repo name:

```ts
export default defineConfig({
  plugins: [react()],
  base: '/your-repo-name/',  // Change this!
})
```

### 3. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 4. Deploy

```bash
npm run build
npm run deploy
```

### 5. Enable GitHub Pages

1. Go to your repo Settings → Pages
2. Set Source to "Deploy from a branch"
3. Select `gh-pages` branch, `/ (root)` folder
4. Save

Your site will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

## Project Structure

```
glaze-world/
├── public/
│   └── donut.svg           # Favicon
├── src/
│   ├── components/
│   │   ├── Globe.tsx       # 3D interactive globe
│   │   ├── InfoPopup.tsx   # Player info modal
│   │   └── MintSuccessModal.tsx
│   ├── services/
│   │   └── audioService.ts # Tone.js audio manager
│   ├── App.tsx             # Main app component
│   ├── constants.ts        # Region definitions
│   ├── types.ts            # TypeScript types
│   ├── main.tsx            # Entry point
│   └── index.css           # Tailwind + custom styles
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Features

- 🌍 Interactive 3D globe with territory selection
- 🎵 Procedural music & sound effects (Tone.js)
- 🎨 Neon pink cyberpunk aesthetic
- 📱 Mobile-responsive design
- ⚡ Laser animation effects on mint
- 🔊 Toggleable music/SFX

## License

MIT
