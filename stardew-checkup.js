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
		return (yes) ? '<span class="ach_yes"><span class="ach">' + name + '</span> ' + desc + ' done</span>' :
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

	function wikify(item, page) {
		// removing egg colors & changing spaces to underscores
		var trimmed = item.replace(' (White)', '');
		trimmed = trimmed.replace(' (Brown)', '');
		trimmed = trimmed.replace(/ /g, '_');
		return (page) ? ('<a href="http://stardewvalleywiki.com/' + page + '#' + trimmed + '">' + item + '</a>') :
					('<a href="http://stardewvalleywiki.com/' + trimmed + '">' + item + '</a>');
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
	
	// Individual chunks of save parsing.
	// Each receives the xmlDoc object to parse & the saveInfo information structure and returns HTML to output.
	function parseSummary(xmlDoc, saveInfo) {
		var output = '<h3>Summary</h3>\n',
			farmTypes = ['Standard', 'Riverland', 'Forest', 'Hill-top', 'Wilderness', 'Four Corners'],
			playTime = Number($(xmlDoc).find('player > millisecondsPlayed').text()),
			playHr = Math.floor(playTime / 36e5),
			playMin = Math.floor((playTime % 36e5) / 6e4),
			id = "0",
			name = $(xmlDoc).find('player > name').html(),
			farmer = name,
			farmhands = [];
		
		// Versioning has changed from bools to numers, to now a semver string.
		saveInfo.version = $(xmlDoc).find('gameVersion').first().text();
		if (saveInfo.version === "") {
			saveInfo.version = "1.2";
			if ($(xmlDoc).find('hasApplied1_4_UpdateChanges').text() === 'true') {
				saveInfo.version = "1.4";
			} else if ($(xmlDoc).find('hasApplied1_3_UpdateChanges').text() === 'true') {
				saveInfo.version = "1.3";
			}
		}

		// Namespace prefix varies by platform; iOS saves seem to use 'p3' and PC saves use 'xsi'.
		saveInfo.ns_prefix = ($(xmlDoc).find('SaveGame[xmlns\\:xsi]').length > 0) ? 'xsi': 'p3';
		// Farmer, farm, and child names are read as html() because they come from user input and might contain characters
		// which must be escaped.
		saveInfo.players = {};
		saveInfo.children = {};
		if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			id = $(xmlDoc).find('player > UniqueMultiplayerID').text();
		}
		saveInfo.players[id] = name;
		saveInfo.children[id] = [];
		$(xmlDoc).find("[" + saveInfo.ns_prefix + "\\:type='FarmHouse'] NPC[" + saveInfo.ns_prefix + "\\:type='Child']").each(function () {
			saveInfo.children[id].push($(this).find('name').html());
		});
		saveInfo.numPlayers = 1;
		output += '<span class="result">' + $(xmlDoc).find('player > farmName').html() + ' Farm (' + 
			farmTypes[$(xmlDoc).find('whichFarm').text()] + ')</span><br />';
		output += '<span class="result">Farmer ' + name ;
		$(xmlDoc).find('farmhand').each(function() {
			if (isValidFarmhand(this)) {
				saveInfo.numPlayers++;
				id = $(this).children('UniqueMultiplayerID').text();
				name = $(this).children('name').html();
				farmhands.push(name);
				saveInfo.players[id] = name;
				saveInfo.children[id] = [];
				$(this).parent('indoors[' + saveInfo.ns_prefix + '\\:type="Cabin"]').find("NPC[" + saveInfo.ns_prefix + "\\:type='Child']").each(function () {
					saveInfo.children[id].push($(this).find('name').html());
				});
			}
		});
		if (saveInfo.numPlayers > 1) {
			output += ' and Farmhand(s) ' + farmhands.join(', ');
			createPlayerList(saveInfo.numPlayers, farmer, farmhands);
		}
		output += '</span><br />';
		// Searching for marriage between players & their children
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
		var version_num = saveInfo.version;
		output += '<span class="result">Save is from version ' + version_num + '</span><br />';
		return output;
	}

	function parseMoney(xmlDoc, saveInfo) {
		var output = '<h3>Money</h3>\n',
			table = [];
		// This is pretty pointless with shared gold, but I separate everything else for multiplayer...
		table[0] = parsePlayerMoney($(xmlDoc).find('SaveGame > player'), saveInfo);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerMoney(this, saveInfo));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}

	function parsePlayerMoney(player, saveInfo) {
		var output = '',
			money = Number($(player).children('totalMoneyEarned').text());

		output += '<span class="result">' + $(player).children('name').html() + ' has earned ' +
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
		output += '</li></ul>\n';
		return [output];
	}

	function parseSocial(xmlDoc, saveInfo) {
		var output = '<h3>Social</h3>\n',
			table = [],
			countdown = Number($(xmlDoc).find('countdownToWedding').text()),
			daysPlayed = Number($(xmlDoc).find('stats > daysPlayed').first().text()),
			spouse = $(xmlDoc).find('player > spouse').text(), // only used for 1.2 engagement checking
			// NPCs and NPC Types we are ignoring either in location data or friendship data
			ignore = {
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
				'Henchman': 1
			},
			npc = {},
			// <NPC>: [ [<numHearts>, <id>], ... ]
			eventList = {
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
				'Vincent': [ ],
				'Willy': [ ]
			};
			if (compareSemVer(saveInfo.version, "1.3") >= 0) {
				eventList.Jas.push([8, 3910979]);
				eventList.Vincent.push([8, 3910979]);
				eventList.Linus.push([8, 371652]);
				eventList.Pam.push([9, 503180]);
				eventList.Willy.push([6, 711130]);
			}
			if (compareSemVer(saveInfo.version, "1.4") >= 0) {
				eventList.Gus.push([5, 980558]);
				// This event does not require 2 hearts, but getting into the room does
				eventList.Caroline.push([2, 719926]);
				// 14-Heart spouse events. Many have multiple parts; to preserve their proper order,
				//  we will use 14.2, 14.3, etc. even though it the requirements are exactly 14
				eventList.Abigail.push([14, 6963327]);
				eventList.Emily.push([14.1, 3917600], [14.2, 3917601]);
				eventList.Haley.push([14.1, 6184643], [14.2, 8675611], [14.3, 6184644]);
				eventList.Leah.push([14.1, 3911124], [14.2, 3091462]);
				eventList.Maru.push([14.1, 3917666], [14.2, 5183338]);
				eventList.Penny.push([14.1, 4325434], [14.2, 4324303]);
				eventList.Alex.push([14.1, 3917587], [14.2, 3917589], [14.3, 3917590]);
				eventList.Elliott.push([14.1, 3912125], [14.2, 3912132]);
				eventList.Harvey.push([14, 3917626]);
				eventList.Sam.push([14.1, 3918600], [14.2, 3918601], [14.3, 3918602], [14.4, 3918603]);
				eventList.Sebastian.push([14.1, 9333219], [14.2, 9333220]);
				eventList.Shane.push([14.1, 3917584], [14.2, 3917585], [14.3, 3917586]);
				eventList.Krobus.push([14, 7771191]);
			}


		// Search locations for NPCs. They could be hardcoded, but this is somewhat more mod-friendly and it also
		// lets us to grab children and search out relationship status for version 1.2 saves.
		$(xmlDoc).find('locations > GameLocation').each(function () {
			$(this).find('characters > NPC').each(function () {
				var type = $(this).attr(saveInfo.ns_prefix + ':type');
				var who = $(this).find('name').html();
				// Filter out animals and monsters
				if (ignore.hasOwnProperty(type) || ignore.hasOwnProperty(who)) {
					return;
				}
				npc[who] = {};
				npc[who].isDatable = ($(this).find('datable').text() === 'true');
				npc[who].isGirl = ($(this).find('gender').text() === '1');
				npc[who].isChild = (type  === 'Child');
				if (compareSemVer(saveInfo.version, "1.3") < 0) {
					if ($(this).find('divorcedFromFarmer').text() === 'true') {
						npc[who].relStatus = 'Divorced';
					} else if (countdown > 0 && who === spouse.slice(0,-7)) {
						npc[who].relStatus = 'Engaged';
					} else if ($(this).find('daysMarried').text() > 0) {
						npc[who].relStatus = 'Married';
					} else if ($(this).find('datingFarmer').text() === 'true') {
						npc[who].relStatus = 'Dating';
					} else {
						npc[who].relStatus = 'Friendly';
					}
				}
			});
		});
		table[0] = parsePlayerSocial($(xmlDoc).find('SaveGame > player'), saveInfo, ignore, npc, eventList, countdown, daysPlayed);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerSocial(this, saveInfo, ignore, npc, eventList, countdown, daysPlayed));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}

	function parsePlayerSocial(player, saveInfo, ignore, npc, eventList, countdown, daysPlayed) {
		var output = '',
			table = [],
			count_5h = 0,
			count_10h = 0,
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
			eventsSeen = {},
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
				if (ignore.hasOwnProperty(who)) { return; }
				var num = Number($(this).find('value > Friendship > Points').text());
				if (num >= 2500) { count_10h++; }
				if (num >= 1250) { count_5h++; }
				points[who] = num;
				if (!npc.hasOwnProperty(who)) {
					// This shouldn't happen
					npc[who] = {'isDatable': false, 'isGirl': false, 'isChild': false};
				}
				npc[who].relStatus = $(this).find('value > Friendship > Status').html();
				var isRoommate = ($(this).find('value > Friendship > RoommateMarriage').text() === 'true');
				if (npc[who].relStatus === 'Married' && isRoommate) {
					npc[who].relStatus = 'Roommate'
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
			if (countdown > 0) {
				spouse = spouse.slice(0,-7);
			}
		}

		$(player).find('eventsSeen > int').each(function () {
			eventsSeen[$(this).text()] = 1;
		});
		$(player).find('mailReceived > string').each(function () {
			if($(this).text() === 'CF_Spouse') {
				hasSpouseStardrop = true;
			}
			if($(this).text() === 'pamHouseUpgrade') {
				hasPamHouse = true;
			}
		});
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
			// Penny 4H & 6H added if Pam House Upgrade is done.
			if ((arr[1] === 101 && (eventsSeen.hasOwnProperty(2123243) || eventsSeen.hasOwnProperty(2123343))) || 
				(arr[1] === 733330 && daysPlayed > 84) ||
				(arr[1] === 35 && hasPamHouse) || 
				(arr[1] === 36 && hasPamHouse)) {
					neg = 'imp';
				}
			// 10-heart events will be tagged impossible if there is no bouquet.
			if (arr[0] == 10 && npc[who].isDatable && npc[who].relStatus == 'Friendly') {
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
		for (var who in npc) {
			// Overriding status for the confrontation events
			if (dumped_Girls > 0 && npc[who].isDatable && npc[who].isGirl) {
				npc[who].relStatus = 'Angry (' + dumped_Girls + ' more day(s))';
			} else if (dumped_Guys > 0 && npc[who].isDatable && !npc[who].isGirl) {
				npc[who].relStatus = 'Angry (' + dumped_Guys + ' more day(s))';
			} 
			var pts = 0;
			if (points.hasOwnProperty(who)) {
				pts = points[who];
			} else {
				npc[who].relStatus = "Unmet";
			}
			var hearts = Math.floor(pts/250);
			var entry = '<li>';
			entry += (npc[who].isChild) ? who + ' (' + wikify('Child', 'Children') + ')' : wikify(who);
			entry += ': ' + npc[who].relStatus + ', ' + hearts + '&#x2665; (' + pts + ' pts) -- ';
				
			// Check events
			// We want to only make an Event list item if there are actually events for this NPC.
			var eventInfo = '';
			if (eventList.hasOwnProperty(who)) {
				if (eventList[who].length > 0) {
					eventInfo += '<ul class="compact"><li>Event(s): ';
					eventList[who].sort(function (a,b) { return a[0] - b[0]; });
					eventList[who].forEach(function (a) { eventCheck(a, who); });
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
			} else if (npc[who].isDatable) {
				max = 2000;
				if (npc[who].relStatus === 'Dating') {
					max = 2500;
				}
				entry += (pts >= max) ? '<span class="ms_yes">MAX</span></li>' :
					'<span class="ms_no">need ' + (max - pts) + ' more</span></li>';
				list_bach.push(entry + eventInfo);
			} else {
				entry += (pts >= 2500) ? '<span class="ms_yes">MAX</span></li>' :
					'<span class="ms_no">need ' + (2500 - pts) + ' more</span></li>';
				if (npc[who].isChild) {
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
		output += '</li></ul>\n';
		table.push(output);
		output = '<span class="result">' + farmer + ' has ' + count_10h + ' relationships of 10+ hearts.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (count_10h >= 1) ? getAchieveString('Best Friends', '10&#x2665; with 1 person', 1) :
				getAchieveString('Best Friends', '10&#x2665; with 1 person', 0) + (1 - count_10h) + ' more';
		output += '</li>\n<li>';
		output += (count_10h >= 8) ? getAchieveString('The Beloved Farmer', '10&#x2665; with 8 people', 1) :
				getAchieveString('The Beloved Farmer', '10&#x2665; with 8 people', 0) + (8 - count_10h) + ' more';
		output += '</li></ul>\n';
		table.push(output);
		//HERE getMilestoneString('House fully upgraded', 1 <ul class="outer">
		output = '<span class="result">' + farmer + ' has ' + (hasCompletedIntroductions ? "" : "not ") + 
				'met everyone in town.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (list_intro.length == 0) ? getMilestoneString('Complete <span class="ach">Introductions</span> quest', 1) :
				getMilestoneString('Complete <span class="ach">Introductions</span> quest', 0) + (list_intro.length) + ' more';
		output += '</li></ul>\n';
		if (list_intro.length > 0) {
			output += '<span class="need">Villagers left to meet<ol><li>' + list_intro.sort().join('</li><li>') + '</li></ol></span>\n';
		}
		table.push(output);
		output = '<span class="result">Individual Friendship Progress for ' + farmer + '</span><ul class="outer">';
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
		output += '</ul>\n';
		table.push(output);
		return table;
	}

	function parseFamily(xmlDoc, saveInfo) {
		var output = '<h3>Home and Family</h3>\n',
			table = [],
			wedding = Number($(xmlDoc).find('countdownToWedding').text());

		table[0] = parsePlayerFamily($(xmlDoc).find('SaveGame > player'), saveInfo, wedding, true);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerFamily(this, saveInfo, wedding, false));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}

	function parsePlayerFamily(player, saveInfo, wedding, isHost) {
		var output = '',
			table = [],
			needs = [],
			count = 0,
			maxUpgrades = (isHost ? 3 : 2),
			houseType = (isHost ? "FarmHouse" : "Cabin"),
			farmer = $(player).children('name').html(),
			spouse = $(player).children('spouse').html(),
			id = $(player).children('UniqueMultiplayerID').text(),
			children = '(None)',
			child_name = [],
			houseUpgrades = Number($(player).children('houseUpgradeLevel').text());
		if (typeof(id) === 'undefined' || id === '') {
			id = "0";
		}
		if (typeof(spouse) !== 'undefined' && spouse.length > 0) {
			if (wedding > 0 && compareSemVer(saveInfo.version, "1.3") < 0) {
				spouse = spouse.slice(0,-7);
			}
			count++;
		} else if (saveInfo.partners.hasOwnProperty(id)) {
			spouse = saveInfo.players[saveInfo.partners[id]];
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
		output += '<span class="result">' + farmer + "'s " + title + ": " + spouse + 
			((wedding) ? ' -- wedding in ' + wedding + ' day(s)' : '') + '</span><br />\n';
		if (saveInfo.children.hasOwnProperty(id) && saveInfo.children[id].length > 0) {
			child_name = saveInfo.children[id];
			count += child_name.length;
		} else if (saveInfo.partners.hasOwnProperty(id) && saveInfo.children.hasOwnProperty(saveInfo.partners[id]) &&
					saveInfo.children[saveInfo.partners[id]].length > 0) {
			child_name = saveInfo.children[saveInfo.partners[id]];
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
		output += '</li></ul>\n';
		table.push(output);
		output = '<span class="result">' + houseType + ' upgraded ' + houseUpgrades + ' time(s) of ';
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
		output += '</li></ul>\n';
		table.push(output);
		return table;
	}

	function parseCooking(xmlDoc, saveInfo) {
		var output = '<h3>Cooking</h3>\n',
			table = [],
			recipes = {
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
			},
			recipeTranslate = {
				"Cheese Cauli.": "Cheese Cauliflower",
				"Cookies": "Cookie",
				"Cran. Sauce": "Cranberry Sauce",
				"Dish o' The Sea": "Dish O' The Sea",
				"Eggplant Parm.": "Eggplant Parmesan",
				"Vegetable Stew": "Vegetable Medley"
			},
			id,
			recipeReverse = {};

		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			recipes[733] = "Shrimp Cocktail";
			recipes[253] = "Triple Shot Espresso";
			recipes[265] = "Seafoam Pudding";
		}
		for (id in recipes) {
			if (recipes.hasOwnProperty(id)) {
				recipeReverse[recipes[id]] = id;
			}
		}

		table[0] = parsePlayerCooking($(xmlDoc).find('SaveGame > player'), saveInfo, recipes, recipeTranslate, recipeReverse);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerCooking(this, saveInfo, recipes, recipeTranslate, recipeReverse));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}
		
	function parsePlayerCooking(player, saveInfo, recipes, recipeTranslate, recipeReverse) {
		/* cookingRecipes is keyed by name, but recipesCooked is keyed by ObjectInformation ID.
		 * Also, some cookingRecipes names are different from the names in ObjectInformation (e.g. Cookies vs Cookie) */
		var output = '',
			recipe_count = Object.keys(recipes).length,
			known = {},
			known_count = 0,
			crafted = {},
			craft_count = 0,
			need_k = [],
			need_c = [],
			mod_known = 0,
			mod_craft = 0,
			id,
			r;

		$(player).find('cookingRecipes > item').each(function () {
			var id = $(this).find('key > string').text(),
				num = Number($(this).find('value > int').text());
			if (recipeTranslate.hasOwnProperty(id)) {
				id = recipeTranslate[id];
			}
			if (recipeReverse.hasOwnProperty(id)) {
				known[id] = num;
				known_count++;
			} else {
				mod_known++;
			}
		});
		$(player).find('recipesCooked > item').each(function () {
			var id = $(this).find('key > int').text(),
				num = Number($(this).find('value > int').text());
			if (recipes.hasOwnProperty(id)) {
				if (num > 0) {
					crafted[recipes[id]] = num;
					craft_count++;
				}
			} else {
				if (num > 0) {
					mod_craft++;
				}
			}
		});
		
		output += '<span class="result">' + $(player).children('name').html() + " has cooked " + craft_count + ' and knows ' +
			known_count + ' of ' + recipe_count + ((mod_known > 0) ? " base game" : "") + ' recipes.</span>\n';
		if (mod_known > 0) {
			output += '<br /><span class="result"><span class="note">' + $(player).children('name').html() + " has also cooked " +
				mod_craft + ' and knows ' + mod_known + " mod recipes (total unavailable).</span></span>\n";
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
		output += '</li></ul>\n';
		// We are assuming it is impossible to craft something without knowing the recipe.
		if ( (craft_count + mod_craft) < (recipe_count + mod_known) ) {
			for (id in recipes) {
				if (recipes.hasOwnProperty(id)) {
					r = recipes[id];
					if (!known.hasOwnProperty(r)) {
						need_k.push('<li>' + wikify(r) + '</li>');
					} else if (!crafted.hasOwnProperty(r)) {
						need_c.push('<li>' + wikify(r) + '</li>');
					}
				}
			}
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
			output += '</ul></span>\n';
		}
		return [output];
	}

	function parseCrafting(xmlDoc, saveInfo) {
		/* Manually listing all crafting recipes in the order they appear on http://stardewvalleywiki.com/Crafting
		 * A translation is needed again because of text mismatch. */
		var output = '<h3>Crafting</h3>\n',
			table = [],
			recipes = [	"Cherry Bomb", "Bomb", "Mega Bomb",
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
						"Torch", "Campfire", "Wooden Brazier", "Stone Brazier", "Gold Brazier", "Carved Brazier", "Stump Brazier",
							"Barrel Brazier", "Skull Brazier", "Marble Brazier", "Wood Lamp-post", "Iron Lamp-post", "Jack-O-Lantern",
						"Chest", "Furnace", "Scarecrow", "Seed Maker", "Staircase", "Explosive Ammo", "Transmute (Fe)", "Transmute (Au)",
							"Crystalarium", "Charcoal Kiln", "Lightning Rod", "Recycling Machine", "Tapper", "Worm Bin",
							"Slime Egg-Press", "Slime Incubator", "Warp Totem: Beach", "Warp Totem: Mountains", "Warp Totem: Farm",
							"Rain Totem", "Tub o' Flowers", "Wicked Statue", "Flute Block", "Drum Block" ],
			recipeTranslate = {
				"Oil Of Garlic": "Oil of Garlic"
			};

		if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			// Wedding Ring is specifically excluded in StardewValley.Stats.checkForCraftingAchievments() so it is not listed here.
			recipes.push('Wood Sign', 'Stone Sign', 'Garden Pot');
		}

		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			recipes.push('Brick Floor', 'Grass Starter', 'Deluxe Scarecrow', 'Mini-Jukebox', 'Tree Fertilizer', 'Tea Sapling', 'Warp Totem: Desert');
		}
		table[0] = parsePlayerCrafting($(xmlDoc).find('SaveGame > player'), saveInfo, recipes, recipeTranslate);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerCrafting(this, saveInfo, recipes, recipeTranslate));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}

	function parsePlayerCrafting(player, saveInfo, recipes, recipeTranslate) {
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
			r;

		recipe_count = recipes.length;
		$(player).find('craftingRecipes > item').each(function () {
			var id = $(this).find('key > string').text(),
				num = Number($(this).find('value > int').text());
			if (recipeTranslate.hasOwnProperty(id)) {
				id = recipeTranslate[id];
			}
			if (id === 'Wedding Ring') {
				return true;
			}
			if (recipes.indexOf(id) === -1) {
				mod_known++;
				if (num > 0) {
					mod_craft++
				}
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

		output += '<span class="result">' + $(player).children('name').html() + " has crafted " + craft_count + ' and knows ' +
			known_count + ' of ' + recipe_count + ' recipes.</span>\n';
		if (mod_known > 0) {
			output += '<br /><span class="result"><span class="note">' + $(player).children('name').html() + " has also crafted " +
				mod_craft + ' and knows ' + mod_known + " mod recipes (total unavailable).</span></span>\n";
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
		output += '</li></ul>\n';
		if ( (craft_count + mod_craft) < (recipe_count + mod_known) ) {
			output += '<span class="need">Left to craft:<ul>';

			if (need_c.length > 0) {
				output += '<li>Known Recipes<ol>' + need_c.sort().join('') + '</ol></li>\n';
			}

			if (known_count < recipe_count) {
				need_k = [];
				for (id in recipes) {
					if (recipes.hasOwnProperty(id)) {
						r = recipes[id];
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
			output += '</ul></span>\n';
		}
		return [output];
	}

	function parseFishing(xmlDoc, saveInfo) {
		var output = '<h3>Fishing</h3>\n',
			table = [],
			recipes = {
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
		if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			recipes[798] = 'Midnight Squid';
			recipes[799] = 'Spook Fish';
			recipes[800] = 'Blobfish';
		}
		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			recipes[269] = 'Midnight Carp';
			recipes[267] = 'Flounder';
		}
		table[0] = parsePlayerFishing($(xmlDoc).find('SaveGame > player'), saveInfo, recipes);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerFishing(this, saveInfo, recipes));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}
	
	function parsePlayerFishing(player, saveInfo, recipes) {
		// Much of the logic was ported from the crafting function which is why the variables are weirdly named
		var output = '',
			recipe_count = Object.keys(recipes).length,
			count = 0,
			craft_count = 0, // for fish types
			known = [],
			need = [],
			ignore = { // Things you can catch that aren't counted in fishing achieve
				372: 1, // Clam is category "Basic -23"
				308: 1, // Void Mayo can be caught in Witch's Swamp during "Goblin Problems"
				79: 1,  // Secret Notes can be caught directly
				797: 1, // Pearl can be caught directly in Night Market Submarine
				191: 1, // Ornate necklace, from secret note quest added in 1.4
				103: 1  // Ancient doll, can be caught on 4 corners once after viewing the "doving" TV easter egg
			},
			id,
			r;

		$(player).find('fishCaught > item').each(function () {
			var id = $(this).find('key > int').text(),
				num = Number($(this).find('value > ArrayOfInt > int').first().text());
			if (!ignore.hasOwnProperty(id) && num > 0) {
				craft_count++;
				// We are adding up the count ourselves, but the total is also stored in (stats > fishCaught) and (stats > FishCaught)
				count += num;
				known[recipes[id]] = num;
			}
		});

		output += '<span class="result">' + $(player).children('name').html() + ' has caught ' + craft_count +
				' of ' + recipe_count + ' different fish (' + count + ' total)</span><ul class="ach_list">\n';
		output += '<li>';
		output += (count >= 100) ? getAchieveString('Mother Catch', 'catch 100 total fish', 1) :
				getAchieveString('Mother Catch', 'catch 100 total fish', 0) + (100 - count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 10) ? getAchieveString('Fisherman', 'catch 10 different fish', 1) :
				getAchieveString('Fisherman', 'catch 10 different fish', 0) + (10 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 24) ? getAchieveString('Ol\' Mariner', 'catch 24 different fish', 1) :
				getAchieveString('Ol\' Mariner', 'catch 24 different fish', 0) + (24 - craft_count) + ' more';
		output += '</li>\n<li>';
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
		output += '</li></ul>\n';
		if (craft_count < recipe_count) {
			need = [];
			for (id in recipes) {
				if (recipes.hasOwnProperty(id)) {
					r = recipes[id];
					if (!known.hasOwnProperty(r)) {
						need.push('<li>' + wikify(r) + '</li>');
					}
				}
			}
			output += '<span class="need">Left to catch:<ol>' + need.sort().join('') + '</ol></span>\n';
		}
		return [output];
	}

	function parseBasicShipping(xmlDoc, saveInfo) {
		/* Basic shipping achieve details are not easy to pull from decompiled source -- lots of filtering of
		 * ObjectInformation in StardewValley.Utility.hasFarmerShippedAllItems() with additional calls to
		 * StardewValley.Object.isPotentialBasicShippedCategory().
		 * For now, we will simply assume it matches the Collections page and hardcode everything there
		 * using wiki page http://stardewvalleywiki.com/Collections as a guideline. */
		var output = '<h3>Basic Shipping</h3>\n',
			table = [],
			recipes = {
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
			recipes[807] = "Dinosaur Mayonnaise";
			recipes[812] = "Roe";
			recipes[445] = "Caviar";
			recipes[814] = "Squid Ink";
			recipes[815] = "Tea Leaves";
			recipes[447] = "Aged Roe";
			recipes[614] = "Green Tea";
			recipes[271] = "Unmilled Rice";
		}
		table[0] = parsePlayerBasicShipping($(xmlDoc).find('SaveGame > player'), saveInfo, recipes);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerBasicShipping(this, saveInfo, recipes));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}
	
	function parsePlayerBasicShipping(player, saveInfo, recipes) {
		// Much of the logic was ported from the crafting function which is why the variables are weirdly named
		var output = '',
			recipe_count = Object.keys(recipes).length,
			crafted = {},
			craft_count = 0,
			need = [],
			id,
			r;

		$(player).find('basicShipped > item').each(function () {
			var id = $(this).find('key > int').text(),
				num = Number($(this).find('value > int').text());
			if (recipes.hasOwnProperty(id) && num > 0) {
				crafted[recipes[id]] = num;
				craft_count++;
			}
		});

		output += '<span class="result">' + $(player).children('name').html() + ' has shipped ' + craft_count +
				' of ' + recipe_count + ' basic items.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (craft_count >= recipe_count) ? getAchieveString('Full Shipment', 'ship every item', 1) :
				getAchieveString('Full Shipment', 'ship every item', 0) + (recipe_count - craft_count) + ' more';
		output += '</li></ul>\n';
		if (craft_count < recipe_count) {
			need = [];
			for (id in recipes) {
				if (recipes.hasOwnProperty(id)) {
					r = recipes[id];
					if (!crafted.hasOwnProperty(r)) {
						need.push('<li>' + wikify(r) + '</li>');
					}
				}
			}
			output += '<span class="need">Left to ship:<ol>' + need.sort().join('') + '</ol></span>\n';
		}
		return [output];
	}

	function parseCropShipping(xmlDoc, saveInfo) {
		// Relevant IDs were pulled from decompiled source - StardewValley.Stats.checkForShippingAchievments()
		// Note that there are 5 more "crops" for Monoculture than there are for Polyculture
		var output = '<h3>Crop Shipping</h3>\n',
			table = [],
			poly_crops = {
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
			},
			mono_extras = {
				// Ancient Fruit and 4 of the "Basic -80" flowers
				454: "Ancient Fruit",
				591: "Tulip",
				593: "Summer Spangle",
				595: "Fairy Rose",
				597: "Blue Jazz"
			};
			
		table[0] = parsePlayerCropShipping($(xmlDoc).find('SaveGame > player'), saveInfo, poly_crops, mono_extras);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerCropShipping(this, saveInfo, poly_crops, mono_extras));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}
	
	function parsePlayerCropShipping(player, saveInfo, poly_crops, mono_extras) {
		// Much of the logic was ported from the crafting function which is why the variables are weirdly named
		var output = '',
			recipe_count = Object.keys(poly_crops).length,
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
			var id = $(this).find('key > int').text(),
				num = Number($(this).find('value > int').text());
			if (poly_crops.hasOwnProperty(id)) {
				crafted[poly_crops[id]] = num;
				if (num >= 15) {
					craft_count++;
				}
				if (num > max_ship) {
					max_ship = num;
					max_crop = poly_crops[id];
				}
			} else if (mono_extras.hasOwnProperty(id)) {
				if (num > max_ship) {
					max_ship = num;
					max_crop = mono_extras[id];
				}
			}
		});

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
		output += '</li></ul>\n';
		if (craft_count < recipe_count) {
			need = [];
			for (id in poly_crops) {
				if (poly_crops.hasOwnProperty(id)) {
					r = poly_crops[id];
					if (!crafted.hasOwnProperty(r)) {
						need.push('<li>' + wikify(r) + ' -- 15 more</li>');
					} else {
						n = Number(crafted[r]);
						if (n < 15) {
							need.push('<li>' + wikify(r) + ' --' + (15 - n) + ' more</li>');
						}
					}
				}
			}
			output += '<span class="need">Left to ship:<ol>' + need.sort().join('') + '</ol></span>\n';
		}
		return [output];
	}

	function parseSkills(xmlDoc, saveInfo) {
		var output = '<h3>Skills</h3>\n',
			table = [],
			skills = ["Farming", "Fishing",	"Foraging",	"Mining", "Combat"],
			next_level = [100,380,770,1300,2150,3300,4800,6900,10000,15000];
			
		table[0] = parsePlayerSkills($(xmlDoc).find('SaveGame > player'), saveInfo, skills, next_level);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerSkills(this, saveInfo, skills, next_level));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}
	
	function parsePlayerSkills(player, saveInfo, skills, next_level) {
		var output = '',
			xp = {},
			i = 0,
			j,
			level = 10,
			num,
			count = 0,
			need = [];

		$(player).find('experiencePoints > int').each(function () {
			// We need to skip the unused 6th entry (Luck)
			if (i < 5) {
				num = Number($(this).text());
				xp[skills[i]] = num;
				// The current skill levels are also stored separately in 'player > fishingLevel' (and similar)
				if (num < 15000) {
					for (j = 0; j < 10; j++) {
						if (next_level[j] > num) {
							level = j;
							break;
						}
					}
					need.push('<li>' + wikify(skills[i]) + ' (level ' + level + ') -- need ' + 
						addCommas(next_level[level] - num) + ' more xp to next level and ' + addCommas(15000 - num) + ' more xp to max</li>\n');
				} else {
					count++;
				}
				i++;
			}
		});

		output += '<span class="result">' + $(player).children('name').html() + ' has reached level 10 in ' + count + 
			' of 5 skills.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (count >= 1) ? getAchieveString('Singular Talent', 'level 10 in a skill', 1) :
				getAchieveString('Singular Talent', 'level 10 in a skill', 0) + (1 - count) + ' more';
		output += '</li>\n<li>';
		output += (count >= 5) ? getAchieveString('Master of the Five Ways', 'level 10 in every skill', 1) :
				getAchieveString('Master of the Five Ways', 'level 10 in every skill', 0) + (5 - count) + ' more';
		output += '</li></ul>\n';

		if (need.length > 0) {
			output += '<span class="need">Skills left:<ol>' + need.sort().join('') + '</ol></span>\n';
		}
		return [output];
	}

	function parseMuseum(xmlDoc, saveInfo) {
		var output = '<h3>Museum Collection</h3>\n',
			table = [],
			artifacts = {
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
			},
			minerals = {
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
			},
			donated = {},
			artifact_count = Object.keys(artifacts).length,
			mineral_count = Object.keys(minerals).length,
			museum_count = artifact_count + mineral_count,
			donated_count = 0,
			museum = $(xmlDoc).find("locations > GameLocation[" + saveInfo.ns_prefix + "\\:type='LibraryMuseum']"),
			farmName = $(xmlDoc).find('player > farmName').html();

		$(museum).find('museumPieces > item').each(function () {
			var id = Number($(this).find('value > int').text());
			if (artifacts.hasOwnProperty(id) || minerals.hasOwnProperty(id)) {
				donated[id] = 1;
			}
		});
		donated_count = Object.keys(donated).length;
		output += '<span class="result">Inhabitants of ' + farmName + ' Farm have donated ' + donated_count + ' of ' +
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
		output += '</li></ul>\n';
		if (donated_count < museum_count) {			
			output += '<span class="need">See below for items left to donate</span><br /><br />\n';
		}
		
		table[0] = parsePlayerMuseum($(xmlDoc).find('SaveGame > player'), saveInfo, donated, artifacts, minerals);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerMuseum(this, saveInfo, donated, artifacts, minerals));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}

	function parsePlayerMuseum(player, saveInfo, donated, artifacts, minerals) {
		var output = '',
			donated_count = Object.keys(donated).length,
			artifact_count = Object.keys(artifacts).length,
			mineral_count = Object.keys(minerals).length,
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
			var id = $(this).find('key > int').text(),
				num = Number($(this).find('value > ArrayOfInt > int').first().text());
			if (artifacts.hasOwnProperty(id) && num > 0) {
				found[id] = num;
				found_art++;
			}
		});
		$(player).find('mineralsFound > item').each(function () {
			var id = $(this).find('key > int').text(),
				num = Number($(this).find('value > int').text());
			if (minerals.hasOwnProperty(id) && num > 0) {
				found[id] = num;
				found_min++;
			}
		});

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
		output += '</li></ul>\n';

		if (donated_count < museum_count || (found_art + found_min) < museum_count) {
			for (id in artifacts) {
				if (artifacts.hasOwnProperty(id)) {
					r = artifacts[id];
					need = [];
					if (!found.hasOwnProperty(id)) {
						need.push('found');
					}
					if (!donated.hasOwnProperty(id)) {
						need.push('donated');
					}
					if (need.length > 0) {
						need_art.push('<li>' + wikify(r) + ' -- not ' + need.join(" or ") + '</li>');
					}
				}
			}
			for (id in minerals) {
				if (minerals.hasOwnProperty(id)) {
					r = minerals[id];
					need = [];
					if (!found.hasOwnProperty(id)) {
						need.push('found');
					}
					if (!donated.hasOwnProperty(id)) {
						need.push('donated');
					}
					if (need.length > 0) {
						need_min.push('<li>' + wikify(r) + ' -- not ' + need.join(" or ") + '</li>');
					}
				}
			}
			output += '<span class="need">Items left:<ul>';
			if (need_art.length > 0) {
				output += '<li>Artifacts<ol>' + need_art.sort().join('') + '</ol></li>\n';
			}
			if (need_min.length > 0) {
				output += '<li>Minerals<ol>' + need_min.sort().join('') + '</ol></li>\n';
			}
			output += '</ul></span>\n';
		}
		
		return [output];
	}

	function parseMonsters(xmlDoc, saveInfo) {
		/* Conditions & details from decompiled source StardewValley.Locations.AdventureGuild.gil()
		 * The game counts some monsters which are not currently available; we will count them too
		 * just in case they are in someone's save file, but not list them in the details. */
		var output = '<h3>Monster Hunting</h3>\n',
			table = [],
			goals = {
				"Slimes": 1000,
				"Void Spirits": 150,
				"Bats": 200,
				"Skeletons": 50,
				"Cave Insects": 125,
				"Duggies": 30,
				"Dust Sprites": 500,
			},
			categories = {
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
			},
			monsters = {
				"Slimes": ["Green Slime", "Frost Jelly", "Sludge"],
				"Void Spirits": ["Shadow Brute", "Shadow Shaman"],
				"Bats": ["Bat", "Frost Bat", "Lava Bat"],
				"Skeletons": ["Skeleton"],
				"Cave Insects": ["Bug", "Cave Fly", "Grub"],
				"Duggies": ["Duggy"],
				"Dust Sprites": ["Dust Spirit"]
			};
		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			goals["Rock Crabs"] = 60;
			goals["Mummies"] = 100;
			goals["Pepper Rex"] = 50;
			goals["Serpents"] = 250;
			categories["Rock Crab"] = "Rock Crabs";
			categories["Lava Crab"] = "Rock Crabs";
			categories["Iridium Crab"] = "Rock Crabs";
			categories["Mummy"] = "Mummies";
			categories["Pepper Rex"] = "Pepper Rex";
			categories["Serpent"] = "Serpents";
			monsters["Rock Crabs"] = ["Rock Crab", "Lava Crab", "Iridium Crab"];
			monsters["Mummies"] = ["Mummy"];
			monsters["Pepper Rex"] = ["Pepper Rex"];
			monsters["Serpents"] = ["Serpent"];
		}
		table[0] = parsePlayerMonsters($(xmlDoc).find('SaveGame > player'), saveInfo, goals, categories, monsters);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerMonsters(this, saveInfo, goals, categories, monsters));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}

	function parsePlayerMonsters(player, saveInfo, goals, categories, monsters) {
		var output = '',
			table = [],
			goal_count = Object.keys(goals).length,
			killed = [],
			completed = 0,
			need = [],
			id,
			stats,
			mineLevel = Number($(player).children('deepestMineLevel').text()),
			hasSkullKey = $(player).children('hasSkullKey').text(),
			farmer = $(player).children('name').html();
			
		// Have seen some inconsitencies in multiplayer, so will use presence of skull key to override the level & bump it to 120.
		if (hasSkullKey === 'true') {
			mineLevel = Math.max(120, mineLevel);
		}
		if (mineLevel <= 0) {
			output += '<span class="result">' + farmer + ' has not yet explored the mines.</span><br />\n';
		} else {
			output += '<span class="result">' + farmer + ' has reached level ' + Math.min(mineLevel, 120) +
				' of the mines.</span><br />\n';
			output += '<span class="result">' + farmer + ((mineLevel > 120) ?
				(' has reached level ' + (mineLevel - 120) + ' of the Skull Cavern') :
				' has not yet explored the Skull Cavern');
			output += '.</span><br />';
		}
		table.push(output);
		output = '<ul class="ach_list"><li>\n';
		output += (mineLevel >= 120) ? getAchieveString('The Bottom', 'reach mine level 120', 1) :
				getAchieveString('The Bottom', 'reach mine level 120', 0) + (120 - mineLevel) + ' more';
		output += '</li></ul>\n';
		
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
			if (categories.hasOwnProperty(id) && num > 0) {
				if (killed.hasOwnProperty(categories[id])) {
					old = killed[categories[id]];
				}
				killed[categories[id]] = (old + num);
			}
		});
		for (id in goals) {
			if (goals.hasOwnProperty(id)) {
				if (killed.hasOwnProperty(id)) {
					if (killed[id] >= goals[id]) {
						completed++;
					} else {
						need.push('<li>' + id + ' -- kill ' + (goals[id] - killed[id]) + ' more of: ' +
							monsters[id].map(wikimap).join(', ') + '</li>');
					}
				} else {
					need.push('<li>' + id + ' -- kill ' + goals[id] + ' more of: ' +
						monsters[id].map(wikimap).join(', ') + '</li>');
				}
			}
		}

		output += '<span class="result">' + farmer + ' has completed ' + completed + ' of the ' + goal_count +
				' Monster Eradication goals.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (completed >= goal_count) ? getAchieveString('Protector of the Valley', 'all monster goals', 1) :
				getAchieveString('Protector of the Valley', 'all monster goals', 0) + (goal_count - completed) + ' more';
		output += '</li></ul>\n';
		if (need.length > 0) {
			output += '<span class="need">Goals left:<ol>' + need.sort().join('') + '</ol></span>\n';
		}
		table.push(output);
		return table;
	}

	function parseQuests(xmlDoc, saveInfo) {
		var output = '<h3>Quests</h3>\n',
			table = [];
			
		table[0] = parsePlayerQuests($(xmlDoc).find('SaveGame > player'), saveInfo);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerQuests(this, saveInfo));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}

	function parsePlayerQuests(player, saveInfo) {
		var output = '',
			count;
			
		if (compareSemVer(saveInfo.version, "1.3") >= 0) {
			count = Number($(player).find('stats > questsCompleted').text());
		} else {
			// In 1.2, stats are under the root SaveGame so we must go back up the tree
			count = Number($(player).parent().find('stats > questsCompleted').text());
		}

		output += '<span class="result">' + $(player).children('name').html() + ' has completed ' + count + ' "Help Wanted" quest(s).</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (count >= 10) ? getAchieveString('Gofer', 'complete 10 quests', 1) :
				getAchieveString('Gofer', 'complete 10 quests', 0) + (10 - count) + ' more';
		output += '</li>\n<li>';
		output += (count >= 40) ? getAchieveString('A Big Help', 'complete 40 quests', 1) :
				getAchieveString('A Big Help', 'complete 40 quests', 0) + (40 - count) + ' more';
		output += '</li></ul>\n';
		return [output];
	}

	function parseStardrops(xmlDoc, saveInfo) {
		/* mailReceived identifiers from decompiled source of StardewValley.Utility.foundAllStardrops()
		 * descriptions are not from anywhere else and are just made up. */
		var output = '<h3>Stardrops</h3>\n',
			table = [],
			stardrops = {
				'CF_Fair': 'Purchased at the Fair for 2000 star tokens.',
				'CF_Mines': 'Found in the chest on mine level 100.',
				'CF_Spouse': 'Given by NPC spouse at 13.5 hearts (3375 points).',
				'CF_Sewer': 'Purchased from Krobus in the Sewers for 20,000g.',
				'CF_Statue': 'Received from Old Master Cannoli in the Secret Woods.',
				'CF_Fish': 'Mailed by Willy after Master Angler achievement.',
				'museumComplete': 'Reward for completing the Museum collection.'
			};
			
		table[0] = parsePlayerStardrops($(xmlDoc).find('SaveGame > player'), saveInfo, stardrops);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerStardrops(this, saveInfo, stardrops));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}

	function parsePlayerStardrops(player, saveInfo, stardrops) {
		var output = '',
			count = 0,
			id,
			need = [],
			received = {},
			stardrop_count = Object.keys(stardrops).length;

		$(player).find('mailReceived > string').each(function () {
			var id = $(this).text();
			if (stardrops.hasOwnProperty(id)) {
				count++;
				received[id] = 1;
			}
		});
		for (id in stardrops) {
			if (stardrops.hasOwnProperty(id)) {
				if (!received.hasOwnProperty(id)) {
					need.push('<li>' + stardrops[id] + '</li>');
				}
			}
		}

		output += '<span class="result">' + $(player).children('name').html() + ' has received ' + count +
				' of ' + stardrop_count + ' stardrops.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (count >= stardrop_count) ? getAchieveString('Mystery Of The Stardrops', 'find every stardrop', 1) :
				getAchieveString('Mystery Of The Stardrops', 'find every stardrop', 0) + (stardrop_count - count) + ' more';
		output += '</li></ul>\n';
		if (need.length > 0) {
			output += '<span class="need">Stardrops left:<ol>' + need.sort().join('') + '</ol></span>\n';
		}
		return [output];
	}

	function parseGrandpa(xmlDoc, saveInfo) {
		// Scoring details from StardewValley.Utility.getGradpaScore() & getGrandpaCandlesFromScore()
		var output = '<h3>Grandpa\'s Evaluation</h3>\n',
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
			hasRustyKey = $(xmlDoc).find('player > hasRustyKey').text(),
			hasSkullKey = $(xmlDoc).find('player > hasSkullKey').text(),
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
		$(xmlDoc).find('player > eventsSeen > int').each(function () {
			if ($(this).text() === '191393') {
				cc_done = 1;
			}
		});
		if (cc_done) {
			count += 3;
		} else {
			$(xmlDoc).find('player > mailReceived > string').each(function () {
				var id = $(this).text();
				if (id === 'JojaMember') {
					isJojaMember = 1;
				} else if (ccRooms.hasOwnProperty(id)) {
					cc_have++;
				}
			});
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
			if ($(this).attr(saveInfo.ns_prefix + ':type') === 'Cat' || $(this).attr(saveInfo.ns_prefix + ':type') === 'Dog') {
				hasPet = 1;
				petLove = Number($(this).find('friendshipTowardFarmer').text());
			}
		});
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
		output += '<span class="result">' + farmer + ' has earned a total of ' + count +
				' point(s) (details below); the maximum possible is ' + max_count + ' points.</span><br />\n';
		output += '<span class="result">The shrine has ' + currentCandles + ' candle(s) lit. The next evaluation will light ' +
				candles + ' candle(s).</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (candles >= max_candles) ? getMilestoneString('Four candle evaluation', 1) :
				getMilestoneString('Four candle evaluation', 0) + (12 - count) + ' more point(s)';
		output += '</li></ul>\n';

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
				' of the ' + ach_count + ' relevant achievments.</span><br />\n';
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

		if (hasPet) {
			output += '<span class="result">' + farmer + ' has a pet with ' + petLove + ' friendship points.</span><br />\n';
		} else {
			need = ' a pet and ';
			output += '<span class="result">' + farmer + ' does not have a pet.</span><br />\n';
		}
		output += '<ul class="ach_list"><li>';
		output += (petLove >= 999) ? getPointString(1, 'pet with at least 999 friendship points', 0, 1) :
				getPointString(1, 'pet with at least 999 friendship points', 0, 0) + ' -- need ' +
				need + (999 - petLove) + ' friendship points';
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
		output += '</li></ul>\n';

		return output;
	}

	function parseBundles(xmlDoc, saveInfo) {
		// Bundle info from Data\Bundles.xnb & StardewValley.Locations.CommunityCenter class
		var output = '<h3>Community Center / Joja Community Development</h3>\n',
			farmer = $(xmlDoc).find('player > name').html(),
			isJojaMember = 0,
			room = {
				0: {
					'name': 'Pantry',
					'bundles': {
						0: 'Spring Crops',
						1: 'Summer Crops',
						2: 'Fall Crops',
						3: 'Quality Crops',
						4: 'Animal',
						5: 'Artisan'
					}
				},
				1: {
					'name': 'Crafts Room',
					'bundles': {
						13: 'Spring Foraging',
						14: 'Summer Foraging',
						15: 'Fall Foraging',
						16: 'Winter Foraging',
						17: 'Construction',
						19: 'Exotic Foraging'
					}
				},
				2: {
					'name': 'Fish Tank',
					'bundles': {
						6: 'River Fish',
						7: 'Lake Fish',
						8: 'Ocean Fish',
						9: 'Night Fishing',
						10: 'Specialty Fish',
						11: 'Crab Pot'
					}
				},
				3: {
					'name': 'Boiler Room',
					'bundles': {
						20: "Blacksmith's",
						21: "Geologist's",
						22: "Adventurer's"
					}
				},
				4: {
					'name': 'Vault',
					'bundles': {
						23: ' 2,500g',
						24: ' 5,000g',
						25: '10,000g',
						26: '25,000g'
					}
				},
				5: {
					'name': 'Bulletin Board',
					'bundles': {
						31: "Chef's",
						32: 'Field Research',
						33: "Enchanter's",
						34: 'Dye',
						35: 'Fodder'
					}
				}
			},
			bundleHave = {},
			bundleCount = { // number of items in each bundle
				0: 4,
				1: 4,
				2: 4,
				3: 3,
				4: 5,
				5: 6,
				6: 4,
				7: 4,
				8: 4,
				9: 3,
				10: 4,
				11: 5,
				13: 4,
				14: 3,
				15: 4,
				16: 4,
				17: 4,
				19: 5,
				20: 3,
				21: 4,
				22: 2,
				23: 1,
				24: 1,
				25: 1,
				26: 1,
				31: 6,
				32: 4,
				33: 4,
				34: 6,
				35: 3
			},
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
			temp,
			bundleNeed = [],
			need = [],
			ccLoc = $(xmlDoc).find("locations > GameLocation[" + saveInfo.ns_prefix + "\\:type='CommunityCenter']");

		// First check basic completion
		r = 0;
		$(ccLoc).find('areasComplete > boolean').each(function () {
			if ($(this).text() === 'true') {
				ccHave++;
				done[r] = 1;
			}
			r++;
		});
		// Now look at bundles. Getting an item count but not which items are placed
		$(ccLoc).find('bundles > item').each(function () {
			id = $(this).find('key > int').text();
			bundleHave[id] = 0;
			$(this).find('ArrayOfBoolean > boolean').each(function () {
				if ($(this).text() === 'true') {
					bundleHave[id]++;
				}
			});
		});
		$(xmlDoc).find('player > mailReceived > string').each(function () {
			var id = $(this).text();
			if (id === 'JojaMember') {
				isJojaMember = 1;
			} else if (jojaMail.hasOwnProperty(id)) {
				jojaHave++;
				done[jojaMail[id]] = 1;
			}
		});
		if (ccHave > 0 && isJojaMember) {
			hybrid = 1;
		}
		hybridLeft = jojaCount - ccHave;
		if (done.hasOwnProperty(ccMail.ccBulletin)) {
			hybridLeft++;
		}
		eventToCheck = (isJojaMember) ? jojaEvent : ccEvent;
		$(xmlDoc).find('player > eventsSeen > int').each(function () {
			if ($(this).text() === eventToCheck) {
				hasSeenCeremony = 1;
			}
		});

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
								if (room.hasOwnProperty(r)) {
									for (b in room[r].bundles) {
										if (room[r].bundles.hasOwnProperty(b)) {
											if (bundleHave[b] < bundleCount[b]) {
												bundleNeed.push('<li>' + room[r].bundles[b] + ' Bundle -- ' +
													(bundleCount[b] - bundleHave[b]) + ' more item(s)</li>');
											}
										}
									}
								}
								need.push('<li> ' + wikify(room[r].name, 'Bundles') + '<ol>' + bundleNeed.sort().join('') + '</ol></li>');
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
			output += '</li></ul>\n';
		}
		if (need.length > 0) {
			output += '<span class="need">Left to do:<ol>' + need.sort().join('') + '</ol></span>\n';
		}

		return output;
	}

	function parseSecretNotes(xmlDoc, saveInfo) {
		var output = '<h3>Secret Notes</h3>\n',
			table = [],
			hasStoneJunimo = false;
		
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
				hasStoneJunimo = true;
				return false;
			}
		});
		if (!hasStoneJunimo) {
			$(xmlDoc).find('Object > name').each(function () {
				if ($(this).text() === "Stone Junimo") {
					var loc = $(this).parents('GameLocation').children('name').text();
					if (loc === 'Town') {
						var x = $(this).parents('item').find('key > Vector2 > X').text();
						var y = $(this).parents('item').find('key > Vector2 > Y').text();
						if (x !== '57' || y !== '16') {
							hasStoneJunimo = true;
							return false;
						}
					} else {
						hasStoneJunimo = true;
						return false;
					}
				}
			});
		}
		
		table[0] = parsePlayerSecretNotes($(xmlDoc).find('SaveGame > player'), saveInfo, hasStoneJunimo);
		if (saveInfo.numPlayers > 1) {
			$(xmlDoc).find('farmhand').each(function () {
				if (isValidFarmhand(this)) {
					table.push(parsePlayerSecretNotes(this, saveInfo, hasStoneJunimo));
				}
			});
		}
		output += printTranspose(table);
		return output;
	}

	function parsePlayerSecretNotes(player, saveInfo, hasStoneJunimo) {
		var output = '',
			table = [],
			farmer = $(player).children('name').html(),
			hasSeenKrobus = false,
			hasMagnifyingGlass = ($(player).children('hasMagnifyingGlass').text() === 'true'),
			isJojaMember = false,
			notes = {},
			need = [],
			rewards = {},
			reward_skip = {},
			found_notes = 0,
			found_rewards = 0,
			note_count = 23,
			reward_start = 13,
			reward_count = note_count - reward_start + 1,
			reward_re,
			i;

		if (compareSemVer(saveInfo.version, "1.4") >= 0) {
			note_count = 25;
			reward_count = 12;
			reward_skip[24] = true;
		}
		// Check Krobus event, then check for magnifier, then check number of notes
		// Also checking for one of the reward events here, so don't use "return false" to end early.
		$(player).find('eventsSeen > int').each(function () {
			if ($(this).text() === '520702') {
				hasSeenKrobus = true;
			} else if ($(this).text() === '2120303') {
				rewards[23] = true;
				found_rewards++;
			}
		});
		output += '<span class="result">' + farmer + ' has ' + (hasSeenKrobus ? '' : 'not ') + ' seen Krobus at the Bus Stop.</span><br />\n';
		output += '<span class="result">' + farmer + ' has ' + (hasMagnifyingGlass ? '' : 'not ') + ' found the Magnifying Glass.</span><br />\n';
		$(player).find('secretNotesSeen > int').each(function () {
			notes[$(this).text()] = true;
			found_notes++;
		});
		output += '<span class="result">' + farmer + ' has read ' + found_notes + ' of ' +
			note_count + ' secret notes.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (found_notes >= note_count) ? getMilestoneString('Read all the secret notes', 1) :
				getMilestoneString('Read all the secret notes', 0) + (note_count - found_notes) + ' more';
		output += '</li></ul>\n';
		if (found_notes < note_count) {
			for (i = 1; i <= note_count; i++) {
				if (!notes.hasOwnProperty(i)) {
					need.push('<li>' + wikify('Secret Note ' + i, 'Secret Notes') + '</li>');
				}
			}
			if (need.length > 0) {
				output += '<span class="need">Left to read:<ol>' + need.join('') + '</ol></span>\n';
			}
		}
		table.push(output);
		// Most rewards are noted by SecretNoteXX_done mail items. The one for note 21 starts with lower-case s though.
		reward_re = new RegExp('[Ss]ecretNote(\\d+)_done');
		$(player).find('mailReceived > string').each(function () {
			var match = reward_re.exec($(this).text());
			if (match !== null) {
				rewards[match[1]] = true;
				found_rewards++;
			} else if ($(this).text() === 'gotPearl') {
				rewards[15] = true;
				found_rewards++;
			} else if ($(this).text() === 'junimoPlush') {
				rewards[13] = true;
				found_rewards++;
			} else if ($(this).text() === 'TH_Tunnel') {
				// Qi quest we just check for the start. Full completion is 'TH_Lumberpile'
				rewards[22] = true;
				found_rewards++;
			} else if ($(this).text() === 'carolinesNecklace') {
				rewards[25] = true;
				found_rewards++;
			} else if ($(this).text() === 'JojaMember') {
				isJojaMember = true;
			}
		});
		// Stone Junimo not available for Joja route. We silently remove it from the list, which isn't optimal
		if (isJojaMember) {
			reward_count--;
			reward_skip[14] = true;
		} else if (hasStoneJunimo) {
			rewards[14] = true;
			found_rewards++;
		}
			
		output = '<span class="result">' + farmer + ' has found the rewards from  ' + found_rewards + ' of ' +
			reward_count + ' secret notes.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (found_rewards >= reward_count) ? getMilestoneString('Find all the secret note rewards', 1) :
				getMilestoneString('Find all the secret note rewards', 0) + (reward_count - found_rewards) + ' more';
		output += '</li></ul>\n';
		if (found_rewards < reward_count) {
			need = [];
			for (i = reward_start; i <= note_count; i++) {
				if (!reward_skip.hasOwnProperty(i) && !rewards.hasOwnProperty(i)) {
					need.push('<li> Reward from ' + wikify('Secret Note ' + i, 'Secret Notes') + '</li>');
				}
			}
			if (need.length > 0) {
				output += '<span class="need">Left to find:<ol>' + need.join('') + '</ol></span>\n';
			}
		}
		table.push(output);
		return table;
	}

	function createTOC() {
		var text,
			id,
			list = "<ul>";
		$("h2, h3").each(function () {
			if ($(this).is(":visible")) {
				text = $(this).text();
				id = 'sec_' + text.toLowerCase();
				id = id.replace(/[^\w*]/g, '_');
				$(this).attr('id', id);
				list += '<li><a href="#' + id + '">' + text + '</a></li>\n';
			}
		});
		list += '</ul>';
		document.getElementById('TOC-details').innerHTML = list;
	}

	function togglePlayer(e) {
		console.log("Somebody clicked on " + $(e.currentTarget).attr('id') + " which has a class of " + $(e.currentTarget).attr('class'));
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
				var p = 20 + (e.loaded / e.total * 60);
				prog.value = p;
			}
		};
		reader.onload = function (e) {
			var output = "",
				xmlDoc = $.parseXML(e.target.result),
				saveInfo = {};

			output += parseSummary(xmlDoc, saveInfo);
			output += parseMoney(xmlDoc, saveInfo);
			output += parseSkills(xmlDoc, saveInfo);
			output += parseQuests(xmlDoc, saveInfo);
			output += parseMonsters(xmlDoc, saveInfo);
			output += parseStardrops(xmlDoc, saveInfo);
			output += parseFamily(xmlDoc, saveInfo);
			output += parseSocial(xmlDoc, saveInfo);
			output += parseCooking(xmlDoc, saveInfo);
			output += parseCrafting(xmlDoc, saveInfo);
			output += parseFishing(xmlDoc, saveInfo);
			output += parseBasicShipping(xmlDoc, saveInfo);
			output += parseCropShipping(xmlDoc, saveInfo);
			output += parseMuseum(xmlDoc, saveInfo);
			output += parseSecretNotes(xmlDoc, saveInfo);
			output += parseBundles(xmlDoc, saveInfo);
			output += parseGrandpa(xmlDoc, saveInfo);

			// End of checks
			prog.value = 100;
			document.getElementById('out').innerHTML = output;
			$('#output-container').show();
			$('#progress-container').hide();
			createTOC();
			$('#TOC').show();
		};
		reader.readAsText(file);
	}
	document.getElementById('file_select').addEventListener('change', handleFileSelect, false);

	function toggleVisible(evt) {
		var t = evt.target;
		if ($(t).next().is(':visible')) {
			$(t).next().hide();
			$(t).html("Show");
		} else {
			$(t).next().show();
			$(t).html("Hide");
		}
	}
	
	$('.collapsible').each(function() {
		$(this).children('button').click(toggleVisible);
	});
};