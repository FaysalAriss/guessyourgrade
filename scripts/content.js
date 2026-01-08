function getNumberGrade(table){
    if(!table){
        return;
    }

    //get number
    for (var rowIndex = 0, row; row = table.rows[rowIndex]; rowIndex++) {
        //iterate through rows
        //rows would be accessed using the "row" variable assigned in the for loop
        for (var colIndex = 0, col; col = row.cells[colIndex]; colIndex++) {
            //iterate through columns
            //columns would be accessed using the "col" variable assigned in the for loop
            console.log(col.textContent);
        }  
    }
}

const observer = new MutationObserver((mutations) => {
    console.log("mutated");
    if(document.querySelector('[data-testid="table"]')){
        getNumberGrade(document.querySelector('[data-testid="table"]'));
    }
})

function addObserverIfDesiredNodeAvailable() {
    console.log("hello");
    var composeBox = document.querySelector('#mainContent');
    if(!composeBox) {
        //The node we need does not exist yet.
        //Wait 500ms and try again
        window.setTimeout(addObserverIfDesiredNodeAvailable,500);
        return;
    }
    console.log(composeBox);
    var config = {childList: true, subtree: true};
    observer.observe(composeBox, config);
}
addObserverIfDesiredNodeAvailable();

