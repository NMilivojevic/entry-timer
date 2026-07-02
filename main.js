const timerEl = document.getElementById("timer");
const exerciseEl = document.getElementById("exercise");
const listEl = document.getElementById("exerciseList");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const workoutRemainingEl = document.getElementById("workoutRemaining");
const workoutSelector = document.getElementById("workoutSelector");
const nextUpEl = document.getElementById("nextUp");
const ringProgressEl = document.getElementById("ringProgress");
const workoutProgressFillEl = document.getElementById("workoutProgressFill");
const muteToggleBtn = document.getElementById("muteToggle");
const voiceSelectorEl = document.getElementById("voiceSelector");
const backStepBtn = document.getElementById("backStep");
const skipStepBtn = document.getElementById("skipStep");

const SPEAKER_ON_SVG =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
const SPEAKER_OFF_SVG =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';

const RING_CIRCUMFERENCE = 2 * Math.PI * 100;

function setRingProgress(fraction) {
    const clamped = Math.max(0, Math.min(1, fraction));
    ringProgressEl.style.strokeDasharray = `${RING_CIRCUMFERENCE}`;
    ringProgressEl.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - clamped)}`;
}

let current = 0;
let countdown;
let isPaused = false;
let secondsLeft = 0;
let exerciseEndTime = 0;
let pausedRemainingMs = 0;
let workout = [];
let totalWorkoutSeconds = 0;
let customWorkouts = {};
let currentCustomExercises = [];
let editingWorkoutName = null;
let editingEntryIndex = null;
let draggedExerciseIndex = null;
let wakeLock = null;

let audioContext = null;
let speechEnabled = localStorage.getItem("speechEnabled") !== "false";
let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function applySpeechPreference() {
    muteToggleBtn.innerHTML = speechEnabled ? SPEAKER_ON_SVG : SPEAKER_OFF_SVG;
    muteToggleBtn.classList.toggle("muted", !speechEnabled);
    const label = speechEnabled
        ? "Mute voice announcements"
        : "Unmute voice announcements";
    muteToggleBtn.setAttribute("aria-label", label);
    muteToggleBtn.title = label;
}

muteToggleBtn.addEventListener("click", () => {
    speechEnabled = !speechEnabled;
    localStorage.setItem("speechEnabled", String(speechEnabled));
    applySpeechPreference();
});

applySpeechPreference();

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

let preferredVoice = null;
let selectedVoiceURI = localStorage.getItem("voiceURI") || null;

function pickPreferredVoice() {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;

    if (selectedVoiceURI) {
        const chosen = voices.find((v) => v.voiceURI === selectedVoiceURI);
        if (chosen) return chosen;
    }

    const englishVoices = voices.filter(
        (v) => v.lang && v.lang.toLowerCase().startsWith("en")
    );
    const pool = englishVoices.length ? englishVoices : voices;

    // Network-backed voices (localService: false) are generally the higher-quality
    // ones a browser offers (e.g. Chrome's Google voices) vs. the flat on-device
    // fallback voices most platforms ship by default.
    const networkVoice = pool.find((v) => !v.localService);
    return networkVoice || pool[0];
}

function populateVoiceSelector() {
    const voices = speechSynthesis
        .getVoices()
        .filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
    if (!voices.length) return;

    voiceSelectorEl.innerHTML = "";
    voices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelectorEl.appendChild(option);
    });

    if (preferredVoice) {
        voiceSelectorEl.value = preferredVoice.voiceURI;
    }
}

function refreshVoices() {
    preferredVoice = pickPreferredVoice();
    populateVoiceSelector();
}

if ("speechSynthesis" in window) {
    refreshVoices();
    speechSynthesis.onvoiceschanged = refreshVoices;
}

voiceSelectorEl.addEventListener("change", (e) => {
    selectedVoiceURI = e.target.value;
    localStorage.setItem("voiceURI", selectedVoiceURI);
    preferredVoice = pickPreferredVoice();
    speak("Voice updated");
});

function speakWithFallback(text) {
    if (!speechEnabled) return;

    let speechWorked = false;

    if ("speechSynthesis" in window) {
        try {
            const utterance = new SpeechSynthesisUtterance(text);
            if (preferredVoice) utterance.voice = preferredVoice;
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

async function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
        wakeLock = await navigator.wakeLock.request("screen");
    } catch (error) {
        console.warn("Wake lock request failed:", error);
    }
}

function releaseWakeLock() {
    if (wakeLock) {
        wakeLock.release();
        wakeLock = null;
    }
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !wakeLock && startBtn.disabled) {
        requestWakeLock();
    }
});

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

    const elapsed = totalWorkoutSeconds - remaining;
    const progressPct = totalWorkoutSeconds
        ? Math.max(0, Math.min(100, (elapsed / totalWorkoutSeconds) * 100))
        : 0;
    workoutProgressFillEl.style.width = `${progressPct}%`;
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
        if (name.trim().toLowerCase() === "rest") {
            li.classList.add("rest-item");
        }
        listEl.appendChild(li);
    });
    totalWorkoutSeconds = workout.reduce((sum, [, d]) => sum + d, 0);
    updateWorkoutRemaining();
}

function updateStepButtons() {
    const isRunning = startBtn.disabled;
    const isComplete = current >= workout.length;
    backStepBtn.disabled = !isRunning || isComplete || current <= 0;
    skipStepBtn.disabled = !isRunning || isComplete;
}

function skipExercise() {
    if (!startBtn.disabled || current >= workout.length) return;
    if (countdown) {
        clearInterval(countdown);
        countdown = null;
    }
    const activeItem = document.getElementById(`item-${current}`);
    if (activeItem) activeItem.classList.add("completed");
    current++;
    startExercise();
}

function goToPreviousExercise() {
    if (!startBtn.disabled || current <= 0) return;
    if (countdown) {
        clearInterval(countdown);
        countdown = null;
    }
    current--;
    const item = document.getElementById(`item-${current}`);
    if (item) item.classList.remove("completed");
    startExercise();
}

skipStepBtn.addEventListener("click", skipExercise);
backStepBtn.addEventListener("click", goToPreviousExercise);

function startExercise() {
    if (current >= workout.length) {
        exerciseEl.innerText = "Workout Complete!";
        timerEl.innerText = "00:00";
        timerEl.classList.remove("countdown-pulse");
        ringProgressEl.classList.remove("countdown-pulse");
        setRingProgress(0);
        pauseBtn.disabled = true;
        releaseWakeLock();
        updateStepButtons();
        speak("Workout complete");
        return;
    }

    const [name, time] = workout[current];
    exerciseEl.innerText = name;
    secondsLeft = time;
    exerciseEndTime = Date.now() + time * 1000;
    speak(name);

    document
        .querySelectorAll("li")
        .forEach((li) => li.classList.remove("active"));
    const activeItem = document.getElementById(`item-${current}`);
    if (activeItem) activeItem.classList.add("active");
    scrollToActive();
    updateNextUp();
    timerEl.classList.remove("countdown-pulse");
    ringProgressEl.classList.remove("countdown-pulse");
    setRingProgress(1);
    updateStepButtons();

    countdown = setInterval(() => {
        if (isPaused) return;

        const newSecondsLeft = Math.max(
            0,
            Math.ceil((exerciseEndTime - Date.now()) / 1000)
        );

        if (newSecondsLeft === secondsLeft) return;
        secondsLeft = newSecondsLeft;

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
        setRingProgress(secondsLeft / time);
        const isCountingDown = secondsLeft <= 3;
        timerEl.classList.toggle("countdown-pulse", isCountingDown);
        ringProgressEl.classList.toggle("countdown-pulse", isCountingDown);

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
    }, 200);
}

startBtn.addEventListener("click", () => {
    initAudioContext();
    requestWakeLock();
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

    if (isPaused) {
        pausedRemainingMs = exerciseEndTime - Date.now();
    } else {
        exerciseEndTime = Date.now() + pausedRemainingMs;
    }
});

resetBtn.addEventListener("click", () => {
    if (!confirm("Reset your progress on this workout?")) return;

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
    timerEl.classList.remove("countdown-pulse");
    ringProgressEl.classList.remove("countdown-pulse");
    setRingProgress(0);
    nextUpEl.innerText = "";
    releaseWakeLock();

    document.querySelectorAll("li").forEach((li) => {
        li.classList.remove("active", "completed");
    });

    updateWorkoutRemaining();
    updateStepButtons();
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
        releaseWakeLock();
        pauseBtn.innerText = "Pause";
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        resetBtn.disabled = true;
        exerciseEl.innerText = "Ready";
        timerEl.innerText = "00:00";
        timerEl.classList.remove("countdown-pulse");
        ringProgressEl.classList.remove("countdown-pulse");
        setRingProgress(0);
        renderList();
        updateNextUp();
        updateStepButtons();
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

function updateWorkoutActionButtons() {
    const deleteBtn = document.getElementById("deleteWorkout");
    const editBtn = document.getElementById("editWorkout");
    const duplicateBtn = document.getElementById("duplicateWorkout");
    const selectedValue = workoutSelector.value;
    const isCustom = Boolean(selectedValue && selectedValue.startsWith("custom:"));

    deleteBtn.disabled = !isCustom;
    editBtn.disabled = !isCustom;
    duplicateBtn.disabled = !isCustom;

    updateWorkoutPickerLabel();
    renderWorkoutPickerList();
}

function updateWorkoutPickerLabel() {
    const label = document.getElementById("workoutPickerLabel");
    const selectedOption = workoutSelector.options[workoutSelector.selectedIndex];
    label.textContent = selectedOption ? selectedOption.textContent : "Select a workout";
}

function renderWorkoutPickerList() {
    const list = document.getElementById("workoutPickerList");
    list.innerHTML = "";

    if (workoutSelector.options.length === 0) {
        list.innerHTML =
            '<p class="workout-picker-empty">No workouts available. Create one to get started.</p>';
        return;
    }

    Array.from(workoutSelector.options).forEach((option) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "workout-picker-row-item";
        row.setAttribute("role", "option");
        const isSelected = option.value === workoutSelector.value;
        row.setAttribute("aria-selected", String(isSelected));
        row.classList.toggle("selected", isSelected);
        row.textContent = option.textContent;
        row.addEventListener("click", () => {
            workoutSelector.value = option.value;
            workoutSelector.dispatchEvent(new Event("change"));
            closeWorkoutPicker();
        });
        list.appendChild(row);
    });
}

function openWorkoutPicker() {
    document.getElementById("workoutPickerSheet").hidden = false;
    document.getElementById("workoutPickerTrigger").setAttribute("aria-expanded", "true");
    renderWorkoutPickerList();
}

function closeWorkoutPicker() {
    document.getElementById("workoutPickerSheet").hidden = true;
    document.getElementById("workoutPickerTrigger").setAttribute("aria-expanded", "false");
}

document
    .getElementById("workoutPickerTrigger")
    .addEventListener("click", openWorkoutPicker);
document
    .getElementById("closeWorkoutPicker")
    .addEventListener("click", closeWorkoutPicker);
document
    .getElementById("workoutPickerBackdrop")
    .addEventListener("click", closeWorkoutPicker);

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

        updateWorkoutActionButtons();
    }
}

workoutSelector.addEventListener("change", (e) => {
    loadWorkout(e.target.value);
    updateWorkoutActionButtons();
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
        li.dataset.index = String(index);

        const isEditing = index === editingEntryIndex;
        li.draggable = !isEditing;
        li.classList.toggle("editing", isEditing);

        if (isEditing) {
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.className = "entry-edit-input entry-edit-name";
            nameInput.value = name;

            const durationInput = document.createElement("input");
            durationInput.type = "number";
            durationInput.min = "1";
            durationInput.className = "entry-edit-input entry-edit-duration";
            durationInput.value = duration;

            const saveBtn = document.createElement("button");
            saveBtn.type = "button";
            saveBtn.className = "save-entry-btn";
            saveBtn.textContent = "Save";

            const cancelBtn = document.createElement("button");
            cancelBtn.type = "button";
            cancelBtn.className = "cancel-entry-btn";
            cancelBtn.textContent = "Cancel";

            const commit = () => {
                const newName = nameInput.value.trim();
                const newDuration = parseInt(durationInput.value, 10);
                if (!newName || !(newDuration > 0)) {
                    alert("Please enter a valid exercise name and duration.");
                    return;
                }
                currentCustomExercises[index] = [newName, newDuration];
                editingEntryIndex = null;
                renderCustomExerciseList();
            };
            const cancel = () => {
                editingEntryIndex = null;
                renderCustomExerciseList();
            };

            saveBtn.addEventListener("click", commit);
            cancelBtn.addEventListener("click", cancel);
            [nameInput, durationInput].forEach((input) => {
                input.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") cancel();
                });
            });

            li.appendChild(nameInput);
            li.appendChild(durationInput);
            li.appendChild(saveBtn);
            li.appendChild(cancelBtn);
            ol.appendChild(li);
            return;
        }

        const handle = document.createElement("span");
        handle.className = "drag-handle";
        handle.textContent = "⠿";
        handle.setAttribute("aria-hidden", "true");
        handle.title = "Drag to reorder";

        const label = document.createElement("span");
        label.className = "exercise-entry-label";
        label.textContent = `${name} (${duration}s)`;

        const actions = document.createElement("span");
        actions.className = "exercise-entry-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "icon-action-btn edit-entry-btn";
        editBtn.setAttribute("aria-label", "Edit");
        editBtn.title = "Edit";
        editBtn.innerHTML =
            '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
        editBtn.addEventListener("click", () => {
            editingEntryIndex = index;
            renderCustomExerciseList();
        });

        const duplicateBtn = document.createElement("button");
        duplicateBtn.type = "button";
        duplicateBtn.className = "icon-action-btn duplicate-entry-btn";
        duplicateBtn.setAttribute("aria-label", "Duplicate");
        duplicateBtn.title = "Duplicate";
        duplicateBtn.innerHTML =
            '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        duplicateBtn.addEventListener("click", () => {
            currentCustomExercises.splice(index + 1, 0, [name, duration]);
            editingEntryIndex = null;
            renderCustomExerciseList();
        });

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "icon-action-btn remove-entry-btn";
        removeBtn.setAttribute("aria-label", "Remove");
        removeBtn.title = "Remove";
        removeBtn.innerHTML =
            '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
        removeBtn.addEventListener("click", () => {
            currentCustomExercises.splice(index, 1);
            editingEntryIndex = null;
            renderCustomExerciseList();
        });

        actions.appendChild(editBtn);
        actions.appendChild(duplicateBtn);
        actions.appendChild(removeBtn);

        li.appendChild(handle);
        li.appendChild(label);
        li.appendChild(actions);

        li.addEventListener("dragstart", (e) => {
            draggedExerciseIndex = index;
            li.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move";
        });

        li.addEventListener("dragend", () => {
            li.classList.remove("dragging");
            ol.querySelectorAll("li").forEach((item) =>
                item.classList.remove("drag-over")
            );
            draggedExerciseIndex = null;
        });

        li.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
        });

        li.addEventListener("dragenter", () => {
            if (draggedExerciseIndex !== null && draggedExerciseIndex !== index) {
                li.classList.add("drag-over");
            }
        });

        li.addEventListener("dragleave", () => {
            li.classList.remove("drag-over");
        });

        li.addEventListener("drop", (e) => {
            e.preventDefault();
            li.classList.remove("drag-over");
            if (draggedExerciseIndex === null || draggedExerciseIndex === index) {
                return;
            }

            const [moved] = currentCustomExercises.splice(draggedExerciseIndex, 1);
            currentCustomExercises.splice(index, 0, moved);
            editingEntryIndex = null;
            renderCustomExerciseList();
        });

        ol.appendChild(li);
    });
    customList.appendChild(ol);
}

function showPanel() {
    document.getElementById("createWorkoutPanel").style.display = "block";
    document.getElementById("controlsPanel").style.display = "none";
    document.getElementById("exerciseList").style.display = "none";
}

function openCreatePanel() {
    editingWorkoutName = null;
    editingEntryIndex = null;
    document.getElementById("createWorkoutPanelTitle").innerText =
        "Create Custom Workout";
    document.getElementById("workoutName").value = "";
    currentCustomExercises = [];
    renderCustomExerciseList();
    showPanel();
}

function openEditPanel() {
    const selectedValue = workoutSelector.value;
    if (!selectedValue || !selectedValue.startsWith("custom:")) return;

    const name = selectedValue.replace("custom:", "");
    const existing = customWorkouts[name];
    if (!existing) return;

    editingWorkoutName = name;
    editingEntryIndex = null;
    document.getElementById("createWorkoutPanelTitle").innerText =
        "Edit Custom Workout";
    document.getElementById("workoutName").value = name;
    currentCustomExercises = existing.map(([n, d]) => [n, d]);
    renderCustomExerciseList();
    showPanel();
}

function duplicateCustomWorkout() {
    const selectedValue = workoutSelector.value;
    if (!selectedValue || !selectedValue.startsWith("custom:")) return;

    const originalName = selectedValue.replace("custom:", "");
    const original = customWorkouts[originalName];
    if (!original) return;

    let copyName = `${originalName} copy`;
    let suffix = 2;
    while (customWorkouts[copyName]) {
        copyName = `${originalName} copy ${suffix}`;
        suffix++;
    }

    customWorkouts[copyName] = original.map(([n, d]) => [n, d]);
    saveCustomWorkouts();
    populateSelector();

    loadWorkout(`custom:${copyName}`);
    workoutSelector.value = `custom:${copyName}`;
    updateWorkoutActionButtons();
}

function hideCreateWorkoutPanel() {
    document.getElementById("createWorkoutPanel").style.display = "none";
    document.getElementById("controlsPanel").style.display = "flex";
    document.getElementById("exerciseList").style.display = "block";
    editingWorkoutName = null;
    editingEntryIndex = null;
    // Clear input fields
    document.getElementById("workoutName").value = "";
    document.getElementById("exerciseName").value = "";
    document.getElementById("exerciseDuration").value = "";
}

// Event listeners for custom workout creation
document
    .getElementById("createWorkout")
    .addEventListener("click", openCreatePanel);
document
    .getElementById("editWorkout")
    .addEventListener("click", openEditPanel);
document
    .getElementById("duplicateWorkout")
    .addEventListener("click", duplicateCustomWorkout);
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

    const isRenaming = workoutName !== editingWorkoutName;

    if (
        customWorkouts[workoutName] &&
        isRenaming &&
        !confirm(
            `A workout named "${workoutName}" already exists. Overwrite it?`
        )
    ) {
        return;
    }

    if (editingWorkoutName && isRenaming) {
        delete customWorkouts[editingWorkoutName];
    }

    customWorkouts[workoutName] = [...currentCustomExercises];
    saveCustomWorkouts();
    populateSelector();
    hideCreateWorkoutPanel();

    // Load the newly created workout
    loadWorkout(`custom:${workoutName}`);
    workoutSelector.value = `custom:${workoutName}`;
    updateWorkoutActionButtons();
});

document.getElementById("enableNevenaWorkouts").addEventListener("click", () => {
    localStorage.setItem("load-nevena-workouts", "true");
    alert("Nevena workouts enabled! Refreshing page...");
    location.reload();
});

document.getElementById("exportWorkouts").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(customWorkouts, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "exercise-timer-workouts.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
});

document.getElementById("importWorkouts").addEventListener("click", () => {
    document.getElementById("importWorkoutsInput").click();
});

document.getElementById("importHelpBtn").addEventListener("click", () => {
    const panel = document.getElementById("importHelpPanel");
    const btn = document.getElementById("importHelpBtn");
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    btn.setAttribute("aria-expanded", String(!isOpen));
});

document
    .getElementById("importWorkoutsInput")
    .addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            let imported;
            try {
                imported = JSON.parse(reader.result);
            } catch (error) {
                alert("That file isn't valid JSON.");
                e.target.value = "";
                return;
            }

            if (!imported || typeof imported !== "object" || Array.isArray(imported)) {
                alert("That file doesn't look like an exported workouts file.");
                e.target.value = "";
                return;
            }

            let importedCount = 0;
            Object.entries(imported).forEach(([name, exercises]) => {
                if (!Array.isArray(exercises)) return;
                const cleaned = exercises.filter(
                    (entry) =>
                        Array.isArray(entry) &&
                        typeof entry[0] === "string" &&
                        typeof entry[1] === "number" &&
                        entry[1] > 0
                ).map(([n, d]) => [n, d]);
                if (cleaned.length === 0) return;

                let targetName = name;
                let suffix = 2;
                while (customWorkouts[targetName]) {
                    targetName = `${name} (imported ${suffix})`;
                    suffix++;
                }

                customWorkouts[targetName] = cleaned;
                importedCount++;
            });

            if (importedCount === 0) {
                alert("No valid workouts found in that file.");
                e.target.value = "";
                return;
            }

            saveCustomWorkouts();
            populateSelector();
            updateWorkoutActionButtons();
            alert(`Imported ${importedCount} workout${importedCount === 1 ? "" : "s"}.`);
            e.target.value = "";
        };
        reader.readAsText(file);
    });

// The service worker (offline/installable support) was removed — it kept
// intercepting third-party requests (Kokoro's model files, jsdelivr's WASM
// assets) served via HTTP Range responses the Cache API can't store. This
// cleans up any copy a browser may have already registered from before.
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
    });
}

window.addEventListener(
    "scroll",
    () => {
        if (window.innerWidth >= 768) return;
        document
            .getElementById("controlsPanel")
            .classList.toggle("is-collapsed", window.scrollY > 24);
    },
    { passive: true }
);

window.addEventListener("DOMContentLoaded", () => {
    loadCustomWorkouts();
    populateSelector();
    if (workoutSelector.options.length > 0) {
        loadWorkout(workoutSelector.options[0].value);
        workoutSelector.value = workoutSelector.options[0].value;
    }
    updateWorkoutActionButtons();
});
