import { DEFAULT_LETTER_SETTINGS, DEFAULT_NUMBER_SETTINGS, 
        processLetterGrades, resetLetterSettingsToDefault, 
        processNumberGrades, resetNumberSettingsToDefault } from './scripts/default.js';

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
    await resetLetterSettingsToDefault();
    restoreOptions();
    
    console.log("Reset and save complete");
}

async function saveLetterGrade(){
    const letterGrades = document.getElementById("letter-grade-input").value;
    const letterHeaderSearch = document.getElementById("letter-grade-header").value;
    const letterMatchWhole = document.getElementById("letter-grade-checkbox").checked;
    
    if(!letterGrades || !letterHeaderSearch){
        throw new IllegalArgumentError("Error: empty field");
    }

    const letterGradesArray = processLetterGrades(letterGrades);

    await chrome.storage.sync.set({
        letterGrades: letterGrades, 
        letterGradesArray: letterGradesArray,
        letterHeaderSearch: letterHeaderSearch,
        letterMatchWhole: letterMatchWhole
    });
}

async function resetNumberGrade(){
    await resetNumberSettingsToDefault();
    restoreOptions();
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

    let numberGrades = processNumberGrades(numberGradeMin, numberGradeMax, numberGradeResolution);

    //save without array if it's too large, process in content script instead
    try{
        await chrome.storage.sync.set({
            numberGradeMin: numberGradeMin, 
            numberGradeMax: numberGradeMax, 
            numberGradeResolution: numberGradeResolution, 
            numberGradesArray: numberGrades, 
            numberHeaderSearch: numberHeaderSearch, 
            numberMatchWhole: numberMatchWhole
        });

        if(chrome.runtime.lastError){throw new Error(chrome.runtime.lastError.message);}

    }catch(error){
        if(error.message.includes("quota exceeded")){
            console.warn("Storage quota exceeded. Falling back to raw settings only.")
            await chrome.storage.sync.set({
                numberGradeMin: numberGradeMin, 
                numberGradeMax: numberGradeMax, 
                numberGradeResolution: numberGradeResolution, 
                numberGradesArray: [], 
                numberHeaderSearch: numberHeaderSearch, 
                numberMatchWhole: numberMatchWhole
            });
        }else{
            throw new Error(error.message);
        }
    }
}

// Restores select box and checkbox state using the preferences
const restoreOptions = () => {
  chrome.storage.sync.get({
        letterGrades: DEFAULT_LETTER_SETTINGS.letterGrade,
        letterHeaderSearch: DEFAULT_LETTER_SETTINGS.letterHeaderSearch,
        letterMatchWhole: DEFAULT_LETTER_SETTINGS.letterMatchWhole,
        numberGradeMin: DEFAULT_NUMBER_SETTINGS.numberGradeMin, 
        numberGradeMax: DEFAULT_NUMBER_SETTINGS.numberGradeMax, 
        numberGradeResolution: DEFAULT_NUMBER_SETTINGS.numberGradeResolution,
        numberHeaderSearch: DEFAULT_NUMBER_SETTINGS.numberHeaderSearch,
        numberMatchWhole: DEFAULT_NUMBER_SETTINGS.numberMatchWhole
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