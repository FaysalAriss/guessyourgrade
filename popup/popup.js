//associate actions with the reset and save buttons
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#letter-grade-reset").addEventListener("click", (event) => {handleButtonClick(event.currentTarget, resetLetterGrade)});
    document.querySelector("#letter-grade-save").addEventListener("click", (event) => {handleButtonClick(event.currentTarget, () => saveLetterGrade(fetchLetterGrade()))});
    document.querySelector("#number-grade-reset").addEventListener("click", (event) => {handleButtonClick(event.currentTarget, resetNumberGrade)});
    document.querySelector("#number-grade-save").addEventListener("click", (event) => {handleButtonClick(event.currentTarget, () => saveNumberGrade(fetchNumberGrade()))});
})

/**
 * Displays `newText` for `delay` on `button` then reverts to original
 * Mutates `button` temporarily
 * 
 * @param {html button} button - the button to modify
 * @param {string} newText - the text to temporarily display as the button's text
 * @param {number} delay - how long `newText` should be displayed for
 */
async function confirmButton(button, newText="Succesfull", delay=3000){
    const currentText = button.textContent;
    if(newText == currentText) { return; }
    button.textContent = newText;
    setTimeout(() => {
        button.textContent = currentText;
    }, delay);
}

/**
 * Handles button click to catch errors and display success/error status. Also ensures button cannot be reactivated before previous action fully processed.
 * 
 * @param {html button} button
 * @param {function} action - action to perform when `button` is pressed
 */
async function handleButtonClick(button, action){
    button.disabled = true;

    try{
        await action();
        confirmButton(button);
    }catch(error){
        //inform of the specifics of the error if they can fix it
        //otherwise generic error message
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

/**
 * Resets, saves and displays the default letter grade settings
 */
async function resetLetterGrade(){
    await resetLetterSettingsToDefault();
    restoreOptions();
    
    console.log("Reset and save complete");
}

/**
 * Gets the inputs from the user for the letter grade settings
 * 
 * @returns {object literal} the inputs
 */
function fetchLetterGrade(){
    return {
        letterGrades: document.getElementById("letter-grade-input").value,
        letterHeaderSearch: document.getElementById("letter-grade-header").value,
        letterMatchWhole: document.getElementById("letter-grade-checkbox").checked,
        letterPassing: document.getElementById("letter-passing-input").value
    }
}

/**
 * Resets, saves and displays the default number grade settings
 */
async function resetNumberGrade(){
    await resetNumberSettingsToDefault();
    restoreOptions();
    console.log("Reset and save complete");
}


/**
 * Gets the inputs from the user for the number grade settings
 * 
 * @returns {object literal} the inputs
 */
function fetchNumberGrade(){
    return {
        numberGradeMin: document.getElementById("number-grade-minimum").valueAsNumber,
        numberGradeMax: document.getElementById("number-grade-maximum").valueAsNumber,
        numberGradeResolution: document.getElementById("number-grade-resolution").valueAsNumber,
        numberHeaderSearch: document.getElementById("number-grade-header").value,
        numberMatchWhole: document.getElementById("number-grade-checkbox").checked,
        numberPassing: document.getElementById("number-passing-input").valueAsNumber
    }
}

/**
 * Restores the user's options to their appropriate element based on the saved settings
 */
const restoreOptions = () => {
  chrome.storage.sync.get(null, (items) => {
        document.getElementById('letter-grade-input').value = items.letterGrades;
        document.getElementById("letter-grade-header").value = items.letterHeaderSearch;
        document.getElementById("letter-grade-checkbox").checked = items.letterMatchWhole;
        document.getElementById("letter-passing-input").value = items.letterPassing;
        document.getElementById('number-grade-minimum').value = items.numberGradeMin;
        document.getElementById('number-grade-maximum').value = items.numberGradeMax;
        document.getElementById('number-grade-resolution').value = items.numberGradeResolution;
        document.getElementById("number-grade-header").value = items.numberHeaderSearch;
        document.getElementById("number-grade-checkbox").checked = items.numberMatchWhole;
        document.getElementById("number-passing-input").value = items.numberPassing;
    }
  );
};

//restore user's settings when popup opens
document.addEventListener('DOMContentLoaded', restoreOptions);