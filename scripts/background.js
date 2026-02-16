importScripts('default.js');

//save the default settings on first install so popup has something to load from storage when it opens
chrome.runtime.onInstalled.addListener(async (details) => {
    if(details.reason === chrome.runtime.OnInstalledReason.INSTALL){
        await resetLetterSettingsToDefault();
        await resetNumberSettingsToDefault();
        console.log("Initial setup complete");
    }
});