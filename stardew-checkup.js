/* stardew-checkup.js
 * https://mouseypounds.github.io/stardew-checkup/
 */

/*jslint indent: 4, maxerr: 50, passfail: false, browser: true, todo: true, plusplus: true */
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
		// from Jamie Taylor. See https://stackoverflow.com/questions/3883342/add-commas-to-a-number-in-jquery
		return x.toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, ",");
	}

	function getAchieveString(name, desc, yes) {
		var r = (yes) ? '<span class="ach_yes"><span class="ach">' + name + '</span> Achievement (' + desc + ') requirements met</span>' :
					'<span class="ach_no"><span class="ach">' + name + '</span> Achievement (' + desc + ') requirements not met</span> -- need ';
		return r;
	}

	function getMilestoneString(desc, yes) {
		var r = (yes) ? '<span class="ms_yes">' + desc + ' <span class="ach">(no associated achievement)</span> requirements met</span>' :
					'<span class="ms_no">' + desc + ' <span class="ach">(no associated achievement)</span> requirements not met</span> -- need ';
		return r;
	}

	function getPointString(pts, desc, cum, yes) {
		var c = (cum) ? ' more' : '',
			r = (yes) ? '<span class="pt_yes"><span class="pts">+' + pts + c + '</span> has been earned for ' + desc + '</span>' :
					'<span class="pt_no"><span class="pts"> (' + pts + c + ')</span> could be earned for ' + desc + '</span>';
		return r;
	}

	// Individual chunks of save parsing.
	// Each receives the xmlDoc object to parse and returns HTML to output.
	function parseSummary(xmlDoc) {
		var output = '<h3>Summary</h3>\n',
			seasons = ['Spring', 'Summer', 'Fall', 'Winter'],
			farmTypes = ['Standard', 'Riverland', 'Forest', 'Hill-top', 'Wilderness'],
			playTime = Number($(xmlDoc).find('player > millisecondsPlayed').text()),
			playHr = Math.floor(playTime / 36e5),
			playMin = Math.floor((playTime % 36e5) / 6e4);

		// Farmer & farm names are read as html() because they come from user input and might contain characters
		// which must be escaped. This will happen with child names later too.
		output += '<span class="result">Farmer ' + $(xmlDoc).find('player > name').html() + ' of '
			+ $(xmlDoc).find('player > farmName').html() + ' Farm ('
			+ farmTypes[$(xmlDoc).find('whichFarm').text()] + ')</span><br />\n';
		output += '<span class="result">Day ' + $(xmlDoc).find('player > dayOfMonthForSaveGame').text() + ' of '
			+ seasons[$(xmlDoc).find('player > seasonForSaveGame').text()] + ', Year '
			+ $(xmlDoc).find('player > yearForSaveGame').text() + '</span><br />\n';
		// Playtime of < 1 min will be blank.
		output += '<span class="result">Played for ';
		if (playHr > 0) {
			output += playHr + ' hr ';
		}
		if (playMin > 0) {
			output += playMin + ' min ';
		}
		output += '</span><br />\n';
		return output;
	}

	function parseMoney(xmlDoc) {
		var output = '<h3>Money</h3>\n',
			money = Number($(xmlDoc).find('player > totalMoneyEarned').text());

		output += '<span class="result">' + $(xmlDoc).find('player > name').html() + ' has earned a total of ' + addCommas(money) + 'g.</span><br />\n';
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
		return output;
	}

	function parseSocial(xmlDoc) {
		var output = '<h3>Social</h3>\n',
			count_5h = 0,
			count_10h = 0,
			farmer = $(xmlDoc).find('player > name').html();

		$(xmlDoc).find('player > friendships > item').each(function () {
			//var who = $(this).find('key > string').text(),
			var num = $(this).find('value > ArrayOfInt > int').first().text();
			if (num >= 2500) { count_10h++; }
			if (num >= 1250) { count_5h++; }
			// TODO: check for maxed out hearts on everyone
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
		output += '<span class="result">' + farmer + ' has ' + count_10h + ' relationships of 10+ hearts.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (count_10h >= 1) ? getAchieveString('Best Friends', '10&#x2665; with 1 person', 1) :
				getAchieveString('Best Friends', '10&#x2665; with 1 person', 0) + (1 - count_10h) + ' more';
		output += '</li>\n<li>';
		output += (count_10h >= 8) ? getAchieveString('The Beloved Farmer', '10&#x2665; with 8 people', 1) :
				getAchieveString('The Beloved Farmer', '10&#x2665; with 8 people', 0) + (8 - count_10h) + ' more';
		output += '</li></ul>\n';
		return output;
	}

	function parseFamily(xmlDoc) {
		var output = '<h3>Home and Family</h3>\n',
			spouse = '(None)',
			needs = [],
			count = 0,
			result = $(xmlDoc).find('player > spouse'),
			children = '(None)',
			child_name = [],
			houseUpgrades = $(xmlDoc).find('player > houseUpgradeLevel').text();
		if (result.length > 0) {
			spouse = result.text();
			count++;
		} else {
			needs.push('Spouse');
		}
		output += '<span class="result">Spouse: ' + spouse + '</span><br />\n';
		// not sure how to get the [] attribute selectors to recognize xsi:type as valid attribute name, so working around it
		$(xmlDoc).find('locations > GameLocation > Characters > NPC').each(function () {
			if ($(this).attr('xsi:type') === 'Child') {
				count++;
				child_name.push($(this).find('name').html());
			}
		});
		if (child_name.length) {
			children = child_name.join(', ');
			if (child_name.length === 1) {
				needs.push("1 child");
			}
		} else {
			needs.push("2 children");
		}
		output += '<span class="result">Children: ' + children + '</span><ul class="ach_list"><li>\n';
		output += (count >= 3) ? getAchieveString('Full House', 'Married + 2 kids', 1) :
				getAchieveString('Full House', 'Married + 2 kids', 0) + needs.join(' and ');
		output += '</li></ul>\n';

		output += '<span class="result">Farmhouse has been upgraded ' + houseUpgrades + ' time(s); 3 upgrades are possible.</span><br /><ul class="ach_list">\n';
		output += '<li>';
		output += (houseUpgrades >= 1) ? getAchieveString('Moving Up', '1 upgrade', 1) :
				getAchieveString('Moving Up', '1 upgrade', 0) + (1 - houseUpgrades) + ' more';
		output += '</li>\n<li>';
		output += (houseUpgrades >= 2) ? getAchieveString('Living Large', '2 upgrades', 1) :
				getAchieveString('Living Large', '2 upgrades', 0) + (2 - houseUpgrades) + ' more';
		output += '</li>\n<li>';
		output += (houseUpgrades >= 3) ? getMilestoneString('House fully upgraded', 1) :
				getMilestoneString('House fully upgraded', 0) + (3 - houseUpgrades) + ' more';
		output += '</li></ul>\n';
		return output;
	}

	function parseCooking(xmlDoc) {
		/* cookingRecipes is keyed by name, but recipesCooked is keyed by ObjectInformation ID.
		 * Also, some cookingRecipes names are different from the names in ObjectInformation (e.g. Cookies vs Cookie) */
		var output = '<h3>Cooking</h3>\n',
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
			recipe_count = Object.keys(recipes).length,
			recipeTranslate = {
				"Cheese Cauli.": "Cheese Cauliflower",
				"Cookies": "Cookie",
				"Cran. Sauce": "Cranberry Sauce",
				"Dish o' The Sea": "Dish O' The Sea",
				"Eggplant Parm.": "Eggplant Parmesan",
				"Vegetable Stew": "Vegetable Medley"
			},
			known = {},
			known_count = 0,
			crafted = {},
			craft_count = 0,
			need_k = [],
			need_c = [],
			id,
			r;

		$(xmlDoc).find('player > cookingRecipes > item').each(function () {
			var id = $(this).find('key > string').text(),
				num = $(this).find('value > int').text();
			if (recipeTranslate.hasOwnProperty(id)) {
				id = recipeTranslate[id];
			}
			known[id] = num;
			known_count++;
		});
		$(xmlDoc).find('player > recipesCooked > item').each(function () {
			var id = $(this).find('key > int').text(),
				num = $(this).find('value > int').text();
			// Do we need to check that num>0?
			crafted[recipes[id]] = num;
			craft_count++;
		});

		output += '<span class="result">' + $(xmlDoc).find('player > name').html() + ' knows ' + known_count + ' recipe(s) and has cooked ' +
			craft_count + ' of them; there are ' + recipe_count + ' total recipes.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (craft_count >= 10) ? getAchieveString('Cook', 'cook 10 different recipes', 1) :
				getAchieveString('Cook', 'cook 10 different recipes', 0) + (10 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 25) ? getAchieveString('Sous Chef', 'cook 25 different recipes', 1) :
				getAchieveString('Sous Chef', 'cook 25 different recipes', 0) + (25 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= recipe_count) ? getAchieveString('Gourmet Chef', 'cook every recipe', 1) :
				getAchieveString('Gourmet Chef', 'cook every recipe', 0) + (recipe_count - craft_count) + ' more';
		output += '</li></ul>\n';
		// We are assuming it is impossible to craft something without knowing the recipe.
		if (craft_count < recipe_count) {
			for (id in recipes) {
				if (recipes.hasOwnProperty(id)) {
					r = recipes[id];
					if (!known.hasOwnProperty(r)) {
						need_k.push('<li>' + r + '</li>');
					} else if (!crafted.hasOwnProperty(r)) {
						need_c.push('<li>' + r + '</li>');
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
			output += '</ul></span>\n';
		}
		return output;
	}

	function parseCrafting(xmlDoc) {
		/* Manually listing all crafting recipes in the order they appear on http://stardewvalleywiki.com/Crafting
		 * A translation is needed again because of text mismatch. */
		var output = '<h3>Crafting</h3>\n',
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
			recipe_count = recipes.length,
			recipeTranslate = {
				"Oil Of Garlic": "Oil of Garlic"
			},
			known = {},
			known_count = 0,
			craft_count = 0,
			need_k = [],
			need_c = [],
			id,
			r;

		$(xmlDoc).find('player > craftingRecipes > item').each(function () {
			var id = $(this).find('key > string').text(),
				num = $(this).find('value > int').text();
			if (recipeTranslate.hasOwnProperty(id)) {
				id = recipeTranslate[id];
			}
			known[id] = num;
			known_count++;
			if (num > 0) {
				craft_count++;
			} else {
				need_c.push('<li>' + id + '</li>');
			}
		});

		output += '<span class="result">' + $(xmlDoc).find('player > name').html() + ' knows ' + known_count + ' recipe(s) and has crafted ' +
				craft_count + ' of them; there are ' + recipe_count + ' total recipes.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (craft_count >= 15) ? getAchieveString('D.I.Y.', 'craft 15 different items', 1) :
				getAchieveString('D.I.Y.', 'craft 15 different items', 0) + (15 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 30) ? getAchieveString('Artisan', 'craft 30 different items', 1) :
				getAchieveString('Artisan', 'craft 30 different items', 0) + (30 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= recipe_count) ? getAchieveString('Craft Master', 'craft every item', 1) :
				getAchieveString('Craft Master', 'craft every item', 0) + (recipe_count - craft_count) + ' more';
		output += '</li></ul>\n';
		if (craft_count < recipe_count) {
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
							need_k.push('<li>' + r + '</li>');
						}
					}
				}
				output += '<li>Unknown Recipes<ol>' + need_k.sort().join('') + '</ol></li>';
			}
			output += '</ul></span>\n';
		}
		return output;
	}

	function parseFishing(xmlDoc) {
		// Note, Clam (372) will show up in the save, but it is category "Basic -23" and is ignored for achievements.
		var output = '<h3>Fishing</h3>\n',
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
			},
			recipe_count = Object.keys(recipes).length,
			count = 0,
			craft_count = 0, // for fish types
			known = [],
			need = [],
			id,
			r;

		$(xmlDoc).find('player > fishCaught > item').each(function () {
			var id = $(this).find('key > int').text(),
				num = Number($(this).find('value > ArrayOfInt > int').first().text());
			if (id !== '372' && num > 0) {
				craft_count++;
				// We are adding up the count ourselves, but the total is also stored in (stats > fishCaught) and (stats > FishCaught)
				count += num;
				known[recipes[id]] = num;
			}
		});

		output += '<span class="result">' + $(xmlDoc).find('player > name').html() + ' has caught ' + count + ' total fish of ' + craft_count +
				' different type(s); there are ' + recipe_count + ' total types.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (count >= 100) ? getAchieveString('Mother Catch', 'catch 100 fish', 1) :
				getAchieveString('Mother Catch', 'catch 100 fish', 0) + (100 - count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 10) ? getAchieveString('Fisherman', 'catch 10 different fish', 1) :
				getAchieveString('Fisherman', 'catch 10 different fish', 0) + (10 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 24) ? getAchieveString('Ol\' Mariner', 'catch 24 different fish', 1) :
				getAchieveString('Ol\' Mariner', 'catch 24 different fish', 0) + (24 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= recipe_count) ? getAchieveString('Master Angler', 'catch every fish', 1) :
				getAchieveString('Master Angler', 'catch every fish', 0) + (recipe_count - craft_count) + ' more';
		output += '</li></ul>\n';
		if (craft_count < recipe_count) {
			need = [];
			for (id in recipes) {
				if (recipes.hasOwnProperty(id)) {
					r = recipes[id];
					if (!known.hasOwnProperty(r)) {
						need.push('<li>' + r + '</li>');
					}
				}
			}
			output += '<span class="need">Left to catch:<ol>' + need.sort().join('') + '</ol></span>\n';
		}
		return output;
	}

	function parseBasicShipping(xmlDoc) {
		/* Basic shipping achieve details are not easy to pull from decompiled source -- lots of filtering of
		 * ObjectInformation in StardewValley.Utility.hasFarmerShippedAllItems() with additional calls to
		 * StardewValley.Object.isPotentialBasicShippedCategory().
		 * For now, we will simply assume it matches the Collections page and hardcode everything there
		 * using wiki page http://stardewvalleywiki.com/Collections as a guideline. */
		var output = '<h3>Basic Shipping</h3>\n',
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
				438: "L. Goat Milk",
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
			},
			recipe_count = Object.keys(recipes).length,
			crafted = {},
			craft_count = 0,
			need = [],
			id,
			r;

		$(xmlDoc).find('player > basicShipped > item').each(function () {
			var id = $(this).find('key > int').text(),
				num = $(this).find('value > int').text();
			if (recipes.hasOwnProperty(id) && num > 0) {
				crafted[recipes[id]] = num;
				craft_count++;
			}
		});

		output += '<span class="result">' + $(xmlDoc).find('player > name').html() + ' has shipped ' + craft_count +
				' basic item(s); there are ' + recipe_count + ' total items.</span><ul class="ach_list">\n';
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
						need.push('<li>' + r + '</li>');
					}
				}
			}
			output += '<span class="need">Left to ship:<ol>' + need.sort().join('') + '</ol></span>\n';
		}
		return output;
	}

	function parseCropShipping(xmlDoc) {
		// Relevant IDs were pulled from decompiled source - StardewValley.Stats.checkForShippingAchievments()
		// Note that there are 5 more "crops" for Monoculture than there are for Polyculture
		var output = '<h3>Crop Shipping</h3>\n',
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
			recipe_count = Object.keys(poly_crops).length,
			mono_extras = {
				// Ancient Fruit and 4 of the "Basic -80" flowers
				454: "Ancient Fruit",
				591: "Tulip",
				593: "Summer Spangle",
				595: "Fairy Rose",
				597: "Blue Jazz"
			},
			crafted = {},
			craft_count = 0,
			max_ship = 0,
			max_crop = "of any crop",
			need = [],
			id,
			r,
			n,
			farmer = $(xmlDoc).find('player > name').html();

		$(xmlDoc).find('player > basicShipped > item').each(function () {
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
		output += '<span class="result">' + farmer + ' has shipped 15 or more of each of ' + craft_count +
				' different crop(s); there are ' + recipe_count + ' total crops.</span><ul class="ach_list">\n<li>';
		output += (craft_count >= recipe_count) ? getAchieveString('Polyculture', 'ship 15 of each crop', 1) :
				getAchieveString('Polyculture', 'ship 15 of each crop', 0) + ' more of ' + (recipe_count - craft_count) + ' crops';
		output += '</li></ul>\n';
		if (craft_count < recipe_count) {
			need = [];
			for (id in poly_crops) {
				if (poly_crops.hasOwnProperty(id)) {
					r = poly_crops[id];
					if (!crafted.hasOwnProperty(r)) {
						need.push('<li>' + r + ' (15 more)</li>');
					} else {
						n = Number(crafted[r]);
						if (n < 15) {
							need.push('<li>' + r + ' (' + (15 - n) + ' more)</li>');
						}
					}
				}
			}
			output += '<span class="need">Left to ship:<ol>' + need.sort().join('') + '</ol></span>\n';
		}
		return output;
	}

	function parseSkills(xmlDoc) {
		var output = '<h3>Skills</h3>\n',
			skills = ["Farming", "Fishing",	"Foraging",	"Mining", "Combat"],
			xp = {},
			i = 0,
			num,
			count = 0,
			need = [];

		$(xmlDoc).find('player > experiencePoints > int').each(function () {
			// We need to skip the unused 6th entry (Luck)
			if (i < 5) {
				num = Number($(this).text());
				xp[skills[i]] = num;
				if (num < 15000) {
					need.push('<li>' + skills[i] + ' (' + (15000 - num) + ' more xp)</li>\n');
				} else {
					count++;
				}
				i++;
			}
		});


		output += '<span class="result">' + $(xmlDoc).find('player > name').html() + ' has reached level 10 in ' + count + ' skills.</span><br />\n';
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

		return output;
	}

	function parseMuseum(xmlDoc) {
		var output = '<h3>Museum Collection</h3>\n',
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
				126: "Strange Doll (Green)",
				127: "Strange Doll (Yellow)",
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
			artifact_count = Object.keys(artifacts).length,
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
			mineral_count = Object.keys(minerals).length,
			museum_count = artifact_count + mineral_count,
			donated = {},
			donated_art = 0,
			donated_min = 0,
			donated_count = 0,
			found = {},
			found_art = 0,
			found_min = 0,
			need_art = [],
			need_min = [],
			id,
			r,
			farmer = $(xmlDoc).find('player > name').html();

		$(xmlDoc).find('player > archaeologyFound > item').each(function () {
			var id = $(this).find('key > int').text(),
				num = Number($(this).find('value > ArrayOfInt > int').first().text());
			if (artifacts.hasOwnProperty(id) && num > 0) {
				found[id] = num;
				found_art++;
			}
		});
		$(xmlDoc).find('player > mineralsFound > item').each(function () {
			var id = $(this).find('key > int').text(),
				num = Number($(this).find('value > int').text());
			if (minerals.hasOwnProperty(id) && num > 0) {
				found[id] = num;
				found_min++;
			}
		});
		$(xmlDoc).find('locations > GameLocation').each(function () {
			if ($(this).attr('xsi:type') === 'LibraryMuseum') {
				$(this).find('museumPieces > item').each(function () {
					var id = $(this).find('value > int').text();
					if (artifacts.hasOwnProperty(id)) {
						donated_art++;
						donated[id] = 1;
					} else if (minerals.hasOwnProperty(id)) {
						donated_min++;
						donated[id] = 1;
					}
				});
			}
		});

		donated_count = donated_art + donated_min;
		output += '<span class="result">' + farmer + ' has found ' + found_art + ' artifact(s) and has donated ' +
			donated_art + ' of them; there are ' + artifact_count + ' total artifacts.</span><br />\n';
		output += '<span class="result">' + farmer + ' has found ' + found_min + ' mineral(s) and has donated ' +
			donated_min + ' of them; there are ' + mineral_count + ' total minerals.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (donated_count >= 40) ? getAchieveString('Treasure Trove', 'donate 40 items', 1) :
				getAchieveString('Treasure Trove', 'donate 40 items', 0) + (40 - donated_art - donated_min) + ' more';
		output += '</li>\n<li>';
		output += (donated_count >= museum_count) ? getAchieveString('A Complete Collection', 'donate every item', 1) :
				getAchieveString('A Complete Collection', 'donate every item', 0) + (museum_count - donated_count) + ' more';
		output += '</li>\n<li>';
		output += (found_art >= artifact_count) ? getMilestoneString('All artifacts found', 1) :
				getMilestoneString('All artifacts found', 0) + (artifact_count - found_art) + ' more';
		output += '</li>\n<li>';
		output += (found_min >= mineral_count) ? getMilestoneString('All minerals found', 1) :
				getMilestoneString('All minerals found', 0) + (mineral_count - found_min) + ' more';
		output += '</li></ul>\n';
		// The following assumes it is impossible for an item to be donated without being marked found
		if (donated_count < museum_count) {
			for (id in artifacts) {
				if (artifacts.hasOwnProperty(id)) {
					r = artifacts[id];
					if (!found.hasOwnProperty(id)) {
						need_art.push('<li>' + r + ' (needs to be found and donated)</li>');
					} else if (!donated.hasOwnProperty(id)) {
						need_art.push('<li>' + r + ' (needs to be donated)</li>');
					}
				}
			}
			for (id in minerals) {
				if (minerals.hasOwnProperty(id)) {
					r = minerals[id];
					if (!found.hasOwnProperty(id)) {
						need_min.push('<li>' + r + ' (needs to be found and donated)</li>');
					} else if (!donated.hasOwnProperty(id)) {
						need_min.push('<li>' + r + ' (needs to be donated)</li>');
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

		return output;
	}

	function parseMonsters(xmlDoc) {
		/* Conditions & details from decompiled source StardewValley.Locations.AdventureGuild.gil()
		 * Some monsters which may not currently be in game are included and we mimic that here too. */
		var output = '<h3>Monster Hunting</h3>\n',
			goals = {
				"Slimes": 1000,
				"Void Spirits": 150,
				"Bats": 200,
				"Skeletons": 50,
				"Cave Insects": 125,
				"Duggies": 30,
				"Dust Sprites": 500
			},
			goal_count = Object.keys(goals).length,
			categories = {
				"Green Slime": "Slimes",
				"Frost Jelly": "Slimes",
				"Sludge": "Slimes",
				"Shadow Brute": "Void Spirits",
				"Shadow Shaman": "Void Spirits",
				"Shadow Guy": "Void Spirits",
				"Bat": "Bats",
				"Frost Bat": "Bats",
				"Lava Bat": "Bats",
				"Skeleton": "Skeletons",
				"Skeleton Mage": "Skeletons",
				"Bug": "Cave Insects",
				"Fly": "Cave Insects",
				"Grub": "Cave Insects",
				"Duggy": "Duggies",
				"Dust Spirit": "Dust Sprites"
			},
			killed = [],
			completed = 0,
			need = [],
			id,
			mineLevel = Number($(xmlDoc).find('player > deepestMineLevel').text()),
			farmer = $(xmlDoc).find('player > name').html();

		if (mineLevel <= 0) {
			output += '<span class="result">' + farmer + ' has not yet explored the mines.</span><br />\n';
		} else {
			output += '<span class="result">' + farmer + ' has reached level ' + Math.min(mineLevel, 120) + ' of the mines';
			if (mineLevel > 120) {
				output += ' and level ' + (mineLevel - 120) + ' of the Skull Cavern';
			} else {
				output += ' but has not yet explored the Skull Cavern';
			}
			output += '.</span><ul class="ach_list"><li>\n';
		}
		output += (mineLevel >= 120) ? getAchieveString('The Bottom', 'reach mine level 120', 1) :
				getAchieveString('The Bottom', 'reach mine level 120', 0) + (120 - mineLevel) + ' more';
		output += '</li></ul>\n';

		$(xmlDoc).find('stats > specificMonstersKilled > item').each(function () {
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
						need.push('<li>' + id + ' (need ' + (goals[id] - killed[id]) + ' more)</li>');
					}
				} else {
					need.push('<li>' + id + ' (need ' + goals[id] + ' more)</li>');
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

		return output;
	}

	function parseQuests(xmlDoc) {
		var output = '<h3>Quests</h3>\n',
			count = Number($(xmlDoc).find('stats > QuestsCompleted').text());

		output += '<span class="result">' + $(xmlDoc).find('player > name').html() + ' has completed ' + count + ' "Help Wanted" quests.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (count >= 10) ? getAchieveString('Gofer', 'complete 10 quests', 1) :
				getAchieveString('Gofer', 'complete 10 quests', 0) + (10 - count) + ' more';
		output += '</li>\n<li>';
		output += (count >= 40) ? getAchieveString('A Big Help', 'complete 40 quests', 1) :
				getAchieveString('A Big Help', 'complete 40 quests', 0) + (40 - count) + ' more';
		output += '</li></ul>\n';
		return output;
	}

	function parseStardrops(xmlDoc) {
		/* mailReceived identifiers from decompiled source of StardewValley.Utility.foundAllStardrops()
		 * descriptions are made up on the fly. */
		var output = '<h3>Stardrops</h3>\n',
			count = 0,
			id,
			need = [],
			received = {},
			stardrops = {
				'CF_Fair': 'Purchased at the Stardew Valley Fair for 2000 star tokens.',
				'CF_Mines': 'Found in the chest on mine level 100.',
				'CF_Spouse': 'Randomly given by spouse at 13/12 hearts.',
				'CF_Sewer': 'Purchesed from Krobus in the Sewers for 20,000g.',
				'CF_Statue': 'Received from the Old Master Cannoli statue in the Secret Woods in excahnge for a Sweet Gem Berry.',
				'CF_Fish': 'Mailed by Willy after catching all the different fish.',
				'museumComplete': 'Reward for completing the Museum collection.'
			},
			stardrop_count = Object.keys(stardrops).length;

		$(xmlDoc).find('player > mailReceived > string').each(function () {
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

		output += '<span class="result">' + $(xmlDoc).find('player > name').html() + ' has received ' + count +
				' of the ' + stardrop_count + ' stardrops.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (count >= stardrop_count) ? getAchieveString('Mystery Of The Stardrops', 'find every stardrop', 1) :
				getAchieveString('Mystery Of The Stardrops', 'find every stardrop', 0) + (stardrop_count - count) + ' more';
		output += '</li></ul>\n';
		if (need.length > 0) {
			output += '<span class="need">Stardrops left:<ol>' + need.sort().join('') + '</ol></span>\n';
		}
		return output;
	}

	function parseGrandpa(xmlDoc) {
		// Scoring details from StardewValley.Utility.getGradpaScore() & getGrandpaCandlesFromScore()
		var output = '<h3>Grandpa\'s Evaluation</h3>\n',
			farmer = $(xmlDoc).find('player > name').html(),
			count = 0,
			max_count = 21,
			candles = 1,
			max_candles = 4,
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
			spouse = $(xmlDoc).find('player > spouse'), // might fail
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
				if (ccRooms.hasOwnProperty(id)) {
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
		if (spouse.length > 0 && houseUpgrades >= 2) {
			count++;
		}
		$(xmlDoc).find('player > friendships > item').each(function () {
			var num = Number($(this).find('value > ArrayOfInt > int').first().text());
			if (num >= 1975) { 
				heart_count++;
			}
		});
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
			if ($(this).attr('xsi:type') === 'Cat' || $(this).attr('xsi:type') === 'Dog') {
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
		output += '<span class="result">The next evaluation will light ' + candles + ' candle(s).</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (candles >= 4) ? getMilestoneString('Four candle evaluation', 1) :
				getMilestoneString('Four candle evaluation', 0) + (12 - count) + ' more points';
		output += '</li></ul>\n';

		output += '<span class="result">' + farmer + ' has earned a total of ' + addCommas(money) + 'g.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (money >= 5e4) ? getPointString(1, ' having at least 50,000g earnings', 0, 1) :
				getPointString(1, ' having at least 50,000g earnings', 0, 0) + ' -- need ' + addCommas(5e4 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 1e5) ? getPointString(1, ' having at least 100,000g earnings', 1, 1) :
				getPointString(1, ' having at least 100,000g earnings', 1, 0) + ' -- need ' + addCommas(1e5 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 2e5) ? getPointString(1, ' having at least 200,000g earnings', 1, 1) :
				getPointString(1, ' having at least 200,000g earnings', 1, 0) + ' -- need ' + addCommas(2e5 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 3e5) ? getPointString(1, ' having at least 300,000g earnings', 1, 1) :
				getPointString(1, ' having at least 300,000g earnings', 1, 0) + ' -- need ' + addCommas(3e5 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 5e5) ? getPointString(1, ' having at least 500,000g earnings', 1, 1) :
				getPointString(1, ' having at least 500,000g earnings', 1, 0) + ' -- need ' + addCommas(5e5 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 1e6) ? getPointString(2, ' having at least 1,000,000g earnings', 1, 1) :
				getPointString(2, ' having at least 1,000,000g earnings', 1, 0) + ' -- need ' + addCommas(1e6 - money) + 'g more';
		output += '</li></ul>\n';

		output += '<span class="result">' + farmer + ' has earned ' + Object.keys(ach_have).length +
				' of the ' + ach_count + ' relevant achievments.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (ach_have.hasOwnProperty(5)) ? getPointString(1, ' having "A Complete Collection" Achievement', 0, 1) :
				getPointString(1, ' having "A Complete Collection" Achievement', 0, 0);
		output += '</li>\n<li>';
		output += (ach_have.hasOwnProperty(26)) ? getPointString(1, ' having "Master Angler" Achievement', 0, 1) :
				getPointString(1, ' having "Master Angler" Achievement', 0, 0);
		output += '</li>\n<li>';
		output += (ach_have.hasOwnProperty(34)) ? getPointString(1, ' having "Full Shipment" Achievement', 0, 1) :
				getPointString(1, ' having "Full Shipment" Achievement', 0, 0);
		output += '</li></ul>\n';

		if (cc_done || cc_have >= cc_count) {
			output += '<span class="result">' + farmer + ' has completed the Community Center restoration';
			output += (cc_done) ? ' and attended the re-opening ceremony.' : ' but has not yet attended the re-opening ceremony.';
			output += '</span><br />\n';
		} else {
			output += '<span class="result">' + farmer + ' has not completed the Community Center restoration.';
		}
		output += '<ul class="ach_list"><li>';
		output += (cc_done || cc_have >= cc_count) ? getPointString(1, ' completing Community Center', 0, 1) :
				getPointString(1, ' completing Community Center', 0, 0);
		output += '</li>\n<li>';
		output += (cc_done) ? getPointString(2, ' attending the Community Center re-opening', 0, 1) :
				getPointString(2, ' attending the Community Center re-opening', 0, 0);
		output += '</li></ul>\n';

		output += '<span class="result">' + farmer + ' has ' + realPlayerLevel + ' total skill levels.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (playerLevel >= 15) ? getPointString(1, ' having 30 total skill levels', 0, 1) :
				getPointString(1, ' having 30 total skill levels', 0, 0) + ' -- need ' + (30 - realPlayerLevel) + ' more';
		output += '</li>\n<li>';
		output += (playerLevel >= 25) ? getPointString(1, ' having 50 total skill levels', 1, 1) :
				getPointString(1, ' having 50 total skill levels', 1, 0) + ' -- need ' + (50 - realPlayerLevel) + ' more';
		output += '</li></ul>\n';
		
		output += '<span class="result">' + farmer + ' has ' + heart_count +
				' relationship(s) of 1975+ friendship points (~8 hearts.)</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (heart_count >= 5) ? getPointString(1, ' having ~8&#x2665; with 5 people', 0, 1) :
				getPointString(1, ' having ~8&#x2665; with 5 people', 0, 0) + ' -- need ' + (5 - heart_count) + ' more';
		output += '</li>\n<li>';
		output += (heart_count >= 10) ? getPointString(1, ' having ~8&#x2665; with 10 people', 1, 1) :
				getPointString(1, ' having ~8&#x2665; with 10 people', 1, 0) + ' -- need ' + (10 - heart_count) + ' more';
		output += '</li></ul>\n';
		
		if (hasPet) {
			output += '<span class="result">' + farmer + ' has a pet with ' + petLove + ' friendship points.</span><br />\n';
		} else {
			need = ' a pet and ';
			output += '<span class="result">' + farmer + ' does not have a pet.</span><br />\n';
		}
		output += '<ul class="ach_list"><li>';
		output += (petLove >= 999) ? getPointString(1, ' having a pet with at least 999 friendship points', 0, 1) :
				getPointString(1, ' having a pet with at least 999 friendship points', 0, 0) + ' -- need ' + 
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
			need.push( (2 - houseUpgrades) + ' more upgrades');
		}
		output += (need.length === 0) ? getPointString(1, ' being married with at least 2 house upgrades', 0, 1) :
				getPointString(1, ' being married with at least 2 house upgrades', 0, 0) + ' -- need ' + need.join(" and ");
		output += '</li></ul>\n';

		if (hasKeys.length > 0) {
			output += '<span class="result">' + farmer + ' has acquired the ' + hasKeys.join(" and ") + '.</span><br />\n';
		} else {
			output += '<span class="result">' + farmer + ' has not acquired either the Rusty Key or Skull Key.</span><br />\n';
		}
		output += '<ul class="ach_list"><li>';
		output += (hasRustyKey === 'true') ? getPointString(1, ' having the Rusty Key', 0, 1) :
				getPointString(1, ' having the Rusty Key', 0, 0) + ' -- acquired after 60 museum donations';
		output += '</li>\n<li>';
		output += (hasSkullKey === 'true') ? getPointString(1, ' having the Skull Key', 0, 1) :
				getPointString(1, ' having the Skull Key', 0, 0) + ' -- acquired on level 120 of the mines';
		output += '</li></ul>\n';

		return output;
	}

	function handleFileSelect(evt) {
		var file = evt.target.files[0],
			reader = new FileReader(),
			prog = document.getElementById('progress');

		prog.value = 0;
		$(document.getElementById('output-container')).hide();
		$(document.getElementById('progress-container')).show();
		$(document.getElementById('changelog')).hide();
		reader.onloadstart = function(e) {
			prog.value = 20;
		};
		reader.onprogress = function(e) {
			if (e.lengthComputable) {
				var p = 20 + (e.loaded/e.total * 60);
				prog.value = p;
			}
		};
		reader.onload = function (e) {
			var output = "",
				xmlDoc = $.parseXML(e.target.result);

			output += parseSummary(xmlDoc);
			output += parseMoney(xmlDoc);
			output += parseSkills(xmlDoc);
			output += parseQuests(xmlDoc);
			output += parseMonsters(xmlDoc);
			output += parseStardrops(xmlDoc);
			output += parseFamily(xmlDoc);
			output += parseSocial(xmlDoc);
			output += parseCooking(xmlDoc);
			output += parseCrafting(xmlDoc);
			output += parseFishing(xmlDoc);
			output += parseBasicShipping(xmlDoc);
			output += parseCropShipping(xmlDoc);
			output += parseMuseum(xmlDoc);
			output += parseGrandpa(xmlDoc);

			//TODO: remaining achievments
			// Joja & CC.
			// - CC bundles: locations > GameLocation [attr('xsi:type') == 'CommunityCenter'] > bundles (individual) & areasComplete
			// - Joja? maybe mail
			// Praire King achieves - there is no progress for them so may not bother
			//TODO: non-achieve milestones
			// Additional friendships?
			// Grandpa's Evaluation

			// End of checks
			prog.value = 100;
			$(document.getElementById('output-container')).show();
			document.getElementById('out').innerHTML = output;
			$(document.getElementById('progress-container')).hide();
		};
		reader.readAsText(file);
	}
	document.getElementById('file_select').addEventListener('change', handleFileSelect, false);

};