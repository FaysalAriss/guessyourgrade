const letterGradeDefault = "F, D, C-, C, C+, B-, B, B+, A-, A, A+";
const letterHeaderSearchDefault = "Percentage Grades";
const letterMatchWholeDefault = true;
const numberGradeMinDefault = 0;
const numberGradeMaxDefault = 100;
const numberGradeResolutionDefault = 1;
const numberHeaderSearchDefault = "Grade";
const numberMatchWholeDefault = false;

//TODO: transfer array creating functionality to content script, maybe

class IllegalArgumentError extends Error{
    constructor(message){
        super(message);
        this.name = "IllegalArgumentError";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#letter-grade-reset").addEventListener("click", (event) => {handleButtonClick(event.currentTarget, resetLetterGrade)});
    document.querySelector("#letter-grade-save").addEventListener("click", (event) => {handleButtonClick(event.currentTarget, saveLetterGrade)});
    document.querySelector("#number-grade-reset").addEventListener("click", (event) => {handleButtonClick(event.currentTarget, resetNumberGrade)});
    document.querySelector("#number-grade-save").addEventListener("click", (event) => {handleButtonClick(event.currentTarget, saveNumberGrade)});
})

function confirmButton(button, newText="Succesfull", delay=3000){
    const currentText = button.textContent;
    button.textContent = newText;
    setTimeout(() => {
        button.textContent = currentText;
    }, delay);
}

async function handleButtonClick(button, action){
    button.disabled = true;

    try{
        await action();
        confirmButton(button, "Succesfull");
    }catch(error){
        if(error instanceof IllegalArgumentError){
            confirmButton(button, error.message);
        }else{
            console.error("Action failed: ", error);
            confirmButton(button, "System Error");
        }
    }finally{
        button.disabled = false;
    }
}

async function resetLetterGrade(){
    document.getElementById("letter-grade-input").value = letterGradeDefault;
    document.getElementById("letter-grade-header").value = letterHeaderSearchDefault;
    document.getElementById("letter-grade-checkbox").checked = letterMatchWholeDefault;

    await saveLetterGrade();
    console.log("Reset and save complete");
}

async function saveLetterGrade(){
    const letterGrades = document.getElementById("letter-grade-input").value;
    const letterGradesArray = letterGrades.split(",").map(item => item.trim()).filter(item => item || item === 0);
    const letterHeaderSearch = document.getElementById("letter-grade-header").value;
    const letterMatchWhole = document.getElementById("letter-grade-checkbox").checked;
    
    if(!letterGrades || !letterHeaderSearch){
        throw new IllegalArgumentError("Error: empty field");
    }

    await chrome.storage.sync.set({
        letterGrades: letterGrades, 
        letterGradesArray: letterGradesArray,
        letterHeaderSearch: letterHeaderSearch,
        letterMatchWhole: letterMatchWhole
    });
}

async function resetNumberGrade(){
    document.getElementById("number-grade-minimum").value = numberGradeMinDefault;
    document.getElementById("number-grade-maximum").value = numberGradeMaxDefault;
    document.getElementById("number-grade-resolution").value = numberGradeResolutionDefault;
    document.getElementById("number-grade-header").value = numberHeaderSearchDefault;
    document.getElementById("number-grade-checkbox").checked = numberMatchWholeDefault;

    await saveNumberGrade();
    console.log("Reset and save complete");
}

async function saveNumberGrade(){
    const numberGradeMin = Number(document.getElementById("number-grade-minimum").value);
    const numberGradeMax = Number(document.getElementById("number-grade-maximum").value);
    const numberGradeResolution = Number(document.getElementById("number-grade-resolution").value);
    const numberHeaderSearch = document.getElementById("number-grade-header").value;
    const numberMatchWhole = document.getElementById("number-grade-checkbox").checked;

    if(numberGradeResolution <= 0){
        throw new IllegalArgumentError("Resolution must be positive");
    }

    if((!numberGradeMin && numberGradeMin !== 0) || (!numberGradeMax && numberGradeMax !== 0) || !numberGradeResolution || !numberHeaderSearch){
        throw new IllegalArgumentError("Error: empty field");
    }

    let numberGrades = [];
    for(let i = numberGradeMin; i <= numberGradeMax; i += numberGradeResolution){
        numberGrades.push(i.toString());
    }

    await chrome.storage.sync.set({
        numberGradeMin: numberGradeMin, 
        numberGradeMax: numberGradeMax, 
        numberGradeResolution: numberGradeResolution, 
        numberGrades: numberGrades, 
        numberHeaderSearch: numberHeaderSearch, 
        numberMatchWhole: numberMatchWhole
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