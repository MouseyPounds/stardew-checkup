/* stardew-checkup.js
 * https://mouseypounds.github.io/stardew-checkup/
 */

/*jslint browser:true */
/*jslint plusplus: true */
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

	// Individual chunks of save parsing.
	// Each receives the xmlDoc object to parse and returns HTML to output.
	function parseSummary(xmlDoc) {
		var output = '<h3>Summary</h3>\n',
			seasons = ['Spring', 'Summer', 'Fall', 'Winter'],
			farmTypes = ['Standard', 'Riverland', 'Forest', 'Hill-top', 'Wilderness'],
			playTime = Number($(xmlDoc).find('player > millisecondsPlayed').text()),
			playHr = Math.floor(playTime / 36e5),
			playMin = Math.floor((playTime % 36e5) / 6e4);

		output += '<span class="result">Farmer ' + $(xmlDoc).find('player > name').text() + ' of '
			+ $(xmlDoc).find('player > farmName').text() + ' Farm ('
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

		output += '<span class="result">' + $(xmlDoc).find('player > name').text() + ' has earned a total of ' + addCommas(money) + 'g.</span><br />\n';
		output += '<ul class="ach_list"><li>';
		output += (money >= 15e3) ? '<span class="ach_yes"><span class="ach">Greenhorn</span> Achievement (earn 15,000g) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Greenhorn</span> Achievement (earn 15,000g) requirements not met</span> -- need ' + addCommas(15e3 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 5e4) ? '<span class="ach_yes"><span class="ach">Cowpoke</span> Achievement (earn 50,000g) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Cowpoke</span> Achievement (earn 50,000g) requirements not met</span> -- need ' + addCommas(5e4 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 25e4) ? '<span class="ach_yes"><span class="ach">Homesteader</span> Achievement (earn 250,000g) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Homesteader</span> Achievement (earn 250,000g) requirements not met</span> -- need ' + addCommas(25e4 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 1e6) ? '<span class="ach_yes"><span class="ach">Millionaire</span> Achievement (earn 1,000,000g) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Millionaire</span> Achievement (earn 1,000,000g) requirements not met</span> -- need ' + addCommas(1e6 - money) + 'g more';
		output += '</li>\n<li>';
		output += (money >= 1e7) ? '<span class="ach_yes"><span class="ach">Legend</span> Achievement (earn 10,000,000g) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Legend</span> Achievement (earn 10,000,000g) requirements not met</span> -- need ' + addCommas(1e7 - money) + 'g more';
		output += '</li></ul>\n';
		return output;
	}

	function parseSocial(xmlDoc) {
		var output = '<h3>Social</h3>\n',
			count_5h = 0,
			count_10h = 0,
			farmer = $(xmlDoc).find('player > name').text();

		$(xmlDoc).find('player > friendships > item').each(function () {
			var who = $(this).find('key > string').text(),
				num = $(this).find('value > ArrayOfInt > int').first().text();
			if (num >= 2500) { count_10h++; }
			if (num >= 1250) { count_5h++; }
			// TODO: check for maxed out hearts on everyone
		});
		output += '<span class="result">' + farmer + ' has ' + count_5h + ' relationships of 5+ hearts.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (count_5h >= 1) ? '<span class="ach_yes"><span class="ach">A New Friend</span> Achievement (5&#x2764; with 1 person) requirements met</span>' :
				'<span class="ach_no"><span class="ach">A New Friend</span> Achievement (5&#x2764; with 1 person) requirements not met</span> -- need ' + (1 - count_5h) + ' more';
		output += '</li>\n<li>';
		output += (count_5h >= 4) ? '<span class="ach_yes"><span class="ach">Cliques</span> Achievement (5&#x2764; with 4 people) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Cliques</span> Achievement (5&#x2764; with 4 people) requirements not met</span> -- need ' + (4 - count_5h) + ' more\n';
		output += '</li>\n<li>';
		output += (count_5h >= 10) ? '<span class="ach_yes"><span class="ach">Networking</span> Achievement (5&#x2764; with 10 people) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Networking</span> Achievement (5&#x2764; with 10 people) requirements not met</span> -- need ' + (10 - count_5h) + ' more';
		output += '</li>\n<li>';
		output += (count_5h >= 20) ? '<span class="ach_yes"><span class="ach">Popular</span> Achievement (5&#x2764; with 20 people) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Popular</span> Achievement (5&#x2764; with 20 people) requirements not met</span> -- need ' + (20 - count_5h) + ' more';
		output += '</li></ul>\n';
		output += '<span class="result">' + farmer + ' has ' + count_10h + ' relationships of 10+ hearts.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (count_10h >= 1) ? '<span class="ach_yes"><span class="ach">Best Friends</span> Achievement (10&#x2764; with 1 person) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Best Friends</span> Achievement (10&#x2764; with 1 person) requirements not met</span> -- need ' + (1 - count_10h) + ' more';
		output += '</li>\n<li>';
		output += (count_10h >= 8) ? '<span class="ach_yes"><span class="ach">The Beloved Farmer</span> Achievement (10&#x2764; with 8 people) requirements met</span>' :
				'<span class="ach_no"><span class="ach">The Beloved Farmer</span> Achievement (10&#x2764; with 8 people) requirements not met</span> -- need ' + (8 - count_10h) + ' more';
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
		result = $(xmlDoc).find('locations > GameLocation > Characters > NPC').each(function () {
			if ($(this).attr('xsi:type') === 'Child') {
				count++;
				child_name.push($(this).find('name').text());
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
		output += (count >= 3) ? '<span class="ach_yes"><span class="ach">Full House</span> Achievement (Married + 2 kids) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Full House</span> Achievement (Married + 2 kids) requirements not met</span> -- need ' + needs.join('; ');
		output += '</li></ul>\n';

		output += '<span class="result">Farmhouse has been upgraded ' + houseUpgrades + ' time(s); 3 upgrades are possible.</span><br /><ul class="ach_list">\n';
		output += '<li>';
		output += (houseUpgrades >= 1) ? '<span class="ach_yes"><span class="ach">Moving Up</span> Achievement (1 upgrade) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Moving Up</span> Achievement (1 upgrade) requirements not met</span> -- need ' + (1 - houseUpgrades) + ' more';
		output += '</li>\n<li>';
		output += (houseUpgrades >= 2) ? '<span class="ach_yes"><span class="ach">Living Large</span> Achievement (2 upgrades) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Living Large</span> Achievement (2 upgrades) requirements not met</span> -- need ' + (2 - houseUpgrades) + ' more';
		output += '</li>\n<li>';
		output += (houseUpgrades >= 3) ? '<span class="ms_yes">All upgrades <span class="ach">(no associated achievement)</span> completed </span>' :
				'<span class="ms_no">All upgrades <span class="ach">(no associated achievement)</span> not completed</span> -- need ' + (3 - houseUpgrades) + ' more';
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

		output += '<span class="result">' + $(xmlDoc).find('player > name').text() + ' knows  ' + known_count + ' recipe(s) and has cooked ' +
			craft_count + ' of them; there are ' + recipe_count + ' total recipes.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (craft_count >= 10) ? '<span class="ach_yes"><span class="ach">Cook</span> Achievement (cook 10 different recipes) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Cook</span> Achievement (cook 10 different recipes) requirements not met</span> -- need ' + (10 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 25) ? '<span class="ach_yes"><span class="ach">Sous Chef</span> Achievement (cook 25 different recipes) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Sous Chef</span> Achievement (cook 25 different recipes) requirements not met</span> -- need ' + (25 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= recipe_count) ? '<span class="ach_yes"><span class="ach">Gourmet Chef</span> Achievement (cook every recipe) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Gourmet Chef</span> Achievement (cook every recipe) requirements not met</span> -- need ' + (recipe_count - craft_count) + ' more';
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

		output += '<span class="result">' + $(xmlDoc).find('player > name').text() + ' knows ' + known_count + ' recipe(s) and has crafted ' +
				craft_count + ' of them; there are ' + recipe_count + ' total recipes.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (craft_count >= 15) ? '<span class="ach_yes"><span class="ach">D.I.Y.</span> Achievement (craft 15 different items) requirements met</span>' :
				'<span class="ach_no"><span class="ach">D.I.Y.</span> Achievement (craft 15 different items) requirements not met</span> -- need ' + (15 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 30) ? '<span class="ach_yes"><span class="ach">Artisan</span> Achievement (craft 30 different items) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Artisan</span> Achievement (craft 30 different items) requirements not met</span> -- need ' + (30 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= recipe_count) ? '<span class="ach_yes"><span class="ach">Craft Master</span> Achievement (craft every item) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Craft Master</span> Achievement (craft every item) requirements not met</span> -- need ' + (recipe_count - craft_count) + ' more';
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
			if (id !== 372 && num > 0) {
				craft_count++;
				// We are adding up the count ourselves, but the total is also stored in (stats > fishCaught) and (stats > FishCaught)
				count += num;
				known[recipes[id]] = num;
			}
		});

		output += '<span class="result">' + $(xmlDoc).find('player > name').text() + ' has caught ' + count + ' total fish of ' + craft_count +
				' different type(s); there are ' + recipe_count + ' total types.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (count >= 100) ? '<span class="ach_yes"><span class="ach">Mother Catch</span> Achievement (catch 100 fish) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Mother Catch</span> Achievement (catch 100 fish) requirements not met</span> -- need ' + (100 - count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 10) ? '<span class="ach_yes"><span class="ach">Fisherman</span> Achievement (catch 10 different fish) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Fisherman</span> Achievement (catch 10 different fish) requirements not met</span> -- need ' + (10 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= 24) ? '<span class="ach_yes"><span class="ach">Ol\' Mariner</span> Achievement (catch 24 different fish) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Ol\' Mariner</span> Achievement (catch 24 different fish) requirements not met</span> -- need ' + (24 - craft_count) + ' more';
		output += '</li>\n<li>';
		output += (craft_count >= recipe_count) ? '<span class="ach_yes"><span class="ach">Master Angler</span> Achievement (catch every fish) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Master Angler</span> Achievement (catch every fish) requirements not met</span> -- need ' + (recipe_count - craft_count) + ' more';
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

		output += '<span class="result">' + $(xmlDoc).find('player > name').text() + ' has shipped  ' + craft_count +
				' basic item(s); there are ' + recipe_count + ' total items.</span><ul class="ach_list">\n';
		output += '<li>';
		output += (craft_count >= recipe_count) ? '<span class="ach_yes"><span class="ach">Full Shipment</span> Achievement (ship every item) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Full Shipment</span> Achievement (ship every item) requirements not met</span> -- need ' + (recipe_count - craft_count) + ' more';
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
			farmer = $(xmlDoc).find('player > name').text();

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
		output += (max_ship >= 300) ? '<span class="ach_yes"><span class="ach">Monoculture</span> Achievement (ship 300 of one crop) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Monoculture</span> Achievement (ship 300 of one crop) requirements not met</span> -- need ' + (300 - max_ship) + ' more ' + max_crop;
		output += '</li></ul>\n';
		output += '<span class="result">' + farmer + ' has shipped 15 or more of each of ' + craft_count +
				' different crop(s); there are ' + recipe_count + ' total crops.</span><ul class="ach_list">\n<li>';
		output += (craft_count >= recipe_count) ? '<span class="ach_yes"><span class="ach">Polyculture</span> Achievement (ship 15 of each crop) requirements met</span>' :
				'<span class="ach_no"><span class="ach">Polyculture</span> Achievement (ship 15 of each crop) requirements not met</span> -- need more of ' + (recipe_count - craft_count) + ' crops';
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

/*
	function parseX(xmlDoc) {
		var output = '<h3></h3>\n',
		return output;
	}
*/
	function handleFileSelect(evt) {
		var file = evt.target.files[0],
			reader = new FileReader();

		reader.onload = function (e) {
			$(document.getElementById('changelog')).hide();
			$(document.getElementById('output-container')).show();
			var output = "",
				xmlDoc = $.parseXML(e.target.result);
				//farmer = $(xmlDoc).find('player > name').text();

			output += parseSummary(xmlDoc);
			output += parseMoney(xmlDoc);
			output += parseSocial(xmlDoc);
			output += parseFamily(xmlDoc);
			output += parseCooking(xmlDoc);
			output += parseCrafting(xmlDoc);
			output += parseFishing(xmlDoc);
			output += parseBasicShipping(xmlDoc);
			output += parseCropShipping(xmlDoc);

			//TODO: remaining achievments
			// Joja & CC.
			// - CC bundles: locations > GameLocation [attr('xsi:type') == 'CommunityCenter'] > bundles (individual) & areasComplete
			// - Joja? maybe mail
			// Praire King achieves - there is no progress for them so may not bother
			// Mystery of the Stardrops - must find all triggers (mail?)
			// Monster eradication
			// Skills
			// Help Wanted
			// Museum
			// Bottom of the mines
			//TODO: non-achieve milestones
			// Additional friendships?
			// Grandpa's Evaluation

			// End of checks
			document.getElementById('out').innerHTML = output;
		};
		reader.readAsText(file);

	}
	document.getElementById('file_select').addEventListener('change', handleFileSelect, false);

};