importScripts('default.js');

chrome.runtime.onInstalled.addListener(async (details) => {
    if(details.reason === chrome.runtime.OnInstalledReason.INSTALL){
        await resetLetterSettingsToDefault();
        await resetNumberSettingsToDefault();
        console.log("Initial setup complete");
    }
});