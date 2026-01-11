const letterGradeDefault = "F, D, C-, C, C+, B-, B, B+, A-, A, A+", value="F, D, C-, C, C+, B-, B, B+, A-, A, A+";
const numberGradeMinDefault = 0;
const numberGradeMaxDefault = 100;
const numberGradeResolutionDefault = 1;

document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#letter-grade-reset").addEventListener("click", (event) => resetLetterGrade(event));
    document.querySelector("#letter-grade-save").addEventListener("click", (event) => saveLetterGrade(event));
    document.querySelector("#number-grade-reset").addEventListener("click", (event) => resetNumberGrade(event));
    document.querySelector("#number-grade-save").addEventListener("click", (event) => saveNumberGrade(event));
})

function confirmButton(button, newText){
    const currentText = button.textContent;
    button.textContent = newText;
    setTimeout(() => {
        button.textContent = currentText;
    }, 3000);
}

function resetLetterGrade(event){
    
}

function saveLetterGrade(event){
    confirmButton(event.currentTarget, "done");
}

function resetNumberGrade(event){

}

function saveNumberGrade(event){
    confirmButton(event.currentTarget, "done");

}