// ==UserScript==
// @name         Newscientist past issues infinite scroll
// @namespace    http://tampermonkey.net/hakt0-r/
// @version      0.1
// @description  Adds infinite scrolling to Newscientist past issues page
// @author       hakt0r
// @match        https://www.newscientist.com/issues/
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// ==/UserScript==
'use strict';

var nextPageLink;
var yearItems = document.getElementsByName('archive-dropdown')[0].options;
var currentYear = 1;
var iframe = createIframe();

function getMagazineArchives(doc) {
    return doc.getElementsByClassName('magazine-archive-issues')[0];
}

/**
 * Hide the year choice
 */
function prepare_page() {
    document.getElementsByClassName('magazine-archive-browser entry-form')[0].style.display = 'none';
}

function getNextPageLink() {
    if (currentYear < yearItems.length) {
        return "/issues/" + yearItems[currentYear++].value;
    }
}

/**
 * Figure out how far to go before the bottom of the page is reached.
 */
function getScrollPositionFromBottom() {
    var scrollTop = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;

    // accounting for cases where html/body are set to height:100%
    var scrollHeight = (document.documentElement && document.documentElement.scrollHeight) || document.body.scrollHeight;

    return scrollHeight - (scrollTop + window.innerHeight);
}

function getNextPage(cbComplete) {
    GM_xmlhttpRequest({
        method: 'GET', // 142.84
	url: nextPageLink,
	onload: function(response) {
        var iframeContentDocument = (iframe.contentWindow || iframe.contentDocument);
        if (iframeContentDocument.document) {
            iframeContentDocument = iframeContentDocument.document;
        }
        iframeContentDocument.getElementsByTagName('body')[0].innerHTML = response.responseText;
        processNextPage(iframeContentDocument);
        cbComplete();
	    }
   });
}

function createIframe() {
    var iframe = document.createElement('iframe');
    iframe.src = 'about:blank';
    iframe.style.width = 0;
    iframe.style.height = 0;
    iframe.style.border = 0;
    document.getElementsByTagName('body')[0].appendChild(iframe);

    return iframe;
}

/**
 * Get the entries from the next page, and insert them in to the
 * current page.
 */
function processNextPage(iframeContentDocument) {
    var ol_doc    = getMagazineArchives(document);
    var ol_iframe = getMagazineArchives(iframeContentDocument);

    // Record the next page to load
    nextPageLink = getNextPageLink();

    // Loop through entries on the iframe, appending to the main doc
    var entries = ol_iframe.childNodes;
    var entry;

    for (var i = 0, l = entries.length; i < l; i++) {
        entry = document.importNode(entries[i], true);
        ol_doc.appendChild(entry);
    }
}

function main() {
    var checkEvery = 100; // how frequently to check the scroll status (ms)
    var preloadDistance = 700; // start preloading this many px from bottom
    var isUpdating = false;
    var intervalTimer;
    var loadingNote;

    prepare_page();

    var startTimer = function() {
        intervalTimer = setInterval(checkAndLoad, checkEvery);
    }

    var checkAndLoad = function() {
        if (isUpdating == false && getScrollPositionFromBottom() < preloadDistance) {
            clearInterval(intervalTimer);
            isUpdating = true;
            showLoading();
            getNextPage(doneLoading);
        }
    }

    var showLoading = function() {
        loadingNote = document.createElement('span');
        loadingNote.style = "background-color: grey; height: 20px; width: 100%; align: center;";
        loadingNote.innerHTML = 'Loading...';
        getMagazineArchives(document).appendChild(loadingNote);
    }

    var doneLoading = function() {
        isUpdating = false;
        if (nextPageLink) {
            startTimer();
        }
        hideLoading();
    }

    var hideLoading = function() {
        loadingNote.parentNode.removeChild(loadingNote);
    }

    nextPageLink = getNextPageLink();

    if(nextPageLink) {
        startTimer();
    }
}

main();