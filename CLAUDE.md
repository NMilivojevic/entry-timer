# Exercise Timer Web App - Project Context

## Overview
This is a workout timer web application built with vanilla HTML, CSS, and JavaScript. It provides guided workout sessions with audio prompts, visual progress tracking, and custom workout creation capabilities.

## Project Structure
```
exercise-timer/
├── index.html          # Main HTML structure with controls and layout
├── main.js             # Core JavaScript logic for timer and UI
├── style.css           # Comprehensive CSS styling with responsive design
├── workouts.js         # Predefined workout data ("Ghibli-Gains", "Chunin-Trials")
└── README.md           # Detailed project documentation
```

## Key Features
- **Timer System**: Countdown timer with exercise progression
- **Audio Prompts**: Speech synthesis for exercise announcements and countdown warnings
- **Custom Workouts**: Create, save, and delete custom workout routines using localStorage
- **Visual Progress**: Highlighted current exercise, completed exercises strikethrough
- **Responsive Design**: Mobile-friendly layout with fixed controls panel
- **Auto-scrolling**: Current exercise centered in view during workout

## Technical Architecture

### Core Components
- **Timer Logic** (`main.js:103-131`): setInterval-based countdown with pause/resume
- **Workout Management** (`main.js:148-174`): Load predefined or custom workouts
- **Custom Workout Builder** (`main.js:291-355`): Create/edit/save custom routines
- **Speech Synthesis** (`main.js:19-29`): Browser audio prompts with error handling
- **UI Updates** (`main.js:69-79`, `main.js:31-49`): Real-time display updates

### Data Structure
Workouts are arrays of `[exerciseName, durationInSeconds]` tuples:
```javascript
"workout-name": [
    ["Exercise Name", 30],
    ["Rest", 10],
    // ...
]
```

### Storage
- **Built-in workouts**: Static data in `workouts.js`
- **Custom workouts**: localStorage as JSON under "customWorkouts" key

## Development Notes
- No external dependencies - pure vanilla JavaScript
- ES6 modules used for workout data import
- Responsive breakpoints: 768px (desktop), 480px (mobile)
- Speech API gracefully degrades if unavailable
- Memory leak prevention with proper interval cleanup

## Common Commands
- **Open**: Open `index.html` in browser (no build process needed)
- **Test**: Manual testing in browser (no automated test suite)
- **Deploy**: Static files can be served from any web server

## Browser Compatibility
- Modern browsers with ES6 module support
- Web Speech API optional (graceful degradation)
- Tested primarily in Chrome/Firefox