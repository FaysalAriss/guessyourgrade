export const DEFAULT_LETTER_SETTINGS = {
    letterGrade : "F, D, C-, C, C+, B-, B, B+, A-, A, A+",
    letterHeaderSearch : "Grade",
    letterMatchWhole : true,
}

export const DEFAULT_NUMBER_SETTINGS = {
    numberGradeMin : 0,
    numberGradeMax : 100,
    numberGradeResolution : 1,
    numberHeaderSearch : "Percentage Grades",
    numberMatchWhole : false
}

export async function resetLetterSettingsToDefault(){
    const settingsToSave = {... DEFAULT_LETTER_SETTINGS}; //make a copy for immutability
    settingsToSave.letterGradesArray = processLetterGrades(settingsToSave.letterGrade); //add processed data
    return chrome.storage.sync.set(settingsToSave);
}

export function processLetterGrades(rawString){
    return rawString.split(",").map(item => item.trim()).filter(item => (item || item === 0));
}

export async function resetNumberSettingsToDefault(){
    const settingsToSave = {... DEFAULT_NUMBER_SETTINGS}; //make a copy for immutability
    settingsToSave.numberGradesArray = processNumberGrades(settingsToSave.numberGradeMin, settingsToSave.numberGradeMax, settingsToSave.numberGradeResolution); //add processed data
    return chrome.storage.sync.set(settingsToSave);
}

export function processNumberGrades(min, max, resolution){
    let numberGrades = [];
    for(let i = min; i <= max; i += resolution){
        //round num to resolution
        //to precision gets rid of the imprecision of floating point arithmetic
        //parsefloat to remove trailing 0s
        const num = Number(parseFloat((Math.round(i/resolution) * resolution).toPrecision(12)));
        numberGrades.push(num);
    }

    return numberGrades;
}