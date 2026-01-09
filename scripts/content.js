//TODO: add way to customize letter grade ranges
//TODO: clear grades as soon as table found in case rest doesn't work

//important: sorted from low to high
const letterGrades = ['F', 'D', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];

function getNumberGrade(table){
    //exit if not a table
    if(!table){
        return;
    }

    //turn table into 2D array
    var gradeTable = false;
    let rows = [];

    for (var rowIndex = 0, row; row = table.rows[rowIndex]; rowIndex++) {
        rows.push([]);
        for (var cellIndex = 0, cell; cell = row.cells[cellIndex]; cellIndex++) {
            //search for first span (header), div (body) and get the trimmed text content
            //for the header there is screen reader content in the second span that we don't want
            if(rowIndex == 0){
                rows[rowIndex].push(cell.querySelector('span')?.textContent.trim());
                //console.log(cell.querySelector('span')?.textContent.trim());
            }else{
                rows[rowIndex].push(cell.querySelector('div')?.textContent.trim());
                //console.log(cell.querySelector('div')?.textContent.trim());
            }
            //check for grade column
            if(cell.textContent.includes("Grade")){
                gradeTable = true;
            }
        }  
    }

    console.log("Grade table:" + gradeTable);
    //console.log(rows);

    //exit if not a grade table
    if(!gradeTable){
        return;
    }

    //CourseSort and filter column
    const headerIndex = 0;
    let letterGradeIndex = null;
    let numberGradeIndex = null;
    for(var i = 0; i < rows[headerIndex].length; i++){
        const text = rows[headerIndex][i];
        if(text === "Grade"){
            letterGradeIndex = i;
        }else if(text.includes("Percentage Grades")){
            numberGradeIndex = i;
        }
    }

    //add clause for no percentage grade
    if(letterGradeIndex == null || numberGradeIndex == null){
        throw new Error("Couldn't identify indices of needed columns");
    }

    console.log(letterGradeIndex + ", " + numberGradeIndex);

    console.log("Clearing grades and adding buttons");
    //mask/remove grades
    //skip header
    observer.disconnect(); //stop observing changes while we change or else infinite loop
    addButtonsToColumn(table, letterGradeIndex, rows);
    addButtonsToColumn(table, numberGradeIndex, rows);
    //start observing again
    addObserverIfDesiredNodeAvailable();
    
}

function addButtonsToColumn(table, index, rows){
    for (var rowIndex = 1, row; row = table.rows[rowIndex]; rowIndex++) {
        if(rows[rowIndex][index]){ //only remove existing grades
            //let letterGrade = letterGrades.indexOf(row.cells[index].textContent.trim());

            //clear cell contents
            row.cells[index].textContent = "";

            const buttonWrapper = document.createElement("div");
            buttonWrapper.classList.add("button-wrapper")

            const guessText = document.createElement("h3");
            guessText.classList.add("guess-text");
            guessText.textContent = "F";

            const buttonHigher = createGuessButton("higher", "Higher");
            const buttonMiddle = createGuessButton("middle", "This");
            const buttonLower = createGuessButton("lower", "Lower");
            
            buttonWrapper.append(guessText, buttonHigher, buttonMiddle, buttonLower);
            row.cells[index].append(buttonWrapper);
        }

    }
}

const guessButtonGeneralClass = "guess-button";

function createGuessButton(className, text){
    const button = document.createElement("button");
    button.textContent = text;
    button.classList.add(guessButtonGeneralClass, guessButtonGeneralClass + "-" + className);
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        console.log(text + "clicked");
        //do stuff
    });

    return button;
}

// function nextGuess(){

// }

//check if there's a table after we've navigated the page
const observer = new MutationObserver((mutations) => {
    console.log("Mutated, checking for table");
    const guessButton = document.querySelector(".button-wrapper");
    if(guessButton){
        console.log("Table found, buttons already added, skipping")
        return; //don't redo when guess buttons already injected
    }
    const table = document.querySelector('[data-testid="table"]');
    if(table){
        console.log("Table found, attempting to fetch grades")
        console.log(table);
        getNumberGrade(table);
    }
})

//wait for main content as it should be available on all the pages so we won't be waiting forever, which is why we don't check for table
function addObserverIfDesiredNodeAvailable() {
    console.log("Searching for main content");
    var composeBox = document.querySelector('#mainContent');
    if(!composeBox) {
        //The node we need does not exist yet.
        //Wait 500ms and try again
        window.setTimeout(addObserverIfDesiredNodeAvailable,500);
        return;
    }
    console.log("Found main content:")
    console.log(composeBox);
    var config = {childList: true, subtree: true};
    observer.observe(composeBox, config);
}
addObserverIfDesiredNodeAvailable();

