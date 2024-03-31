/* stardew-checkup.js
 * https://mouseypounds.github.io/stardew-checkup/
 */

/*jslint indent: 4, maxerr: 50, passfail: false, browser: true, regexp: true, plusplus: true */
/*global $, FileReader */

window.onload = function () {
	"use strict";

	// Check for required File API support.
	if (!(window.File && window.FileReader)) {
		document.getElementById('out').innerHTML = '<span class="error">Fatal Error: Could not load the File & FileReader APIs</span>';
		return;
	}

	// Show input field immediately
	$(document.getElementById('input-container')).show();

	// Utility functions
	function addCommas(x) {
		// Jamie Taylor @ https://stackoverflow.com/questions/3883342/add-commas-to-a-number-in-jquery
		return x.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",");
	}

	function capitalize(s) {
		// joelvh @ https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript
		return s && s[0].toUpperCase() + s.slice(1);
	}

	function compareSemVer(a, b) {
		// semver-compare by James Halliday ("substack") @ https://github.com/substack/semver-compare
		var pa = a.split('.');
		var pb = b.split('.');
		for (var i = 0; i < 3; i++) {
			var na = Number(pa[i]);
			var nb = Number(pb[i]);
			if (na > nb) return 1;
			if (nb > na) return -1;
			if (!isNaN(na) && isNaN(nb)) return 1;
			if (isNaN(na) && !isNaN(nb)) return -1;
		}
		return 0;
	}

	function getAchieveString(name, desc, yes) {
		if (desc.length > 0) {
			desc = '(' + desc + ') ';
		}
		return (yes) ? '<span class="ach_yes"><span class="ach">' + name + '</span> ' + desc + ' achieved</span>' :
					'<span class="ach_no"><span class="ach">' + name + '</span> ' + desc + '</span> -- need ';
	}

	function getAchieveImpossibleString(name, desc) {
		if (desc.length > 0) {
			desc = '(' + desc + ') ';
		}
		return '<span class="ach_imp"><span class="ach">' + name + '</span> ' + desc + ' impossible</span>';
	}

	function getMilestoneString(desc, yes) {
		return (yes) ? '<span class="ms_yes">' + desc + '</span>' :
					'<span class="ms_no">' + desc + '</span> -- need ';
	}

	function getPointString(pts, desc, cum, yes) {
		var c = (cum) ? ' more' : '';
		return (yes) ? '<span class="pt_yes"><span class="pts">+' + pts + c + '</span> earned (' + desc + ')</span>' :
					'<span class="pt_no"><span class="pts"> (' + pts + c + ')</span> possible (' + desc + ')</span>';
	}

	function getPointImpossibleString(pts, desc) {
		return '<span class="pt_imp"><span class="pts">+' + pts + '</span> impossible (' + desc + ')</span>';
	}

	function getPerfectionPctString(pct, max, desc, yes, who = "") {
		var pts = max * pct;
		var places = 2;
		var extra = (who === "") ? "" : (pct === 0) ? "" : " thanks to " + who;
		if (pct < .0001 || pct > .9999) { places = 0 };
		pts = pts.toFixed(places);
		var pretty_pct = 100*pct;
		pretty_pct = pretty_pct.toFixed(Math.max(0, places-1));
		return (yes) ? '<span class="pt_yes"><span class="pts">' + pts + '%</span> from completion of ' + desc + extra + '</span>' :
					'<span class="pt_no"><span class="pts"> ' + pts + '%</span> (of ' + max + '% possible) from ' + desc + extra +
					' (' + pretty_pct + '%)</span>';
	}
	
	function getPerfectionNumString(num, max, desc, yes, who = "") {
		var pts = num;
		var pretty_pct = num + "/" + max;
		var extra = (who === "") ? "" : (num === 0) ? "" : " thanks to " + who;
		return (yes) ? '<span class="pt_yes"><span class="pts">' + pts + '%</span> from completion of ' + desc + extra + '</span>' :
					'<span class="pt_no"><span class="pts"> ' + pts + '%</span> (of ' + max + '% possible) from ' + desc + extra +
					' (' + pretty_pct + ')</span>';
	}
	
	function getPerfectionPctNumString(pct, max, count, desc, yes, who = "") {
		var pts = max * pct;
		var places = 2;
		var extra = (who === "") ? "" : (pct === 0) ? "" : " thanks to " + who;
		if (pct < .0001 || pct > .9999) { places = 0 };
		pts = pts.toFixed(places);
		var pretty_pct = Math.round(count * pct) + "/" + count + " or " + Number(100*pct).toFixed(Math.max(0, places-1)) + "%";
		return (yes) ? '<span class="pt_yes"><span class="pts">' + pts + '%</span> from completion of ' + desc + extra + '</span>' :
					'<span class="pt_no"><span class="pts"> ' + pts + '%</span> (of ' + max + '% possible) from ' + desc + extra +
					' (' + pretty_pct + ')</span>';
	}

	function getPerfectionBoolString(max, desc, yes, who = "") {
		var extra = (who === "") ? "" : " thanks to " + who;
		return (yes) ? ('<span class="pt_yes"><span class="pts">' + max + '%</span> from completion of ' + desc + extra + '</span>') :
					('<span class="pt_no"><span class="pts"> 0%</span> (of ' + max + '% possible) from ' + desc + '</span>');
	}

	function wikify(item, page, no_anchor) {
		// removing egg colors & changing spaces to underscores
		var trimmed = item.replace(' (White)', '');
		trimmed = trimmed.replace(' (Brown)', '');
		trimmed = trimmed.replace(' (Any)', '');
		trimmed = trimmed.replace(/#/g, '.23');
		trimmed = trimmed.replace(/ /g, '_');
		if (page) {
			return (no_anchor) ? ('<a href="http://stardewvalleywiki.com/' + page + '">' + item + '</a>') :
				('<a href="http://stardewvalleywiki.com/' + page + '#' + trimmed + '">' + item + '</a>');
		} else {
			return ('<a href="http://stardewvalleywiki.com/' + trimmed + '">' + item + '</a>');
		}
	}

	function wikimap(item, index, arr) {
		// Wrapper to allow wikify to be used within an array map without misinterpreting the 2nd and 3rd arguments.
		return wikify(item);
	}
	
	function printTranspose(table) {
		var output = '<table class="output">',
			id;
		for (var r = 0; r < table[0].length; r++) {
			output += '<tr>';
			for (var c = 0; c < table.length; c++) {
				id = 'PL_' + (c+1);
				output += '<td class="' + id + '">' + table[c][r] + '</td>';
			}
			output += '</tr>';
		}
		output += '</table>';
		return output;
	}
	
	function isValidFarmhand(player) {
		// Had been using a blank userID field to determine that a farmhand slot is empty
		// until a user sent a save where a valid farmhand had no ID. Now using both a blank
		// userID and name field and hoping that it's enough.
		if (($(player).children('userID').text() === '') && ($(player).children('name').text() === '')) {
			return false;
		}
		return true;
	}
	
	function getSummaryClass(saveInfo, version) {
		// Relatively simple conditional checks that need to be done a whole lot
		var prefs = (compareSemVer(version, "1.6") < 0) ? saveInfo.outputPrefOld : saveInfo.outputPrefNew;
		var sum_class = "initial_hide";
		if (prefs === 'show_all' || prefs === 'hide_details') {
			sum_class = "initial_show";
		}
		return sum_class;
	}
	
	function getDetailsClass(saveInfo, version) {
		// Relatively simple conditional checks that need to be done a whole lot
		var prefs = (compareSemVer(version, "1.6") < 0) ? saveInfo.outputPrefOld : saveInfo.outputPrefNew;
		var det_class = "initial_show";
		if (prefs === 'hide_all' || prefs === 'hide_details') {
			det_class = "initial_hide";
		}			
		return det_class;
	}

	function getPTLink(input, isPct) {
		// Makes link to Perfection Tracker from given info
		// If 'isPct' is true, will convert to a percentage rounded to 1 decimal
		if (isPct) {
			var places = (input === 1) ? 0 : 1;
			var n = Number(100*input).toFixed(places);
			input = n + '%';
		}
		
		return ' (<a href="#sec_Perfection_Tracker">PT: ' + input + '</a>)';
	}
	
	function getSectionHeader(saveInfo, title, anchor, showDetailsButton, version) {
		// Sets up title and buttons which control the collapsible output
		// showDetailsButton is a bool so that we don't have a control for empty details
		// version is when that section was added and is used for old vs new interpretation
		//   version 1.2 is the baseline value for most original sections
		//   "old" currently means before version 1.5 and "new" is 1.5 & later
		var prefs = (compareSemVer(version, "1.6") < 0) ? saveInfo.outputPrefOld : saveInfo.outputPrefNew;
		
		var output = '<div class="collapsible" id="wrap_' + anchor + '"><h3>' + title + '</h3>';
		var sum_button, sum_class, det_button, det_class;

		if (prefs === 'show_all' || prefs === 'hide_details') {
			sum_button = "Hide Summary";
		} else {
			sum_button = "Show Summary";
		}			
		if (prefs === 'hide_all' || prefs === 'hide_details') {
			det_button = "Show Details";
		} else {
			det_button = "Hide Details";
		}			

		// Supporting sections that don't have details also should not have the button. We'll leave the empty div alone
		var button_element = "(No Details)";
		if (showDetailsButton) {
			button_element = '<button id="toggle_' + anchor + '_details" type="button" data-target="' + anchor + '_details">' + det_button + '</button>';
		}
		
		output += ' <button id="toggle_' + anchor + '_summary" type="button" data-target="' + anchor + '_summary">' + sum_button + '</button> ' + button_element;
		return output;
	}
	
	function getSectionFooter() {
		// Companion to getSectionHeader() that mainly exists so that we close all the things the header opened
		// Currently almost pointless but better base for future expansion.
		return '</div>';
	}

	function collapsibleWrap(saveInfo, title, output, version) { return "<h4>PLACEHOLDER</h4>" + output; }
	
	function makeAnchor(text) {
		// forces lower-case and converts non-alpha characters to underscore for simple ID attributes
		var id = text;
		id.toLowerCase();
		return id.replace(/[^\w*]/g, '_');
	}
	
	// Individual chunks of save parsing.
	// Each receives the xmlDoc object to parse & the saveInfo information structure and returns HTML to output.
	// Most also create a meta object which is passed to the per-player info subroutine primarily to find out if 
	// there are any details so that we know whether to show a button later.
	// saveInfo stores meta information like object ID -> name mappings and also things that we were parsing
	// way too often such as mail flags and player stats
	function parseSummary(xmlDoc, saveInfo) {
		var title = "Summary",
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			output = '',
			details = '',
			farmTypes = {
				0: 'Standard',
				1: 'Riverland',
				2: 'Forest',
				3: 'Hill-top', 
				4: 'Wilderness',
				5: 'Four Corners',
				6: 'Beach',
				"MeadowlandsFarm": 'Meadowlands',
			},
			playTime = Number($(xmlDoc).find('player > millisecondsPlayed').text()),
			playHr = Math.floor(playTime / 36e5),
			playMin = Math.floor((playTime % 36e5) / 6e4),
			id = "0",
			farmer,
			versionLabel,
			farmhands = [],
			farmhandSelector = 'farmhand';
		
		// Versioning has changed from bools to numbers, to now a semver string.
		saveInfo.version = $(xmlDoc).find('gameVersion').first().text();
		if (saveInfo.version === "") {
			saveInfo.version = "1.2";
			if ($(xmlDoc).find('hasApplied1_4_UpdateChanges').text() === 'true') {
				saveInfo.version = "1.4";
			} else if ($(xmlDoc).find('hasApplied1_3_UpdateChanges').text() === 'true') {
				saveInfo.version = "1.3";
			}
		}
		versionLabel = $(xmlDoc).find('gameVersionLabel').first().text();
		if (versionLabel === "") {
			saveInfo.versionLabel = "";
		} else {
			saveInfo.versionLabel = "(" + versionLabel + ")";
		}

		// Namespace prefix varies by platform; iOS saves seem to use 'p3' and PC saves use 'xsi'.
		saveInfo.ns_prefix = ($(xmlDoc).find('SaveGame[xmlns\\:xsi]').length > 0) ? 'xsi': 'p3';
		// Farmer, farm, and child names are read as html() because they come from user input and might contain characters
		// which must be escaped.
		saveInfo.players = {};
		saveInfo.children = {};
		saveInfo.data = {};
		id = populateData($(xmlDoc).find('player'), saveInfo);
		saveInfo.farmerId = id;
		farmer = saveInfo.data[id].name;
		
		saveInfo.players[id] = saveInfo.data[id].name;
		saveInfo.children[id] = [];
		$(xmlDoc).find("[" + saveInfo.ns_prefix + "\\:type='FarmHouse'] NPC[" + saveInfo.ns_prefix + "\\:type='Child']").each(function () {
			saveInfo.children[id].push($(this).find('name').html());
		});
		saveInfo.numPlayers = 1;
		saveInfo.farmName = $(xmlDoc).find('player > farmName').html();
		// Initializing structures needed for perfectionTracker since a lot of it builds on other milestones
		saveInfo.perfectionTracker = { 'global': {
			'Gold Clock': false,
			'Earth Obelisk': false,
			'Water Obelisk': false,
			'Desert Obelisk': false,
			'Island Obelisk': false,
			'Walnuts': { 'count': 0, 'total': 130 },
			} };
		saveInfo.perfectionTracker[id] = {};
		
		output = getSectionHeader(saveInfo, title, anchor, false, version);
		output += '<div class="' + anchor + '_summary ' + sum_class + '">';
		output += '<span class="result">' + saveInfo.farmName + ' Farm (' + 
			farmTypes[$(xmlDoc).find('whichFarm').text()] + ')</span><br />';
		output += '<span class="result">Farmer ' + farmer ;
		
		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			farmhandSelector = "farmhands > Farmer";
		}
		$(xmlDoc).find(farmhandSelector).each(function() {
			if (isValidFarmhand(this)) {
				saveInfo.numPlayers++;
				var id = populateData($(this), saveInfo);
				farmhands.push(saveInfo.data[id].name);
				saveInfo.players[id] = saveInfo.data[id].name;
				saveInfo.children[id] = [];
				saveInfo.perfectionTracker[id] = {};
			}
		});
		// We used to accumulate the list of children while scanning the farmhands, but since farmhands are no longer stored under
		// the Cabins we have moved this to a separate filter.
		$(xmlDoc).find('indoors[' + saveInfo.ns_prefix + '\\:type="Cabin"]').find("NPC[" + saveInfo.ns_prefix + "\\:type='Child']").each(function() {
			id = $(this).children('idOfParent').text();
			saveInfo.children[id].push($(this).find('name').html());
		});
		if (saveInfo.numPlayers > 1) {
			output += ' and Farmhand(s) ' + farmhands.join(', ');
			createPlayerList(saveInfo.numPlayers, farmer, farmhands);
		}
		output += '</span><br />';
		// Searching for marriage between players
		saveInfo.partners = {};
		$(xmlDoc).find('farmerFriendships > item').each(function() {
			var item = this;
			if ($(this).find('value > Friendship > Status').text() === 'Married') {
				var id1 = $(item).find('key > FarmerPair > Farmer1').text();
				var id2 = $(item).find('key > FarmerPair > Farmer2').text();
				saveInfo.partners[id1] = id2;
				saveInfo.partners[id2] = id1;
			}
		});
		// Dump of most items in ObjectInformation, needed for Bundle processing.
		// includes some categories as well
		saveInfo.objects = {
			'-5': "Egg (Any)",
			'-6': "Milk (Any)",
			16: "Wild Horseradish",
			18: "Daffodil",
			20: "Leek",
			22: "Dandelion",
			24: "Parsnip",
			60: "Emerald",
			62: "Aquamarine",
			64: "Ruby",
			66: "Amethyst",
			68: "Topaz",
			69: "Banana Sapling",
			70: "Jade",
			72: "Diamond",
			74: "Prismatic Shard",
			78: "Cave Carrot",
			80: "Quartz",
			82: "Fire Quartz",
			84: "Frozen Tear",
			86: "Earth Crystal",
			88: "Coconut",
			90: "Cactus Fruit",
			91: "Banana",
			92: "Sap",
			93: "Torch",
			96: "Dwarf Scroll I",
			97: "Dwarf Scroll II",
			98: "Dwarf Scroll III",
			99: "Dwarf Scroll IV",
			100: "Chipped Amphora",
			101: "Arrowhead",
			103: "Ancient Doll",
			104: "Elvish Jewelry",
			105: "Chewing Stick",
			106: "Ornamental Fan",
			107: "Dinosaur Egg",
			108: "Rare Disc",
			109: "Ancient Sword",
			110: "Rusty Spoon",
			111: "Rusty Spur",
			112: "Rusty Cog",
			113: "Chicken Statue",
			114: "Ancient Seed",
			115: "Prehistoric Tool",
			116: "Dried Starfish",
			117: "Anchor",
			118: "Glass Shards",
			119: "Bone Flute",
			120: "Prehistoric Handaxe",
			121: "Dwarvish Helm",
			122: "Dwarf Gadget",
			123: "Ancient Drum",
			124: "Golden Mask",
			125: "Golden Relic",
			126: "Strange Doll (Green)",
			127: "Strange Doll (Yellow)",
			128: "Pufferfish",
			129: "Anchovy",
			130: "Tuna",
			131: "Sardine",
			132: "Bream",
			136: "Largemouth Bass",
			137: "Smallmouth Bass",
			138: "Rainbow Trout",
			139: "Salmon",
			140: "Walleye",
			141: "Perch",
			142: "Carp",
			143: "Catfish",
			144: "Pike",
			145: "Sunfish",
			146: "Red Mullet",
			147: "Herring",
			148: "Eel",
			149: "Octopus",
			150: "Red Snapper",
			151: "Squid",
			152: "Seaweed",
			153: "Green Algae",
			154: "Sea Cucumber",
			155: "Super Cucumber",
			156: "Ghostfish",
			157: "White Algae",
			158: "Stonefish",
			159: "Crimsonfish",
			160: "Angler",
			161: "Ice Pip",
			162: "Lava Eel",
			163: "Legend",
			164: "Sandfish",
			165: "Scorpion Carp",
			166: "Treasure Chest",
			167: "Joja Cola",
			168: "Trash",
			169: "Driftwood",
			170: "Broken Glasses",
			171: "Broken CD",
			172: "Soggy Newspaper",
			174: "Large Egg (White)",
			176: "Egg (White)",
			178: "Hay",
			180: "Egg (Brown)",
			182: "Large Egg (Brown)",
			184: "Milk",
			186: "Large Milk",
			188: "Green Bean",
			190: "Cauliflower",
			192: "Potato",
			194: "Fried Egg",
			195: "Omelet",
			196: "Salad",
			197: "Cheese Cauliflower",
			198: "Baked Fish",
			199: "Parsnip Soup",
			200: "Vegetable Medley",
			201: "Complete Breakfast",
			202: "Fried Calamari",
			203: "Strange Bun",
			204: "Lucky Lunch",
			205: "Fried Mushroom",
			206: "Pizza",
			207: "Bean Hotpot",
			208: "Glazed Yams",
			209: "Carp Surprise",
			210: "Hashbrowns",
			211: "Pancakes",
			212: "Salmon Dinner",
			213: "Fish Taco",
			214: "Crispy Bass",
			215: "Pepper Poppers",
			216: "Bread",
			218: "Tom Kha Soup",
			219: "Trout Soup",
			220: "Chocolate Cake",
			221: "Pink Cake",
			222: "Rhubarb Pie",
			223: "Cookie",
			224: "Spaghetti",
			225: "Fried Eel",
			226: "Spicy Eel",
			227: "Sashimi",
			228: "Maki Roll",
			229: "Tortilla",
			230: "Red Plate",
			231: "Eggplant Parmesan",
			232: "Rice Pudding",
			233: "Ice Cream",
			234: "Blueberry Tart",
			235: "Autumn's Bounty",
			236: "Pumpkin Soup",
			237: "Super Meal",
			238: "Cranberry Sauce",
			239: "Stuffing",
			240: "Farmer's Lunch",
			241: "Survival Burger",
			242: "Dish O' The Sea",
			243: "Miner's Treat",
			244: "Roots Platter",
			245: "Sugar",
			246: "Wheat Flour",
			247: "Oil",
			248: "Garlic",
			250: "Kale",
			251: "Tea Sapling",
			252: "Rhubarb",
			253: "Triple Shot Espresso",
			254: "Melon",
			256: "Tomato",
			257: "Morel",
			258: "Blueberry",
			259: "Fiddlehead Fern",
			260: "Hot Pepper",
			261: "Warp Totem: Desert",
			262: "Wheat",
			264: "Radish",
			265: "Seafoam Pudding",
			266: "Red Cabbage",
			267: "Flounder",
			268: "Starfruit",
			269: "Midnight Carp",
			270: "Corn",
			271: "Unmilled Rice",
			272: "Eggplant",
			273: "Rice Shoot",
			274: "Artichoke",
			275: "Artifact Trove",
			276: "Pumpkin",
			278: "Bok Choy",
			279: "Magic Rock Candy",
			280: "Yam",
			281: "Chanterelle",
			282: "Cranberries",
			283: "Holly",
			284: "Beet",
			286: "Cherry Bomb",
			287: "Bomb",
			288: "Mega Bomb",
			289: "Ostrich Egg",
			292: "Mahogany Seed",
			293: "Brick Floor",
			296: "Salmonberry",
			297: "Grass Starter",
			298: "Hardwood Fence",
			299: "Amaranth Seeds",
			300: "Amaranth",
			301: "Grape Starter",
			302: "Hops Starter",
			303: "Pale Ale",
			304: "Hops",
			305: "Void Egg",
			306: "Mayonnaise",
			307: "Duck Mayonnaise",
			308: "Void Mayonnaise",
			309: "Acorn",
			310: "Maple Seed",
			311: "Pine Cone",
			322: "Wood Fence",
			323: "Stone Fence",
			324: "Iron Fence",
			325: "Gate",
			328: "Wood Floor",
			329: "Stone Floor",
			330: "Clay",
			331: "Weathered Floor",
			333: "Crystal Floor",
			334: "Copper Bar",
			335: "Iron Bar",
			336: "Gold Bar",
			337: "Iridium Bar",
			338: "Refined Quartz",
			340: "Honey",
			341: "Tea Set",
			342: "Pickles",
			344: "Jelly",
			346: "Beer",
			347: "Rare Seed",
			348: "Wine",
			349: "Energy Tonic",
			350: "Juice",
			351: "Muscle Remedy",
			368: "Basic Fertilizer",
			369: "Quality Fertilizer",
			370: "Basic Retaining Soil",
			371: "Quality Retaining Soil",
			372: "Clam",
			373: "Golden Pumpkin",
			376: "Poppy",
			378: "Copper Ore",
			380: "Iron Ore",
			382: "Coal",
			384: "Gold Ore",
			386: "Iridium Ore",
			388: "Wood",
			390: "Stone",
			392: "Nautilus Shell",
			393: "Coral",
			394: "Rainbow Shell",
			395: "Coffee",
			396: "Spice Berry",
			397: "Sea Urchin",
			398: "Grape",
			399: "Spring Onion",
			400: "Strawberry",
			401: "Straw Floor",
			402: "Sweet Pea",
			403: "Field Snack",
			404: "Common Mushroom",
			405: "Wood Path",
			406: "Wild Plum",
			407: "Gravel Path",
			408: "Hazelnut",
			409: "Crystal Path",
			410: "Blackberry",
			411: "Cobblestone Path",
			412: "Winter Root",
			413: "Blue Slime Egg",
			414: "Crystal Fruit",
			415: "Stepping Stone Path",
			416: "Snow Yam",
			417: "Sweet Gem Berry",
			418: "Crocus",
			419: "Vinegar",
			420: "Red Mushroom",
			421: "Sunflower",
			422: "Purple Mushroom",
			423: "Rice",
			424: "Cheese",
			425: "Fairy Seeds",
			426: "Goat Cheese",
			427: "Tulip Bulb",
			428: "Cloth",
			429: "Jazz Seeds",
			430: "Truffle",
			431: "Sunflower Seeds",
			432: "Truffle Oil",
			433: "Coffee Bean",
			436: "Goat Milk",
			437: "Red Slime Egg",
			438: "L. Goat Milk",
			439: "Purple Slime Egg",
			440: "Wool",
			441: "Explosive Ammo",
			442: "Duck Egg",
			444: "Duck Feather",
			445: "Caviar",
			446: "Rabbit's Foot",
			447: "Aged Roe",
			453: "Poppy Seeds",
			454: "Ancient Fruit",
			455: "Spangle Seeds",
			456: "Algae Soup",
			457: "Pale Broth",
			459: "Mead",
			463: "Drum Block",
			464: "Flute Block",
			465: "Speed-Gro",
			466: "Deluxe Speed-Gro",
			472: "Parsnip Seeds",
			473: "Bean Starter",
			474: "Cauliflower Seeds",
			475: "Potato Seeds",
			476: "Garlic Seeds",
			477: "Kale Seeds",
			478: "Rhubarb Seeds",
			479: "Melon Seeds",
			480: "Tomato Seeds",
			481: "Blueberry Seeds",
			482: "Pepper Seeds",
			483: "Wheat Seeds",
			484: "Radish Seeds",
			485: "Red Cabbage Seeds",
			486: "Starfruit Seeds",
			487: "Corn Seeds",
			488: "Eggplant Seeds",
			489: "Artichoke Seeds",
			490: "Pumpkin Seeds",
			491: "Bok Choy Seeds",
			492: "Yam Seeds",
			493: "Cranberry Seeds",
			494: "Beet Seeds",
			495: "Spring Seeds",
			496: "Summer Seeds",
			497: "Fall Seeds",
			498: "Winter Seeds",
			499: "Ancient Seeds",
			535: "Geode",
			536: "Frozen Geode",
			537: "Magma Geode",
			538: "Alamite",
			539: "Bixite",
			540: "Baryte",
			541: "Aerinite",
			542: "Calcite",
			543: "Dolomite",
			544: "Esperite",
			545: "Fluorapatite",
			546: "Geminite",
			547: "Helvite",
			548: "Jamborite",
			549: "Jagoite",
			550: "Kyanite",
			551: "Lunarite",
			552: "Malachite",
			553: "Neptunite",
			554: "Lemon Stone",
			555: "Nekoite",
			556: "Orpiment",
			557: "Petrified Slime",
			558: "Thunder Egg",
			559: "Pyrite",
			560: "Ocean Stone",
			561: "Ghost Crystal",
			562: "Tigerseye",
			563: "Jasper",
			564: "Opal",
			565: "Fire Opal",
			566: "Celestine",
			567: "Marble",
			568: "Sandstone",
			569: "Granite",
			570: "Basalt",
			571: "Limestone",
			572: "Soapstone",
			573: "Hematite",
			574: "Mudstone",
			575: "Obsidian",
			576: "Slate",
			577: "Fairy Stone",
			578: "Star Shards",
			579: "Prehistoric Scapula",
			580: "Prehistoric Tibia",
			581: "Prehistoric Skull",
			582: "Skeletal Hand",
			583: "Prehistoric Rib",
			584: "Prehistoric Vertebra",
			585: "Skeletal Tail",
			586: "Nautilus Fossil",
			587: "Amphibian Fossil",
			588: "Palm Fossil",
			589: "Trilobite",
			591: "Tulip",
			593: "Summer Spangle",
			595: "Fairy Rose",
			597: "Blue Jazz",
			599: "Sprinkler",
			604: "Plum Pudding",
			605: "Artichoke Dip",
			606: "Stir Fry",
			607: "Roasted Hazelnuts",
			608: "Pumpkin Pie",
			609: "Radish Salad",
			610: "Fruit Salad",
			611: "Blackberry Cobbler",
			612: "Cranberry Candy",
			613: "Apple",
			614: "Green Tea",
			618: "Bruschetta",
			621: "Quality Sprinkler",
			628: "Cherry Sapling",
			629: "Apricot Sapling",
			630: "Orange Sapling",
			631: "Peach Sapling",
			632: "Pomegranate Sapling",
			633: "Apple Sapling",
			634: "Apricot",
			635: "Orange",
			636: "Peach",
			637: "Pomegranate",
			638: "Cherry",
			645: "Iridium Sprinkler",
			648: "Coleslaw",
			649: "Fiddlehead Risotto",
			651: "Poppyseed Muffin",
			680: "Green Slime Egg",
			681: "Rain Totem",
			682: "Mutant Carp",
			684: "Bug Meat",
			685: "Bait",
			686: "Spinner",
			687: "Dressed Spinner",
			688: "Warp Totem: Farm",
			689: "Warp Totem: Mountains",
			690: "Warp Totem: Beach",
			691: "Barbed Hook",
			692: "Lead Bobber",
			693: "Treasure Hunter",
			694: "Trap Bobber",
			695: "Cork Bobber",
			698: "Sturgeon",
			699: "Tiger Trout",
			700: "Bullhead",
			701: "Tilapia",
			702: "Chub",
			703: "Magnet",
			704: "Dorado",
			705: "Albacore",
			706: "Shad",
			707: "Lingcod",
			708: "Halibut",
			709: "Hardwood",
			710: "Crab Pot",
			715: "Lobster",
			716: "Crayfish",
			717: "Crab",
			718: "Cockle",
			719: "Mussel",
			720: "Shrimp",
			721: "Snail",
			722: "Periwinkle",
			723: "Oyster",
			724: "Maple Syrup",
			725: "Oak Resin",
			726: "Pine Tar",
			727: "Chowder",
			728: "Fish Stew",
			729: "Escargot",
			730: "Lobster Bisque",
			731: "Maple Bar",
			732: "Crab Cakes",
			733: "Shrimp Cocktail",
			734: "Woodskip",
			745: "Strawberry Seeds",
			746: "Jack-O-Lantern",
			747: "Rotten Plant",
			748: "Rotten Plant",
			749: "Omni Geode",
			766: "Slime",
			767: "Bat Wing",
			768: "Solar Essence",
			769: "Void Essence",
			770: "Mixed Seeds",
			771: "Fiber",
			772: "Oil of Garlic",
			773: "Life Elixir",
			774: "Wild Bait",
			775: "Glacierfish",
			787: "Battery Pack",
			795: "Void Salmon",
			796: "Slimejack",
			797: "Pearl",
			798: "Midnight Squid",
			799: "Spook Fish",
			800: "Blobfish",
			802: "Cactus Seeds",
			805: "Tree Fertilizer",
			807: "Dinosaur Mayonnaise",
			812: "Roe",
			814: "Squid Ink",
			815: "Tea Leaves",
			820: "Fossilized Skull",
			821: "Fossilized Spine",
			822: "Fossilized Tail",
			823: "Fossilized Leg",
			824: "Fossilized Ribs",
			825: "Snake Skull",
			826: "Snake Vertebrae",
			827: "Mummified Bat",
			828: "Mummified Frog",
			829: "Ginger",
			830: "Taro Root",
			831: "Taro Tuber",
			832: "Pineapple",
			833: "Pineapple Seeds",
			834: "Mango",
			835: "Mango Sapling",
			836: "Stingray",
			837: "Lionfish",
			838: "Blue Discus",
			840: "Rustic Plank Floor",
			841: "Stone Walkway Floor",
			848: "Cinder Shard",
			851: "Magma Cap",
			852: "Dragon Tooth",
			856: "Curiosity Lure",
			857: "Tiger Slime Egg",
			872: "Fairy Dust",
			873: "Piña Colada",
			874: "Bug Steak",
			877: "Quality Bobber",
			879: "Monster Musk",
			881: "Bone Fragment",
			885: "Fiber Seeds",
			886: "Warp Totem: Island",
			889: "Qi Fruit",
			890: "Qi Bean",
			891: "Mushroom Tree Seed",
			892: "Warp Totem: Qi's Arena",
			893: "Fireworks (Red)",
			894: "Fireworks (Purple)",
			895: "Fireworks (Green)",
			896: "Galaxy Soul",
			898: "Son of Crimsonfish",
			899: "Ms. Angler",
			900: "Legend II",
			901: "Radioactive Carp",
			902: "Glacierfish Jr.",
			903: "Ginger Ale",
			904: "Banana Pudding",
			905: "Mango Sticky Rice",
			906: "Poi",
			907: "Tropical Curry",
			908: "Magic Bait",
			909: "Radioactive Ore",
			910: "Radioactive Bar",
			911: "Horse Flute",
			913: "Enricher",
			915: "Pressure Nozzle",
			917: "Qi Seasoning",
			918: "Hyper Speed-Gro",
			919: "Deluxe Fertilizer",
			920: "Deluxe Retaining Soil",
			921: "Squid Ink Ravioli",
			926: "Cookout Kit",
			928: "Golden Egg",
			"MixedFlowerSeeds": "Mixed Flower Seeds",
			"MysteryBox": "Mystery Box",
			"DeluxeBait": "Deluxe Bait",
			"Moss": "Moss",
			"MossySeed": "Mossy Seed",
			"SonarBobber": "Sonar Bobber",
			"TentKit": "Tent Kit",
			"MysticTreeSeed": "Mystic Tree Seed",
			"MysticSyrup": "Mystic Syrup",
			"Raisins": "Raisins",
			"DriedFruit": "Dried Fruit",
			"DriedMushrooms": "Dried Mushrooms",
			"StardropTea": "Stardrop Tea",
			"PrizeTicket": "Prize Ticket",
			"TreasureTotem": "Treasure Totem",
			"ChallengeBait": "Challenge Bait",
			"CarrotSeeds": "Carrot Seeds",
			"Carrot": "Carrot",
			"SummerSquashSeeds": "Summer Squash Seeds",
			"SummerSquash": "Summer Squash",
			"BroccoliSeeds": "Broccoli Seeds",
			"Broccoli": "Broccoli",
			"PowdermelonSeeds": "Powdermelon Seeds",
			"Powdermelon": "Powdermelon",
			"SmokedFish": "Smoked Fish",
			"Book_Trash": "The Alleyway Buffet",
			"Book_Crabbing": "The Art O' Crabbing",
			"Book_Bombs": "Dwarvish Safety Manual",
			"Book_Roe": "Jewels Of The Sea",
			"Book_WildSeeds": "Raccoon Journal",
			"Book_Woodcutting": "Woody's Secret",
			"Book_Defense": "Jack Be Nimble, Jack Be Thick",
			"Book_Friendship": "Friendship 101",
			"Book_Void": "Monster Compendium",
			"Book_Speed": "Way Of The Wind pt. 1",
			"Book_Marlon": "Mapping Cave Systems",
			"Book_PriceCatalogue": "Price Catalogue",
			"Book_QueenOfSauce": "Queen Of Sauce Cookbook",
			"Book_Diamonds": "The Diamond Hunter",
			"Book_Mystery": "Book of Mysteries",
			"Book_AnimalCatalogue": "Animal Catalogue",
			"Book_Speed2": "Way Of The Wind pt. 2",
			"GoldenAnimalCracker": "Golden Animal Cracker",
			"GoldenMysteryBox": "Golden Mystery Box",
			"SeaJelly": "Sea Jelly",
			"CaveJelly": "Cave Jelly",
			"RiverJelly": "River Jelly",
			"Goby": "Goby",
			"Book_Artifact": "Ancient Treasures: Appraisal Guide",
			"Book_Horse": "Horse: The Book",
			"Book_Grass": "Ol' Slitherlegs",
		}
		// Date originally used XXForSaveGame elements, but those were not always present on saves downloaded from upload.farm
		output += '<span class="result">Day ' + Number($(xmlDoc).find('dayOfMonth').text()) + ' of ' +
			capitalize($(xmlDoc).find('currentSeason').html()) + ', Year ' + Number($(xmlDoc).find('year').text()) + '</span><br />';
		output += '<span class="result">Played for ';
		if (playHr === 0 && playMin === 0) {
			output += "less than 1 minute";
		} else {
			if (playHr > 0) {
				output += playHr + ' hr ';
			}
			if (playMin > 0) {
				output += playMin + ' min ';
			}
		}
		output += '</span><br />';
		output += '<span class="result">Save is from version ' + saveInfo.version + ' ' + saveInfo.versionLabel + '</span><br /></div>';
		output += getSectionFooter();
		return output;
	}
	
	// After Stardew 1.6 changes to how farmhands are stored in the save we have created this wrapper for all the farmhand handling.
	function parseFarmhands(xmlDoc, saveInfo, table, func, ...args) {
		if (saveInfo.numPlayers > 1) {
			var farmhandSelector =  'farmhand';
			if (compareSemVer(saveInfo.version, "1.6") >= 0) {
				farmhandSelector = "farmhands > Farmer";
			}
			$(xmlDoc).find(farmhandSelector).each(function() {
				if (isValidFarmhand(this)) {
					table.push(func(this, saveInfo, ...args));
				}
			});
		}
	}
	
	function populateData(player, saveInfo) {
		var id = "0";
		var name = $(player).children('name').html();
		if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			id = $(player).children('UniqueMultiplayerID').text();
			if (BigInt(id) % BigInt(111) === 0) {
				console.log("Player " + name + " is bad at music");
			}
		}
		saveInfo.data[id] = {};
		saveInfo.data[id].name = name;
		// redundant but useful
		saveInfo.data[id].umid = id;
		saveInfo.data[id].stats = {};
		var newStatFormat = (compareSemVer(saveInfo.version, "1.6") >= 0);
		var selector = newStatFormat ? 'stats > Values > item' : 'stats > *';
		var statBase = (compareSemVer(saveInfo.version, "1.3") >= 0) ? player : $(player).parent();
		// This does not handle pre-1.6 "specificMonstersKilled" correctly since it assumes single elements
		$(statBase).find(selector).each(function() {
			var key, value;
			if (newStatFormat) {
				key = $(this).find('key > string').text();
				value = $(this).find('value > *').text();
			} else {
				key = $(this)[0].nodeName;
				value = $(this).text();
			}
			saveInfo.data[id].stats[key] = value;
		});
		saveInfo.data[id].mailReceived = {};
		$(player).find("mailReceived > string").each(function() {
			saveInfo.data[id].mailReceived[$(this).text()] = true;
		});
		saveInfo.data[id].eventsSeen = {};
		$(player).find("eventsSeen > *").each(function() {
			saveInfo.data[id].eventsSeen[($(this).text())] = true;
		});
		saveInfo.data[id].experiencePoints = [];
		$(player).find('experiencePoints > int').each(function () {
			// Note that we are recording the value for Luck here too
			saveInfo.data[id].experiencePoints.push(Number($(this).text()));
		});		
		
		return id;
	}

	function parseMoney(xmlDoc, saveInfo) {
		var title = 'Money',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			separateWallets = ($(xmlDoc).find('SaveGame > player > useSeparateWallets').text() === "true"),
			money = Number($(xmlDoc).find('SaveGame > player > totalMoneyEarned').text()),
			left = money,
			table = [];

		// Money earned achievements appear to be relative to the farm even with split money in MP.
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + $(xmlDoc).find('SaveGame > player > farmName').html() + ' Farm has earned ' +
			addCommas(money) + 'g.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (money >= 15e3) ? getAchieveString('Greenhorn', 'earn 15,000g', 1) :
				getAchieveString('Greenhorn', 'earn 15,000g', 0) + addCommas(15e3 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 5e4) ? getAchieveString('Cowpoke', 'earn 50,000g', 1) :
				getAchieveString('Cowpoke', 'earn 50,000g', 0) + addCommas(5e4 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 25e4) ? getAchieveString('Homesteader', 'earn 250,000g', 1) :
				getAchieveString('Homesteader', 'earn 250,000g', 0) + addCommas(25e4 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 1e6) ? getAchieveString('Millionaire', 'earn 1,000,000g', 1) :
				getAchieveString('Millionaire', 'earn 1,000,000g', 0) + addCommas(1e6 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 1e7) ? getAchieveString('Legend', 'earn 10,000,000g', 1) :
				getAchieveString('Legend', 'earn 10,000,000g', 0) + addCommas(1e7 - money) + 'g more';
		output += '</li></ul></div>';
		
		if (separateWallets) {
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="result">Earnings Breakdown:</span><ul class="outer">';
			Object.keys(saveInfo.players).forEach(function(id) {
				var m = saveInfo.data[id].stats.individualMoneyEarned || 0;
				output += '<li>' + addCommas(m) + 'g earned by ' + saveInfo.players[id] + '</li>';
				left -= m;
			});
			if (left > 0) {
				output += '<li>(' + addCommas(left) + 'g surplus unexplained)</li>';
			} else if (left < 0) {
				output += '<li>(' + addCommas(0-left) + 'g deficit unexplained)</li>';
			}
			output += '</ul></div>'
		}

		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + output + getSectionFooter();
		return output;
	}

	function parseSocial(xmlDoc, saveInfo) {
		var title = 'Social',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [],
			spouse = $(xmlDoc).find('player > spouse').text(); // only used for 1.2 engagement checking
			
			meta.countdown = Number($(xmlDoc).find('countdownToWedding').text());
			// NPCs and NPC Types we are ignoring either in location data or friendship data
			meta.ignore = {
				'Horse': 1,
				'Cat': 1,
				'Dog': 1,
				'Fly': 1,
				'Grub': 1,
				'GreenSlime': 1,
				'Gunther': 1,
				'Marlon': 1,
				'Bouncer': 1,
				'Mister Qi': 1,
				'Henchman': 1,
				'Birdie': 1,
				'Fizz' : 1,
				'Pet' : 1,
				'Raccoon' : 1,
				'Bat' : 1, // This one is from Lewis' Basement
			};
			meta.npc = {};
			// <NPC>: [ [<numHearts>, <id>], ... ]
			meta.eventList = {
				'Abigail': [ [2, 1], [4, 2], [6, 4], [8, 3], [10, 901756] ],
				'Alex': [ [2, 20], [4, 2481135], [5, 21], [6, 2119820], [8, 288847], [10, 911526] ],
				'Elliott': [ [2, 39], [4, 40], [6, 423502], [8, 1848481], [10, 43] ],
				'Emily': [ [2, 471942], [4, 463391], [6, 917409], [8, 2123243], [10, 2123343] ],
				'Haley': [ [2, 11], [4, 12], [6, 13], [8, 14], [10, 15] ],
				'Harvey': [ [2, 56], [4, 57], [6, 58], [8, 571102], [10, 528052] ],
				'Leah': [ [2, 50], [4, 51], [6, 52], [8, '53|584059'], [10, 54] ], // 53 art show, 584059 online
				'Maru': [ [2, 6], [4, 7], [6, 8], [8, 9], [10, 10] ],
				'Penny': [ [2, 34], [4, 35], [6, 36], [8, 181928], [10, 38] ],
				'Sam': [ [2, 44], [3, 733330], [4, 46], [6, 45], [8, 4081148], [10, 233104] ],
				'Sebastian': [ [2, 2794460], [4, 384883], [6, 27], [8, 29], [10, 384882] ],
				'Shane': [ [2, 611944], [4, 3910674], [6, 3910975], ['6.8', 3910974], [7, 831125], [8, 3900074], [10, 9581348] ],
				'Caroline': [ [6, 17] ],
				'Clint': [ [3, 97], [6, 101] ],
				'Demetrius': [ [6, 25] ],
				'Dwarf': [ ['0.2', 691039] ],
				'Evelyn': [ [4, 19] ],
				'George': [ [6, 18] ],
				'Gus': [ [4, 96] ],
				'Jas': [  ],
				'Jodi': [ [4, '94|95'] ], // 94 y1, 95 y2
				'Kent': [ [3, 100] ],
				'Krobus': [ ],
				'Lewis': [ [6, 639373] ],
				'Linus': [ ['0.2', 502969], [4, 26] ],
				'Marnie': [ [6, 639373] ],
				'Pam': [ ],
				'Pierre': [ [6, 16] ],
				'Robin': [ [6, 33] ],
				'Sandy': [ ],
				'Vincent': [ ],
				'Willy': [ ],
				'Wizard': [ ],
			};
			if (compareSemVer(saveInfo.version, "1.3") >= 0) {
				meta.eventList.Jas.push([8, 3910979]);
				meta.eventList.Vincent.push([8, 3910979]);
				meta.eventList.Linus.push([8, 371652]);
				meta.eventList.Pam.push([9, 503180]);
				meta.eventList.Willy.push([6, 711130]);
			}
			if (compareSemVer(saveInfo.version, "1.4") >= 0) {
				meta.eventList.Gus.push([5, 980558]);
				// This event does not require 2 hearts, but getting into the room does
				meta.eventList.Caroline.push([2, 719926]);
				// 14-Heart spouse events. Many have multiple parts; to preserve their proper order,
				//  we will use 14.2, 14.3, etc. even though the requirements are all exactly 14
				meta.eventList.Abigail.push([14, 6963327]);
				meta.eventList.Emily.push([14.1, 3917600], [14.2, 3917601]);
				meta.eventList.Haley.push([14.1, 6184643], [14.2, 8675611], [14.3, 6184644]);
				meta.eventList.Leah.push([14.1, 3911124], [14.2, 3091462]);
				meta.eventList.Maru.push([14.1, 3917666], [14.2, 5183338]);
				meta.eventList.Penny.push([14.1, 4325434], [14.2, 4324303]);
				meta.eventList.Alex.push([14.1, 3917587], [14.2, 3917589], [14.3, 3917590]);
				meta.eventList.Elliott.push([14.1, 3912125], [14.2, 3912132]);
				meta.eventList.Harvey.push([14, 3917626]);
				meta.eventList.Sam.push([14.1, 3918600], [14.2, 3918601], [14.3, 3918602], [14.4, 3918603]);
				meta.eventList.Sebastian.push([14.1, 9333219], [14.2, 9333220]);
				meta.eventList.Shane.push([14.1, 3917584], [14.2, 3917585], [14.3, 3917586]);
				meta.eventList.Krobus.push([14, 7771191]);
			}
			if (compareSemVer(saveInfo.version, "1.5") >= 0) {
				meta.eventList['Leo'] = [ [0, 1039573], [2, 6497423], [4, 6497421], [6, 6497428], [9, 8959199] ];
			}

		// Search locations for NPCs. They could be hardcoded, but this is somewhat more mod-friendly and it also
		// lets us to grab children and search out relationship status for version 1.2 saves.
		$(xmlDoc).find('locations > GameLocation').each(function () {
			$(this).find('characters > NPC').each(function () {
				var type = $(this).attr(saveInfo.ns_prefix + ':type');
				var who = $(this).find('name').html();
				// Filter out animals and monsters
				if (meta.ignore.hasOwnProperty(type) || meta.ignore.hasOwnProperty(who)) {
					return;
				}
				meta.npc[who] = {};
				meta.npc[who].isDatable = ($(this).find('datable').text() === 'true');
				meta.npc[who].isGirl = ($(this).find('gender').text() === '1');
				meta.npc[who].isChild = (type  === 'Child');
				if (compareSemVer(saveInfo.version, "1.3") < 0) {
					if ($(this).find('divorcedFromFarmer').text() === 'true') {
						meta.npc[who].relStatus = 'Divorced';
					} else if (meta.countdown > 0 && who === spouse.slice(0,-7)) {
						meta.npc[who].relStatus = 'Engaged';
					} else if ($(this).find('daysMarried').text() > 0) {
						meta.npc[who].relStatus = 'Married';
					} else if ($(this).find('datingFarmer').text() === 'true') {
						meta.npc[who].relStatus = 'Dating';
					} else {
						meta.npc[who].relStatus = 'Friendly';
					}
				}
			});
		});
		table[0] = parsePlayerSocial($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerSocial, meta);
		playerOutput = printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}

	function parsePlayerSocial(player, saveInfo, meta) {
		var output = '',
			table = [],
			count_5h = 0,
			count_10h = 0,
			maxed_count = 0,
			maxed_total = 0,
			umid = (compareSemVer(saveInfo.version, "1.3") >= 0) ? $(player).children('UniqueMultiplayerID').text() : saveInfo.farmerId,
			pt_pct = '',
			points = {},
			list_fam = [],
			list_bach = [],
			list_other = [],
			list_poly = [],
			farmer = $(player).children('name').html(),
			spouse = $(player).children('spouse').html(),
			dumped_Girls = 0,
			dumped_Guys = 0,
			hasSpouseStardrop = false,
			eventsSeen = saveInfo.data[umid].eventsSeen,
			hasNPCSpouse = false,
			hasPamHouse = false,
			hasCompletedIntroductions = true,
			list_intro = [],
			polyamory = {
				'All Bachelors': [195013,195099],
				'All Bachelorettes': [195012,195019]
				};
		if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			$(player).find('activeDialogueEvents > item').each(function () {
				var which = $(this).find('key > string').text();
				var num = Number($(this).find('value > int').text());
				if (which === 'dumped_Girls') {
					dumped_Girls = num;
				} else if (which === 'dumped_Guys') {
					dumped_Guys = num;
				}
			});
			$(player).find('friendshipData > item').each(function () {
				var who = $(this).find('key > string').html();
				// Doved children will still have friendshipData but will no longer exist as characters,
				// so that is what the second check detects.
				if (meta.ignore.hasOwnProperty(who) || !meta.npc.hasOwnProperty(who)) { return; }
				var num = Number($(this).find('value > Friendship > Points').text());
				if (num >= 2500) { count_10h++; }
				if (num >= 1250) { count_5h++; }
				// Some redundancy because of keeping the achievement tally separate from Perfection Tracker
				if (meta.eventList.hasOwnProperty(who)) {
					maxed_total++;
					if ( (meta.npc[who].isDatable && num >= 2000) || (num >= 2500) ) { maxed_count++; }
				}
				points[who] = num;
				meta.npc[who].relStatus = $(this).find('value > Friendship > Status').text();
				var isRoommate = ($(this).find('value > Friendship > RoommateMarriage').text() === 'true');
				if (meta.npc[who].relStatus === 'Married' && isRoommate) {
					meta.npc[who].relStatus = 'Roommate'
				}
			});
		} else {
			$(player).find('friendships > item').each(function () {
				var who = $(this).find('key > string').html();
				var num = Number($(this).find('value > ArrayOfInt > int').first().text());
				if (num >= 2500) { count_10h++; }
				if (num >= 1250) { count_5h++; }
				points[who] = num;
			});
			if (meta.countdown > 0) {
				spouse = spouse.slice(0,-7);
			}
		}

		if (saveInfo.data[umid].mailReceived.hasOwnProperty('CF_Spouse')) {
			hasSpouseStardrop = true;
		}
		if (saveInfo.data[umid].mailReceived.hasOwnProperty('pamHouseUpgrade')) {
			hasPamHouse = true;
		}
		var eventCheck = function (arr, who) {
			var seen = false;
			var neg = 'no';
			// Note we are altering eventInfo from parent function
			String(arr[1]).split('|').forEach( function(e) {
				if (eventsSeen.hasOwnProperty(e)) {
					seen = true;
				}
			});
			// checks for events which can be permanently missed; 1st is Clint 6H, second is Sam 3H
			// Penny 4H & 6H added if Pam House Upgrade is done in some versions.
			if ((arr[1] === 101 && (eventsSeen.hasOwnProperty(2123243) || eventsSeen.hasOwnProperty(2123343))) || 
				(arr[1] === 733330 && saveInfo.data[umid].stats.daysPlayed > 84) ||
				(arr[1] === 35 && hasPamHouse && (compareSemVer(saveInfo.version, "1.5") < 0)) || 
				(arr[1] === 36 && hasPamHouse && (compareSemVer(saveInfo.version, "1.4") < 0))) {
					neg = 'imp';
				}
			// 10-heart events will be tagged impossible if there is no bouquet.
			if (arr[0] == 10 && meta.npc[who].isDatable && meta.npc[who].relStatus == 'Friendly') {
				neg = 'imp';
			}			
			// 14-heart events will be tagged impossible if the player is married to someone else.
			if (arr[0] >= 14 && who !== spouse) {
				neg = 'imp';
			}
			// Now we are hardcoding 2 events that involve multiple NPCs too.
			var extra = '';
			if (arr[1] === 3910979) {
				extra = " (Jas &amp; Vincent both)";
			} else if (arr[1] === 639373) {
				extra = " (Lewis &amp; Marnie both)";
			}
			eventInfo += ' [<span class="ms_' + (seen ? 'yes':neg) + '">' + arr[0] + '&#x2665;' + extra + '</span>]';
		};
		for (var who in meta.npc) {
			// Overriding status for the confrontation events
			if (dumped_Girls > 0 && npc[who].isDatable && npc[who].isGirl) {
				meta.npc[who].relStatus = 'Angry (' + dumped_Girls + ' more day(s))';
			} else if (dumped_Guys > 0 && npc[who].isDatable && !npc[who].isGirl) {
				nmeta.pc[who].relStatus = 'Angry (' + dumped_Guys + ' more day(s))';
			} 
			var pts = 0;
			if (points.hasOwnProperty(who)) {
				pts = points[who];
			} else {
				meta.npc[who].relStatus = "Unmet";
			}
			var hearts = Math.floor(pts/250);
			var entry = '<li>';
			entry += (meta.npc[who].isChild) ? who + ' (' + wikify('Child', 'Children') + ')' : wikify(who);
			entry += ': ' + meta.npc[who].relStatus + ', ' + hearts + '&#x2665; (' + pts + ' pts) -- ';
				
			// Check events
			// We want to only make an Event list item if there are actually events for this NPC.
			var eventInfo = '';
			if (meta.eventList.hasOwnProperty(who)) {
				if (meta.eventList[who].length > 0) {
					eventInfo += '<ul class="compact"><li>Event(s): ';
					meta.eventList[who].sort(function (a,b) { return a[0] - b[0]; });
					meta.eventList[who].forEach(function (a) { eventCheck(a, who); });
					eventInfo += '</li></ul>';
				}
			}
			var max;
			if (who === spouse) {
				// Spouse Stardrop threshold is 3375 from StardewValley.NPC.checkAction(); 3500 (14 hearts) in 1.4
				max = hasSpouseStardrop ? 3250 : 3375;
				if (compareSemVer(saveInfo.version, "1.4") >= 0) {
					max = 3500;
				}
				entry += (pts >= max) ? '<span class="ms_yes">MAX (can still decay)</span></li>' :
					'<span class="ms_no">need ' + (max - pts) + ' more</span></li>';
				hasNPCSpouse = true;
				list_fam.push(entry + eventInfo);
			} else if (meta.npc[who].isDatable) {
				max = 2000;
				if (meta.npc[who].relStatus === 'Dating') {
					max = 2500;
				}
				entry += (pts >= max) ? '<span class="ms_yes">MAX</span></li>' :
					'<span class="ms_no">need ' + (max - pts) + ' more</span></li>';
				list_bach.push(entry + eventInfo);
			} else {
				entry += (pts >= 2500) ? '<span class="ms_yes">MAX</span></li>' :
					'<span class="ms_no">need ' + (2500 - pts) + ' more</span></li>';
				if (meta.npc[who].isChild) {
					list_fam.push(entry + eventInfo);
				} else {
					list_other.push(entry + eventInfo);
				}
			}
		}
		if (saveInfo.version >= 1.3) {
			for (var who in polyamory) {
				// Rather than trying to force these to work in the eventCheck function, we make a new checker.
				var seen = false;
				var span = 'no';
				var entry = '<li>' + who;
				for (var id = 0; id < polyamory[who].length; id++ ) {
					if (eventsSeen.hasOwnProperty(polyamory[who][id])) {
						seen = true;
					}
				}
				if (seen) {
					span = 'yes';
				} else if (hasNPCSpouse) {
					span = 'imp';
				}
				entry += ': [<span class="ms_' + span + '">10&#x2665;</span>]</li>';
				list_poly.push(entry);
			}
		}
		$(player).find('questLog > [' + saveInfo.ns_prefix + "\\:type='SocializeQuest'] > whoToGreet > string").each(function () {
			list_intro.push($(this).text());
			hasCompletedIntroductions = false;
		});

		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + ' has ' + (hasCompletedIntroductions ? "" : "not ") + 
				'met everyone in town.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (list_intro.length == 0) ? getMilestoneString('Complete <span class="ach">Introductions</span> quest', 1) :
				getMilestoneString('Complete <span class="ach">Introductions</span> quest', 0) + (list_intro.length) + ' more';
		output += '</li></ul></div>';
		output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
		if (list_intro.length > 0) {
			output += '<span class="need">Villagers left to meet<ol><li>' + list_intro.sort().join('</li><li>') + '</li></ol></span>\n';
		}
		output += '</div>';
		table.push(output);

		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + ' has ' + count_5h + ' relationship(s) of 5+ hearts.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (count_5h >= 1) ? getAchieveString('A New Friend', '5&#x2665; with 1 person', 1) :
				getAchieveString('A New Friend', '5&#x2665; with 1 person', 0) + (1 - count_5h) + ' more';
		output += '</li>\n<li>';
		output += (count_5h >= 4) ? getAchieveString('Cliques', '5&#x2665; with 4 people', 1) :
				getAchieveString('Cliques', '5&#x2665; with 4 people', 0) + (4 - count_5h) + ' more\n';
		output += '</li>\n<li>';
		output += (count_5h >= 10) ? getAchieveString('Networking', '5&#x2665; with 10 people', 1) :
				getAchieveString('Networking', '5&#x2665; with 10 people', 0) + (10 - count_5h) + ' more';
		output += '</li>\n<li>';
		output += (count_5h >= 20) ? getAchieveString('Popular', '5&#x2665; with 20 people', 1) :
				getAchieveString('Popular', '5&#x2665; with 20 people', 0) + (20 - count_5h) + ' more';
		output += '</li></ul></div>';
		table.push(output);
		
		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + ' has ' + count_10h + ' relationships of 10+ hearts.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (count_10h >= 1) ? getAchieveString('Best Friends', '10&#x2665; with 1 person', 1) :
				getAchieveString('Best Friends', '10&#x2665; with 1 person', 0) + (1 - count_10h) + ' more';
		output += '</li>\n<li>';
		output += (count_10h >= 8) ? getAchieveString('The Beloved Farmer', '10&#x2665; with 8 people', 1) :
				getAchieveString('The Beloved Farmer', '10&#x2665; with 8 people', 0) + (8 - count_10h) + ' more';
		output += '</li></ul></div>';
		table.push(output);

		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			saveInfo.perfectionTracker[umid]["Great Friends"] = { 'count' : maxed_count, 'total' : maxed_total };
			pt_pct = getPTLink(maxed_count / maxed_total, true);
		}
		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + ' has maxed ' + maxed_count + ' of ' + maxed_total +
				' base game villager relationships.' + pt_pct + '</span><br />';
		output += '<span class="explain">Note: for this milestone, all dateable NPCs are considered maxed at 8 hearts.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (maxed_count >= maxed_total) ? getMilestoneString('Max out hearts with all base game villagers', 1) :
				getMilestoneString('Max out hearts with all base game villagers', 0) + (maxed_total - maxed_count) + ' more';
		output += '</li></ul></div>';
		table.push(output);

		output = '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
		output += '<span class="result">Individual Friendship Progress for ' + farmer + '</span><ul class="outer">';
		if (list_fam.length > 0) {
			output += '<li>Family (includes all player children)<ol class="compact">' + list_fam.sort().join('') + '</ol></li>\n';
		}
		if (list_bach.length > 0) {
			output += '<li>Datable Villagers<ol class="compact">' + list_bach.sort().join('') + '</ol></li>\n';
		}
		if (list_poly.length > 0) {
			output += '<li>Polyamory Events<ol class="compact">' + list_poly.sort().join('') + '</ol></li>\n';
		}
		if (list_other.length > 0) {
			output += '<li>Other Villagers<ol class="compact">' + list_other.sort().join('') + '</ol></li>\n';
		}
		output += '</ul></div>';
		meta.hasDetails = true; // this one always has details because of the friendship progress
		table.push(output);
		return table;
	}

	function parseFamily(xmlDoc, saveInfo) {
		var title = 'Home and Family',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];

			meta.wedding = Number($(xmlDoc).find('countdownToWedding').text());
			meta.isHost = true;

		table[0] = parsePlayerFamily($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerFamily, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}

	function parsePlayerFamily(player, saveInfo, meta) {
		var output = '',
			table = [],
			needs = [],
			count = 0,
			maxUpgrades = (meta.isHost ? 3 : 2),
			houseType = (meta.isHost ? "FarmHouse" : "Cabin"),
			farmer = $(player).children('name').html(),
			spouse = $(player).children('spouse').html(),
			umid = (compareSemVer(saveInfo.version, "1.3") >= 0) ? $(player).children('UniqueMultiplayerID').text() : saveInfo.farmerId,
			children = '(None)',
			child_name = [],
			houseUpgrades = Number($(player).children('houseUpgradeLevel').text());
		if (typeof(spouse) !== 'undefined' && spouse.length > 0) {
			if (meta.wedding > 0 && compareSemVer(saveInfo.version, "1.3") < 0) {
				spouse = spouse.slice(0,-7);
			}
			count++;
		} else if (saveInfo.partners.hasOwnProperty(umid)) {
			spouse = saveInfo.players[saveInfo.partners[umid]];
			count++;
		} else {
			spouse = '(None)';
			needs.push('spouse');
		}
		// Technically, we should be searching the Friendship data for RoommateMarriage here, but for now we are hardcoding
		var title = "spouse";
		if (spouse === "Krobus") {
			title = "roommate"
		}
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + "'s " + title + ": " + spouse + 
			((meta.wedding) ? ' -- wedding in ' + meta.wedding + ' day(s)' : '') + '</span><br />\n';
		if (saveInfo.children.hasOwnProperty(umid) && saveInfo.children[umid].length > 0) {
			child_name = saveInfo.children[umid];
			count += child_name.length;
		} else if (saveInfo.partners.hasOwnProperty(umid) && saveInfo.children.hasOwnProperty(saveInfo.partners[umid]) &&
					saveInfo.children[saveInfo.partners[umid]].length > 0) {
			child_name = saveInfo.children[saveInfo.partners[umid]];
			count += child_name.length;
		} else {
			$(player).parent().find("[" + saveInfo.ns_prefix + "\\:type='" + houseType + "'] NPC[" + saveInfo.ns_prefix + "\\:type='Child']").each(function () {
				count++;
				child_name.push($(this).find('name').html());
			});
		}
		if (child_name.length) {
			children = child_name.join(', ');
			if (child_name.length === 1) {
				needs.push("1 child");
			}
		} else {
			needs.push("2 children");
		}
		output += '<span class="result">' + farmer + "'s children: " + children + '</span><ul class="ach_list"><li>\n';
		output += (count >= 3) ? getAchieveString('Full House', 'Married + 2 kids', 1) :
				getAchieveString('Full House', 'Married + 2 kids', 0) + needs.join(' and ');
		output += '</li></ul></div>';
		table.push(output);
		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + houseType + ' upgraded ' + houseUpgrades + ' time(s) of ';
		output += maxUpgrades + ' possible.</span><br /><ul class="ach_list">\n';
		output += '<li>';
		output += (houseUpgrades >= 1) ? getAchieveString('Moving Up', '1 upgrade', 1) :
				getAchieveString('Moving Up', '1 upgrade', 0) + (1 - houseUpgrades) + ' more';
		output += '</li>\n<li>';
		output += (houseUpgrades >= 2) ? getAchieveString('Living Large', '2 upgrades', 1) :
				getAchieveString('Living Large', '2 upgrades', 0) + (2 - houseUpgrades) + ' more';
		output += '</li>\n<li>';
		output += (houseUpgrades >= maxUpgrades) ? getMilestoneString('House fully upgraded', 1) :
				getMilestoneString('House fully upgraded', 0) + (maxUpgrades - houseUpgrades) + ' more';
		output += '</li></ul></div>';
		table.push(output);
		return table;
	}

	function parseCooking(xmlDoc, saveInfo) {
		var title = 'Cooking',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [],
			id;
			
			meta.recipes = {
				194: "Fried Egg",
				195: "Omelet",
				196: "Salad",
				197: "Cheese Cauliflower",
				198: "Baked Fish",
				199: "Parsnip Soup",
				200: "Vegetable Medley",
				201: "Complete Breakfast",
				202: "Fried Calamari",
				203: "Strange Bun",
				204: "Lucky Lunch",
				205: "Fried Mushroom",
				206: "Pizza",
				207: "Bean Hotpot",
				208: "Glazed Yams",
				209: "Carp Surprise",
				210: "Hashbrowns",
				211: "Pancakes",
				212: "Salmon Dinner",
				213: "Fish Taco",
				214: "Crispy Bass",
				215: "Pepper Poppers",
				216: "Bread",
				218: "Tom Kha Soup",
				219: "Trout Soup",
				220: "Chocolate Cake",
				221: "Pink Cake",
				222: "Rhubarb Pie",
				223: "Cookie",
				224: "Spaghetti",
				225: "Fried Eel",
				226: "Spicy Eel",
				227: "Sashimi",
				228: "Maki Roll",
				229: "Tortilla",
				230: "Red Plate",
				231: "Eggplant Parmesan",
				232: "Rice Pudding",
				233: "Ice Cream",
				234: "Blueberry Tart",
				235: "Autumn's Bounty",
				236: "Pumpkin Soup",
				237: "Super Meal",
				238: "Cranberry Sauce",
				239: "Stuffing",
				240: "Farmer's Lunch",
				241: "Survival Burger",
				242: "Dish O' The Sea",
				243: "Miner's Treat",
				244: "Roots Platter",
				456: "Algae Soup",
				457: "Pale Broth",
				604: "Plum Pudding",
				605: "Artichoke Dip",
				606: "Stir Fry",
				607: "Roasted Hazelnuts",
				608: "Pumpkin Pie",
				609: "Radish Salad",
				610: "Fruit Salad",
				611: "Blackberry Cobbler",
				612: "Cranberry Candy",
				618: "Bruschetta",
				648: "Coleslaw",
				649: "Fiddlehead Risotto",
				651: "Poppyseed Muffin",
				727: "Chowder",
				728: "Fish Stew",
				729: "Escargot",
				730: "Lobster Bisque",
				731: "Maple Bar",
				732: "Crab Cakes"
			};
			meta.recipeTranslate = {
				"Cheese Cauli.": "Cheese Cauliflower",
				"Cookies": "Cookie",
				"Cran. Sauce": "Cranberry Sauce",
				"Dish o' The Sea": "Dish O' The Sea",
				"Eggplant Parm.": "Eggplant Parmesan",
				"Vegetable Stew": "Vegetable Medley"
			};
			meta.recipeReverse = {};

		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			meta.recipes[733] = "Shrimp Cocktail";
			meta.recipes[253] = "Triple Shot Espresso";
			meta.recipes[265] = "Seafoam Pudding";
		}
		
		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			meta.recipes[903] = "Ginger Ale";
			meta.recipes[904] = "Banana Pudding";
			meta.recipes[905] = "Mango Sticky Rice";
			meta.recipes[906] = "Poi";
			meta.recipes[907] = "Tropical Curry";
			meta.recipes[921] = "Squid Ink Ravioli";
		}

		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			meta.recipes["MossSoup"] = "Moss Soup";
		}

		for (id in meta.recipes) {
			if (meta.recipes.hasOwnProperty(id)) {
				meta.recipeReverse[meta.recipes[id]] = id;
			}
		}

		table[0] = parsePlayerCooking($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerCooking, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}
		
	function parsePlayerCooking(player, saveInfo, meta) {
		/* cookingRecipes is keyed by name, but recipesCooked is keyed by ObjectInformation ID.
		 * Also, some cookingRecipes names are different from the names in ObjectInformation (e.g. Cookies vs Cookie) */
		var output = '',
			recipe_count = Object.keys(meta.recipes).length,
			known = {},
			known_count = 0,
			crafted = {},
			craft_count = 0,
			need_k = [],
			need_c = [],
			mod_known = 0,
			mod_craft = 0,
			id,
			umid = (compareSemVer(saveInfo.version, "1.3") >= 0) ? $(player).children('UniqueMultiplayerID').text() : saveInfo.farmerId,
			pt_pct = '',
			r;

		$(player).find('cookingRecipes > item').each(function () {
			var id = $(this).find('key > string').text(),
				num = Number($(this).find('value > int').text());
			if (meta.recipeTranslate.hasOwnProperty(id)) {
				id = meta.recipeTranslate[id];
			}
			if (meta.recipeReverse.hasOwnProperty(id)) {
				known[id] = num;
				known_count++;
			} else {
				console.log("Unrecognized cooking recipe: " + id);
				mod_known++;
			}
		});
		$(player).find('recipesCooked > item').each(function () {
			var id = $(this).find('key > *').text(),
				num = Number($(this).find('value > int').text());
			if (meta.recipes.hasOwnProperty(id)) {
				if (num > 0) {
					crafted[meta.recipes[id]] = num;
					craft_count++;
				}
			} else {
				if (num > 0) {
					mod_craft++;
				}
			}
		});

		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			saveInfo.perfectionTracker[umid]["Cooking"] = { 'count' : craft_count, 'total' : recipe_count };
			pt_pct = getPTLink(craft_count / recipe_count, true);
		}
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + $(player).children('name').html() + " has cooked " + craft_count + ' and knows ' +
			known_count + ' of ' + recipe_count + ((mod_known > 0) ? " base game" : "") + ' recipes.' + pt_pct + '</span>\n';
		if (mod_known > 0) {
			output += '<br /><span class="result note">' + $(player).children('name').html() + " has also cooked " +
				mod_craft + ' and knows ' + mod_known + " unrecognized (probably mod) recipes.</span>\n";
		}
		output += '<ul class="ach_list"><li>';
		output += ( (craft_count + mod_craft) >= 10) ? getAchieveString('Cook', 'cook 10 different recipes', 1) :
				getAchieveString('Cook', 'cook 10 different recipes', 0) + (10 - craft_count - mod_craft) + ' more';
		output += '</li>\n<li>';
		output += ( (craft_count + mod_craft) >= 25) ? getAchieveString('Sous Chef', 'cook 25 different recipes', 1) :
				getAchieveString('Sous Chef', 'cook 25 different recipes', 0) + (25 - craft_count - mod_craft) + ' more';
		output += '</li>\n<li>';
		output += ( (craft_count + mod_craft) >= (recipe_count + mod_known) ) ? getAchieveString('Gourmet Chef', 'cook every recipe', 1) :
				getAchieveString('Gourmet Chef', 'cook every recipe', 0) + ((mod_known > 0) ? "at least " : "") +
				(recipe_count + mod_known - craft_count - mod_craft) + ' more';
		output += '</li></ul></div>';
		// We are assuming it is impossible to craft something without knowing the recipe.
		if ( (craft_count + mod_craft) < (recipe_count + mod_known) ) {
			for (id in meta.recipes) {
				if (meta.recipes.hasOwnProperty(id)) {
					r = meta.recipes[id];
					if (!known.hasOwnProperty(r)) {
						need_k.push('<li>' + wikify(r) + '</li>');
					} else if (!crafted.hasOwnProperty(r)) {
						need_c.push('<li>' + wikify(r) + '</li>');
					}
				}
			}
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Left to cook:<ul>';
			if (need_c.length > 0) {
				output += '<li>Known Recipes<ol>' + need_c.sort().join('') + '</ol></li>\n';
			}
			if (need_k.length > 0) {
				output += '<li>Unknown Recipes<ol>' + need_k.sort().join('') + '</ol></li>\n';
			}
			if (mod_known > 0) {
				if (mod_craft >= mod_known) {
					output += '<li>Possibly additional mod recipes</li>';
				} else {
					output += '<li>Plus at least ' + (mod_known - mod_craft) + ' mod recipes</li>';
				}
			}
			output += '</ul></span></div>';
		}
		return [output];
	}

	function parseCrafting(xmlDoc, saveInfo) {
		/* Manually listing all crafting recipes in the order they appear on http://stardewvalleywiki.com/Crafting
		 * A translation is needed again because of text mismatch. */
		var title = 'Crafting',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];
			
			meta.recipes = ["Cherry Bomb", "Bomb", "Mega Bomb",
							"Gate", "Wood Fence", "Stone Fence", "Iron Fence", "Hardwood Fence",
							"Sprinkler", "Quality Sprinkler", "Iridium Sprinkler",
							"Mayonnaise Machine", "Bee House", "Preserves Jar", "Cheese Press", "Loom", "Keg", "Oil Maker", "Cask",
							"Basic Fertilizer", "Quality Fertilizer", "Speed-Gro", "Deluxe Speed-Gro",
							"Basic Retaining Soil", "Quality Retaining Soil",
							"Wild Seeds (Sp)", "Wild Seeds (Su)", "Wild Seeds (Fa)", "Wild Seeds (Wi)", "Ancient Seeds",
							"Wood Floor", "Straw Floor", "Weathered Floor", "Crystal Floor", "Stone Floor",
							"Wood Path", "Gravel Path", "Cobblestone Path", "Stepping Stone Path", "Crystal Path",
							"Spinner", "Trap Bobber", "Cork Bobber", "Treasure Hunter", "Dressed Spinner", "Barbed Hook",
							"Magnet", "Bait", "Wild Bait", "Crab Pot",
							"Sturdy Ring", "Warrior Ring", "Ring of Yoba", "Iridium Band",
							"Field Snack", "Life Elixir", "Oil of Garlic",
							"Torch", "Campfire", "Wooden Brazier", "Stone Brazier", "Gold Brazier", "Carved Brazier",
							"Stump Brazier", "Barrel Brazier", "Skull Brazier", "Marble Brazier", "Wood Lamp-post",
							"Iron Lamp-post", "Jack-O-Lantern",
							"Chest", "Furnace", "Scarecrow", "Seed Maker", "Staircase", "Explosive Ammo",
							"Transmute (Fe)", "Transmute (Au)",
							"Crystalarium", "Charcoal Kiln", "Lightning Rod", "Recycling Machine", "Tapper", "Worm Bin",
							"Slime Egg-Press", "Slime Incubator", "Warp Totem: Beach", "Warp Totem: Mountains", "Warp Totem: Farm",
							"Rain Totem", "Tub o' Flowers", "Wicked Statue", "Flute Block", "Drum Block" ];
			meta.recipeTranslate = {
				"Oil Of Garlic": "Oil of Garlic"
			};

		if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			// Wedding Ring is specifically excluded in StardewValley.Stats.checkForCraftingAchievments() so it is not listed here.
			meta.recipes.push('Wood Sign', 'Stone Sign', 'Garden Pot');
		}
		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			meta.recipes.push('Brick Floor', 'Grass Starter', 'Deluxe Scarecrow', 'Mini-Jukebox', 'Tree Fertilizer', 'Tea Sapling', 'Warp Totem: Desert');
		}
		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			meta.recipes.push("Rustic Plank Floor", "Stone Walkway Floor", "Fairy Dust", "Bug Steak", "Dark Sign", "Quality Bobber", "Stone Chest", "Monster Musk", "Mini-Obelisk", "Farm Computer", "Ostrich Incubator", "Geode Crusher", "Fiber Seeds", "Solar Panel", "Bone Mill", "Warp Totem: Island", "Thorns Ring", "Glowstone Ring", "Heavy Tapper", "Hopper", "Magic Bait", "Hyper Speed-Gro", "Deluxe Fertilizer", "Deluxe Retaining Soil", "Cookout Kit");
		}
		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			meta.recipes.push("Anvil", "Bait Maker", "Big Chest", "Big Stone Chest", "Blue Grass Starter", "Challenge Bait", "Dehydrator", "Deluxe Bait", "Deluxe Worm Bin", "Fish Smoker", "Heavy Furnace", "Mini-Forge", "Mushroom Log", "Mystic Tree Seed", "Sonar Bobber", "Statue Of Blessings", "Statue Of The Dwarf King", "Tent Kit", "Text Sign", "Treasure Totem");
		}

		table[0] = parsePlayerCrafting($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerCrafting, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}

	function parsePlayerCrafting(player, saveInfo, meta) {
		var output = '',
			recipe_count,
			known = {},
			known_count = 0,
			craft_count = 0,
			need_k = [],
			need_c = [],
			mod_known = 0,
			mod_craft = 0,
			id,
			umid = (compareSemVer(saveInfo.version, "1.3") >= 0) ? $(player).children('UniqueMultiplayerID').text() : saveInfo.farmerId,
			pt_pct = '',
			r;

		recipe_count = meta.recipes.length;
		$(player).find('craftingRecipes > item').each(function () {
			var id = $(this).find('key > string').text(),
				num = Number($(this).find('value > int').text());
			if (meta.recipeTranslate.hasOwnProperty(id)) {
				id = meta.recipeTranslate[id];
			}
			if (id === 'Wedding Ring') {
				return true;
			}
			if (meta.recipes.indexOf(id) === -1) {
				mod_known++;
				if (num > 0) {
					mod_craft++
				}
				console.log("Unrecognized crafting recipe: " + id);
				return true;
			}
			known[id] = num;
			known_count++;
			if (num > 0) {
				craft_count++;
			} else {
				need_c.push('<li>' + wikify(id) + '</li>');
			}
		});

		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			saveInfo.perfectionTracker[umid]["Crafting"] = { 'count' : craft_count, 'total' : recipe_count };
			pt_pct = getPTLink(craft_count / recipe_count, true);
		}
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + $(player).children('name').html() + " has crafted " + craft_count + ' and knows ' +
			known_count + ' of ' + recipe_count + ' base game recipes.' + pt_pct + '</span>\n';
		if (mod_known > 0) {
			output += '<br /><span class="result"><span class="note">' + $(player).children('name').html() + " has also crafted " +
				mod_craft + ' and knows ' + mod_known + " unrecognized (probably mod) recipes.</span></span>\n";
		}
		output += '<ul class="ach_list"><li>';
		output += ( (craft_count + mod_craft) >= 15) ? getAchieveString('D.I.Y.', 'craft 15 different items', 1) :
				getAchieveString('D.I.Y.', 'craft 15 different items', 0) + (15 - craft_count - mod_craft) + ' more';
		output += '</li>\n<li>';
		output += ( (craft_count + mod_craft) >= 30) ? getAchieveString('Artisan', 'craft 30 different items', 1) :
				getAchieveString('Artisan', 'craft 30 different items', 0) + (30 - craft_count - mod_craft) + ' more';
		output += '</li>\n<li>';
		output += ( (craft_count + mod_craft) >= (recipe_count + mod_known) ) ? getAchieveString('Craft Master', 'craft every item', 1) :
				getAchieveString('Craft Master', 'craft every item', 0) + ((mod_known > 0) ? "at least " : "") +
				(recipe_count + mod_known - craft_count - mod_craft) + ' more';
		output += '</li></ul></div>';
		if ( (craft_count + mod_craft) < (recipe_count + mod_known) ) {
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Left to craft:<ul>';

			if (need_c.length > 0) {
				output += '<li>Known Recipes<ol>' + need_c.sort().join('') + '</ol></li>\n';
			}

			if (known_count < recipe_count) {
				need_k = [];
				for (id in meta.recipes) {
					if (meta.recipes.hasOwnProperty(id)) {
						r = meta.recipes[id];
						if (!known.hasOwnProperty(r)) {
							need_k.push('<li>' + wikify(r) + '</li>');
						}
					}
				}
				output += '<li>Unknown Recipes<ol>' + need_k.sort().join('') + '</ol></li>';
			}
			if (mod_known > 0) {
				if (mod_craft >= mod_known) {
					output += '<li>Possibly additional mod recipes</li>';
				} else {
					output += '<li>Plus at least ' + (mod_known - mod_craft) + ' mod recipes</li>';
				}
			}
			output += '</ul></span></div>';
		}
		return [output];
	}

	function parseFishing(xmlDoc, saveInfo) {
		var title = 'Fishing',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];
			meta.recipes = {
				// "Fish" category
				152: "Seaweed",
				153: "Green Algae",
				157: "White Algae",
				// "Fish -4" category
				128: "Pufferfish",
				129: "Anchovy",
				130: "Tuna",
				131: "Sardine",
				132: "Bream",
				136: "Largemouth Bass",
				137: "Smallmouth Bass",
				138: "Rainbow Trout",
				139: "Salmon",
				140: "Walleye",
				141: "Perch",
				142: "Carp",
				143: "Catfish",
				144: "Pike",
				145: "Sunfish",
				146: "Red Mullet",
				147: "Herring",
				148: "Eel",
				149: "Octopus",
				150: "Red Snapper",
				151: "Squid",
				154: "Sea Cucumber",
				155: "Super Cucumber",
				156: "Ghostfish",
				158: "Stonefish",
				159: "Crimsonfish",
				160: "Angler",
				161: "Ice Pip",
				162: "Lava Eel",
				163: "Legend",
				164: "Sandfish",
				165: "Scorpion Carp",
				682: "Mutant Carp",
				698: "Sturgeon",
				699: "Tiger Trout",
				700: "Bullhead",
				701: "Tilapia",
				702: "Chub",
				704: "Dorado",
				705: "Albacore",
				706: "Shad",
				707: "Lingcod",
				708: "Halibut",
				715: "Lobster",
				716: "Crayfish",
				717: "Crab",
				718: "Cockle",
				719: "Mussel",
				720: "Shrimp",
				721: "Snail",
				722: "Periwinkle",
				723: "Oyster",
				734: "Woodskip",
				775: "Glacierfish",
				795: "Void Salmon",
				796: "Slimejack"
			};
			meta.bobber = {};
		if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			meta.recipes[798] = 'Midnight Squid';
			meta.recipes[799] = 'Spook Fish';
			meta.recipes[800] = 'Blobfish';
		}
		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			meta.recipes[269] = 'Midnight Carp';
			meta.recipes[267] = 'Flounder';
		}
		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			meta.recipes[836] = 'Stingray';
			meta.recipes[837] = 'Lionfish';
			meta.recipes[838] = 'Blue Discus';
		}
		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			meta.recipes["Goby"] = 'Goby';
			meta.recipes["CaveJelly"] = 'Cave Jelly';
			meta.recipes["RiverJelly"] = 'River Jelly';
			meta.recipes["SeaJelly"] = 'Sea Jelly';
			meta.recipes[372] = 'Clam';
			// Extended Family legendaries were added in 1.5 but not tracked until 1.6 because they are only
			// necessary for bobber unlocks
			meta.bobber[898] = 'Son of Crimsonfish';
			meta.bobber[899] = 'Ms. Angler';
			meta.bobber[900] = 'Legend II';
			meta.bobber[901] = 'Radioactive Carp';
			meta.bobber[902] = 'Glacierfish Jr.';
		}
		table[0] = parsePlayerFishing($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerFishing, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}
	
	function parsePlayerFishing(player, saveInfo, meta) {
		// Much of the logic was ported from the crafting function which is why the variables are weirdly named
		var output = '',
			recipe_count = Object.keys(meta.recipes).length,
			count = 0,
			craft_count = 0, // for fish types
			bobber_count = 0,
			mod_count = 0,
			known = [],
			need = [],
			ignore = { // Things you can catch that aren't counted in fishing achieve
				308: 1, // Void Mayo can be caught in Witch's Swamp during "Goblin Problems"
				79: 1,  // Secret Notes can be caught directly
				797: 1, // Pearl can be caught directly in Night Market Submarine
				191: 1, // 1.4 Ornate necklace, from secret note quest
				103: 1, // 1.4 Ancient doll, can be caught on 4 corners once after viewing the "doving" TV easter egg
				73: 1,  // 1.5 Golden Walnuts
				842: 1, // 1.5 Journal Scraps
				821: 1, // 1.5 Fossilized Spine
				825: 1, // 1.5 Snake Skull
				890: 1, // 1.5 Qi Bean
				388: 1, // 1.5 Town Fountain Wood
				390: 1, // 1.5 Town Fountain Stone
				2332: 1, // 1.5 Gourmand Statue from Pirate Cave
				2334: 1, // 1.5 Pyramid Decal from Desert Southern Pond
				2396: 1, // 1.5 Iridium Krobus from Forest South of Sewer Entrance
				2418: 1, // 1.5 Lifesaver from Willy's Boat Dock
				2419: 1, // 1.5 Foliage Print
				2421: 1, // 1.5 'Boat' Painting
				2423: 1, // 1.5 'Vista' Painting
				2425: 1, // 1.5 Wall Basket
				2427: 1, // 1.5 Decorative Trash Can
				2732: 1, // 1.5 'Physics 101' Painting from Caldera
				2814: 1, // 1.5 Squirrel Figurine from Island North NW corner
				393: 1, // 1.5 Coral can be caught on Beach farm
				78: 1, // 1.5 Frog Hat from Gourmand's Cave
			},
			id,
			umid = (compareSemVer(saveInfo.version, "1.3") >= 0) ? $(player).children('UniqueMultiplayerID').text() : saveInfo.farmerId,
			pt_pct = '',
			r;
			
		if (compareSemVer(saveInfo.version, "1.6") < 0) {
			ignore[372] = 1; // Clams were not part of fishing collection until 1.6
			ignore[898] = 1; // 1.5 "Extended Family" Legendary -- Son of Crimsonfish
			ignore[899] = 1; // 1.5 "Extended Family" Legendary -- Ms. Angler
			ignore[900] = 1; // 1.5 "Extended Family" Legendary -- Legend II
			ignore[901] = 1; // 1.5 "Extended Family" Legendary -- Radioactive Carp
			ignore[902] = 1; // 1.5 "Extended Family" Legendary -- Glacierfish Jr.
		}

		$(player).find('fishCaught > item').each(function () {
			var raw_id = $(this).find('key > *').text(),
				num = Number($(this).find('value > ArrayOfInt > int').first().text());
			// 1.6 saves often have things like "<string>(O)145</string>" as keys so we need to account for that
			var id = raw_id;
			var paren = raw_id.indexOf(")");
			if (paren > -1) {
				id = raw_id.substring(paren + 1);
			}
			if (num > 0) {
				bobber_count++;
				if (!ignore.hasOwnProperty(id)) {
					// We are adding up the count ourselves, but the total is also stored in (stats > fishCaught) and (stats > FishCaught)
					count += num;
					if (meta.recipes.hasOwnProperty(id)) {
						craft_count++;
						known[meta.recipes[id]] = num;
					} else if (meta.bobber.hasOwnProperty(id)) {
						known[meta.bobber[id]] = num;
					} else {
						console.log("Unrecognized fish ID: " + raw_id);
						mod_count++;
					}
				}
			}
			if (ignore.hasOwnProperty(id)) {
				// DEBUGGING BETA SHIT
				console.log($(player).children('name').html() + " has caught non-fish item " + raw_id + " (" + num +")");
			}
		});

		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			saveInfo.perfectionTracker[umid]["Fishing"] = { 'count' : craft_count, 'total' : recipe_count };
			pt_pct = getPTLink(craft_count / recipe_count, true);
		}
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + $(player).children('name').html() + ' has ' + count +
			' total catches and has caught ' + craft_count + ' of ' + recipe_count + ' base game fish.' + pt_pct +
			'</span>';
		if (mod_count > 0) {
			output += '<br /><span class="result note">' + $(player).children('name').html() + " has also caught " +
				mod_count + " unrecognized (probably mod) fish.</span>";
		}
		output += '<ul class="ach_list"><li>';
		output += (count >= 100) ? getAchieveString('Mother Catch', 'catch 100 total fish', 1) :
				getAchieveString('Mother Catch', 'catch 100 total fish', 0) + (100 - count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 10) ? getAchieveString('Fisherman', 'catch 10 different fish', 1) :
				getAchieveString('Fisherman', 'catch 10 different fish', 0) + (10 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 24) ? getAchieveString('Ol\' Mariner', 'catch 24 different fish', 1) :
				getAchieveString('Ol\' Mariner', 'catch 24 different fish', 0) + (24 - craft_count) + ' more';
		output += '</li>\n<li>';
		// 1.5 has some new fish that are ignored, but the logic has not changed.
		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			output += (craft_count >= recipe_count) ? getAchieveString('Master Angler', 'catch every type of fish', 1) :
					getAchieveString('Master Angler', 'catch every type of fish', 0) + (recipe_count - craft_count) + ' more';
		} else {
			output += (craft_count >= Math.min(59, recipe_count)) ? getAchieveString('Master Angler', 'catch 59 different fish', 1) :
					getAchieveString('Master Angler', 'catch 59 different fish', 0) + (Math.min(59, recipe_count) - craft_count) + ' more';
			if (compareSemVer(saveInfo.version, "1.3") === 0) {
				output += '</li>\n<li>';
				output += (craft_count >= recipe_count) ? getMilestoneString('Catch every type of fish', 1) :
					getMilestoneString('Catch every type of fish', 0) + (recipe_count - craft_count) + ' more';				
			}
		}
		output += '</li></ul>';
		// New bobber menu stuff
		var total_bobbers = 39;
		var bobbers_unlocked = Math.min(total_bobbers, 1 + Math.floor(bobber_count/2));
		var bobber_fish_left = 2*(total_bobbers-1) - bobber_count;
		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			output += '<span class="result">' + $(player).children('name').html() + ' has unlocked ' + bobbers_unlocked +
				' of ' + total_bobbers + ' bobber styles.</span>';
			output += '<ul class="ach_list"><li>';
			output += (bobbers_unlocked >= total_bobbers) ? getMilestoneString('Unlock every bobber style', 1) :
				getMilestoneString('Unlock every bobber style', 0) + bobber_fish_left + ' more unique fish';
			output += '</li></ul>';
		}
		output += '</div>';
		if (craft_count < recipe_count) {
			need = [];
			for (id in meta.recipes) {
				if (meta.recipes.hasOwnProperty(id)) {
					r = meta.recipes[id];
					if (!known.hasOwnProperty(r)) {
						need.push('<li>' + wikify(r) + '</li>');
					}
				}
			}
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Left to catch for achievements and bobber unlocks:<ol>' + need.sort().join('') + '</ol></span></div>';
		}
		// Existing pre-1.6 saves will usually have extra fish caught that might result in them not needing any of the extended family
		// legendaries. We don't want to show the second list in that situation
		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			var achieve_left = recipe_count - craft_count;
			if ((bobbers_unlocked < total_bobbers) && (bobber_fish_left > achieve_left)) {
				need = [];
				for (id in meta.bobber) {
					if (meta.bobber.hasOwnProperty(id)) {
						r = meta.bobber[id];
						if (!known.hasOwnProperty(r)) {
							need.push('<li>' + wikify(r) + '</li>');
						}
					}
				}
				meta.hasDetails = true;
				output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
				output += '<span class="need">Left to catch for bobber unlocks (don\'t need all):<ol>' + need.sort().join('') + '</ol></span></div>';
			}
		}
		return [output];
	}

	function parseBasicShipping(xmlDoc, saveInfo) {
		/* Basic shipping achieve details are not easy to pull from decompiled source -- lots of filtering of
		 * ObjectInformation in StardewValley.Utility.hasFarmerShippedAllItems() with additional calls to
		 * StardewValley.Object.isPotentialBasicShippedCategory().
		 * For now, we will simply assume it matches the Collections page and hardcode everything there
		 * using wiki page http://stardewvalleywiki.com/Collections as a guideline. */
		var title = 'Basic Shipping',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];
			meta.recipes = {
				16: "Wild Horseradish",
				18: "Daffodil",
				20: "Leek",
				22: "Dandelion",
				24: "Parsnip",
				78: "Cave Carrot",
				88: "Coconut",
				90: "Cactus Fruit",
				92: "Sap",
				174: "Large Egg (White)",
				176: "Egg (White)",
				180: "Egg (Brown)",
				182: "Large Egg (Brown)",
				184: "Milk",
				186: "Large Milk",
				188: "Green Bean",
				190: "Cauliflower",
				192: "Potato",
				248: "Garlic",
				250: "Kale",
				252: "Rhubarb",
				254: "Melon",
				256: "Tomato",
				257: "Morel",
				258: "Blueberry",
				259: "Fiddlehead Fern",
				260: "Hot Pepper",
				262: "Wheat",
				264: "Radish",
				266: "Red Cabbage",
				268: "Starfruit",
				270: "Corn",
				272: "Eggplant",
				274: "Artichoke",
				276: "Pumpkin",
				278: "Bok Choy",
				280: "Yam",
				281: "Chanterelle",
				282: "Cranberries",
				283: "Holly",
				284: "Beet",
				296: "Salmonberry",
				300: "Amaranth",
				303: "Pale Ale",
				304: "Hops",
				305: "Void Egg",
				306: "Mayonnaise",
				307: "Duck Mayonnaise",
				308: "Void Mayonnaise",
				330: "Clay",
				334: "Copper Bar",
				335: "Iron Bar",
				336: "Gold Bar",
				337: "Iridium Bar",
				338: "Refined Quartz",
				340: "Honey",
				342: "Pickles",
				344: "Jelly",
				346: "Beer",
				348: "Wine",
				350: "Juice",
				372: "Clam",
				376: "Poppy",
				378: "Copper Ore",
				380: "Iron Ore",
				382: "Coal",
				384: "Gold Ore",
				386: "Iridium Ore",
				388: "Wood",
				390: "Stone",
				392: "Nautilus Shell",
				393: "Coral",
				394: "Rainbow Shell",
				396: "Spice Berry",
				397: "Sea Urchin",
				398: "Grape",
				399: "Spring Onion",
				400: "Strawberry",
				402: "Sweet Pea",
				404: "Common Mushroom",
				406: "Wild Plum",
				408: "Hazelnut",
				410: "Blackberry",
				412: "Winter Root",
				414: "Crystal Fruit",
				416: "Snow Yam",
				417: "Sweet Gem Berry",
				418: "Crocus",
				420: "Red Mushroom",
				421: "Sunflower",
				422: "Purple Mushroom",
				424: "Cheese",
				426: "Goat Cheese",
				428: "Cloth",
				430: "Truffle",
				432: "Truffle Oil",
				433: "Coffee Bean",
				436: "Goat Milk",
				438: "Large Goat Milk",
				440: "Wool",
				442: "Duck Egg",
				444: "Duck Feather",
				446: "Rabbit's Foot",
				454: "Ancient Fruit",
				459: "Mead",
				591: "Tulip",
				593: "Summer Spangle",
				595: "Fairy Rose",
				597: "Blue Jazz",
				613: "Apple",
				634: "Apricot",
				635: "Orange",
				636: "Peach",
				637: "Pomegranate",
				638: "Cherry",
				684: "Bug Meat",
				709: "Hardwood",
				724: "Maple Syrup",
				725: "Oak Resin",
				726: "Pine Tar",
				766: "Slime",
				767: "Bat Wing",
				768: "Solar Essence",
				769: "Void Essence",
				771: "Fiber",
				787: "Battery Pack"
			};
		
		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			meta.recipes[807] = "Dinosaur Mayonnaise";
			meta.recipes[812] = "Roe";
			meta.recipes[445] = "Caviar";
			meta.recipes[814] = "Squid Ink";
			meta.recipes[815] = "Tea Leaves";
			meta.recipes[447] = "Aged Roe";
			meta.recipes[614] = "Green Tea";
			meta.recipes[271] = "Unmilled Rice";
		}
		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			// Note: Qi Fruit (889) is specifically excluded by Object.isIndexOkForBasicShippedCategory()
			meta.recipes[91] = "Banana";
			meta.recipes[289] = "Ostrich Egg";
			meta.recipes[829] = "Ginger";
			meta.recipes[830] = "Taro Root";
			meta.recipes[832] = "Pineapple";
			meta.recipes[834] = "Mango";
			meta.recipes[848] = "Cinder Shard";
			meta.recipes[851] = "Magma Cap";
			meta.recipes[881] = "Bone Fragment";
			meta.recipes[909] = "Radioactive Ore";
			meta.recipes[910] = "Radioactive Bar";
		}
		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			meta.recipes["Moss"] = "Moss";
			meta.recipes["MysticSyrup"] = "Mystic Syrup";
			meta.recipes["Raisins"] = "Raisins";
			meta.recipes["DriedFruit"] = "Dried Fruit";
			meta.recipes["DriedMushrooms"] = "Dried Mushrooms";
			meta.recipes["Carrot"] = "Carrot";
			meta.recipes["SummerSquash"] = "Summer Squash";
			meta.recipes["Broccoli"] = "Broccoli";
			meta.recipes["Powdermelon"] = "Powdermelon";
			meta.recipes["SmokedFish"] = "Smoked Fish";
		}
		table[0] = parsePlayerBasicShipping($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerBasicShipping, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}
	
	function parsePlayerBasicShipping(player, saveInfo, meta) {
		// Much of the logic was ported from the crafting function which is why the variables are weirdly named
		var output = '',
			recipe_count = Object.keys(meta.recipes).length,
			crafted = {},
			craft_count = 0,
			need = [],
			id,
			umid = (compareSemVer(saveInfo.version, "1.3") >= 0) ? $(player).children('UniqueMultiplayerID').text() : saveInfo.farmerId,
			pt_pct = '',
			r;

		$(player).find('basicShipped > item').each(function () {
			var id = $(this).find('key > *').text(),
				num = Number($(this).find('value > int').text());
			if (meta.recipes.hasOwnProperty(id) && num > 0) {
				crafted[meta.recipes[id]] = num;
				craft_count++;
			}
		});

		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			saveInfo.perfectionTracker[umid]["Shipping"] = { 'count' : craft_count, 'total' : recipe_count };
			pt_pct = getPTLink(craft_count / recipe_count, true);
		}
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + $(player).children('name').html() + ' has shipped ' + craft_count +
				' of ' + recipe_count + ' basic items.' + pt_pct + '</span><ul class="ach_list">\n';
		output += '<li>';
		output += (craft_count >= recipe_count) ? getAchieveString('Full Shipment', 'ship every item', 1) :
				getAchieveString('Full Shipment', 'ship every item', 0) + (recipe_count - craft_count) + ' more';
		output += '</li></ul></div>';
		if (craft_count < recipe_count) {
			need = [];
			for (id in meta.recipes) {
				if (meta.recipes.hasOwnProperty(id)) {
					r = meta.recipes[id];
					if (!crafted.hasOwnProperty(r)) {
						need.push('<li>' + wikify(r) + '</li>');
					}
				}
			}
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Left to ship:<ol>' + need.sort().join('') + '</ol></span></div>';
		}
		return [output];
	}

	function parseCropShipping(xmlDoc, saveInfo) {
		// Relevant IDs were pulled from decompiled source - StardewValley.Stats.checkForShippingAchievments()
		// Note that there are 5 more "crops" for Monoculture than there are for Polyculture
		var title = 'Crop Shipping',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];

			meta.poly_crops = {
				// Some, but not all of "Basic -75" category (All veg except fiddlehead)
				24: "Parsnip",
				188: "Green Bean",
				190: "Cauliflower",
				192: "Potato",
				248: "Garlic",
				250: "Kale",
				256: "Tomato",
				262: "Wheat",
				264: "Radish",
				266: "Red Cabbage",
				270: "Corn",
				272: "Eggplant",
				274: "Artichoke",
				276: "Pumpkin",
				278: "Bok Choy",
				280: "Yam",
				284: "Beet",
				300: "Amaranth",
				304: "Hops",
				// Some, but not all of "Basic -79" category (All fruit except Ancient, tree & forageables)
				252: "Rhubarb",
				254: "Melon",
				258: "Blueberry",
				260: "Hot Pepper",
				268: "Starfruit",
				282: "Cranberries",
				398: "Grape",
				400: "Strawberry",
				// Others
				433: "Coffee Bean"
			};
			meta.mono_extras = {
				// Ancient Fruit and 4 of the "Basic -80" flowers
				454: "Ancient Fruit",
				591: "Tulip",
				593: "Summer Spangle",
				595: "Fairy Rose",
				597: "Blue Jazz"
			};
			
		table[0] = parsePlayerCropShipping($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerCropShipping, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}
	
	function parsePlayerCropShipping(player, saveInfo, meta) {
		// Much of the logic was ported from the crafting function which is why the variables are weirdly named
		var output = '',
			recipe_count = Object.keys(meta.poly_crops).length,
			crafted = {},
			craft_count = 0,
			max_ship = 0,
			max_crop = "of any crop",
			need = [],
			id,
			r,
			n,
			farmer = $(player).children('name').html();

		$(player).find('basicShipped > item').each(function () {
			var id = $(this).find('key > *').text(),
				num = Number($(this).find('value > int').text());
			if (meta.poly_crops.hasOwnProperty(id)) {
				crafted[meta.poly_crops[id]] = num;
				if (num >= 15) {
					craft_count++;
				}
				if (num > max_ship) {
					max_ship = num;
					max_crop = meta.poly_crops[id];
				}
			} else if (meta.mono_extras.hasOwnProperty(id)) {
				if (num > max_ship) {
					max_ship = num;
					max_crop = meta.mono_extras[id];
				}
			}
		});

		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += (max_ship > 0) ? '<span class="result">' + farmer + ' has shipped ' + max_crop + ' the most (' + max_ship + ').</span>' :
				'<span class="result">' + farmer + ' has not shipped any crops yet.</span>';
		output += '<ul class="ach_list"><li>\n';
		output += (max_ship >= 300) ? getAchieveString('Monoculture', 'ship 300 of one crop', 1) :
				getAchieveString('Monoculture', 'ship 300 of one crop', 0) + (300 - max_ship) + ' more ' + max_crop;
		output += '</li></ul>\n';
		output += '<span class="result">' + farmer + ' has shipped 15 items from ' + craft_count + ' of ' +
				recipe_count + ' different crops.</span><ul class="ach_list">\n<li>';
		output += (craft_count >= recipe_count) ? getAchieveString('Polyculture', 'ship 15 of each crop', 1) :
				getAchieveString('Polyculture', 'ship 15 of each crop', 0) + ' more of ' + (recipe_count - craft_count) + ' crops';
		output += '</li></ul></div>';
		if (craft_count < recipe_count) {
			need = [];
			for (id in meta.poly_crops) {
				if (meta.poly_crops.hasOwnProperty(id)) {
					r = meta.poly_crops[id];
					if (!crafted.hasOwnProperty(r)) {
						need.push('<li>' + wikify(r) + ' -- 15 more</li>');
					} else {
						n = Number(crafted[r]);
						if (n < 15) {
							need.push('<li>' + wikify(r) + ' -- ' + (15 - n) + ' more</li>');
						}
					}
				}
			}
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Left to ship:<ol>' + need.sort().join('') + '</ol></span></div>';
		}
		return [output];
	}

	function parseSkills(xmlDoc, saveInfo) {
		var title = 'Skills',
			output = '',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];
			
			meta.skills = ["Farming", "Fishing", "Foraging", "Mining", "Combat"],
			meta.next_level = [100,380,770,1300,2150,3300,4800,6900,10000,15000];
			
		table[0] = parsePlayerSkills($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerSkills, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}
	
	function parsePlayerSkills(player, saveInfo, meta) {
		var output = '',
			xp = {},
			level = 10,
			count = 0,
			umid = (compareSemVer(saveInfo.version, "1.3") >= 0) ? $(player).children('UniqueMultiplayerID').text() : saveInfo.farmerId,
			isMale = ($(player).children('isMale').text() === "true"),
			pt_pct = '',
			pt_level = 0,
			title = '',
			masteryXP = 0,
			need = [];

		for (var i = 0; i < meta.skills.length; i++) {
			var num = saveInfo.data[umid].experiencePoints[i];
			xp[meta.skills[i]] = num;
			// The current skill levels are also stored separately in 'player > fishingLevel' (and similar)
			// which we will use later, but for now we figure it out as we process the xp
			if (num < 15000) {
				for (var j = 0; j < 10; j++) {
					if (meta.next_level[j] > num) {
						level = j;
						break;
					}
				}
				need.push('<li>' + wikify(meta.skills[i]) + ' (level ' + level + ') -- need ' + 
					addCommas(meta.next_level[level] - num) + ' more xp to next level and ' + addCommas(15000 - num) + ' more xp to max</li>\n');
			} else {
				count++;
			}
		}

		// We could tally this up while we are checking the xp values, but since we need to account for Luck anyway, we might
		//  as well just directly calculate this the same way the game does.
		pt_level = Math.floor((Number($(player).find('farmingLevel').text()) + Number($(player).find('miningLevel').text()) +
					Number($(player).find('combatLevel').text()) + Number($(player).find('foragingLevel').text()) +
					Number($(player).find('fishingLevel').text()) + Number($(player).find('luckLevel').text()))/2);
		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			pt_pct = getPTLink((pt_level / .25) + "%");
			saveInfo.perfectionTracker[umid]["Skills"] = { 'count' : pt_level, 'total' : 25 };
		}
		switch (pt_level) {
			case 0:
			case 1:
			case 2:
				title = "Newcomer"; break;
			case 3:
			case 4:
				title = "Greenhorn"; break;
			case 5:
			case 6:
				title = "Bumpkin"; break;
			case 7:
			case 8:
				title = "Cowpoke"; break;
			case 9:
			case 10:
				title = "Farmhand"; break;
			case 11:
			case 12:
				title = "Tiller"; break;
			case 13:
			case 14:
				title = "Smallholder"; break;
			case 15:
			case 16:
				title = "Sodbuster"; break;
			case 17:
			case 18:
				title = "Farm" + (isMale ? "boy" : "girl"); break;
			case 19:
			case 20:
				title = "Granger"; break;
			case 21:
			case 22:
				title = "Planter"; break;
			case 23:
			case 24:
				title = "Rancher"; break;
			case 25:
			case 26:
				title = "Farmer"; break;
			case 27:
			case 28:
				title = "Agriculturist"; break;
			case 29:
				title = "Cropmaster"; break;
			default:
				title = "Farm King";
		}
				
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + saveInfo.players[umid] +
			' is <a href="https://stardewvalleywiki.com/Skills#Skill-Based_Title">Farmer Level</a> ' + pt_level + 
			' with title ' + title + '.' + pt_pct + '</span><br />';
		output += '<span class="result">' + saveInfo.players[umid] + ' has reached level 10 in ' + count + 
			' of 5 skills.</span><br />';
		output += '<ul class="ach_list"><li>';
		output += (count >= 1) ? getAchieveString('Singular Talent', 'level 10 in a skill', 1) :
				getAchieveString('Singular Talent', 'level 10 in a skill', 0) + (1 - count) + ' more';
		output += '</li>\n<li>';
		output += (count >= 5) ? getAchieveString('Master of the Five Ways', 'level 10 in every skill', 1) :
				getAchieveString('Master of the Five Ways', 'level 10 in every skill', 0) + (5 - count) + ' more';
		output += '</li></ul></div>';

		if (need.length > 0) {
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Skills left:<ol>' + need.sort().join('') + '</ol></span></div>';
		}
		return [output];
	}

	function parseSkillMastery(xmlDoc, saveInfo) {
		var title = 'Skill Mastery',
			output = '',
			anchor = makeAnchor(title),
			version = "1.6",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];
			
			meta.skills = ["Farming", "Fishing", "Foraging", "Mining", "Combat"];
			meta.nextLevel = [0, 10000, 25000, 45000, 70000, 100000];

		if (compareSemVer(saveInfo.version, version) < 0) {
			return '';
		}
		table[0] = parsePlayerSkillMastery($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerSkillMastery, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}
	
	function parsePlayerSkillMastery(player, saveInfo, meta) {
		var output = '',
			xp = {},
			i = 0,
			num,
			maxCount = 0,
			perkCount = 0,
			umid = $(player).children('UniqueMultiplayerID').text(),
			masteryXP = 0,
			masteryNextLvl,
			masteryNextXP,
			unchosen = 0,
			needPerk = [];
		
		if (saveInfo.data[umid].stats.hasOwnProperty("MasteryExp")) {
			masteryXP = saveInfo.data[umid].stats.MasteryExp;
		}
		if (masteryXP < 100000) {
			for (i = 1; i <= 5; i++) {
				if (masteryXP < meta.nextLevel[i]) {
					masteryNextLvl = i;
					break;
				}
			}
			masteryNextXP = meta.nextLevel[masteryNextLvl];
		}
		for (i = 0; i < meta.skills.length; i++) {
			var id = "mastery_" + i;
			if (saveInfo.data[umid].stats.hasOwnProperty(id)) {
				perkCount++;
			} else {
				needPerk.push('<li>' + meta.skills[i] + '</li>');
			}
			if (saveInfo.data[umid].experiencePoints[i] >= 15000) {
				maxCount++;
			}
		}
		if (masteryNextLvl > perkCount + 1) {
			unchosen = masteryNextLvl - perkCount - 1;
		}
		
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + saveInfo.players[umid] + ' has maxed ' + maxCount + ' of ' + meta.skills.length + ' skills.</span><br />';
		output += '<ul class="ach_list"><li>\n';
		output += (maxCount >= 5) ? getMilestoneString('Gain access to the Mastery Cave', 1) :
				getMilestoneString('Gain access to the Mastery Cave', 0) + (meta.skills.length - maxCount) +
				' more maxed skills -- <a href="#sec_Skills">see above for needs</a>';
		output += '</li></ul><span class="result">' + saveInfo.players[umid] + ' has ' + addCommas(masteryXP) + ' mastery xp.</span><br />';
		output += '<ul class="ach_list"><li>\n';
		output += (masteryXP >= 100000) ? getMilestoneString('Reach 100,000 mastery xp', 1) :
				getMilestoneString('Reach 100,000 mastery xp', 0) + addCommas(masteryNextXP - masteryXP) + ' more xp for next perk unlock and ' +
				addCommas(100000 - masteryXP) + ' more xp overall';
		output += '</li></ul><span class="result">' + saveInfo.players[umid] + ' has selected ' + perkCount + ' of ' + meta.skills.length + ' mastery perks.</span><br />';
		output += '<ul class="ach_list"><li>\n';
		output += (perkCount >= 5) ? getMilestoneString('Acquire all mastery perks', 1) :
				getMilestoneString('Acquire all mastery perks', 0) + (meta.skills.length - perkCount) + ' more';
		output += (perkCount < 5 && unchosen > 0) ? ' including ' + unchosen + ' available but unselected.' : '.';
		output += '</li></ul></div>';
		
		if (needPerk.length > 0) {
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Perks left:<ol>' + needPerk.sort().join('') + '</ol></span></div>';
		}
		return [output];
	}

	function parseMuseum(xmlDoc, saveInfo) {
		var title = 'Museum Collection',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [],
			museum = $(xmlDoc).find("locations > GameLocation[" + saveInfo.ns_prefix + "\\:type='LibraryMuseum']");
			
			meta.artifacts = {
				96: "Dwarf Scroll I",
				97: "Dwarf Scroll II",
				98: "Dwarf Scroll III",
				99: "Dwarf Scroll IV",
				100: "Chipped Amphora",
				101: "Arrowhead",
				103: "Ancient Doll",
				104: "Elvish Jewelry",
				105: "Chewing Stick",
				106: "Ornamental Fan",
				107: "Dinosaur Egg",
				108: "Rare Disc",
				109: "Ancient Sword",
				110: "Rusty Spoon",
				111: "Rusty Spur",
				112: "Rusty Cog",
				113: "Chicken Statue",
				114: "Ancient Seed",
				115: "Prehistoric Tool",
				116: "Dried Starfish",
				117: "Anchor",
				118: "Glass Shards",
				119: "Bone Flute",
				120: "Prehistoric Handaxe",
				121: "Dwarvish Helm",
				122: "Dwarf Gadget",
				123: "Ancient Drum",
				124: "Golden Mask",
				125: "Golden Relic",
				126: "Strange Doll (green)",
				127: "Strange Doll (yellow)",
				579: "Prehistoric Scapula",
				580: "Prehistoric Tibia",
				581: "Prehistoric Skull",
				582: "Skeletal Hand",
				583: "Prehistoric Rib",
				584: "Prehistoric Vertebra",
				585: "Skeletal Tail",
				586: "Nautilus Fossil",
				587: "Amphibian Fossil",
				588: "Palm Fossil",
				589: "Trilobite"
			};
			meta.minerals = {
				60: "Emerald",
				62: "Aquamarine",
				64: "Ruby",
				66: "Amethyst",
				68: "Topaz",
				70: "Jade",
				72: "Diamond",
				74: "Prismatic Shard",
				80: "Quartz",
				82: "Fire Quartz",
				84: "Frozen Tear",
				86: "Earth Crystal",
				538: "Alamite",
				539: "Bixite",
				540: "Baryte",
				541: "Aerinite",
				542: "Calcite",
				543: "Dolomite",
				544: "Esperite",
				545: "Fluorapatite",
				546: "Geminite",
				547: "Helvite",
				548: "Jamborite",
				549: "Jagoite",
				550: "Kyanite",
				551: "Lunarite",
				552: "Malachite",
				553: "Neptunite",
				554: "Lemon Stone",
				555: "Nekoite",
				556: "Orpiment",
				557: "Petrified Slime",
				558: "Thunder Egg",
				559: "Pyrite",
				560: "Ocean Stone",
				561: "Ghost Crystal",
				562: "Tigerseye",
				563: "Jasper",
				564: "Opal",
				565: "Fire Opal",
				566: "Celestine",
				567: "Marble",
				568: "Sandstone",
				569: "Granite",
				570: "Basalt",
				571: "Limestone",
				572: "Soapstone",
				573: "Hematite",
				574: "Mudstone",
				575: "Obsidian",
				576: "Slate",
				577: "Fairy Stone",
				578: "Star Shards"
			};
			meta.donated = {};
			
			var	artifact_count = Object.keys(meta.artifacts).length,
			mineral_count = Object.keys(meta.minerals).length,
			donated_count = 0,
			museum_count = artifact_count + mineral_count;


		$(museum).find('museumPieces > item').each(function () {
			var id = Number($(this).find('value > *').text());
			if (meta.artifacts.hasOwnProperty(id) || meta.minerals.hasOwnProperty(id)) {
				meta.donated[id] = 1;
			}
		});
		donated_count = Object.keys(meta.donated).length;

		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		var intro;
		if (saveInfo.numPlayers > 1) {
			intro = 'Inhabitants of ' + saveInfo.farmName + ' Farm have';
		} else {
			intro = saveInfo.players[saveInfo.farmerId] + ' has';
		}
		output += '<span class="result">' + intro + ' donated ' + donated_count + ' of ' +
			museum_count + ' items to the museum.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (donated_count >= 40) ? getAchieveString('Treasure Trove', 'donate 40 items', 1) :
				getAchieveString('Treasure Trove', 'donate 40 items', 0) + (40 - donated_count) + ' more';
		output += '</li>\n<li>';
		output += (donated_count >= 60) ? getMilestoneString('Donate enough items (60) to get the Rusty Key', 1) :
				getMilestoneString('Donate enough items (60) to get the Rusty Key', 0) + (60 - donated_count) + ' more';
		output += '</li>\n<li>';
		output += (donated_count >= museum_count) ? getAchieveString('A Complete Collection', 'donate every item', 1) :
				getAchieveString('A Complete Collection', 'donate every item', 0) + (museum_count - donated_count) + ' more';
		output += '</li></ul></div>';
		if (donated_count < museum_count) {
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">See below for items left to donate</span><br /><br /></div>';
		}
		
		table[0] = parsePlayerMuseum($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerMuseum, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + output + playerOutput + getSectionFooter();
		return output;
	}

	function parsePlayerMuseum(player, saveInfo, meta) {
		var output = '',
			donated_count = Object.keys(meta.donated).length,
			artifact_count = Object.keys(meta.artifacts).length,
			mineral_count = Object.keys(meta.minerals).length,
			museum_count = artifact_count + mineral_count,
			found = {},
			found_art = 0,
			found_min = 0,
			need_art = [],
			need_min = [],
			need = [],
			id,
			r,
			farmer = $(player).children('name').html();
	
		$(player).find('archaeologyFound > item').each(function () {
			var id = $(this).find('key > *').text(),
				num = Number($(this).find('value > ArrayOfInt > int').first().text());
			if (meta.artifacts.hasOwnProperty(id) && num > 0) {
				found[id] = num;
				found_art++;
			}
		});
		$(player).find('mineralsFound > item').each(function () {
			var id = $(this).find('key > *').text(),
				num = Number($(this).find('value > int').text());
			if (meta.minerals.hasOwnProperty(id) && num > 0) {
				found[id] = num;
				found_min++;
			}
		});

		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + ' has found ' + found_art + ' of ' + artifact_count + ' artifacts.</span><br />\n';
		output += '<span class="result">' + farmer + ' has found ' + found_min + ' of ' + mineral_count +
			' minerals.</span><ul class="ach_list">\n';
		output += '<li>';
		output += '</li>\n<li>';
		output += (found_art >= artifact_count) ? getMilestoneString('All artifacts found', 1) :
				getMilestoneString('All artifacts found', 0) + (artifact_count - found_art) + ' more';
		output += '</li>\n<li>';
		output += (found_min >= mineral_count) ? getMilestoneString('All minerals found', 1) :
				getMilestoneString('All minerals found', 0) + (mineral_count - found_min) + ' more';
		output += '</li></ul></div>';

		if (donated_count < museum_count || (found_art + found_min) < museum_count) {
			for (id in meta.artifacts) {
				if (meta.artifacts.hasOwnProperty(id)) {
					r = meta.artifacts[id];
					need = [];
					if (!found.hasOwnProperty(id)) {
						need.push('found');
					}
					if (!meta.donated.hasOwnProperty(id)) {
						need.push('donated');
					}
					if (need.length > 0) {
						need_art.push('<li>' + wikify(r) + ' -- not ' + need.join(" or ") + '</li>');
					}
				}
			}
			for (id in meta.minerals) {
				if (meta.minerals.hasOwnProperty(id)) {
					r = meta.minerals[id];
					need = [];
					if (!found.hasOwnProperty(id)) {
						need.push('found');
					}
					if (!meta.donated.hasOwnProperty(id)) {
						need.push('donated');
					}
					if (need.length > 0) {
						need_min.push('<li>' + wikify(r) + ' -- not ' + need.join(" or ") + '</li>');
					}
				}
			}
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Items left:<ul>';
			if (need_art.length > 0) {
				output += '<li>Artifacts<ol>' + need_art.sort().join('') + '</ol></li>\n';
			}
			if (need_min.length > 0) {
				output += '<li>Minerals<ol>' + need_min.sort().join('') + '</ol></li>\n';
			}
			output += '</ul></span></div>';
		}
		
		return [output];
	}

	function parseMonsters(xmlDoc, saveInfo) {
		/* Conditions & details from decompiled source StardewValley.Locations.AdventureGuild.gil()
		 * The game counts some monsters which are not currently available; we will count them too
		 * just in case they are in someone's save file, but not list them in the details. */
		var title = 'Monster Hunting',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];
			meta.goals = {
				"Slimes": 1000,
				"Void Spirits": 150,
				"Bats": 200,
				"Skeletons": 50,
				"Cave Insects": 125,
				"Duggies": 30,
				"Dust Sprites": 500,
			};
			meta.categories = {
				"Green Slime": "Slimes",
				"Frost Jelly": "Slimes",
				"Sludge": "Slimes",
				"Shadow Brute": "Void Spirits",
				"Shadow Shaman": "Void Spirits",
				"Shadow Guy": "Void Spirits", // not in released game
				"Shadow Girl": "Void Spirits", // not in released game
				"Bat": "Bats",
				"Frost Bat": "Bats",
				"Lava Bat": "Bats",
				"Skeleton": "Skeletons",
				"Skeleton Mage": "Skeletons", // not in released game
				"Bug": "Cave Insects",
				"Fly": "Cave Insects", // wiki calls this "Cave Fly"
				"Grub": "Cave Insects",
				"Duggy": "Duggies",
				"Dust Spirit": "Dust Sprites"
			};
			meta.monsters = {
				"Slimes": ["Green Slime", "Frost Jelly", "Sludge"],
				"Void Spirits": ["Shadow Brute", "Shadow Shaman"],
				"Bats": ["Bat", "Frost Bat", "Lava Bat"],
				"Skeletons": ["Skeleton"],
				"Cave Insects": ["Bug", "Cave Fly", "Grub"],
				"Duggies": ["Duggy"],
				"Dust Sprites": ["Dust Spirit"]
			};
		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			meta.goals["Rock Crabs"] = 60;
			meta.goals["Mummies"] = 100;
			meta.goals["Pepper Rex"] = 50;
			meta.goals["Serpents"] = 250;
			meta.categories["Rock Crab"] = "Rock Crabs";
			meta.categories["Lava Crab"] = "Rock Crabs";
			meta.categories["Iridium Crab"] = "Rock Crabs";
			meta.categories["Mummy"] = "Mummies";
			meta.categories["Pepper Rex"] = "Pepper Rex";
			meta.categories["Serpent"] = "Serpents";
			meta.monsters["Rock Crabs"] = ["Rock Crab", "Lava Crab", "Iridium Crab"];
			meta.monsters["Mummies"] = ["Mummy"];
			meta.monsters["Pepper Rex"] = ["Pepper Rex"];
			meta.monsters["Serpents"] = ["Serpent"];
		}
		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			meta.goals["Flame Spirits"] = 150;
			meta.categories["Magma Sprite"] = "Flame Spirits";
			meta.categories["Magma Sparker"] = "Flame Spirits";
			meta.monsters["Flame Spirits"] = ["Magma Sprite", "Magma Sparker"];
			meta.categories["Tiger Slime"] = "Slimes";
			meta.monsters["Slimes"].push("Tiger Slime");
			meta.categories["Shadow Sniper"] = "Void Spirits";
			meta.monsters["Void Spirits"].push("Shadow Sniper");
			// These are included now
			meta.categories["Magma Duggy"] = "Duggies";
			meta.monsters["Duggies"].push("Magma Duggy");
			meta.categories["Iridium Bat"] = "Bats";
			meta.monsters["Bats"].push("Iridum Bat");
			meta.categories["Royal Serpent"] = "Serpents";
			meta.monsters["Serpents"].push("Royal Serpent");
			// These exist now in hard mode so need to be included in output
			meta.monsters["Skeletons"].push("Skeleton Mage");
		}
		table[0] = parsePlayerMonsters($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerMonsters, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}

	function parsePlayerMonsters(player, saveInfo, meta) {
		var output = '',
			table = [],
			goal_count = Object.keys(meta.goals).length,
			killed = [],
			completed = 0,
			need = [],
			id,
			umid = (compareSemVer(saveInfo.version, "1.3") >= 0) ? $(player).children('UniqueMultiplayerID').text() : saveInfo.farmerId,
			pt_pct = '',
			stats,
			mineLevel = Number($(player).children('deepestMineLevel').text()),
			hasSkullKey = $(player).children('hasSkullKey').text(),
			farmer = $(player).children('name').html();
			
		// Have seen some inconsitencies in multiplayer, so will use presence of skull key to override the level & bump it to 120.
		if (hasSkullKey === 'true') {
			mineLevel = Math.max(120, mineLevel);
		}
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		if (mineLevel <= 0) {
			output += '<span class="result">' + farmer + ' has not yet explored the mines.</span><br />\n';
		} else {
			output += '<span class="result">' + farmer + ' has reached level ' + Math.min(mineLevel, 120) +
				' of the mines.</span><br />\n';
			output += '<span class="result">' + farmer + ((mineLevel > 120) ?
				(' has reached level ' + (mineLevel - 120) + ' of the Skull Cavern') :
				' has not yet explored the Skull Cavern');
			output += '.</span></div>';
		}
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<ul class="ach_list"><li>\n';
		output += (mineLevel >= 120) ? getAchieveString('The Bottom', 'reach mine level 120', 1) :
				getAchieveString('The Bottom', 'reach mine level 120', 0) + (120 - mineLevel) + ' more';
		output += '</li></ul></div>';

		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			var totalMonstersKilled = saveInfo.data[umid].stats.hasOwnProperty("monstersKilled") ? Number(saveInfo.data[umid].stats["monstersKilled"]) : 0;
			output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
			output += '<span class="result">' + farmer + ' has killed ' + addCommas(totalMonstersKilled) +
				' monsters</span><br />\n';
			output += '<ul class="ach_list"><li>\n';
			output += (totalMonstersKilled >= 1000) ? getMilestoneString('Gain access to the Adventure Guild back room', 1) :
					getMilestoneString('Gain access to the Adventure Guild back room', 0) + ' to kill ' + (1000 - totalMonstersKilled) +
					' more monsters';
			output += '</li></ul></div>';
		}
		
		if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			stats = $(player).find('stats > specificMonstersKilled');
		} else {
			// In 1.2, stats are under the root SaveGame so we must go back up the tree
			stats = $(player).parent().find('stats > specificMonstersKilled');
		}

		$(stats).children('item').each(function () {
			var id = $(this).find('key > string').text(),
				num = Number($(this).find('value > int').text()),
				old = 0;
			if (meta.categories.hasOwnProperty(id) && num > 0) {
				if (killed.hasOwnProperty(meta.categories[id])) {
					old = killed[meta.categories[id]];
				}
				killed[meta.categories[id]] = (old + num);
			}
		});
		for (id in meta.goals) {
			if (meta.goals.hasOwnProperty(id)) {
				if (killed.hasOwnProperty(id)) {
					if (killed[id] >= meta.goals[id]) {
						completed++;
					} else {
						need.push('<li>' + id + ' -- kill ' + (meta.goals[id] - killed[id]) + ' more of: ' +
							meta.monsters[id].map(wikimap).join(', ') + '</li>');
					}
				} else {
					need.push('<li>' + id + ' -- kill ' + meta.goals[id] + ' more of: ' +
						meta.monsters[id].map(wikimap).join(', ') + '</li>');
				}
			}
		}

		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			saveInfo.perfectionTracker[umid]["Monsters"] = (completed >= goal_count);
			pt_pct = getPTLink((completed >= goal_count) ? "Yes" : "No");
		}
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + ' has completed ' + completed + ' of the ' + goal_count +
				' Monster Eradication goals.' + pt_pct + '</span><ul class="ach_list">\n';
		output += '<li>';
		output += (completed >= goal_count) ? getAchieveString('Protector of the Valley', 'all monster goals', 1) :
				getAchieveString('Protector of the Valley', 'all monster goals', 0) + (goal_count - completed) + ' more';
		output += '</li></ul></div>';
		if (need.length > 0) {
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Goals left:<ol>' + need.sort().join('') + '</ol></span></div>';
		}
		table.push(output);
		return table;
	}

	function parseQuests(xmlDoc, saveInfo) {
		var title = 'Quests',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];
			
		table[0] = parsePlayerQuests($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerQuests, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}

	function parsePlayerQuests(player, saveInfo, meta) {
		var output = '',
			count;

		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			count = Number($(player).find('stats > Values > item:contains("questsCompleted") > value > *').text());
		} else if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			count = Number($(player).find('stats > questsCompleted').text());
		} else {
			// In 1.2, stats are under the root SaveGame so we must go back up the tree
			count = Number($(player).parent().find('stats > questsCompleted').text());
		}

		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + $(player).children('name').html() + ' has completed ' + count + ' "Help Wanted" quest(s).</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (count >= 10) ? getAchieveString('Gofer', 'complete 10 quests', 1) :
				getAchieveString('Gofer', 'complete 10 quests', 0) + (10 - count) + ' more';
		output += '</li>\n<li>';
		output += (count >= 40) ? getAchieveString('A Big Help', 'complete 40 quests', 1) :
				getAchieveString('A Big Help', 'complete 40 quests', 0) + (40 - count) + ' more';
		output += '</li></ul></div>';
		return [output];
	}

	function parseStardrops(xmlDoc, saveInfo) {
		/* mailReceived identifiers from decompiled source of StardewValley.Utility.foundAllStardrops()
		 * descriptions are not from anywhere else and are just made up. */
		var title = 'Stardrops',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];
			meta.stardrops = {
				'CF_Fair': 'Purchased at the Fair for 2000 star tokens.',
				'CF_Mines': 'Found in the chest on mine level 100.',
				'CF_Spouse': 'Given by NPC spouse at 13.5 hearts (3375 points).',
				'CF_Sewer': 'Purchased from Krobus in the Sewers for 20,000g.',
				'CF_Statue': 'Received from Old Master Cannoli in the Secret Woods.',
				'CF_Fish': 'Mailed by Willy after Master Angler achievement.',
				'museumComplete': 'Reward for completing the Museum collection.'
			};
			
		table[0] = parsePlayerStardrops($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerStardrops, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}

	function parsePlayerStardrops(player, saveInfo, meta) {
		var output = '',
			count = 0,
			id,
			umid = (compareSemVer(saveInfo.version, "1.3") >= 0) ? $(player).children('UniqueMultiplayerID').text() : saveInfo.farmerId,
			pt_pct = '',
			need = [],
			stardrop_count = Object.keys(meta.stardrops).length;

		for (id in meta.stardrops) {
			if (meta.stardrops.hasOwnProperty(id)) {
				if (saveInfo.data[umid].mailReceived.hasOwnProperty(id)) {
					count++;
				} else {
					need.push('<li>' + meta.stardrops[id] + '</li>');
				}
			}
		}

		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			saveInfo.perfectionTracker[umid]["Stardrops"] = (count >= stardrop_count);
			pt_pct = getPTLink((count >= stardrop_count) ? "Yes" : "No");
		}
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + saveInfo.players[umid] + ' has received ' + count +
				' of ' + stardrop_count + ' stardrops.' + pt_pct + '</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (count >= stardrop_count) ? getAchieveString('Mystery Of The Stardrops', 'find every stardrop', 1) :
				getAchieveString('Mystery Of The Stardrops', 'find every stardrop', 0) + (stardrop_count - count) + ' more';
		output += '</li></ul></div>';
		if (need.length > 0) {
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Stardrops left:<ol>' + need.sort().join('') + '</ol></span></div>';
		}
		return [output];
	}

	function parseGrandpa(xmlDoc, saveInfo) {
		// Scoring details from StardewValley.Utility.getGradpaScore() & getGrandpaCandlesFromScore()
		var title = 'Grandpa\'s Evaluation',
			anchor = makeAnchor(title),
			version = "1.2",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			farmer = $(xmlDoc).find('player > name').html(),
			count = 0,
			max_count = 21,
			candles = 1,
			max_candles = 4,
			currentCandles = Number($(xmlDoc).find("locations > GameLocation[" + saveInfo.ns_prefix + "\\:type='Farm'] > grandpaScore").text()),
			need = '',
			money = Number($(xmlDoc).find('player > totalMoneyEarned').text()),
			achieves = {
				5: 'A Complete Collection',
				26: 'Master Angler',
				34: 'Full Shipment'
			},
			ach_count = 3,
			ach_have = {},
			cc_done = 0,
			ccRooms = {
				'ccBoilerRoom': "Boiler Room",
				'ccCraftsRoom': "Crafts Room",
				'ccPantry': "Pantry",
				'ccFishTank': "Fish Tank",
				'ccVault': "Vault",
				'ccBulletin': "Bulletin Board"
			},
			cc_have = 0,
			cc_count = 6,
			isJojaMember = 0,
			spouse = $(xmlDoc).find('player > spouse'), // will trigger during 3 day engagement too
			houseUpgrades = Number($(xmlDoc).find('player > houseUpgradeLevel').text()),
			hasRustyKey = 'false',
			hasSkullKey = 'false',
			hasKeys = [],
			heart_count = 0,
			hasPet = 0,
			petLove = 0,
			realPlayerLevel = (Number($(xmlDoc).find('player > farmingLevel').text()) +
								Number($(xmlDoc).find('player > miningLevel').text()) +
								Number($(xmlDoc).find('player > combatLevel').text()) +
								Number($(xmlDoc).find('player > foragingLevel').text()) +
								Number($(xmlDoc).find('player > fishingLevel').text()) +
								Number($(xmlDoc).find('player > luckLevel').text())),
			playerLevel = realPlayerLevel / 2;
			
		// 1.6 removed the old stats for rusty and skull keys and instead has some mail flags
		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			if (saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty("HasRustyKey")) {
				hasRustyKey = 'true';
			}
			if (saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty("HasSkullKey")) {
				hasSkullKey = 'true';
			}
		} else {
			hasRustyKey = $(xmlDoc).find('player > hasRustyKey').text();
			hasSkullKey = $(xmlDoc).find('player > hasSkullKey').text();
		}			

		// Pre-calculating totals to put summary info up top.
		if (money >= 1e6) {
			count += 7;
		} else if (money >= 5e5) {
			count += 5;
		} else if (money >= 3e5) {
			count += 4;
		} else if (money >= 2e5) {
			count += 3;
		} else if (money >= 1e5) {
			count += 2;
		} else if (money >= 5e4) {
			count += 1;
		}
		$(xmlDoc).find('player > achievements > int').each(function () {
			var id = $(this).text();
			if (achieves.hasOwnProperty(id)) {
				count++;
				ach_have[id] = 1;
			}
		});
		if (saveInfo.data[saveInfo.farmerId].eventsSeen.hasOwnProperty("191393")) {
			cc_done = 1;
		}
		if (cc_done) {
			count += 3;
		} else {
			if (saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty("JojaMember")) {
				isJojaMember = 1;
			}
			for (var id in ccRooms) {
				if (ccRooms.hasOwnProperty(id) && saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty(id)) {
					cc_have++;
				}
			}
			if (cc_have >= cc_count) {
				count++;
			}
		}
		if (hasRustyKey === 'true') {
			count++;
			hasKeys.push('Rusty Key');
		}
		if (hasSkullKey === 'true') {
			count++;
			hasKeys.push('Skull Key');
		}
		if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			var	uid = $(xmlDoc).find('player').children('UniqueMultiplayerID').text();
			if (saveInfo.partners.hasOwnProperty(uid)) {
				spouse = saveInfo.players[saveInfo.partners[uid]];
			}
		}			
		if (spouse.length > 0 && houseUpgrades >= 2) {
			count++;
		}
		if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			$(xmlDoc).find('player> friendshipData > item').each(function () {
				var num = Number($(this).find('value > Friendship > Points').text());
				if (num >= 1975) { heart_count++; }
			});
		} else {
			$(xmlDoc).find('player> friendships > item').each(function () {
				var num = Number($(this).find('value > ArrayOfInt > int').first().text());
				if (num >= 1975) { heart_count++; }
			});
		}
		if (heart_count >= 10) {
			count += 2;
		} else if (heart_count >= 5) {
			count += 1;
		}
		if (playerLevel >= 25) {
			count += 2;
		} else if (playerLevel >= 15) {
			count += 1;
		}
		$(xmlDoc).find('locations > GameLocation > Characters > NPC').each(function () {
			if ($(this).attr(saveInfo.ns_prefix + ':type') === 'Pet' || $(this).attr(saveInfo.ns_prefix + ':type') === 'Cat' || $(this).attr(saveInfo.ns_prefix + ':type') === 'Dog') {
				hasPet = 1;
				var thisPetLove = Number($(this).find('friendshipTowardFarmer').text());
				if (thisPetLove > petLove) {
					petLove = thisPetLove;
				}
			}
		});
		// Handling the case of a previously maxed but now butterflied pet.
		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			if (saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty("petLoveMessage")) {
				petLove = 1000;
			}			
		}
		if (petLove >= 999) {
			count++;
		}
		if (count >= 12) {
			candles = 4;
		} else if (count >= 8) {
			candles = 3;
		} else if (count >= 4) {
			candles = 2;
		}
		output = getSectionHeader(saveInfo, title, anchor, true, version);
		output += '<div class="' + anchor + '_summary ' + sum_class + '">';
		output += '<span class="result">' + farmer + ' has earned a total of ' + count +
				' point(s) (details below); the maximum possible is ' + max_count + ' points.</span><br />\n';
		output += '<span class="result">The shrine has ' + currentCandles + ' candle(s) lit. The next evaluation will light ' +
				candles + ' candle(s).</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (candles >= max_candles) ? getMilestoneString('Four candle evaluation', 1) :
				getMilestoneString('Four candle evaluation', 0) + (12 - count) + ' more point(s)';
		output += '</li></ul></span>';

		output += '<div class="' + anchor + '_details ' + det_class + '">';
		output += '<span class="result">' + farmer + ' has earned a total of ' + addCommas(money) + 'g.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (money >= 5e4) ? getPointString(1, 'at least 50,000g earnings', 0, 1) :
				getPointString(1, 'at least 50,000g earnings', 0, 0) + ' -- need ' + addCommas(5e4 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 1e5) ? getPointString(1, 'at least 100,000g earnings', 1, 1) :
				getPointString(1, 'at least 100,000g earnings', 1, 0) + ' -- need ' + addCommas(1e5 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 2e5) ? getPointString(1, 'at least 200,000g earnings', 1, 1) :
				getPointString(1, 'at least 200,000g earnings', 1, 0) + ' -- need ' + addCommas(2e5 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 3e5) ? getPointString(1, 'at least 300,000g earnings', 1, 1) :
				getPointString(1, 'at least 300,000g earnings', 1, 0) + ' -- need ' + addCommas(3e5 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 5e5) ? getPointString(1, 'at least 500,000g earnings', 1, 1) :
				getPointString(1, 'at least 500,000g earnings', 1, 0) + ' -- need ' + addCommas(5e5 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 1e6) ? getPointString(2, 'at least 1,000,000g earnings', 1, 1) :
				getPointString(2, 'at least 1,000,000g earnings', 1, 0) + ' -- need ' + addCommas(1e6 - money) + 'g more';
		output += '</li></ul>\n';

		output += '<span class="result">' + farmer + ' has earned ' + Object.keys(ach_have).length +
				' of the ' + ach_count + ' relevant achievements.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (ach_have.hasOwnProperty(5)) ? getPointString(1, '<span class="ach">A Complete Collection</span> Achievement', 0, 1) :
				getPointString(1, '<span class="ach">A Complete Collection</span> Achievement', 0, 0);
		output += '</li>\n<li>';
		output += (ach_have.hasOwnProperty(26)) ? getPointString(1, '<span class="ach">Master Angler</span> Achievement', 0, 1) :
				getPointString(1, '<span class="ach">Master Angler</span> Achievement', 0, 0);
		output += '</li>\n<li>';
		output += (ach_have.hasOwnProperty(34)) ? getPointString(1, '<span class="ach">Full Shipment</span> Achievement', 0, 1) :
				getPointString(1, '<span class="ach">Full Shipment</span> Achievement', 0, 0);
		output += '</li></ul>\n';

		if (isJojaMember) {
			output += '<span class="result">' + farmer + ' has purchased a Joja membership and cannot restore the Community Center';
			output += '<ul class="ach_list"><li>';
			output += getPointImpossibleString(1, 'complete Community Center');
			output += '</li>\n<li>';
			output += getPointImpossibleString(2, 'attend the Community Center re-opening');
			output += '</li></ul>\n';
		} else {
			if (cc_done || cc_have >= cc_count) {
				output += '<span class="result">' + farmer + ' has completed the Community Center restoration';
				output += (cc_done) ? ' and attended the re-opening ceremony.' : ' but has not yet attended the re-opening ceremony.';
				output += '</span><br />\n';
			} else {
				output += '<span class="result">' + farmer + ' has not completed the Community Center restoration.';
			}
			output += '<ul class="ach_list"><li>';
			output += (cc_done || cc_have >= cc_count) ? getPointString(1, 'complete Community Center', 0, 1) :
					getPointString(1, 'complete Community Center', 0, 0);
			output += '</li>\n<li>';
			output += (cc_done) ? getPointString(2, 'attend the Community Center re-opening', 0, 1) :
					getPointString(2, 'attend the Community Center re-opening', 0, 0);
			output += '</li></ul>\n';
		}

		output += '<span class="result">' + farmer + ' has ' + realPlayerLevel + ' total skill levels.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (playerLevel >= 15) ? getPointString(1, '30 total skill levels', 0, 1) :
				getPointString(1, '30 total skill levels', 0, 0) + ' -- need ' + (30 - realPlayerLevel) + ' more';
		output += '</li>\n<li>';
		output += (playerLevel >= 25) ? getPointString(1, '50 total skill levels', 1, 1) :
				getPointString(1, '50 total skill levels', 1, 0) + ' -- need ' + (50 - realPlayerLevel) + ' more';
		output += '</li></ul>\n';

		output += '<span class="result">' + farmer + ' has ' + heart_count +
				' relationship(s) of 1975+ friendship points (~8 hearts.)</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (heart_count >= 5) ? getPointString(1, '~8&#x2665; with 5 people', 0, 1) :
				getPointString(1, '~8&#x2665; with 5 people', 0, 0) + ' -- need ' + (5 - heart_count) + ' more';
		output += '</li>\n<li>';
		output += (heart_count >= 10) ? getPointString(1, '~8&#x2665; with 10 people', 1, 1) :
				getPointString(1, '~8&#x2665; with 10 people', 1, 0) + ' -- need ' + (10 - heart_count) + ' more';
		output += '</li></ul>\n';

		// This doesn't correctly summarize a situation of a butterflied 1000 pt pet and a current pet with fewer points
		if (hasPet) {
			output += '<span class="result">' + farmer + ' has a pet with ' + petLove + ' friendship points.</span><br/>';
			need = (999 - petLove) + ' more friendship points';
		} else {
			if (petLove > 0) {
				output += '<span class="result">' + farmer + ' previously had a pet with ' + petLove + ' friendship points.</span><br/>'
			} else {
				output += '<span class="result">' + farmer + ' has not had a pet with any friendship points.</span><br/>';
			}
			need = "a pet and 999 friendship points";
		}
		output += '<ul class="ach_list"><li>';
		output += (petLove >= 999) ? getPointString(1, 'pet with at least 999 friendship points', 0, 1) :
				getPointString(1, 'pet with at least 999 friendship points', 0, 0) + ' -- need ' + need;
		output += '</li></ul>\n';

		output += '<span class="result">' + farmer + ((spouse.length > 0) ? ' is' : ' is not') +
				' married and has upgraded the farmhouse ' + houseUpgrades + ' time(s).</span><br />\n';
		output += '<ul class="ach_list"><li>';
		need = [];
		if (spouse.length === 0) {
			need.push('a spouse');
		}
		if (houseUpgrades < 2) {
			need.push((2 - houseUpgrades) + ' more upgrade(s)');
		}
		output += (need.length === 0) ? getPointString(1, 'married with at least 2 house upgrades', 0, 1) :
				getPointString(1, 'married with at least 2 house upgrades', 0, 0) + ' -- need ' + need.join(" and ");
		output += '</li></ul>\n';

		if (hasKeys.length > 0) {
			output += '<span class="result">' + farmer + ' has acquired the ' + hasKeys.join(" and ") + '.</span><br />\n';
		} else {
			output += '<span class="result">' + farmer + ' has not acquired either the Rusty Key or Skull Key.</span><br />\n';
		}
		output += '<ul class="ach_list"><li>';
		output += (hasRustyKey === 'true') ? getPointString(1, 'has the Rusty Key', 0, 1) :
				getPointString(1, 'get the Rusty Key', 0, 0) + ' -- acquired after 60 museum donations';
		output += '</li>\n<li>';
		output += (hasSkullKey === 'true') ? getPointString(1, 'has the Skull Key', 0, 1) :
				getPointString(1, 'get the Skull Key', 0, 0) + ' -- acquired on level 120 of the mines';
		output += '</li></ul></div>';
		output += getSectionFooter();
		
		return output;
	}

	function parseBundleData(xmlDoc, saveInfo, input, output, meta) {
		meta.roomID = {
			'Pantry': 0,
			'Crafts Room': 1,
			'Fish Tank': 2,
			'Boiler Room': 3,
			'Vault': 4,
			'Bulletin Board': 5,
			'Abandoned Joja Mart': 6
		};
		meta.quality = {
			1: "Silver",
			2: "Gold",
			4: "Iridium",
		};
		meta.bundleRoom = {};
		for (var k in input) {
			if (input.hasOwnProperty(k)) {
				var kFields = k.split('/');
				var room = kFields[0];
				var id = kFields[1];
				var vFields = input[k].split('/');
				var bundleName = vFields[0];
				var itemData = vFields[2].split(' ');
				var qty = vFields[4];
				
				if (!output.hasOwnProperty(meta.roomID[room])) {
					output[meta.roomID[room]] = { 'name': room, 'bundles': {} };
				}
				output[meta.roomID[room]].bundles[id] = { 'name': bundleName, 'qty': qty, 'items': [] };
				meta.bundleRoom[id] = meta.roomID[room];
				for(var i = 0; i < itemData.length; i += 3) {
					var itemName = (saveInfo.objects.hasOwnProperty(itemData[i])) ? saveInfo.objects[itemData[i]] : "Object ID " + itemData[i];
					var n = (Number(itemData[i+1]) > 1) ? itemData[i+1] + "x " : "";
					var q = (meta.quality.hasOwnProperty(itemData[i+2])) ? meta.quality[itemData[i+2]] + " " : "";
					if (itemData[i] === "-1") {
						output[meta.roomID[room]].bundles[id].items.push(addCommas(itemData[i+1]) + "g");
					} else {
						output[meta.roomID[room]].bundles[id].items.push(n + q + wikify(itemName));
					}
				}
				if (qty === '') {
					output[meta.roomID[room]].bundles[id].qty = output[meta.roomID[room]].bundles[id].items.length;
				}
			}
		}
	}

	function parseBundles(xmlDoc, saveInfo) {
		// This was substantially rewritten for Stardew 1.5 since that version's Random Bundles option caused
		//  the full bundle information to be placed in the save. Since we are going to at least have to partly
		//  parse the bundle definitions now, we might as well hardcode the default bundles and handle older
		//  versions that way.
		var title = 'Community Center / Joja Community Development',
			anchor = makeAnchor(title),
			version = "1.5",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			meta = {},
			farmer = $(xmlDoc).find('player > name').html(),
			hasDetails = false,
			isJojaMember = 0,
			room = {},
			bundleHave = {},
			ccMail = {
				'ccBoilerRoom': 3,
				'ccCraftsRoom': 1,
				'ccPantry': 0,
				'ccFishTank': 2,
				'ccVault': 4,
				'ccBulletin': 5
			},
			ccCount = 6,
			ccHave = 0,
			ccEvent = '191393',
			project = ['Greenhouse', 'Bridge', 'Panning', 'Minecarts', 'Bus'],
			price = ['35,000g', '25,000g', '20,000g', '15,000g', '40,000g'],
			jojaMail = {
				'jojaBoilerRoom': 3,
				'jojaCraftsRoom': 1,
				'jojaPantry': 0,
				'jojaFishTank': 2,
				'jojaVault': 4
			},
			jojaCount = 5,
			jojaHave = 0,
			jojaEvent = '502261',
			eventToCheck = '',
			hasSeenCeremony = 0,
			done = {},
			hybrid = 0,
			hybridLeft = 0,
			id,
			r,
			b,
			i,
			itemsHave = {},
			temp,
			bundleNeed = [],
			need = [],
			ccLoc = $(xmlDoc).find("locations > GameLocation[" + saveInfo.ns_prefix + "\\:type='CommunityCenter']"),
			bundleData = {},
			rawData = {},
			defaultData = {
				"Pantry/0": "Spring Crops/O 465 20/24 1 0 188 1 0 190 1 0 192 1 0/0///Spring Crops",
				"Pantry/1": "Summer Crops/O 621 1/256 1 0 260 1 0 258 1 0 254 1 0/3///Summer Crops",
				"Pantry/2": "Fall Crops/BO 10 1/270 1 0 272 1 0 276 1 0 280 1 0/2///Fall Crops",
				"Pantry/3": "Quality Crops/BO 15 1/24 5 2 254 5 2 276 5 2 270 5 2/6/3//Quality Crops",
				"Pantry/4": "Animal/BO 16 1/186 1 0 182 1 0 174 1 0 438 1 0 440 1 0 442 1 0/4/5//Animal",
				"Pantry/5": "Artisan/BO 12 1/432 1 0 428 1 0 426 1 0 424 1 0 340 1 0 344 1 0 613 1 0 634 1 0 635 1 0 636 1 0 637 1 0 638 1 0/1/6//Artisan",
				"Crafts Room/13": "Spring Foraging/O 495 30/16 1 0 18 1 0 20 1 0 22 1 0/0///Spring Foraging",
				"Crafts Room/14": "Summer Foraging/O 496 30/396 1 0 398 1 0 402 1 0/3///Summer Foraging",
				"Crafts Room/15": "Fall Foraging/O 497 30/404 1 0 406 1 0 408 1 0 410 1 0/2///Fall Foraging",
				"Crafts Room/16": "Winter Foraging/O 498 30/412 1 0 414 1 0 416 1 0 418 1 0/6///Winter Foraging",
				"Crafts Room/17": "Construction/BO 114 1/388 99 0 388 99 0 390 99 0 709 10 0/4///Construction",
				"Crafts Room/19": "Exotic Foraging/O 235 5/88 1 0 90 1 0 78 1 0 420 1 0 422 1 0 724 1 0 725 1 0 726 1 0 257 1 0/1/5//Exotic Foraging",
				"Fish Tank/6": "River Fish/O 685 30/145 1 0 143 1 0 706 1 0 699 1 0/6///River Fish",
				"Fish Tank/7": "Lake Fish/O 687 1/136 1 0 142 1 0 700 1 0 698 1 0/0///Lake Fish",
				"Fish Tank/8": "Ocean Fish/O 690 5/131 1 0 130 1 0 150 1 0 701 1 0/5///Ocean Fish",
				"Fish Tank/9": "Night Fishing/R 516 1/140 1 0 132 1 0 148 1 0/1///Night Fishing",
				"Fish Tank/10": "Specialty Fish/O 242 5/128 1 0 156 1 0 164 1 0 734 1 0/4///Specialty Fish",
				"Fish Tank/11": "Crab Pot/O 710 3/715 1 0 716 1 0 717 1 0 718 1 0 719 1 0 720 1 0 721 1 0 722 1 0 723 1 0 372 1 0/1/5//Crab Pot",
				"Boiler Room/20": "Blacksmith's/BO 13 1/334 1 0 335 1 0 336 1 0/2///Blacksmith's",
				"Boiler Room/21": "Geologist's/O 749 5/80 1 0 86 1 0 84 1 0 82 1 0/1///Geologist's",
				"Boiler Room/22": "Adventurer's/R 518 1/766 99 0 767 10 0 768 1 0 769 1 0/1/2//Adventurer's",
				"Vault/23": "2,500g/O 220 3/-1 2500 2500/4///2,500g",
				"Vault/24": "5,000g/O 369 30/-1 5000 5000/2///5,000g",
				"Vault/25": "10,000g/BO 9 1/-1 10000 10000/3///10,000g",
				"Vault/26": "25,000g/BO 21 1/-1 25000 25000/1///25,000g",
				"Bulletin Board/31": "Chef's/O 221 3/724 1 0 259 1 0 430 1 0 376 1 0 228 1 0 194 1 0/4///Chef's",
				"Bulletin Board/32": "Field Research/BO 20 1/422 1 0 392 1 0 702 1 0 536 1 0/5///Field Research",
				"Bulletin Board/33": "Enchanter's/O 336 5/725 1 0 348 1 0 446 1 0 637 1 0/1///Enchanter's",
				"Bulletin Board/34": "Dye/BO 25 1/420 1 0 397 1 0 421 1 0 444 1 0 62 1 0 266 1 0/6///Dye",
				"Bulletin Board/35": "Fodder/BO 104 1/262 10 0 178 10 0 613 3 0/3///Fodder",
				"Abandoned Joja Mart/36": "The Missing//348 1 1 807 1 0 74 1 0 454 5 2 795 1 2 445 1 0/1/5//The Missing"
			};

		if (compareSemVer(saveInfo.version, version) < 0) {
			parseBundleData(xmlDoc, saveInfo, defaultData, bundleData, meta);
		} else {
			$(xmlDoc).find('bundleData > item').each(function() {
				rawData[$(this).find("key > string").text()] = $(this).find("value > string").text();
			});
			parseBundleData(xmlDoc, saveInfo, rawData, bundleData, meta);
		}
		// First check basic completion
		r = 0;
		$(ccLoc).find('areasComplete > boolean').each(function () {
			if ($(this).text() === 'true') {
				ccHave++;
				done[r] = 1;
			}
			r++;
		});
		// Now look at bundles. Getting donated items and count
		$(ccLoc).find('bundles > item').each(function () {
			id = $(this).find('key > int').text();
			bundleHave[id] = 0;
			itemsHave[id] = {};
			i = 0;
			$(this).find('ArrayOfBoolean > boolean').each(function () {
				if ($(this).text() === 'true') {
					bundleHave[id]++;
					itemsHave[id][i] = true;
				}
				i++;
			});
		});
		if (saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty("JojaMember")) {
			isJojaMember = true;
		}
		Object.keys(jojaMail).forEach(function (id) {
			if (saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty(id)) {
				jojaHave++;
				done[jojaMail[id]] = true;
			}
		});
		if (ccHave > 0 && isJojaMember) {
			hybrid = true;
		}
		hybridLeft = jojaCount - ccHave;
		if (done.hasOwnProperty(ccMail.ccBulletin)) {
			hybridLeft++;
		}
		eventToCheck = (isJojaMember) ? jojaEvent : ccEvent;
		if (saveInfo.data[saveInfo.farmerId].eventsSeen.hasOwnProperty(eventToCheck)) {
			hasSeenCeremony = true;
		}
		
		output += '<div class="' + anchor + '_summary ' + sum_class + '">';
		// New information from Gigafreak#4754 on Discord confirms that the Joja achieve does trigger even if
		// most of the CC was completed through bundles. So warnings are removed and Joja will not be marked
		// impossible unless the CC is actually done.
		if (isJojaMember) {
			if (hybrid) {
				output += '<span class="result">' + farmer + ' completed ' + ccHave +
					' Community Center room(s) and then became a Joja member.</span><br />\n';
				output += '<span class="result">' + farmer + ' has since completed ' + jojaHave + ' of the remaining ' +
					hybridLeft + ' projects on the Community Development Form.</span><br />\n';
			} else {
				output += '<span class="result">' + farmer + ' is a Joja member and has completed ' + jojaHave +
					' of the ' + jojaCount + ' projects on the Community Development Form.</span><br />\n';
			}
			hybridLeft -= jojaHave;
			output += '<span class="result">' + farmer + ((hasSeenCeremony) ? ' has' : ' has not') +
					' attended the completion ceremony</span><br />\n<ul class="ach_list"><li>';
			output += getAchieveImpossibleString('Local Legend', 'restore the Pelican Town Community Center');
			output += '</li><li>\n';
			if (!hasSeenCeremony) {
				if (hybridLeft > 0) {
					temp = hybridLeft + ' more project(s) and the ceremony';
					// Since we are supporting hybrid playthrough, we check the CC versions of mail, not joja
					for (id in ccMail) {
						if (ccMail.hasOwnProperty(id) && id !== "ccBulletin") {
							if (!done.hasOwnProperty(ccMail[id])) {
								need.push('<li> Purchase ' + project[ccMail[id]] + ' project for ' + price[ccMail[id]] + '</li>');
							}
						}
					}
				} else {
					temp = ' to attend the ceremony';
				}
				need.push('<li>Attend the completion ceremony at the Joja Warehouse</li>');
			}
			output += (hasSeenCeremony) ? getAchieveString('Joja Co. Member Of The Year', '', 1) :
					getAchieveString('Joja Co. Member Of The Year', '', 0) + temp;
			output += '</li></ul>\n';
		} else {
			output += '<span class="result">' + farmer + ' is not a Joja member and has completed ' + ccHave +
					' of the ' + ccCount + ' Community Center rooms.</span><br />\n';
			output += '<span class="result">' + farmer + ((hasSeenCeremony) ? ' has' : ' has not') +
					' attended the completion ceremony</span><br />\n<ul class="ach_list"><li>';
			if (ccHave === 0) {
				output += getAchieveString('Joja Co. Member Of The Year', '', 0) + 'to become a Joja member and purchase all community development perks';
			} else if (ccHave < ccCount) {
				output += getAchieveString('Joja Co. Member Of The Year', '', 0) + 'to become a Joja member and purchase any remaining community development perks (' + hybridLeft + " left)";
			} else {
				output += getAchieveImpossibleString('Joja Co. Member Of The Year', 'become a Joja member and purchase all community development perks');
			}
			output += '</li><li>\n';
			if (!hasSeenCeremony) {
				if (ccHave < ccCount) {
					temp = (ccCount - ccHave) + ' more room(s) and the ceremony';
					for (id in ccMail) {
						if (ccMail.hasOwnProperty(id)) {
							r = ccMail[id];
							if (!done.hasOwnProperty(r)) {
								bundleNeed = [];
								if (bundleData.hasOwnProperty(r)) {
									for (b in bundleData[r].bundles) {
										if (bundleData[r].bundles.hasOwnProperty(b)) {
											if (bundleHave[b] < bundleData[r].bundles[b].qty) {
												var possibles = [];
												bundleData[r].bundles[b].items.forEach(function (e, i, a) {
													if (!itemsHave[b].hasOwnProperty(i)) {
														possibles.push(bundleData[r].bundles[b].items[i]);
													}
												});
												bundleNeed.push('<li>' + bundleData[r].bundles[b].name + ' Bundle -- need ' +
													(bundleData[r].bundles[b].qty - bundleHave[b]) + ' of: ' + possibles.join(', ') + '</li>');
											}
										}
									}
								}
								need.push('<li> ' + wikify(bundleData[r].name, 'Bundles') + '<ol>' + bundleNeed.sort().join('') + '</ol></li>');
							}
						}
					}
				} else {
					temp = ' to attend the ceremony';
				}
				need.push('<li>Attend the re-opening ceremony at the Community Center</li>');
			}
			output += (ccHave >= ccCount && hasSeenCeremony) ? getAchieveString('Local Legend', '', 1) :
					getAchieveString('Local Legend', '', 0) + temp;
			output += '</li></ul></div>';
		}
		if (need.length > 0) {
			hasDetails = true;
			output += '<div class="' + anchor + '_details ' + det_class + '">';
			output += '<span class="need">Left to do:<ol>' + need.sort().join('') + '</ol></span></div>';
		}

		output = getSectionHeader(saveInfo, title, anchor, hasDetails, version) + output + getSectionFooter();
		return output;
	}

	function parseSecretNotes(xmlDoc, saveInfo) {
		var title = 'Secret Notes',
			anchor = makeAnchor(title),
			version = "1.3",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];
			meta.hasStoneJunimo = false;
		
		if (compareSemVer(saveInfo.version, "1.3") < 0) {
			return '';
		}
		
		// Stone Junimo is a giant pain in the ass. It seems to not have any confirmation so we have to search
		// the entire save for it. Worse, the buried one may reappear later so we need to ignore that one when
		// searching. The buried one is at (57, 16) on the Town map.
		// It also should not be obtainable if the players went the Joja route, but we will deal with that later.
		$(xmlDoc).find('Item > name').each(function () {
			if ($(this).text() === "Stone Junimo") {
				// Found one in storage somewhere. We good.
				meta.hasStoneJunimo = true;
				return false;
			}
		});
		if (!meta.hasStoneJunimo) {
			$(xmlDoc).find('Object > name').each(function () {
				if ($(this).text() === "Stone Junimo") {
					var loc = $(this).parents('GameLocation').children('name').text();
					if (loc === 'Town') {
						var x = $(this).parents('item').find('key > Vector2 > X').text();
						var y = $(this).parents('item').find('key > Vector2 > Y').text();
						if (x !== '57' || y !== '16') {
							meta.hasStoneJunimo = true;
							return false;
						}
					} else {
						meta.hasStoneJunimo = true;
						return false;
					}
				}
			});
		}
		
		table[0] = parsePlayerSecretNotes($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerSecretNotes, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}

	function parsePlayerSecretNotes(player, saveInfo, meta) {
		var output = '',
			table = [],
			farmer = $(player).children('name').html(),
			hasSeenKrobus = false,
			hasMagnifyingGlass = false,
			isJojaMember = false,
			umid = $(player).children('UniqueMultiplayerID').text(),
			notes = {},
			need = [],
			rewards = {},
			reward_skip = {},
			found_notes = 0,
			found_rewards = 0,
			note_count = 23,
			mod_count = 0,
			reward_start = 13,
			reward_count = note_count - reward_start + 1,
			i;

		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			note_count = 25;
			reward_count++;
			reward_skip[24] = true;
		}
		if (compareSemVer(saveInfo.version, "1.6") >= 0) {
			note_count = 27;
			reward_skip[26] = true;
			reward_skip[27] = true;
			if (saveInfo.data[umid].mailReceived.hasOwnProperty('HasMagnifyingGlass')) {
				hasMagnifyingGlass = true;
			}
		} else {
			hasMagnifyingGlass = ($(player).children('hasMagnifyingGlass').text() === 'true');
		}

		if (saveInfo.data[umid].eventsSeen.hasOwnProperty('520702')) {
			hasSeenKrobus = true;
		}
		if (saveInfo.data[umid].eventsSeen.hasOwnProperty('2120303')) {
			rewards[23] = true;
			found_rewards++;
		}
		
		var rewardMail = {
			'gotPearl': 15,
			'junimoPlush': 13,
			// Qi quest we just check for the start. Full completion is 'TH_Lumberpile'
			'TH_Tunnel': 22, 
			'carolinesNecklace': 25,
			'SecretNote16_done': 16,
			'SecretNote17_done': 17,
			'SecretNote18_done': 18,
			'SecretNote19_done': 19,
			'SecretNote20_done': 20,
			'secretNote21_done': 21,
		};		
		Object.keys(rewardMail).forEach(function(id) {
			if (saveInfo.data[umid].mailReceived.hasOwnProperty(id)) {
				rewards[rewardMail[id]] = true;
				found_rewards++;
			}
		});
		if (saveInfo.data[umid].mailReceived.hasOwnProperty('JojaMember')) {
			isJojaMember = true;
		}
		if (isJojaMember) {
			reward_count--;
			reward_skip[14] = true;
		} else if (meta.hasStoneJunimo) {
			rewards[14] = true;
			found_rewards++;
		}
		
		// Check Krobus event, then check for magnifier, then check number of notes
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + ' has ' + (hasSeenKrobus ? '' : 'not ') + ' seen the Shadow Guy at the Bus Stop.</span><br />\n';
		output += '<span class="result">' + farmer + ' has ' + (hasMagnifyingGlass ? '' : 'not ') + ' found the Magnifying Glass.</span><br />\n';
		$(player).find('secretNotesSeen > int').each(function () {
			// Filter out journal scraps
			if (Number($(this).text()) < 1000) {
				if (Number($(this).text()) > note_count) {
					mod_count++;
				} else {
					notes[$(this).text()] = true;
					found_notes++;
				}
			}
		});
		output += '<span class="result">' + farmer + ' has read ' + found_notes + ' of ' +
			note_count + ' secret notes.</span><br />\n';
		if (mod_count > 0) {
			output += '<span class="result note">' + farmer + ' has read ' + mod_count + ' mod secret note(s).</span><br />\n';
		}
		output += '<ul class="ach_list"><li>';
		output += (found_notes >= note_count) ? getMilestoneString('Read all the secret notes', 1) :
				getMilestoneString('Read all the secret notes', 0) + (note_count - found_notes) + ' more';
		output += '</li></ul></div>';
		if (found_notes < note_count) {
			for (i = 1; i <= note_count; i++) {
				if (!notes.hasOwnProperty(i)) {
					need.push('<li>' + wikify('Secret Note #' + i, 'Secret Notes') + '</li>');
				}
			}
			if (need.length > 0) {
				meta.hasDetails = true;
				output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
				output += '<span class="need">Left to read:<ol>' + need.join('') + '</ol></span></div>';
			}
		}
		table.push(output);
		// Stone Junimo not available for Joja route. We silently remove it from the list, which isn't optimal

		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + ' has found the rewards from  ' + found_rewards + ' of ' +
			reward_count + ' secret notes.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (found_rewards >= reward_count) ? getMilestoneString('Find all the secret note rewards', 1) :
				getMilestoneString('Find all the secret note rewards', 0) + (reward_count - found_rewards) + ' more';
		output += '</li></ul></div>';
		if (found_rewards < reward_count) {
			need = [];
			for (i = reward_start; i <= note_count; i++) {
				if (!reward_skip.hasOwnProperty(i) && !rewards.hasOwnProperty(i)) {
					var extra = "";
					if (i == 14) {
						extra = " (Note: may be inaccurate if item was collected and destroyed.)";
					}
					need.push('<li> Reward from ' + wikify('Secret Note #' + i, 'Secret Notes') + extra + '</li>');
				}
			}
			if (need.length > 0) {
				meta.hasDetails = true;
				output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
				output += '<span class="need">Left to find:<ol>' + need.join('') + '</ol></span></div>';
			}
		}
		table.push(output);
		return table;
	}

	function parseJournalScraps(xmlDoc, saveInfo) {
		var title = 'Journal Scraps',
			anchor = makeAnchor(title),
			version = "1.5",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];
		
		if (compareSemVer(saveInfo.version, version) < 0) {
			return '';
		}
		
		table[0] = parsePlayerJournalScraps($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerJournalScraps, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}

	function parsePlayerJournalScraps(player, saveInfo, meta) {
		var output = '',
			table = [],
			farmer = $(player).children('name').html(),
			hasVisitedIsland = false,
			umid = $(player).children('UniqueMultiplayerID').text(),
			notes = {},
			need = [],
			rewards = { 1004: false, 1006: false, 1009: false, 1010: false },
			found_notes = 0,
			found_rewards = 0,
			note_count = 11,
			reward_count = 4,
			mod_count = 0,
			i;

		var rewardMail = {
			'Island_W_BuriedTreasure2': 1006,
			'Island_W_BuriedTreasure': 1004,
			'Island_N_BuriedTreasure': 1010, 
		};		
		Object.keys(rewardMail).forEach(function(id) {
			if (saveInfo.data[umid].mailReceived.hasOwnProperty(id)) {
				rewards[rewardMail[id]] = true;
				found_rewards++;
			}
		});
		if (saveInfo.data[umid].mailReceived.hasOwnProperty('Visited_Island')) {
			hasVisitedIsland = true;
		}
		
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + ' has ' + (hasVisitedIsland ? '' : 'not ') + ' visited the Island.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (hasVisitedIsland) ? getAchieveString('A Distant Shore', 'Reach Ginger Island', 1) :
				getAchieveString('A Distant Shore', 'Reach Ginger Island', 0) + ' to visit'
		output += '</li></ul></div>';
		$(player).find('secretNotesSeen > int').each(function () {
			// Only count Journal Scraps but watch out for mods. Any additional base game scraps will need this to be adjusted.
			if (Number($(this).text()) >= 1000) {
				if (Number($(this).text()) >= 1012) {
					mod_count++;
				} else {
					notes[$(this).text()] = true;
					found_notes++;
				}
			}
		});
		output += '<span class="result">' + farmer + ' has read ' + found_notes + ' of ' +
			note_count + ' journal scraps.</span><br />\n';
		if (mod_count > 0) {
			output += '<span class="result note">' + farmer + ' has read ' + mod_count + ' mod journal scrap(s).</span><br />\n';
		}
		output += '<ul class="ach_list"><li>';
		output += (found_notes >= note_count) ? getMilestoneString('Read all the journal scraps', 1) :
				getMilestoneString('Read all the journal scraps', 0) + (note_count - found_notes) + ' more';
		output += '</li></ul></div>';
		if (found_notes < note_count) {
			for (i = 1; i <= note_count; i++) {
				if (!notes.hasOwnProperty(1000 + Number(i))) {
					need.push('<li>' + wikify('Journal Scrap #' + i, 'Journal Scraps') + '</li>');
				}
			}
			if (need.length > 0) {
				meta.hasDetails = true;
				output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
				output += '<span class="need">Left to read:<ol>' + need.join('') + '</ol></span></div>';
			}
		}
		table.push(output);
		// Most rewards are noted by mail flags already checked. For mermaid puzzle, we only check for walnut award.
		$(player).parents("SaveGame").first().find('collectedNutTracker > string').each(function () {
			if ($(this).text() === "Mermaid") {
				rewards[1009] = true;
				found_rewards++;
				return false;
			}
		});
		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + ' has found the rewards from  ' + found_rewards + ' of ' +
			reward_count + ' journal scraps.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (found_rewards >= reward_count) ? getMilestoneString('Find all the journal scrap rewards', 1) :
				getMilestoneString('Find all the journal scrap rewards', 0) + (reward_count - found_rewards) + ' more';
		output += '</li></ul></div>';
		if (found_rewards < reward_count) {
			need = [];
			var k = Object.keys(rewards).sort();
			for (i in k) {
				if (rewards.hasOwnProperty(k[i]) && !rewards[k[i]]) {
					var extra = "";
					need.push('<li> Reward from ' + wikify('Journal Scrap #' + (Number(k[i]) - 1000) , 'Journal Scraps') + extra + '</li>');
				}
			}
			if (need.length > 0) {
				meta.hasDetails = true;
				output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
				output += '<span class="need">Left to find:<ol>' + need.join('') + '</ol></span></div>';
			}
		}
		table.push(output);
		return table;
	}

	function parseSpecialOrders(xmlDoc, saveInfo) {
		var title = 'Special Orders',
			anchor = makeAnchor(title),
			version = "1.5",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			found = {},
			found_count = 0,
			need = [],
			hasWalnutRoomAccess = false,
			town = { "Caroline": "Island Ingredients", "Clint": "Cave Patrol", "Demetrius": "Aquatic Overpopulation", "Demetrius2": "Biome Balance", "Emily": "Rock Rejuvenation", "Evelyn": "Gifts for George", "Gunther": "Fragments of the past", "Gus": "Gus' Famous Omelet", "Lewis": "Crop Order", "Linus": "Community Cleanup", "Pam": "The Strong Stuff", "Pierre": "Pierre's Prime Produce", "Robin": "Robin's Project", "Robin2": "Robin's Resource Rush", "Willy": "Juicy Bugs Wanted!", "Willy2": "Tropical Fish", "Wizard": "A Curious Substance", "Wizard2": "Prismatic Jelly" },
			town_count = Object.keys(town).length,
			qi = { "QiChallenge2": "Qi's Crop", "QiChallenge3": "Let's Play A Game", "QiChallenge4": "Four Precious Stones", "QiChallenge5": "Qi's Hungry Challenge", "QiChallenge6": "Qi's Cuisine", "QiChallenge7": "Qi's Kindness", "QiChallenge8": "Extended Family", "QiChallenge9": "Danger In The Deep", "QiChallenge10": "Skull Cavern Invasion", "QiChallenge12": "Qi's Prismatic Grange" },
			id;
		
		if (compareSemVer(saveInfo.version, version) < 0) {
			return '';
		}
		
		$(xmlDoc).find('completedSpecialOrders > string').each(function () {
			id = $(this).text();
			
			if (town.hasOwnProperty(id)) {
				found[id] = true;
				found_count++;
			}
		});

		var intro;
		if (saveInfo.numPlayers > 1) {
			intro = 'Inhabitants of ' + saveInfo.farmName + ' Farm have';
		} else {
			intro = saveInfo.players[saveInfo.farmerId] + ' has';
		}
		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + intro + ' completed ' + found_count + ' of ' +
			town_count + ' town special orders.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (found_count >= town_count) ? getMilestoneString('Complete all Special Orders', 1) :
				getMilestoneString('Complete all Special Orders', 0) + (town_count - found_count) + ' more';
		output += '</li></ul></div>';
		if (found_count < town_count) {
			for (id in town) {
				if (!found.hasOwnProperty(id)) {
					need.push('<li>' + wikify(town[id], "Quests#List_of_Special_Orders", true) + '</li>');
				}
			}
			if (need.length > 0) {
				meta.hasDetails = true;
				output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
				output += '<span class="need">Left to complete:<ol>' + need.sort().join('') + '</ol></span></div>';
			}
		}

		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + output + getSectionFooter();
		return output;
	}

	function parseWalnuts(xmlDoc, saveInfo) {
		var title = 'Golden Walnuts',
			anchor = makeAnchor(title),
			version = "1.5",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			count = 0,
			found_count = 0,
			game_count = Number($(xmlDoc).find('goldenWalnutsFound').text()),
			parrotUsed = ($(xmlDoc).find('activatedGoldenParrot').text() === "true"),
			found = {},
			need = {},
			id,
			umid = 'global', // No per-player parsing
			pt_pct = '',
			num,
			// Using same IDs as game uses internally
			trackerAllAtOnce = {
				// These are awarded all at once so the actual count is not listed in the save file
				"Bush_IslandEast_17_37": { 'num':1, 'name':'Island Jungle Bush', 'hint':'In open center area (17,37)' },
				"Bush_IslandShrine_23_34": { 'num':1, 'name':'Island Jungle Shrine Bush', 'hint':'Along Southern edge (23,34)' },
				"Bush_IslandSouth_31_5": { 'num':1, 'name':'Island South Bush', 'hint':'Accessed from hidden path East of stairs on Island North map (31,5)' },
				"Bush_IslandNorth_9_84": { 'num':1, 'name':'Island North Bush', 'hint':'Hidden clearing in trees West of stairs from dock area (9,84)' },
				"Bush_IslandNorth_20_26": { 'num':1, 'name':'Island North Bush', 'hint':'Hidden clearing in trees on West side in front of Volcano (20,26)' },
				"Bush_IslandNorth_56_27": { 'num':1, 'name':'Island North Bush', 'hint':'Behind coconut tree on East side in front of Volcano (56,27)' },
				"Bush_IslandNorth_4_42": { 'num':1, 'name':'Island North Bush', 'hint':'Grassy area above Dig Site (4,42)' },
				"Bush_IslandNorth_45_38": { 'num':1, 'name':'Island North Bush', 'hint':'Grassy area above Field Office (45,38)' },
				"Bush_IslandNorth_47_40": { 'num':1, 'name':'Island North Bush', 'hint':'Grassy area above Field Office (47,40)' },
				"Bush_IslandNorth_13_33": { 'num':1, 'name':'Island North Bush', 'hint':'Along river accessed via secret passage from Volcano entrance (13,33)' },
				"Bush_IslandNorth_5_30": { 'num':1, 'name':'Island North Bush', 'hint':'Along river accessed via secret passage from Volcano entrance (5,39)' },
				
				"Bush_Caldera_28_36": { 'num':1, 'name':'Volcano Caldera Bush', 'hint':'Along Southern edge (28,36)' },
				"Bush_Caldera_9_34": { 'num':1, 'name':'Volcano Caldera Bush', 'hint':'Along Southern edge (9,34)' },
				"Bush_CaptainRoom_2_4": { 'num':1, 'name':'Island West Shipwreck Bush', 'hint':'Shipwreck is enterable from left side (2,4)' },

				"TreeNut": { 'num':1, 'name':'Tree in Leo\'s Hut', 'hint':'Hit the tree with an axe' },
				"Buried_IslandNorth_19_39": { 'num':1, 'name':'Island North Buried', 'hint':'At top of stairs from Dig Site, marked by a circle of small rocks (19,39)' },
				"Buried_IslandNorth_19_13": { 'num':1, 'name':'Island North Buried', 'hint':'Cliff edge West of Volcano, marked by a circle of small rocks (19,13)' },
				"Buried_IslandNorth_57_79": { 'num':1, 'name':'Island North Buried', 'hint':'Sand patch within grass patch in SE corner, marked by a circle of small rocks (57,79)' },
				"Buried_IslandNorth_54_21": { 'num':1, 'name':'Island North Buried', 'hint':'Along Eastern edge of Volcano, between rocks and plants (54,21)' },
				"Buried_IslandNorth_42_77": { 'num':1, 'name':'Island North Buried', 'hint':'Dark grassy area just NE of stairs from dock, between tufts of long grass (42,77)' },
				"Buried_IslandNorth_62_54": { 'num':1, 'name':'Island North Buried', 'hint':'NE corner of path between docks and Field Office, marked by slightly raised sand (62,54)' },
				"Buried_IslandNorth_26_81": { 'num':1, 'name':'Island North Buried', 'hint':'Beneath curved tree West of stairs from dock, marked by a circle of small rocks (26,81)' },
				"IslandLeftPlantRestored": { 'num':1, 'name':'Field Office Plant Survey Reward', 'hint':'Correct count is 22 plants' },
				"IslandRightPlantRestored": { 'num':1, 'name':'Field Office Starfish Survey Reward', 'hint':'Correct count is 18 starfish' },
				"IslandBatRestored": { 'num':1, 'name':'Field Office Mummified Bat Reward', 'hint':'Found by breaking non-ore rocks in the Volcano' },
				"IslandFrogRestored": { 'num':1, 'name':'Field Office Mummified Frog Reward', 'hint':'Found by cutting weeds in Jungle' },
				"IslandCenterSkeletonRestored": { 'num':6, 'name':'Field Office Mammal Skeleton Reward', 'hint':"Skull -- Found in Golden Coconuts\nSpine -- Found by fishing in Island North\nLeg (2) -- Found by breaking fossil stones (high chance)\nRibs -- Found by breaking fossil stones (low chance)\nTail -- Found by panning in Island North" },
				"IslandSnakeRestored": { 'num':3, 'name':'Field Office Snake Skeleton Reward', 'hint':"Skull -- Found by digging artifact spots in Island North or West\n    and fishing in Island West\nVertebra (2) -- Found by digging artifact spots in Island West" },
				"Bush_IslandWest_104_3": { 'num':1, 'name':'Island West Bush', 'hint':'End of hidden path through dense trees in NE part of map (104,3)' },
				"Bush_IslandWest_31_24": { 'num':1, 'name':'Island West Bush', 'hint':'Behind Mahogany tree in Tiger Slime area (31,24)' },
				"Bush_IslandWest_38_56": { 'num':1, 'name':'Island West Bush', 'hint':'Behind palm tree near pond West of Birdie\'s hut (38,56)' },
				"Bush_IslandWest_75_29": { 'num':1, 'name':'Island West Bush', 'hint':'In front of the trees above farmhouse (75,29)' },
				"Bush_IslandWest_64_30": { 'num':1, 'name':'Island West Bush', 'hint':'Elevated area on West side of river; follow path counter-clockwise from Tiger Slimes (64,30)' },
				"Bush_IslandWest_54_18": { 'num':1, 'name':'Island West Bush', 'hint':'Obscured by dense trees along path between Tiger Slimes and suspension bridge (54,18)' },
				"Bush_IslandWest_25_30": { 'num':1, 'name':'Island West Bush', 'hint':'Along wall SE of walnut door (25,30)' },
				"Bush_IslandWest_15_3": { 'num':1, 'name':'Island West Bush', 'hint':'Follow coastline N past walnut door (15,3)' },
				"Buried_IslandWest_21_81": { 'num':1, 'name':'Island West Buried', 'hint':'In dark sand on SW coast, between circular indentations. (21,81)' },
				"Buried_IslandWest_62_76": { 'num':1, 'name':'Island West Buried', 'hint':'Among debris pile S of farm, between blue starfish (62,76)' },
				"Buried_IslandWest_39_24": { 'num':1, 'name':'Island West Buried', 'hint':'In Tiget Slime area, between tufts of long grass (39,24)' },
				"Buried_IslandWest_88_14": { 'num':1, 'name':'Island West Buried', 'hint':'In grass in NE corner, between animated tiles (88,14)' },
				"Buried_IslandWest_43_74": { 'num':1, 'name':'Island West Buried', 'hint':'Near tidal pools between blue and yellow starfish, initially blocked by boulder (43,74)' },
				"Buried_IslandWest_30_75": { 'num':1, 'name':'Island West Buried', 'hint':'Between tidal pools, marked by X (30,75)' },
				"IslandWestCavePuzzle": { 'num':3, 'name':'Island West Cave Puzzle', 'hint':'&quot;Simon Says&quot; musical crystals in hidden cave N of suspension bridge' },
				"SandDuggy": { 'num':1, 'name':'Island West Sand Duggy', 'hint':'Can place items to block other holes' },
				"TreeNutShot": { 'num':1, 'name':'Island North Palm Tree', 'hint':'Can use slingshot to knock walnut from tree' },
				"Mermaid": { 'num':5, 'name':'Island Cove Mermaid Puzzle', 'hint':'Use flute blocks to play Mermaid\s song; stones provide tuning clues' },
				"Buried_IslandSouthEastCave_36_26": { 'num':1, 'name':'Island Cove Cave Buried', 'hint':'Among the barrels across from the dock (36,26)' },
				"Buried_IslandSouthEast_25_17": { 'num':1, 'name':'Island Cove Buried', 'hint':'NE of star pool, between yellow starfish (25,17)' },
				"StardropPool": { 'num':1, 'name':'Island Cove Star Pool', 'hint':'Fish a walnut out of the pool' },
				"BananaShrine": { 'num':3, 'name':'Island Jungle Banana Shrine Reward', 'hint':'Place a banana on the shrine' },
				"IslandGourmand1": { 'num':5, 'name':'Island Farm Cave Gourmand Reward #1', 'hint':'Grow some melons for the Gourmand' },
				"IslandGourmand2": { 'num':5, 'name':'Island Farm Cave Gourmand Reward #2', 'hint':'Grow some wheat for the Gourmand' },
				"IslandGourmand3": { 'num':5, 'name':'Island Farm Cave Gourmand Reward #3', 'hint':'Grow some garlic for the Gourmand' },
				"IslandShrinePuzzle": { 'num':5, 'name':'Island Jungle Gem Shrine Reward', 'hint':'Place gems (amethyst, aquamarine, emerald, ruby, topaz) dropped by birds on appropriate pedestals' },
			},
			trackerExtra = {
				// Extra because it has unique handling via a special NetWorldState variable
				"GoldenCoconut": { 'num':1, 'name':'Break a Golden Coconut', 'hint':'' },
			},
			trackerLimited = {
				// These are (usually) awarded one at a time, sometimes with a random component.
				"Birdie": { 'num':5, 'name':'Birdie\'s Quest Reward', 'hint':'' },
				"Darts": { 'num':3, 'name':'Winning Darts Minigame', 'hint':'' },
				"TigerSlimeNut": { 'num':1, 'name':'Killing Island West Tiger Slimes', 'hint':'' },
				"VolcanoNormalChest": { 'num':1, 'name':'Looting Volcano Common Chests', 'hint':'' },
				"VolcanoRareChest": { 'num':1, 'name':'Looting Volcano Rare Chests', 'hint':'' },
				"VolcanoBarrel": { 'num':5, 'name':'Breaking Volcano "Barrels"', 'hint':'' },
				"VolcanoMining": { 'num':5, 'name':'Mining Stones in Volcano', 'hint':'' },
				"VolcanoMonsterDrop": { 'num':5, 'name':'Killing Monsters in Volcano', 'hint':'' },
				"IslandFarming": { 'num':5, 'name':'Harvesting Crops on Island Farm', 'hint':'' },
				"MusselStone": { 'num':5, 'name':'Breaking Shell Stones on Island Farm Beach', 'hint':'' },
				"IslandFishing": { 'num':5, 'name':'Fishing on the Island', 'hint':'' },
				"Island_N_BuriedTreasureNut": { 'num':1, 'name':'Journal Scrap #10 Buried Treasure', 'hint':'By curved tree just SW of Volcano entrance (27,28); must have read journal scrap' },
				"Island_W_BuriedTreasureNut": { 'num':1, 'name':'Journal Scrap #4 Buried Treasure', 'hint':'Between the bush clumps on beach N of Birdie\'s hut (18,42); must have read journal scrap' },
				"Island_W_BuriedTreasureNut2": { 'num':1, 'name':'Journal Scrap #6 Buried Treasure', 'hint':'Against wall on beach in SE corner of farm (104,74); must have read journal scrap' },
			};

		if (compareSemVer(saveInfo.version, version) < 0) {
			return '';
		}
		
		// These are shared in multiplayer so do not need any parsePlayer subroutines
		var gcc = $(xmlDoc).find('SaveGame > goldenCoconutCracked').text();
		if (gcc === "true") {
			found["GoldenCoconut"] = 1;
			found_count++;
		}
		$(xmlDoc).find('collectedNutTracker > string').each(function () {
			id = $(this).text();
			
			if (trackerAllAtOnce.hasOwnProperty(id)) {
				found[id] = trackerAllAtOnce[id].num;
				found_count += trackerAllAtOnce[id].num;
			}
		});
		$(xmlDoc).find('limitedNutDrops > item').each(function () {
			id = $(this).find('key > string').text();
			num = Number($(this).find('value > int').text());
			// Using the Joja Golden Parrot sets a lot of these to 9999
			if (trackerLimited.hasOwnProperty(id) && num > 0) {
				var n = Math.min(num, trackerLimited[id].num); 
				found[id] = n;
				found_count += n;
			}
		});
		
		for (id in trackerAllAtOnce) {
			if (trackerAllAtOnce.hasOwnProperty(id)) {
				count += trackerAllAtOnce[id].num;
				if (!found.hasOwnProperty(id)) {
					need[id] = trackerAllAtOnce[id].num;
				}
			}
		}
		for (id in trackerExtra) {
			if (trackerExtra.hasOwnProperty(id)) {
				count += trackerExtra[id].num;
				if (!found.hasOwnProperty(id)) {
					need[id] = trackerExtra[id].num;
				}
			}
		}
		for (id in trackerLimited) {
			if (trackerLimited.hasOwnProperty(id)) {
				count += trackerLimited[id].num;
				if (found.hasOwnProperty(id)) {
					if (found[id] < trackerLimited[id].num) {
						need[id] = trackerLimited[id].num - found[id];
					}
				} else {
					need[id] = trackerLimited[id].num;
				}
			}
		}
		
		// The game_count vs found_count discrepancy should only happen through mods or cheating, but we will account for it
		// Most goals will use game_count except for the "collect all" milestone since we can still list unfound ones after.
		saveInfo.perfectionTracker[umid]["Walnuts"] = { 'count' : game_count, 'total' : count };
		if (compareSemVer(saveInfo.version, "1.5") >= 0) {
			var x = Math.min(100, 100 * game_count / count);
			var places = (x < 100) ? 1 : 0;
			x = x.toFixed(places);
			pt_pct = getPTLink(x + '%');
		}
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		var intro;
		if (saveInfo.numPlayers > 1) {
			intro = 'Inhabitants of ' + saveInfo.farmName + ' Farm have';
		} else {
			intro = saveInfo.players[saveInfo.farmerId] + ' has';
		}
		output += '<span class="result">' + intro + ' found ' + game_count + ' of ' +
			count + ' golden walnuts.' + pt_pct + '</span>';
		if (found_count !== game_count) {
			output += '<br /><span class="result warn">Warning: Save lists a count of ' + game_count + " but we've found markers for " + found_count + '</span>';
		}
		if (game_count < count) {
			output += '<br/><span class="result">The ' + wikify("Golden Parrot") + ' will charge ' + addCommas(10000*(count - game_count)) + 'g to collect the rest.</span>';
		} else {
			output += '<br/><span class="result">The ' + wikify("Golden Parrot") + (parrotUsed ? ' was' : ' was not') + ' used to finish the collection.</span>';
		}
		output += '<ul class="ach_list"><li>';
		output += (game_count >= 10) ? getMilestoneString('Collect enough walnuts (10) to earn Leo\'s trust.', 1) :
				getMilestoneString('Collect enough walnuts (10) to earn Leo\'s trust.', 0) + (10 - game_count) + ' more';
		output += '</li>\n<li>';
		output += (game_count >= 101) ? getMilestoneString('Collect enough walnuts (101) to access the secret room.', 1) :
				getMilestoneString('Collect enough walnuts (101) to access the secret room', 0) + (101 - game_count) + ' more';
		output += '</li>\n<li>';
		/*
		if (found_count >= count) {
			output += parrotUsed ? getAchieveImpossibleString('Master of Walnuts', 'collect all golden walnuts without any help') :
				getAchieveString('Master of Walnuts', 'collect all golden walnuts without any help', 1);
		} else {
			output += getAchieveString('Master of Walnuts', 'collect all golden walnuts without any help', 0) + (count - found_count) + ' more';
		}
		*/
		output += '</li></ul></div>';

		if (found_count < count) {
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Left to find:<ol>';
			var val = 0;
			var keys = Object.keys(need);
			var forceShowSpoilers = false;
			for (var i in keys) {
				id = keys[i];
				val += need[id];
				output += '<li value="' + val + '">';
				var extra = "";
				if (need[id] > 1) {
					extra = " -- " + need[id] + " walnuts";
				}
				
				if (trackerAllAtOnce.hasOwnProperty(id)) {
					output += trackerAllAtOnce[id].name + extra;
					if (trackerAllAtOnce[id].hint !== '') {
						if (forceShowSpoilers) {
							output += ' -- <span class="note">' + trackerAllAtOnce[id].hint + '</span>';
						} else {
							output += ' (<span class="note" data-tooltip="' + trackerAllAtOnce[id].hint + '">Hover for spoilers</span>)';
						}
					}
					output += '</li>';
				} else if (trackerExtra.hasOwnProperty(id)) {
					output += trackerExtra[id].name + extra;
					if (trackerExtra[id].hint !== '') {
						if (forceShowSpoilers) {
							output += ' -- <span class="note">' + trackerExtra[id].hint + '</span>';
						} else {
							output += ' (<span class="note" data-tooltip="' + trackerExtra[id].hint + '">Hover for spoilers</span>)';
						}
					}
					output += '</li>';
				} else if (trackerLimited.hasOwnProperty(id)) {
					output += trackerLimited[id].name + extra;
					if (trackerLimited[id].hint !== '') {
						if (forceShowSpoilers) {
							output += ' -- <span class="note">' + trackerLimited[id].hint + '</span>';
						} else {
							output += ' (<span class="note" data-tooltip="' + trackerLimited[id].hint + '">Hover for spoilers</span>)';
						}
					}
					output += '</li>';
				} else {
					console.log("Walnut tracking found unknown id: " + id);
				}
			}
			output += '</ol></span></div>';
		}

		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + output + getSectionFooter();
		return output;
	}

	function parseIslandUpgrades(xmlDoc, saveInfo) {
		var title = 'Island Upgrades',
			anchor = makeAnchor(title),
			version = "1.5",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			count = 0,
			bought_count = 0,
			bought = {},
			need = {},
			id,
			cost = 0,
			upgrades = {
				"Island_FirstParrot": { 'cost': 1, 'name':'Feed Leo\'s Friend' },
				"Island_Turtle": { 'cost': 10, 'name':'Turtle Relocation' },
				"Island_UpgradeHouse": { 'cost': 20, 'name':'Island Farmhouse' },
				"Island_Resort": { 'cost': 20, 'name':'Resort' },
				"Island_UpgradeTrader": { 'cost': 10, 'name':'Island Trader' },
				"Island_UpgradeBridge": { 'cost': 10, 'name':'Bridge to Dig Site' },
				"Island_UpgradeParrotPlatform": { 'cost': 10, 'name':'Parrot Express Platforms' },
				"Island_UpgradeHouse_Mailbox": { 'cost': 5, 'name':'Mailbox' },
				"Island_W_Obelisk": { 'cost': 20, 'name':'Obelisk to Return to Valley' },
				"Island_VolcanoBridge": { 'cost': 5, 'name':'Bridge in Volcano entrance' },
				"Island_VolcanoShortcutOut": { 'cost': 5, 'name':'Exit hole from Volcano vendor' },
			};

		if (compareSemVer(saveInfo.version, version) < 0) {
			return '';
		}
		count = Object.keys(upgrades).length;
		Object.keys(upgrades).forEach(function(id) {
			if (upgrades.hasOwnProperty(id) && saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty(id)) {
				bought[id] = 1
				bought_count++;
			} else {
				need[id] = upgrades[id].cost;
				cost += upgrades[id].cost;
			}				
		});
		
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		var intro;
		if (saveInfo.numPlayers > 1) {
			intro = 'Inhabitants of ' + saveInfo.farmName + ' Farm have';
		} else {
			intro = saveInfo.players[saveInfo.farmerId] + ' has';
		}
		output += '<span class="result">' + intro + ' purchased ' + bought_count + ' of ' +
			count + ' Island Upgrades.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (bought_count >= count) ? getMilestoneString('Purchase all upgrades.', 1) :
				getMilestoneString('Purchase all upgrades', 0) + (count - bought_count) + ' more (costs ' + cost + ' walnuts)';
		output += '</li></ul></div>';

		if (bought_count < count) {
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Left to buy:<ol>';
			var val = 0;
			var keys = Object.keys(need);
			for (var i in keys) {
				id = keys[i];
				var extra = "";
				if (need[id] > 1) {
					extra = " -- costs " + need[id] + " walnuts";
				}
				output += '<li>' + upgrades[id].name + extra + '</li>';				
			}
			output += '</ol></span></div>';
		}

		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + output + getSectionFooter();
		return output;
	}
	
	function parsePerfectionTracker(xmlDoc, saveInfo) {
		// Scoring details from Utility.percentGameComplete()
		var title = 'Perfection Tracker',
			anchor = makeAnchor(title),
			version = "1.5",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			buildings = $(xmlDoc).find("locations > GameLocation[" + saveInfo.ns_prefix + "\\:type='Farm'] > buildings"),
			type,
			pt_pct = 0,
			adj_pct = 0,
			waivers = (compareSemVer(saveInfo.version, '1.6') >= 0) ? Number($(xmlDoc).find("perfectionWaivers").text()) : 0,
			extra = (waivers > 0) ? ("(+" + waivers + " Waivers)") : "",
			left,
			places = 1,
			numObelisks = 0,
			missingObelisks = [],
			pKeys = ["Shipping","Cooking","Crafting","Fishing","Great Friends","Skills"],
			bKeys = ["Monsters","Stardrops"],
			need = '';

		if (compareSemVer(saveInfo.version, version) < 0) {
			return '';
		}

		$(buildings).children('Building').each(function () {
			type = $(this).children('buildingType').text();
			if (saveInfo.perfectionTracker.global.hasOwnProperty(type)) {
				saveInfo.perfectionTracker.global[type] = true;
			}
		});

		// Perfection is somewhat different than other mechanics for multiplayer. While some objectives are global and others are
		// player-specific, the game will count the highest percentage for all player-specific goals. The end result is that there
		// is only a single combined perfection score which could be larger than any player's individual total.
		if (saveInfo.perfectionTracker.global["Earth Obelisk"]) { numObelisks++; } else { missingObelisks.push(wikify("Earth", "Earth Obelisk", 1)); }
		if (saveInfo.perfectionTracker.global["Water Obelisk"]) { numObelisks++; } else { missingObelisks.push(wikify("Water", "Water Obelisk", 1)); }
		if (saveInfo.perfectionTracker.global["Desert Obelisk"]) { numObelisks++; } else { missingObelisks.push(wikify("Desert", "Desert Obelisk", 1)); }
		if (saveInfo.perfectionTracker.global["Island Obelisk"]) { numObelisks++; } else { missingObelisks.push(wikify("Island", "Island Obelisk", 1)); }
		numObelisks = Math.min(numObelisks, 4);
		var pct = { "Walnuts": Math.min(saveInfo.perfectionTracker.global["Walnuts"].count / saveInfo.perfectionTracker.global["Walnuts"].total, 1) },
			best = {};
		pKeys.forEach(function (k) {
			pct[k] = 0;
			best[k] = "";
			Object.keys(saveInfo.players).forEach(function (umid) {
				var p = Math.min(saveInfo.perfectionTracker[umid][k].count / saveInfo.perfectionTracker[umid][k].total, 1);
				if (p > pct[k]) {
					pct[k] = p;
					best[k] = saveInfo.players[umid];
				}
			});
		});
		// Boolean perfection goals are stored in the pct structure too even though it's confusing and inconsistent
		bKeys.forEach(function (k) {
			pct[k] = false;
			best[k] = "";
			Object.keys(saveInfo.players).forEach(function (umid) {
				if (!pct[k] && saveInfo.perfectionTracker[umid][k]) {
					pct[k] = true;
					best[k] = saveInfo.players[umid];
				}
			});
		});
		
		pt_pct = numObelisks + (saveInfo.perfectionTracker.global["Gold Clock"] ? 10 : 0) +
			(pct["Monsters"] ? 10 : 0) + (pct["Stardrops"] ? 10 : 0) + 
			15 * pct["Shipping"] + 11 * pct["Great Friends"] + 10 * pct["Cooking"] + 10 * pct["Crafting"] + 10 * pct["Fishing"] +
			5 * pct["Walnuts"]  + 5 * pct["Skills"];
		0;
		left = 100 - pt_pct - waivers;
		adj_pct = Math.min(100, pt_pct +  waivers);
		adj_pct = adj_pct.toFixed( (adj_pct < 100) ? 1 : 0 );
		pt_pct = pt_pct.toFixed( (pt_pct < 100) ? 1 : 0 );
		left = left.toFixed( (left < 100) ? 1 : 0 );
		
		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + 'Inhabitants of ' + saveInfo.farmName + ' Farm have earned ' + adj_pct + '% Total Perfection (details below).</span>';
		output += '<br/><span class="result">Note that the Walnut Room display always rounds down and will show: ' + Math.floor(pt_pct) +
			'% ' + extra + '</span>';
		output += '<ul class="ach_list"><li>';
		output += (pt_pct >= 100) ? getMilestoneString('100% Completion', 1) :
				getMilestoneString('100% Completion', 0) + left + '% more';
		output += '</li></ul></div>';
		meta.hasDetails = true;
		output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
		output += '<span class="result">Percentage Breakdown</span>';
		output += '<ul class="ach_list"><li>';
		output += (pct["Shipping"] >= 1) ? getPerfectionPctString(pct["Shipping"], 15, 'Produce &amp; Forage Shipped', 1, best["Shipping"]) :
				getPerfectionPctString(pct["Shipping"], 15, 'Produce &amp; Forage Shipped', 0, best["Shipping"]) + ' -- <a href="#sec_Basic_Shipping">see above for needs</a>';
		output += '</li><li>';
		output += (numObelisks == 4) ? getPerfectionNumString(numObelisks, 4, 'Obelisks on Farm', 1) :
				getPerfectionNumString(numObelisks, 4, 'Obelisks on Farm', 0) + ' -- need ' + missingObelisks.join(', ');
		output += '</li><li>';
		output += getPerfectionBoolString(10, 'Golden Clock on Farm', saveInfo.perfectionTracker.global["Gold Clock"]) + (saveInfo.perfectionTracker.global["Gold Clock"] ? "" : ' -- need to build a ' + wikify("Gold Clock"));
		output += '</li><li>';
		output += getPerfectionBoolString(10, 'Monster Slayer Hero (all slayer goals)', pct["Monsters"], best["Monsters"]) + (pct["Monsters"] ? "" : ' -- <a href="#sec_Monster_Hunting">see above for needs</a>');
		output += '</li><li>';
		output += (pct["Great Friends"] >= 1) ? getPerfectionPctString(pct["Great Friends"], 11, 'Great Friends (maxing all relationships)', 1, best["Great Friends"]) :
				getPerfectionPctString(pct["Great Friends"], 11, 'Great Friends (maxing all relationships)', 0, best["Great Friends"]) + ' -- <a href="#sec_Social">see above for needs</a>';
		output += '</li><li>';
		output += (pct["Skills"] >= 1) ? getPerfectionPctNumString(pct["Skills"], 5, 25, 'Farmer Level (max all skills)', 1, best["Skills"]) :
				getPerfectionPctNumString(pct["Skills"], 5, 25, 'Farmer Level (max all skills)', 0, best["Skills"]) + ' -- <a href="#sec_Skills">see above for needs</a>';
		output += '</li><li>';
		output += getPerfectionBoolString(10, 'Found All Stardrops', pct["Stardrops"], best["Stardrops"]) + (pct["Stardrops"] ? "" : ' -- <a href="#sec_Stardrops">see above for needs</a>');
		output += '</li><li>';
		output += (pct["Cooking"] >= 1) ? getPerfectionPctString(pct["Cooking"], 10, 'Cooking Recipes Made', 1, best["Cooking"]) :
				getPerfectionPctString(pct["Cooking"], 10, 'Cooking Recipes Made', 0, best["Cooking"]) + ' -- <a href="#sec_Cooking">see above for needs</a>';
		output += '</li><li>';
		output += (pct["Crafting"] >= 1) ? getPerfectionPctString(pct["Crafting"], 10, 'Crafting Recipes Made', 1, best["Crafting"]) :
				getPerfectionPctString(pct["Crafting"], 10, 'Crafting Recipes Made', 0, best["Crafting"]) + ' -- <a href="#sec_Crafting">see above for needs</a>';
		output += '</li><li>';
		output += (pct["Fishing"] >= 1) ? getPerfectionPctString(pct["Fishing"], 10, 'Fish Caught', 1, best["Fishing"]) :
				getPerfectionPctString(pct["Fishing"], 10, 'Fish Caught', 0, best["Fishing"]) + ' -- <a href="#sec_Fishing">see above for needs</a>';
		output += '</li><li>';
		output += (pct["Walnuts"] >= 1) ? getPerfectionPctNumString(pct["Walnuts"], 5, 130, 'Golden Walnuts Found', 1) :
				getPerfectionPctNumString(pct["Walnuts"], 5, 130, 'Golden Walnuts Found', 0) + ' -- <a href="#sec_Skills">see above for needs</a>';
		if (waivers > 0) {
			output += '</li><li><span class="pt_yes"><span class="pts">' + waivers + '%</span> from purchase of ' + waivers +
				' Perfection Waivers</span>';
		}
		output += '</li></ul></div>';

		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + output + getSectionFooter();
		return output;
	}
	
	function parsePlayerPerfection(player, saveInfo, meta) {
		var output = '',
			table = [],
			farmer = $(player).children('name').html(),
			umid = $(player).children('UniqueMultiplayerID').text(),
			pt_pct = 0,
			left,
			places = 1,
			numObelisks = 0,
			missingObelisks = [],
			need = '';

		if (saveInfo.perfectionTracker.global["Earth Obelisk"]) { numObelisks++; } else { missingObelisks.push("Earth"); }
		if (saveInfo.perfectionTracker.global["Water Obelisk"]) { numObelisks++; } else { missingObelisks.push("Water"); }
		if (saveInfo.perfectionTracker.global["Desert Obelisk"]) { numObelisks++; } else { missingObelisks.push("Desert"); }
		if (saveInfo.perfectionTracker.global["Island Obelisk"]) { numObelisks++; } else { missingObelisks.push("Island"); }

		var pct = {
			"Walnuts": Math.min(saveInfo.perfectionTracker.global["Walnuts"].count / saveInfo.perfectionTracker.global["Walnuts"].total, 1),
			"Shipping": saveInfo.perfectionTracker[umid]["Shipping"].count / saveInfo.perfectionTracker[umid]["Shipping"].total,
			"Cooking": saveInfo.perfectionTracker[umid]["Cooking"].count / saveInfo.perfectionTracker[umid]["Cooking"].total,
			"Crafting": saveInfo.perfectionTracker[umid]["Crafting"].count / saveInfo.perfectionTracker[umid]["Crafting"].total,
			"Fishing": saveInfo.perfectionTracker[umid]["Fishing"].count / saveInfo.perfectionTracker[umid]["Fishing"].total,
			"Great Friends": saveInfo.perfectionTracker[umid]["Great Friends"].count / saveInfo.perfectionTracker[umid]["Great Friends"].total,
			"Skills": Math.min(saveInfo.perfectionTracker[umid]["Skills"].count / saveInfo.perfectionTracker[umid]["Skills"].total, 1)
		};
		numObelisks = Math.min(numObelisks, 4);
		
		pt_pct = numObelisks + (saveInfo.perfectionTracker.global["Gold Clock"] ? 10 : 0) +
			(saveInfo.perfectionTracker[umid]["Monsters"] ? 10 : 0) + (saveInfo.perfectionTracker[umid]["Stardrops"] ? 10 : 0) + 
			15 * pct["Shipping"] + 11 * pct["Great Friends"] + 10 * pct["Cooking"] + 10 * pct["Crafting"] + 10 * pct["Fishing"] +
			5 * pct["Walnuts"]  + 5 * pct["Skills"];
		0;	
		pt_pct = pt_pct.toFixed( (pt_pct < 100) ? 1 : 0 );
		left = 100 - pt_pct;
		left = left.toFixed( (left < 100) ? 1 : 0 );
		
		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + farmer + ' has ' + pt_pct + '% Total Completion (details below).</span>';
		output += '<ul class="ach_list"><li>';
		output += (pt_pct >= 100) ? getMilestoneString('100% Completion', 1) :
				getMilestoneString('100% Completion', 0) + left + '% more';
		output += '</li></ul></div>';
		meta.hasDetails = true;
		output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
		output += '<span class="result">Percentage Breakdown</span>';
		output += '<ul class="ach_list"><li>';
		output += (pct["Shipping"] >= 1) ? getPerfectionPctString(pct["Shipping"], 15, 'Produce &amp; Forage Shipped', 1) :
				getPerfectionPctString(pct["Shipping"], 15, 'Produce &amp; Forage Shipped', 0) + ' -- <a href="#sec_Basic_Shipping">see above for needs</a>';
		output += '</li><li>';
		output += (numObelisks == 4) ? getPerfectionNumString(numObelisks, 4, 'Obelisks on Farm', 1) :
				getPerfectionNumString(numObelisks, 4, 'Obelisks on Farm', 0) + ' -- need ' + missingObelisks.join(', ');
		output += '</li><li>';
		output += getPerfectionBoolString(10, 'Golden Clock on Farm', saveInfo.perfectionTracker.global["Gold Clock"]) + (saveInfo.perfectionTracker.global["Gold Clock"] ? "" : ' -- need to build a ' + wikify("Gold Clock"));
		output += '</li><li>';
		output += getPerfectionBoolString(10, 'Monster Slayer Hero (all slayer goals)', saveInfo.perfectionTracker[umid]["Monsters"]) + (saveInfo.perfectionTracker[umid]["Monsters"] ? "" : ' -- <a href="#sec_Monster_Hunting">see above for needs</a>');
		output += '</li><li>';
		output += (pct["Great Friends"] >= 1) ? getPerfectionPctString(pct["Great Friends"], 11, 'Great Friends (maxing all relationships)', 1) :
				getPerfectionPctString(pct["Great Friends"], 11, 'Great Friends (maxing all relationships)', 0) + ' -- <a href="#sec_Social">see above for needs</a>';
		output += '</li><li>';
		output += (pct["Skills"] >= 1) ? getPerfectionPctNumString(pct["Skills"], 5, 25, 'Farmer Level (max all skills)', 1) :
				getPerfectionPctNumString(pct["Skills"], 5, 25, 'Farmer Level (max all skills)', 0) + ' -- <a href="#sec_Skills">see above for needs</a>';
		output += '</li><li>';
		output += getPerfectionBoolString(10, 'Found All Stardrops', saveInfo.perfectionTracker[umid]["Stardrops"]) + (saveInfo.perfectionTracker[umid]["Stardrops"] ? "" : ' -- <a href="#sec_Stardrops">see above for needs</a>');
		output += '</li><li>';
		output += (pct["Cooking"] >= 1) ? getPerfectionPctString(pct["Cooking"], 10, 'Cooking Recipes Made', 1) :
				getPerfectionPctString(pct["Cooking"], 10, 'Cooking Recipes Made', 0) + ' -- <a href="#sec_Cooking">see above for needs</a>';
		output += '</li><li>';
		output += (pct["Crafting"] >= 1) ? getPerfectionPctString(pct["Crafting"], 10, 'Crafting Recipes Made', 1) :
				getPerfectionPctString(pct["Crafting"], 10, 'Crafting Recipes Made', 0) + ' -- <a href="#sec_Crafting">see above for needs</a>';
		output += '</li><li>';
		output += (pct["Fishing"] >= 1) ? getPerfectionPctString(pct["Fishing"], 10, 'Fish Caught', 1) :
				getPerfectionPctString(pct["Fishing"], 10, 'Fish Caught', 0) + ' -- <a href="#sec_Fishing">see above for needs</a>';
		output += '</li><li>';
		output += (pct["Walnuts"] >= 1) ? getPerfectionPctNumString(pct["Walnuts"], 5, 130, 'Golden Walnuts Found', 1) :
				getPerfectionPctNumString(pct["Walnuts"], 5, 130, 'Golden Walnuts Found', 0) + ' -- <a href="#sec_Skills">see above for needs</a>';
		output += '</li></ul></div>';
		table.push(output);

		return table;
	}

	function parsePowers(xmlDoc, saveInfo) {
		// Power information is taken and modified from Data/Powers.xnb
		// We only handle queries used in that file. See StardewValley.GameStateQuery.DefaultResolvers for other possibilities
		var title = 'Books, Special Items &amp; Powers',
			anchor = makeAnchor(title),
			version = "1.6",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			table = [];
			meta.bookpowers = {
				"Book_AnimalCatalogue": "PLAYER_STAT Current Book_AnimalCatalogue 1",
				"Book_Artifact": "PLAYER_STAT Current Book_Artifact 1",
				"Book_Bombs": "PLAYER_STAT Current Book_Bombs 1",
				"Book_Crabbing": "PLAYER_STAT Current Book_Crabbing 1",
				"Book_Defense": "PLAYER_STAT Current Book_Defense 1",
				"Book_Diamonds": "PLAYER_STAT Current Book_Diamonds 1",
				"Book_Friendship": "PLAYER_STAT Current Book_Friendship 1",
				"Book_Grass": "PLAYER_STAT Current Book_Grass 1",
				"Book_Horse": "PLAYER_STAT Current Book_Horse 1",
				"Book_Marlon": "PLAYER_STAT Current Book_Marlon 1",
				"Book_Mystery": "PLAYER_STAT Current Book_Mystery 1",
				"Book_PriceCatalogue": "PLAYER_STAT Current Book_PriceCatalogue 1",
				"Book_Roe": "PLAYER_STAT Current Book_Roe 1",
				"Book_Speed": "PLAYER_STAT Current Book_Speed 1",
				"Book_Speed2": "PLAYER_STAT Current Book_Speed2 1",
				"Book_Trash": "PLAYER_STAT Current Book_Trash 1",
				"Book_Void": "PLAYER_STAT Current Book_Void 1",
				"Book_WildSeeds": "PLAYER_STAT Current Book_WildSeeds 1",
				"Book_Woodcutting": "PLAYER_STAT Current Book_Woodcutting 1",
			},
			meta.otherpowers = {
				"BearPaw": "PLAYER_HAS_SEEN_EVENT Current 2120303",
				"ClubCard": "PLAYER_HAS_FLAG Current HasClubCard",
				"DarkTalisman": "PLAYER_HAS_FLAG Current HasDarkTalisman",
				"DwarvishTranslationGuide": "PLAYER_HAS_FLAG Host HasDwarvishTranslationGuide",
				"ForestMagic": "PLAYER_HAS_FLAG Current canReadJunimoText",
				"KeyToTheTown": "PLAYER_HAS_FLAG Current HasTownKey",
				"MagicInk": "PLAYER_HAS_FLAG Current HasMagicInk",
				"MagnifyingGlass": "PLAYER_HAS_FLAG Current HasMagnifyingGlass",
				"Mastery_Combat": "PLAYER_STAT Current mastery_4 1",
				"Mastery_Farming": "PLAYER_STAT Current mastery_0 1",
				"Mastery_Fishing": "PLAYER_STAT Current mastery_1 1",
				"Mastery_Foraging": "PLAYER_STAT Current mastery_2 1",
				"Mastery_Mining": "PLAYER_STAT Current mastery_3 1",
				"RustyKey": "PLAYER_HAS_FLAG Host HasRustyKey",
				"SkullKey": "PLAYER_HAS_FLAG Host HasSkullKey",
				"SpecialCharm": "PLAYER_HAS_FLAG Current HasSpecialCharm",
				"SpringOnionMastery": "PLAYER_HAS_SEEN_EVENT Current 3910979",
			},
			meta.translate = {
				"BearPaw": "Bear's Knowledge",
				"ClubCard": "Qi Club Card",
				"DarkTalisman": "Dark Talisman",
				"DwarvishTranslationGuide": "Dwarvish Translation Guide",
				"ForestMagic": "Forest Magic",
				"KeyToTheTown": "Key to the Town",
				"MagicInk": "Magic Ink",
				"MagnifyingGlass": "Magnifying Glass",
				"Mastery_Combat": "Combat Mastery Perk",
				"Mastery_Farming": "Farming Mastery Perk",
				"Mastery_Fishing": "Fishing Mastery Perk",
				"Mastery_Foraging": "Foraging Mastery Perk",
				"Mastery_Mining": "Mining Mastery Perk",
				"RustyKey": "Rusty Key",
				"SkullKey": "Skull Key",
				"SpecialCharm": "Special Charm",
				"SpringOnionMastery": "Spring Onion Mastery",
			},
			meta.query = {
				'PLAYER_HAS_SEEN_EVENT': 'eventsSeen',
				'PLAYER_STAT': 'stats',
				'PLAYER_HAS_FLAG': 'mailReceived',
			};
			
		if (compareSemVer(saveInfo.version, version) < 0) {
			return '';
		}
		table[0] = parsePlayerPowers($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerPowers, meta);
		playerOutput += printTranspose(table);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput + getSectionFooter();
		return output;
	}

	function parsePlayerPowers(player, saveInfo, meta) {
		var output = '',
			have_book = 0,
			have_other = 0,
			id,
			umid = $(player).children('UniqueMultiplayerID').text(),
			need = [],
			book_count = Object.keys(meta.bookpowers).length,
			other_count = Object.keys(meta.otherpowers).length,
			power_count = book_count + other_count;

		Object.keys(meta.bookpowers).forEach(function (k) {
			//type of check | who | key to compare | value to compare
			var fields = meta.bookpowers[k].split(' ');
			var hasIt = false;
			var checkVal = (fields.length > 3) ? fields[3] : true;
			// we assume that a Host check actually checks both host and current player;
			// and, since the only values used in the base game are Host and Current, we therefore
			// always check the current player if we haven't found it yet.
			if (fields[1] === 'Host') {
				hasIt = (saveInfo.data[saveInfo.farmerId][meta.query[fields[0]]].hasOwnProperty(fields[2]) &&
					saveInfo.data[saveInfo.farmerId][meta.query[fields[0]]][fields[2]] === checkVal);
			}
			if (!hasIt) {
				hasIt = (saveInfo.data[umid][meta.query[fields[0]]].hasOwnProperty(fields[2]) &&
					saveInfo.data[umid][meta.query[fields[0]]][fields[2]] === checkVal);
			}
			if (hasIt) {
				have_book++;
			} else {
				var txt = k;
				if (meta.translate.hasOwnProperty(k)) {
					txt = meta.translate[k];
				} else if (saveInfo.objects.hasOwnProperty(k)) {
					txt = saveInfo.objects[k];
				} 
				need.push('<li><span class="booktitle">' + txt + '</span></li>');
			}
		});

		Object.keys(meta.otherpowers).forEach(function (k) {
			var fields = meta.otherpowers[k].split(' ');
			var hasIt = false;
			var checkVal = (fields.length > 3) ? fields[3] : true;
			if (fields[1] === 'Host') {
				hasIt = (saveInfo.data[saveInfo.farmerId][meta.query[fields[0]]].hasOwnProperty(fields[2]) &&
					saveInfo.data[saveInfo.farmerId][meta.query[fields[0]]][fields[2]] === checkVal);
			}
			if (!hasIt) {
				hasIt = (saveInfo.data[umid][meta.query[fields[0]]].hasOwnProperty(fields[2]) &&
					saveInfo.data[umid][meta.query[fields[0]]][fields[2]] === checkVal);
			}
			if (hasIt) {
				have_other++;
			} else {
				var txt = k;
				if (meta.translate.hasOwnProperty(k)) {
					txt = meta.translate[k];
				} else if (saveInfo.objects.hasOwnProperty(k)) {
					txt = saveInfo.objects[k];
				} 
				need.push('<li>' + txt + '</li>');
			}
		});
		
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + saveInfo.players[umid] + ' has read ' + have_book +
				' of ' + book_count + ' books.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (have_book >= book_count) ? getAchieveString('Well Read', 'Read all books', 1) :
				getAchieveString('Well-read', 'Read all books', 0) + (book_count - have_book) + ' more';
		output += '</li></ul></div>';
		output += '<span class="result">' + saveInfo.players[umid] + ' has received ' + have_other +
				' of ' + other_count + ' special items &amp; powers.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (have_other >= other_count) ? getMilestoneString('Acquire all special items &amp; powers', 1) :
				getMilestoneString('Acquire all special items &amp; powers', 0) + (other_count - have_other) + ' more';
		output += '</li></ul></div>';
		if (need.length > 0) {
			meta.hasDetails = true;
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="need">Left:';
			if (have_book < book_count) {
				output += ' (Books listed first)';
			}
			output += '<ol>' + need.sort().join('') + '</ol></span></div>';
		}
		return [output];
	}

	function parseArcadeGames(xmlDoc, saveInfo) {
		var title = 'Arcade Games',
			anchor = makeAnchor(title),
			version = "1.5",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			table = [],
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class };

		if (compareSemVer(saveInfo.version, version) < 0) {
			return '';
		}

		table[0] = parsePlayerArcade($(xmlDoc).find('SaveGame > player'), saveInfo, meta);
		parseFarmhands(xmlDoc, saveInfo, table, parsePlayerArcade, meta);
		playerOutput += printTranspose(table);
		// reusing table in a different way
		table = [];
		$(xmlDoc).find("junimoKartLeaderboards > entries > NetLeaderboardsEntry").each( function() {
			table.push('<li>' + addCommas($(this).find('score > *').text()) + ' &ndash; ' + $(this).find('name > *').text() + '</li>');
			//table.push('<li>' + $(this).find('name > *').text() + ' &ndash; ' + addCommas($(this).find('score > *').text()) + '</li>');
		});
		meta.hasDetails = (table.length > 0);
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + playerOutput;
		if (table.length > 0) {
			output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
			output += '<span class="result">Junimo Kart (Endless Mode) Leaderboard:</span><ol class="outer">';
			output += table.join('');
			output += '</ol></div>';
		}
		output += getSectionFooter();
		return output;
	}

	function parsePlayerArcade(player, saveInfo, meta) {
		var output = '',
			umid = $(player).children('UniqueMultiplayerID').text(),
			hasBeatenPK = saveInfo.data[umid].mailReceived.hasOwnProperty("Beat_PK"),
			hasBeatenJK = saveInfo.data[umid].mailReceived.hasOwnProperty("JunimoKart"),
			need = [];

		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + saveInfo.players[umid] + ' has' + (hasBeatenPK ? '' : ' not') + ' beaten Journey of the Prairie King.</span><br/>';
		var pkProgress = 0;
		var pkSave = $(player).children('JOTPKProgress');
		if (pkSave.length > 0) {
			var level = 1 + Number($(pkSave).find('whichRound > int').text());
			var sublevel = 1 + Number($(pkSave).find('whichWave > int').text());
			output += '<span class="result">' + saveInfo.players[umid] + ' has a JotPK save at stage ' + level + '-' + sublevel + ' (' +
				(($(pkSave).find('died > boolean').text() === 'true') ? 'not ' : '') + 'deathless)</span><br/>';
			pkProgress = (level == 3) ? 8 : ((level == 2) ? 4 : -1) + sublevel;
		} else {
			output += '<span class="result">' + saveInfo.players[umid] + ' does not have a saved JotPK game.';
		}
		output += '<ul class="ach_list"><li>';
		output += (hasBeatenPK) ? getAchieveString('Prairie King', "Beat 'Journey of the Prairie King'", 1) :
				getAchieveString('Prairie King', "Beat 'Journey of the Prairie King'", 0) + ' to clear ' + (13 - pkProgress) + ' more level(s)';
		output += '</li></ul>';

		output += '<span class="result">' + saveInfo.players[umid] + ' has' + (hasBeatenJK ? '' : ' not') + ' beaten Junimo Kart (Progress Mode).</span><br/>';
		output += '<ul class="ach_list"><li>';
		output += (hasBeatenJK) ? getMilestoneString("Beat 'Junimo Kart'", 1) :
				getMilestoneString("Beat 'Junimo Kart'", 0) + ' to complete Progress Mode';
		output += '</li></ul>';

		output += '</div>';
		return [output];
	}

	function parseAnimals(xmlDoc, saveInfo) {
		var title = 'Animal Summary',
			anchor = makeAnchor(title),
			version = "1.6",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class };

		if (compareSemVer(saveInfo.version, version) < 0) {
			return '';
		}
		// Technically this should only be set if there are actually pets/animals on the farm
		meta.hasDetails = true;

		var list = [];
		$(xmlDoc).find('locations > GameLocation > Characters > NPC').each(function () {
			if ($(this).attr(saveInfo.ns_prefix + ':type') === 'Pet' || $(this).attr(saveInfo.ns_prefix + ':type') === 'Cat' || $(this).attr(saveInfo.ns_prefix + ':type') === 'Dog') {
				var type = $(this).find('petType').text();
				//var breed = $(this).find('whichBreed').text();
				var thisPetLove = Number($(this).find('friendshipTowardFarmer').text());
				list.push('<li>' + type + ' named ' + $(this).find('name').first().text() + ' (' + thisPetLove + ' friendship points)</li>');
			}
		});
		output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">Farm Pets (' + list.length + ')</span></div>';
		output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '">';
		output += '<ol class="outer">' + list.sort().join('') + "</ol>";
		output += "</div>";

		$(xmlDoc).find("[" + saveInfo.ns_prefix + "\\:type='Farm'] Building").each( function() {
			var btype = $(this).find('buildingType').text();
			var cur = $(this).find('currentOccupants').text();
			var max = $(this).find('maxOccupants').text();
			if (btype === "Coop" || btype === "Big Coop" || btype === "Deluxe Coop" || btype === "Barn" || btype === "Big Barn" || btype === "Deluxe Barn") {
				var list = [];
				$(this).find('indoors > Animals > SerializableDictionaryOfInt64FarmAnimal FarmAnimal').each( function() {
					var cracker = $(this).find('hasEatenAnimalCracker').text() === 'true';
					var type = $(this).find('type').text();
					var extra;
					if (type === 'Pig') {
						extra = ' [<span class="ms_imp">cannot eat cracker</span>]';
					} else {
						extra = (cracker) ? ' [<span class="ms_yes">has eaten cracker</span>]' : ' [<span class="ms_no">has not eaten cracker</span>]';
					}
					list.push('<li>' + type + ' named ' + $(this).find('name').text() + extra + '</li>');
				});
				output += '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
				output += '<span class="result">' + btype + ' (' + cur + '/' + max + ')</span></div>';
				output += '<div class="' + meta.anchor + '_details ' + meta.det_class + '"><ol class="outer">';
				output += list.sort().join('') + "</ol></div>";
			}
		});
		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + output + getSectionFooter();
		return output;
	}

	function parseRaccoons(xmlDoc, saveInfo) {
		var title = 'Forest Neighbors',
			anchor = makeAnchor(title),
			version = "1.6",
			sum_class = getSummaryClass(saveInfo, version),
			det_class = getDetailsClass(saveInfo, version),
			output = '',
			playerOutput = '',
			meta = { "hasDetails": false, "anchor": anchor, "sum_class": sum_class, "det_class": det_class },
			intro,
			timesFed = Number($(xmlDoc).find("SaveGame > timesFedRaccoons").text()),
			lastFed = Number($(xmlDoc).find("SaveGame > daysPlayedWhenLastRaccoonBundleWasFinished").text()),
			daysSinceFed = saveInfo.data[saveInfo.farmerId].stats["daysPlayed"] - lastFed,
			checkBundles = false,
			id;
		
		if (compareSemVer(saveInfo.version, version) < 0) {
			return '';
		}
		// Windstorm: mail flags raccoonTreeFallen, checkedRaccoonStump, raccoonMovedIn
		// Stump repaired: <worldStateIDs><string>forestStumpFixed</string>
		// Progress: netWorldState IDs timesFedRaccoons and daysPlayedWhenLastRaccoonBundleWasFinished
		if (saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty("raccoonMovedIn")) {
			intro = "Mr. Raccoon has moved into the refurbished stump in the forest.";
			checkBundles = true;
		} else if (saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty("raccoonTreeFallen")) {
			intro = "The big tree in the forest has fallen and repairs may be needed.";
		} else if (saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty('ccPantry') || 
				saveInfo.data[saveInfo.farmerId].mailReceived.hasOwnProperty('jojaPantry')) {
			intro = "The Greenhouse has been repaired. Where did that raccoon go?";
		} else {
			intro = "The Greenhouse has not yet been repaired.";
		}
		output = '<div class="' + meta.anchor + '_summary ' + meta.sum_class + '">';
		output += '<span class="result">' + intro + '</span><br />\n';
		output += '<span class="result">The neighbors have been helped ' + timesFed + ' times';
		if (lastFed > 0) {
			output += ' (most recently ' + daysSinceFed + ' days ago)';
		}
		output += '.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		if (timesFed > 8 || (timesFed == 8 && daysSinceFed > 7)) {
			output += getAchieveString("Good Neighbors", "help your forest neighbors grow their family", 1);
		} else if (timesFed == 8 && daysSinceFed <= 7) {
			output += getAchieveString("Good Neighbors", "help your forest neighbors grow their family", 0) + 'to wait a few more days';
		} else {
			output += getAchieveString("Good Neighbors", "help your forest neighbors grow their family", 0) + 'to help ' + (8 - timesFed) + ' more times';
		}

		output = getSectionHeader(saveInfo, title, anchor, meta.hasDetails, version) + output + getSectionFooter();
		return output;
	}


	function createTOC() {
		var text,
			id,
			list = "<ul>";
		$("h2, h3").each(function () {
			if ($(this).is(":visible")) {
				text = $(this).text();
				id = 'sec_' + makeAnchor(text);
				$(this).attr('id', id);
				list += '<li><a href="#' + id + '">' + text + '</a></li>\n';
			}
		});
		list += '</ul>';
		document.getElementById('TOC-details').innerHTML = list;
	}

	function togglePlayer(e) {
		//console.log("Somebody clicked on " + $(e.currentTarget).attr('id') + " which has a class of " + $(e.currentTarget).attr('class'));
		// Adjust PlayerList entry to reflect status of this player
		var isOn = ($(e.currentTarget).attr('class') === 'on'),
			match = "td." + $(e.currentTarget).attr('id').substring(5);
		$(e.currentTarget).attr('class', (isOn ? 'off' : 'on'));
		// Go find all the entries for this player and toggle them.
		$(match).each(function () {
			if ($(this).is(":visible")) {
				$(this).hide();
			} else {
				$(this).show();
			}
		});
	}
	
	function createPlayerList(numPlayers, farmer, farmhands) {
		var width = Math.floor(100 / (1 + numPlayers)),
			i,
			text = '<table><tr><th>Toggle Player Display:</th>' + '<td id="List_PL_1" class="on">' + farmer + '</td>';
		for (i = 2; i <= numPlayers; i++) {
			text += ' <td id="List_PL_' + i + '" class="on">' + farmhands[i-2] + '</td>';
		}
		text += '</tr></table>';
		$("#PlayerList").html(text);
		$("#PlayerList").show();
		// Add click handlers
		for (i = 1; i <= numPlayers; i++) {
			var ID = "#List_PL_" + i;
			$(ID).click(togglePlayer);
		}
	}

	function handleFileSelect(evt) {
		var file = evt.target.files[0],
			reader = new FileReader(),
			prog = document.getElementById('progress');

		prog.value = 0;
		$('#output-container').hide();
		$('#progress-container').show();
		$('#changelog').hide();
		$('#PlayerList').hide();
		reader.onloadstart = function (e) {
			prog.value = 20;
		};
		reader.onprogress = function (e) {
			if (e.lengthComputable) {
				var p = 20 + (e.loaded / e.total * 30);
				prog.value = p;
			}
		};
		reader.onload = function (e) {
			var output = "",
				xmlDoc = $.parseXML(e.target.result),
				saveInfo = {};

			saveInfo.outputPrefOld = 'hide_details';
			var opt = document.getElementsByName('opt-old');
			if (opt !== null) {
				for(var i = 0; i < opt.length; i++){
					if(opt[i].checked){
						saveInfo.outputPrefOld = opt[i].value;
						Cookies.set('checkup-opt-old', opt[i].value, { expires: 365, path: '', SameSite: "Lax" });
						break;
					}
				}
			}
			saveInfo.outputPrefNew = 'hide_all';
			var opt = document.getElementsByName('opt-new');
			if (opt !== null) {
				for(var i = 0; i < opt.length; i++){
					if(opt[i].checked){
						saveInfo.outputPrefNew = opt[i].value;
						Cookies.set('checkup-opt-new', opt[i].value, { expires: 365, path: '', SameSite: "Lax" });
						break;
					}
				}
			}

			try {
				output += parseSummary(xmlDoc, saveInfo);
				output += parseMoney(xmlDoc, saveInfo);
				output += parseSkills(xmlDoc, saveInfo);
				output += parseSkillMastery(xmlDoc, saveInfo);
				output += parseQuests(xmlDoc, saveInfo);
				output += parseSpecialOrders(xmlDoc, saveInfo);
				output += parseMonsters(xmlDoc, saveInfo);
				prog.value = 60;
				output += parseStardrops(xmlDoc, saveInfo);
				output += parseFamily(xmlDoc, saveInfo);
				output += parseSocial(xmlDoc, saveInfo);
				output += parseCooking(xmlDoc, saveInfo);
				output += parseCrafting(xmlDoc, saveInfo);
				output += parseFishing(xmlDoc, saveInfo);
				output += parseBasicShipping(xmlDoc, saveInfo);
				prog.value = 70;
				output += parseCropShipping(xmlDoc, saveInfo);
				output += parsePowers(xmlDoc, saveInfo);
				output += parseMuseum(xmlDoc, saveInfo);
				output += parseSecretNotes(xmlDoc, saveInfo);
				output += parseJournalScraps(xmlDoc, saveInfo);
				output += parseBundles(xmlDoc, saveInfo);
				output += parseRaccoons(xmlDoc, saveInfo);
				prog.value = 80;
				output += parseGrandpa(xmlDoc, saveInfo);
				output += parseWalnuts(xmlDoc, saveInfo);
				output += parseIslandUpgrades(xmlDoc, saveInfo);
				output += parsePerfectionTracker(xmlDoc, saveInfo);
				output += parseArcadeGames(xmlDoc, saveInfo);
				output += parseAnimals(xmlDoc, saveInfo);
				prog.value = 90;

				document.getElementById('out').innerHTML = output;
				prog.value = 100;

				// Now that output has been added to the page, we need to add the output-toggling to each section
				$('#output-container .collapsible').each(function() {
					$(this).children('button').click(toggleVisible);
				});

				$('#output-container').show();
				$('#progress-container').hide();
				createTOC();
				$('#TOC').show();
			} catch(error) {
				var message = "<h3>Save Parse Error</h3><p>The app was unable to process the save file. This is most likely a bug with the app, so please let the dev know about it. Details below.</p>";
				$('#parse-error').html(message + '<p class="code">' + error + '<br/>' + error.stack + '</p>');				
			}
		};
		reader.readAsText(file);
	}
	document.getElementById('file_select').addEventListener('change', handleFileSelect, false);

/*		var t = evt.target;
		if ($(t).next().is(':visible')) {
			$(t).next().hide();
			$(t).html("Show Details");
		} else {
			$(t).next().show();
			$(t).html("Hide Details");
		}
*/
	
	function toggleVisible(evt) {
		var e = evt.target;
		var text = $(e).html();
		var theClass = '.' + $(e).attr("data-target");
		$(theClass).each(function() {
			if ($(this).is(':visible')) {
				$(this).hide();
				$(e).html(text.replace("Hide","Show"));
			} else {
				$(this).show();
				$(e).html(text.replace("Show","Hide"));
			}
		});
	}
	
	// At this point, this will only affect changelog
	$('.collapsible').each(function() {
		$(this).children('button').click(toggleVisible);
	});
	var c = Cookies.get('checkup-opt-old');
	if (typeof(c) !== 'undefined') {
		var opt = document.getElementsByName('opt-old');
		if (opt !== null) {
			for(var i = 0; i < opt.length; i++){
				if(opt[i].value === c){
					opt[i].checked = true;
					break;
				}
			}
		}
	}
	c = Cookies.get('checkup-opt-new');
	if (typeof(c) !== 'undefined') {
		var opt = document.getElementsByName('opt-new');
		if (opt !== null) {
			for(var i = 0; i < opt.length; i++){
				if(opt[i].value === c){
					opt[i].checked = true;
					break;
				}
			}
		}
	}
};
