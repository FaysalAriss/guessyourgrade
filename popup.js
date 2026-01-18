const letterGradeDefault = "F, D, C-, C, C+, B-, B, B+, A-, A, A+";
const numberGradeMinDefault = 0;
const numberGradeMaxDefault = 100;
const numberGradeResolutionDefault = 1;

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#letter-grade-reset").addEventListener("click", () => resetLetterGrade());
    document.querySelector("#letter-grade-save").addEventListener("click", event => saveLetterGrade(event.currentTarget));
    document.querySelector("#number-grade-reset").addEventListener("click", () => resetNumberGrade());
    document.querySelector("#number-grade-save").addEventListener("click", event => saveNumberGrade(event.currentTarget));
})

function confirmButton(button, newText="Succesfull", delay=3000){
    const currentText = button.textContent;
    button.textContent = newText;
    setTimeout(() => {
        button.textContent = currentText;
    }, delay);
}

function resetLetterGrade(){
    document.getElementById("letter-grade-input").value = letterGradeDefault;
    saveLetterGrade(document.getElementById("letter-grade-reset"));
}

function saveLetterGrade(button){
    const letterGrades = document.getElementById("letter-grade-input").value;
    const letterGradesArray = letterGrades.split(",").map(item => item.trim()).filter(item => item || item === 0);

    console.log(letterGrades);
    console.log(letterGradesArray);

    chrome.storage.sync.set(
        {letterGrades: letterGrades, letterGradesArray: letterGradesArray}, 
        () => {
        confirmButton(button, "Succesfull");
    });
}

function resetNumberGrade(){
    document.getElementById("number-grade-minimum").value = numberGradeMinDefault;
    document.getElementById("number-grade-maximum").value = numberGradeMaxDefault;
    document.getElementById("number-grade-resolution").value = numberGradeResolutionDefault;
    saveNumberGrade(document.getElementById("number-grade-reset"));
}

function saveNumberGrade(button){
    const min = Number(document.getElementById("number-grade-minimum").value);
    const max = Number(document.getElementById("number-grade-maximum").value);
    const resolution = Number(document.getElementById("number-grade-resolution").value);

    if(resolution <= 0){
        confirmButton(button, "Invalid");
        return;
    }

    let numberGrades = [];
    for(let i = min; i <= max; i += resolution){
        numberGrades.push(i.toString());
    }

    chrome.storage.sync.set(
        {min: min, max: max, resolution: resolution, numberGrades: numberGrades},
        () => {
            confirmButton(button, "Succesfull");   
    });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.sync.get(
    { letterGrades: letterGradeDefault, min: numberGradeMinDefault, max: numberGradeMaxDefault, resolution: numberGradeResolutionDefault },
    (items) => {
      document.getElementById('letter-grade-input').value = items.letterGrades;
      document.getElementById('number-grade-minimium').value = items.min;
      document.getElementById('number-grade-maximum').value = items.max;
      document.getElementById('number-grade-resolution').value = items.resolution;
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);