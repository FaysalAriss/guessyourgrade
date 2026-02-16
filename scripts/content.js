//observer for url changes, SPA changes url on page navigation
let lastUrl = location.href;
const urlObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log("URL Change detected to:", lastUrl);
        handleMutation();
    }
});

//observer for content changes
const contentObserver = new MutationObserver(() => {
    handleMutation();
});

//start both observers
const config = { subtree: true, childList: true };
urlObserver.observe(document.documentElement, config);
contentObserver.observe(document.documentElement, config);

//check for table right away, just in case
handleMutation();

async function handleMutation(){
    console.log("Page mutated, checking for table");
    let tables = document.querySelectorAll('[data-testid="table"]');
    //console.log(tables);

    for(const table of tables){
        if(!table){ continue; }

        console.log("Table found");
        //console.log(table);

        if(table.dataset.mutated == "true"){
            console.log("Table already mutated, skipping");
            continue;
        }

        //tag table as mutated so we don't touch it again
        console.log("Marking as touched");
        table.dataset.mutated = "true";
        const tableCopy = table.cloneNode(true);

        console.log("Hiding table")
        table.textContent = "";

        console.log("Table found, attempting to begin game");
        const game = new GameManager(tableCopy);
        await game.start();
        table.replaceWith(game.getTable());
    }
}


/**
 * Manages setup and starting games for all cells in a table
 * 
 */
class GameManager{
    #table;

    #searches;      //object literal used to store `Search` objects for each used column
    #gradeSettings; //object literal used to store various grade values and settings
    
    /**
     * Create a `GameManager` object to manage the `table`
     * 
     * @param {html table} table - the table to start the game in
     */
    constructor(table){
        this.#table = table;
        this.tableHeader = this.#table.querySelector("thead");
    }

    /**
     * Starts the game based on the user's settings 
     * Removes the grades and adds the game to each cell
     * Mutates `this.table`
     */
    async start(){
        this.#searches = await this.#initializeSearch();

        //skip tables without any columns with grades
        if(!this.#isGradeTable()){ return; }

        //begin game
        try{
            const indices = this.#determineIndices();
            this.#gradeSettings = await this.#initializeGradeArrays();
            this.#gradeSettings = {...indices, ...this.#gradeSettings};

            this.#addButtons();
        }catch(e){
            console.warn("Error occured: "+ e);
            this.#table.textContent = "";
            const errorText = document.createElement("h1");
            errorText.classList.add("error-text");
            errorText.textContent = "Error occured. Hiding table to not reveal anything. " + e;
            this.#table.append(errorText);
        }
    }

    /**
     * Returns (a direct reference to) the table in its current state
     * Saves a little memory by not copying it as we only use it in one place. To modify in the future if necessary
     * 
     * @returns {html table} - the game table
     */
    getTable(){
        return this.#table;
    }

    /**
     * Loads the user's settings for searching the header to determine the table type. Creates `Search` objects intialized based on those settings
     * 
     * @returns {object literal} - the initialized `Search` objects 
     */
    async #initializeSearch(){
        console.log("Fetching header search settings");
        const result = await chrome.storage.sync.get(["letterHeaderSearch", "letterMatchWhole", "numberHeaderSearch", "numberMatchWhole"]);

        //validate fields
        for(const field of Object.values(result)){
            if(field == null || field === ""){
                console.log(result);
                throw Error("Header settings invalid or couldn't load them");
            }
        }

        const searches = {
            letterSearch: new Search(result.letterHeaderSearch, result.letterMatchWhole),
            numberSearch: new Search(result.numberHeaderSearch, result.numberMatchWhole)
        }

        return searches;
    }

    /**
     * Checks if the table is a table containing grades so can to play the game
     * 
     * precondition: `this.searches` is initialized
     * @returns {boolean} if the table is viable to play the game
     */
    #isGradeTable(){
        //look through all cells and search for given headers
        for(const row of this.tableHeader.rows){
            for(const cell of row.cells){
                const label = cell.cloneNode(true); //clone node to not modify original
                label.querySelector('[data-testid="screenReader"]')?.remove(); //remove screen reader info to only get whats displayed to the user
                const text = label.innerText.trim();
                if(this.#searches.letterSearch.search(text) || this.#searches.numberSearch.search(text)){
                    console.log("Grade table: true");
                    return true;
                }
            }
        }

        console.log("Grade table: false");
        return false;
    }
    
    /**
     * Find the column index in the table where the grades are
     * If an index cannot be found it will not be in the returned object
     * 
     * @returns {object literal} - indices of required columns
     */
    #determineIndices(){
        const headerGrid = []; //reconstruct header in a grid (2D array)
        const rows = this.tableHeader.rows;
        const indices = {};

        //look through all the rows of the table head
        for(let rowIndex = 0; rowIndex<rows.length; rowIndex++){
            const row = rows[rowIndex];
            headerGrid[rowIndex] ||= []; //if haven't created a row for current row then do so
            let cellIndex = 0;

            //look through all cells in the row
            for(const cell of row.cells){
                //check how much each cell covers in row and col, default to 1
                const rowSpan = cell.rowSpan || 1;
                const colSpan = cell.colSpan || 1;

                //skip already occupied cell
                while(headerGrid[rowIndex][cellIndex]){
                    cellIndex++;
                }

                //remove screenreader info from cloned node to not modify original and only get the text the user sees
                const label = cell.cloneNode(true);
                label.querySelector('[data-testid="screenReader"]')?.remove();
                const text = label.innerText.trim();
                console.log(text);

                //check if the header title matches our search parameters for letter or number
                //if so save the index
                const isMatchLetter = this.#searches.letterSearch.search(text);
                if(isMatchLetter){
                    if(indices.letterGradeIndex || indices.letterGradeIndex === 0){
                        throw Error("already found column index for letter grade, but found again");
                    }
                    indices.letterGradeIndex = cellIndex;
                }

                const isMatchNumber = this.#searches.numberSearch.search(text);
                if(isMatchNumber){
                    if(indices.numberGradeIndex || indices.numberGradeIndex === 0){
                        throw Error("already found column index for number grade, but found again");
                    }
                    indices.numberGradeIndex = cellIndex;
                }

                if(isMatchLetter && isMatchNumber){
                    console.warn("Letter and number indices are the same");
                }

                //if the cell spans more than one row/col then occupy it in our grid reconstruction
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
        if(indices.letterGradeIndex == null && indices.numberGradeIndex == null){
            throw new Error("Couldn't identify indices of needed columns");
        }

        console.log("Letter and number grades column indices: " + indices.letterGradeIndex + ", " + indices.numberGradeIndex);
        return indices;
    }


    /**
     * Loads the user's settings and processes them to the final grade arrays and passing indices
     * 
     * @returns {object literal} - containing letter/number grade arrays, letter/number passing indices
     */
    async #initializeGradeArrays(){      
        console.log("Fetching grade settings");
        const result = await chrome.storage.sync.get(["letterGradesArray", "letterPassing", "numberGradesArray", "numberPassing"]);
        const gradeSettings = {};

        if((!result.letterGradesArray || result.letterGradesArray.length === 0) || (result.letterPassing == null || result.letterPassing === "")){
            console.log(result.letterGradesArray);
            throw Error("Letter grade settings are invalid or couldn't load them"); 
        }

        gradeSettings.letterGradesArray = result.letterGradesArray;
        gradeSettings.letterPassingIndex = gradeSettings.letterGradesArray.indexOf(result.letterPassing);

        //if processed array was too large to store in sync storage use this as fallback
        //fetch the settings necessary and process them to create the number grade array locally
        if((!result.numberGradesArray || result.numberGradesArray.length === 0) || (result.numberPassing == null | Number.isNaN(result.numberPassing))){
            const rawData = await chrome.storage.sync.get(["numberGradeMin", "numberGradeMax", "numberGradeResolution"]);

            if(typeof rawData.numberGradeMin === 'undefined' ||
                typeof rawData.numberGradeMax === 'undefined' ||
                typeof rawData.numberGradeResolution === 'undefined'
            ){
                throw Error("Number grade min, max or resolution undefined");
            }

            const numberGradesArray = processNumberGrades(rawData.numberGradeMin, rawData.numberGradeMax, rawData.numberGradeResolution);
            gradeSettings.numberGradesArray = numberGradesArray;

        }else{
            gradeSettings.numberGradesArray = result.numberGradesArray;
        }

        gradeSettings.numberPassingIndex = gradeSettings.numberGradesArray.indexOf(result.numberPassing);

        return gradeSettings;
    }

    /**
     * Adds and starts the game in the appropriate cells of `this.table`
     * 
     * precondition: grade arrays, passing indices and column indices are properly initialized in `this.gradeSettings`
     */
    async #addButtons(){
        console.log("Clearing grades and adding buttons");

        //the settings for each type of game
        const numberConfig = {
            parseCell: (cell) => Number(cell.textContent.trim()),   //function to fetch the grade from the cell and get the correct type
            gradeArray: this.#gradeSettings.numberGradesArray,      //the grade array to use in the game
            passingIndex: this.#gradeSettings.numberPassingIndex    //the index in the grade array where the passing grade lies
        };

        const letterConfig = {
            parseCell: (cell) => cell.textContent.trim(),
            gradeArray: this.#gradeSettings.letterGradesArray,
            passingIndex: this.#gradeSettings.letterPassingIndex
        };

        //start the games in the column if we've found the index for it
        if(this.#gradeSettings.numberGradeIndex){ this.#addButtonsToColumn(this.#gradeSettings.numberGradeIndex, numberConfig); }
        if(this.#gradeSettings.letterGradeIndex){ this.#addButtonsToColumn(this.#gradeSettings.letterGradeIndex, letterConfig); }
    }

    /**
     * Adds and starts the game in all the cells in a given column of `this.table`
     * 
     * @param {number} columnIndex
     * @param {object literal} config - the settings needed for the game
     *      parseCell - function which returns the grade in the cell in an appropriate type
     *      gradeArray - the grade array used
     *      passingIndex - the index where the passing grade lies in the grade array
     */
    #addButtonsToColumn(columnIndex, config){
        const tableBody = this.#table.querySelector("tbody");

        for(const row of tableBody.rows){ 
            const game = new Game(row.cells[columnIndex], config);
            game.start();
        }
    }

}

/**
 * Helps searching a string based on common search settings. Such as what to find and if it needs to match whole.
 */
class Search{
    #toFind;
    #matchWhole;

    /**
     * 
     * @param {string} toFind, text to find
     * @param {boolean} matchWhole, if need to match the entire string
     */
    constructor(toFind, matchWhole){
        this.#toFind = toFind;
        this.#matchWhole = matchWhole;
    }

    search(input){
        return this.#matchWhole ? input === this.#toFind : input?.includes(this.#toFind);
    }
}

/**
 * The game running in a specific cell. Handles its own state
 */
class Game{
    #cell;
    #config;

    static #RIGHT_CLASS = "checkmark";  //css class for when the user guesses correctly
    static #WRONG_CLASS = "cross";      //css class for when the user guesses incorrectly

    static #defaultWaitingTime = 700;   //milliseconds. time to display right or wrong after guess
    static #guessButtonGeneralClass = "guess-button";   //prefix for class for buttons in game

    /**
     * Creates a new `Game` object for `cell`
     * 
     * @param {html td} cell - the cell in which the game should be run
     * @param {object literal} config - settings required for the game
     *      parseCell - function which returns the grade in the cell in an appropriate type
     *      gradeArray - the grade array used
     *      passingIndex - the index where the passing grade lies in the grade array
     */
    constructor(cell, config){
        this.#cell = cell;
        this.#config = config;

        //setup
        this.content = this.#config.parseCell(this.#cell);      //the grade in the cell
        this.solution = config.gradeArray.indexOf(this.content);//the index in the grade array of the grade originally in this cell
        this.currentGuess = this.#config.passingIndex;          //the current index of the guess
        this.passingIndex = this.#config.passingIndex;

        this.originalContent = this.#cell.innerHTML;            //the original contents of the cell

        this.low = 0;                                           //low for binary search
        this.high = this.#config.gradeArray.length-1;           //high for binary search
        this.lowest = 0;                                        //boundary indices of the grade array
        this.highest = this.#config.gradeArray.length-1;
        this.guessedPassing = false;                            //if the user has guessed above the passing grade
        this.waitingTime = Game.#defaultWaitingTime;
    }

    /**
     * Start the game in `this.cell`
     * Mutates the cell, returns it back to original when game is complete
     */
    start(){
        //empty cell
        if(!this.content){ return; }

        //the grade in the cell isn't in the grade array
        //make a show anyway button
        if(this.solution == -1){
            this.#cell.textContent = "Grade not in given list";
            const buttonShow = Game.#createButton(Game.#guessButtonGeneralClass, "show", "Show anyway");
            buttonShow.addEventListener("click", (event) => {
                event.stopPropagation();
                this.#resetCell();
            })
            this.#cell.append(buttonShow);

            console.log(this.#config.gradeArray);
            console.log(this.content + ", " + this.solution);

            return;
        }

        //start game
        this.#cell.textContent = ""; //remove original contents of cell
        this.#addElements();
    }

    /**
     * Adds all the buttons and other game elements to `this.cell`
     * Mutates the cell
     */
    #addElements(){
        //wrapper
        const gameWrapper = document.createElement("div");
        gameWrapper.classList.add("game-wrapper");

        //canvas for confetti
        this.canvas = document.createElement('canvas');
        this.canvas.id = `confetti-${Math.random().toString(36).substring(2, 9)}`; //random ID so confetti library can differentiate canvases

        //current guess text
        this.guessText = document.createElement("h3");
        this.guessText.classList.add("guess-text");
        this.guessText.textContent = this.#config.gradeArray[this.currentGuess];

        //guess buttons
        const buttonHigher = Game.#createButton(Game.#guessButtonGeneralClass, "higher", "Higher");
        const buttonMiddle = Game.#createButton(Game.#guessButtonGeneralClass, "middle", "This");
        const buttonLower = Game.#createButton(Game.#guessButtonGeneralClass, "lower", "Lower");

        const buttonPlus = Game.#createButton(Game.#guessButtonGeneralClass, "plus", "+");
        const buttonMinus = Game.#createButton(Game.#guessButtonGeneralClass, "minus", "-");

        //div for the text and +/- buttons
        const guessDiv = document.createElement("div");
        guessDiv.classList.add("guess-div");
        guessDiv.append(buttonMinus, this.guessText, buttonPlus);

        //add actions associated with tthe buttons
        buttonHigher.addEventListener("click", (event) => this.#onHigher(event));
        buttonMiddle.addEventListener("click", (event) => this.#onMiddle(event));
        buttonLower.addEventListener("click", (event) => this.#onLower(event));

        buttonPlus.addEventListener("click", (event) => {
            event.stopPropagation();
            this.currentGuess = Math.max(Math.min(this.currentGuess+1, this.highest), this.lowest); //max and min to keep current guess within boundaries
            this.guessText.textContent = this.#config.gradeArray[this.currentGuess];
        });
        buttonMinus.addEventListener("click", (event) => {
            event.stopPropagation();
            this.currentGuess = Math.max(Math.min(this.currentGuess-1, this.highest), this.lowest); //max and min to keep current guess within boundaries
            this.guessText.textContent = this.#config.gradeArray[this.currentGuess];
        });

        this.#cell.style.maxWidth = "fit-content";
        this.#cell.style.width = "fit-content";

        gameWrapper.append(this.canvas, guessDiv, buttonHigher, buttonMiddle, buttonLower);
        this.#cell.append(gameWrapper);
    }

    /**
     * The action to do when the user clicks the "higher" button
     * Indicates the user thinks they got a higher grade than the guess displayed
     * Advances game appropriately
     */
    #onHigher(event){
        /* Always update low/high of binary search using `this.#advanceGame` so that the information revealed to the user is inline with the current guess provided
            We don't always update the guess though as when they get it wrong it could be two other options so it's not trivial as to which to pick*/
        event.stopPropagation();

        this.#advanceGame("high");

        if(this.currentGuess < this.solution){
            //if guessing above passing grade for the first time
            this.currentGuess >= (this.passingIndex && !this.guessedPassing) ? this.#pass() : this.#right();
            this.#updateGuess(); //update the guess as they are going in the right direction
        }else{
            this.#wrong();
        }
    }

    /**
     * The action to do when the user clicks the "lower" button
     * Indicates the user thinks they got a lower grade than the guess displayed
     * Advances game appropriately
     */
    #onLower(event){
        event.stopPropagation();

        this.#advanceGame("low");

        if(this.currentGuess > this.solution){
            this.#right();
            this.#updateGuess();
        }else{
            this.currentGuess >= (this.passingIndex && !this.guessedPassing) ? this.#pass() : this.#wrong();
        }
    }

    /**
     * Updates `this.low` or `this.high` depending on guess, based on binary search
     * 
     * @param {string} type - the variable to modify, "high" or "low"
     */
    #advanceGame(type){
        if(this.currentGuess == this.solution){
            //if they guessed higher and the guess is the right grade then make the max guess the current guess
            //if they guessed lower and the guess if the right grade then make the min guess the current guess
            this[type] = this.currentGuess;
        }else{
            if(this.currentGuess < this.solution){
                this.low = this.currentGuess + 1; //the righ grade is strictly higher than the guess so the lowest it can be is current guess + 1
            }else{
                this.high = this.currentGuess - 1; //the righ grade is strictly lower than the guess so the highest it can be is current guess - 1
            }
        }

        this.#updateText();
    }

    /**
     * The action to do when the user clicks the "this" button
     * Indicates the user thinks their grade is the guess displayed
     * Advances game appropriately
     */
    #onMiddle(event){
        event.stopPropagation();

        if(this.currentGuess == this.solution){
            this.#resetCell();
        }else{
            this.#wrong();
            this.#updateText();
        }
    }

    /**
     * Resets `this.cell` back to its original contents from before the game
     * Mutates `this.cell`
     */
    #resetCell(){
        this.#cell.innerHTML = this.originalContent;
    }

    /**
     * Creates a button using a template for its class name
     * 
     * @param {string} generalClassName - the prefix for the class name, will be separated with '-'
     * @param {string} subClassName - the suffix for the class name
     * @param {string} text - the text in the button
     * @returns {html button} the button
     */
    static #createButton(generalClassName, subClassName, text){
        const button = document.createElement("button");
        button.textContent = text;
        button.classList.add(generalClassName, generalClassName + "-" + subClassName);

        return button;
    }

    /**
     * Fires off confetti in `canvas`
     *
     * 
     * @param {html canvas} canvas - the canvas to fire the confetti in. Must have a unique ID
     */
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

    /**
     * Updates game text given the user made a correct guess
     */
    #right(){
        this.guessText.textContent = "✓";
        this.guessText.classList.add(Game.#RIGHT_CLASS);
    }

    /**
     * Updates game text given the user made a incorrect guess
     */
    #wrong(){
        this.guessText.textContent = "✗";
        this.guessText.classList.add(Game.#WRONG_CLASS);
    }

    /**
     * Updates game text/decoration given the user made a guess which proves they've passed
     */
    #pass(){
        this.guessedPassing = true;
        this.guessText.textContent = "You passed!!";
        this.guessText.classList.add(Game.#RIGHT_CLASS);
    
        //confetti
        Game.confetti(this.canvas);

        this.waitingTime = 2*Game.#defaultWaitingTime;
    }

    /**
     * Removes all tags that change the text style
     */
    #resetTags(){
        this.guessText.classList.remove(Game.#RIGHT_CLASS);
        this.guessText.classList.remove(Game.#WRONG_CLASS);
    }

    /**
     * Updates the current guess through binary search, based on the current `this.low` and `this.high`
     * Mutates `this.currentGues`
     */
    #updateGuess(){
        //binary search for your grade
        const newGuess = Math.round((this.high+this.low)/2);
        //currentGuess = new guess within bounds of lowest and highest
        this.currentGuess = Math.min(Math.max(newGuess, this.lowest), this.highest);
    }

    /**
     * Displays the new guess after waiting `this.waitingTime` ms
     */
    #updateText(){
        setTimeout(() => {
            this.#resetTags();
            this.guessText.textContent = this.#config.gradeArray[this.currentGuess];
        }, this.waitingTime);

        this.waitingTime = Game.#defaultWaitingTime;
    }

}