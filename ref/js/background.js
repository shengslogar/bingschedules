/**
 * @name        background.js
 * @description Dynamically enables extension per page
 * @requires    none
 * @author      Sheng-Liang Slogar <slogar.sheng@gmail.com>
 */

// Enable extension on any BU webpage

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {

    if (tab.url.split('/')[2].indexOf('binghamton.edu') != -1) {

        // chrome.pageAction.setIcon({
        //    tabId: tabId,
        //    path: '/ref/img/popup-color.png'
        // });

        chrome.pageAction.show(tabId);

    }
});