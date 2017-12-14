// ==UserScript==
// @name          WebCooler
// @namespace     http://www.kupietz.com/WebCooler
// @description	Version 2.0: Cools down my web experience by hiding content that tends to make me hot under the collar. For when your desire to be informed has been finally folder to your desire to stay sane.
// @include         http://*
// @include         https://*
// @grant       none
// @require     https://gist.githubusercontent.com/arantius/3123124/raw/grant-none-shim.js
// @require       https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js
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
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

  Version: 2.0
   2.02 - Myriad small changes. Read the diff. 
  2.01 - changed line endings from mac \r to unix \n so tampermonkey can import from github.
  2.0 - updated to jQuery for fun and good times

*/
// Licensed for unlimited modification and redistribution as long as
// this notice is kept intact.

var nodeSerial = 0;
var observerEnable = true;

/* debugging options */
var CONSOLE_DEBUGGING_MESSAGES_ON = true; //log debug messages?
var HILIGHT_ELEMENTS_BEING_PROCESSED = false; //visual cue as each page element is processed?
var RECORD_DEBUGGING_INFO_IN_NODE_ATTRIBUTES_AS_THEY_ARE_PROCESSED = false; //Do I even use this anymore? I dunno
var MAX_NUMBER_OF_CALLS_PER_PAGE = 1000000; //prevent endless loops. Set to very high number for actual production use.

logForDebugging("Starting - logging ", CONSOLE_DEBUGGING_MESSAGES_ON);

this.$ = this.jQuery = jQuery.noConflict(true);
/* necessary for compatibility, according to https://wiki.greasespot.net/@grant */

/* from webcooler.xpi contentScript.js */

/***********************************************************************************************
 *********************************** USER GLOBAL VARIABLES GO HERE ******************************
 ************************************************************************************************/
var replacementText = ""; //put replacement text here. NOPE, NOT USED ANYMORE.

/*** GLOBAL BLOCKING ***/

/* the below all are regexps. BadWords match text, ones marked as selectors match jquery selectors. */

var globalBadWords =
  "Breitbart|apricity|actblue|assault rifle|shkreli|political[lly]* correct|social justice|roy moore|white nationalist|manafort|rob *schneider|the ?blaze|confederate flag|\bsharia\b|hillary clinton|bill ?o['’]?reilly|Wilbur Ross|Donald Trump Jr.|o[’']?reilly ?factor|trump\\b|ajit pai|ann coulter|tucker carlson|bill maher|spicer|actblue|mccain|Hannity|David\ Brock|Daily ?Stormer|alex jones|daily caller|bill nye|rachel maddow|infowars|rand paul|keith olbermann|Angus ?King|Cernovich|ann coulter|roger stone|climate deni[ae]|townhall\\.com|richard ?b?\\.? ?spencer|slate.com|paul joseph watson|prison ?planet|s1\\.zetaboards\\.com|anthroscape|daily ?kos|gamergate|betsy devos|steve bannon|\#*maga[^a-z]|corporate america|healthcare|marine le pen|red ?pill|Yiannopoulos|geert wilders|vox day|huffington ?post|cuckservative|libtard|Bernie Sanders|SJW|alt-right|Chelsea Clinton|\\@potus|\\@realdonaldtrump|safe\ space|(\\.|\\!) sad\\!|racist|Bernie bros|zero ?hedge|This Tweet is unavailable|liberal propaganda|supremacist|liberal media|electoral landslide|typical liberal|white privilege|libtard|stormfront";
/* Please note, my personal collection of badWords is selected not by political ideology, but by what seems to attract either the most heated or the most egregiously stupid comments and content online, regardless of political slant. Any apparent political alignment is strictly a 'shoe fits' situation. Also a couple of what I think are totally biased and unreliable propaganda sites and commentators on both ends of the spectrum. */
var selectorsToConsiderTogether =
  '#hyperfeed_story_id|div.g|li[data-hveid]|div[data-hook="review"]|li.yt-shelf-grid-item.yt-uix-shelfslider-item';
/* block higher-level elements if any descendant elements contain badwords. Like, remove a whole tweet, or a whole fb reply, not just the <div> containing the badword. Otheriwse it looks for the smallest element it can remove. */
var selectorsToAlwaysHide = "";
/* hide some page structures no matter what. Good for blocking ads, etc. Can also use ':has([hiddenbyscript=true])' selector to always block certain parent elements if they contain an element the script has hidden, so the empty parent elements don't display. */

/*** SITE-BY-SITE BLOCKING ***/

/* block extra words on a site-by-site basis, like, fer instance, twitter and facebook, where ignorant people are particularly vocal: */
/* note: \b word boundaries doesn't work in userscript. Looks like we need \\b in the string, because the string just passes \b as 'b'. \b is a regex code, not recognized by strings. */
var siteSpecificBadWords = {
  /* social media sites*/ "twitter.com$|reddit.com$|facebook.com$|youtube.com$": "jill stein|russia|walmart|wal-mart|\\bNRA\\b|nader|climate scien|single[ -]payer|racism|net neutrality|gubb[aer]+m[ie]+nt|second amendment|government spend|prsident|zionis|taxpayer|anti-*semit|republican|democrat\\b|liberals|healthcare|extremist|comey\\b|narrative|libertarian|antifa\\b|bakedalaska|protestor|conservatives|poor people|gov'?t|climate change|terroris[tm]|tax plan|snowflake|global warming|drain the swamp|feminis[tm]|\\bMRA|PUA\\b|unborn|\\btwp|rac(ial|e) realism|venezuela|abortion|\\bISIS\\b|devos|communist|commie|socialist|\\bweev\\b|aurenheimer|white (house|guys)|obama|bDNC\\b|cultural\\ appropriation|hate\\ crime|\RNC\\b|democratic socialism|leftist|rightist|mar-?a-?lago|(white|black) (wom[ae]n|m[ae]n|people)|burqa|Kellyanne\\ Conway|illegal alien|Trump|white nationalist|Nazi|This tweet is unavailable.",
  "twitter.com$": "\\bshill\\b", /*common troll comment on twitter, used in other ways on non-political Reddit subs */
  /* news sites */ "abcnews.go.com$|feedly.com$|newsblur.com$|apnews.com|reuters.com|hosted.ap.org": "missile|gorsuch|tensions|kim jong un|Pence|N(\\.|orth) Korea|Rod Dreher"
};

/* never run on sites matching these */
var exemptSites = "fivethirtyeight.com$|.gov[^.]|.gov$|www.reddit.com/r/mod|www.reddit.com/message/inbox/";

/* Now, some useful definitions for the below sections: */
var fb_OutermostWhiteBox = "div._4-u2"; /*Does this ever change? We'll see. */
var fb_post = "div.fbUserContent"; /* entire post */
var fb_postContent =
  "div._1dwg"; /*._1dwg is around post content (the top) but not comments or the bar with "like, share" etc. */

/* site-specific extras to consider with selectorsToConsiderTogether: */
var siteSpecificSelectorsToConsiderTogether = {
  "youtube.com$": ".video-list-item",
     "tumblr.com$": "li.post_container|article",
  "twitter.com$": '.TwitterCard|.QuoteTweet|.CardContent|li[data-item-type="tweet"]|.ProfileCard|li.trend-item|.js-account-summary.account-summary.js-actionable-user',
  /* removed twitter:'.js-stream-item.stream-item' because was hiding entire 'tweets you might have missed' if one matched */
  "reddit.com$": '.noncollapsed|.was-comment|.recipient|.message ',
  "google.com$": "div._oip._Czh|g-section-with-header|div._NId>div.srg>div.g",
  "facebook.com$": 'div[aria-label="Comment"]|li._5my2|div._4-u3|' + fb_postContent,
  /* li._5my2 is 'trending' row. div.div._4-u3 is a "related article" beneath a share. */
  "feedly.com$": "div.feed-large.item.feed|div.entry.u4.density-24",
  "abcnews.go.com$": "article.news-feed-item",
  "newsblur.com$": "div.NB-story-title.NB-story-grid.NB-story-neutral"
};
/* div._NId>div.srg>div.g google search result */

/* Other things to always hide. Useful to, say, hide an entire facebook post only if the main comment comtains badwords, but _not_ if a reply comment does. 
 (Hence siteSpecificSelectorsToConsiderTogether wouldn't do the trick.) */

var siteSpecificSelectorsToAlwaysHide = {
  "facebook.com$": "div.UFIRow.UFIComment[hiddenbyscript=true]+div.UFIReplyList|" +
    fb_OutermostWhiteBox +
    ":has(" +
    fb_postContent +
    "[hiddenbyscript=true])",
  "twitter.com$": "div.promoted-tweet|div[data-disclosure-type=promoted]|div[data-advertiser-id]|div[data-promoted=true]",
  "abcnews.go.com$": "article.article:has(header.article-header:has([hiddenbyscript=true]))|article.artcle:has(div.article-copy[hiddenbyscript=true])" /*hide article if headline is hidden or whole article body is hidden*/
};
/* NOTE: div._4-u2 is the outer container for a facebook post (and any other white box on their gray background as of this writing. Does this ever change? We'll see. div.fbUserContent is right inside that and seems less likely to change, but the outer one has the margins. */
/* ._5r69 seems to be the div surrounding a shared post. */
/* _5x46 is the header with who posted and who it was shared from */

/* before simplification, FB also had "div.fbUserContent:has(div.fbUserContent:has(div.userContent[hiddenbyscript=true]))|div._4-u2.mbm._4mrt._5jmm._5pat._5v3q._4-u8:has(div.userContent:has([hiddenbyscript=true]))|div._5r69:has([hiddenbyscript=true])|div._5x46:has([hiddenbyscript=true])|div._4-u2.mbm._4mrt._5jmm._5pat._5v3q._4-u8:has(div._5x46[hiddenbyscript=true])|div._4-u2.mbm._4mrt._5jmm._5pat._5v3q._4-u8:has(div._1dwg[hiddenbyscript=true])|" */

/*** END BLOCKING LISTS ***/

/* following vars not used yet: */
var notAsBadWords =
  "democracy|\bCIA\b|Supreme\ Court|NYPD|rnc|\bFBI\b"; /* thought maybe to have words that are only bad when other words are present... not implemented yet. */
var stopWords = "";
/* not yet implemented. For instance, don't block FB blocks that contain your own name. */
var badURLWords =
  ".*trump.*|zippyaudio2|crowdignite|zerohedge|dailymail|hannitylive|townhall\.com|everydayfeminism|huffingtonpost|breitbart|jezebel|buzzfeed|zergnet|outbrain"; //urls to block links to, etc
/* block links containing badURLWords in href. Not yet implemented. */

/* NOTES: */
/* TO DO: Do a folder action that watches for TamperMonkey backups in dropbox, runs a script to decompress and copy this script into the GitHub repo, and use command line commands to upload to GitHub. */
/* TO DO: Maybe make a list of less bad words that only block if match() returns a list of more than 1 of them.  Like "believe|lies|", "Trump|unfair" or "o'reilly|fox" or something. */
/* TO DO: mark editable elements as soon as found and ignore subsequently, even if they stop being editable at any point, as some do on complex social media sites. */
/* TO DO: implement badURLWords. */
/* To DO: Perhaps actually remove innerHTML of hidden elements to lighten page. See if it makes a difference in performance. */
/* Am I still using the sessionIDs to prevent redundant checks? Should probably switch them to jquery .data() and use again if not. */
/*I should prob have mutationobserver just mark nodelist with a class, then use jquery to find them, pare them down using descentant and contains and selectorsToConsiderTogether selectors, and style them using '.css='>
/* contains() example: $( "div:contains('John')" ).css( "text-decoration", "underline" ); */
/* highlight leaf nodes containing text (beware, case-sensitive): $('*:contains("I am a SIMPLE string")').each(function(){ if($(this).children().length < 1) $(this).css("border","solid 2px green") }); 
    ^^More info, including wrapping found text in tags, at http://stackoverflow.com/questions/926580/find-text-string-using-jquery */
/* not() selector: https://api.jquery.com/not-selector/ */
/* how to run a callback function on all text nodes matching a string or regexp: http://stackoverflow.com/questions/4060056/jquery-find-replace-without-changing-original-text/4060635#4060635 */
/* .text() method returns innerText, ignoring embedded tags. "a<i>b</i>c".text() returns "abc".
   ^^ if you wanted to get just "ac" from that, see http://viralpatel.net/blogs/jquery-get-text-element-without-child-element/ */
/* Use .each() and $(this) to iterate: $('.someDivList .divItem').each(function() {
	$(this).css('background', 'lightblue');
       }); */
/* how to use jQuery on node lists, such as mutation records: http://stackoverflow.com/questions/12596231/can-jquery-selectors-be-used-with-dom-mutation-observers 
  it's as easy as setting: var jq = $(mutation.addedNodes); */
/* good docs on what mutation returns (addedNodes, removedNodes, changed attributes, etc.): https://davidwalsh.name/mutationobserver-api 
   good, simple MutationObserver demo (be sure to show Console to see mutation object returned) https://jsfiddle.net/dimshik/p9gx43Lx/*/
/* to catch all changes including text nodes, config = {attributes: true, childList: true, characterData: true, subtree: true}  */
/* check for display:none : $(element).is(":visible"); */
/* find some way not to be triggered on user input */
/* .closest starts with current node and traverses upwords until matching selector is found. https://api.jquery.com/closest/ */
/* .parentsUntil() traverses up tree and finds child of node matching selector. */
/* get all leaf nodes: $("div").filter(
   function(index) {
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
selectorsToConsiderTogether = attachSiteSpecifics(
  selectorsToConsiderTogether,
  siteSpecificSelectorsToConsiderTogether
);
logForDebugging("selectorsToConsiderTogether ", selectorsToConsiderTogether);
selectorsToAlwaysHide = attachSiteSpecifics(
  selectorsToAlwaysHide,
  siteSpecificSelectorsToAlwaysHide
);
logForDebugging("selectorsToAlwaysHide ", selectorsToAlwaysHide);

var exemptRegexp = new RegExp(exemptSites, "gi");

function attachSiteSpecifics(globalString, siteSpecificArray) {
  logForDebugging("Attaching site specifics for ", globalString);
  Object.keys(siteSpecificArray).forEach(function(key) {
    logForDebugging("Checking key ", key);
    var value = siteSpecificArray[key];
    var hostRegexp = new RegExp(key, "gi");
    logForDebugging(
      "About to match 3 ",
      document.location.hostname.match(hostRegexp)
    );
    if (document.location.hostname.match(hostRegexp) !== null) {
      globalString = (globalString == "" ? "" : globalString + "|") + value;
      logForDebugging("added site-specific " + key);
    }
  });
  return globalString;
}

/* Create our artisanal handcrafted regexes to use below */
var theBadWords = new RegExp(globalBadWords, "gi");
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



function main(elLengthOld, theDelay, mutation, sessionID) {
 
  /* big stuff happens here */
  observerEnable = false;
  if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
    observerEnable = false;
    mutation.target.style =
      "border: 5px dotted rgba(100,0,100,1) !important; background:rgb(100,0,100) !important;" +
      mutation.target.style;
    $(mutation.target).data("highlighted", true);
    observerEnable = true;
  }
  var d = new Date();
  var n = d.getTime(); /* Are these used? */

  logForDebugging("checking node:", mutation.target);
  if (
    typeof $(mutation.target).data() === "object" &&
    (!$(mutation.target).data("scriptprocid") ||
      $(mutation.target).data("scriptprocid") != sessionID)
  ) {
    wcSetAttributeSafely(mutation.target, "scriptprocid", sessionID);
    logForDebugging("Confirmed not yet checked this session:", mutation.target);
    logForDebugging("about to find selectorsToConsiderTogether:", "");
    /* I should skip this and the next if the top-level node's inner text doesn't contain badwords, save some time cycling through them */
    if (mutation.target.innerText.match(theBadWords) !== null) {
      $(mutation.target)
        .find("*")
        .addBack()
        .filter(selectorsToConsiderTogether.replace(/\|/g, ","))
        .filter(function() {
          if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
            /* debugger; */
            this.style =
              "border: 5px dotted rgba(0,0,160,1) !important; background:rgba(0,0,255,.5) !important;" +
              this.style;
            $(this).data("highlighted", true);
          }

          if (
            $(this).text().match(theBadWords) !== null &&
            !$(this).prop("isContentEditable")
          ) {
            if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
              /* debugger; */
              this.style =
                "border: 5px dotted rgba(0,160,160,1) !important; background:rgba(0,255,255,.5) !important;" +
                this.style;
              $(this).data("highlighted", true);
            }

            logForDebugging(
              "found '" +
                $(this).text().match(theBadWords) +
                "' in selectorsToConsiderTogether",
              this
            );
            return true;
          } else {
            return false;
          }
        })
        .each(function() {
          if (thisPageIsExempt) {
            $(this)
              .css("border", "1px solid red")
              .css("background", "rgba(255,225,225,.5)")
              .attr("hiddenByScript", "true");
          } else {
            $(this)
              .hide()
              .data("savedstyle", $(this).attr("style"))
              .attr("style", "display:none !important")
              .attr("hiddenByScript", "true");
          }

          logForDebugging("added red to", this);
        });

      /*  got to find a way to prevent editing while document.activeElement.contentEditable != true. or while an ancestor has that set to true */
      var walk = $(mutation.target)
        .find("*")
        .addBack() /*find ordinarily only returns child elements unless you add addBack.*/
        .filter(':visible:not("iframe")')
        .contents() /* like children() but also includes text and comment nodes */
        .filter(function() {
          return this.nodeType === 3;
        })
        .filter(function() {
          logForDebugging("filtering node:", this);
          logForDebugging("filtered node value is:", this.nodeValue);
          var theCriteria =
            this.nodeValue.match(theBadWords) !== null &&
            !$(this).prop(
              "isContentEditable"
            ) /*cant use === false because .prop("isContentEditable") === undefined for text nodes */;
          logForDebugging(
            "the filter returns (true for include):",
            theCriteria
          );
          if (theCriteria) {
            logForDebugging(
              "Matched green ",
              this.nodeValue.match(theBadWords)
            );
          }
          return theCriteria;
        });
      logForDebugging("about to walk text leaves:", walk);

      walk.each(function() {
        logForDebugging(
          "walking text leaf:",
          this[0] || this
        ); /* don't know why this[0] is sometimes, maybe always, not evaluating. don't care right now. maybe needs to be $(this)[0]?*/
        var theClosestBlock = $(this).closest(
          "p,div,td,table,h1,h2,h3,h4,h5,h6,li,dd,dt"
        );
        var theClosest = $(this).closest(
          selectorsToConsiderTogether.replace(/\|/g, ",")
        ); /* I need to use nextUntil() and prevUntil() to add consecutive sibling dd's and dt's to theClosest so one doesn't get left if the other is removed. See https://en.wikipedia.org/wiki/List_of_music_considered_the_worst for example. Too tired to do it right now though. */
        theClosest = theClosest.length === 0 ? theClosestBlock : theClosest;
        /* sometimes the mutation target is just a text node that changed (like clicking a "more" link on facebook. In that case, see if it's enclosed in one of selectorsToConsiderTogether before just looking for the closest() parent block element. */ logForDebugging(
          "theClosestBlock:",
          theClosestBlock
        );
        logForDebugging("theClosest:", theClosest);
        if (thisPageIsExempt) {
          theClosest
            .css("border", "1px solid green")
            .css("background", "rgba(225,255,225,.5)")
            .attr("hiddenByScript", "true");
          if (theClosest != theClosestBlock) {
            theClosestBlock
              .css("border", "1px dotted darkgreen")
              .css("background", "rgba(200,255,200,.5)")
              .attr("hiddenByScript", "true");
          }
        } else {
          theClosest
            .hide()
            .data("savedstyle", theClosest.attr("style"))
            .attr("style", "display:none !important")
            .attr("hiddenByScript", "true");
        }
        logForDebugging(
          "added green to",
          theClosest[0] || theClosest
        ); /* don't know why theClosest[0] is sometimes, maybe always, not evaluating. don't care right now. */
      });
      logForDebugging("done walking text leaves", walk);
    }

    addUnblockLink(
      /*theCatch*/ "x"
    ); /* should prob move this so unblock link only shows if block term was actually found on page. */
    logForDebugging("done adding unblock link");
  } else {
    logForDebugging("skipped:", mutation.target);
    wcSetDebuggingAttributeSafely(
      mutation.target,
      "thisNodeSkippedForSession",
      sessionID
    );
  }

  /* Now let's check for wrongly hidden things. this is because sometimes Twitter seems to be setting input fields temporarily to uneditable while backspace key is being hit, and the script jumps in and hides them. */

  var hiddenWalk = $(mutation.target)
    .find("*")
    .addBack()
    .filter("[hiddenByScript=true]")
    .filter(function() {
      return !!$(this).prop("isContentEditable");
    });

  /* this isn't the best way to do this, I don't think. Sometimes a hiddenbyscript element CONTAINS an editable one. Not sure if this catches those. (UPDATE: seems to be working, will fix if it doesn't always. */
  if (thisPageIsExempt) {
    hiddenWalk.each(function() {
      logForDebugging("unhiding text leaf:", this);

      $(this)
        .css("border", "1px solid blue")
        .css("background", "#CCCCFF")
        .css("background", "rgba(225,225,255,.5)")
        .attr("style", $(this).data("savedstyle"))
        .attr("hiddenByScript", "");

      logForDebugging("added blue to", $(this));
    });
  } else {
    hiddenWalk.each(function() {
      logForDebugging("unhiding text leaf:", this);
      $(this).show().attr("hiddenByScript", "");
      logForDebugging("added blue to", $(this));
    });
  }
  var theSelectorsToAlwaysHide = $(mutation.target)
    .find(selectorsToAlwaysHide.replace(/\|/g, ","))
    .not("[hiddenbyscript]");
  //while (theSelectorsToAlwaysHide ) {
  theSelectorsToAlwaysHide.each(function() {
    /* we do this _after_ seaching for badwords so selectortoalwayshide that use [hiddenbyscript] will get catch things that were just hidden */

    if (thisPageIsExempt) {
      $(this)
        .css("border", "1px solid orange")
        .css("background", "rgba(255,240,225,.5")
        .attr("hiddenByScript", "true");
      logForDebugging("Added orange to", $(this));
    } else {
      $(this).hide().attr("hiddenByScript", "true");
      logForDebugging("Added orange to", $(this));
    }

    logForDebugging("added orange to", this);
  });
  //  theSelectorsToAlwaysHide = $(mutation.target).find(selectorsToAlwaysHide.replace(/\|/g, ",")).not("[hiddenbyscript]");
  //}

  observerEnable = true;
} //end main()

//*************** BEGIN GLOBAL SCOPE ****************//

//******* My own functions for global scope ********//

function logForDebugging(string, object) {
  if (CONSOLE_DEBUGGING_MESSAGES_ON) {
    console.log(string);
    console.log(object);
  } //enable this to turn logging on
}

function wcSetAttributeSafely(node, attribute, value) {
  if (typeof $(node).data() === "object") {
    $(node).data(attribute, value);
  } else if (node.nodeType == 3) {
    wcSetDebuggingAttributeSafely(
      node.parentNode,
      attribute + "__in_child_" + node.nodeValue.replace(/\b/g, "") + "__",
      value
    );
  }
  //else {node.textContent=node.textContent + "{§"+attribute+"="+value+"§}"}
}

function wcSetDebuggingAttributeSafely(node, attribute, value) {
  if (RECORD_DEBUGGING_INFO_IN_NODE_ATTRIBUTES_AS_THEY_ARE_PROCESSED == true) {
    if (typeof $(node).data() === "object") {
      $(node).data(attribute, value);
    } else if (node.nodeType == 3) {
      wcSetDebuggingAttributeSafely(
        node.parentNode,
        attribute + "__in_child_" + node.nodeValue.replace(/\b/g, "") + "__",
        value
      );
    }
    //else {node.textContent=node.textContent + "{§"+attribute+"="+value+"§}"}
  }
}

function wcSetAttributeSafelyOLD(node, attribute, value) {
  if (typeof node.setAttribute === "function") {
    node.setAttribute(attribute, value);
  } else if (node.nodeType == 3) {
    wcSetDebuggingAttributeSafely(
      node.parentNode,
      attribute + "__in_child_" + node.nodeValue.replace(/\b/g, "") + "__",
      value
    );
  }
  //else {node.textContent=node.textContent + "{§"+attribute+"="+value+"§}"}
}

function wcSetDebuggingAttributeSafelyOLD(node, attribute, value) {
  if (RECORD_DEBUGGING_INFO_IN_NODE_ATTRIBUTES_AS_THEY_ARE_PROCESSED == true) {
    if (typeof node.setAttribute === "function") {
      node.setAttribute(attribute, value);
    } else if (node.nodeType == 3) {
      wcSetDebuggingAttributeSafely(
        node.parentNode,
        attribute + "__in_child_" + node.nodeValue.replace(/\b/g, "") + "__",
        value
      );
    }
    //else {node.textContent=node.textContent + "{§"+attribute+"="+value+"§}"}
  }
}

function exemptThisPage() {
  //red star in lower right corner was clicked

  var theLocMatch = new RegExp(
    "<url>" + escape(encodeURIComponent(document.location.href)) + "<endurl>",
    "gi"
  );
  theCurrPrefString = theCurrPrefString.replace(theLocMatch, ""); //remove previous instances of URL in list
  logForDebugging("EXEMPTION: Cookies are: ", docCookies.getItem("exemptPage"));
  docCookies.setItem(
    "exemptPage",
    theCurrPrefString +
      "<url>" +
      escape(encodeURIComponent(document.location.href)) +
      "<endurl>", Infinity
  );
  logForDebugging("EXEMPTION: removing URL: ", theLocMatch);
  logForDebugging(
    "EXEMPTION: Cookies are now: ",
    docCookies.getItem("exemptPage")
  );
  location.reload(true);
}

function unexemptThisPage() {
  //green star in lower right corner was clicked
  logForDebugging("EXEMPTION: unexempting");
  var theLocMatch = new RegExp(
    "<url>" + escape(encodeURIComponent(document.location.href)) + "<endurl>",
    "gi"
  );
  logForDebugging("EXEMPTION: Cookies are: ", docCookies.getItem("exemptPage"));
  logForDebugging("EXEMPTION: theLocMatch is: ", theLocMatch);
  logForDebugging("EXEMPTION: theCurrPrefString is: ", theCurrPrefString);
  logForDebugging(
    "EXEMPTION: theCurrPrefString.replace(theLocMatch, '') is: ",
    theCurrPrefString.replace(theLocMatch, "")
  );
  docCookies.setItem("exemptPage", theCurrPrefString.replace(theLocMatch, "x"),Infinity);
  logForDebugging("EXEMPTION: Writing URL: ", theLocMatch);
  logForDebugging(
    "EXEMPTION: Cookies are now: ",
    docCookies.getItem("exemptPage")
  );
  location.reload(true);
}

function addUnblockLink(foundString) {
  //put little star in lower right corner of window to toggle between element hiding/highlighting
  //observer.disconnect();

  logForDebugging("EXEMPTION: add unblock link function start");
  var tempObserverEnable = observerEnable;
  observerEnable = false;
  var aMain = "";
  var blockString = thisPageIsExempt ? "reblock" : "unblock";
  if (document.getElementById("pageBlocked_5832_xfi") == undefined) {
    aMain = document.createElement("div");
  } else {
    var bMain = document.getElementById("pageBlocked_5832_xfi");
    aMain = bMain.parentNode;
    blockString = (aMain.title + ", ")
      .toLowerCase()
      .replace(foundString.toLowerCase(), "")
      .replace(", ,", ",")
      .replace(new RegExp(blockString + " ?, ?", ""), blockString + " ");
  }
  aMain.addEventListener(
    "click",
    function() {
      logForDebugging("EXEMPTION: clicked exempt");
      exemptThisPage(0);
    },
    false
  );
  aMain.addEventListener(
    "mouseout",
    function() {
      document.getElementById("pageBlocked_5832_xfi").style =
        "width:12px;height:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#ff3300";
    },
    false
  );
  aMain.addEventListener(
    "mouseover",
    function() {
      document.getElementById("pageBlocked_5832_xfi").style =
        "width:32px;height:32pxtext-align:center;display:block;cursor:pointer;font-size:24px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#ff3300";
    },
    false
  );

  logForDebugging("tagname 2");
  /* do NOT let an automated checker tell you it should be "=== undefined" in the next line - that breaks the script! */
  if (
    document.getElementById("tinymce") == undefined ||
    document.getElementById("tinymce").tagName != "BODY"
  ) {
    //don't run in iframes generated by tinymce rich text editor - fix to block from running in Tumblr post dialogs
    aMain.title = blockString + foundString;
    if (thisPageIsExempt) {
      //display on Exempt pages
      aMain.innerHTML.firstChild =
        "<li id='pageBlocked_5832_xfi' style='width:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#66ff00'>*</li>";
    } else {
      //display on non-Exempt pages
      aMain.innerHTML =
        "<li id='pageBlocked_5832_xfi' style='width:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#ff3300'>*</li>";
    }
  }
  document.body.appendChild(aMain);
  observerEnable = tempObserverEnable;
}

//******* End my own functions for global scope ********//


/* don't run at all on excluded sites */
    logForDebugging ("exempt regexp",exemptRegexp);
    logForDebugging ("exempt document.location.href",document.location.href);
    logForDebugging ("regexp is ",document.location.href.match(exemptRegexp));
    logForDebugging ("regexp result ", (document.location.href.match(exemptRegexp) === null));
  if (document.location.href.match(exemptRegexp) === null) {

//*** Here comes Mozilla's cookie framework... ***//

/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  https://developer.mozilla.org/en-US/docs/DOM/document.cookie
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path], domain)
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/

var docCookies = {
  getItem: function(sKey) {
    return (
      decodeURIComponent(
        document.cookie.replace(
          new RegExp(
            "(?:(?:^|.*;)\\s*" +
              encodeURIComponent(sKey).replace(/[\-\.\+\*\(\)]/g, "\\$&") +
              "\\s*\\=\\s*([^;]*).*$)|^.*$"
          ),
          "$1"
        )
      ) || null
    );
  },
  setItem: function(sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
      return false;
    }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity
            ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT"
            : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie =
      encodeURIComponent(sKey) +
      "=" +
      encodeURIComponent(sValue) +
      sExpires +
      (sDomain ? "; domain=" + sDomain : "") +
      (sPath ? "; path=" + sPath : "") +
      (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function(sKey, sPath, sDomain) {
    if (!sKey || !this.hasItem(sKey)) {
      return false;
    }
    document.cookie =
      encodeURIComponent(sKey) +
      "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" +
      (sDomain ? "; domain=" + sDomain : "") +
      (sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function(sKey) {
    return new RegExp(
      "(?:^|;\\s*)" +
        encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") +
        "\\s*\\="
    ).test(document.cookie);
  },
  keys: /* optional method: you can safely remove it! */ function() {
    var aKeys = document.cookie
      .replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "")
      .split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) {
      aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]);
    }
    return aKeys;
  }
};
//*** End Mozilla's cookie framework... ***//
logForDebugging("EXEMPTION: Cookies coming ", docCookies.getItem());
logForDebugging(" EXEMPTION: stringified ", JSON.stringify(docCookies));

var theCurrPrefString = docCookies.getItem("exemptPage") || "";
logForDebugging("EXEMPTION: theCurrPrefString ", theCurrPrefString);
var thisPageIsExempt = !(theCurrPrefString.match(
  "<url>" + escape(encodeURIComponent(document.location.href)) + "<endurl>"
) === null);
logForDebugging("EXEMPTION: thisPageIsExempt ", thisPageIsExempt);
var theDummy = {
  target: document.body
};
var aMutationObserver =
  window.MutationObserver || window.WebKitMutationObserver;
/* watch the page for changes. A lot of page load content later by AJAX or other javascript. */
var observer = new aMutationObserver(function(mutations, observer) {
  if ((document.mkObserverFlag === undefined || 1 == 1) && observerEnable) {
    observer.disconnect(); /* this can go, was just an attempt at what observerEnable succeeded at. do a search for all mentions and remove. */
    /* document.mkObserverFlag = 1;*/ var thisSessionID = Math.random();
    var mlog = {};
    //log mutation
    // mutations.forEach(function (mutation) {
    //    mlog[mutation.type] = (mlog[mutation.type] || 0) + 1;
    //});
    //logForDebugging("keys",Object.keys(mlog).map(function (k) {
    //   return k + '=' + mlog[k];
    //}).join(', '))
    //end log

    var theNodes =
      mutations ||
      document.body
        .childNodes; /* do we really need that bit? commenting to see if anything breaks */
    var theGetVal = theCurrPrefString;
    $("html,body").css("cursor", "not-allowed");
    if (thisPageIsExempt) {
      //add div to allow user to unexempt page
      var aMain = document.createElement("div");
      aMain.addEventListener(
        "click",
        function() {
          unexemptThisPage(0);
        },
        false
      ); //anonymous function() {exemptThisPage(0);} is necessary because exemptThisPage(0) on its own thinks I mean "the value returned from exemptThisPage(0)" and immediately fires the function to calculate that.
      aMain.innerHTML =
        "<li style='width:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999;border:1;bottom:0;right:0;color:#66ff00'>*</li>";
      observerEnable = false;
      document.body.appendChild(
        aMain
      ); /* did the above li need no ID? I guess not, but check this if something breaks. */
      observerEnable = true;
    }

    theNodes.forEach(function(mutation) {
      if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
        observerEnable = false; /* debugger; */
        mutation.target.style =
          "border: 5px dotted rgba(200,200,200,1) !important; background:rgb(200,200,200) !important;" +
          mutation.target.style;
        $(mutation.target).data("highlighted", true);
        observerEnable = true;
      }
      if ($(mutation.target).text().match("Spicer")) {
        debugger;
      }
      logForDebugging(
        "OBSERVED: testing mutation: " +
          $(mutation.target).text().substr(0, 50),
        mutation.target
      );
      if (
        mutation.target.tagName != "BODY" ||
        $(document.body).data("firstrun") != thisSessionID
      ) {
        //just process the changed bits, not the whole body  more than once per session, ok?
        $(document.body).data("firstrun", thisSessionID);
        /* wcSetDebuggingAttributeSafely(mutation, "PassedAsMutationInSession" + thisSessionID, "true"); doesn't seem to be used anymore */
        logForDebugging(
          "Passing as mutation for session ID" + thisSessionID + ":",
          mutation
        );
        if (
          --MAX_NUMBER_OF_CALLS_PER_PAGE > 0 &&
          !!mutation.target.innerText &&
          mutation.target.innerText.match(theBadWords)
        ) {
          if (
            mutation.type != "attributes" ||
            mutation.attributeName == "hidden" ||
            1 == 1
          ) {
            /* ok, added 1 ==1 to disable because first I thought this would improve performance, but it resulted in some badwords not getting caught on http://abcnews.go.com/US/daughter-man-gunned-facebook-video-fear-fathers-eyes/story?id=46847374 . It's a good idea though, should figure out how to make it work... shouldn't trigger on every attribute change. */
            if (!$(document.body).data("FirstMutation")) {
              /* on the very first time this is called on a page, use the whole body to make sure everything gets checked once. */
              logForDebugging("First Mutation for page. passing Body.");
              $(document.body).data("FirstMutation", true);
              /* debugger; */
              main(-1, 5000, theDummy, thisSessionID);
            }
            if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
              observerEnable = false; /* debugger; */
              mutation.target.style =
                "border: 5px solid rgba(100,100,100,1) !important; background:rgb(0100,100,100) !important;" +
                mutation.target.style;
              $(mutation.target).data("highlighted", true);
              observerEnable = true;
            }
            logForDebugging("About to call main.");
            /* debugger; */
            main(-1, 5000, mutation, thisSessionID);
          }
        } else {
          var theInnerText =
            mutation.target.innerText ||
            ""; /* otherwise the (match) line below causes a fatal error on no innertext */
          logForDebugging(
            "Ran too many times or no text or no match: (count) ",
            MAX_NUMBER_OF_CALLS_PER_PAGE
          );
          logForDebugging(
            "Ran too many times or no text or no match: (innerText) ",
            theInnerText
          );
          logForDebugging(
            "Ran too many times or no text or no match: (match) ",
            theInnerText.match(theBadWords)
          );
        }
        $("html,body").css("cursor", "auto");
      }
    });
    //restart observer
    /* document.mkObserverFlag = undefined; */
    observer.observe(document.body, {
      subtree: true,
      attributes: false,
      childList: true,
      characterData: true,
      attributeOldValue: false,
      characterDataOldValue: false
    });
  } // end if
});
// define what element should be observed by the observer
// and what types of mutations trigger the callback
observer.observe(document.body, {
  subtree: true,
  attributes: false,
  /*setting attributes to 'false' seemed to make script not always work on some changes, particularly on http://abcnews.go.com/US/daughter-man-gunned-facebook-video-fear-fathers-eyes/story?id=46847374 ... but working now, so disabled . */
  childList: true,
  characterData: true,
  attributeOldValue: false,
  characterDataOldValue: false
});
  main(-1, 5000, theDummy, "000");
  }

