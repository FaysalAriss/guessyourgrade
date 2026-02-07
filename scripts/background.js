import {resetLetterSettingsToDefault, resetNumberSettingsToDefault } from './default.js';

chrome.runtime.onInstalled.addListener(async (details) => {
    if(details.reason === chrome.runtime.OnInstalledReason.INSTALL){
        await resetLetterSettingsToDefault();
        await resetNumberSettingsToDefault();
        console.log("Initial setup complete");
    }

    //TODO: on update remake grade arrays?
});