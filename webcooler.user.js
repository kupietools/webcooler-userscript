// ==UserScript==
// @name WebCooler Staging
// @namespace http://www.kupietz.com/WebCooler
// @description	Version 3.3: Cools down my web experience by hiding content that tends to make me hot under the collar. For when your desire to be informed has been finally folder to your desire to stay sane.
// @include http://*
// @include https://*
// @grant none
// @require https://gist.githubusercontent.com/arantius/3123124/raw/grant-none-shim.js
// @require https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js
// ==/UserScript==
/*
    Author: Michael Kupietz https://www.kupietz.com

    This script is provided as-is. My javascript is sloppy, this was patched together with kite string and scotch tape over many years.
    It sucks. It will break your computer. You shouldn't use it.

        This program is free software: you can redistribute it and/or modify
        it under the terms of the GNU General Public License as published by
        the Free Software Foundation, either version 3 of the License, or
        (at your option) any later version.

        This program is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
        GNU General Public License for more details.

        You should have received a copy of the GNU General Public License
        along with this program. If not, see <http://www.gnu.org/licenses/>.

    Version: 3.3
    3.3 Added async, performance enhancements, contextual menu and keystroke unexemption options, lots of other stuff, read the diff. 
    3.2 added and subsequently removed debugout. Oh well. Added try/catch to main to hopefully alert on errors, since some browsers truncate logs despite your best efforts to see what the f you're doing.
    3.1 changed function main() to use mutation.addedNodes when available instead of mutation.target... seems way faster! Also fixed some bugs. YouTube pages work again. Created some code (currently commented out) to store log in comments in page <head> for when FireFox's console log is broken, like tonight.
    3.0 jshinted and added fb softblock by name
    2.5 finally get it to stop striking editable content (ie, deleting my facebook rants as I type them [NO! Doesn't work when theClosest contains editable, I think]) and optimized some code.
    2.02 - Myriad small changes. Read the diff.
    2.01 - changed line endings from mac \r to unix \n so tampermonkey can import from github.
    2.0 - updated to jQuery for fun and good times

*/
// Licensed for unlimited modification and redistribution as long as
// this notice is kept intact.

/* todo: configuration options https://github.com/odyniec/MonkeyConfig or https://github.com/sizzlemctwizzle/GM_config/ */

var observerEnable = true;
var bugout = new debugout();
/* sweitches & debugging options */
var CONSOLE_DEBUGGING_MESSAGES_ON = true ;//new RegExp(/normal|ultra|greencrit/,"gi");//true; //log debug messages? true|false|normal(non-categorized)|new RegExp("logClass1|logClass2|logClass3")
/*** CAUTION CONSOLE_DEBUGGING_MESSAGES_ON != false is a HUGE performance hit! It completely broke Twitter for me tonight. ***/
/*** TURN IT OFF WHEN YOU ARE DONE DEBUGGING. ***/
var TURN_CONSOLE_DEBUGGING_MESSAGES_ON_PHRASE = "trxpo"; //turn logging on if this is found. Debugging tool for catching sporadic problems that disappear when you turn on logging and reload the page.
var CONSOLE_MESSAGES_ADDED_TO_HEAD = false; //add messages to document head, for when FireFox annoyingly truncates logs
var HILIGHT_ONLY = false; //consider all pages exempt and hilite rather than remove. turn this on if the damn cookie system breaks again
var HILIGHT_ELEMENTS_BEING_PROCESSED = false; //visual cue as each page element is processed?
var RECORD_DEBUGGING_INFO_IN_NODE_ATTRIBUTES_AS_THEY_ARE_PROCESSED = false; //Do I even use this anymore? I dunno
var MAX_NUMBER_OF_CALLS_PER_PAGE = 1000000; //prevent endless loops. Set to very high number for actual production use.
var BLOCK_ONLY_IMAGES_CONTAINING_ONLY_TEXT = true; //hide FB

logForDebugging("Starting - logging ", CONSOLE_DEBUGGING_MESSAGES_ON);

this.$ = this.jQuery = jQuery.noConflict(true);
/* necessary for compatibility, according to https://wiki.greasespot.net/@grant */

/* from webcooler.xpi contentScript.js */

/***********************************************************************************************
    *********************************** USER GLOBAL VARIABLES GO HERE ******************************
    ************************************************************************************************/

/*** GLOBAL BLOCKING ***/

/* the below all are regexps. BadWords match text, ones marked as selectors match jquery selectors. */

var globalBadWords =
    "Breitbart|apricity|mansplain|gerrymander|steve king|mitch mcconnell|school shoot|huckabee[^'s]|rex reed|sarah sanders|red hen|fake news|roseanne|stormy *daniels|eagles of death metal|kanye west|kim kardashian|laughing ?squid|proud boy|parkland|stoneman douglas|sandy hook|kaepernick|dylann roof|Arpaio|John Bolton|Rick Santorum|crisis actor|[^A-Z]*NRA[^A-Z]*|scott pruitt|maxine waters|environmentalist|religious (freedom|liberty|right)|patriot prayer|deep state|crooked hillary|Conservative Political Action Conference|cpac|actblue|truthdig|huckabee sanders|sexual misconduct|goyim|shithole countr|\'shithole\'|\"shithole\"|(blue|all|white) lives matter|raw water|assault rifle|shkreli|political[lly]* correct|social justice|roy moore|white nationalist|manafort|rob *schneider|the ?blaze|confederate flag|\\bsharia\\b|hillary clinton|bill ?o['’]?reilly|Wilbur Ross|o[’']?reilly ?factor|\\bTrump\\b|ajit pai|ann coulter|tucker carlson|bill maher|spicer|actblue|mccain|Hannity|David\\ Brock|Daily ?Stormer|alex jones|daily caller|bill nye|rachel maddow|infowars|rand paul|keith olbermann|Angus ?King|Cernovich|ann coulter|roger stone|climate deni[ae]|townhall\\.com|richard ?b?\\.? ?spencer|slate.com|paul joseph watson|prison ?planet|s1\\.zetaboards\\.com|anthroscape|daily ?kos|gamergate|betsy devos|steve bannon|\#*maga[^a-z]|corporate america|healthcare|marine le pen|red ?pill|Yiannopoulos|geert wilders|vox day|huffington ?post|cuckservative|libtard|Bernie Sanders|SJW|alt-right|Tim Pool|Chelsea Clinton|\\@potus|\\@realdonaldtrump|safe\ space|(\\.|\\!) sad\\!|racist|Bernie bros|zero ?hedge|This Tweet is unavailable|liberal propaganda|supremacist|liberal media|electoral landslide|typical liberal|white privilege|Robert Morris|Robert Tappan Morris|Morris Worm|stormfront";
/* Please note, my personal collection of badWords is selected not by political ideology, but by what seems to attract either the most heated or the most egregiously stupid comments and content online, regardless of political slant. Any apparent political alignment is strictly a 'shoe fits' situation. Also a couple of what I think are totally biased and unreliable propaganda sites and commentators on both ends of the spectrum. */
var selectorsToConsiderTogether =
    'aside|#hyperfeed_story_id|li[data-hveid]|div[data-hook="review"]|li.yt-shelf-grid-item.yt-uix-shelfslider-item';
/* block higher-level elements if any descendant elements contain badwords. Like, remove a whole tweet, or a whole fb reply, not just the <div> containing the badword. Otheriwse it looks for the smallest element it can remove. */
/* aside is on guardian.com, but maybe it's used eslewher, I dunno */
var selectorsToAlwaysHide = "div.cnnoutbrain|div.outbrain-hotlist|div.outbrain-module";
/* hide some page structures no matter what. Good for blocking ads, etc. Can also use ':has([hiddenbyscript=true])' selector to always block certain parent elements if they contain an element the script has hidden, so the empty parent elements don't display. */

/*** SITE-BY-SITE BLOCKING ***/

/* block extra words on a site-by-site basis, like, fer instance, twitter and facebook, where ignorant people are particularly vocal: */
/* note: \b word boundaries doesn't work in userscript. We need \\b in the string, because the string just passes \b as 'b'. \b is a regex code, not recognized by strings. */
var siteSpecificBadWords = {

    /* social media sites*/
    "twitter.com$|reddit.com$|facebook.com$|youtube.com$": "jill stein|traitor|Ivanka|same[- ]sex|Jared Kushner|\\bpence\\b|\\bgender\\b|nikki haley|MSM|deplorable|medicaid|melania|the left|climate change|global warming|russia|walmart|wal-mart|[^a-zA-Z]NRA[^a-zA-Z]|nader|climate scien|single[ -]*payer|racism|net neutrality|gubb[aer]+m[ie]+nt|(second|2nd) amendment|government spend|prsident|zionis|taxpayer|anti-*semit|republican|democratic party|democrats?\\b|liberals|healthcare|extremist|comey\\b|narrative|libertarian|antifa\\b|bakedalaska|protestor|conservatives|poor people|gov'?t|climate change|terroris[tm]|tax plan|snowflake|global warming|drain the swamp|feminis[tm]|\\bMRA|PUA\\b|unborn|\\btwp|rac(ial|e) realism|venezuela|abortion|\\bISIS\\b|devos|communist|commie|socialist|\\bweev\\b|aurenheimer|white (house|guys)|obama|bDNC\\b|cultural\\ appropriation|hate\\ crime|\RNC\\b|democratic socialism|leftist|rightist|mar-?a-?lago|(white|black|brown) *(wom[ae]n|m[ae]n|people|(-*skin))|burqa|Kellyanne\\ Conway|illegal alien|\\bTrump\\b|white nationalist|Nazi|This tweet is unavailable.",
    "twitter.com$": "\\bshill\\b",
    /*common troll comment on twitter, used in other ways on non-political Reddit subs */
    "tumblr.com": "#branflake|#kung-fu kutie",
    "facebook.com$": "[0-9][0-9][0-9] shares",
    /* news sites */
    "abcnews.go.com$|feedly.com$|newsblur.com$|apnews.com|reuters.com|theguardian.com|npr.org|hosted.ap.org": "molester|world cup|civility|transgender|missile|same[- ]sex|Ivanka|Jared Kushner|\\bNFL\\b|gorsuch|tensions|kim jong un|Pence|N(\\.|orth) Korea|Rod Dreher"
};

/* never run on sites matching these */
/*ok, this is really dumb, but I have some personal sites (social media, etc) I don't want to publicly associate myself with. */
/* So, since I post this script publicly, I created the StupidHash function (see below) that inserts a wchash attribute into */
/* the body of each page. You can put the page's wchash here instead of the url. */
var exemptSites = "fivethirtyeight.com$|18297985.81780946|139514\.47879774484|H1269643.1719910516|78882\.83274254062|.gov[^.]|.gov$|H784\.1647977343692|H2603.8344187906177"; //URL or wchash or wchashhost
/* 78882.83274254062 = Dave M */
/* Now, some useful definitions for the below sections: */
var fb_OutermostWhiteBox = "div._4-u2"; /*Does this ever change? We'll see. */
var fb_post = "div.fbUserContent"; /* entire post */
var fb_postContent =
    "div._1dwg"; /*._1dwg is around post content (the top) but not comments or the bar with "like, share" etc. */

/* site-specific extras to consider with selectorsToConsiderTogether: */
var siteSpecificSelectorsToConsiderTogether = {
    "youtube.com$": ".video-list-item|ytd-compact-video-renderer",
    "tumblr.com$": "li.post_container|article",
    "twitter.com$": 'div.TweetWithPivotModule|div.MomentCapsuleSummary--card|.TwitterCard|.QuoteTweet|.CardContent|li[data-item-type="tweet"]|.ProfileCard|li.trend-item|.js-account-summary.account-summary.js-actionable-user',
    /* removed twitter:'.js-stream-item.stream-item' because was hiding entire 'tweets you might have missed' if one matched */
    "reddit.com$": '.noncollapsed|.was-comment|.recipient|.message ',
    "google.com$": "div.g|div._oip._Czh|g-section-with-header|div._NId>div.srg>div.g",
    "facebook.com$": 'div[aria-label="Comment"]|article._55wo|div[role=article]|li.jewelItemNew|div._3soj|div.UFIRow.UFIComment|div._1yt|li._5my2|li._58rc|div._4-u3|' + fb_postContent,
    /* li._5my2 is 'trending' row. div.div._4-u3 is a "related article" beneath a share.
    li._58rc is a 'related content' box. div._1yt is a search result post */
    "mbasic.facebook.com$": 'div[role="article"]|div#m_story_permalink_view>div>div>div>div',
    "feedly.com$": "div.feed-large.item.feed|div.entry|div.entry.unread.u4.density-29",
    "abcnews.go.com$": "article.news-feed-item",
    "theguardian.com$": "li.fc-slice__item|li.headline-list__item|li.right-most-popular-item",
    "usatoday.com": "a.srrfsm-link",
    "nytimes.com$": "li.collection-item|div.Recirculation-recirculationItem--1bXrY|ul.menu.layout-horizontal.theme-story li|aside.trending-module div ol li",
    "bbc.com$": "div.features-and-analysis__story",
    "newsblur.com$": "div.NB-story-title.NB-story-grid.NB-story-neutral",
    "npr.org$": "div.story-recommendations__result",
    "time.com$": "article.tile"

};
/* div._NId>div.srg>div.g google search result */
/* li.jewelItemNew is notification row */
/*div[role=article] is mbasic.facebook.com article */
/* I *think* div._3soj is a notification popup bubble. */
/* article._55wo touch.facebook.com article */
/* Other things to always hide. Useful to, say, hide an entire facebook post only if the main comment comtains badwords, but _not_ if a reply comment does.
    (Hence siteSpecificSelectorsToConsiderTogether wouldn't do the trick.) */

var siteSpecificSelectorsToAlwaysHide = {

    "facebook.com$": "div.pagelet-group.pagelet|div[role='article']:has(img[alt*='may contain: text'])|div.UFIRow.UFIComment[hiddenbyscript=true]+div.UFIReplyList|div[data-referrer='pagelet_trending_tags_and_topics']|" +
        fb_OutermostWhiteBox +
        ":has(" + fb_postContent + "[hiddenbyscript=true])|" +
        fb_OutermostWhiteBox +
        ":has(div._14bf)",
    "youtube.com$": "ytd-video-meta-block > ytd-badge-supported-renderer",
     "reuters.com$":"div.container_19G5B:has(h1[hiddenbyscript=true])|div.container_19G5B:has(a[href=\"/news/archive/rcom-sponsored\"])", /* article where title is hidden */
    /* get rid of annoying corproate channels */
    "twitter.com$": "div.promoted-tweet|div[data-disclosure-type=promoted]|div[data-advertiser-id]|div[data-promoted=true]",
    "abcnews.go.com$": "article.article:has(header.article-header:has([hiddenbyscript=true]))|article.artcle:has(div.article-copy[hiddenbyscript=true])" /*hide article if headline is hidden or whole article body is hidden*/
};
/* NOTE: div._4-u2 is the outer container for a facebook post (and any other white box on their gray background as of this writing. Does this ever change? We'll see. div.fbUserContent is right inside that and seems less likely to change, but the outer one has the margins. */
/* ._5r69 seems to be the div surrounding a shared post. */ /* _5x46 is the header with who posted and who it was shared from */ /* div._14bf is either "suggested post" or "sponsored" */ /* div.pagelet-group.pagelet is suggested pages (or is it groups? Or both?) */
/* use div[role='article']:has(img[alt~='text'][alt*='may contain:']) to block any FB images that contain text even if the contain other things. */
/* before simplification, FB also had "div.fbUserContent:has(div.fbUserContent:has(div.userContent[hiddenbyscript=true]))|div._4-u2.mbm._4mrt._5jmm._5pat._5v3q._4-u8:has(div.userContent:has([hiddenbyscript=true]))|div._5r69:has([hiddenbyscript=true])|div._5x46:has([hiddenbyscript=true])|div._4-u2.mbm._4mrt._5jmm._5pat._5v3q._4-u8:has(div._5x46[hiddenbyscript=true])|div._4-u2.mbm._4mrt._5jmm._5pat._5v3q._4-u8:has(div._1dwg[hiddenbyscript=true])|" */

/*** END BLOCKING LISTS ***/

/* following vars not used yet: */
var badFBURLWords = "xyz123xyz"; /* FB username part of url */
var badFBNames = "abc123abc"; /*FB Name*/
var badURLWords =
    ".*trump.*|zippyaudio2|propublica|crowdignite|zerohedge|dailymail|hannitylive|townhall\.com|everydayfeminism|huffingtonpost|breitbart|jezebel|buzzfeed|zergnet|outbrain"; //urls to block links to, etc
/* block links containing badURLWords in href. Not yet implemented. */

/* NOTES: */
/* There's a :regex jQuery selector at https://j11y.io/javascript/regex-selector-for-jquery/ */
/* TO DO: Do a folder action that watches for TamperMonkey backups in dropbox, runs a script to decompress and copy this script into the GitHub repo, and use command line commands to upload to GitHub. */
/* TO DO: Maybe make a list of less bad words that only block if match() returns a list of more than 1 of them. Like "believe|lies|", "Trump|unfair" or "o'reilly|fox" or something. */
/* TO DO: mark editable elements as soon as found and ignore subsequently, even if they stop being editable at any point, as some do on complex social media sites. */
/* TO DO: implement badURLWords. */
/* To DO: Perhaps actually remove innerHTML of hidden elements to lighten page. See if it makes a difference in performance. */
/* Am I still using the sessionIDs to prevent redundant checks? Should probably switch them to jquery .data() and use again if not. */
/*I should prob have mutationobserver just mark nodelist with a class, then use jquery to find them, pare them down using descentant and contains and selectorsToConsiderTogether selectors, and style them using '.css='>
/* contains() example: $( "div:contains('John')" ).css( "text-decoration", "underline" ); */
/* highlight leaf nodes containing text (beware, case-sensitive): $('*:contains("I am a SIMPLE string")').each(function(){ logForDebugging("~~~ √173√ 'function( )' ~ ~ ~","","ULTRA"); if($(this).children().length < 1) $(this).css("border","solid 2px green") });
        ^^More info, including wrapping found text in tags, at http://stackoverflow.com/questions/926580/find-text-string-using-jquery */
/* not() selector: https://api.jquery.com/not-selector/ */
/* how to run a callback function on all text nodes matching a string or regexp: http://stackoverflow.com/questions/4060056/jquery-find-replace-without-changing-original-text/4060635#4060635 */
/* .text() method returns innerText, ignoring embedded tags. "a<i>b</i>c".text() returns "abc".
        ^^ if you wanted to get just "ac" from that, see http://viralpatel.net/blogs/jquery-get-text-element-without-child-element/ */
/* Use .each() and $(this) to iterate: $('.someDivList .divItem').each(function() { logForDebugging("~~~ √179√ 'function( ) ' ~ ~ ~","","ULTRA");
	$(this).css('background', 'lightblue');
        }); */
/* how to use jQuery on node lists, such as mutation records: http://stackoverflow.com/questions/12596231/can-jquery-selectors-be-used-with-dom-mutation-observers
    it's as easy as setting: var jq = $(mutation.addedNodes); */
/* good docs on what mutation returns (addedNodes, removedNodes, changed attributes, etc.): https://davidwalsh.name/mutationobserver-api
        good, simple MutationObserver demo (be sure to show Console to see mutation object returned) https://jsfiddle.net/dimshik/p9gx43Lx/*/
/* to catch all changes including text nodes, config = {
attributes: true, childList: true, characterData: true, subtree: true} */
/* check for display:none : $(element).is(":visible"); */
/* find some way not to be triggered on user input */
/* .closest starts with current node and traverses upwords until matching selector is found. https://api.jquery.com/closest/ */
/* .parentsUntil() traverses up tree and finds child of node matching selector. */
/* get all leaf nodes: $("div").filter( function(index) { logForDebugging("~~~ √191√ 'function( index) ' ~ ~ ~","","ULTRA");
        var isLeaf = $(this).children().length === 0;
        return isLeaf;
        }
); */
/* check if js has access to iframe contents: http://stackoverflow.com/questions/11872917/check-if-js-has-access-to-an-iframes-document. This way we can
have it act on same-domain iframes, like twitter uses for article embeds. */

/*** USER: END GLOBAL VARIABLES ***/

/* Let's get our variables together & tailored to whatever the current site is */

logForDebugging("Checking keys now");
globalBadWords = attachSiteSpecifics(globalBadWords, siteSpecificBadWords);
logForDebugging("globalBadWords ", globalBadWords);
selectorsToConsiderTogether = attachSiteSpecifics(selectorsToConsiderTogether, siteSpecificSelectorsToConsiderTogether);
var selectorsToConsiderTogetherRegex = selectorsToConsiderTogether.replace(/\|/g, ",");
logForDebugging("selectorsToConsiderTogether ", selectorsToConsiderTogether);
selectorsToAlwaysHide = attachSiteSpecifics(selectorsToAlwaysHide, siteSpecificSelectorsToAlwaysHide);
var selectorsToAlwaysHideRegex = selectorsToAlwaysHide.replace(/\|/g, ",");
logForDebugging("selectorsToAlwaysHide ", selectorsToAlwaysHide);

var exemptRegexp = new RegExp(exemptSites, "gi");
var theBadFBURLWords = new RegExp("https?\:\/\/[w.]*facebook\.com\/(" + badFBURLWords + ")[?/]", "gi");
var theBadFBNames = new RegExp("mdelimiter(" + badFBNames + ")mdelimiter", "gi");

/* this was to save debout's log by hitting the Option key. Right now, debugout is disabled again due to mysterious errors, so, disabled.
$(document).keydown(function (e) {
    if (e.keyCode == 18) {
        bugout.downloadLog();
    }
});
*/


if (typeof GM_registerMenuCommand == 'undefined') {
  function GM_registerMenuCommand(caption, commandFunc, accessKey) {
    if (!document.body) {
      console.error('GM_registerMenuCommand got no body.');
      return;
    }
    let menu = document.getElementById('gm-registered-menu');
    if (!menu) {
      menu = document.createElement('menu')
      menu.setAttribute('id', 'gm-registered-menu');
      menu.setAttribute('type', 'context');
      document.body.appendChild(menu);
      document.body.setAttribute('contextmenu', 'gm-registered-menu');
    }
    let menuItem = document.createElement('menuitem');
    menuItem.textContent = caption;
    menuItem.addEventListener('click', commandFunc, true);
    menu.appendChild(menuItem);
  }
}



$(document).keydown(function (e) {
    console.log(e);
    if (e.originalEvent.ctrlKey && e.originalEvent.altKey && e.originalEvent.shiftKey && e.originalEvent.keyCode == 32) {
        exemptThisPage(0); //EXEMPT PAGE WITH CTRL-OPTION-SHIFT-SPACE
    }
      if (e.originalEvent.ctrlKey && e.originalEvent.altKey && e.originalEvent.shiftKey && e.originalEvent.code == "KeyL") {
        CONSOLE_DEBUGGING_MESSAGES_ON=(CONSOLE_DEBUGGING_MESSAGES_ON==false); //turn off logging with CTRL-OPTION-SHIFT-L
        alert("logging is now "+CONSOLE_DEBUGGING_MESSAGES_ON);
    }
});



logForDebugging("########### PRELIMINARY DECLARATIONS FINISHED ############################### ");

function attachSiteSpecifics(globalString, siteSpecificArray) {
    logForDebugging("~~~ √224√ starting 'function attachSiteSpecifics( globalString, siteSpecificArray) ' ~ ~ ~", "", "ULTRA");
    logForDebugging("Attaching site specifics for ", globalString);
    Object.keys(siteSpecificArray).forEach(function(key) {
        logForDebugging("~~~ √226√ starting 'function( key) ' ~ ~ ~", "", "ULTRA");
        logForDebugging("Checking key ", key);
        var value = siteSpecificArray[key];
        var hostRegexp = new RegExp(key, "gi");
        var hostMatch = document.location.hostname.match(hostRegexp);
        logForDebugging("About to match 3 ", hostMatch);
        if (hostMatch !== null) {
            logForDebugging("~~~ √235√ 'if ( hostMatch !== null) ' ~ ~ ~", "", "ULTRA");
            globalString = (globalString == "" ? "" : globalString + "|") + value;
            logForDebugging("added site-specific " + key);

        }
        logForDebugging("~~~~~ √226√ ending 'function( key) ' ~ ~ ~ ~ ~", "", "ULTRA");
    });

    logForDebugging("~~~~~ √224√ ending 'function attachSiteSpecifics( globalString, siteSpecificArray) ' ~ ~ ~ ~ ~", "", "ULTRA");
    return globalString;
}

/* Create our artisanal handcrafted regexes to use below */
var theBadWords = new RegExp(globalBadWords, "gi");
var theBadWordsAndFBNames = new RegExp("(" + globalBadWords + ")|(" + badFBNames + ")", "gi");
/* Note currently used:
var theNotAsBadWords = new RegExp(notAsBadWords, "gi");
var theBadWords_forURLs = new RegExp(badURLWords, "gi");
var allBadWords = new RegExp(badURLWords + "|" + notAsBadWords + "|" + globalBadWords, "gi");
*/
$.extend($.expr[":"], {
    followsWebCooled: function(a) {

        return $(a).prev().attr("hiddenByScript") == "true";
    }
}); /* maybe I'll use this... someday... */

$(document.body).attr("wcHash", stupidHash(document.location.href)); /* custom hash usable in exemptsites variable */
$(document.body).attr("wcHashHost", "H" + stupidHash(document.location.hostname)); /* custom hash usable in exemptsites variable */

function stupidHash(theString) {

    var j;
    var out = 1;
    for (j = 0; j < theString.length; j++) {

        out = out * (1.0001 + ((theString.charCodeAt(j)) + j) / (256 + j));
    }
    return out.toString();
}

async function mainScript(elLengthOld, theDelay, mutation, sessionID, currentMatches) {
    logForDebugging("~~~ √270√ starting 'function main( elLengthOld, theDelay, mutation, sessionID,currentMatches) ' ~ ~ ~", "", "ULTRA");
    /* big stuff happens here */
    logForDebugging("Main running. Mutation:", mutation);
    logForDebugging("Main running mutation.length:", mutation.length);
    logForDebugging("Main running. currentMatches:", currentMatches);
    observerEnable = false;
    var thisActiveElement = document.activeElement;
    /* var thisTarget = $(mutation.target); */
    var i;
    var loopLength = (mutation.type = "childList" ? mutation.addedNodes.length : 1);
    for (i = 0; i < loopLength; i++) { //begin for loop to hit all added nodes
        logForDebugging("In for loop:", "iteration " + i + " of " + loopLength);
        var targetNotJQ = mutation.type = "childList" ? mutation.addedNodes[i] : mutation.target; //we checked that addedNodes has length >0 before calling main(), so no error here
        var thisTarget = $(targetNotJQ);
        //only check the mut.target if no nodes are recorded as having been added
        var mutationParent = thisTarget.parent();
        /* You know, if the mutationtype is "added nodes", you can get the added nodes from the mutation object and just check those. If nodes are removed, it may be marked "added nodes" but then the addednodes attribute is empty and removednodes is not. */
        logForDebugging("ThisTarget is: (about to detach):", thisTarget);
        logForDebugging("mutationParent:", mutationParent);
        /* for next line: thisTarget is an OBJECT, not a page elemnt! you have to get the page element by index! */
        /* userscripts are triggered when body is added... that's why we can't detach and re-add the body, it'll get stuck in  a loop. Maybe shoudl add an attrubute to the body or something to let it do it once but not again. */
        if (!!thisTarget.length && thisTarget[0].tagName != "BODY") {
            logForDebugging("~~~ √278√ 'if( thisTarget.tagName != ''BODY'') ' ~ ~ ~:", thisTarget[0].tagName, "ULTRA"); /* something was interfering with a lot of normal page operations, things were reloading, etc. I'm hoping this conditional fixes it. */
            var placeholder = $('<span style="display: none;" />').insertAfter(thisTarget);

            thisTarget.detach();

        }
        //makes things faster
        /* DIDN'T WORK... see bottom of main function */
        if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
            logForDebugging("~~~ √284√ 'if ( HILIGHT_ELEMENTS_BEING_PROCESSED) ' ~ ~ ~", "", "ULTRA");
            observerEnable = false;
            targetNotJQ.style =
                "border: 5px dotted rgba(100,0,100,1) !important; background:rgb(100,0,100) !important;" +
                targetNotJQ.style;
            thisTarget.data("highlighted", true);
            observerEnable = true;

        }

        logForDebugging("checking node:", targetNotJQ);
        if (typeof thisTarget.data() === "object" &&
            (!thisTarget.data("scriptprocid") ||
                thisTarget.data("scriptprocid") != sessionID)
        ) {
            logForDebugging("~~~ √296√ starting 'if ( typeof thisTarget.data() === ''object'' && 298 (!thisTarget.data(''scriptprocid'') || 299 thisTarget.data(''scriptprocid'') != sessionID) 300 ) ' ~ ~ ~", "", "ULTRA");
            wcSetAttributeSafely(targetNotJQ, "scriptprocid", sessionID);
            logForDebugging("Confirmed not yet checked this session:", targetNotJQ);
            logForDebugging("about to find selectorsToConsiderTogether:", "");
            /* I should skip this and the next if the top-level node's inner text doesn't contain badwords, save some time cycling through them */

            /* var theseNodes=thisTarget
            .find("*")
            .addBack(); */
            thisTarget
                .find(selectorsToConsiderTogetherRegex).addBack(selectorsToConsiderTogetherRegex)
                .filter(function() {
                    logForDebugging("~~~ √312√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");
                    if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
                        logForDebugging("~~~ √313√  'if ( HILIGHT_ELEMENTS_BEING_PROCESSED) ' ~ ~ ~", "", "ULTRA");
                        /* debugger; */
                        this.style =
                            "border: 5px dotted rgba(0,0,160,1) !important; background:rgba(0,0,255,.5) !important;" +
                            this.style;
                        $(this).data("highlighted", true);

                    }
                    var theBadWordsFound = $(this).text().match(currentMatches) ? $(this).text().match(theBadWords) : null; /* check current matches first to save time, then check against actual regex so partial text matches dont cause false positives (IE 'hanran' doesn't match "NRA" in the second one.) */
                    if (theBadWordsFound !== null && (!$(this).data("scriptprocid") ||
                            $(this).data("scriptprocid") != sessionID) &&
                        /* was: !$(this).prop("isContentEditable") */
                        (thisActiveElement.tagname == "BODY" ? true : (!!$(this).prop("isContentEditable") == false && $(this).has("[contenteditable]").length == 0)) /* rejects anything with editable descendants */
                    ) {
                        logForDebugging("~~~ √321√ starting 'if ( theBadWordsFound!== null && (!$(this).data(''scriptprocid'') || 324 $(this).data(''scriptprocid'') != sessionID) && 325 /* was: !$(this).prop(''isContentEditable'') */ 326 ( thisActiveElement.tagname==''BODY''?true: ($(this).prop(''isContentEditable'')==false && $(this).has(''[contenteditable]'').length==0)) /* rejects anything with editable descendants */ 327 ) ' ~ ~ ~", "", "ULTRA");
                        if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
                            logForDebugging("~~~ √328√ 'if ( HILIGHT_ELEMENTS_BEING_PROCESSED) ' ~ ~ ~", "", "ULTRA");
                            /* debugger; */
                            this.style =
                                "border: 5px dotted rgba(0,160,160,1) !important; background:rgba(0,255,255,.5) !important;" +
                                this.style;
                            $(this).data("highlighted", true);

                        }

                        logForDebugging("found '" + theBadWordsFound + "' in selectorsToConsiderTogether", this);
                        logForDebugging("~~~~~ √321√ ending 'if ( theBadWordsFound!== null && (!$(this).data(''scriptprocid'') || 324 $(this).data(''scriptprocid'') != sessionID) && 325 /* was: !$(this).prop(''isContentEditable'') */ 326 ( thisActiveElement.tagname==''BODY''?true: ($(this).prop(''isContentEditable'')==false && $(this).has(''[contenteditable]'').length==0)) /* rejects anything with editable descendants */ 327 ) ' ~ ~ ~ ~ ~", "", "ULTRA");
                        return true;
                    } else {
                        logForDebugging("~~~ √321√  'else ', returning false ~ ~ ~", "", "ULTRA");

                        return false;
                    }
                    logForDebugging("~~~~~ √312√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");
                })
                .each(function() {
                    logForDebugging("~~~ √347√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");
                    if (thisPageIsExempt) {
                        logForDebugging("~~~ √348√ 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");
                        $(this)
                            .css("border", "3px solid red")
                            .css("background", "rgba(255,225,225,.5)")
                            .attr("hiddenByScript", "true");
                        logForDebugging("TEST added red to", this);

                    } else {
                        logForDebugging("~~~ √353√ 'else ' ~ ~ ~", "", "ULTRA");
                        $(this)
                            .hide()
                            .data("savedstyle", $(this).attr("style"))
                            .attr("style", "display:none !important")
                            .attr("hiddenByScript", "true");

                    }
                    wcSetAttributeSafely(this, "scriptprocid", sessionID);
                    logForDebugging("added red to", this);
                    logForDebugging("~~~~~ √347√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");
                });

            /* TEXT NODES ONLY NOW: */
            var walk = thisTarget /*find ordinarily only returns child elements unless you add addBack.*/
                /* .find(':visible:not("iframe")').addBack(':visible:not("iframe")') */
                .find(':not("iframe,script,style")').addBack(':visible:not("iframe,script,style")')
                .contents() /* like children() but also includes text and comment nodes */
                .filter(function() {
                     return (this.nodeType === 3);
                })
                .filter(function() {
                    logForDebugging("~~~ √372√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");
                    logForDebugging("filtering node:", this, "greenCrit");
                    logForDebugging("filtered nodeValue is:", this.nodeValue, "greenCrit");
                  /*  logForDebugging("filtered node value - currentMatches is:", currentMatches, "greenCrit"); */
                    /* logForDebugging("filtered node value - theBadWords is:", theBadWords,"greenCrit"); */

                    var theBadWordsNodeValueFound =  this.nodeValue.match(/[a-zA-Z]*/) ?this.nodeValue.match(currentMatches) ? this.nodeValue.match(theBadWords) : null:null; /* first make sure theres even text content to filter *//*see comment above on previous use of this about this */
                    var theCriteria =
                        theBadWordsNodeValueFound !== null &&
                        (thisActiveElement.tagName == "BODY" ? true : (!!$(this).prop("isContentEditable") == false && !!$(this).has("[contenteditable]").length == false)); /* rejects anything with editable descendants */
                    /* was !$(this).prop( "isContentEditable" ) /~ cant use === false because .prop("isContentEditable") === undefined for text nodes ~/ */
                    /* update... !!value will coerce value=undefined to false */
                    var tempVar = $(this);
                    var theCritResult = {
                        "overall": theCriteria,
                        "theBadWordsNodeValueFound": theBadWordsNodeValueFound,
                        "thisActiveElement": thisActiveElement,
                        "thisActiveElement.tagName": thisActiveElement.tagName,
                        "!!$(this).prop('isContentEditable')": !!tempVar.prop("isContentEditable"),
                        "!!$(this).has('[contenteditable]').length==false)": !!tempVar.has("[contenteditable]").length == false
                    };
                    logForDebugging("the filter returns (true for include):", theCritResult, "greenCrit");
                    if (theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) {

                        logForDebugging("456 Matched green ", theBadWordsNodeValueFound, "greenCrit");

                    }
                    if (!theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) {
                        logForDebugging("~~~ √393√ 'if ( !theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) ' ~ ~ ~", "", "ULTRA");
                        logForDebugging("theBadWordsNodeValueFound ", theBadWordsNodeValueFound, "greenCrit");
                        logForDebugging("document.activeElement.tagName ", thisActiveElement.tagName, "greenCrit");
                        logForDebugging("$(this) ",
                            $(this)
                        );
                        logForDebugging("$(this).prop(isContentEditable) ",
                            $(this).prop("isContentEditable"), "greenCrit"
                        );
                        logForDebugging("$(this).has([contenteditable]).length ",
                            $(this).has("[contenteditable]").length, "greenCrit"
                        );


                    }
                    logForDebugging("~~~~~ √372√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");
                    return theCriteria;
                });
            logForDebugging("about to walk text leaves:", walk);

            walk.each(function() {
                logForDebugging("~~~ √420√ starting 'function( ) ' ~ ~ ~","beginning to look for selectors to consider together", "ULTRA");
                logForDebugging("walking text leaf:", this[0] || this); /* don't know why this[0] is sometimes, maybe always, not evaluating. don't care right now. maybe needs to be $(this)[0]?*/
                var theClosest = $(this).closest(selectorsToConsiderTogetherRegex); /* I need to use nextUntil() and prevUntil() to add consecutive sibling dd's and dt's to theClosest so one doesn't get left if the other is removed. See https://en.wikipedia.org/wiki/List_of_music_considered_the_worst for example. Too tired to do it right now though. */
                var theClosestBlock = theClosest.length === 0 ? $(this).closest("p,div,td,table,h1,h2,h3,h4,h5,h6,li,dd,dt" /* '[style*=display:block]'*/ ) : theClosest;
                theClosest = theClosest.length === 0 ? theClosestBlock : theClosest;
                /* sometimes the mutation target is just a text node that changed (like clicking a "more" link on facebook. In that case, see if it's enclosed in one of selectorsToConsiderTogether before just looking for the closest() parent block element. */
                logForDebugging("theClosestBlock:", theClosestBlock);
                logForDebugging("theClosest:", theClosest);
                if (thisPageIsExempt) {
                    logForDebugging("~~~ √437√ starting 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");
                    theClosest
                        .css("border", "1px solid green")
                        .css("background", "rgba(225,255,225,.5)")
                        .attr("hiddenByScript", "true");
                    if (theClosest != theClosestBlock) {

                        theClosestBlock
                            .css("border", "1px dotted darkgreen")
                            .css("background", "rgba(200,255,200,.5)")
                            .attr("hiddenByScript", "true");
                       logForDebugging("495 Setting css for (theClosest != theClosestBlock)", theClosestBlock, "ULTRA");
                    }
                    logForDebugging("~~~~~ √437√ ending 'if ( thisPageIsExempt) ' ~ ~ ~ ~ ~", "", "ULTRA");
                } else {

                    theClosest
                        .hide()
                        .data("savedstyle", theClosest.attr("style"))
                        .attr("style", "display:none !important")
                        .attr("hiddenByScript", "true");
                 logForDebugging("~~~~~ √437√ ELSE (page isn't exempt) ' ~ ~ ~ ~ ~", theClosest, "ULTRA");
                }
                logForDebugging("added green to", theClosest[0] || theClosest); /* don't know why theClosest[0] is sometimes, maybe always, not evaluating. don't care right now. */
                logForDebugging("~~~~~ √420√ ending 'function( ) ' ~ ~ ~ ~ ~", "endinging looking for selectors to consider together", "ULTRA");
            });
            logForDebugging("done walking text leaves", walk);

            /* NOW A ONLY */
            var theseAnodes = thisTarget
                .find("span.fwb, a[data-hovercard]").addBack("span.fwb, a[data-hovercard]").filter(function() {
                    logForDebugging("filtering theseAnodes",  this, "ULTRA"); // WAS .find("A,span.fwb") , BUT DON'T NEED A, NAME IS ENOUGH

                    return (typeof $(this).data() === "object" &&
                        (!$(this).data("scriptprocid") ||
                            $(this).data("scriptprocid") != sessionID)); /* it seemed to work without this semicolon, but jshint said I need it. */

                });
            /* that was A selectors to consider together, this is other A nodes */

            var aWalk = theseAnodes /*find ordinarily only returns child elements unless you add addBack.*/

                .filter(function() {
                    logForDebugging("~~~ √475√ 'function( ) ' ~ ~ ~", "", "ULTRA");
                    wcSetAttributeSafely(this, "scriptprocid", sessionID);
                    var itsAhref = false; /* was (typeof this.href) === 'string' && (this.href.match(theBadFBURLWords) || ("mdelimiter"+$(this).text()+"mdelimiter").match(theBadFBNames)) && this.href != "#"; */
                    var itsFWBSpan = (typeof this.tagName) === 'string' && this.tagName == "SPAN" /* fails if not uppercase */ && $(this).hasClass("fwb");
                    var itsDataHovercard = (typeof this.tagName) === 'string' && this.tagName == "A" && $(this).is("[data-hovercard]");
                    var itsAname = (itsFWBSpan || itsDataHovercard) && ("mdelimiter" + $(this).text() + "mdelimiter").match(theBadFBNames);
                    logForDebugging("found A section fwb span", $(this).text());
                    /* logForDebugging("itsAname",itsAname);
                    logForDebugging("(typeof this.tagName) === 'string'",(typeof this.tagName) === 'string');
                    logForDebugging("this.tagName=='span'",this.tagName);
                    logForDebugging("$(this).hasClass('fwb')",$(this).hasClass("fwb"));
                    logForDebugging("('mdelimiter'+$(this).text()+'mdelimiter').match(theBadFBNames)",("mdelimiter"+$(this).text()+"mdelimiter").match(theBadFBNames));*/


                    return (itsAhref || itsAname);
                })
                .filter(function() {
                    logForDebugging("~~~ √490√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");
                    logForDebugging("filtering A section pt II node:", this);
                    logForDebugging("filtered A section pt II node value is:", this.nodeValue);
                    var theCriteria =

                        (thisActiveElement.tagName == "BODY" ? true : (!!$(this).prop("isContentEditable") == false && $(this).has("[contenteditable]").length == 0)); /* rejects anything with editable descendants */
                    /* was !$(this).prop( "isContentEditable" ) /~ cant use === false because .prop("isContentEditable") === undefined for text nodes ~/ */
                    logForDebugging("the A section filter returns (true for include):",
                        theCriteria
                    );
                    if (theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) {
                        logForDebugging("~~~ √503√ starting 'if ( theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) ' ~ ~ ~", "", "ULTRA");
                        if ((typeof this.href) === "string" && this.href.match(theBadFBURLWords)) {

                            logForDebugging("Matched purple href ", this.href.match(theBadFBURLWords));

                        } else {

                            logForDebugging("Matched purple contents ", ("mdelimiter" + $(this).text() + "mdelimiter").match(theBadFBNames));


                        }

                        logForDebugging("~~~~~ √503√ ending 'if ( theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) ' ~ ~ ~ ~ ~", "", "ULTRA");
                    }

                    logForDebugging("~~~~~ √490√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");
                    return theCriteria;
                });
            logForDebugging("about to walk A leaves in A section:", aWalk);

            aWalk.each(function() {
                logForDebugging("~~~ √526√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");
                logForDebugging("walking A section leaf:", this[0] || this); /* don't know why this[0] is sometimes, maybe always, not evaluating. don't care right now. maybe needs to be $(this)[0]?*/
                var theClosest = $(this).closest(selectorsToConsiderTogetherRegex); /* I need to use nextUntil() and prevUntil() to add consecutive sibling dd's and dt's to theClosest so one doesn't get left if the other is removed. See https://en.wikipedia.org/wiki/List_of_music_considered_the_worst for example. Too tired to do it right now though. */
                var theClosestBlock = theClosest.length === 0 ? $(this).closest("p,div,td,table,h1,h2,h3,h4,h5,h6,li,dd,dt" /* '[style*=display:block]' */ ) : theClosest;
                theClosest = theClosest.length === 0 ? theClosestBlock : theClosest;
                /* sometimes the mutation target is just a text node that changed (like clicking a "more" link on facebook. In that case, see if it's enclosed in one of selectorsToConsiderTogether before just looking for the closest() parent block element. */
                logForDebugging("theClosestBlock:", theClosestBlock);
                logForDebugging("theClosest:", theClosest);
                if (thisPageIsExempt == true) {
                    logForDebugging("~~~ √543√ starting 'if ( thisPageIsExempt == true) ' ~ ~ ~", "", "ULTRA");
                    theClosest
                        .css("border", "1px solid aqua")
                        .css("background", "rgba(150,250,250,.5)")
                        .attr("hiddenByScript", "true");
                    if (theClosest != theClosestBlock) {
                        logForDebugging("~~~ √548√ 'if ( theClosest != theClosestBlock) ' ~ ~ ~", "", "ULTRA");
                        theClosestBlock
                            .css("border", "1px dotted aqua")
                            .css("background", "rgba(150,250,250,.5)")
                            .attr("hiddenByScript", "true");

                    }
                    logForDebugging("~~~~~ √543√ ending 'if ( thisPageIsExempt == true) ' ~ ~ ~ ~ ~", "", "ULTRA");
                } else {
                    logForDebugging("~~~ √554√ 'else ' ~ ~ ~", "", "ULTRA");
                    theClosest
                        .hide()
                        .data("savedstyle", theClosest.attr("style"))
                        .attr("style", "display:none !important")
                        .attr("hiddenByScript", "true");

                }
                logForDebugging("added aqua to", theClosest[0] || theClosest); /* don't know why theClosest[0] is sometimes, maybe always, not evaluating. don't care right now. */
                logForDebugging("~~~~~ √526√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");
            });
            logForDebugging("done walking A section text leaves", aWalk);

            logForDebugging("~~~~~ √296√ ending 'if ( typeof thisTarget.data() === ''object'' && 298 (!thisTarget.data(''scriptprocid'') || 299 thisTarget.data(''scriptprocid'') != sessionID) 300 ) ' ~ ~ ~ ~ ~", "", "ULTRA");
        } else {
            logForDebugging("~~~ √571√ 'else ' ~ ~ ~", "", "ULTRA");
            logForDebugging("skipped crit1:", targetNotJQ);
            logForDebugging("skipped crit2: typeof thisTarget.data():", typeof thisTarget.data());
            logForDebugging("skipped crit3:thisTarget.data(scriptprocid) :", thisTarget.data("scriptprocid"));
            logForDebugging("skipped crit4: sessionID:", sessionID);

            wcSetDebuggingAttributeSafely(targetNotJQ, "thisNodeSkippedForSession", sessionID);

        }

        /* Now let's check for wrongly hidden things. this is because sometimes Twitter seems to be setting input fields temporarily to uneditable while backspace key is being hit, and the script jumps in and hides them. */

        /* this isn't the best way to do this, I don't think. Sometimes a hiddenbyscript element CONTAINS an editable one. Not sure if this catches those. (UPDATE: seems to be working, will fix if it doesn't always. */
        if (thisActiveElement.tagName != "BODY") {
            logForDebugging("~~~ √585√ starting 'while backspace key is being hit, and the script jumps in and hides them. */ 586 587 588 /* this isn't the best way to do this, I don't think. Sometimes a hiddenbyscript element CONTAINS an editable one. Not sure if this catches those. (UPDATE: seems to be working, will fix if it doesn't always. */ if(thisActiveElement.tagName != ''BODY'') ' ~ ~ ~", "", "ULTRA"); /* only do if there is an active input element */

            var hiddenWalk = thisTarget
                .find("[hiddenByScript=true]:has([contenteditable])")
                .addBack("[hiddenByScript=true]:has([contenteditable])");
            if (thisPageIsExempt) {
                logForDebugging("~~~ √594√ starting 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");
                hiddenWalk.each(function() {
                    logForDebugging("~~~ √595√ 'function( ) ' ~ ~ ~", "", "ULTRA");
                    logForDebugging("unhiding text leaf:", this);

                    $(this)
                        .css("border", "1px solid blue")
                        .css("background", "#CCCCFF")
                        .css("background", "rgba(225,225,255,.5)")
                        .attr("style", $(this).data("savedstyle"))
                        .attr("hiddenByScript", "");

                    logForDebugging("added blue to", $(this));

                });
                logForDebugging("~~~~~ √594√ ending 'if ( thisPageIsExempt) ' ~ ~ ~ ~ ~", "", "ULTRA");
            } else {
                logForDebugging("~~~ √608√ starting 'else ' ~ ~ ~", "", "ULTRA");
                hiddenWalk.each(function() {
                    logForDebugging("~~~ √609√ 'function( ) ' ~ ~ ~", "", "ULTRA");
                    logForDebugging("unhiding text leaf:", this);
                    $(this).show().attr("hiddenByScript", "");
                    logForDebugging("added blue to", $(this));

                });
                logForDebugging("~~~~~ √608√ ending 'else ' ~ ~ ~ ~ ~", "", "ULTRA");
            }
            logForDebugging("~~~~~ √585√ ending 'while backspace key is being hit, and the script jumps in and hides them. */ 586 587 588 /* this isn't the best way to do this, I don't think. Sometimes a hiddenbyscript element CONTAINS an editable one. Not sure if this catches those. (UPDATE: seems to be working, will fix if it doesn't always. */ if(thisActiveElement.tagName != ''BODY'') ' ~ ~ ~ ~ ~", "", "ULTRA");
        }

        var theSelectorsToAlwaysHide = $(document.body) /*don't use thisTarget -- the selector to always hide can sometimes be in the mutationTarget but not in the addedNodes (UPDATE THIS. USE THE MUTATION.TARGET, NOT THE DOCUMENT.BODY AND SEE IF IT WORKS.*/
            .find(selectorsToAlwaysHideRegex)
            .not("[hiddenbyscript]");
        //while (theSelectorsToAlwaysHide ) { logForDebugging("~~~ √620√ starting 'while (theSelectorsToAlwaysHide ) ' ~ ~ ~","","ULTRA");
        theSelectorsToAlwaysHide.each(function() {
            logForDebugging("~~~ √621√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");
            /* we do this _after_ seaching for badwords so selectortoalwayshide that use [hiddenbyscript] will get catch things that were just hidden */

            if (thisPageIsExempt) {
                logForDebugging("~~~ √624√ 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");
                $(this)
                    .css("border", "1px solid orange")
                    .css("background", "rgba(255,240,225,.5")
                    .attr("hiddenByScript", "true");
                logForDebugging("Added orange to", $(this));

            } else {
                logForDebugging("~~~ √630√ 'else ' ~ ~ ~", "", "ULTRA");
                $(this).hide().attr("hiddenByScript", "true");
                logForDebugging("Added orange to", $(this));

            }

            logForDebugging("added orange to", this);
            logForDebugging("~~~~~ √621√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");
        });
        // theSelectorsToAlwaysHide =thisTarget.find(selectorsToAlwaysHide.replace(/\|/g, ",")).not("[hiddenbyscript]");
        //logForDebugging("~~~~~ √620√ ending 'while (theSelectorsToAlwaysHide ) ' ~ ~ ~ ~ ~","","ULTRA");}
        if (!!thisTarget.length && thisTarget[0].tagName != "BODY") {
            logForDebugging("~~~ √639√ 'if( thisTarget[0].tagName != ''BODY'') ' ~ ~ ~:", thisTarget, "ULTRA");
            /* thisTarget is an OBJECT, not a page elemnt! you have to get the page element by index! */
            thisTarget.insertBefore(placeholder);
            logForDebugging("thisTarget inserted", thisTarget);
            placeholder.remove(); /* DIDN'T WORK... see top of main function */

        }
    } //end for loop
    observerEnable = true;
    logForDebugging("~~~~~ √270√ ending 'function main( elLengthOld, theDelay, mutation, sessionID,currentMatches) ' ~ ~ ~ ~ ~", "", "ULTRA");
} //end main()

//*************** BEGIN GLOBAL SCOPE ****************//

//******* My own functions for global scope ********//

function logForDebugging(string, object, logClass = "normal") {
    if (logClass.match(CONSOLE_DEBUGGING_MESSAGES_ON) || CONSOLE_DEBUGGING_MESSAGES_ON === true) {
        console.log(string, object); /* bugout.log(string);bugout.log(object);*/

        if (CONSOLE_MESSAGES_ADDED_TO_HEAD) {
            observerEnable = false;
var d = new Date();

            var it = document.createElement("message");
            it.setAttribute("time", d.getTime());
            it.setAttribute("msg", string);
            it.innerText = (JSON.stringify({
                object
            }, function (k, v) { return k ? "" + v : v; })).replace(/\n/g,"¶").replace(/¶¶+/g,"¶")+"\n";
            document.head.appendChild(it);
            observerEnable = true;
        }
    }
}

function wcSetAttributeSafely(node, attribute, value) {
    logForDebugging("~~~ √656√ starting 'function wcSetAttributeSafely( node, attribute, value) ' ~ ~ ~", "", "ULTRA");
    if (typeof $(node).data() === "object") {
        logForDebugging("~~~ √657√ 'if ( typeof $(node).data() === ''object'') ' ~ ~ ~", "", "ULTRA");
        $(node).data(attribute, value);

    } else if (node.nodeType == 3) {
        logForDebugging("~~~ √659√ 'if ( node.nodeType == 3) ' ~ ~ ~", "", "ULTRA");
        wcSetDebuggingAttributeSafely(node.parentNode, attribute + "__in_child_" + node.nodeValue.replace(/\b/g, "") + "__",
            value
        );

    }
    //else {node.textContent=node.textContent + "{§"+attribute+"="+value+"§}"}
    logForDebugging("~~~~~ √656√ ending 'function wcSetAttributeSafely( node, attribute, value) ' ~ ~ ~ ~ ~", "", "ULTRA");
}

function wcSetDebuggingAttributeSafely(node, attribute, value) {
    logForDebugging("~~~ √669√ starting 'function wcSetDebuggingAttributeSafely( node, attribute, value) ' ~ ~ ~", "", "ULTRA");
    if (RECORD_DEBUGGING_INFO_IN_NODE_ATTRIBUTES_AS_THEY_ARE_PROCESSED == true) {
        logForDebugging("~~~ √670√ starting 'if ( RECORD_DEBUGGING_INFO_IN_NODE_ATTRIBUTES_AS_THEY_ARE_PROCESSED == true) ' ~ ~ ~", "", "ULTRA");
        if (typeof $(node).data() === "object") {
            logForDebugging("~~~ √671√ 'if ( typeof $(node).data() === ''object'') ' ~ ~ ~", "", "ULTRA");
            $(node).data(attribute, value);

        } else if (node.nodeType == 3) {
            logForDebugging("~~~ √673√ 'if ( node.nodeType == 3) ' ~ ~ ~", "", "ULTRA");
            wcSetDebuggingAttributeSafely(node.parentNode, attribute + "__in_child_" + node.nodeValue.replace(/\b/g, "") + "__",
                value
            );

        }
        //else {node.textContent=node.textContent + "{§"+attribute+"="+value+"§}"}
        logForDebugging("~~~~~ √670√ ending 'if ( RECORD_DEBUGGING_INFO_IN_NODE_ATTRIBUTES_AS_THEY_ARE_PROCESSED == true) ' ~ ~ ~ ~ ~", "", "ULTRA");
    }
    logForDebugging("~~~~~ √669√ ending 'function wcSetDebuggingAttributeSafely( node, attribute, value) ' ~ ~ ~ ~ ~", "", "ULTRA");
}

function exemptThisPage() {
    logForDebugging("~~~ √712√ 'function exemptThisPage( ) ' ~ ~ ~", "", "ULTRA");
    //red star in lower right corner was clicked

    var theLocMatch = new RegExp("<url>" + escape(encodeURIComponent(document.location.href)) + "<endurl>",
        "gi"
    );
    theCurrPrefString = theCurrPrefString.replace(theLocMatch, ""); //remove previous instances of URL in list
    logForDebugging("EXEMPTION: Cookies are: ", docCookies.getItem("exemptPage"));
    docCookies.setItem("exemptPage", theCurrPrefString + "<url>" + escape(encodeURIComponent(document.location.href)) +
        "<endurl>", 9999999
    );
    logForDebugging("EXEMPTION: removing URL: ", theLocMatch);
    logForDebugging("EXEMPTION: Cookies are now: ", docCookies.getItem("exemptPage"));
    location.reload(true);

}

function unexemptThisPage() {
    logForDebugging("~~~ √736√ 'function unexemptThisPage( ) ' ~ ~ ~", "", "ULTRA");
    //green star in lower right corner was clicked
    logForDebugging("EXEMPTION: unexempting");
    var theLocMatch = new RegExp("<url>" + escape(encodeURIComponent(document.location.href)) + "<endurl>",
        "gi"
    );
    logForDebugging("EXEMPTION: Cookies are: ", docCookies.getItem("exemptPage"));
    logForDebugging("EXEMPTION: theLocMatch is: ", theLocMatch);
    logForDebugging("EXEMPTION: theCurrPrefString is: ", theCurrPrefString);
    logForDebugging("EXEMPTION: theCurrPrefString.replace(theLocMatch, '') is: ",
        theCurrPrefString.replace(theLocMatch, "")
    );
    docCookies.setItem("exemptPage", theCurrPrefString.replace(theLocMatch, "x"), 999999);
    logForDebugging("EXEMPTION: Writing URL: ", theLocMatch);
    logForDebugging("EXEMPTION: Cookies are now: ", docCookies.getItem("exemptPage"));
    location.reload(true);

}

function addUnblockLink(foundString) {
    logForDebugging("~~~ √759√ starting 'function addUnblockLink( foundString) ' ~ ~ ~", "", "ULTRA");
    //put little star in lower right corner of window to toggle between element hiding/highlighting
    //observer.disconnect();

    logForDebugging("EXEMPTION: add unblock link function start");
    var tempObserverEnable = observerEnable;
    observerEnable = false;
    var aMain = "";
    var blockString = thisPageIsExempt ? "reblock" : "unblock";
    if (!document.getElementById("pageBlocked_5832_xfi")) {
        logForDebugging("~~~ √768√ 'if ( !document.getElementById(''pageBlocked_5832_xfi'')) ' ~ ~ ~", "", "ULTRA");
        aMain = document.createElement("div");

    } else {
        logForDebugging("~~~ √770√ 'else ' ~ ~ ~", "", "ULTRA");
        var bMain = document.getElementById("pageBlocked_5832_xfi");
        aMain = bMain.parentNode;
        blockString = (aMain.title + ", ")
            .toLowerCase()
            .replace(foundString.toLowerCase(), "")
            .replace(", ,", ",")
            .replace(new RegExp(blockString + " ?, ?", ""), blockString + " ");

    }
    aMain.addEventListener("click", function() {
            logForDebugging("~~~ √779√ 'function( ) ' ~ ~ ~", "", "ULTRA");
            logForDebugging("EXEMPTION: clicked exempt");
            exemptThisPage(0);

        },
        false
    );
    aMain.addEventListener("mouseout", function() {
            logForDebugging("~~~ √787√ 'function( ) ' ~ ~ ~", "", "ULTRA");
            document.getElementById("pageBlocked_5832_xfi").style =
                "width:12px;height:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#ff3300";

        },
        false
    );
    aMain.addEventListener("mouseover", function() {
            logForDebugging("~~~ √795√ 'function( ) ' ~ ~ ~", "", "ULTRA");
            document.getElementById("pageBlocked_5832_xfi").style =
                "width:32px;height:32pxtext-align:center;display:block;cursor:pointer;font-size:24px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#ff3300";

        },
        false
    );

    logForDebugging("tagname 2");
    /* do NOT let an automated checker tell you it should be "=== undefined" in the next line - that breaks the script! */
    if (document.getElementById("tinymce") == undefined ||
        document.getElementById("tinymce").tagName != "BODY"
    ) {
        logForDebugging("~~~ √806√ starting 'if ( document.getElementById(''tinymce'') == undefined || 808 document.getElementById(''tinymce'').tagName != ''BODY'' 809 ) ' ~ ~ ~", "", "ULTRA");
        //don't run in iframes generated by tinymce rich text editor - fix to block from running in Tumblr post dialogs
        aMain.title = blockString + foundString;
        if (thisPageIsExempt) {
            logForDebugging("~~~ √812√ 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");
            //display on Exempt pages
            aMain.innerHTML.firstChild =
                "<li id='pageBlocked_5832_xfi' style='width:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#66ff00'>*</li>";

        } else {
            logForDebugging("~~~ √816√ 'else ' ~ ~ ~", "", "ULTRA");
            //display on non-Exempt pages
            aMain.innerHTML =
                "<li id='pageBlocked_5832_xfi' style='width:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#ff3300'>*</li>";

        }
        logForDebugging("~~~~~ √806√ ending 'if ( document.getElementById(''tinymce'') == undefined || 808 document.getElementById(''tinymce'').tagName != ''BODY'' 809 ) ' ~ ~ ~ ~ ~", "", "ULTRA");
    } else {
        logForDebugging("~~~ √821√ 'else ' ~ ~ ~", "", "ULTRA");
        logForDebugging("didn't add unblock link due to tinymce presence");

    }
    document.body.appendChild(aMain);
    logForDebugging("added unblock link", aMain);
    observerEnable = tempObserverEnable;
    logForDebugging("~~~~~ √759√ ending 'function addUnblockLink( foundString) ' ~ ~ ~ ~ ~", "", "ULTRA");
}

//******* End my own functions for global scope ********//

/* don't run at all on excluded sites */
logForDebugging("exempt regexp", exemptRegexp);
logForDebugging("exempt document.location.href", document.location.href);
logForDebugging("regexp is ", document.location.href.match(exemptRegexp));
logForDebugging("regexp result ", (document.location.href.match(exemptRegexp) === null));
logForDebugging("Page stupidHash is ", stupidHash(document.location.href));
logForDebugging("stupidHash regexp result ", (stupidHash(document.location.href).match(exemptRegexp) === null));

if (document.location.href.match(exemptRegexp) === null && stupidHash(document.location.href).match(exemptRegexp) === null && ('H' + stupidHash(document.location.hostname)).match(exemptRegexp) === null) {
    logForDebugging("~~~ √838√ starting 'if ( document.location.href.match(exemptRegexp) === null && stupidHash(document.location.href).match(exemptRegexp) === null && ('H'+stupidHash(document.location.hostname)).match(exemptRegexp) === null ) ' ~ ~ ~", "", "ULTRA");
    logForDebugging("page didn't match exemptions, running inside main look");
    //*** Here comes Mozilla's cookie framework... ***//

    /*\
    |*|
    |*| :: cookies.js ::
    |*|
    |*| A complete cookies reader/writer framework with full unicode support.
    |*|
    |*| https://developer.mozilla.org/en-US/docs/DOM/document.cookie
    |*|
    |*| This framework is released under the GNU Public License, version 3 or later.
    |*| http://www.gnu.org/licenses/gpl-3.0-standalone.html
    |*|
    |*| Syntaxes:
    |*|
    |*| * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
    |*| * docCookies.getItem(name)
    |*| * docCookies.removeItem(name[, path], domain)
    |*| * docCookies.hasItem(name)
    |*| * docCookies.keys()
    |*|
    \*/

    var docCookies = {

            getItem: function(sKey) {
                logForDebugging("~~~ √864√ 'function( sKey) ' ~ ~ ~", "", "ULTRA");
                return (decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" +
                        encodeURIComponent(sKey).replace(/[\-\.\+\*\(\)]/g, "\\$&") +
                        "\\s*\\=\\s*([^;]*).*$)|^.*$"
                    ),
                    "$1"
                )) || null);

            },
            setItem: function(sKey, sValue, vEnd, sPath, sDomain, bSecure) {
                logForDebugging("~~~ √878√ starting 'function( sKey, sValue, vEnd, sPath, sDomain, bSecure) ' ~ ~ ~", "", "ULTRA");
                if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
                    logForDebugging("~~~ √879√ 'if ( !sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) ' ~ ~ ~", "", "ULTRA");


                    return false;
                }
                var sExpires = "";
                if (vEnd) {
                    logForDebugging("~~~ √883√ starting 'if ( vEnd) ' ~ ~ ~", "", "ULTRA");
                    switch (vEnd.constructor) {

                        case Number:
                            sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
                            break;
                        case String:
                            sExpires = "; expires=" + vEnd;
                            break;
                        case Date:
                            sExpires = "; expires=" + vEnd.toUTCString();
                            break;
                    }
                    logForDebugging("~~~~~ √883√ ending 'if ( vEnd) ' ~ ~ ~ ~ ~", "", "ULTRA");
                }
                document.cookie =
                    encodeURIComponent(sKey) +
                    "=" +
                    encodeURIComponent(sValue) +
                    sExpires +
                    (sDomain ? "; domain=" + sDomain : "") +
                    (sPath ? "; path=" + sPath : "") +
                    (bSecure ? "; secure" : "");

                logForDebugging("~~~~~ √878√ ending 'function( sKey, sValue, vEnd, sPath, sDomain, bSecure) ' ~ ~ ~ ~ ~", "", "ULTRA");
                return true;
            },
            removeItem: function(sKey, sPath, sDomain) {
                logForDebugging("~~~ √906√ starting 'function( sKey, sPath, sDomain) ' ~ ~ ~", "", "ULTRA");
                if (!sKey || !this.hasItem(sKey)) {
                    logForDebugging("~~~ √907√ 'if ( !sKey || !this.hasItem(sKey)) ' ~ ~ ~", "", "ULTRA");


                    return false;
                }
                document.cookie =
                    encodeURIComponent(sKey) +
                    "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" +
                    (sDomain ? "; domain=" + sDomain : "") +
                    (sPath ? "; path=" + sPath : "");

                logForDebugging("~~~~~ √906√ ending 'function( sKey, sPath, sDomain) ' ~ ~ ~ ~ ~", "", "ULTRA");
                return true;
            },
            hasItem: function(sKey) {
                logForDebugging("~~~ √917√ 'function( sKey) ' ~ ~ ~", "", "ULTRA");

                return new RegExp("(?:^|;\\s*)" +
                    encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") +
                    "\\s*\\="
                ).test(document.cookie);
            },
            keys: /* optional method: you can safely remove it! */ function() {
                logForDebugging("~~~ √924√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");
                var aKeys = document.cookie
                    .replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "")
                    .split(/\s*(?:\=[^;]*)?;\s*/);
                for (var nIdx = 0; nIdx < aKeys.length; nIdx++) {

                    aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]);
                }

                logForDebugging("~~~~~ √924√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");
                return aKeys;
            }

        }
        //*** End Mozilla's cookie framework... ***//
    logForDebugging("EXEMPTION: Cookies coming ", docCookies.getItem());
    logForDebugging(" EXEMPTION: stringified ", JSON.stringify(docCookies));

    var theCurrPrefString = docCookies.getItem("exemptPage") || "";
    logForDebugging("EXEMPTION: theCurrPrefString ", theCurrPrefString);
    var thisPageIsExempt = HILIGHT_ONLY || !(theCurrPrefString.match("<url>" + escape(encodeURIComponent(document.location.href)) + "<endurl>") === null);
    logForDebugging("EXEMPTION: thisPageIsExempt ", thisPageIsExempt);
      if (thisPageIsExempt) {
          GM_registerMenuCommand("Unexempt this page", unexemptThisPage, "");
                logForDebugging("~~~ √970√ starting 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");
                //add div to allow user to unexempt page
                var aMain = document.createElement("div");

                /* create clickable div to exempt page */
                aMain.addEventListener("click", function() {
                    logForDebugging("~~~ √973√ 'function( ) ' ~ ~ ~", "", "ULTRA");
                    unexemptThisPage(0);

                }, false);
                //anonymous function() { logForDebugging("~~~ √979√ 'function( ) ' ~ ~ ~","","ULTRA");exemptThisPage(0);} is necessary because exemptThisPage(0) on its own thinks I mean "the value returned from exemptThisPage(0)" and immediately fires the function to calculate that.
                aMain.innerHTML =
                    "<li style='width:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999;border:1;bottom:0;right:0;color:#66ff00'>*</li>";
                observerEnable = false;
                document.body.appendChild(aMain); /* did the above li need no ID? I guess not, but check this if something breaks. */
                observerEnable = true;
                /* end creating clickable div to exempt page */

                logForDebugging("~~~~~ √970√ ending 'if ( thisPageIsExempt) ' ~ ~ ~ ~ ~", "", "ULTRA");
      } else
      {  GM_registerMenuCommand("Exempt this page", exemptThisPage, "");}
    var theDummy = {

        addedNodes: [document.body],
        /* mutation.addedNodes is a nodelist, not an element*/
        target: document.body /* mutation.target is an element*/
    };
    var aMutationObserver =
        window.MutationObserver || window.WebKitMutationObserver;
    /* watch the page for changes. A lot of page load content later by AJAX or other javascript. */

    //****** START MUTATIONONSERVER *******//

    var observer = new aMutationObserver(function(mutations, observer) {

        logForDebugging("~~~ √950√ starting 'function( mutations, observer) ' ~ ~ ~ for NEW MUTATIONS:", mutations, "ULTRA");
        if (observerEnable) {
               observerEnable = false; /* debugger; */
            logForDebugging("~~~ √951√ starting 'if ( observerEnable) ' ~ ~ ~", "", "ULTRA");
            observer.disconnect();
            var thisSessionID = Math.random();

            var theNodes = mutations /*|| document.body.childNodes*/; /* do we really need that bit? commenting to see if anything breaks */
            logForDebugging("theNodes is ", theNodes, "observer")
                /* $("html,body").css("cursor", "not-allowed"); Don't know what this was for, suspect it was funkifying my youtube experience */

            logForDebugging("About to forEach theNodes", theNodes);
            theNodes.forEach(function(mutation) {
                logForDebugging("~~~ √989√ starting 'function( mutation) ' ~ ~ ~", "", "ULTRA");

                logForDebugging("forEach this node of TheNodes", mutation);
                if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
                          observerEnable = false;
                    logForDebugging("~~~ √992√ 'if ( HILIGHT_ELEMENTS_BEING_PROCESSED) ' ~ ~ ~", "", "ULTRA");

                    mutation.target.style =
                        "border: 5px dotted rgba(200,200,200,1) !important; background:rgb(200,200,200) !important;" +
                        mutation.target.style;
                    $(mutation.target).data("highlighted", true);
                    observerEnable = true;

                }
                if(CONSOLE_DEBUGGING_MESSAGES_ON != false) {
                logForDebugging("OBSERVED: 1. testing mutation: " + $(mutation.target).text().substr(0, 50), mutation, "observer");
                logForDebugging("OBSERVED: 2. testing mutation target tagname: " + $(mutation.target).text().substr(0, 50), mutation.target.tagName, "observer");
                logForDebugging("OBSERVED: 3. testing mutation target innerHTML: " + $(mutation.target).text().substr(0, 50), mutation.target.innerHTML, "observer");
}
                if ((mutation.target.tagName != "BODY" || $(document.body).data("firstrun") != thisSessionID) && mutation.type == "childList" && !mutation.addedNodes[0].isContentEditable) {
                    logForDebugging("~~~ √1006√ starting 'if ( mutation.target.tagName != ''BODY'' || $(document.body).data(''firstrun'') != thisSessionID ) ' ~ ~ ~. mutation.target.tagName is ", mutation.target.tagName, "ULTRA");
                    logForDebugging("~~~ √1006√   $(document.body).data(''firstrun'') = ",  $(document.body).data("firstrun") , "ULTRA");
                    logForDebugging("~~~ √1006√ thisSessionID = ", thisSessionID , "ULTRA");
                    /* just added these 7/4/18: && mutation.type == "childList" && !mutation.addedNodes[0].isContentEditable - can remove from nested conditional below if works for a while */
                    logForDebugging("~~~ √1006√ mutation.type = ", mutation.type , "ULTRA");
                    logForDebugging("~~~ √1006√ mutation.addedNodes[0] = ", mutation.addedNodes[0] , "ULTRA");
                    //just process the changed bits, not the whole body more than once per session, ok?
                    $(document.body).data("firstrun", thisSessionID);
                    if(CONSOLE_DEBUGGING_MESSAGES_ON != false) {
                    logForDebugging("Passing as mutation for session ID " + thisSessionID + ":", mutation);
                    logForDebugging("raw innerHTML to check:", mutation.target.innerHTML);}
if (mutation.target.innerHTML.match(TURN_CONSOLE_DEBUGGING_MESSAGES_ON_PHRASE)) {CONSOLE_DEBUGGING_MESSAGES_ON=true; logForDebugging("Turning logging on, found: ",TURN_CONSOLE_DEBUGGING_MESSAGES_ON_PHRASE); }
                    var theMutTargetText = (mutation.target.innerHTML || "").replace(/\<(IMG[^>]*)>/gi, " $1 ").replace(/\<[^>]*>/gi, " "); //keep the image tags for the alt attributes, and replace all other html with spaces to separate text blocks.
                    logForDebugging("About to create theseMatches, theMutTargetText is:", theMutTargetText);

                    var theseMatches = theMutTargetText.match(theBadWordsAndFBNames);

                    if (--MAX_NUMBER_OF_CALLS_PER_PAGE > 0 && !!theMutTargetText && (theseMatches) /* If we go back to scanning URL hrefs, this will have to be disabled, because it will need to check nodes even if bad terms are not in visible text. */ ) {
                        logForDebugging("~~~ √1029√ starting 'if ( --MAX_NUMBER_OF_CALLS_PER_PAGE > 0 && !!theMutTargetText && ( theseMatches) ) ' ~ ~ ~", "", "ULTRA");
                        logForDebugging("about to shift",theseMatches);

                        var shift = theseMatches.shift();
                        logForDebugging("About to create theNewMatches from theseMatches:", theseMatches);
                        var theNewMatches = new RegExp(theseMatches.join("THEPIPEGOESHERE372333319").replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/THEPIPEGOESHERE372333319/gi, '|'), "gi"); //the replace is to sanitize string... if "]NRA[" is in the test of the page, this RegExp will choke without sanitization

                        if (!$(document.body).data("FirstMutation")) {
                            logForDebugging("~~~ √1042√ 'if ( !$(document.body).data(''FirstMutation'')) ' ~ ~ ~", "We're in the condition to check the BODY on the first pass", "ULTRA");
                            /* on the very first time this is called on a page, use the whole body to make sure everything gets checked once. */
                            logForDebugging("First Mutation for page. passing Body.");
                            $(document.body).data("FirstMutation", true);
                            /* debugger; */
                            mainScript(-1, 5000, theDummy, thisSessionID, theNewMatches);
                            addUnblockLink( /*theCatch*/ "x"); /* this needs to run every time main is called - pages such as Feedly.com/general seem to remove the entire body and replace it,so only adding this once means it disappears. */


                        } else {
                            logForDebugging("Not running initial scan of body because !$(document.body).data('FirstMutation') is ", !$(document.body).data("FirstMutation"));
                        }
                        if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
                            logForDebugging("~~~ √1053√ 'if ( HILIGHT_ELEMENTS_BEING_PROCESSED) ' ~ ~ ~", "", "ULTRA");
                            observerEnable = false; /* debugger; */
                            mutation.target.style =
                                "border: 5px solid rgba(100,100,100,1) !important; background:rgb(0100,100,100) !important;" +
                                mutation.target.style;
                            $(mutation.target).data("highlighted", true);
                            observerEnable = true;

                        }
                        logForDebugging("About to call main with", mutation);
                        /* debugger; */
                        if (/*mutation.type != "childList" ||  let's try processing only childlists */ (mutation.addedNodes.length > 0 && mutation.addedNodes[0].tagName != "SCRIPT" && mutation.addedNodes[0].tagName != "STYLE")) {
                            try {
                                mainScript(-1, 5000, mutation, thisSessionID, theNewMatches);
                            }
                            catch (err) {
                                logForDebugging("ERROR ON MAIN: ",err);
                                console.log("ERROR ON MAIN (direct to console",err);
                                alert(err.message);
                                debugger;
                            }
                        } else {
                            logForDebugging("failed conditional on 965, not running Main for theMutTargetText: ", theMutTargetText);
                            logForDebugging("failed conditional on 965 whole mutation was: ", mutation);
                        }

                        logForDebugging("~~~~~ √1029√ ending 'if ( --MAX_NUMBER_OF_CALLS_PER_PAGE > 0 && !!theMutTargetText && ( theseMatches) ) ' ~ ~ ~ ~ ~", "", "ULTRA");
                    } else {
                        logForDebugging("~~~ √1065√ 'else ' ~ ~ ~", "", "ULTRA");
                        logForDebugging("failed MAX_NUMBER_OF_CALLS_PER_PAGE:" , MAX_NUMBER_OF_CALLS_PER_PAGE);
                        logForDebugging("failed theBadWordsAndFBNames:" , theBadWordsAndFBNames);

                        logForDebugging("failed theseMatches:" , theseMatches);

                        var theInnerText =
                            theMutTargetText ||
                            ""; /* otherwise the (match) line below causes a fatal error on no innertext */
                        logForDebugging("Ran too many times or no text or no match: (count) ",
                            MAX_NUMBER_OF_CALLS_PER_PAGE
                        );
                        logForDebugging("Ran too many times or no text or no match: (innerText) ",
                            theInnerText
                        );
                        logForDebugging("Ran too many times or no text or no match: (match) ",
                            theInnerText.match(theBadWords)
                        );

                    }
                    /* $("html,body").css("cursor", "auto"); dunno why i had this */
                    logForDebugging("~~~~~ √1006√ ending 'if ( mutation.target.tagName != ''BODY'' || $(document.body).data(''firstrun'') != thisSessionID ) ' ~ ~ ~ ~ ~", "", "ULTRA");
                }
                logForDebugging("~~~~~ √989√ ending 'function( mutation) ' ~ ~ ~ ~ ~", "", "ULTRA");
            });
            //restart observer
            /* document.mkObserverFlag = undefined; */
            observer.observe(document.body, {
                subtree: true,
                attributes: false,
                childList: true,
                characterData: false, //was set to true... see note below if there are problems.

                attributeOldValue: false,
                characterDataOldValue: false
            });
           observerEnable = true; /* debugger; */
        } // end if
        logForDebugging("~~~~~ √950√ ending 'function( mutations, observer) ' ~ ~ ~ ~ ~", "", "ULTRA");

    });

    //****** END MUTATIONONSERVER *******//

    // define what element should be observed by the observer
    // and what types of mutations trigger the callback
    observer.observe(document.body, {
        subtree: true,
        attributes: false,
        /*setting attributes to 'false' makes script not always work on some changes, particularly on http://abcnews.go.com/US/daughter-man-gunned-facebook-video-fear-fathers-eyes/story?id=46847374 ... but working now, so, off. */
        childList: true, //Must be true! guardian.com's "spotlight" section sneaks through without it..
        characterData: false,
        attributeOldValue: false,
        characterDataOldValue: false
    });

    var theInnerHTML = theDummy.target.innerHTML || "";
    logForDebugging("about to see if should run main on Body. the InnerHTML is ", theInnerHTML);
    if (theInnerHTML.match(theBadWordsAndFBNames)) {
        logForDebugging("~~~ √1111√ starting 'if( theInnerHTML.match(theBadWordsAndFBNames))' ~ ~ ~", "", "ULTRA");
        logForDebugging("running main with theDummy:", theDummy);
        try {
            mainScript(-1, 5000, theDummy, "000", theBadWordsAndFBNames);
        }
        catch (err) {
            logForDebugging("ERROR ON MAIN: ",err);
            alert(err.message);
            debugger;
        }
        logForDebugging("~~~~~ √1111√ ending 'if( theInnerHTML.match(theBadWordsAndFBNames))' ~ ~ ~ ~ ~", "", "ULTRA");

    }

    logForDebugging("~~~~~ √838√ ending 'if ( document.location.href.match(exemptRegexp) === null && stupidHash(document.location.href).match(exemptRegexp) === null && ('H'+stupidHash(document.location.hostname)).match(exemptRegexp) === null ) ' ~ ~ ~ ~ ~", "", "ULTRA");
} else {
    logForDebugging("~~~ √1116√ 'else ' ~ ~ ~", "", "ULTRA");
    logForDebugging("page matched exemptions, didn't run");

}

function debugout() {
	/* NOTE: Buggy. Currently not used, keeping to explore later. */
	var self = this;

	// OPTIONS
	self.realTimeLoggingOn = true; // log in real time (forwards to console.log)
	self.useTimestamps = true; // insert a timestamp in front of each log
	self.useLocalStorage = false; // store the output using window.localStorage() and continuously add to the same log each session
	self.recordLogs = true; // set to false after you're done debugging to avoid the log eating up memory
	self.autoTrim = false; // to avoid the log eating up potentially endless memory
	self.maxLines = 2500; // if autoTrim is true, this many most recent lines are saved
	self.tailNumLines = 100; // how many lines tail() will retrieve
	self.logFilename = 'debugout.txt'; // filename of log downloaded with downloadLog()
	self.maxDepth = 2; // max recursion depth for logged objects

	// vars
	self.depth = 0;
	self.parentSizes = [0];
	self.currentResult = '';
	self.startTime = new Date();
	self.output = '';

	this.version = function() { return '0.5.0' }

	/*
		USER METHODS
	*/
	this.getLog = function() {
		var retrievalTime = new Date();
		// if recording is off, so dev knows why they don't have any logs
		if (!self.recordLogs) {
			self.log('[debugout.js] log recording is off.');
		}
		// if using local storage, get values
		if (self.useLocalStorage) {
			var saved = window.localStorage.getItem('debugout.js');
			if (saved) {
				saved = JSON.parse(saved);
				self.startTime = new Date(saved.startTime);
				self.output = saved.log;
				retrievalTime = new Date(saved.lastLog);
			}
		}
		return self.output
			+ '\n---- Log retrieved: '+retrievalTime+' ----\n'
			+ self.formatSessionDuration(self.startTime, retrievalTime);
	}
	// accepts optional number or uses the default for number of lines
	this.tail = function(fnumLines) {
		var numLines = fnumLines || self.tailLines;
		return self.trimLog(self.getLog(), numLines);
	}
	// accepts a string to search for
	this.search = function(string) {
		var lines = self.output.split('\n');
		var rgx = new RegExp(string);
		var matched = [];
		// can't use a simple Array.prototype.filter() here
		// because we need to add the line number
		for (var i = 0; i < lines.length; i++) {
			var addr = '['+i+'] ';
			if (lines[i].match(rgx)) {
				matched.push(addr + lines[i]);
			}
		}
		var result = matched.join('\n');
		if (result.length == 0) result = 'Nothing found for "'+string+'".';
		return result
	}
	// accepts the starting line and how many lines after the starting line you want
	this.getSlice = function(lineNumber, numLines) {
		var lines = self.output.split('\n');
		var segment = lines.slice(lineNumber, lineNumber + numLines);
		return segment.join('\n');
	}
	// immediately downloads the log - for desktop browser use
	this.downloadLog = function() {
	    var file = "data:text/plain;charset=utf-8,";
	    var logFile = self.getLog();
	    var encoded = encodeURIComponent(logFile);
	    file += encoded;
	    var a = document.createElement('a');
	    a.href = file;
	    a.target   = '_blank';
	    a.download = self.logFilename;
	    document.body.appendChild(a);
	    a.click();
	    a.remove();
	}
	// clears the log
	this.clear = function() {
		var clearTime = new Date();
		self.output = '---- Log cleared: '+clearTime+' ----\n';
		if (self.useLocalStorage) {
			// local storage
			var saveObject = {
				startTime: self.startTime,
				log: self.output,
				lastLog: clearTime
			}
			saveObject = JSON.stringify(saveObject);
			window.localStorage.setItem('debugout.js', saveObject);
		}
		if (self.realTimeLoggingOn) console.log('[debugout.js] clear()');
	}
	// records a log
	this.log = function(obj) {
		// log in real time
		if (self.realTimeLoggingOn) console.log(obj);
		// record log
		var type = self.determineType(obj);
		if (type != null && self.recordLogs) {
			var addition = self.formatType(type, obj);
			// timestamp, formatted for brevity
			if (self.useTimestamps) {
				var logTime = new Date();
				self.output += self.formatTimestamp(logTime);
			}
			self.output += addition+'\n';
			if (self.autoTrim) self.output = self.trimLog(self.output, self.maxLines);
			// local storage
			if (self.useLocalStorage) {
				var last = new Date();
				var saveObject = {
					startTime: self.startTime,
					log: self.output,
					lastLog: last
				}
				saveObject = JSON.stringify(saveObject);
				window.localStorage.setItem('debugout.js', saveObject);
			}
		}
		self.depth = 0;
		self.parentSizes = [0];
		self.currentResult = '';
	}
	/*
		METHODS FOR CONSTRUCTING THE LOG
	*/

	// like typeof but classifies objects of type 'object'
	// kept separate from formatType() so you can use at your convenience!
	this.determineType = function(object) {
		if (object != null) {
			var typeResult;
			var type = typeof object;
			if (type == 'object') {
				var len = object.length;
				if (len == null) {
					if (typeof object.getTime == 'function') {
						typeResult = 'Date';
					}
					else if (typeof object.test == 'function') {
						typeResult = 'RegExp';
					}
					else {
						typeResult = 'Object';
					}
				} else {
					typeResult = 'Array';
				}
			} else {
				typeResult = type;
			}
			return typeResult;
		} else {
			return null;
		}
	}
	// format type accordingly, recursively if necessary
	this.formatType = function(type, obj) {
		if (self.maxDepth && self.depth >= self.maxDepth) {
			return '... (max-depth reached)';
		}

		switch(type) {
			case 'Object' :
				self.currentResult += '{\n';
				self.depth++;
				self.parentSizes.push(self.objectSize(obj));
				var i = 0;
				for (var prop in obj) {
					self.currentResult += self.indentsForDepth(self.depth);
					self.currentResult += prop + ': ';
					var subtype = self.determineType(obj[prop]);
					var subresult = self.formatType(subtype, obj[prop]);
					if (subresult) {
						self.currentResult += subresult;
						if (i != self.parentSizes[self.depth]-1) self.currentResult += ',';
						self.currentResult += '\n';
					} else {
						if (i != self.parentSizes[self.depth]-1) self.currentResult += ',';
						self.currentResult += '\n';
					}
					i++;
				}
				self.depth--;
				self.parentSizes.pop();
				self.currentResult += self.indentsForDepth(self.depth);
				self.currentResult += '}';
				if (self.depth == 0) return self.currentResult;
				break;
			case 'Array' :
				self.currentResult += '[';
				self.depth++;
				self.parentSizes.push(obj.length);
				for (var i = 0; i < obj.length; i++) {
					var subtype = self.determineType(obj[i]);
					if (subtype == 'Object' || subtype == 'Array') self.currentResult += '\n' + self.indentsForDepth(self.depth);
					var subresult = self.formatType(subtype, obj[i]);
					if (subresult) {
						self.currentResult += subresult;
						if (i != self.parentSizes[self.depth]-1) self.currentResult += ', ';
						if (subtype == 'Array') self.currentResult += '\n';
					} else {
						if (i != self.parentSizes[self.depth]-1) self.currentResult += ', ';
						if (subtype != 'Object') self.currentResult += '\n';
						else if (i == self.parentSizes[self.depth]-1) self.currentResult += '\n';
					}
				}
				self.depth--;
				self.parentSizes.pop();
				self.currentResult += ']';
				if (self.depth == 0) return self.currentResult;
				break;
			case 'function' :
				obj += '';
				var lines = obj.split('\n');
				for (var i = 0; i < lines.length; i++) {
					if (lines[i].match(/\}/)) self.depth--;
					self.currentResult += self.indentsForDepth(self.depth);
					if (lines[i].match(/\{/)) self.depth++;
					self.currentResult += lines[i] + '\n';
				}
				return self.currentResult;
				break;
			case 'RegExp' :
				return '/'+obj.source+'/';
				break;
			case 'Date' :
			case 'string' :
				if (self.depth > 0 || obj.length == 0) {
					return '"'+obj+'"';
				} else {
					return obj;
				}
			case 'boolean' :
				if (obj) return 'true';
				else return 'false';
			case 'number' :
				return obj+'';
				break;
		}
	}
	this.indentsForDepth = function(depth) {
		var str = '';
		for (var i = 0; i < depth; i++) {
			str += '\t';
		}
		return str;
	}
	this.trimLog = function(log, maxLines) {
		var lines = log.split('\n');
		if (lines.length > maxLines) {
			lines = lines.slice(lines.length - maxLines);
		}
		return lines.join('\n');
	}
	this.lines = function() {
		return self.output.split('\n').length;
	}
	// calculate testing time
	this.formatSessionDuration = function(startTime, endTime) {
		var msec = endTime - startTime;
		var hh = Math.floor(msec / 1000 / 60 / 60);
		var hrs = ('0' + hh).slice(-2);
		msec -= hh * 1000 * 60 * 60;
		var mm = Math.floor(msec / 1000 / 60);
		var mins = ('0' + mm).slice(-2);
		msec -= mm * 1000 * 60;
		var ss = Math.floor(msec / 1000);
		var secs = ('0' + ss).slice(-2);
		msec -= ss * 1000;
		return '---- Session duration: '+hrs+':'+mins+':'+secs+' ----'
	}
	this.formatTimestamp = function(timestamp) {
		var year = timestamp.getFullYear();
		var date = timestamp.getDate();
		var month = ('0' + (timestamp.getMonth() +1)).slice(-2);
		var hrs = Number(timestamp.getHours());
		var mins = ('0' + timestamp.getMinutes()).slice(-2);
		var secs = ('0' + timestamp.getSeconds()).slice(-2);
		return '['+ year + '-' + month + '-' + date + ' ' + hrs + ':' + mins + ':'+secs + ']: ';
	}
	this.objectSize = function(obj) {
	    var size = 0, key;
	    for (key in obj) {
	        if (obj.hasOwnProperty(key)) size++;
	    }
	    return size;
	}

	/*
		START/RESUME LOG
	*/
	if (self.useLocalStorage) {
		var saved = window.localStorage.getItem('debugout.js');
		if (saved) {
			saved = JSON.parse(saved);
			self.output = saved.log;
			var start = new Date(saved.startTime);
			var end = new Date(saved.lastLog);
			self.output += '\n---- Session end: '+saved.lastLog+' ----\n';
			self.output += self.formatSessionDuration(start, end);
			self.output += '\n\n';
		}
	}
	self.output += '---- Session started: '+self.startTime+' ----\n\n';
}
