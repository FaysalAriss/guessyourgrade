import {processLetterGrades, resetLetterSettingsToDefault, 
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

async function confirmButton(button, newText="Succesfull", delay=3000){
    const currentText = button.textContent;
    if(newText == currentText) { return; }
    button.textContent = newText;
    setTimeout(() => {
        button.textContent = currentText;
    }, delay);
}

async function handleButtonClick(button, action){
    button.disabled = true;

    try{
        await action();
        confirmButton(button);
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
    const toSave = {
        letterGrades: document.getElementById("letter-grade-input").value,
        letterHeaderSearch: document.getElementById("letter-grade-header").value,
        letterMatchWhole: document.getElementById("letter-grade-checkbox").checked,
        letterPassing: document.getElementById("letter-passing-input").value
    }

    
    for(const field of Object.values(toSave)){
        if(field == null || field === "" || Number.isNaN(field)){
            throw new IllegalArgumentError("Error: empty field");
        }
    }

    toSave.letterGradesArray = processLetterGrades(toSave.letterGrades);
    if(toSave.letterGradesArray.indexOf(toSave.letterPassing) === -1){
        throw new IllegalArgumentError("Error: invalid passing grade");
    }

    await chrome.storage.sync.set(toSave);
}

async function resetNumberGrade(){
    await resetNumberSettingsToDefault();
    restoreOptions();
    console.log("Reset and save complete");
}

async function saveNumberGrade(){
    const toSave = {
        numberGradeMin: document.getElementById("number-grade-minimum").valueAsNumber,
        numberGradeMax: document.getElementById("number-grade-maximum").valueAsNumber,
        numberGradeResolution: document.getElementById("number-grade-resolution").valueAsNumber,
        numberHeaderSearch: document.getElementById("number-grade-header").value,
        numberMatchWhole: document.getElementById("number-grade-checkbox").checked,
        numberPassing: document.getElementById("number-passing-input").value
    }

    for(const field of Object.values(toSave)){
        if(field == null || field === "" || Number.isNaN(field)){
            console.log(field);
            console.log(field == null);
            console.log(field === "");
            console.log(Number.isNaN(field));
            throw new IllegalArgumentError("Error: empty field");
        }
    }

    if(toSave.numberGradeResolution <= 0){
        throw new IllegalArgumentError("Resolution must be positive");
    }

    if(toSave.numberGradeMin >= toSave.numberGradeMax){
        throw new IllegalArgumentError("Min must < max");
    }

    toSave.numberGradesArray = processNumberGrades(toSave.numberGradeMin, toSave.numberGradeMax, toSave.numberGradeResolution);
    if(toSave.numberGradesArray.indexOf(toSave.numberPassing) === -1){
        throw new IllegalArgumentError("Error: invalid passing grade");
    }

    //save without array if it's too large, process in content script instead
    try{
        await chrome.storage.sync.set(toSave);

        if(chrome.runtime.lastError){throw new Error(chrome.runtime.lastError.message);}

    }catch(error){
        if(error.message.includes("quota exceeded")){
            console.warn("Storage quota exceeded. Falling back to raw settings only.")

            toSave.numberGradesArray = [];

            await chrome.storage.sync.set(toSave);
        }else{
            throw new Error(error.message);
        }
    }
}

// Restores select box and checkbox state using the preferences
const restoreOptions = () => {
  chrome.storage.sync.get(null, (items) => {
        document.getElementById('letter-grade-input').value = items.letterGrades;
        document.getElementById("letter-grade-header").value = items.letterHeaderSearch;
        document.getElementById("letter-grade-checkbox").checked = items.letterMatchWhole;
        document.getElementById("letter-passing-input").checked = items.letterPassing;
        document.getElementById('number-grade-minimum').value = items.numberGradeMin;
        document.getElementById('number-grade-maximum').value = items.numberGradeMax;
        document.getElementById('number-grade-resolution').value = items.numberGradeResolution;
        document.getElementById("number-grade-header").value = items.numberHeaderSearch;
        document.getElementById("number-grade-checkbox").checked = items.numberMatchWhole;
        document.getElementById("number-passing-input").checked = items.numberPassing;
    }
  );
};

document.addEventListener('DOMContentLoaded', restoreOptions);