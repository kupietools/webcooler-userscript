// ==UserScript==
// @name WebCooler
// @namespace http://www.kupietz.com/WebCooler
// @description	Cools down my web experience by hiding content that tends to make me hot under the collar. For when your desire to be informed has finally been overcome by your desire to stay sane.
// @version 3.10
// @match *://*/*
// @require https://gist.githubusercontent.com/arantius/3123124/raw/grant-none-shim.js
// @require https://code.jquery.com/jquery-3.3.1.slim.min.js
// @grant GM_getValue
// @grant GM_setValue

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

    Version History:
    3.10 add "!CONSOLE_DEBUGGING_MESSAGES_ON ||" to prevent anything from even log values from even evaluating if logging is off, get rid of json.stringify, was causing errors with circular objects and adding a replacer function to fix them made it more complicated. Also add some new terms to keep up with changes in parent object hierarchy in facebook comments.
    3.9 Put badwords filter first when scanning tree... only consider trees at all if they contain badwords
    3.8 Somewhere along the way a few sections of code got randomly duplicated, cleaned it up
    3.7 consider text content of span tags with multiple child nodes as a whole, to catch <span>bad <em>words</em></span>, like Google sometimes does within search results
    3.6.1 fix regression error where 3.6 wasn't matching any pages, add a few new classes to block features on Google search results for individual I want to disappear.
    3.6 improved performance by adding site specific parents to remove only if a child is hidden rather than relying on selectors to always hide and a horribly inefficient :has() selector
    3.5.1 Append comments in head showing matches.
    3.5 Tossed my cookies. Now using GM_setValue and GM_getValue because some sites were deleting my cookies on reload.
    3.4 Numerous optamazetions. Replace each with for loops, cache lengths and $() objects in variables
    3.3 Added async, performance enhancements, contextual menu and keystroke unexemption options, lots of other stuff, read the diff.
    3.2 added and subsequently removed debugout. Oh well. Added try/catch to main to hopefully alert on errors, since some browsers truncate logs despite your best efforts to see what the f you're doing.
    3.1 changed function main() to use mutation.addedNodes when available instead of mutation.target... seems way faster! Also fixed some bugs. YouTube pages work again. Created some code (currently commented out) to store log in comments in page <head> for when FireFox's console log is broken, like tonight.
    3.0 jshinted and added fb softblock by name
    2.5 finally get it to stop striking editable content (ie, deleting my facebook rants as I type them [NO! Doesn't work when theClosest contains editable, I think]) and optimized some code.
    2.02 - Myriad small changes. Read the diff.
    2.01 - changed line endings from mac \r to unix \n so tampermonkey can import from github.
    2.0 - updated to jQuery for fun and good times

*/
// Licensed for unlimited modification and redistribution by any terrestrial being as long as
// this notice is kept intact.

/* todo: configuration options https://github.com/odyniec/MonkeyConfig or https://github.com/sizzlemctwizzle/GM_config/
NO! These only store values per domain, which appears to be a completely useless function. My kingdom for an easy way to
bring up an options dialog and store values without having to hardcode them into the script! */

var thisScriptHiddenAttribute = "hiddenbyuserscript"+ GM.info.script.name.replace(/[^a-zA-Z]/g, ''); //don't change

/* switches & debugging options */
var observerEnable = true; //enable mutation observer
var CONSOLE_DEBUGGING_MESSAGES_ON = false ;//new RegExp(/normal|ultra|greencrit|observer/,"gi");//true; //log debug messages? true|false|normal(non-categorized)|new RegExp("logClass1|logClass2|logClass3")
/*** CAUTION!!! CONSOLE_DEBUGGING_MESSAGES_ON != false is a HUGE performance hit! It completely broke Twitter for me tonight. ***/
/*** TURN IT OFF WHEN YOU ARE DONE DEBUGGING. ***/
/******* Maybe add a visual indicator if debugging is on. Also add a visual indicator if somehting has been removed... like only add exempt link then ***/
var TURN_CONSOLE_DEBUGGING_MESSAGES_ON_PHRASE = ""; //turn logging on if this is found. Leave set to "" to improve performance. Debugging tool for catching sporadic problems that disappear when you turn on logging and reload the page.
var CONSOLE_MESSAGES_ADDED_TO_HEAD = true; //add messages to document head, for when FireFox annoyingly truncates logs
var HILIGHT_ONLY = false; //consider all pages exempt and hilite rather than remove. turn this on if the damn cookie system breaks again
var HILIGHT_ELEMENTS_BEING_PROCESSED = false; //visual cue as each page element is processed?
var RECORD_DEBUGGING_INFO_IN_NODE_ATTRIBUTES_AS_THEY_ARE_PROCESSED = false; //Do I even use this anymore? I dunno
var MAX_NUMBER_OF_CALLS_PER_PAGE = 100000000; //prevent endless loops. Set to very high number for actual production use.
var BLOCK_ONLY_IMAGES_CONTAINING_ONLY_TEXT = true; //hide tweet screencaps & probably some memes on FB

!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Starting - logging ", CONSOLE_DEBUGGING_MESSAGES_ON);

this.$ = this.jQuery = jQuery.noConflict(true);
/* necessary for compatibility, according to https://wiki.greasespot.net/@grant */

/* from webcooler.xpi contentScript.js */

/***********************************************************************************************
    *********************************** USER GLOBAL VARIABLES GO HERE ******************************
    ************************************************************************************************/

/*** GLOBAL BLOCKING ***/

/* the below all are regexps. BadWords match text, ones marked as selectors match jquery selectors. */

var globalBadWords =
    "\\btrump\\b|donald[_ .j]?[_ .j]?[_ .j]?trump|DeSantis|Yeezy|Adidas|Elon ?Musk|\\bElon\\b|SpaceX|parler|transgender|\\bwoke\\b|MSNBC|taylor greene|\\bbiden|kamala|boebert|cambridge *analytica|(keep|make) america great|AOC|huckabee sanders|bader ginsburg|sarah sanders|Ocasio-Cortez|theapricity|Breitbart|proud boys|roger stone|apricity|jordan[ Bb.]*peterson|mansplain|bolsonaro|gerrymander|steve king|mitch mcconnell|school shoot|huckabee[^'s]|rex reed|fake news|roseanne *barr|stormy *daniels|eagles of death metal|kanye west|kim kardashian|laughing ?squid|proud boy|parkland|stoneman douglas|sandy hook|kaepernick|dylann roof|Arpaio|John Bolton|Rick Santorum|crisis actor|[^A-Za-z]NRA[^A-Za-z]|maxine waters|environmentalist|religious (freedom|liberty|right)|patriot prayer|deep state|crooked hillary|Conservative Political Action Conference|cpac|actblue|truthdig|sexual misconduct|goyim|shithole countr|\'shithole\'|\"shithole\"|(blue|all|white) lives matter|raw water|assault rifle|political[-lly ]*correct|social justice|roy moore|white nationalist|manafort|rob *schneider|the ?blaze|confederate flag|\\bsharia\\b|hillary clinton|bill ?o['’]?reilly|Wilbur Ross|o[’']?reilly ?factor|\\bTrump\\b|ajit pai|ann coulter|tucker carlson|bill maher|spicer|actblue|Hannity|David\\ Brock|Daily ?Stormer|alex jones|daily caller|bill nye|rachel maddow|infowars|rand paul|keith olbermann|Angus ?King|Cernovich|ann coulter|roger stone|climate deni[ae]|townhall\\.com|richard ?b?\\.? ?spencer|slate.com|kanye|paul joseph watson|prison ?planet|s1\\.zetaboards\\.com|anthroscape|daily ?kos|gamergate|betsy devos|steve bannon|\#*maga[^a-z]|corporate america|healthcare|marine le pen|red ?pill|Yiannopoulos|geert wilders|vox day|huffington|cuckservative|libtard|Bernie Sanders|SJW|alt-right|Tim Pool|Chelsea Clinton|\\@potus|\\@realdonaldtrump|(\\.|\\!) sad\\!|racist|Bernie bros|zero ?hedge|This Tweet is unavailable|liberal propaganda|supremacist|liberal media|electoral landslide|typical liberal|white privilege|Robert Morris|Robert Tappan Morris|Morris Worm|stormfront";
/* Please note, my personal collection of badWords is selected not by political ideology, but by what seems to attract either the most heated or the most egregiously stupid comments and content online, regardless of political slant. Any apparent political alignment is strictly a 'shoe fits' situation. Also includes a couple of what I think are just totally biased and unreliable propaganda sites and commentators on both ends of the spectrum. */
/* \\btrump\\b|donald[_ .j]?[_ .j]?[_ .j]?trump proven effective at blocking trump but not "strumpet" */
var selectorsToConsiderTogether =
    'aside|#hyperfeed_story_id|li[data-hveid]|div[data-hook="review"]|li.yt-shelf-grid-item.yt-uix-shelfslider-item';
/* block higher-level elements if any descendant elements contain badwords. Like, remove a whole tweet, or a whole fb reply, not just the <div> containing the badword. Otheriwse it looks for the smallest element it can remove. */
/* aside is on guardian.com, but maybe it's used eslewher, I dunno */
var selectorsToAlwaysHide = "div.cnnoutbrain|div.outbrain-hotlist|div.outbrain-module";
/* hide some page structures no matter what. Good for blocking ads, etc. Can also use ':has(["+thisScriptHiddenAttribute+"=true])' selector to always block certain parent elements if they contain an element the script has hidden, so the empty parent elements don't display. */

/*** SITE-BY-SITE BLOCKING ***/

/* block extra words on a site-by-site basis, like, fer instance, twitter and facebook, where ignorant people are particularly vocal: */
/* note: \b word boundaries doesn't work in userscript. We need \\b in the string, because the string just passes \b as 'b'. \b is a regex code, not recognized by strings. */
var siteSpecificBadWords = {

    /* social media sites*/
    "twitter.com$|nextdoor.com$|quora.com$|reddit.com$|facebook.com$|youtube.com$": "James Witcher|Nikki Beach|Jussie Smollett|Mueller|Barr report|William Barr|\,” Tom said |Cindy McCain|John McCain|chick-fil-a|America great|AOC|biden|covington|jill stein|abortion|ocasio-cortez|\\bAOC\\b|gabbard|ideological[ly]* pur|purity test|tear *gas|grassley|merrick garland|McCain|soros|Kavanaugh|traitor|Ivanka|same[- ]sex|Jared Kushner|\\bpence\\b|\\bgender\\b|nikki haley|MSM|deplorable|medicaid|melania|the left|climate change|global warming|russia|walmart|wal-mart|[^a-zA-Z]NRA[^a-zA-Z]|nader|climate scien|single[ -]*payer|racism|net neutrality|gubb[aer]+m[ie]+nt|(second|2nd) amendment|government spend|prsident|zionis|taxpayer|anti-*semit|republican|democratic party|democrats?\\b|liberals|healthcare|extremist|comey\\b|libertarian|antifa\\b|bakedalaska|protestor|conservatives|poor people|gov'?t|climate change|terroris[tm]|tax plan|snowflake|global warming|drain the swamp|feminis[tm]|\\bMRA|PUA\\b|unborn|\\btwp|rac(ial|e) realism|venezuela|abortion|\\bISIS\\b|devos|communist|commie|socialist|\\bweev\\b|aurenheimer|white (house|guys)|obama|bDNC\\b|cultural\\ appropriation|hate\\ crime|\RNC\\b|democratic socialism|leftist|rightist|mar-?a-?lago|(white|black|brown) *(wom[ae]n|m[ae]n|people|(-*skin))|burqa|Kellyanne\\ Conway|illegal alien|\\bTrump\\b|white nationalist|Nazi|This tweet is unavailable.",
    "twitter.com$": "\\bshill\\b",
    /*common troll comment on twitter, used in other ways on non-political Reddit subs */
    "reddit.com$": "GreenIn2",
    "tumblr.com$": "#branflake|#kung-fu kutie",
    /* "facebook.com$": "[0-9][0-9][0-9] shares", I Guess at some point I didn't want to see widely-shared things. Not sure why */
    /* news sites */
    "abcnews.go.com$|feedly.com$|newsblur.com$|apnews.com|reuters.com|theguardian.com|npr.org|hosted.ap.org": "molester|world cup|civility|transgender|missile|same[- ]sex|Ivanka|Jared Kushner|\\bNFL\\b|gorsuch|tensions|kim jong un|Pence|N(\\.|orth) Korea|Rod Dreher"
};

/* never run on sites matching these */
/*ok, this is really dumb, but I have some personal sites (social media, etc) I don't want to publicly associate myself with. */
/* So, since I post this script publicly, I created the StupidHash function (see below) that inserts a wchash attribute into */
/* the body of each page. You can put the page's wchash here instead of the url. */
var exemptSites = "heisenbergreport\\.com|github\\.com|178496.2674270637|H1231.5759860347705|fivethirtyeight\\.com$|H184.74811863139513|18297985\.81780946|139514\.47879774484|H1269643\.1719910516|78882\.83274254062|\\.gov[/?:]|\\.gov$|H784\.1647977343692|H2603\.8344187906177"; //URL or wchash or wchashhost. NEED \\ to match periods, otherwise periods AND everything else matches in urls. fivethirtyeight\.com$ would match fivethirtyeightacom$. Doesn't matter as much in stupidhashes, as not likely to have two of them identical except for a character in place of the dot.
/* 78882.83274254062 = Dave M */
/* Now, some useful definitions for the below sections: */
//var fb_OutermostWhiteBox = "div._4-u2"; /*Does this ever change? We'll see. */
//var fb_OutermostWhiteBox = "div._5jmm._5pat._3lb4"; /*Looks like it changed. Dec 7 2018 */
var fb_OutermostWhiteBox = "div._5pcb"; // changed again. 2019jan26
var fb_post = "div.fbUserContent"; /* entire post */
var fb_postContent =
    "div._1dwg"; /*._1dwg is around post content (the top) but not comments or the bar with "like, share" etc. */

/* site-specific extras to consider with selectorsToConsiderTogether: */
var siteSpecificSelectorsToConsiderTogether = {
    "youtube.com$": ".video-list-item|ytd-compact-video-renderer",
    "tumblr.com$": "li.post_container|article",
    "twitter.com$": 'div[aria-label="Timeline: Conversation"]>div>div|div[aria-label="Timeline: Tweet"]>div>div|div.TweetWithPivotModule|div.MomentCapsuleSummary--card|.TwitterCard|.QuoteTweet|.CardContent|li[data-item-type="tweet"]|.ProfileCard|li.trend-item|.js-account-summary.account-summary.js-actionable-user',
    /* removed twitter:'.js-stream-item.stream-item' because was hiding entire 'tweets you might have missed' if one matched */
    "reddit.com$": '.noncollapsed|.was-comment|.recipient|.message|div.comment ',
    "google.com$": "div.unNqGf|div[jsname='yEVEwb']|explore-desktop-accordion|div.kp-wholepage.ss6qqb.u7yw9.zLsiYe.mnr-c.UBoxCb.kp-wholepage-osrp.Jb0Zif.EyBRub|div.RzdJxc|div.Kot7x|div.Ow4Ord|div.g|div._oip._Czh|g-section-with-header|div._NId>div.srg>div.g|div.AJLUJb > div|div.sATSHe| div.XqFnDf[data-hveid='CAYQDQ']>",
	/* div.kp-wholepage.ss6qqb.u7yw9.zLsiYe.mnr-c.UBoxCb.kp-wholepage-osrp.Jb0Zif.EyBRub is a "knowledge panel,
    div.RzdJxc is video result | div.AJLUJb > div is "related searches", div.unNqGf is "+" button across top,
    div[class='XqFnDf'][data-hveid='CAYQDQ'] appears to be top-of-page "onebox",
    div.sATSHe is "About" box in right column, div[jsname='yEVEwb'] is "people also ask" */
    "facebook.com$": 'div._4eeo|div[aria-label="Comment"]|article._55wo|div[role=article]|li.jewelItemNew|div._3soj|div.UFIRow.UFIComment|div._1yt|li._5my2|li._58rc|div._4-u3|' + fb_postContent,
    /* li._5my2 is 'trending' row. div.div._4-u3 is a "related article" beneath a share.
    li._58rc is a 'related content' box. div._1yt is a search result post */
    /* div._4eeo is a div around an image in a content */
    "mbasic.facebook.com$": 'div[role="article"]|div#m_story_permalink_view>div>div>div>div',
    "feedly.com$": "div.feed-large.item.feed|div.entry|div.entry.unread.u4.density-29",
    "abcnews.go.com$": "article.news-feed-item",
    "theguardian.com$": "li.fc-slice__item|li.headline-list__item|li.right-most-popular-item",
    "usatoday.com": "a.srrfsm-link",
    "theatlantic.com$": 'div[class^="ArticleRecirc_itemRoot__"]|li[class^="ArticleMostPopular_li__"]',
    "nytimes.com$": "li.collection-item|li.Ribbon-ribbonStory--2vH2y|div.Recirculation-recirculationItem--1bXrY|ul.menu.layout-horizontal.theme-story li|aside.trending-module div ol li",
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

var constantSiteSpecificSelectorsToAlwaysHide = {

    "facebook.com$": "div.x1n2onr6 > a[href*='https://www.facebook.com/photo'] img[alt*=Twitter]|div._n3 div._6iiv|div._n3 div._6iin|div.UFIRow.UFIComment["+thisScriptHiddenAttribute+"=true]+div.UFIReplyList|" + /* that's the reply list under a hidden comment */
    "div.pagelet-group.pagelet|img[alt*='may contain: text']:not(.spotlight)|img[alt*=', text']:not(.spotlight)|div[data-referrer='pagelet_trending_tags_and_topics']|div._6iiv._6r_e"
    /* div._6iiv._6r_e is comments on lightbox image */ /* .spotlight is a lightbox image... if it's in a lightbox, I clicked on it, and want to see it. */
       /* had this but it appears not to be used anymore: fb_OutermostWhiteBox +
        ":has(div._14bf)"  */,
       /* This actually worked, but worried it'll be slow    "reddit.com$":"div.Comment:has(>div._2OpuabFjFVU3UZ4jcP58gJ["+thisScriptHiddenAttribute+"=true]),div._2OpuabFjFVU3UZ4jcP58gJ:has(>div._1mvcEtI04YyIVKsT-vUkiN["+thisScriptHiddenAttribute+"=true]),div._1mvcEtI04YyIVKsT-vUkiN:has(>div.hpOP1hjcTLrw1L2rfRtMP["+thisScriptHiddenAttribute+"=true]),div.hpOP1hjcTLrw1L2rfRtMP:has(>div._3CecFEZvC8MFSvLsfuVYUs["+thisScriptHiddenAttribute+"=true]),div._3CecFEZvC8MFSvLsfuVYUs:has(>div._2QR1H6z3qpmyHNdkMUnzVu["+thisScriptHiddenAttribute+"=true]),div._2QR1H6z3qpmyHNdkMUnzVu:has(>div.Ov9DvczDidxNqJMR_axF2._3ezOJqKdLbgkHsXcfvS5SA["+thisScriptHiddenAttribute+"=true]),div.Ov9DvczDidxNqJMR_axF2._3ezOJqKdLbgkHsXcfvS5SA:has(>div["+thisScriptHiddenAttribute+"=true]) ", */
/* weirdly, this seemed faster than the above */ "reddit.com$":"div:has(>div["+thisScriptHiddenAttribute+"=true]):not(:has(div.Comment))",
        /* careful this crashed the script: div[role='article']:has(img[alt*='may contain:[^']*text']) */
/* used to have div[role='article']:has(img[alt*='may contain: text'])|div[role='article']:has(img[alt*=', text']) ut these have got to be super-slow because there are so many role=article divs... trying just the img. */
    "youtube.com$": "ytd-video-meta-block > ytd-badge-supported-renderer",
     "reuters.com$":"div.container_19G5B:has(h1["+thisScriptHiddenAttribute+"=true])|div.container_19G5B:has(a[href=\"/news/archive/rcom-sponsored\"])", /* article where title is hidden, or sponsored */
    /* get rid of annoying corproate channels */
    "twitter.com$": "div.promoted-tweet|div[data-disclosure-type=promoted]|div[data-advertiser-id]|div[data-promoted=true]",
  "abcnews.go.com$": "article.article:has(header.article-header:has(["+thisScriptHiddenAttribute+"=true]))|article.artcle:has(div.article-copy["+thisScriptHiddenAttribute+"=true])" /*hide article if headline is hidden or whole article body is hidden*/
 };

/* div._n3 div._6iiv|div._n3 div._6iin are "most relevant" header and comment blocks on lightbox images. Really need to find a way to apply this to Public images only, but for now this'll do */

var siteSpecificParentsToHideIfAChildIsHidden = { /* NOTE WORKING? Reddit entry didn't work. */
    /* ok, here's the deal... when hiding a parent, that parent also receives the child's classes in a new hiddenclasses tag. This is so we can make <li><div><div class='cl"> hide the div and li ONLY if they contain div.cl, without using ":has(div.cl)" because that doesn't work with the pure javascript .matches() function that we use. now we can specify li[hiddenclass*=cl],div[hiddenclass*=cl]. */
"nextdoor.com$":"div.comment-detail,div.cee-media-body,div.comment-detail-content,div.comment-detail-content div",
   /*DIDN'T WORK, WHY?  "reddit.com$":"div.Ov9DvczDidxNqJMR_axF2._3ezOJqKdLbgkHsXcfvS5SA", */
    "duckduckgo.com$":"div.result,div.result__body,div.result__extras__url",
    "facebook.com$": "div._5jmm,div._4-u2.mbm._4mrt._5v3q._7cqq._4-u8,div._3ccb,div._5pcr,"+fb_postContent /*basic feed post container, a lot of the below use this */
+",div._1dwg._1w_m._q7o,div._5pcr > div._1dwg._1w_m._q7o > div,div._3x-2,div._3x-2 > div,div.mtm,div.mtm > div,div._1ktf,a._4-eo._2t9n,div._46-h._517g,div.uiScaledImageContainer"

/* replaces fb_OutermostWhiteBox +
        ":has(" + fb_postContent + "["+thisScriptHiddenAttribute+"=true])" */

    /* it's a whole chain from a hidden post image, on up through a hidden post, on up to the outer container, so a whole post is hidden if an imaage  or top post is hidden. */
+",div[hiddenclass*=_4eek],li[hiddenclass*=_4eek]"
    /* hide whole LI if comment is hidden so like that shows how many replies there are gets hidden.*/
 +",div[hiddenclasstheclosest*=x1n2onr6],li"
    //one above this was no longer catching all LIs as of Mar 2023
+",div.x1n2onr6,a.x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz.x1lliihq.x1pdlv7q:first-child, div.x6s0dn4.x78zum5.xdt5ytf.x6ikm8r.x10wlt62.x1n2onr6.xh8yej3.x1jx94hy:first-child,div.x6s0dn4.x78zum5.xdt5ytf.x6ikm8r.x10wlt62.x1n2onr6.xh8yej3.x1jx94hy:first-child > div:first-child,div.xqtp20y.x6ikm8r.x10wlt62.x1n2onr6:first-child,div.x10l6tqk.x13vifvy"
/* that's the whole path to from a hidden photo's parent div up to the div you need to collapse to get rid of the blank white space as of march 20, 2023. */
+",div._3-8j,div._3-8j > div"
    /* general enclosure for an item that more than one friend has shared */

    +",div._6m2._1zpr._dcs._4_w4._41u-._59ap._2bf7._64lx._3eqz._20pq._3eqw._2rk1._359m._1-9r,div._2r3x,div._2r3x > div,span._3m6-,div._3ekx._29_4,div._6m3._--6,div._3n1k"
/* path up from a heading or description on a shared link that more than one friend has shared, to above enclosure */

+",div._5r69._sds._1hvl, div._5r69._sds._1hvl > div.mts, div._5r69._sds._1hvl > div.mts > div"
/* path up from an image (alt="*text*", most probably) that more than one friend has shared, to above enclosure */

+",div._1dwg > div,div._3x-2"
/* another path up from a post image, maybe an image in a post where a friend was tagged? */

};




/* NOTE: div._4-u2 is the outer container for a facebook post (and any other white box on their gray background as of this writing. Does this ever change? We'll see. div.fbUserContent is right inside that and seems less likely to change, but the outer one has the margins. */
/* ._5r69 seems to be the div surrounding a shared post. */ /* _5x46 is the header with who posted and who it was shared from */ /* div._14bf is either "suggested post" or "sponsored" */ /* div.pagelet-group.pagelet is suggested pages (or is it groups? Or both?) */
/* use div[role='article']:has(img[alt~='text'][alt*='may contain:']) to block any FB images that contain text even if the contain other things. */
/* before simplification, FB also had "div.fbUserContent:has(div.fbUserContent:has(div.userContent["+thisScriptHiddenAttribute+"=true]))|div._4-u2.mbm._4mrt._5jmm._5pat._5v3q._4-u8:has(div.userContent:has(["+thisScriptHiddenAttribute+"=true]))|div._5r69:has(["+thisScriptHiddenAttribute+"=true])|div._5x46:has(["+thisScriptHiddenAttribute+"=true])|div._4-u2.mbm._4mrt._5jmm._5pat._5v3q._4-u8:has(div._5x46["+thisScriptHiddenAttribute+"=true])|div._4-u2.mbm._4mrt._5jmm._5pat._5v3q._4-u8:has(div._1dwg["+thisScriptHiddenAttribute+"=true])|" */
/* I think div._3b-9._j6a is comments on image lightboxes. Sick of seeing people's stupid comments on things I click on to save. NOPE it's all comment blocks. Gotta refine that one. */
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
/* highlight leaf nodes containing text (beware, case-sensitive): $('*:contains("I am a SIMPLE string")').each(function(){ //!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √173√ 'function( )' ~ ~ ~","","ULTRA");
 if($(this).children().length < 1) $(this).css("border","solid 2px green") });
        ^^More info, including wrapping found text in tags, at http://stackoverflow.com/questions/926580/find-text-string-using-jquery */
/* not() selector: https://api.jquery.com/not-selector/ */
/* how to run a callback function on all text nodes matching a string or regexp: http://stackoverflow.com/questions/4060056/jquery-find-replace-without-changing-original-text/4060635#4060635 */
/* .text() method returns innerText, ignoring embedded tags. "a<i>b</i>c".text() returns "abc".
        ^^ if you wanted to get just "ac" from that, see http://viralpatel.net/blogs/jquery-get-text-element-without-child-element/ */
/* Use .each() and $(this) to iterate: $('.someDivList .divItem').each(function() { //!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √179√ 'function( ) ' ~ ~ ~","","ULTRA");

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
/* get all leaf nodes: $("div").filter( function(index) { //!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √191√ 'function( index) ' ~ ~ ~","","ULTRA");

        var isLeaf = $(this).children().length === 0;
        return isLeaf;
        }
); */
/* check if js has access to iframe contents: http://stackoverflow.com/questions/11872917/check-if-js-has-access-to-an-iframes-document. This way we can
have it act on same-domain iframes, like twitter uses for article embeds. */

/*** USER: END GLOBAL VARIABLES ***/

/* Let's get our variables together & tailored to whatever the current site is */

!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Checking keys now");
globalBadWords = attachSiteSpecifics(globalBadWords||"dummysonothingchokes", siteSpecificBadWords);
!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("globalBadWords ", globalBadWords);
selectorsToConsiderTogether = attachSiteSpecifics(selectorsToConsiderTogether||"dummysonothingchokes", siteSpecificSelectorsToConsiderTogether);
var selectorsToConsiderTogetherRegex = selectorsToConsiderTogether.replace(/\|/g, ",");
!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("selectorsToConsiderTogether ", selectorsToConsiderTogether);
selectorsToAlwaysHide = attachSiteSpecifics(selectorsToAlwaysHide||"dummysonothingchokes", constantSiteSpecificSelectorsToAlwaysHide);
var selectorsToAlwaysHideRegex = selectorsToAlwaysHide.replace(/\|/g, ",");
!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("selectorsToAlwaysHide ", selectorsToAlwaysHide);
var parentsToHideIfAChildIsHidden = attachSiteSpecifics("dummysonothingchokes",siteSpecificParentsToHideIfAChildIsHidden).replace(/\|/g, ",");

var exemptRegexp = new RegExp(exemptSites, "gi");
var theBadFBURLWords = new RegExp("https?\:\/\/[w.]*facebook\.com\/(" + badFBURLWords + ")[?/]", "gi");
var theBadFBNames = new RegExp("mdelimiter(" + badFBNames + ")mdelimiter", "gi");

if (!Element.prototype.matches) {
  Element.prototype.matches =
      Element.prototype.matchesSelector ||
      Element.prototype.mozMatchesSelector ||
      Element.prototype.msMatchesSelector ||
      Element.prototype.oMatchesSelector ||
      Element.prototype.webkitMatchesSelector ||
      function(s) {
        var matches = (this.document || this.ownerDocument).querySelectorAll(s),
            i = matches.length;
        while (--i >= 0 && matches.item(i) !== this) {}
        return i > -1;
      };
} /* this 'polyfill' provides the function element.matches() whether or not the browser provides it natively. from https://developer.mozilla.org/en-US/docs/Web/API/Element/matches */

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
    if (e.originalEvent.ctrlKey && e.originalEvent.altKey && e.originalEvent.shiftKey && e.originalEvent.keyCode == 32) {
        exemptThisPage(0); //EXEMPT PAGE WITH CTRL-OPTION-SHIFT-SPACE
    }
      if (e.originalEvent.ctrlKey && e.originalEvent.altKey && e.originalEvent.shiftKey && e.originalEvent.code == "KeyL") {
        CONSOLE_DEBUGGING_MESSAGES_ON=(CONSOLE_DEBUGGING_MESSAGES_ON==false); //turn off logging with CTRL-OPTION-SHIFT-L
        alert("logging is now "+CONSOLE_DEBUGGING_MESSAGES_ON);
    }
});



!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("########### PRELIMINARY DECLARATIONS FINISHED ############################### ");

function attachSiteSpecifics(globalString, siteSpecificArray) {
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √224√ starting 'function attachSiteSpecifics( globalString, siteSpecificArray) ' ~ ~ ~", "", "ULTRA");

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Attaching site specifics for ", globalString);

    Object.keys(siteSpecificArray).forEach(function(key) {
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √226√ starting 'function( key) ' ~ ~ ~", "", "ULTRA");

        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Checking key ", key);

        var value = siteSpecificArray[key];
        var hostRegexp = new RegExp(key, "gi");
        var hostMatch = document.location.hostname.match(hostRegexp); /* time consuming, according to chrome profiler 1.3 secs */
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("About to match 3 ", hostMatch);

        if (hostMatch !== null) {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √235√ 'if ( hostMatch !== null) ' ~ ~ ~", "", "ULTRA");

            globalString = value + (globalString == "" ? "" :  "|" + globalString );
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("added site-specific " + key);


        }
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √226√ ending 'function( key) ' ~ ~ ~ ~ ~", "", "ULTRA");

    });

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √224√ ending 'function attachSiteSpecifics( globalString, siteSpecificArray) ' ~ ~ ~ ~ ~", "", "ULTRA");

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
/*$.extend($.expr[":"], {
    followsWebCooled: function(a) {

        return $(a).prev().attr(thisScriptHiddenAttribute) == "true";
    }
});*/ /* maybe I'll use this... someday... */


function stupidHash(theString) {

    var j;
    var out = 1;
    for (j = 0; j < theString.length; j++) {

        out = out * (1.0001 + ((theString.charCodeAt(j)) + j) / (256 + j));
    }
    return out.toString();
}


var docbodyjq=$(document.body);
if(!document.body.hasAttribute("wcHash")) {
docbodyjq.attr("wcHash", stupidHash(document.location.href)); /* custom hash usable in exemptsites variable */  /* time consuming, according to chrome profiler 1.1 secs */
}
if(!document.body.hasAttribute("wcHashHost")) {
    docbodyjq.attr("wcHashHost", "H" + stupidHash(document.location.hostname)); /* custom hash usable in exemptsites variable */
}

async function mainScript(elLengthOld, theDelay, mutation, sessionID, currentMatches) {
  !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Mutation in MainScript ",mutation.target);
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √270√ starting 'function main( elLengthOld, theDelay, mutation, sessionID,currentMatches) ' ~ ~ ~", "", "ULTRA");

    /* big stuff happens here */
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Main running. Mutation:", mutation);

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Main running mutation.length:", mutation.length);

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Main running. currentMatches:", currentMatches);

    observerEnable = false;
    var thisActiveElement = document.activeElement;
    /* var thisTarget = $(mutation.target); */
    var i;
    var loopLength = (mutation.type = "childList" ? mutation.addedNodes.length : 1);
    for (i = 0; i < loopLength; i++) { //begin for loop to hit all added nodes
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("In for loop:", "iteration " + i + " of " + loopLength);

        var targetNotJQ = mutation.type = "childList" ? mutation.addedNodes[i] : mutation.target; //we checked that addedNodes has length >0 before calling main(), so no error here
        var thisTarget = $(targetNotJQ);
        var theTargetInnerHTML = targetNotJQ.innerHTML
        if (targetNotJQ.offsetWidth >0 && targetNotJQ.offsetHeight >0 && thisTarget.attr(thisScriptHiddenAttribute) !="true" && theTargetInnerHTML != thisTarget.data("oldInnerHTML") ){
            thisTarget.data("oldInnerHTML",theTargetInnerHTML);
        //only check the mut.target if no nodes are recorded as having been added, and innerHTML has changed since last run
        var mutationParent = thisTarget.parent();
        /* You know, if the mutationtype is "added nodes", you can get the added nodes from the mutation object and just check those. If nodes are removed, it may be marked "added nodes" but then the addednodes attribute is empty and removednodes is not. */
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("ThisTarget is: (about to detach):", thisTarget);

        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("mutationParent:", mutationParent);

        /* for next line: thisTarget is an OBJECT, not a page elemnt! you have to get the page element by index! */
        /* userscripts are triggered when body is added... that's why we can't detach and re-add the body, it'll get stuck in  a loop. Maybe shoudl add an attrubute to the body or something to let it do it once but not again. */
        if (!!thisTarget.length && thisTarget[0].tagName != "BODY") {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √278√ 'if( thisTarget.tagName != ''BODY'') ' ~ ~ ~:", thisTarget[0].tagName, "ULTRA");
 /* something was interfering with a lot of normal page operations, things were reloading, etc. I'm hoping this conditional fixes it. */
            var placeholder = $('<span style="display: none;" />').insertAfter(thisTarget);

            thisTarget.detach();

        }
        //makes things faster
        /* DIDN'T WORK... see bottom of main function */
        if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √284√ 'if ( HILIGHT_ELEMENTS_BEING_PROCESSED) ' ~ ~ ~", "", "ULTRA");

            observerEnable = false;
            targetNotJQ.style =
                "border: 5px dotted rgba(100,0,100,1) !important; background:rgb(100,0,100) !important;" +
                targetNotJQ.style;
            thisTarget.data("highlighted", true);
            observerEnable = true;

        }

        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("checking node:", targetNotJQ);

        if (typeof thisTarget.data() === "object" &&
            (!thisTarget.data("scriptprocid") ||
                thisTarget.data("scriptprocid") != sessionID)
        ) {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √296√ starting 'if ( typeof thisTarget.data() === ''object'' && 298 (!thisTarget.data(''scriptprocid'') || 299 thisTarget.data(''scriptprocid'') != sessionID) 300 ) ' ~ ~ ~", "", "ULTRA");

            wcSetAttributeSafely(targetNotJQ, "scriptprocid", sessionID);
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Confirmed not yet checked this session:", targetNotJQ);

            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("about to find selectorsToConsiderTogether:", "");

            /* I should skip this and the next if the top-level node's inner text doesn't contain badwords, save some time cycling through them */

            /* var theseNodes=thisTarget
            .find("*")
            .addBack(); */
          var  theseNodesForEach = thisTarget
                .find(selectorsToConsiderTogetherRegex).addBack(selectorsToConsiderTogetherRegex)
                .filter(function() {
                var filtThis = this;
                    var filtThisInnerHTML = filtThis.innerHTML;
                var filtThisjq= $(this);
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √312√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");

                    if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √313√  'if ( HILIGHT_ELEMENTS_BEING_PROCESSED) ' ~ ~ ~", "", "ULTRA");

                        /* debugger; */
                        filtThis.style =
                            "border: 5px dotted rgba(0,0,160,1) !important; background:rgba(0,0,255,.5) !important;" +
                            filtThis.style;
                       filtThisjq.data("highlighted", true);

                    }
                    var theBadWordsFound = filtThisjq.text().match(currentMatches) ? filtThisjq.text().match(theBadWords) : null; /* check current matches first to save time, then check against actual regex so partial text matches dont cause false positives (IE 'hanran' doesn't match "NRA" in the second one.) */
                    if (theBadWordsFound !== null && filtThisjq.data("oldInnerHTML") != filtThisInnerHTML && (!filtThisjq.data("scriptprocid") ||
                            filtThisjq.data("scriptprocid") != sessionID) &&
                        /* was: !$(this).prop("isContentEditable") */
                        (thisActiveElement.tagname == "BODY" ? true : (!!filtThisjq.prop("isContentEditable") == false && filtThisjq.has("[contenteditable]").length == 0)) /* rejects anything with editable descendants */
                    ) {
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √321√ starting 'if ( theBadWordsFound!== null && (!$(this).data(''scriptprocid'') || 324 $(this).data(''scriptprocid'') != sessionID) && 325 /* was: !$(this).prop(''isContentEditable'') */ 326 ( thisActiveElement.tagname==''BODY''?true: ($(this).prop(''isContentEditable'')==false && $(this).has(''[contenteditable]'').length==0)) /* rejects anything with editable descendants */ 327 ) ' ~ ~ ~", "", "ULTRA");

                        if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
                            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √328√ 'if ( HILIGHT_ELEMENTS_BEING_PROCESSED) ' ~ ~ ~", "", "ULTRA");

                            /* debugger; */
                            filtThis.style =
                                "border: 5px dotted rgba(0,160,160,1) !important; background:rgba(0,255,255,.5) !important;" +
                                filtThis.style;
                            filtThisjq.data("highlighted", true);

                        }

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("found '" + theBadWordsFound + "' in selectorsToConsiderTogether", filtThis);

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √321√ ending 'if ( theBadWordsFound!== null && (!$(this).data(''scriptprocid'') || 324 $(this).data(''scriptprocid'') != sessionID) && 325 /* was: !$(this).prop(''isContentEditable'') */ 326 ( thisActiveElement.tagname==''BODY''?true: ($(this).prop(''isContentEditable'')==false && $(this).has(''[contenteditable]'').length==0)) /* rejects anything with editable descendants */ 327 ) ' ~ ~ ~ ~ ~", "", "ULTRA");

                        filtThisjq.data("scriptprocid", sessionID);
                        filtThisjq.data("oldInnerHTML", filtThisInnerHTML);
                        return true;
                    } else {
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √321√  'else ', returning false ~ ~ ~", "", "ULTRA");


                        return false;
                    }
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √312√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");

                }); /* end filter function */
var theseNodesForEachl = theseNodesForEach.length;
            //start replacement to get rid of .each() because it's very slow
for (var theseNodesForEachi=0;theseNodesForEachi<theseNodesForEachl; theseNodesForEachi++) {
var tn=theseNodesForEach[theseNodesForEachi];

    var tnjq=$(tn);
           var hiddencounttnjq = 0;
 var hiddenclasstnjq =tnjq.attr('class');
  while (typeof tnjq.parent()[0] != 'undefined' && tnjq.parent().attr("hiddenclasstnjq",hiddenclasstnjq)[0].matches(parentsToHideIfAChildIsHidden)) {tnjq = tnjq.parent();
tnjq.attr("hiddencount",++hiddencounttnjq).attr("hiddenclass",hiddenclasstnjq);}


                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √347√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");

                    if (thisPageIsExempt) {
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √348√ 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");

                        tnjq
                            .css("border", "3px solid red")
                            .css("background", "rgba(255,225,225,.5)")
                            .attr(thisScriptHiddenAttribute, "true");
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("TEST added red to", tn);


                    } else {
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √353√ 'else ' ~ ~ ~", "", "ULTRA");

                        tnjq
                            .hide()
                            .data("savedstyle", tnjq.attr("style"))
                            .attr("style", "display:none !important")
                            .attr(thisScriptHiddenAttribute, "true");

                    }
                    wcSetAttributeSafely(tn, "scriptprocid", sessionID);
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("added red to",tn);

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √347√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");


}
//end replacement

            /* TEXT NODES ONLY NOW: */
            var walk = thisTarget /*find ordinarily only returns child elements unless you add addBack.*/
                /* .find(':visible:not("iframe")').addBack(':visible:not("iframe")') */

/* march 2023: not even going to walk the tree if text content of top node doesn't contain badwords. Hopefully this will improve performance */

.filter(function() {

var theFiltThis=this.textContent;

      var theBadWordsNodeValueFound =  theFiltThis.match(/[a-zA-Z]/) ?theFiltThis.match(theBadWords) : null; /* first make sure theres even text content to filter *//*see comment above on previous use of this about this */
                    return (theBadWordsNodeValueFound !== null );
                    /* was !$(this).prop( "isContentEditable" ) /~ cant use === false because .prop("isContentEditable") === undefined for text nodes ~/ */
                    /* update... !!value will coerce value=undefined to false */



})
            /* end march 2023 addition */

                .find(':not("iframe,script,style")').addBack(':visible:not("iframe,script,style")')
                .contents() /* like children() but also includes text and comment nodes */
                .filter(function() {
                     return (this.nodeType === 3);
                })
                .filter(function() {
                var theFiltThis=this;
                var theFiltThisjq=$(this);
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √372√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("filtering node:", theFiltThis, "greenCrit");

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("filtered nodeValue is:", theFiltThis.nodeValue, "greenCrit");

                  /*  //!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("filtered node value - currentMatches is:", currentMatches, "greenCrit");
 */
                    /* //!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("filtered node value - theBadWords is:", theBadWords,"greenCrit");
 */

                    var theBadWordsNodeValueFound =  theFiltThis.nodeValue.match(/[a-zA-Z]*/) ?theFiltThis.nodeValue.match(currentMatches) ? theFiltThis.nodeValue.match(theBadWords) : null:null; /* first make sure theres even text content to filter *//*see comment above on previous use of this about this */
                    var theCriteria =
                        theBadWordsNodeValueFound !== null &&
                        (thisActiveElement.tagName == "BODY" ? true : (!!theFiltThisjq.prop("isContentEditable") == false && !!theFiltThisjq.has("[contenteditable]").length == false)); /* rejects anything with editable descendants */
                    /* was !$(this).prop( "isContentEditable" ) /~ cant use === false because .prop("isContentEditable") === undefined for text nodes ~/ */
                    /* update... !!value will coerce value=undefined to false */
                    var tempVar = theFiltThisjq;
                    var theCritResult = {
                        "filter returns result": theCriteria,
                        "theBadWordsNodeValueFound": theBadWordsNodeValueFound,
                        "thisActiveElement": thisActiveElement,
                        "thisActiveElement.tagName": thisActiveElement.tagName,
                        "!!$(this).prop('isContentEditable')": !!tempVar.prop("isContentEditable"),
                        "!!$(this).has('[contenteditable]').length==false)": !!tempVar.has("[contenteditable]").length == false
                    };
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("the filter returns (true for include):", theCritResult, "greenCrit");

                    if (theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) {

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("456 Matched green ", theBadWordsNodeValueFound, "greenCrit");


                    }
                    if (!theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) {
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √393√ 'if ( !theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) ' ~ ~ ~", "", "ULTRA");

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("theBadWordsNodeValueFound ", theBadWordsNodeValueFound, "greenCrit");

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("document.activeElement.tagName ", thisActiveElement.tagName, "greenCrit");

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("$(this) ",                             tempVar                         );

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("$(this).prop(isContentEditable) ",                             tempVar.prop("isContentEditable"), "greenCrit"                         );

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("$(this).has([contenteditable]).length ",                             tempVar.has("[contenteditable]").length, "greenCrit"                         );



                    }
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √372√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");

                    return theCriteria;
                }); /* filter function 2 done */
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("about to walk text leaves:", walk);

//about to replace walk.each
        var walkl=walk.length;
            for (var walki=0;walki<walkl; walki++){
                var wvar=walk[walki];
                var wvjq=$(wvar);
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √420√ starting 'function( ) ' ~ ~ ~","beginning to look for selectors to consider together", "ULTRA");

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("walking text leaf:", wvjq[0] || wvar);
 /* don't know why this[0] is sometimes, maybe always, not evaluating. don't care right now. maybe needs to be $(this)[0]?*/
                var theClosest = wvjq.closest(selectorsToConsiderTogetherRegex); /* I need to use nextUntil() and prevUntil() to add consecutive sibling dd's and dt's to theClosest so one doesn't get left if the other is removed. See https://en.wikipedia.org/wiki/List_of_music_considered_the_worst for example. Too tired to do it right now though. */
                var theClosestBlock = theClosest.length === 0 ? wvjq.closest("p,div,td,table,h1,h2,h3,h4,h5,h6,li,dd,dt" /* '[style*=display:block]'*/ ) : theClosest;
                theClosest = theClosest.length === 0 ? theClosestBlock : theClosest;
                /* sometimes the mutation target is just a text node that changed (like clicking a "more" link on facebook. In that case, see if it's enclosed in one of selectorsToConsiderTogether before just looking for the closest() parent block element. */
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("theClosestBlock:", theClosestBlock);

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("theClosest:", theClosest);
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("theClosestBlock:");
!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging(theClosestBlock);

  var hiddencounttheClosest = 0;
 var hiddenclasstheClosest =theClosest.attr('class');
  while (typeof theClosest.parent()[0] != 'undefined' && theClosest.parent().attr("hiddenclasstheClosest",hiddenclasstheClosest)[0].matches(parentsToHideIfAChildIsHidden)) {theClosest = theClosest.parent();
theClosest.attr("hiddencount",++hiddencounttheClosest).attr("hiddenclass",hiddenclasstheClosest);}
                if (thisPageIsExempt) {
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √437√ starting 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");

                    theClosest
                        .css("border", "1px solid green")
                        .css("background", "rgba(225,255,225,.5)")
                        .attr(thisScriptHiddenAttribute, "true");
                    if (theClosest != theClosestBlock) {

                        theClosestBlock
                            .css("border", "1px dotted darkgreen")
                            .css("background", "rgba(200,255,200,.5)")
                            .attr(thisScriptHiddenAttribute, "true");
                       !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("495 Setting css for (theClosest != theClosestBlock)", theClosestBlock, "ULTRA");

                    }
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √437√ ending 'if ( thisPageIsExempt) ' ~ ~ ~ ~ ~", "", "ULTRA");

                } else {

                    theClosest
                        .hide()
                        .data("savedstyle", theClosest.attr("style"))
                        .attr("style", "display:none !important")
                        .attr(thisScriptHiddenAttribute, "true");
                 !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √437√ ELSE (page isn't exempt) ' ~ ~ ~ ~ ~", theClosest, "ULTRA");

                }
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("added green to", theClosest[0] || theClosest);
 /* don't know why theClosest[0] is sometimes, maybe always, not evaluating. don't care right now. */
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √420√ ending 'function( ) ' ~ ~ ~ ~ ~", "endinging looking for selectors to consider together", "ULTRA");

            }



                //end replacement

            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("done walking text leaves", walk);


            /* NOW A ONLY */
            var theseAnodes = thisTarget
                .find("span.fwb, a[data-hovercard]").addBack("span.fwb, a[data-hovercard]").filter(function() {
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("filtering theseAnodes",  this, "ULTRA");
 // WAS .find("A,span.fwb") , BUT DON'T NEED A, NAME IS ENOUGH
                    var theFiltThis = this;
                    var theFiltThisjq = $(this);

                    return (typeof theFiltThisjq.data() === "object" &&
                        (!theFiltThisjq.data("scriptprocid") ||
                            theFiltThisjq.data("scriptprocid") != sessionID)); /* it seemed to work without this semicolon, but jshint said I need it. */

                });
            /* that was A selectors to consider together, this is other A nodes */

            var aWalk = theseAnodes /*find ordinarily only returns child elements unless you add addBack.*/

                .filter(function() {
                var theFiltThis = this;
                var theFiltThisjq = $(this);
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √475√ 'function( ) ' ~ ~ ~", "", "ULTRA");

                    wcSetAttributeSafely(theFiltThis, "scriptprocid", sessionID);
                    var itsAhref = false; /* was (typeof this.href) === 'string' && (this.href.match(theBadFBURLWords) || ("mdelimiter"+$(this).text()+"mdelimiter").match(theBadFBNames)) && this.href != "#"; */
                    var itsFWBSpan = (typeof theFiltThis.tagName) === 'string' && theFiltThis.tagName == "SPAN" /* fails if not uppercase */ && theFiltThisjq.hasClass("fwb");
                    var itsDataHovercard = (typeof theFiltThis.tagName) === 'string' && theFiltThis.tagName == "A" && theFiltThisjq.is("[data-hovercard]");
                    var itsAname = (itsFWBSpan || itsDataHovercard) && ("mdelimiter" + theFiltThisjq.text() + "mdelimiter").match(theBadFBNames);
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("found A section fwb span", theFiltThisjq.text());

                    /* //!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("itsAname",itsAname);

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("(typeof this.tagName) === 'string'",(typeof this.tagName) === 'string');

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("this.tagName=='span'",this.tagName);

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("$(this).hasClass('fwb')",$(this).hasClass("fwb"));

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("('mdelimiter'+$(this).text()+'mdelimiter').match(theBadFBNames)",("mdelimiter"+$(this).text()+"mdelimiter").match(theBadFBNames));
*/


                    return (itsAhref || itsAname);
                })
                .filter(function() {
                                var theFiltThis = this;
                var theFiltThisjq = $(this);

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √490√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("filtering A section pt II node:", theFiltThis);

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("filtered A section pt II node value is:", theFiltThis.nodeValue);

                    var theCriteria =

                        (thisActiveElement.tagName == "BODY" ? true : (!!theFiltThisjq.prop("isContentEditable") == false && theFiltThisjq.has("[contenteditable]").length == 0)); /* rejects anything with editable descendants */
                    /* was !$(this).prop( "isContentEditable" ) /~ cant use === false because .prop("isContentEditable") === undefined for text nodes ~/ */
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("the A section filter returns (true for include):",                         theCriteria                     );

                    if (theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) {
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √503√ starting 'if ( theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) ' ~ ~ ~", "", "ULTRA");

                        if ((typeof theFiltThis.href) === "string" && theFiltThis.href.match(theBadFBURLWords)) {

                            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Matched purple href ", theFiltThis.href.match(theBadFBURLWords));


                        } else {

                            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Matched purple contents ", ("mdelimiter" + theFiltThisjq.text() + "mdelimiter").match(theBadFBNames));



                        }

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √503√ ending 'if ( theCriteria && CONSOLE_DEBUGGING_MESSAGES_ON) ' ~ ~ ~ ~ ~", "", "ULTRA");

                    }

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √490√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");

                    return theCriteria;
                });
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("about to walk A leaves in A section:", aWalk);

   var awalkl=aWalk.length;
            for (var awalki=0;awalki<awalkl; awalki++) {
                var awvar=theseNodesForEach[theseNodesForEachi];
                var awjq=$(awvar)
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √526√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("walking A section leaf:", awjq[0] || awvar);
 /* don't know why this[0] is sometimes, maybe always, not evaluating. don't care right now. maybe needs to be $(this)[0]?*/
                var theClosest = awjq.closest(selectorsToConsiderTogetherRegex); /* I need to use nextUntil() and prevUntil() to add consecutive sibling dd's and dt's to theClosest so one doesn't get left if the other is removed. See https://en.wikipedia.org/wiki/List_of_music_considered_the_worst for example. Too tired to do it right now though. */
                var theClosestBlock = theClosest.length === 0 ? awjq.closest("p,div,td,table,h1,h2,h3,h4,h5,h6,li,dd,dt" /* '[style*=display:block]' */ ) : theClosest;
                theClosest = theClosest.length === 0 ? theClosestBlock : theClosest;
                /* sometimes the mutation target is just a text node that changed (like clicking a "more" link on facebook. In that case, see if it's enclosed in one of selectorsToConsiderTogether before just looking for the closest() parent block element. */
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("theClosestBlock:", theClosestBlock);
  var hiddencounttheClosest = 0;
 var hiddenclasstheClosest =theClosest.attr('class');
  while (typeof theClosest.parent()[0] != 'undefined' &&  theClosest.parent().attr("hiddenclasstheClosest",hiddenclasstheClosest)[0].matches(parentsToHideIfAChildIsHidden)) {theClosest = theClosest.parent();
theClosest.attr("hiddencount",++hiddencounttheClosest).attr("hiddenclass",hiddenclasstheClosest);}

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("theClosest:", theClosest);

                if (thisPageIsExempt == true) {
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √543√ starting 'if ( thisPageIsExempt == true) ' ~ ~ ~", "", "ULTRA");

                    theClosest
                        .css("border", "1px solid aqua")
                        .css("background", "rgba(150,250,250,.5)")
                        .attr(thisScriptHiddenAttribute, "true");
                    if (theClosest != theClosestBlock) {
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √548√ 'if ( theClosest != theClosestBlock) ' ~ ~ ~", "", "ULTRA");

                        theClosestBlock
                            .css("border", "1px dotted aqua")
                            .css("background", "rgba(150,250,250,.5)")
                            .attr(thisScriptHiddenAttribute, "true");

                    }
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √543√ ending 'if ( thisPageIsExempt == true) ' ~ ~ ~ ~ ~", "", "ULTRA");

                } else {
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √554√ 'else ' ~ ~ ~", "", "ULTRA");

                    theClosest
                        .hide()
                        .data("savedstyle", theClosest.attr("style"))
                        .attr("style", "display:none !important")
                        .attr(thisScriptHiddenAttribute, "true");

                }
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("added aqua to", theClosest[0] || theClosest);
 /* don't know why theClosest[0] is sometimes, maybe always, not evaluating. don't care right now. */
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √526√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");

            }
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("done walking A section text leaves", aWalk);


            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √296√ ending 'if ( typeof thisTarget.data() === ''object'' && 298 (!thisTarget.data(''scriptprocid'') || 299 thisTarget.data(''scriptprocid'') != sessionID) 300 ) ' ~ ~ ~ ~ ~", "", "ULTRA");

        } else {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √571√ 'else ' ~ ~ ~", "", "ULTRA");

            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("skipped crit1:", targetNotJQ);

            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("skipped crit2: typeof thisTarget.data():", typeof thisTarget.data());

            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("skipped crit3:thisTarget.data(scriptprocid) :", thisTarget.data("scriptprocid"));

            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("skipped crit4: sessionID:", sessionID);


            wcSetDebuggingAttributeSafely(targetNotJQ, "thisNodeSkippedForSession", sessionID);

        }

        /* Now let's check for wrongly hidden things. this is because sometimes Twitter seems to be setting input fields temporarily to uneditable while backspace key is being hit, and the script jumps in and hides them. */

        /* this isn't the best way to do this, I don't think. Sometimes a "+thisScriptHiddenAttribute+" element CONTAINS an editable one. Not sure if this catches those. (UPDATE: seems to be working, will fix if it doesn't always. */
        if (thisActiveElement.tagName != "BODY") {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √585√ starting 'while backspace key is being hit, and the script jumps in and hides them. */ 586 587 588 /* this isn't the best way to do this, I don't think. Sometimes a "+thisScriptHiddenAttribute+" element CONTAINS an editable one. Not sure if this catches those. (UPDATE: seems to be working, will fix if it doesn't always. */ if(thisActiveElement.tagName != ''BODY'') ' ~ ~ ~", "", "ULTRA");
 /* only do if there is an active input element */

            var hiddenWalk = thisTarget
                .find("["+thisScriptHiddenAttribute+"=true]:has([contenteditable])")
                .addBack("["+thisScriptHiddenAttribute+"=true]:has([contenteditable])");
            if (thisPageIsExempt) {
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √594√ starting 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");

                var hiddenwalkl=hiddenWalk.length;
            for (var hiddenwalki=0;hiddenwalki<hiddenwalkl; hiddenwalki++)  {
                var hw=hiddenWalk[hiddenwalki];
                var hwjq=$(hw);
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √595√ 'function( ) ' ~ ~ ~", "", "ULTRA");

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("unhiding text leaf:", hw);


                    hwjq
                        .css("border", "1px solid blue")
                        .css("background", "#CCCCFF")
                        .css("background", "rgba(225,225,255,.5)")
                        .attr("style", hwjq.data("savedstyle"))
                        .attr(thisScriptHiddenAttribute, "");

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("added blue to", hwjq);


                }

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √594√ ending 'if ( thisPageIsExempt) ' ~ ~ ~ ~ ~", "", "ULTRA");

            } else {
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √608√ starting 'else ' ~ ~ ~", "", "ULTRA");

                   var hiddenwalkl=hiddenWalk.length;
            for (var hiddenwalki=0;hiddenwalki<hiddenwalkl; hiddenwalki++) {
                 var hw=hiddenWalk[hiddenwalki];
                var hwjq=$(hw);

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √609√ 'function( ) ' ~ ~ ~", "", "ULTRA");

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("unhiding text leaf:",hw);

                    hwjq.show().attr(thisScriptHiddenAttribute, "");
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("added blue to", hwjq);


                }

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √608√ ending 'else ' ~ ~ ~ ~ ~", "", "ULTRA");

            }
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √585√ ending 'while backspace key is being hit, and the script jumps in and hides them. */ 586 587 588 /* this isn't the best way to do this, I don't think. Sometimes a "+thisScriptHiddenAttribute+" element CONTAINS an editable one. Not sure if this catches those. (UPDATE: seems to be working, will fix if it doesn't always. */ if(thisActiveElement.tagName != ''BODY'') ' ~ ~ ~ ~ ~", "", "ULTRA");

        }
!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("targetNotJQ ",targetNotJQ);
        var theSelectorsToAlwaysHide = docbodyjq /*don't use thisTarget -- the selector to always hide can sometimes be in the mutationTarget but not in the addedNodes (UPDATE THIS. USE THE MUTATION.TARGET, NOT THE DOCUMENT.BODY AND SEE IF IT WORKS.*/
            .find(selectorsToAlwaysHideRegex)
            .not("["+thisScriptHiddenAttribute+"]");
        //while (theSelectorsToAlwaysHide ) { //!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √620√ starting 'while (theSelectorsToAlwaysHide ) ' ~ ~ ~","","ULTRA");

        var theSelectorsToAlwaysHidel=theSelectorsToAlwaysHide.length;
            for (var theSelectorsToAlwaysHidei=0;theSelectorsToAlwaysHidei<theSelectorsToAlwaysHidel; theSelectorsToAlwaysHidei++)  {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √621√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");

            /* we do this _after_ seaching for badwords so selectortoalwayshide that use ["+thisScriptHiddenAttribute+"] will get catch things that were just hidden */
                var tstah = theSelectorsToAlwaysHide[theSelectorsToAlwaysHidei];

                var tsjq = $(tstah);
                var theClosesttsjq = tsjq.closest(selectorsToConsiderTogetherRegex);

                theClosesttsjq = theClosesttsjq.length > 0? theClosesttsjq : tsjq;
                var hiddencounttsjq = 0;
 var hiddenclasstsjq =theClosesttsjq.attr('class');
  while (typeof theClosesttsjq.parent()[0] != 'undefined' && theClosesttsjq.parent().attr("hiddenclasstsjq",hiddenclasstsjq)[0].matches(parentsToHideIfAChildIsHidden)) {theClosesttsjq = theClosesttsjq.parent();
theClosesttsjq.attr("hiddencount",++hiddencounttsjq).attr("hiddenclass",hiddenclasstsjq);}

            if (thisPageIsExempt) {
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √624√ 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");

                theClosesttsjq
                    .css("border", "1px solid orange")
                    .css("background", "rgba(255,240,225,.5")
                    .attr(thisScriptHiddenAttribute, "true");
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Added orange to", theClosesttsjq);


            } else {
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √630√ 'else ' ~ ~ ~", "", "ULTRA");

                theClosesttsjq.hide().attr(thisScriptHiddenAttribute, "true");
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Added orange to", theClosesttsjq);


            }

            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("added orange to", tstah);

            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √621√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");

        }

        // theSelectorsToAlwaysHide =thisTarget.find(selectorsToAlwaysHide.replace(/\|/g, ",")).not("["+thisScriptHiddenAttribute+"]");
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √620√ ending 'while (theSelectorsToAlwaysHide ) ' ~ ~ ~ ~ ~","","ULTRA");
        if (!!thisTarget.length && thisTarget[0].tagName != "BODY") {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √639√ 'if( thisTarget[0].tagName != ''BODY'') ' ~ ~ ~:", thisTarget, "ULTRA");

            /* thisTarget is an OBJECT, not a page elemnt! you have to get the page element by index! */
            thisTarget.insertBefore(placeholder);
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("thisTarget inserted", thisTarget);

            placeholder.remove(); /* DIDN'T WORK... see top of main function */

        }
    } //end for loop
    observerEnable = true;
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √270√ ending 'function main( elLengthOld, theDelay, mutation, sessionID,currentMatches) ' ~ ~ ~ ~ ~", "", "ULTRA");

}
    /*end visibility check */
}  //end main()

//*************** BEGIN GLOBAL SCOPE ****************//

//******* My own functions for global scope ********//

function logForDebugging(string, object, logClass = "normal", embedObj = "" ) {
    var d = new Date();
    if (logClass.match(CONSOLE_DEBUGGING_MESSAGES_ON) || CONSOLE_DEBUGGING_MESSAGES_ON === true || (decodeURIComponent((new RegExp('[?|&]wclog=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null) == 'true') {
if (embedObj=="") {        console.log(document.location + "["+logClass+"]"," - ",string, object); /* bugout.log(string);bugout.log(object);*/ }
        else /*Now can embed in attributes too*/
        { console.log(embedObj);embedObj.attr("debugLog",(embedObj.attr("debugLog")||"")+" Log @ "+d.getTime()+":"+  string) ;}

        if (CONSOLE_MESSAGES_ADDED_TO_HEAD) {
            observerEnable = false;


            var it = document.createElement("message");
            it.setAttribute("time", d.getTime());
            it.setAttribute("msg", string);
            try {
            it.innerText = (JSON.stringify({trying:"JSON",
                theObject: object
            }, function (k, v) { return k ? "" + v : v; })).replace(/\n/g,"¶").replace(/¶¶+/g,"¶")+"\n";
            it.innerText = it.innerText+(XML.stringify({trying:"XML",
                theObject: object
            }, function (k, v) { return k ? "" + v : v; })).replace(/\n/g,"¶").replace(/¶¶+/g,"¶")+"\n";
            } catch (error) {it.innerText= it.innerText+" Error!: "+ error;}
            document.head.appendChild(it);
            observerEnable = true;
        }
    }
}

function wcSetAttributeSafely(node, attribute, value) {
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √656√ starting 'function wcSetAttributeSafely( node, attribute, value) ' ~ ~ ~", "", "ULTRA");

    var nodejq=$(node);
    if (typeof nodejq.data() === "object") {
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √657√ 'if ( typeof $(node).data() === ''object'') ' ~ ~ ~", "", "ULTRA");

        nodejq.data(attribute, value);

    } else if (node.nodeType == 3) {
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √659√ 'if ( node.nodeType == 3) ' ~ ~ ~", "", "ULTRA");

        wcSetDebuggingAttributeSafely(node.parentNode, attribute + "__in_child_" + node.nodeValue.replace(/\b/g, "") + "__",
            value
        );

    }
    //else {node.textContent=node.textContent + "{§"+attribute+"="+value+"§}"}
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √656√ ending 'function wcSetAttributeSafely( node, attribute, value) ' ~ ~ ~ ~ ~", "", "ULTRA");

}

function wcSetDebuggingAttributeSafely(node, attribute, value) {
    var nodejq=$(node);

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √669√ starting 'function wcSetDebuggingAttributeSafely( node, attribute, value) ' ~ ~ ~", "", "ULTRA");

    if (RECORD_DEBUGGING_INFO_IN_NODE_ATTRIBUTES_AS_THEY_ARE_PROCESSED == true) {
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √670√ starting 'if ( RECORD_DEBUGGING_INFO_IN_NODE_ATTRIBUTES_AS_THEY_ARE_PROCESSED == true) ' ~ ~ ~", "", "ULTRA");

        if (typeof nodejq.data() === "object") {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √671√ 'if ( typeof $(node).data() === ''object'') ' ~ ~ ~", "", "ULTRA");

            nodejq.data(attribute, value);

        } else if (node.nodeType == 3) {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √673√ 'if ( node.nodeType == 3) ' ~ ~ ~", "", "ULTRA");

            wcSetDebuggingAttributeSafely(node.parentNode, attribute + "__in_child_" + node.nodeValue.replace(/\b/g, "") + "__",
                value
            );

        }
        //else {node.textContent=node.textContent + "{§"+attribute+"="+value+"§}"}
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √670√ ending 'if ( RECORD_DEBUGGING_INFO_IN_NODE_ATTRIBUTES_AS_THEY_ARE_PROCESSED == true) ' ~ ~ ~ ~ ~", "", "ULTRA");

    }
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √669√ ending 'function wcSetDebuggingAttributeSafely( node, attribute, value) ' ~ ~ ~ ~ ~", "", "ULTRA");

}

function exemptThisPage() {
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √712√ 'function exemptThisPage( ) ' ~ ~ ~", "", "ULTRA");

    //red star in lower right corner was clicked

    var theLocMatch = new RegExp("<url>" + escape(encodeURIComponent(document.location.href)) + "<endurl>",
        "gi"
    );
    theCurrPrefString = theCurrPrefString.replace(theLocMatch, ""); //remove previous instances of URL in list
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: Cookies are: ", docCookies.getItem("exemptPage"));

    docCookies.removeItem("exemptPage"); //make sure local cookie doesn't exist; will override cookie at "/"
    docCookies.setItem("exemptPage", theCurrPrefString + "<url>" + escape(encodeURIComponent(document.location.href)) +
        "<endurl>", Infinity,"/","."+getDomain()
    );
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: adding URL: ", theLocMatch);

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: Cookies are now: ", docCookies.getItem("exemptPage"));

    location.reload(true);

}

function unexemptThisPage() {
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √736√ 'function unexemptThisPage( ) ' ~ ~ ~", "", "ULTRA");

    //green star in lower right corner was clicked
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: unexempting");

    var theLocMatch = new RegExp("<url>" + escape(encodeURIComponent(document.location.href)) + "<endurl>",
        "gi"
    );
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: Cookies are: ", docCookies.getItem("exemptPage"));

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: theLocMatch is: ", theLocMatch);

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: theCurrPrefString is: ", theCurrPrefString);

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: theCurrPrefString.replace(theLocMatch, '') is: ",         theCurrPrefString.replace(theLocMatch, "")     );

        docCookies.removeItem("exemptPage"); //make sure local cookie doesn't exist; will override cookie at "/"

    docCookies.setItem("exemptPage", theCurrPrefString.replace(theLocMatch, "x"), Infinity,"/","."+getDomain());
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: Writing URL: ", theLocMatch);

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: Cookies are now: ", docCookies.getItem("exemptPage"));

    location.reload(true);

}


function addUnblockLink(foundString) {
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √759√ starting 'function addUnblockLink( foundString) ' ~ ~ ~", "", "ULTRA");

    //put little star in lower right corner of window to toggle between element hiding/highlighting
    //observer.disconnect();

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: add unblock link function start");

    var tempObserverEnable = observerEnable;
    observerEnable = false;
    var aMain = "";
    var blockString = thisPageIsExempt ? "reblock" : "unblock";
    if (!document.getElementById("pageBlocked_5832_xfi")) {
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √768√ 'if ( !document.getElementById(''pageBlocked_5832_xfi'')) ' ~ ~ ~", "", "ULTRA");

        aMain = document.createElement("div");

    } else {
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √770√ 'else ' ~ ~ ~", "", "ULTRA");

        var bMain = document.getElementById("pageBlocked_5832_xfi");
        aMain = bMain.parentNode;
        blockString = (aMain.title + ", ")
            .toLowerCase()
            .replace(foundString.toLowerCase(), "")
            .replace(", ,", ",")
            .replace(new RegExp(blockString + " ?, ?", ""), blockString + " ");

    }
    aMain.addEventListener("click", function() {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √779√ 'function( ) ' ~ ~ ~", "", "ULTRA");

            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: clicked exempt");

            exemptThisPage(0);

        },
        false
    );
    aMain.addEventListener("mouseout", function() {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √787√ 'function( ) ' ~ ~ ~", "", "ULTRA");

            document.getElementById("pageBlocked_5832_xfi").style =
                "width:12px;height:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#ff3300";

        },
        false
    );
    aMain.addEventListener("mouseover", function() {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √795√ 'function( ) ' ~ ~ ~", "", "ULTRA");

            document.getElementById("pageBlocked_5832_xfi").style =
                "width:32px;height:32pxtext-align:center;display:block;cursor:pointer;font-size:24px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#ff3300";

        },
        false
    );

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("tagname 2");

    /* do NOT let an automated checker tell you it should be "=== undefined" in the next line - that breaks the script! */
    if (document.getElementById("tinymce") == undefined ||
        document.getElementById("tinymce").tagName != "BODY"
    ) {
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √806√ starting 'if ( document.getElementById(''tinymce'') == undefined || 808 document.getElementById(''tinymce'').tagName != ''BODY'' 809 ) ' ~ ~ ~", "", "ULTRA");

        //don't run in iframes generated by tinymce rich text editor - fix to block from running in Tumblr post dialogs
        aMain.title = blockString + foundString;
        if (thisPageIsExempt) {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √812√ 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");

            //display on Exempt pages
            aMain.innerHTML.firstChild =
                "<li id='pageBlocked_5832_xfi' style='width:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#66ff00'>*</li>";

        } else {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √816√ 'else ' ~ ~ ~", "", "ULTRA");

            //display on non-Exempt pages
            aMain.innerHTML =
                "<li id='pageBlocked_5832_xfi' style='width:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999999999;border:1;bottom:0;right:0;color:#ff3300'>*</li>";

        }
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √806√ ending 'if ( document.getElementById(''tinymce'') == undefined || 808 document.getElementById(''tinymce'').tagName != ''BODY'' 809 ) ' ~ ~ ~ ~ ~", "", "ULTRA");

    } else {
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √821√ 'else ' ~ ~ ~", "", "ULTRA");

        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("didn't add unblock link due to tinymce presence");


    }
    document.body.appendChild(aMain);
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("added unblock link", aMain);

    observerEnable = tempObserverEnable;
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √759√ ending 'function addUnblockLink( foundString) ' ~ ~ ~ ~ ~", "", "ULTRA");

}

function getDomain(subdomain) {
/* Thanks to https://stackoverflow.com/questions/11401897/get-the-current-domain-name-with-javascript-not-the-path-etc */
   var url = window.location.hostname;
    subdomain = subdomain || false;
    url = url.replace(/(https?:\/\/)?(www.)?/i, '');
    if (!subdomain) {url = url.split('.');
                     url = url.slice(url.length - 2).join('.');
                    }
    if (url.indexOf('/') !== -1) {
                         return url.split('/')[0];
                     }
    return url;
}

//******* End my own functions for global scope ********//

/* don't run at all on excluded sites */
!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("exempt regexp", exemptRegexp);
!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("exempt document.location.href", document.location.href);
!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("exempt hosts regexp is ", document.location.href.match(exemptRegexp));
!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("exempt hosts regexp result ", (document.location.href.match(exemptRegexp) === null));
!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Page stupidHash is ", stupidHash(document.location.href));
!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("stupidHash regexp result ", (stupidHash(document.location.href).match(exemptRegexp) === null));

if (document.location.href.match(exemptRegexp) === null && stupidHash(document.location.href).match(exemptRegexp) === null && ('H' + stupidHash(document.location.hostname)).match(exemptRegexp) === null) {
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √838√ starting 'if ( document.location.href.match(exemptRegexp) === null && stupidHash(document.location.href).match(exemptRegexp) === null && ('H'+stupidHash(document.location.hostname)).match(exemptRegexp) === null ) ' ~ ~ ~", "", "ULTRA");

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("page didn't match exemptions, running inside main look");

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

            getItem: function(sKey) { return GM_getValue(sKey);
               /* //!CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √864√ 'function( sKey) ' ~ ~ ~", "", "ULTRA");

                return (decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" +
                        encodeURIComponent(sKey).replace(/[\-\.\+\*\(\)]/g, "\\$&") +
                        "\\s*\\=\\s*([^;]*).*$)|^.*$"
                    ),
                    "$1"
                )) || null);*/

            },
            setItem: function(sKey, sValue, vEnd, sPath, sDomain, bSecure) { return GM_setValue(sKey,sValue); /*
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √878√ starting 'function( sKey, sValue, vEnd, sPath, sDomain, bSecure) ' ~ ~ ~", "", "ULTRA");

                if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) {
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √879√ 'if ( !sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) ' ~ ~ ~", "", "ULTRA");



                    return false;
                }
                var sExpires = "";
                if (vEnd) {
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √883√ starting 'if ( vEnd) ' ~ ~ ~", "", "ULTRA");

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
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √883√ ending 'if ( vEnd) ' ~ ~ ~ ~ ~", "", "ULTRA");

                }
                document.cookie =
                    encodeURIComponent(sKey) +
                    "=" +
                    encodeURIComponent(sValue) +
                    sExpires +
                    (sDomain ? "; domain=" + sDomain : "") +
                    (sPath ? "; path=" + sPath : "") +
                    (bSecure ? "; secure" : "");

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √878√ ending 'function( sKey, sValue, vEnd, sPath, sDomain, bSecure) ' ~ ~ ~ ~ ~", "", "ULTRA");

                return true;
            */},
            removeItem: function(sKey, sPath, sDomain) { return true; /*
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √906√ starting 'function( sKey, sPath, sDomain) ' ~ ~ ~", "", "ULTRA");

                if (!sKey || !this.hasItem(sKey)) {
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √907√ 'if ( !sKey || !this.hasItem(sKey)) ' ~ ~ ~", "", "ULTRA");



                    return false;
                }
                document.cookie =
                    encodeURIComponent(sKey) +
                    "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" +
                    (sDomain ? "; domain=" + sDomain : "") +
                    (sPath ? "; path=" + sPath : "");

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √906√ ending 'function( sKey, sPath, sDomain) ' ~ ~ ~ ~ ~", "", "ULTRA");

                return true;
            */ },
            hasItem: function(sKey) {
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √917√ 'function( sKey) ' ~ ~ ~", "", "ULTRA");


                return new RegExp("(?:^|;\\s*)" +
                    encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") +
                    "\\s*\\="
                ).test(document.cookie);
            },
            keys: /* optional method: you can safely remove it! */ function() {
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √924√ starting 'function( ) ' ~ ~ ~", "", "ULTRA");

                var aKeys = document.cookie
                    .replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "")
                    .split(/\s*(?:\=[^;]*)?;\s*/);
                for (var nIdx = 0; nIdx < aKeys.length; nIdx++) {

                    aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]);
                }

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √924√ ending 'function( ) ' ~ ~ ~ ~ ~", "", "ULTRA");

                return aKeys;
            }

        }
        //*** End Mozilla's cookie framework... ***//
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: Cookies coming ", docCookies.getItem());

//    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging(" EXEMPTION: stringified :", JSON.stringify(docCookies, getCircularReplacer()));
//I think that stringify was slowing things up

    var theCurrPrefString = docCookies.getItem("exemptPage") || "";
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: theCurrPrefString ", theCurrPrefString);

    var thisPageIsExempt = HILIGHT_ONLY || !(theCurrPrefString.match("<url>" + escape(encodeURIComponent(document.location.href)) + "<endurl>") === null);
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: thisPageIsExempt ", thisPageIsExempt);




      if (thisPageIsExempt) {
      //  disabling context menu; never worked.:  GM_registerMenuCommand("Unexempt this page", unexemptThisPage, "");
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √970√ starting 'if ( thisPageIsExempt) ' ~ ~ ~", "", "ULTRA");

                //add div to allow user to unexempt page
                var aMain = document.createElement("div");

                /* create clickable div to exempt page */
                aMain.addEventListener("click", function() {
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √973√ 'function( ) ' ~ ~ ~", "", "ULTRA");

                    unexemptThisPage(0);

                }, false);
                //anonymous function() {exemptThisPage(0);} is necessary because exemptThisPage(0) on its own it thinks I mean "the value returned from exemptThisPage(0)" and immediately fires the exemptThisPage function to calculate that.
                aMain.innerHTML =
                    "<li style='width:12px;text-align:center;display:block;cursor:pointer;font-size:9px;background:#FF0;position:fixed;z-index:999999999;border:1;bottom:0;right:0;color:#66ff00'>*</li>";
                observerEnable = false;
                document.body.appendChild(aMain); /* did the above li need no ID? I guess not, but check this if something breaks. */
                observerEnable = true;
                /* end creating clickable div to exempt page */

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √970√ ending 'if ( thisPageIsExempt) ' ~ ~ ~ ~ ~", "", "ULTRA");

      } else
      {    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("EXEMPTION: page not exempt, registering gm menu command ", "");
      // disabling context menu    GM_registerMenuCommand("Exempt this page", exemptThisPage, "");
      }


/* end context menu */
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

        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √950√ starting 'function( mutations, observer) ' ~ ~ ~ for NEW MUTATIONS:", mutations, "ULTRA");

        if (observerEnable) {
               observerEnable = false; /* debugger; */
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √951√ starting 'if ( observerEnable) ' ~ ~ ~", "", "ULTRA");

            observer.disconnect();
            var thisSessionID = Math.random();

            var theNodes = mutations /*|| document.body.childNodes*/; /* do we really need that bit? commenting to see if anything breaks */
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("theNodes is ", theNodes, "observer") ;
            /* $("html,body").css("cursor", "not-allowed"); Don't know what this was for, suspect it was funkifying my youtube experience */

            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("About to forEach theNodes", theNodes);

            theNodes.forEach(function(mutation) {
            var mutationtarget=mutation.target;
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Mutation ",mutation.target);
            var mutationtargetjq=$(mutationtarget);
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √989√ starting 'function( mutation) ' ~ ~ ~", "", "ULTRA");


                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("forEach this node of TheNodes", mutation);

                if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
                          observerEnable = false;
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √992√ 'if ( HILIGHT_ELEMENTS_BEING_PROCESSED) ' ~ ~ ~", "", "ULTRA");


                    mutationtarget.style =
                        "border: 5px dotted rgba(200,200,200,1) !important; background:rgb(200,200,200) !important;" +
                        mutationtarget.style;

                    mutationtargetjq.data("highlighted", true);
                    observerEnable = true;

                }
                if(CONSOLE_DEBUGGING_MESSAGES_ON != false) {
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("OBSERVED: 1. testing mutation: " + mutationtargetjq.text().substr(0, 50), mutation, "observer");

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("OBSERVED: 2. testing mutation target tagname: " + mutationtargetjq.text().substr(0, 50), mutationtarget.tagName, "observer");

                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("OBSERVED: 3. testing mutation target innerHTML: " + mutationtargetjq.text().substr(0, 50), mutationtarget.innerHTML, "observer");

}
                if ((mutationtarget.tagName != "BODY" || docbodyjq.data("firstrun") != thisSessionID) && mutation.type == "childList" && (mutation.addedNodes.length>0 ? !mutation.addedNodes[0].isContentEditable:false /* need ternary operator to avoid 'undefined' */)) {
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √1006√ starting 'if ( mutation.target.tagName != ''BODY'' || docbodyjq.data(''firstrun'') != thisSessionID ) ' ~ ~ ~. mutation.target.tagName is ", mutationtarget.tagName, "ULTRA");

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √1006√   docbodyjq.data(''firstrun'') = ",  docbodyjq.data("firstrun") , "ULTRA");

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √1006√ thisSessionID = ", thisSessionID , "ULTRA");

                    /* just added these 7/4/18: && mutation.type == "childList" && !mutation.addedNodes[0].isContentEditable - can remove from nested conditional below if works for a while */
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √1006√ mutation = ", mutation , "ULTRA");

                    //just process the changed bits, not the whole body more than once per session, ok?
                    docbodyjq.data("firstrun", thisSessionID);
                    if(CONSOLE_DEBUGGING_MESSAGES_ON != false) {
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Passing as mutation for session ID " + thisSessionID + ":", mutation);

                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("raw innerHTML to check:", mutationtarget.innerHTML);
}
                    if (TURN_CONSOLE_DEBUGGING_MESSAGES_ON_PHRASE != "") { /* next line was expensive due to match() */
if (mutation.target.innerHTML.match(TURN_CONSOLE_DEBUGGING_MESSAGES_ON_PHRASE)) {CONSOLE_DEBUGGING_MESSAGES_ON=true;
  !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Turning logging on, found: ",TURN_CONSOLE_DEBUGGING_MESSAGES_ON_PHRASE);
 } }
                    var theMutTargetText = (mutationtarget.innerHTML || "").replace(/\<(IMG[^>]*)>/gi, " $1 ").replace(/\<[^>]*>/gi, " "); //keep the image tags for the alt attributes, and replace all other html with spaces to separate text blocks.
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("About to create theseMatches, theMutTargetText is:", theMutTargetText);

/* ADD OPTIMIZATION HERE: restore checking theseMatches on next line, but add term so MainScript runs if a selectorToAlwaysHide is found, even if mtheseMatches don't produce any matches. */
                    var theseMatches = theMutTargetText.match(theBadWordsAndFBNames) || []; /* this effectively disables the requirement that bad words match to run MainScript. That's needed because the SelectorsToAlwaysHide otherwise would not be hidden if no badwords matched somewhere in Mutation.target, since MainScript wouldn't run. */

                    if (--MAX_NUMBER_OF_CALLS_PER_PAGE > 0 && !!theMutTargetText && (theseMatches)  /* If we go back to scanning URL hrefs, this will have to be disabled, because it will need to check nodes even if bad terms are not in visible text. */ ) {
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √1029√ starting 'if ( --MAX_NUMBER_OF_CALLS_PER_PAGE > 0 && !!theMutTargetText && ( theseMatches) ) ' ~ ~ ~", "", "ULTRA");

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("about to shift",theseMatches);
var commenttext = document.createTextNode("<!-- WEBCOOLER FOUND MATCH "+theseMatches.join(",")+" -->");
document.head.appendChild(commenttext);
                        var shift = theseMatches.shift();
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("About to create theNewMatches from theseMatches:", theseMatches);

                        var theNewMatches = new RegExp(theseMatches.join("THEPIPEGOESHERE372333319").replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/THEPIPEGOESHERE372333319/gi, '|'), "gi"); //the replace is to sanitize string... if "]NRA[" is in the test of the page, this RegExp will choke without sanitization

                        if (!docbodyjq.data("FirstMutation")) {
                            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √1042√ 'if ( !docbodyjq.data(''FirstMutation'')) ' ~ ~ ~", "We're in the condition to check the BODY on the first pass", "ULTRA");

                            /* on the very first time this is called on a page, use the whole body to make sure everything gets checked once. */
                            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("First Mutation for page. passing Body.");

                            docbodyjq.data("FirstMutation", true);
                            /* debugger; */
                           mainScript(-1, 5000, theDummy, thisSessionID, theNewMatches);
                            addUnblockLink( /*theCatch*/ "x"); /* this needs to run every time main is called - pages such as Feedly.com/general seem to remove the entire body and replace it,so only adding this once means it disappears. */


                        } else {
                            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Not running initial scan of body because !docbodyjq.data('FirstMutation') is ", !docbodyjq.data("FirstMutation"));

                        }
                        if (HILIGHT_ELEMENTS_BEING_PROCESSED) {
                            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √1053√ 'if ( HILIGHT_ELEMENTS_BEING_PROCESSED) ' ~ ~ ~", "", "ULTRA");

                            observerEnable = false; /* debugger; */
                            mutationtarget.style =
                                "border: 5px solid rgba(100,100,100,1) !important; background:rgb(0100,100,100) !important;" +
                                mutationtarget.style;
                           mutationtargetjq.data("highlighted", true);
                            observerEnable = true;

                        }
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("About to call main with", mutation);


                        /* debugger; */
                        if (/*mutation.type != "childList" ||  let's try processing only childlists */ (mutation.addedNodes.length > 0 && mutation.addedNodes[0].tagName != "SCRIPT" && mutation.addedNodes[0].tagName != "STYLE" && mutation.addedNodes[0].offsetWidth >0 &&  mutation.addedNodes[0].offsetHeight >0 )) {

                            try {
                                mainScript(-1, 5000, mutation, thisSessionID, theNewMatches);
                            }
                            catch (err) {
                                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("ERROR ON MAIN: ",err);


                                alert(err.message);
                                debugger;
                            }
                        } else {
                              !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("failed to call mainscript... ",mutation);
                            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("failed conditional on 965, not running Main for theMutTargetText: ", theMutTargetText);

                            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("failed conditional on 965 whole mutation was: ", mutation);

                        }

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √1029√ ending 'if ( --MAX_NUMBER_OF_CALLS_PER_PAGE > 0 && !!theMutTargetText && ( theseMatches) ) ' ~ ~ ~ ~ ~", "", "ULTRA");

                    } else {
                       !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("failed outer conditional, won't run mainscript!");
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √1065√ 'else ' ~ ~ ~", "", "ULTRA");

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("failed MAX_NUMBER_OF_CALLS_PER_PAGE:" , MAX_NUMBER_OF_CALLS_PER_PAGE);

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("failed theBadWordsAndFBNames:" , theBadWordsAndFBNames);


                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("failed theseMatches:" , theseMatches);


                        var theInnerText =
                            theMutTargetText ||
                            ""; /* otherwise the (match) line below causes a fatal error on no innertext */
                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Ran too many times or no text or no match: (count) ",                             MAX_NUMBER_OF_CALLS_PER_PAGE                         );

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Ran too many times or no text or no match: (innerText) ",                             theInnerText                         );

                        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("Ran too many times or no text or no match: (match) ",                             theInnerText.match(theBadWords)                         );


                    }
                    /* $("html,body").css("cursor", "auto"); dunno why i had this */
                    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √1006√ ending 'if ( mutation.target.tagName != ''BODY'' || docbodyjq.data(''firstrun'') != thisSessionID ) ' ~ ~ ~ ~ ~", "", "ULTRA");

                }
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √989√ ending 'function( mutation) ' ~ ~ ~ ~ ~", "", "ULTRA");

            });
            /* end foreach (mutation) */
            //restart observer
            /* document.mkObserverFlag = undefined; */
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging ("~~~~~ √1587√ about to restart observer. ObserverEnable ",observerEnable);
            observer.observe( document.body, {
                subtree: true,
                attributes: false,
                childList: true,
                characterData: false, //was set to true... see note below if there are problems.

                attributeOldValue: false,
                characterDataOldValue: false
            });
           observerEnable = true; /* debugger; */
        } // end if
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √950√ ending 'function( mutations, observer) ' ~ ~ ~ ~ ~", "", "ULTRA");


    });

    //****** END MUTATIONONSERVER *******//

    // define what element should be observed by the observer
    // and what types of mutations trigger the callback
                !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging ("~~~~~ √1608√ about to restart observer. ObserverEnable ",observerEnable);
    observer.observe( document.body, {
        subtree: true,
        attributes: false,
        /*setting attributes to 'false' makes script not always work on some changes, particularly on http://abcnews.go.com/US/daughter-man-gunned-facebook-video-fear-fathers-eyes/story?id=46847374 ... but working now, so, off. */
        childList: true, //Must be true! guardian.com's "spotlight" section sneaks through without it..
        characterData: false,
        attributeOldValue: false,
        characterDataOldValue: false
    });

    var theInnerHTML = theDummy.target.innerHTML || "";
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("about to see if should run main on Body. the InnerHTML is ", theInnerHTML);

    if (theInnerHTML.match(theBadWordsAndFBNames)) {
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √1111√ starting 'if( theInnerHTML.match(theBadWordsAndFBNames))' ~ ~ ~", "", "ULTRA");

        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("running main with theDummy:", theDummy);

        try {
            mainScript(-1, 5000, theDummy, "000", theBadWordsAndFBNames);
        }
        catch (err) {
            !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("ERROR ON MAIN: ",err);

            alert(err.message);
            debugger;
        }
        !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √1111√ ending 'if( theInnerHTML.match(theBadWordsAndFBNames))' ~ ~ ~ ~ ~", "", "ULTRA");


    }

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~~~ √838√ ending 'if ( document.location.href.match(exemptRegexp) === null && stupidHash(document.location.href).match(exemptRegexp) === null && ('H'+stupidHash(document.location.hostname)).match(exemptRegexp) === null ) ' ~ ~ ~ ~ ~", "", "ULTRA");

} else {
    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("~~~ √1116√ 'else ' ~ ~ ~", "", "ULTRA");

    !CONSOLE_DEBUGGING_MESSAGES_ON || logForDebugging("page matched exemptions, didn't run");


}
