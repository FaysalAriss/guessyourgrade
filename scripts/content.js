//TODO: add way to customize letter grade ranges
//todo make work on any table

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

                const text = cell.querySelector('span')?.textContent.trim(); //TODO: change to something for future proof, for any element other than span
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

        
    addButtons(){
        console.log("Clearing grades and adding buttons");
        
        if(this.letterGradeIndex){
            this.addButtonsToColumn(this.letterGradeIndex, Game.letterGrades, "letter", 0);
        }
        if(this.numberGradeIndex){
            this.addButtonsToColumn(this.numberGradeIndex, Game.numberGrades, "number", 50);
        }
        
    }

    addButtonsToColumn(index, gradeArray, idPrefix, startingGuess){
        //mask/remove grades
        //skip header
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
                    subGame.tempmain();
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

    updateGuess(){
        //binary search for your grade
        this.currentGuess = SubGame.stayInRange(Math.round((this.high+this.low)/2), this.lowest, this.highest);
        setTimeout(() => {
            this.guessText.classList.remove("checkmark");
            this.guessText.classList.remove("cross");
            this.guessText.textContent = this.gradeArray[this.currentGuess];
        }, this.waitingTime);
        this.waitingTime = SubGame.defaultWaitingTime;
    }
    
    tempmain(){
        this.gameWrapper = document.createElement("div");
        this.gameWrapper.classList.add("game-wrapper");

        const canvas = document.createElement('canvas');
        canvas.classList.add("canvas-confetti");
        canvas.id = "confetti-" + this.id;
        this.gameWrapper.appendChild(canvas);

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
                //correct
                if(this.firstGuess){
                    this.firstGuess = false;
                    this.guessText.textContent = "You passed!!";
                    this.guessText.classList.add("checkmark");
                
                    //confetti
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

                    this.waitingTime = 2*SubGame.defaultWaitingTime;


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
        });

        buttonMiddle.addEventListener("click", (event) => {
            event.stopPropagation();
            console.log("Middle clicked");
            //do stuff
            if(this.currentGuess == this.grade){
                //correct
                //done
                console.log("won");
                this.gameWrapper.parentElement.innerHTML = this.originalContent;
                return;
                //row.cells[index] = originalContent;
                
            }else{
                this.wrong();
                this.updateGuess();
            }
        });

        buttonLower.addEventListener("click", (event) => {
            event.stopPropagation();
            console.log("Lower clicked");
            
            if(this.currentGuess > this.grade){
                this.right();
            }else{
                this.wrong();
            }

            if(this.currentGuess == this.grade){
                this.low = this.currentGuess;
            }else{
                this.advanceGame();
            }

            this.updateGuess();
        });
        
        this.gameWrapper.append(this.guessText, buttonHigher, buttonMiddle, buttonLower);
        this.cell.append(this.gameWrapper);

    }
}

//check if there's a table after we've navigated the page
const observer = new MutationObserver((mutations) => {

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
                table.textContent = "";
                const game = new Game(tableCopy);
                const gradeTable = game.determineTableType();
                if(gradeTable){
                    try{
                        game.determineIndices();
                        observer.disconnect(); //stop observing changes while we change or else infinite loop
                        game.addButtons();
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