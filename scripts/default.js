const DEFAULT_LETTER_SETTINGS = {
    letterGrades: "F, D, C-, C, C+, B-, B, B+, A-, A, A+",
    letterHeaderSearch: "Grade",
    letterMatchWhole: true,
    letterPassing: "F"
}

const DEFAULT_NUMBER_SETTINGS = {
    numberGradeMin: 0,
    numberGradeMax: 100,
    numberGradeResolution: 1,
    numberHeaderSearch: "Percentage Grades",
    numberMatchWhole: false,
    numberPassing: 49
}

/**
 * Resets the letter grade settings back to default based on `DEFAULT_LETTER_SETTINGS`
 * 
 * @returns {promise} - data saving status
 */
async function resetLetterSettingsToDefault(){
    const settingsToSave = {... DEFAULT_LETTER_SETTINGS}; //make a copy to not change original
    settingsToSave.letterGradesArray = processLetterGrades(settingsToSave.letterGrades); //add processed data
    return chrome.storage.sync.set(settingsToSave);
}

/**
 * Creates an array based on `rawString` where each element in the array is the trimmed values seperated by commas in `rawString`
 * ex: "a, b, c,, d" -> ['a', 'b', 'c', 'd']
 * 
 * @param {string} rawString - the string to turn to the array
 * @returns {array} 
 */
function processLetterGrades(rawString){
    return rawString.split(",").map(item => item.trim()).filter(item => (item || item === 0));
}

/**
 * Resets the letter grade settings back to default based on `DEFAULT_NUMBER_SETTINGS`
 * 
 * @returns {promise} - data saving status
 */
async function resetNumberSettingsToDefault(){
    const settingsToSave = {... DEFAULT_NUMBER_SETTINGS}; //make a copy to not change original
    settingsToSave.numberGradesArray = processNumberGrades(settingsToSave.numberGradeMin, settingsToSave.numberGradeMax, settingsToSave.numberGradeResolution); //add processed data
    return chrome.storage.sync.set(settingsToSave);
}

/**
 * Turns the inputs into an array of numbers starting at `min` and ending at `max` (both inclusive), with increments of `resolution`
 * 
 * @param {number} min - the minimum possible grade
 * @param {number} max - the maximum possible grade
 * @param {number} resolution - the smallest increment between grades
 * @returns {array}
 */
function processNumberGrades(min, max, resolution){
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