# FlashMind - Smart Flashcard App

A modern, beautiful PWA for studying with flashcards. Built with vanilla JavaScript, no frameworks required.

![FlashMind Screenshot](https://via.placeholder.com/800x450/6366f1/ffffff?text=FlashMind)

## ✨ Features

- **📚 Topic Management** - Create, edit, and delete study topics
- **🎴 Flashcard System** - Add flashcards with Markdown support
- **🎲 Study Modes**
  - **Random Mode** - Cards are shuffled randomly
  - **Focus Mode** - Prioritizes cards you've struggled with
- **📊 Progress Tracking** - See your success rate for each topic
- **🌓 Dark/Light Theme** - Easy on the eyes, day or night
- **📱 PWA Support** - Install on your device, works offline
- **⌨️ Keyboard Shortcuts** - Speed up your study sessions

## 🚀 Getting Started

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/flashmind.git
   cd flashmind
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate icons:
   ```bash
   npm run generate-icons
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open your browser to `http://localhost:3000`

### Quick Start (No Build Required)

You can also simply open `index.html` in your browser - the app works without a build step! (Icons may appear as SVG fallbacks)

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Flip flashcard |
| `1` | Mark as "Miss" (-1) |
| `2` | Mark as "Not Yet" (0) |
| `3` | Mark as "Good" (+1) |
| `Escape` | Exit study mode / Close modal |

## 🏗️ Project Structure

```
flashcard_app/
├── index.html          # Main HTML file
├── styles.css          # All styles with CSS variables
├── app.js              # Application logic
├── sw.js               # Service worker for offline support
├── manifest.json       # PWA manifest
├── package.json        # Dependencies and scripts
├── icons/              # App icons (various sizes)
├── scripts/
│   └── generate-icons.js   # Icon generation script
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Actions deployment
```

## 📦 Deployment

The app is automatically deployed to GitHub Pages when you push to the `main` or `master` branch.

### Manual Deployment

To deploy to GitHub Pages:

1. Go to your repository Settings
2. Navigate to Pages
3. Under "Build and deployment", select "GitHub Actions"
4. Push to main branch - the workflow will handle the rest!

## 🛠️ Technologies

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Flexbox, Grid, animations
- **JavaScript (ES6+)** - No frameworks, pure vanilla JS
- **IndexedDB** - Local data persistence
- **Service Workers** - Offline functionality
- **Marked.js** - Markdown rendering

## 📝 Markdown Support

Both questions and answers support Markdown formatting:

- **Bold** and *italic* text
- `Code snippets`
- Code blocks
- Lists (ordered and unordered)
- Headers
- And more!

## 🎨 Customization

### Changing Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --primary-500: #6366f1;  /* Main brand color */
    --primary-600: #4f46e5;  /* Darker shade */
    /* ... */
}
```

### Adding New Features

The app uses a simple state management pattern in `app.js`. Key areas:

- `DataStore` class - IndexedDB operations
- `state` object - Application state
- View functions - `showView()`, `loadTopic()`, etc.
- Event listeners - All in `setupEventListeners()`

## 📄 License

MIT License - feel free to use this project for learning or building your own flashcard app!

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

---

Built with ❤️ for effective studying
