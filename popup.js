const letterGradeDefault = "F, D, C-, C, C+, B-, B, B+, A-, A, A+", value="F, D, C-, C, C+, B-, B, B+, A-, A, A+";
const numberGradeMinDefault = 0;
const numberGradeMaxDefault = 100;
const numberGradeResolutionDefault = 1;

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#letter-grade-reset").addEventListener("click", () => resetLetterGrade());
    document.querySelector("#letter-grade-save").addEventListener("click", event => saveLetterGrade(event.currentTarget));
    document.querySelector("#number-grade-reset").addEventListener("click", () => resetNumberGrade());
    document.querySelector("#number-grade-save").addEventListener("click", event => saveNumberGrade(event.currentTarget));
})

function confirmButton(button, newText, delay=3000){
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
        {letterG: letterGradesArray}, 
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
        {numberG: numberGrades},
        () => {
            confirmButton(button, "Succesfull");   
    });
}