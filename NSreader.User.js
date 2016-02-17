// ==UserScript==
// @name         Newscientist past issues infinite scroll
// @namespace    http://tampermonkey.net/hakt0-r/
// @version      0.4
// @description  Adds infinite scrolling to Newscientist past issues page and Use two iframes for magazine style reading.
// @author       hakt0r & CapType
// @match        https://www.newscientist.com/issues/
// @include      https://www.newscientist.com/issue/*
// @updateURL    https://github.com/hakt0-r/tmNS_enhancer/raw/master/NSreader.User.js
// @downloadURL  https://github.com/hakt0-r/tmNS_enhancer/raw/master/NSreader.User.js
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

function getNextPage(iframe, url, cbProcess) {
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
            getNextPage(iframe, nextPageLink, processNextPage);
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
		
		// end loading
		doneLoading();
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

    var iframe_article,
        iframe_toc,
        
    deleteElements = function(doc, elementsToDelete) {
        for (var i = 0; i < elementsToDelete.length; i++) {
            var elem = doc[elementsToDelete[i].func](elementsToDelete[i].value);
            if (elementsToDelete[i].index !== false) {
                elem = elem[elementsToDelete[i].index];
            }
            elem.parentNode.removeChild(elem);
        }
    },
    
    processLink = function(iframeContentDocument) {
        var elementsToDelete = [
            {func: 'getElementsByTagName', value: 'header', index: 0},
            {func: 'getElementsByTagName', value: 'footer', index: 1},
            {func: 'getElementsByTagName', value: 'nav', index: 0},
            {func: 'getElementsByClassName', value: 'leaderboard-container', index: 0},
            {func: 'getElementById', value: 'breadcrumbs', index: false},
        ];
        deleteElements(iframeContentDocument, elementsToDelete);
    },
        
    openLink = function() {
        getNextPage(iframe_article, this.href, processLink);
        return false;
    },
    
    init = function() {
        // Clean page
        var entry = document.importNode(document.getElementsByClassName('magazine-article-index')[0], true);
        var elementsToDelete = [
            {func: 'getElementsByTagName', value: 'header', index: 0},
            {func: 'getElementsByTagName', value: 'footer', index: 0},
            {func: 'getElementsByClassName', value: 'leaderboard-container', index: 0},
            {func: 'getElementById', value: 'main-container', index: false},
        ];
        deleteElements(document, elementsToDelete);
        
        // Toc Iframe
        iframe_toc = createIframe("30%", "90%");
        iframe_toc.style.float = "left";
        iframe_toc.style.border = "10px solid white";
        document.body.appendChild(iframe_toc);
        var d = iframe_toc.contentDocument;
        d.open();
        d.write(
            '<!DOCTYPE html>'+
            '<html lang="en-US" xmlns:fb="http://ogp.me/ns/fb#" xmlns:addthis="http://www.addthis.com/help/api-spec"  class="no-js">'+
            '<head>'+
            "<link href='//fonts.googleapis.com/css?family=Lato:100,300,400,700,900,100italic,300italic,400italic,700italic,900italic|PT+Serif:400,700,400italic,700italic' rel='stylesheet' type='text/css'>"+
            '<link rel="canonical" href="https://www.newscientist.com/issue/" />'+
            "<link rel='stylesheet' id='all-css-0' href='https://www.newscientist.com/_static/??-eJx1j81uAjEMhF+IxFpgQRwQj7JKE5M1yh+xU9i3b6hoL8BxPN/YHrgVZXMSTAIlNE+JIeFdPCblTQhYFyg1u2aFocxZsq1GaHoyELsV8D8zPTOTIy7BLMDSaftiVwxG0E0UjUfWlnkFbz4xzslMDN2H3KQ0+YhW5JIT0zeqQH6Wr3wHw4z97bNJdnnoy7X14/pPq0Fv9PZlo8wYfxvdFFvqE2LpPZaAOlJ64Kd4HLbjuFvvD8N4+QFFE3to' type='text/css' media='all' />"+
            '</head><body></body></html>'
        );
        d.close();

        d.body.innerHTML = entry.innerHTML;
        
        // Article Iframe
        iframe_article = createIframe("68%", '95%');
        iframe_article.style.float = "right";
        iframe_article.style.borderLeft = "3px black solid";
        document.body.appendChild(iframe_article);
        
        // Change links
        var links = iframe_toc.contentDocument.getElementsByTagName('a');
        getNextPage(iframe_article, links[0].href, processLink);
        for (var i=0; i < links.length; i++) {
            links[i].style['word-wrap'] = 'normal';
            links[i].style['white-space'] = 'normal';
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