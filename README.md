# Workout Timer Web App

## Overview

This is a simple and lightweight workout timer web application built with HTML, CSS, and JavaScript. It allows users to select from multiple predefined workouts and guides them through each exercise with timers, audio prompts, and progress tracking.

---

## Features

-   **Multiple Workouts**: Choose from different workouts loaded from an external JavaScript file. Workout options are dynamically populated from the workouts data.
-   **Exercise List**: Displays the full list of exercises with their durations next to them.
-   **Timer & Controls**: Shows the current exercise name, countdown timer, and accurate total workout time remaining.
-   **Audio Prompts**: Uses browser speech synthesis to announce each exercise name and countdown warnings (10 seconds remaining, 3-2-1 seconds). Includes error handling for unsupported browsers.
-   **Pause/Resume**: Pause or resume the timer at any time.
-   **Auto-Scrolling List**: The current exercise is highlighted and always scrolled into view in the middle of the screen, with completed exercises shown as strikethrough.
-   **Responsive UI**: Layout fixes the control panel on the left and the exercise list on the right, ensuring controls are always visible.
-   **Stability Features**: Prevents multiple timers from running simultaneously and properly cleans up intervals to prevent memory leaks.

---

## File Structure

-   `index.html`: The main HTML structure, including controls and container elements.
-   `style.css`: Styles for the layout, highlighting, and typography.
-   `main.js`: JavaScript logic for handling workout selection, timing, UI updates, and speech synthesis.
-   `workouts.js`: Contains an exportable object with different workout arrays (exercise name and duration pairs).

---

## How to Use

1. Open `index.html` in a modern browser (preferably Chrome or Firefox).
2. Use the dropdown menu to select a workout. The exercise list and total duration update accordingly.
3. Click **Start** to begin the workout timer.
4. The app will announce exercises and countdown warnings aloud.
5. Use the **Pause** button to pause/resume the timer at any time.
6. The current exercise is highlighted and centered, with completed exercises crossed out.
7. The total workout time left is displayed and updated live.

---

## Dependencies

-   Modern browser with support for ES modules and the Web Speech API (speech synthesis gracefully degrades if unavailable).

---

## Notes

-   Speech synthesis volume and voice depend on the user’s browser and system settings.
-   The app uses the primary scrollbar for scrolling the exercise list.
-   The workout data is stored separately in `workouts.js` for easy extension and maintenance.

---
