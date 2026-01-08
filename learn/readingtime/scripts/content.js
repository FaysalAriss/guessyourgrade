function renderReadingTime(article){
    //no reading time if no article provided
    if(!article){
        return;
    }

    const text = article.textContent;
    const wordMatchRegExp = /[^\s]+/g; //seperate by whitespace
    const words = text.matchAll(wordMatchRegExp); //returns iterator
    const wordCount = [...words].length; //convert to array using ... (spread operator), and get length
    const readingTime = Math.round(wordCount/200); //200 words per minute
    const badge = document.createElement("p"); //create paragraph to display result
    //use same styling
    badge.classList.add("color-secondary-text", "type--caption");
    badge.textContent = `⏱️ ${readingTime} min read`;

    //api docs usually use h1
    const heading = article.querySelector("h1");
    //for articles with a time element
    const date = article.querySelector("time")?.parentNode; //? = if time exists get parentNode otherwise undefined

    (date ?? heading).insertAdjacentElement("afterend", badge); //?? = get first nonnull (nullish coalescing), as in use date if nonull otherwise heading
}

renderReadingTime(document.querySelector("article"));

//observe for changes to add the reading time when switching to a new article without switching the main url
const observer = new MutationObserver((mutations) => {
    for(const mutation of mutations){
        for(const node of mutation.addedNodes){
            //if new article added
            if(node instanceof Element && node.tagName === "ARTICLE"){
                renderReadingTime(node);
            }
        }
    }
})


observer.observe(document.querySelector("devsite-content"), {
    childList: true
})