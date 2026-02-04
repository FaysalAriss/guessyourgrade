//TODO: fix number grade checking. check the numbers instead of strings in case of 94.0 instead of 94
//TODO: restructure code to have subgame arrays as fields of Game so they can all access the common resource of the grade arrays

//copy pasted since import/export doesn't work for content script. and other solutions add too much clutter
function processNumberGrades(min, max, resolution){
    let numberGrades = [];
    for(let i = min; i <= max; i += resolution){
        //round num to resolution
        //to precision gets rid of the imprecision of floating point arithmetic
        //parsefloat to remove trailing 0s
        const num = Number(parseFloat((Math.round(i/resolution) * resolution).toPrecision(12)));
        numberGrades.push(num.toString());
    }

    return numberGrades;
}

/**
 * Sets up and begins the game for a table
 */
class GameMaster{
    static guessButtonGeneralClass = "guess-button";

    tableHeader;
    numberSearch;
    letterSearch;
    
    constructor(table){
        this.table = table;
    }

    async start(){
        await this.initializeSearch();
        //skip tables without any columns with grades
        if(!this.isGradeTable()){ return; }

        //begin game
        try{
            await this.determineIndices();
            await this.addButtons();
        }catch(e){
            console.warn("Error occured: "+ e);
            const errorText = document.createElement("h1");
            errorText.classList.add("error-text");
            errorText.textContent = "Error occured. Hiding table to not reveal anything. " + e;
            this.table.append(errorText);
        }
    }

    getTable(){
        return this.table;
    }

    async initializeSearch(){
        const result = await chrome.storage.sync.get(["letterHeaderSearch", "letterMatchWhole", "numberHeaderSearch", "numberMatchWhole"]);

        //check if strings are null/undefined/empty
        //check if bools are null/undefined
        if(!result.letterHeaderSearch || result.letterMatchWhole == null ||
            !result.numberHeaderSearch || result.numberMatchWhole == null){
            console.log(result);
            throw Error("Header settings invalid or couldn't load them");
        }

        this.letterSearch = new Search(result.letterHeaderSearch, result.letterMatchWhole);
        this.numberSearch = new Search(result.numberHeaderSearch, result.numberMatchWhole);
    }

    /**
     * Non mutator
     * 
     * @returns if the table is a table containing grades (viable to play the game)
     */
    isGradeTable(){
        this.tableHeader = this.table.querySelector("thead");

        for(const row of this.tableHeader.rows){
            for(const cell of row.cells){
                if(this.letterSearch.search(cell.textContent) || this.numberSearch.search(cell.textContent)){
                    console.log("Grade table: true");
                    return true;
                }
            }
        }

        console.log("Grade table: false");
    }
        
    async determineIndices(){
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

                const isMatchLetter = this.letterSearch.search(text);
                if(isMatchLetter){
                    if(this.letterGradeIndex || this.letterGradeIndex === 0){
                        throw Error("already found column index for letter grade, but found again");
                    }
                    this.letterGradeIndex = cellIndex;
                }

                const isMatchNumber = this.numberSearch.search(text);
                if(isMatchNumber){
                    if(this.numberGradeIndex || this.numberGradeIndex === 0){
                        throw Error("already found column index for number grade, but found again");
                    }
                    this.numberGradeIndex = cellIndex;
                }

                if(isMatchLetter && isMatchNumber){
                    console.warn("Letter and number indices are the same");
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

        //if is a grade table but can't find the grades abort without reshowing the table to avoid exposing the grades
        if(this.letterGradeIndex == null && this.numberGradeIndex == null){
            throw new Error("Couldn't identify indices of needed columns");
        }

        console.log("Letter and number grades column indices: " + this.letterGradeIndex + ", " + this.numberGradeIndex);
    }

        
    async addButtons(){
        console.log("Clearing grades and adding buttons");

        const result = await chrome.storage.sync.get(["letterGradesArray", "numberGradesArray"]);

        if(!result.letterGradesArray || result.letterGradesArray.length === 0){
            console.log(result.letterGradesArray);
            throw Error("Letter grade settings are invalid or couldn't load them"); 
        }

        if(!result.numberGradesArray || result.numberGradesArray.length === 0){
            const rawData = await chrome.storage.sync.get(["numberGradeMin", "numberGradeMax", "numberGradeResolution"]);

            if(typeof rawData.numberGradeMin === 'undefined' ||
                typeof rawData.numberGradeMax === 'undefined' ||
                typeof rawData.numberGradeResolution === 'undefined'
            ){
                throw Error("Number grade min, max or resolution undefined");
            }

            if(this.numberGradeIndex){ this.addButtonsToColumn(this.numberGradeIndex, processNumberGrades(rawData.numberGradeMin, rawData.numberGradeMax, rawData.numberGradeResolution), "number", 49); }

        }else{
            if(this.numberGradeIndex){ this.addButtonsToColumn(this.numberGradeIndex, result.numberGradesArray, "number", 49); }
        }    
        
        if(this.letterGradeIndex){ this.addButtonsToColumn(this.letterGradeIndex, result.letterGradesArray, "letter", 0);}
    }

    addButtonsToColumn(index, gradeArray, idPrefix, startingGuess){
        //mask/remove grades
        const tableBody = this.table.querySelector("tbody");

        let rowIndex = 0;
        let cell = tableBody.rows[rowIndex].cells[index];
        while(cell){
            let content = cell.textContent.trim();
            let grade = gradeArray.indexOf(content);
            console.log(index);
            console.log(gradeArray);
            console.log(content + ", " + grade);

            const originalContent = cell.innerHTML;

            if(content){
                if(grade == -1){
                    //non empty cell and not in the grade list
                    cell.textContent = "Grade not in possible grades";
                    //TODO: add show anyway button?
                }else{
                    //clear cell contents
                    cell.textContent = "";
                    const subGame = new GameManager(cell, grade, originalContent, idPrefix+rowIndex, gradeArray, startingGuess);
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

class Search{
    /**
     * 
     * @param {string} toFind, text to find
     * @param {boolean} matchWhole if need to match the entire string
     */
    constructor(toFind, matchWhole){
        this.toFind = toFind;
        this.matchWhole = matchWhole;
    }

    search(input){
        return this.matchWhole ? input === this.toFind : input?.includes(this.toFind);
    }
}

/**
 * Injects and manages the game into a column
 */
class GameManager{
    static defaultWaitingTime = 1000;
    // lowest;
    // highest;

    // guessText;
    // gameWrapper;
    // canvas;

    constructor (cell, grade, originalContent, id, gradeArray, startingGuess){
        this.cell = cell;
        this.grade = grade;
        this.currentGuess = startingGuess;
        this.low = 0;
        this.high = gradeArray.length;
        this.firstGuess = true;
        this.waitingTime = GameManager.defaultWaitingTime;
        this.originalContent = originalContent;
        this.id = id;
        this.gradeArray = gradeArray;
        this.lowest = 0;
        this.highest = gradeArray.length;
    }

    static createGuessButton(className, text){
        const button = document.createElement("button");
        button.textContent = text;
        button.classList.add(GameMaster.guessButtonGeneralClass, GameMaster.guessButtonGeneralClass + "-" + className);

        return button;
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
        GameManager.confetti(this.canvas);

        this.waitingTime = 2*GameManager.defaultWaitingTime;
    }

    updateGuess(){
        //binary search for your grade
        const newGuess = Math.round((this.high+this.low)/2);
        this.currentGuess = Math.min(Math.max(newGuess, this.lowest), this.highest);
    }

    updateText(){
        setTimeout(() => {
            this.resetTags();
            this.guessText.textContent = this.gradeArray[this.currentGuess];
        }, this.waitingTime);
        this.waitingTime = GameManager.defaultWaitingTime;
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

        const buttonHigher = GameManager.createGuessButton("higher", "Higher");
        const buttonMiddle = GameManager.createGuessButton("middle", "This");
        const buttonLower = GameManager.createGuessButton("lower", "Lower");

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

class NumberGameManager extends GameManager{

}

class LetterGameManager extends GameManager{

}

/**
 * The game running in a specific cell.
 * Used to store original info of the cell
 */
class Game{

}

//check if there's a table after we've navigated the page
const observer = new MutationObserver(async (mutations) => {
    console.log("Page mutated, checking for table");
    let tables = document.querySelectorAll('[data-testid="table"]');

    for(const table of tables){
        if(!table){ return; }

        console.log("Table found");
        console.log(table);

        if(table.dataset.mutated == "true"){
            console.log("Table already mutated, skipping");
            return;
        }

        //tag table as mutated so we don't touch it again
        console.log("Marking as touched");
        table.dataset.mutated = "true";
        const tableCopy = table.cloneNode(true);

        console.log("Hiding table")
        table.textContent = "";

        console.log("Table found, attempting to begin game");
        const game = new GameMaster(tableCopy);
        await game.start();
        table.replaceWith(game.getTable()); //doesn't seem to activate observer?
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