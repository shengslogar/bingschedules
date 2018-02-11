/**
 * @name        background.js
 * @description Dynamically enables extension per page
 * @requires    none
 * @author      Sheng-Liang Slogar <slogar.sheng@gmail.com>
 */

// Enable extension on any BU webpage

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {

    // light up extension icon when export feature is available
    // IMPORTANT: This code must match the selector in popup.js
    if (tab.url.split('/')[2].indexOf('ssb.cc.binghamton.edu') != -1 && tab.title == 'Student Detail Schedule') {

        chrome.pageAction.setIcon({
            tabId: tabId,
            path: '/ref/img/popup-color.png'
        });
    }

    // allow popup
    chrome.pageAction.show(tabId);
});