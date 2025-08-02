# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A workout timer web application built with vanilla HTML, CSS, and JavaScript. Features guided workout sessions with audio prompts, visual progress tracking, and custom workout creation capabilities.

## Common Commands

- **Run/Test**: Open `index.html` in any modern browser (no build process required)
- **Deploy**: Serve static files from any web server (no compilation needed)
- **Debug**: Use browser developer tools; no external testing framework

## Architecture

### File Structure
```
exercise-timer/
├── index.html      # Main HTML structure with controls and workout UI
├── main.js         # Core application logic and state management  
├── style.css       # Complete styling with responsive design
├── workouts.js     # Predefined workout data as ES6 module
└── README.md       # User documentation
```

### Core Systems

**Timer Engine** (`main.js:171-220`):
- setInterval-based countdown with pause/resume capability
- Automatic exercise progression with audio cues
- Real-time remaining workout time calculation

**State Management** (`main.js:11-18`):
- Global variables for current exercise index, timer state, workout data
- localStorage persistence for custom workouts under "customWorkouts" key

**Audio System** (`main.js:20-104`):
- Web Speech API with graceful degradation if unavailable
- iOS-specific audio context handling for beep sounds
- Exercise announcements and countdown warnings (10s, 3-2-1s)

**Custom Workout Builder** (`main.js:291-355`):
- Dynamic form for creating exercise sequences
- Real-time preview of exercise list
- Validation and localStorage persistence

**UI Updates** (`main.js:159-191`):
- Auto-scrolling to active exercise with mobile-optimized positioning
- Visual progress indicators (highlighting current, strikethrough completed)
- Real-time timer display and next exercise preview

### Data Structure

Workouts are arrays of `[exerciseName, durationInSeconds]` tuples:
```javascript
const workouts = {
    "workout-name": [
        ["Exercise Name", 30],
        ["Rest", 10]
    ]
};
```

### Responsive Design
- Desktop (>768px): Side-by-side controls and exercise list
- Mobile (≤480px): Stacked layout with optimized scrolling
- Smooth transitions and backdrop blur effects

## Technical Details

- **Dependencies**: None - pure vanilla JavaScript with ES6 modules
- **Browser Support**: Modern browsers with ES6 module support required
- **Memory Management**: Proper interval cleanup prevents memory leaks
- **Error Handling**: Speech API gracefully degrades, audio context handles iOS restrictions
- **Performance**: Efficient DOM updates, smooth scrolling animations