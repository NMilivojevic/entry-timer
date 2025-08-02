const timerEl = document.getElementById("timer");
const exerciseEl = document.getElementById("exercise");
const listEl = document.getElementById("exerciseList");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const workoutRemainingEl = document.getElementById("workoutRemaining");
const workoutSelector = document.getElementById("workoutSelector");
const nextUpEl = document.getElementById("nextUp");

let current = 0;
let countdown;
let isPaused = false;
let secondsLeft = 0;
let workout = [];
let totalWorkoutSeconds = 0;
let customWorkouts = {};
let currentCustomExercises = [];

let audioContext = null;
let speechEnabled = true;
let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function initAudioContext() {
    if (!audioContext && speechEnabled) {
        try {
            audioContext = new (window.AudioContext ||
                window.webkitAudioContext)();
        } catch (error) {
            console.warn("Audio context creation failed:", error);
        }
    }
}

function playBeep(frequency = 800, duration = 200) {
    if (!audioContext) return;

    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(
            frequency,
            audioContext.currentTime
        );
        oscillator.type = "sine";

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + duration / 1000
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
        console.warn("Beep playback failed:", error);
    }
}

function speakWithFallback(text) {
    let speechWorked = false;

    if ("speechSynthesis" in window && speechEnabled) {
        try {
            const utterance = new SpeechSynthesisUtterance(text);
            speechSynthesis.cancel();

            utterance.onstart = () => {
                speechWorked = true;
            };

            utterance.onerror = () => {
                if (!speechWorked && isIOS) {
                    playBeep(600, 300);
                }
            };

            speechSynthesis.speak(utterance);

            if (isIOS) {
                setTimeout(() => {
                    if (!speechWorked) {
                        playBeep(600, 300);
                    }
                }, 100);
            }
        } catch (error) {
            console.warn("Speech synthesis failed:", error);
            if (isIOS) {
                playBeep(600, 300);
            }
        }
    } else if (isIOS) {
        playBeep(600, 300);
    }
}

function speak(text) {
    speakWithFallback(text);
}

function updateWorkoutRemaining() {
    let remaining = 0;

    // Add remaining seconds for current step (or full duration if not started)
    if (secondsLeft > 0) {
        remaining += secondsLeft;
    } else if (current < workout.length) {
        remaining += workout[current][1];
    }

    // Add full durations for all remaining exercises after current
    for (let i = current + 1; i < workout.length; i++) {
        remaining += workout[i][1];
    }

    workoutRemainingEl.innerText = `Total Time Left: ${String(
        Math.floor(remaining / 60)
    ).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
}

function updateNextUp() {
    const nextIndex = current + 1;
    if (nextIndex < workout.length) {
        const [nextName, nextDuration] = workout[nextIndex];
        nextUpEl.innerText = `Next up: ${nextName} (${nextDuration}s)`;
    } else {
        nextUpEl.innerText = "";
    }
}

function scrollToActive() {
    const active = document.querySelector("li.active");
    if (active) {
        const isMobile = window.innerWidth <= 480;
        const block = isMobile ? "end" : "center";

        active.scrollIntoView({ behavior: "smooth", block });

        if (isMobile) {
            // Slight delay to ensure scrollIntoView happens first
            setTimeout(() => {
                const scrollOffset = 70; // pixels from the bottom
                const rect = active.getBoundingClientRect();
                const offset = rect.bottom - window.innerHeight + scrollOffset;

                if (offset > 0) {
                    window.scrollBy({ top: offset, behavior: "smooth" });
                }
            }, 300);
        }
    }
}

function renderList() {
    listEl.innerHTML = "";
    workout.forEach(([name, duration], i) => {
        const li = document.createElement("li");
        li.innerText = `${name} (${duration}s)`;
        li.id = `item-${i}`;
        listEl.appendChild(li);
    });
    totalWorkoutSeconds = workout.reduce((sum, [, d]) => sum + d, 0);
    updateWorkoutRemaining();
}

function startExercise() {
    if (current >= workout.length) {
        exerciseEl.innerText = "Workout Complete!";
        timerEl.innerText = "00:00";
        pauseBtn.disabled = true;
        speak("Workout complete");
        return;
    }

    const [name, time] = workout[current];
    exerciseEl.innerText = name;
    secondsLeft = time;
    speak(name);

    document
        .querySelectorAll("li")
        .forEach((li) => li.classList.remove("active"));
    const activeItem = document.getElementById(`item-${current}`);
    if (activeItem) activeItem.classList.add("active");
    scrollToActive();
    updateNextUp();

    countdown = setInterval(() => {
        if (!isPaused) {
            if (secondsLeft <= 0) {
                clearInterval(countdown);
                activeItem.classList.add("completed");
                current++;
                startExercise();
                return;
            }

            timerEl.innerText = `${String(
                Math.floor(secondsLeft / 60)
            ).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;
            updateWorkoutRemaining();

            if (secondsLeft === 10) {
                speak("10 seconds remaining");
                const nextIndex = current + 1;
                if (nextIndex < workout.length) {
                    const [nextName] = workout[nextIndex];
                    setTimeout(() => speak(`Next up: ${nextName}`), 2000);
                }
            }
            if ([5, 4, 3, 2, 1].includes(secondsLeft))
                speak(secondsLeft.toString());

            secondsLeft--;
        }
    }, 1000);
}

startBtn.addEventListener("click", () => {
    initAudioContext();
    if (countdown) {
        clearInterval(countdown);
        countdown = null;
    }
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
    startExercise();
});

pauseBtn.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? "Resume" : "Pause";
});

resetBtn.addEventListener("click", () => {
    if (countdown) {
        clearInterval(countdown);
        countdown = null;
    }
    current = 0;
    isPaused = false;
    secondsLeft = 0;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = true;
    pauseBtn.innerText = "Pause";
    exerciseEl.innerText = "Ready";
    timerEl.innerText = "00:00";
    nextUpEl.innerText = "";

    document.querySelectorAll("li").forEach((li) => {
        li.classList.remove("active", "completed");
    });

    updateWorkoutRemaining();
});

function loadWorkout(name) {
    let workoutData = null;

    if (name.startsWith("custom:")) {
        const customName = name.replace("custom:", "");
        workoutData = customWorkouts[customName];
    } else {
        // Only load built-in workouts if enabled
        if (shouldLoadBuiltInWorkouts()) {
            workoutData = workouts[name];
        }
    }

    if (workoutData) {
        workout = workoutData;
        current = 0;
        isPaused = false;
        if (countdown) {
            clearInterval(countdown);
            countdown = null;
        }
        pauseBtn.innerText = "Pause";
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = true;
        exerciseEl.innerText = "Ready";
        timerEl.innerText = "00:00";
        renderList();
        updateNextUp();
    }
}

function loadCustomWorkouts() {
    const saved = localStorage.getItem("customWorkouts");
    if (saved) {
        customWorkouts = JSON.parse(saved);
    }
}

function saveCustomWorkouts() {
    localStorage.setItem("customWorkouts", JSON.stringify(customWorkouts));
}

function shouldLoadBuiltInWorkouts() {
    return localStorage.getItem("load-nevena-workouts") !== null;
}

function populateSelector() {
    workoutSelector.innerHTML = "";

    // Add built-in workouts only if enabled
    if (shouldLoadBuiltInWorkouts()) {
        Object.entries(workouts).forEach(([name, exercises]) => {
            const total = exercises.reduce((sum, [, d]) => sum + d, 0);
            const option = document.createElement("option");
            option.value = name;
            option.textContent = `${name.split("-").join(" ")} (${Math.floor(
                total / 60
            )}m ${total % 60}s)`;
            workoutSelector.appendChild(option);
        });
    }

    // Add custom workouts
    Object.entries(customWorkouts).forEach(([name, exercises]) => {
        const total = exercises.reduce((sum, [, d]) => sum + d, 0);
        const option = document.createElement("option");
        option.value = `custom:${name}`;
        option.textContent = `${name} (${Math.floor(total / 60)}m ${
            total % 60
        }s) [Custom]`;
        workoutSelector.appendChild(option);
    });
}

function updateDeleteButton() {
    const deleteBtn = document.getElementById("deleteWorkout");
    const selectedValue = workoutSelector.value;

    if (selectedValue && selectedValue.startsWith("custom:")) {
        deleteBtn.disabled = false;
    } else {
        deleteBtn.disabled = true;
    }
}

function deleteCustomWorkout() {
    const selectedValue = workoutSelector.value;

    if (!selectedValue || !selectedValue.startsWith("custom:")) {
        return;
    }

    const workoutName = selectedValue.replace("custom:", "");

    if (
        confirm(
            `Are you sure you want to delete the workout "${workoutName}"? This action cannot be undone.`
        )
    ) {
        delete customWorkouts[workoutName];
        saveCustomWorkouts();
        populateSelector();

        // Load the first available workout
        if (workoutSelector.options.length > 0) {
            loadWorkout(workoutSelector.options[0].value);
            workoutSelector.value = workoutSelector.options[0].value;
        } else {
            // No workouts available
            workout = [];
            current = 0;
            exerciseEl.innerText = "No workouts available";
            timerEl.innerText = "00:00";
            renderList();
        }

        updateDeleteButton();
    }
}

workoutSelector.addEventListener("change", (e) => {
    loadWorkout(e.target.value);
    updateDeleteButton();
});

document
    .getElementById("deleteWorkout")
    .addEventListener("click", deleteCustomWorkout);

function renderCustomExerciseList() {
    const customList = document.getElementById("customExerciseList");
    customList.innerHTML = "";

    if (currentCustomExercises.length === 0) {
        customList.innerHTML = "<p>No exercises added yet.</p>";
        return;
    }

    const ol = document.createElement("ol");
    currentCustomExercises.forEach(([name, duration], index) => {
        const li = document.createElement("li");
        li.innerHTML = `${name} (${duration}s) <button onclick="removeCustomExercise(${index})">Remove</button>`;
        ol.appendChild(li);
    });
    customList.appendChild(ol);
}

function removeCustomExercise(index) {
    currentCustomExercises.splice(index, 1);
    renderCustomExerciseList();
}

function showCreateWorkoutPanel() {
    document.getElementById("createWorkoutPanel").style.display = "block";
    document.getElementById("controlsPanel").style.display = "none";
    document.getElementById("exerciseList").style.display = "none";
    currentCustomExercises = [];
    renderCustomExerciseList();
}

function hideCreateWorkoutPanel() {
    document.getElementById("createWorkoutPanel").style.display = "none";
    document.getElementById("controlsPanel").style.display = "flex";
    document.getElementById("exerciseList").style.display = "block";
    // Clear input fields
    document.getElementById("workoutName").value = "";
    document.getElementById("exerciseName").value = "";
    document.getElementById("exerciseDuration").value = "";
}

// Event listeners for custom workout creation
document
    .getElementById("createWorkout")
    .addEventListener("click", showCreateWorkoutPanel);
document
    .getElementById("cancelCreate")
    .addEventListener("click", hideCreateWorkoutPanel);

document.getElementById("addExercise").addEventListener("click", () => {
    const name = document.getElementById("exerciseName").value.trim();
    const duration = parseInt(
        document.getElementById("exerciseDuration").value
    );

    if (name && duration > 0) {
        currentCustomExercises.push([name, duration]);
        document.getElementById("exerciseName").value = "";
        document.getElementById("exerciseDuration").value = "";
        renderCustomExerciseList();
    } else {
        alert("Please enter a valid exercise name and duration.");
    }
});

document.getElementById("saveWorkout").addEventListener("click", () => {
    const workoutName = document.getElementById("workoutName").value.trim();

    if (!workoutName) {
        alert("Please enter a workout name.");
        return;
    }

    if (currentCustomExercises.length === 0) {
        alert("Please add at least one exercise.");
        return;
    }

    customWorkouts[workoutName] = [...currentCustomExercises];
    saveCustomWorkouts();
    populateSelector();
    hideCreateWorkoutPanel();

    // Load the newly created workout
    loadWorkout(`custom:${workoutName}`);
    workoutSelector.value = `custom:${workoutName}`;
    updateDeleteButton();
});

document.getElementById("enableNevenaWorkouts").addEventListener("click", () => {
    localStorage.setItem("load-nevena-workouts", "true");
    alert("Nevena workouts enabled! Refreshing page...");
    location.reload();
});

window.addEventListener("DOMContentLoaded", () => {
    loadCustomWorkouts();
    populateSelector();
    if (workoutSelector.options.length > 0) {
        loadWorkout(workoutSelector.options[0].value);
        workoutSelector.value = workoutSelector.options[0].value;
    }
    updateDeleteButton();
});
