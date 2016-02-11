// ==UserScript==
// @name         newscientist past issues infinite scroll
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Adds infinite scrolling to Newscientist past issues page
// @author       hakt0r
// @include      https://www.newscientist.com/issues/*
// @grant        unsafeWindow
// @require      http://code.jquery.com/jquery-2.1.4.min.js
// @require      https://greasyfork.org/scripts/11636-jscroll/code/jScroll.js?version=67302
// ==/UserScript==


$(document).ready(function() {
    $('div.article-content > section > select').parent().append('<ul id="new-archive-dropdown" class="pagination"> </ul>');
    $('div.article-content > section > select option').not(':selected').each(function(){
            $('#new-archive-dropdown').append('<li> <a href="/issues/' + $(this).val() + '">'+$(this).text() + '</a></li>');
    });
    $('div.article-content > section > select').remove();
    $('div.article-content > section > ul').attr('id', 'archive-dropdown');
    $('div.article-content > section > ul.pagination').parent().hide();  
//    $('#archive-dropdown').parent().hide();

    // Jscroll code
    $('.article-content').jscroll({
        debug: true,
        autoTrigger: true,
        padding: 100,
        nextSelector: 'ul.pagination > li > a',        
//        nextSelector: 'ul.pagination > li + li > a',
        contentSelector: '.article-content',
        pagingSelector : 'div.article-content > section > ul.pagination',
        callback: function (){
            $('div.jscroll-added > div.article-content > header.archive-header').remove();
            $('div.jscroll-added > div.article-content > section.magazine-archive-intro').remove();
            $('div.jscroll-added > div.article-content > section > select').parent().append('<ul id="new-archive-dropdown" class="pagination"> </ul>');
            $('div.jscroll-added > div.article-content > section > select option').not(':selected').each(function(){
                $('#new-archive-dropdown').append('<li> <a href="/issues/' + $(this).val() + '">'+$(this).text() + '</a></li>');
            });
            $('div.jscroll-added > div.article-content > section > select').remove();
            $('div.jscroll-added > div.article-content > section > ul').attr('id', 'archive-dropdown');
            $('div.jscroll-added > div.article-content > section > ul.pagination').parent().hide();        
        }        
    });
});

