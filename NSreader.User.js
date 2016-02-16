// ==UserScript==
// @name         Newscientist past issues infinite scroll + HTML5 e-magazine reader.
// @namespace    http://tampermonkey.net/hakt0-r/
// @version      0.1
// @description  Adds infinite scrolling to Newscientist past issues page
// @author       hakt0r, CapType
// @match        https://www.newscientist.com/issues/
// @updateURL    https://raw.github.com/hakt0-r/tmNS_enhancer/master/NSreader.User.js
// @downloadURL  https://raw.github.com/hakt0-r/tmNS_enhancer/master/NSreader.User.js
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// ==/UserScript==
'use strict';

function createIframe(if_width, if_height) {
    var ifrm = document.createElement('iframe');
    ifrm.src = 'about:blank';
    ifrm.style.width = if_width;
    ifrm.style.height = if_height;
    ifrm.style.border = 0;
    document.getElementsByTagName('body')[0].appendChild(ifrm);

    return ifrm;
}

function getNextPage(iframe, url, cbProcess, cbComplete) {
    GM_xmlhttpRequest({
        method: 'GET', // 142.84
        url: url,
        onload: function(response) {
            var iframeContentDocument = (iframe.contentWindow || iframe.contentDocument);
            if (iframeContentDocument.document) {
                iframeContentDocument = iframeContentDocument.document;
            }
            iframeContentDocument.getElementsByTagName('body')[0].innerHTML = response.responseText;
            cbProcess(iframeContentDocument);
            cbComplete();
        }
    });
}

var issues_scrolling = (function () {

    var nextPageLink,
    yearItems,
    currentYear = 1,
    iframe,
    checkEvery = 100,
    preloadDistance = 700,
    isUpdating = false,
    intervalTimer,
    loadingNote,
    
    /*
    *   Timer and Loading
    */
    startTimer = function() {
        intervalTimer = setInterval(checkAndLoad, checkEvery);
    },
        
    checkAndLoad = function() {
        if (isUpdating === false && getScrollPositionFromBottom() < preloadDistance) {
            clearInterval(intervalTimer);
            isUpdating = true;
            showLoading();
            getNextPage(iframe, nextPageLink, processNextPage, doneLoading);
        }
    },
    
    showLoading = function() {
        loadingNote = document.createElement('span');
        loadingNote.style = "background-color: grey; height: 20px; width: 100%; align: center;";
        loadingNote.innerHTML = 'Loading...';
        getMagazineArchives(document).appendChild(loadingNote);
    },
        
    doneLoading = function() {
        isUpdating = false;
        if (nextPageLink) {
            startTimer();
        }
        hideLoading();
    },
    
    hideLoading = function() {
        loadingNote.parentNode.removeChild(loadingNote);
    },
    
    /*
    *  Positions and elements
    */
    getScrollPositionFromBottom = function() {
        var scrollTop = (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;
        // accounting for cases where html/body are set to height:100%
        var scrollHeight = (document.documentElement && document.documentElement.scrollHeight) || document.body.scrollHeight;

        return scrollHeight - (scrollTop + window.innerHeight);
    },
    
    getMagazineArchives = function(doc) {
        return doc.getElementsByClassName('magazine-archive-issues')[0];
    },
    
    /*
    * Processing Pages
    */
    processNextPage = function(iframeContentDocument) {
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

        // replace all image as 146x191 canvas
        replace_all_images(ol_doc);
    },
        
    getNextPageLink = function() {
        if (currentYear < yearItems.length) {
            return "/issues/" + yearItems[currentYear++].value;
        }
    },
        
    /*
    *  Images
    */
    replace_all_images = function(ol_doc) {
        var images = ol_doc.getElementsByTagName('img');
        var loaded = 0;
        var inc = function() {
            loaded += 1;
            if (loaded === images.length) {
                image_as_canvas(images);
            }
        };
        for (var i = 0;i < images.length; i++) {
            var img = new Image();
            img.onload = inc;
            img.src = images[i].src;
        }
    },
        
    image_as_canvas = function(images) {
        for (var i = 0;i < images.length; i++) {
            var canvas = document.createElement('canvas'),
                context = canvas.getContext('2d');
            canvas.width = 146;
            canvas.height = 191;

            context.drawImage(images[i], 0, 0, 146, 191);
            images[i].parentNode.replaceChild(canvas, images[i]);
        }
    },
    
    /*
    *  Initialization
    */
    init = function() {
        // init variables
        yearItems =  document.getElementsByName('archive-dropdown')[0].options;
        iframe = createIframe(0, 0);
        
        // hide the year choice
        document.getElementsByClassName('magazine-archive-browser entry-form')[0].style.display = 'none';
        
        nextPageLink = getNextPageLink();

        if(nextPageLink) {
            startTimer();
        }
    };
    
    return {
        init: init
    };
}());

var issue_viewing = (function () {

    var iframe,
        tom,
    
    processLink = function(iframeContentDocument) {
        var elementsToDelete = [
            {func: 'getElementsByTagName', value: 'header', index: 0},
            {func: 'getElementsByTagName', value: 'footer', index: 1},
            {func: 'getElementsByTagName', value: 'nav', index: 0},
            {func: 'getElementsByClassName', value: 'leaderboard-container', index: 0},
            {func: 'getElementById', value: 'breadcrumbs', index: false},
        ];
        for (var i = 0; i < elementsToDelete.length; i++) {
            var elem = iframeContentDocument[elementsToDelete[i].func](elementsToDelete[i].value);
            if (elementsToDelete[i].index !== false) {
                elem = elem[elementsToDelete[i].index];
            }
            elem.parentNode.removeChild(elem);
        }
    },
    
    doneLink = function() {
        // NOOP
    },
        
    openLink = function() {
        getNextPage(iframe, this.href, processLink, doneLink);
        return false;
    },
    
    init = function() {
        tom = document.getElementsByClassName('magazine-article-index')[0];
        var entry = document.importNode(tom, true);
        entry.style.width = "30%";
        entry.style.float = "left";
        var main = document.getElementById('main-container');
        while(main.firstChild) {
           main.removeChild(main.firstChild);
        }
        main.appendChild(entry);
        iframe = createIframe("69%", entry.offsetHeight + 'px');
        iframe.style.float = "right";
        main.appendChild(iframe);
        var links = entry.getElementsByTagName('a');
        getNextPage(iframe, links[0].href, processLink, doneLink);
        for (var i=0; i < links.length; i++) {
            links[i].onclick = openLink;
        }
    };
    
    return {
        init: init
    };
}());


if (document.getElementsByClassName('magazine-cover-teaser issue-new-magazine-cover-teaser').length == 1) {
    issue_viewing.init();
} else {
    issues_scrolling.init();
}