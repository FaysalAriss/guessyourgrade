//TODO: load settings once for whole page instead of table? probably not worth the effort

//copy pasted since import/export doesn't work for content script. and other solutions add too much clutter
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

/**
 * Sets up and begins the game for a table
 */
class GameMaster{
    numberSearch;
    letterSearch;

    letterGradesArray;
    letterPassingIndex;
    numberGradesArray;
    numberPassingIndex;
    
    constructor(table){
        this.table = table;
        this.tableHeader = this.table.querySelector("thead");
    }

    async start(){
        await this.initializeSearch();
        //skip tables without any columns with grades
        if(!this.isGradeTable()){ return; }

        //begin game
        try{
            this.determineIndices();
            await this.initializeGradeArrays();
            this.addButtons();
        }catch(e){
            console.warn("Error occured: "+ e);
            this.table.textContent = "";
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
        for(const row of this.tableHeader.rows){
            for(const cell of row.cells){
                if(this.letterSearch.search(cell.textContent) || this.numberSearch.search(cell.textContent)){
                    console.log("Grade table: true");
                    return true;
                }
            }
        }

        console.log("Grade table: false");
        return false;
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

    async initializeGradeArrays(){
        const result = await chrome.storage.sync.get(["letterGradesArray", "letterPassing", "numberGradesArray", "numberPassing"]);

        if(!result.letterGradesArray || result.letterGradesArray.length === 0){
            console.log(result.letterGradesArray);
            throw Error("Letter grade settings are invalid or couldn't load them"); 
        }

        this.letterGradesArray = result.letterGradesArray;
        this.letterPassingIndex = this.letterGradesArray.indexOf(result.letterPassing);

        if(!result.numberGradesArray || result.numberGradesArray.length === 0){
            const rawData = await chrome.storage.sync.get(["numberGradeMin", "numberGradeMax", "numberGradeResolution"]);

            if(typeof rawData.numberGradeMin === 'undefined' ||
                typeof rawData.numberGradeMax === 'undefined' ||
                typeof rawData.numberGradeResolution === 'undefined'
            ){
                throw Error("Number grade min, max or resolution undefined");
            }

            const numberGradesArray = processNumberGrades(rawData.numberGradeMin, rawData.numberGradeMax, rawData.numberGradeResolution);
            this.numberGradesArray = numberGradesArray;

        }else{
            this.numberGradesArray = result.numberGradesArray;
        }

        this.numberPassingIndex = this.numberGradesArray.indexOf(result.numberPassing);
    }

        
    async addButtons(){
        console.log("Clearing grades and adding buttons");

        const numberConfig = {
            parseCell: (cell) => Number(cell.textContent.trim()),
            gradeArray: this.numberGradesArray,
            passingIndex: this.numberPassingIndex
        };

        const letterConfig = {
            parseCell: (cell) => cell.textContent.trim(),
            gradeArray: this.letterGradesArray,
            passingIndex: this.letterPassingIndex
        };

        if(this.numberGradeIndex){
            this.addButtonsToColumn(this.numberGradeIndex, numberConfig);
        }
        if(this.letterGradeIndex){
            this.addButtonsToColumn(this.letterGradeIndex, letterConfig);
        }
    }

    addButtonsToColumn(columnIndex, config){
        const tableBody = this.table.querySelector("tbody");

        for(const row of tableBody.rows){ 
            const game = new Game(row.cells[columnIndex], config);
            game.start();
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
 * The game running in a specific cell.
 */
class Game{
    static RIGHT_CLASS = "checkmark";
    static WRONG_CLASS = "cross";

    static defaultWaitingTime = 700; //milliseconds
    static guessButtonGeneralClass = "guess-button";

    constructor(cell, config){
        this.cell = cell;
        this.config = config;

        //setup
        this.content = config.parseCell(this.cell);
        this.solution = config.gradeArray.indexOf(this.content);
        this.currentGuess = this.config.passingIndex;
        this.passingIndex = this.config.passingIndex;

        this.originalContent = this.cell.innerHTML;

        this.low = 0;
        this.high = this.config.gradeArray.length;
        this.lowest = 0;
        this.highest = this.config.gradeArray.length;
        this.guessedPassing = false;
        this.waitingTime = Game.defaultWaitingTime;
    }

    start(){
        //empty cell
        if(!this.content){ return; }

        if(this.solution == -1){
            this.cell.textContent = "Grade not in given list";
            const buttonShow = Game.createButton(Game.guessButtonGeneralClass, "show", "Show anyway");
            buttonShow.addEventListener("click", (event) => {
                event.stopPropagation();
                this.resetCell();
            })
            this.cell.append(buttonShow);

            console.log(this.config.gradeArray);
            console.log(this.content + ", " + this.solution);

            return;
        }

        //start game
        this.cell.textContent = "";
        this.addElements();
    }

    addElements(){
        //wrapper
        const gameWrapper = document.createElement("div");
        gameWrapper.classList.add("game-wrapper");

        //canvas for confetti
        this.canvas = document.createElement('canvas');
        this.canvas.id = `confetti-${Math.random().toString(36).substring(2, 9)}`;
        gameWrapper.appendChild(this.canvas);

        //current guess text
        this.guessText = document.createElement("h3");
        this.guessText.classList.add("guess-text");
        this.guessText.textContent = this.config.gradeArray[this.currentGuess];

        //guess buttons
        const buttonHigher = Game.createButton(Game.guessButtonGeneralClass, "higher", "Higher");
        const buttonMiddle = Game.createButton(Game.guessButtonGeneralClass, "middle", "This");
        const buttonLower = Game.createButton(Game.guessButtonGeneralClass, "lower", "Lower");

        const buttonPlus = Game.createButton(Game.guessButtonGeneralClass, "plus", "+");
        const buttonMinus = Game.createButton(Game.guessButtonGeneralClass, "minus", "-");

        const guessDiv = document.createElement("div");
        guessDiv.classList.add("guess-div");
        guessDiv.append(buttonMinus, this.guessText, buttonPlus);

        buttonHigher.addEventListener("click", (event) => this.onHigher(event));
        buttonMiddle.addEventListener("click", (event) => this.onMiddle(event));
        buttonLower.addEventListener("click", (event) => this.onLower(event));

        buttonPlus.addEventListener("click", (event) => {
            event.stopPropagation();
            this.currentGuess++;
            this.guessText.textContent = this.config.gradeArray[this.currentGuess];
        });
        buttonMinus.addEventListener("click", (event) => {
            event.stopPropagation();
            this.currentGuess--;
            this.guessText.textContent = this.config.gradeArray[this.currentGuess];
        });

        gameWrapper.append(guessDiv, buttonHigher, buttonMiddle, buttonLower);
        this.cell.append(gameWrapper);
    }

    onHigher(event){
        event.stopPropagation();

        this.advanceGame("high");

        if(this.currentGuess < this.solution){
            //if guessing above passing grade for the first time
            this.currentGuess >= this.passingIndex && !this.guessedPassing ? this.pass() : this.right();
            this.updateGuess();
        }else{
            this.wrong();
        }
    }

    onLower(event){
        event.stopPropagation();

        this.advanceGame("low");

        if(this.currentGuess > this.solution){
            this.right();
            this.updateGuess();
        }else{
            this.currentGuess >= this.passingIndex && !this.guessedPassing ? this.pass() : this.wrong();
        }
    }

    advanceGame(type){
        if(this.currentGuess == this.solution){
            this[type] = this.currentGuess;
        }else{
            if(this.currentGuess < this.solution){
                this.low = this.currentGuess + 1;
            }else{
                this.high = this.currentGuess - 1;
            }
        }

        this.updateText();
    }

    onMiddle(event){
        event.stopPropagation();

        if(this.currentGuess == this.solution){
            this.resetCell();
        }else{
            this.wrong();
            this.updateText();
        }
    }

    resetCell(){
        this.cell.innerHTML = this.originalContent;
    }

    static createButton(generalClassName, subClassName, text){
        const button = document.createElement("button");
        button.textContent = text;
        button.classList.add(generalClassName, generalClassName + "-" + subClassName);

        return button;
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
    right(){
        this.guessText.textContent = "✓";
        this.guessText.classList.add(Game.RIGHT_CLASS);
    }

    wrong(){
        this.guessText.textContent = "✗";
        this.guessText.classList.add(Game.WRONG_CLASS);
    }

    pass(){
        this.guessedPassing = true;
        this.guessText.textContent = "You passed!!";
        this.guessText.classList.add(Game.RIGHT_CLASS);
    
        //confetti
        Game.confetti(this.canvas);

        this.waitingTime = 2*Game.defaultWaitingTime;
    }

    resetTags(){
        this.guessText.classList.remove(Game.RIGHT_CLASS);
        this.guessText.classList.remove(Game.WRONG_CLASS);
    }

    updateGuess(){
        //binary search for your grade
        const newGuess = Math.round((this.high+this.low)/2);
        //currentGuess = new guess within bounds of lowest and highest
        this.currentGuess = Math.min(Math.max(newGuess, this.lowest), this.highest);
    }

    updateText(){
        setTimeout(() => {
            this.resetTags();
            this.guessText.textContent = this.config.gradeArray[this.currentGuess];
        }, this.waitingTime);

        this.waitingTime = Game.defaultWaitingTime;
    }

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