//TODO: add way to customize letter grade ranges

//important: sorted from low to high
const letterGrades = ['F', 'D', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];

function getNumberGrade(table){
    //exit if not a table
    if(!table){
        return;
    }

    //save original table
    const originalTable = table;
    table = ""; //hide table immediately

    //turn table into 2D array
    var gradeTable = false;
    let rows = [];

    for (var rowIndex = 0, row; row = originalTable.rows[rowIndex]; rowIndex++) {
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

    console.log("Grade table: " + gradeTable);
    //console.log(rows);

    //exit and reshow if not a grade table
    if(!gradeTable){
        console.log("Displaying original table");
        table = originalTable;
        return;
    }

    //tag table as mutated so we don't touch it again
    console.log("Marking as touched");
    originalTable.dataset.mutated = "true";

    //Find letter and number grade column indices
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

    //if grade table but can't find the grades abort without reshowing the table to avoid exposing the grades
    if(letterGradeIndex == null || numberGradeIndex == null){
        throw new Error("Couldn't identify indices of needed columns");
    }

    console.log("Letter and number grades column indices: " + letterGradeIndex + ", " + numberGradeIndex);

    console.log("Clearing grades and adding buttons");
    //mask/remove grades
    //skip header
    observer.disconnect(); //stop observing changes while we change or else infinite loop
    addButtonsToColumn(originalTable, letterGradeIndex, rows);
    //addButtonsToColumn(table, numberGradeIndex, rows);
    //after grades removed reshow table
    table = originalTable;
    //start observing again
    addObserverIfDesiredNodeAvailable();
    
}

function addButtonsToColumn(table, index, rows){
    for (var rowIndex = 1, row; row = table.rows[rowIndex]; rowIndex++) {
        if(rows[rowIndex][index]){ //only remove existing grades
            let letterGrade = letterGrades.indexOf(row.cells[index].textContent.trim());

            const originalContent = row.cells[index].innerHTML;
            //clear cell contents
            row.cells[index].textContent = "";

            const buttonWrapper = document.createElement("div");
            buttonWrapper.classList.add("button-wrapper");

            const canvas = document.createElement('canvas');
            canvas.classList.add("canvas-confetti");
            canvas.id = "confetti-" + rowIndex;
            buttonWrapper.appendChild(canvas);

            let currentGuess = 0;
            let high = 10;
            let low = 0;

            const defaultWaitingTime = 1000;
            let waitingTime = defaultWaitingTime;

            const guessText = document.createElement("h3");
            guessText.classList.add("guess-text");
            guessText.textContent = letterGrades[currentGuess];


            const buttonHigher = createGuessButton("higher", "Higher");
            const buttonMiddle = createGuessButton("middle", "This");
            const buttonLower = createGuessButton("lower", "Lower");

            buttonHigher.addEventListener("click", (event) => {
                event.stopPropagation();
                console.log("Higher clicked");
                if(currentGuess < letterGrade){
                    //correct
                    if(currentGuess == 0){
                        guessText.textContent = "You passed!!";
                      
                        (async () => {
                            if (!canvas.confetti) {
                                canvas.confetti = await confetti.create(canvas, {
                                resize: false
                                });
                            }

                            canvas.confetti({
                                particleCount: 500,
                                spread: 50,
                                origin: {x: 0, y: 0.5 },
                                scalar: 0.6,
                            });
                        })();

                        waitingTime = 2*defaultWaitingTime;


                    }else{
                        guessText.textContent = "✓";
                    }
                    
                    guessText.classList.add("checkmark");

                    //update guess
                    low = currentGuess + 1;

                }else{
                    //wrong
                    //X for 0.2s
                    guessText.textContent = "✗";
                    guessText.classList.add("cross");
                    if(currentGuess > letterGrade){
                        high = currentGuess - 1;
                    }else{
                        high = currentGuess;
                    }
                } 

                currentGuess = stayInRange(Math.round((high+low)/2), 0, 10);
                setTimeout(() => {
                    guessText.classList.remove("checkmark");
                    guessText.classList.remove("cross");
                    guessText.textContent = letterGrades[currentGuess];
                }, waitingTime);
                waitingTime = defaultWaitingTime;
            });

            buttonMiddle.addEventListener("click", (event) => {
                event.stopPropagation();
                console.log("Middle clicked");
                //do stuff
                if(currentGuess == letterGrade){
                    //correct
                    //done
                    console.log("won");
                    //row.cells[index] = originalContent;
                    buttonWrapper.parentElement.innerHTML = originalContent;
                }else{
                    //wrong
                    //X for 0.2s
                }
            });

            buttonLower.addEventListener("click", (event) => {
                event.stopPropagation();
                console.log("Lower clicked");
                //do stuff
                if(currentGuess > letterGrade){
                    //correct
                    //checkmark for 0.2s

                    //update guess
                    high = currentGuess - 1;
                }else if(currentGuess < letterGrade){
                    //wrong
                    //X for 0.2s

                    //update guess
                    low = currentGuess + 1;
                }else{
                    low = currentGuess;
                }

                currentGuess = stayInRange(Math.round((high+low)/2), 0, 10);
                guessText.textContent = letterGrades[currentGuess];
            });
            
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

    return button;
}

function stayInRange(num, low, high){
    if(num < low){
        return low;
    }

    if(num > high){
        return high;
    }

    return num;
}

//check if there's a table after we've navigated the page
const observer = new MutationObserver((mutations) => {
    console.log("Page mutated, checking for table");
    const table = document.querySelector('[data-testid="table"]');
    if(table){
        console.log("Table found")
        if(table.dataset.mutated == "true"){
            console.log("Game started, skipping")
        }else{
            console.log("Fresh table, attempting to fetch grades")
            console.log(table);
            getNumberGrade(table);
        }
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