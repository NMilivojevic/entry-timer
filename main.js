const timerEl = document.getElementById("timer");
const exerciseEl = document.getElementById("exercise");
const listEl = document.getElementById("exerciseList");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const workoutRemainingEl = document.getElementById("workoutRemaining");
const workoutSelector = document.getElementById("workoutSelector");
const nextUpEl = document.getElementById("nextUp");

let current = 0;
let countdown;
let isPaused = false;
let secondsLeft = 0;
let workout = [];
let totalWorkoutSeconds = 0;

function speak(text) {
    try {
        if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            speechSynthesis.cancel();
            speechSynthesis.speak(utterance);
        }
    } catch (error) {
        console.warn("Speech synthesis failed:", error);
    }
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
        const block = window.innerWidth <= 480 ? "end" : "center";
        active.scrollIntoView({ behavior: "smooth", block });
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
                    setTimeout(() => speak(`Next up: ${nextName}`), 1600);
                }
            }
            if ([3, 2, 1].includes(secondsLeft)) speak(secondsLeft.toString());

            secondsLeft--;
        }
    }, 1000);
}

startBtn.addEventListener("click", () => {
    if (countdown) {
        clearInterval(countdown);
        countdown = null;
    }
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    startExercise();
});

pauseBtn.addEventListener("click", () => {
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? "Resume" : "Pause";
});

function loadWorkout(name) {
    if (workouts[name]) {
        workout = workouts[name];
        current = 0;
        isPaused = false;
        if (countdown) {
            clearInterval(countdown);
            countdown = null;
        }
        pauseBtn.innerText = "Pause";
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        exerciseEl.innerText = "Ready";
        timerEl.innerText = "00:00";
        renderList();
        updateNextUp();
    }
}

function populateSelector() {
    workoutSelector.innerHTML = "";
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

workoutSelector.addEventListener("change", (e) => {
    loadWorkout(e.target.value);
});

window.addEventListener("DOMContentLoaded", () => {
    populateSelector();
    if (workoutSelector.options.length > 0) {
        loadWorkout(workoutSelector.options[0].value);
    }
});
