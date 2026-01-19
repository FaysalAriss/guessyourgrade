const letterGradeDefault = "F, D, C-, C, C+, B-, B, B+, A-, A, A+";
const letterHeaderSearchDefault = "Percentage Grades";
const letterMatchWholeDefault = true;
const numberGradeMinDefault = 0;
const numberGradeMaxDefault = 100;
const numberGradeResolutionDefault = 1;
const numberHeaderSearchDefault = "Grade";
const numberMatchWholeDefault = false;

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
    document.getElementById("letter-grade-header").value = letterHeaderSearchDefault;
    document.getElementById("letter-grade-checkbox").checked = letterMatchWholeDefault;
    saveLetterGrade(document.getElementById("letter-grade-reset"));
}

function saveLetterGrade(button){
    const letterGrades = document.getElementById("letter-grade-input").value;
    const letterGradesArray = letterGrades.split(",").map(item => item.trim()).filter(item => item || item === 0);
    const letterHeaderSearch = document.getElementById("letter-grade-header").value;
    const letterMatchWhole = document.getElementById("letter-grade-checkbox").checked;
    

    console.log(letterGrades);
    console.log(letterGradesArray);

    chrome.storage.sync.set(
        {letterGrades: letterGrades, letterGradesArray: letterGradesArray, letterHeaderSearch: letterHeaderSearch, letterMatchWhole: letterMatchWhole}, 
        () => {
        confirmButton(button, "Succesfull");
    });
}

function resetNumberGrade(){
    document.getElementById("number-grade-minimum").value = numberGradeMinDefault;
    document.getElementById("number-grade-maximum").value = numberGradeMaxDefault;
    document.getElementById("number-grade-resolution").value = numberGradeResolutionDefault;
    document.getElementById("number-grade-header").value = numberHeaderSearchDefault;
    document.getElementById("number-grade-checkbox").checked = numberMatchWholeDefault;
    saveNumberGrade(document.getElementById("number-grade-reset"));
}

function saveNumberGrade(button){
    const numberGradeMin = Number(document.getElementById("number-grade-minimum").value);
    const numberGradeMax = Number(document.getElementById("number-grade-maximum").value);
    const numberGradeResolution = Number(document.getElementById("number-grade-resolution").value);
    const numberHeaderSearch = document.getElementById("number-grade-header").value;
    const numberMatchWhole = document.getElementById("number-grade-checkbox").checked;

    if(numberGradeResolution <= 0){
        confirmButton(button, "Invalid");
        return;
    }

    let numberGrades = [];
    for(let i = numberGradeMin; i <= numberGradeMax; i += numberGradeResolution){
        numberGrades.push(i.toString());
    }

    chrome.storage.sync.set({
        numberGradeMin: numberGradeMin, 
        numberGradeMax: numberGradeMax, 
        numberGradeResolution: numberGradeResolution, 
        numberGrades: numberGrades, 
        numberHeaderSearch: numberHeaderSearch, 
        numberMatchWhole: numberMatchWhole
        }, () => {
            confirmButton(button, "Succesfull");   
    });
}

// Restores select box and checkbox state using the preferences
const restoreOptions = () => {
  chrome.storage.sync.get({
        letterGrades: letterGradeDefault,
        letterHeaderSearch: letterHeaderSearchDefault,
        letterMatchWhole: letterMatchWholeDefault,
        numberGradeMin: numberGradeMinDefault, 
        numberGradeMax: numberGradeMaxDefault, 
        numberGradeResolution: numberGradeResolutionDefault,
        numberHeaderSearch: numberHeaderSearchDefault,
        numberMatchWhole: numberMatchWholeDefault
    }, (items) => {
        document.getElementById('letter-grade-input').value = items.letterGrades;
        document.getElementById("letter-grade-header").value = items.letterHeaderSearch;
        document.getElementById("letter-grade-checkbox").checked = items.letterMatchWhole;
        document.getElementById('number-grade-minimum').value = items.numberGradeMin;
        document.getElementById('number-grade-maximum').value = items.numberGradeMax;
        document.getElementById('number-grade-resolution').value = items.numberGradeResolution;
        document.getElementById("number-grade-header").value = items.numberHeaderSearch;
        document.getElementById("number-grade-checkbox").checked = items.numberMatchWhole;
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);