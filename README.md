
## blep.click React App

Interactive "boop the snoot" demo converted from a static HTML page to React + Vite.

### Features
- Cat image toggles on press / touch.
- Sound effect with configurable volume.
- Visitor country flag lookup (API configurable via env).
- Leaderboard (static placeholder data component).

### Getting Started
Install dependencies and start the dev server:

```
npm install
npm run dev
```

Build for production:
```
npm run build
```
Preview the production build:
```
npm run preview
```

### Environment Variables
Copy `.env.example` to `.env` and adjust as needed.

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_FLAG_API` | Country lookup endpoint (must return `country_code` & `country_name`) | `https://ipapi.co/json/?fields=country_code,country_name` |
| `VITE_INITIAL_BLEP_COUNT` | Starting counter value | `0` |
| `VITE_AUDIO_VOLUME` | Audio volume (0.0 - 1.0) | `1.0` |

All `VITE_` prefixed vars become available in the client (`import.meta.env`).

### Project Structure
```
index.html          # Vite entry
src/
	main.jsx          # React root render
	App.jsx           # Main interaction logic
	Leaderboard.jsx   # Static leaderboard component
	styles.css        # Styles migrated from original inline CSS
img/                # Cat images (in.jpg/out.jpg)
blep.wav            # Audio asset
.env.example        # Environment variable template
```

### Possible Next Steps
- Persist blep count (localStorage or backend).
- Replace static leaderboard with live data.
- Accessibility: add aria-labels & focusable target area.
- Add PWA manifest + service worker for offline fun.

### License
Add a license file if you plan to open source.

