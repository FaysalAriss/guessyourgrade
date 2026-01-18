//TODO: custom table header search
//add tooltips to settings

class Game{

    //important: sorted from low to high
    static letterGrades = ['F', 'D', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
    static numberGrades = [];
    static guessButtonGeneralClass = "guess-button";
    static headerIndex = 0;

    tableHeader;
    
    constructor(table){
        this.table = table;
        this.rows = [];
        this.gradeTable = false;
        this.letterGradeIndex = null;
        this.numberGradeIndex = null;

        for(var i = 0; i <= 100; i++){
            Game.numberGrades.push(i.toString()); //number/letter are strings in the table cell
        }
    }

    getTable(){
        return this.table;
    }

    /**
     * Non mutator
     * 
     * @returns if the table is a table containing grades (viable to play the game)
     */
    determineTableType(){

        this.tableHeader = this.table.querySelector("thead");
        for(const row of this.tableHeader.rows){
            for(const cell of row.cells){
                if(cell.textContent.includes("Grade") || cell.textContent.includes("Percentage")){
                    this.gradeTable = true;
                }
            }
        }

        console.log("Grade table: " + this.gradeTable);

        return this.gradeTable;
    }

    static markTable(table){
        //tag table as mutated so we don't touch it again
        console.log("Marking as touched");
        table.dataset.mutated = "true";
    }

 getUserVisibleText(el) {
  return [...el.childNodes]
    .filter(node => {
      if (node.nodeType === Node.TEXT_NODE) return true;
      if (node.nodeType !== Node.ELEMENT_NODE) return false;

      return !node.hasAttribute("data-testid") ||
             node.getAttribute("data-testid") !== "screenReader";
    })
    .map(node => node.textContent)
    .join("")
    .trim();
}



        
    determineIndices(){
        const headerGrid = [];
        const rows = this.tableHeader.rows;

        for(let rowIndex = 0; rowIndex<rows.length; rowIndex++){
            const row = rows[rowIndex];
            headerGrid[rowIndex] ||= [];
            let cellIndex = 0;

            for(const cell of row.cells){
                const rowSpan = cell.rowSpan || 1;
                const colSpan = cell.colSpan || 1;

                //skip already occupied cell
                while(headerGrid[rowIndex][cellIndex]){
                    cellIndex++;
                }

                const label = cell.cloneNode(true);
                label.querySelector('[data-testid="screenReader"]')?.remove();
                const text = label.innerText.trim();
                console.log(text);
                if(text === "Grade"){
                    if(this.letterGradeIndex || this.letterGradeIndex === 0){
                        throw Error("already found column index for letter grade, but found again");
                    }
                    this.letterGradeIndex = cellIndex;
                }else if(text?.includes("Percentage Grades")){
                    if(this.numberGradeIndex || this.numberGradeIndex === 0){
                        throw Error("already found column index for number grade, but found again");
                    }
                    this.numberGradeIndex = cellIndex;
                }

                //occupy the necessary amount of rows
                for(let r = rowIndex; r<rowIndex+rowSpan; r++){
                    headerGrid[r] ||= [];
                    for(let c = cellIndex; c<cellIndex+colSpan; c++){
                        headerGrid[r][c] = true;
                    }
                }

                cellIndex += colSpan;
            }
        }

        //if grade table but can't find the grades abort without reshowing the table to avoid exposing the grades
        if(this.letterGradeIndex == null && this.numberGradeIndex == null){
            throw new Error("Couldn't identify indices of needed columns");
        }

        console.log("Letter and number grades column indices: " + this.letterGradeIndex + ", " + this.numberGradeIndex);
    }

        
    async addButtons(){
        console.log("Clearing grades and adding buttons");

        const result = await chrome.storage.sync.get(["letterGradesArray", "numberGrades"]);

        if(result.letterGradesArray){
            Game.letterGrades = result.letterGradesArray;
        }
        if(result.numberGrades){
            Game.numberGrades = result.numberGrades;
        }

        if(!Game.letterGrades || !Game.numberGrades ||
        Game.letterGrades.length === 0 || Game.numberGrades.length === 0){
            console.log(Game.letterGrades);
            console.log(Game.numberGrades);
            throw Error("Settings are invalid or couldn't load them (letter/number grade ranges)"); 
        }

        if(this.letterGradeIndex){
            this.addButtonsToColumn(this.letterGradeIndex, Game.letterGrades, "letter", 0);
        }
        if(this.numberGradeIndex){
            this.addButtonsToColumn(this.numberGradeIndex, Game.numberGrades, "number", 49);
        }
        
    }

    addButtonsToColumn(index, gradeArray, idPrefix, startingGuess){
        //mask/remove grades
        const tableBody = this.table.querySelector("tbody");

        let rowIndex = 0;
        let cell = tableBody.rows[rowIndex].cells[index];
        while(cell){
            let content = cell.textContent.trim();
            let grade = gradeArray.indexOf(content);
            console.log(content + ", " + grade);

            const originalContent = cell.innerHTML;

            if(content){
                if(grade == -1){
                    //non empty cell and not in the grade list
                    cell.textContent = "Error, grade not in possible grades";
                }else{
                    //clear cell contents
                    cell.textContent = "";
                    const subGame = new SubGame(cell, grade, originalContent, idPrefix+rowIndex, gradeArray, startingGuess);
                    subGame.startGame();
                }
            }

            rowIndex++;
            cell = tableBody.rows[rowIndex];
            if(cell){
                cell = cell.cells[index];
            }
        }
    }    
}

class SubGame{
    static defaultWaitingTime = 1000;
    lowest;
    highest;

    guessText;
    gameWrapper;
    canvas;

    constructor (cell, grade, originalContent, id, gradeArray, startingGuess){
        this.cell = cell;
        this.grade = grade;
        this.currentGuess = startingGuess;
        this.low = 0;
        this.high = gradeArray.length;
        this.firstGuess = true;
        this.waitingTime = SubGame.defaultWaitingTime;
        this.originalContent = originalContent;
        this.id = id;
        this.gradeArray = gradeArray;
        this.lowest = 0;
        this.highest = gradeArray.length;
    }

    static createGuessButton(className, text){
        const button = document.createElement("button");
        button.textContent = text;
        button.classList.add(Game.guessButtonGeneralClass, Game.guessButtonGeneralClass + "-" + className);

        return button;
    }

    static stayInRange(num, low, high){
        if(num < low){
            return low;
        }

        if(num > high){
            return high;
        }

        return num;
    }

    /**
     * Advance the high/low of the game
     * 
     * requires: currentguess != grade
     */
    advanceGame(){
        if(this.currentGuess < this.grade){
            this.low = this.currentGuess + 1;
        }else{
            this.high = this.currentGuess - 1;
        }
    }

    right(){
        this.guessText.textContent = "✓";
        this.guessText.classList.add("checkmark");
    }

    wrong(){
        this.guessText.textContent = "✗";
        this.guessText.classList.add("cross");
    }

    pass(){
        this.firstGuess = false;
        this.guessText.textContent = "You passed!!";
        this.guessText.classList.add("checkmark");
    
        //confetti
        SubGame.confetti(this.canvas);

        this.waitingTime = 2*SubGame.defaultWaitingTime;
    }

    updateGuess(){
        //binary search for your grade
        this.currentGuess = SubGame.stayInRange(Math.round((this.high+this.low)/2), this.lowest, this.highest);
    }

    updateText(){
        setTimeout(() => {
            this.resetTags();
            this.guessText.textContent = this.gradeArray[this.currentGuess];
        }, this.waitingTime);
        this.waitingTime = SubGame.defaultWaitingTime;
    }

    resetTags(){
        this.guessText.classList.remove("checkmark");
        this.guessText.classList.remove("cross");
    }

    static async confetti(canvas){
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
    }
    
    startGame(){
        this.gameWrapper = document.createElement("div");
        this.gameWrapper.classList.add("game-wrapper");

        this.canvas = document.createElement('canvas');
        this.canvas.classList.add("canvas-confetti");
        this.canvas.id = "confetti-" + this.id;
        this.gameWrapper.appendChild(this.canvas);

        this.guessText = document.createElement("h3");
        this.guessText.classList.add("guess-text");
        this.guessText.textContent = this.gradeArray[this.currentGuess];

        const buttonHigher = SubGame.createGuessButton("higher", "Higher");
        const buttonMiddle = SubGame.createGuessButton("middle", "This");
        const buttonLower = SubGame.createGuessButton("lower", "Lower");

        buttonHigher.addEventListener("click", (event) => {
            event.stopPropagation();
            console.log("Higher clicked");
            if(this.currentGuess < this.grade){
                if(this.firstGuess){
                    this.pass();
                }else{
                    this.right();
                }
            }else{
                this.wrong();
            } 

            if(this.currentGuess == this.grade){
                this.high = this.currentGuess;
            }else{
                this.advanceGame();
            }

            this.updateGuess();
            this.updateText();
        });

        buttonMiddle.addEventListener("click", (event) => {
            event.stopPropagation();
            console.log("Middle clicked");

            if(this.currentGuess == this.grade){
                console.log("won");
                this.gameWrapper.parentElement.innerHTML = this.originalContent;
                return;                
            }else{
                this.wrong();
                this.updateText();
            }
        });

        buttonLower.addEventListener("click", (event) => {
            event.stopPropagation();
            console.log("Lower clicked");
            
            if(this.currentGuess > this.grade){
                this.right();
            }else{
                if(this.firstGuess){
                    this.pass();
                }else{
                    this.wrong();
                }
            }

            if(this.currentGuess == this.grade){
                this.low = this.currentGuess;
            }else{
                this.advanceGame();
            }

            this.updateGuess();
            this.updateText();
        });
        
        this.gameWrapper.append(this.guessText, buttonHigher, buttonMiddle, buttonLower);
        this.cell.append(this.gameWrapper);

    }
}

//check if there's a table after we've navigated the page
const observer = new MutationObserver(async (mutations) => {

    console.log("Page mutated, checking for table");
    let tables = document.querySelectorAll('[data-testid="table"]');

    for(const table of tables){
        if(table){
            console.log("Table found")
            if(table.dataset.mutated == "true"){
                console.log("Table already mutated, skipping")
            }else{
                console.log("Fresh table, attempting to fetch grades")
                console.log(table);
                Game.markTable(table);
                //save copy
                const tableCopy = table.cloneNode(true);
                //hide table
                console.log("Hiding table")
                table.textContent = "";
                const game = new Game(tableCopy);
                const gradeTable = game.determineTableType();
                if(gradeTable){
                    try{
                        game.determineIndices();
                        observer.disconnect(); //stop observing changes while we change or else infinite loop
                        await game.addButtons();
                        addObserverIfDesiredElementAvailable();
                        console.log("Displaying game table");
                        table.replaceWith(game.getTable());
                        console.log(game.getTable());
                    }catch(e){
                        console.log("Error occured: "+ e);
                        const errorText = document.createElement("h1");
                        errorText.classList.add("error-text");
                        errorText.textContent = "Error occured. Hiding table to not reveal anything. " + e;
                        observer.disconnect();
                        table.append(errorText);
                        addObserverIfDesiredElementAvailable();
                    }
                }else{
                    console.log("Displaying original table");
                    table.replaceWith(tableCopy);
                }
                
            }
        }
    }
})


//wait for main content as it should be available on all the pages so we won't be waiting forever, which is why we don't check for table
function addObserverIfDesiredElementAvailable() {
    console.log("Searching for main content");
    var element = document.querySelector('#mainContent');
    if(!element) {
        //The element we need does not exist yet, wait 500ms and try again
        window.setTimeout(addObserverIfDesiredElementAvailable,500);
        return;
    }
    console.log("Found main content:")
    console.log(element);
    var config = {childList: true, subtree: true};
    observer.observe(element, config);
}

addObserverIfDesiredElementAvailable();