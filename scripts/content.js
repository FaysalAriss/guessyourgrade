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
    for (var rowIndex = 1, row; row = table.rows[rowIndex]; rowIndex++) {
        //console.log(row.cells[letterGradeIndex]);
        if(rows[rowIndex][letterGradeIndex]){ //only remove existing grades
            let letterGrade = row.cells[letterGradeIndex].textContent.trim();
            let numberGrade = row.cells[numberGradeIndex].textContent.trim();
            console.log(letterGrade);

            //clear cell contents
            row.cells[letterGradeIndex].textContent = "";
            row.cells[numberGradeIndex].textContent = "";

            const buttonWrapper = document.createElement("div");
            buttonWrapper.classList.add("button-wrapper")

            const buttonHigher = document.createElement("button");
            buttonHigher.textContent = "PASS";
            buttonHigher.classList.add("guess-button", "guess-button-higher");
            buttonHigher.addEventListener("click", (event) => {
                event.stopPropagation();
                console.log("Higher clicked, "+letterGrade);
                //do stuff
            })
            
            const buttonLower = document.createElement("button");
            buttonLower.textContent = "FAIL";
            buttonLower.classList.add("guess-button", "guess-button-lower");
            buttonLower.addEventListener("click", (event) => {
                event.stopPropagation();
                console.log("Lower clicked, "+numberGrade);
                //do stuff
            })
            
            buttonWrapper.append(buttonHigher, buttonLower);
            row.cells[letterGradeIndex].append(buttonWrapper);
        }

    }
    //start observing again
    addObserverIfDesiredNodeAvailable();
    
}

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

