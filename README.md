# Exercise Timer Web App

## Overview

A modern, responsive workout timer web application built with vanilla HTML, CSS, and JavaScript. Features guided workout sessions with audio prompts, visual progress tracking, and the ability to create custom workout routines.

---

## Features

### Core Functionality
-   **Predefined Workouts**: Two built-in anime-themed workout routines ("Ghibli-Gains" and "Chunin-Trials")
-   **Custom Workout Builder**: Create, edit, and save personalized workout routines with localStorage persistence
-   **Smart Timer System**: Countdown timer with pause/resume functionality and accurate total workout time tracking
-   **Audio Guidance**: Speech synthesis for exercise announcements and countdown warnings (10s, 3-2-1s)

### User Experience
-   **Visual Progress Tracking**: Current exercise highlighted, completed exercises crossed out
-   **Auto-Scrolling Interface**: Exercise list automatically centers on current activity
-   **Responsive Design**: Optimized layouts for desktop (side-by-side) and mobile (stacked) views
-   **Workout Management**: Delete custom workouts with confirmation prompts

### Technical Features
-   **Memory Management**: Proper interval cleanup to prevent memory leaks
-   **Error Handling**: Graceful degradation when Speech API is unavailable
-   **No Dependencies**: Pure vanilla JavaScript with ES6 module support

---

## File Structure

-   `index.html`: The main HTML structure, including controls and container elements.
-   `style.css`: Styles for the layout, highlighting, and typography.
-   `main.js`: JavaScript logic for handling workout selection, timing, UI updates, and speech synthesis.
-   `workouts.js`: Contains an exportable object with different workout arrays (exercise name and duration pairs).

---

## Quick Start

1. **Open**: Simply open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge)
2. **Select Workout**: Choose from predefined workouts or create your own using the "Create" button
3. **Start Timer**: Click "Start" to begin your workout session
4. **Follow Along**: Listen to audio cues and watch the visual progress indicators
5. **Control Playback**: Use "Pause" to take breaks or "Resume" to continue

### Creating Custom Workouts

1. Click the **Create** button in the main interface
2. Enter a workout name and add exercises with their durations
3. Use **Add Exercise** to build your routine
4. Click **Save Workout** to store it locally
5. Your custom workout will appear in the dropdown menu with a "[Custom]" label

---

## Dependencies

-   Modern browser with support for ES modules and the Web Speech API (speech synthesis gracefully degrades if unavailable).

---

## Notes

-   Speech synthesis volume and voice depend on the user’s browser and system settings.
-   The app uses the primary scrollbar for scrolling the exercise list.
-   The workout data is stored separately in `workouts.js` for easy extension and maintenance.

---
