import { Area } from './area.js';

export const FISHING_SPOTS = {
  "0": {"_id": 0, "name": "Undiscovered Fishing Hole", "territory_id": 0}, "1": {"_id": 1, "name": "", "territory_id": 0}, "2": {"_id": 2, "name": "The Vein", "territory_id": 148}, "3": {"_id": 3, "name": "The Mirror", "territory_id": 148}, "4": {"_id": 4, "name": "Everschade", "territory_id": 148}, "5": {"_id": 5, "name": "Hopeseed Pond", "territory_id": 148}, "6": {"_id": 6, "name": "Sweetbloom Pier", "territory_id": 152}, "7": {"_id": 7, "name": "Verdant Drop", "territory_id": 152}, "8": {"_id": 8, "name": "Springripple Brook", "territory_id": 152}, "9": {"_id": 9, "name": "Sylphlands", "territory_id": 152}, "10": {"_id": 10, "name": "Sanctum of the Twelve", "territory_id": 152}, "11": {"_id": 11, "name": "Upper Hathoeva River", "territory_id": 153}, "12": {"_id": 12, "name": "Middle Hathoeva River", "territory_id": 153}, "13": {"_id": 13, "name": "Lower Hathoeva River", "territory_id": 153}, "14": {"_id": 14, "name": "East Hathoeva River", "territory_id": 153}, "15": {"_id": 15, "name": "Goblinblood", "territory_id": 153}, "16": {"_id": 16, "name": "Rootslake", "territory_id": 153}, "17": {"_id": 17, "name": "Urth's Gift", "territory_id": 153}, "18": {"_id": 18, "name": "Murmur Rills", "territory_id": 154}, "19": {"_id": 19, "name": "Fallgourd Float", "territory_id": 154}, "20": {"_id": 20, "name": "Proud Creek", "territory_id": 154}, "21": {"_id": 21, "name": "Lake Tahtotl", "territory_id": 154}, "22": {"_id": 22, "name": "North Silvertear", "territory_id": 156}, "23": {"_id": 23, "name": "Rathefrost", "territory_id": 156}, "24": {"_id": 24, "name": "The Tangle", "territory_id": 156}, "25": {"_id": 25, "name": "The Deep Tangle", "territory_id": 156}, "26": {"_id": 26, "name": "Coerthas River", "territory_id": 155}, "27": {"_id": 27, "name": "Witchdrop", "territory_id": 155}, "28": {"_id": 28, "name": "The Nail", "territory_id": 155}, "29": {"_id": 29, "name": "The Weeping Saint", "territory_id": 155}, "30": {"_id": 30, "name": "Dragonhead Latrines", "territory_id": 155}, "31": {"_id": 31, "name": "Daniffen Pass", "territory_id": 155}, "32": {"_id": 32, "name": "Exploratory Ice Hole", "territory_id": 155}, "33": {"_id": 33, "name": "Snowcloak", "territory_id": 155}, "34": {"_id": 34, "name": "Sea of Clouds", "territory_id": 155}, "35": {"_id": 35, "name": "Limsa Lominsa Lower Decks", "territory_id": 129}, "36": {"_id": 36, "name": "Limsa Lominsa Upper Decks", "territory_id": 128}, "37": {"_id": 37, "name": "Zephyr Drift", "territory_id": 134}, "38": {"_id": 38, "name": "Summerford", "territory_id": 134}, "39": {"_id": 39, "name": "Rogue River", "territory_id": 134}, "40": {"_id": 40, "name": "West Agelyss River", "territory_id": 134}, "41": {"_id": 41, "name": "Nym River", "territory_id": 134}, "42": {"_id": 42, "name": "Woad Whisper Canyon", "territory_id": 134}, "43": {"_id": 43, "name": "The Mourning Widow", "territory_id": 135}, "44": {"_id": 44, "name": "Moraby Bay", "territory_id": 135}, "45": {"_id": 45, "name": "Cedarwood", "territory_id": 135}, "46": {"_id": 46, "name": "Moraby Drydocks", "territory_id": 135}, "47": {"_id": 47, "name": "Oschon's Torch", "territory_id": 135}, "48": {"_id": 48, "name": "The Salt Strand", "territory_id": 135}, "49": {"_id": 49, "name": "Candlekeep Quay", "territory_id": 135}, "50": {"_id": 50, "name": "Empty Heart", "territory_id": 135}, "51": {"_id": 51, "name": "South Bloodshore", "territory_id": 137}, "52": {"_id": 52, "name": "Costa del Sol", "territory_id": 137}, "53": {"_id": 53, "name": "North Bloodshore", "territory_id": 137}, "54": {"_id": 54, "name": "Hidden Falls", "territory_id": 137}, "55": {"_id": 55, "name": "East Agelyss River", "territory_id": 137}, "56": {"_id": 56, "name": "Raincatcher Gully", "territory_id": 137}, "57": {"_id": 57, "name": "The Juggernaut", "territory_id": 137}, "58": {"_id": 58, "name": "Red Mantis Falls", "territory_id": 137}, "59": {"_id": 59, "name": "Swiftperch", "territory_id": 138}, "60": {"_id": 60, "name": "Skull Valley", "territory_id": 138}, "61": {"_id": 61, "name": "Halfstone", "territory_id": 138}, "62": {"_id": 62, "name": "Isles of Umbra Northshore", "territory_id": 138}, "63": {"_id": 63, "name": "Isles of Umbra Southshore", "territory_id": 138}, "64": {"_id": 64, "name": "The Brewer's Beacon", "territory_id": 138}, "65": {"_id": 65, "name": "The Ship Graveyard", "territory_id": 138}, "66": {"_id": 66, "name": "Oakwood", "territory_id": 139}, "67": {"_id": 67, "name": "Fool Falls", "territory_id": 139}, "68": {"_id": 68, "name": "Northeast Bronze Lake", "territory_id": 139}, "69": {"_id": 69, "name": "The Silver Bazaar", "territory_id": 140}, "70": {"_id": 70, "name": "Vesper Bay", "territory_id": 140}, "71": {"_id": 71, "name": "Crescent Cove", "territory_id": 140}, "72": {"_id": 72, "name": "Nophica's Wells", "territory_id": 140}, "73": {"_id": 73, "name": "The Footfalls", "territory_id": 140}, "74": {"_id": 74, "name": "Cape Westwind", "territory_id": 140}, "75": {"_id": 75, "name": "Upper Soot Creek", "territory_id": 141}, "76": {"_id": 76, "name": "Lower Soot Creek", "territory_id": 141}, "77": {"_id": 77, "name": "The Unholy Heir", "territory_id": 141}, "78": {"_id": 78, "name": "North Drybone", "territory_id": 145}, "79": {"_id": 79, "name": "South Drybone", "territory_id": 145}, "80": {"_id": 80, "name": "Yugr'am River", "territory_id": 145}, "81": {"_id": 81, "name": "Whispering Gorge", "territory_id": 133}, "82": {"_id": 82, "name": "The Burning Wall", "territory_id": 145}, "83": {"_id": 83, "name": "Burnt Lizard Creek", "territory_id": 146}, "84": {"_id": 84, "name": "Zahar'ak", "territory_id": 146}, "85": {"_id": 85, "name": "Forgotten Springs", "territory_id": 146}, "86": {"_id": 86, "name": "Sagolii Desert", "territory_id": 146}, "87": {"_id": 87, "name": "Sagolii Dunes", "territory_id": 146}, "88": {"_id": 88, "name": "Ceruleum Field", "territory_id": 147}, "89": {"_id": 89, "name": "Bluefog", "territory_id": 147}, "90": {"_id": 90, "name": "Jadeite Flood", "territory_id": 132}, "91": {"_id": 91, "name": "Lower Black Tea Brook", "territory_id": 132}, "92": {"_id": 92, "name": "Haukke Manor", "territory_id": 148}, "93": {"_id": 93, "name": "Singing Shards", "territory_id": 156}, "94": {"_id": 94, "name": "The North Shards", "territory_id": 156}, "95": {"_id": 95, "name": "Parata's Peace", "territory_id": 140}, "96": {"_id": 96, "name": "The Clutch", "territory_id": 141}, "97": {"_id": 97, "name": "Blind Iron Mines", "territory_id": 135}, "98": {"_id": 98, "name": "Bronze Lake Shallows", "territory_id": 139}, "99": {"_id": 99, "name": "The Long Climb", "territory_id": 180}, "100": {"_id": 100, "name": "Upper Black Tea Brook", "territory_id": 133}, "101": {"_id": 101, "name": "Sapsa Spawning Grounds", "territory_id": 138}, "102": {"_id": 102, "name": "Reaver Hide", "territory_id": 138}, "103": {"_id": 103, "name": "Moondrip", "territory_id": 140}, "104": {"_id": 104, "name": "Mist", "territory_id": 339}, "105": {"_id": 105, "name": "The Lavender Beds", "territory_id": 340}, "106": {"_id": 106, "name": "The Goblet", "territory_id": 341}, "107": {"_id": 107, "name": "Rhotano Sea (Privateer Forecastle)", "territory_id": 137}, "108": {"_id": 108, "name": "Rhotano Sea (Privateer Sterncastle)", "territory_id": 137}, "109": {"_id": 109, "name": "Riversmeet", "territory_id": 397}, "110": {"_id": 110, "name": "Greytail Falls", "territory_id": 397}, "111": {"_id": 111, "name": "Unfrozen Pond", "territory_id": 397}, "112": {"_id": 112, "name": "Clearpool", "territory_id": 397}, "113": {"_id": 113, "name": "Dragonspit", "territory_id": 397}, "114": {"_id": 114, "name": "South Banepool", "territory_id": 397}, "115": {"_id": 115, "name": "Ashpool", "territory_id": 397}, "116": {"_id": 116, "name": "West Banepool", "territory_id": 397}, "117": {"_id": 117, "name": "The Hundred Throes", "territory_id": 398}, "118": {"_id": 118, "name": "Whilom River", "territory_id": 398}, "119": {"_id": 119, "name": "The Smoldering Wastes", "territory_id": 398}, "120": {"_id": 120, "name": "The Iron Feast", "territory_id": 398}, "121": {"_id": 121, "name": "Mourn", "territory_id": 398}, "122": {"_id": 122, "name": "West Mourn", "territory_id": 398}, "123": {"_id": 123, "name": "Anyx Old", "territory_id": 398}, "124": {"_id": 124, "name": "Halo", "territory_id": 398}, "125": {"_id": 125, "name": "Thaliak River", "territory_id": 399}, "126": {"_id": 126, "name": "Quickspill Delta", "territory_id": 399}, "127": {"_id": 127, "name": "Upper Thaliak River", "territory_id": 399}, "128": {"_id": 128, "name": "Middle Thaliak River", "territory_id": 399}, "129": {"_id": 129, "name": "Eil Tohm", "territory_id": 400}, "130": {"_id": 130, "name": "Greensward", "territory_id": 400}, "131": {"_id": 131, "name": "Weston Waters", "territory_id": 400}, "132": {"_id": 132, "name": "Landlord Colony", "territory_id": 400}, "133": {"_id": 133, "name": "Sohm Al Summit", "territory_id": 400}, "134": {"_id": 134, "name": "Tharl Oom Khash", "territory_id": 400}, "135": {"_id": 135, "name": "Voor Sian Siran", "territory_id": 401}, "136": {"_id": 136, "name": "The Eddies", "territory_id": 401}, "137": {"_id": 137, "name": "Cloudtop", "territory_id": 401}, "138": {"_id": 138, "name": "The Blue Window", "territory_id": 401}, "139": {"_id": 139, "name": "Mok Oogl Island", "territory_id": 401}, "140": {"_id": 140, "name": "Alpha Quadrant", "territory_id": 402}, "141": {"_id": 141, "name": "Aetherochemical Spill", "territory_id": 402}, "142": {"_id": 142, "name": "Hyperstellar Downconverter", "territory_id": 402}, "143": {"_id": 143, "name": "Delta Quadrant", "territory_id": 402}, "144": {"_id": 144, "name": "The Pappus Tree", "territory_id": 402}, "145": {"_id": 145, "name": "The Habisphere", "territory_id": 402}, "146": {"_id": 146, "name": "The Flagship", "territory_id": 402}, "147": {"_id": 147, "name": "Diadem Skysprings", "territory_id": 0}, "148": {"_id": 148, "name": "Diadem Grotto", "territory_id": 0}, "149": {"_id": 149, "name": "Southern Diadem Lake", "territory_id": 0}, "150": {"_id": 150, "name": "Secluded Diadem Pond", "territory_id": 0}, "151": {"_id": 151, "name": "Northern Diadem Lake", "territory_id": 0}, "152": {"_id": 152, "name": "Blustery Cloudtop", "territory_id": 0}, "153": {"_id": 153, "name": "Calm Cloudtop", "territory_id": 0}, "154": {"_id": 154, "name": "Swirling Cloudtop", "territory_id": 0}, "155": {"_id": 155, "name": "Northwest Bronze Lake", "territory_id": 180}
};

// export const LOCATION = {
//   // Limsa Lominsa Upper Decks
//   'LIMSA_LOMINSA_UPPER_DECKS': { area: Area.LIMSA_LOMINSA_UPPER_DECKS, name: 'Limsa Lominsa Upper Decks', _id: 10101 },
//
//   // Limsa Lominsa Lower Decks
//   'LIMSA_LOMINSA_LOWER_DECKS': { area: Area.LIMSA_LOMINSA_LOWER_DECKS, name: 'Limsa Lominsa Lower Decks', _id: 10201 },
//
//   // Middle La Noscea
//   'ZEPHYR_DRIFT': { area: Area.MIDDLE_LA_NOSCEA, name: 'Zephyr Drift', _id: 10301 },
//   'SUMMERFORD': { area: Area.MIDDLE_LA_NOSCEA, name: 'Summerford', _id: 10302 },
//   'ROGUE_RIVER': { area: Area.MIDDLE_LA_NOSCEA, name: 'Rogue River', _id: 10303 },
//   'WEST_AGELYSS_RIVER': { area: Area.MIDDLE_LA_NOSCEA, name: 'West Agelyss River', _id: 10304 },
//   'NYM_RIVER': { area: Area.MIDDLE_LA_NOSCEA, name: 'Nym River', _id: 10305 },
//   'WOAD_WHISPER_CANYON': { area: Area.MIDDLE_LA_NOSCEA, name: 'Woad Whisper Canyon', _id: 10306 },
//
//   // Lower La Noscea
//   'THE_MOURNING_WIDOW': { area: Area.LOWER_LA_NOSCEA, name: 'The Mourning Widow', _id: 10401 },
//   'MORABY_BAY': { area: Area.LOWER_LA_NOSCEA, name: 'Moraby Bay', _id: 10402 },
//   'CEDARWOOD': { area: Area.LOWER_LA_NOSCEA, name: 'Cedarwood', _id: 10403 },
//   'MORABY_DRYDOCKS': { area: Area.LOWER_LA_NOSCEA, name: 'Moraby Drydocks', _id: 10404 },
//   'OSCHONS_TORCH': { area: Area.LOWER_LA_NOSCEA, name: 'Oschon\'s Torch', _id: 10405 },
//   'THE_SALT_STRAND': { area: Area.LOWER_LA_NOSCEA, name: 'The Salt Strand', _id: 10406 },
//   'CANDLEKEEP_QUAY': { area: Area.LOWER_LA_NOSCEA, name: 'Candlekeep Quay', _id: 10407 },
//   'EMPTY_HEART': { area: Area.LOWER_LA_NOSCEA, name: 'Empty Heart', _id: 10408 },
//   'BLIND_IRON_MINES': { area: Area.LOWER_LA_NOSCEA, name: 'Blind Iron Mines', _id: 10409 },
//
//   // Eastern La Noscea
//   'SOUTH_BLOODSHORE': { area: Area.EASTERN_LA_NOSCEA, name: 'South Bloodshore', _id: 10501 },
//   'COSTA_DEL_SOL': { area: Area.EASTERN_LA_NOSCEA, name: 'Costa Del Sol', _id: 10502 },
//   'NORTH_BLOODSHORE': { area: Area.EASTERN_LA_NOSCEA, name: 'North Bloodshore', _id: 10503 },
//   'HIDDEN_FALLS': { area: Area.EASTERN_LA_NOSCEA, name: 'Hidden Falls', _id: 10504 },
//   'EAST_AGELYSS_RIVER': { area: Area.EASTERN_LA_NOSCEA, name: 'East Agelyss River', _id: 10505 },
//   'RAINCATCHER_GULLY': { area: Area.EASTERN_LA_NOSCEA, name: 'Raincatcher Gully', _id: 10506 },
//   'THE_JUGGERNAUT': { area: Area.EASTERN_LA_NOSCEA, name: 'The Juggernaut', _id: 10507 },
//   'RED_MANTIS_FALLS': { area: Area.EASTERN_LA_NOSCEA, name: 'Red Mantis Falls', _id: 10508 },
//   'RHOTANO_SEA_FORECASTLE': { area: Area.EASTERN_LA_NOSCEA, name: 'Rhotano Sea (Forecastle)', _id: 10509 },
//   'RHOTANO_SEA_STERNCASTLE': { area: Area.EASTERN_LA_NOSCEA, name: 'Rhotano Sea (Sterncastle)', _id: 10510 },
//
//   // Western La Noscea
//   'SWIFTPERCH': { area: Area.WESTERN_LA_NOSCEA, name: 'Swiftperch', _id: 10601 },
//   'SKULL_VALLEY': { area: Area.WESTERN_LA_NOSCEA, name: 'Skull Valley', _id: 10602 },
//   'HALFSTONE': { area: Area.WESTERN_LA_NOSCEA, name: 'Halfstone', _id: 10603 },
//   'NORTH_UMBRAL_ISLES': { area: Area.WESTERN_LA_NOSCEA, name: 'Isles of Umbra Northshore', _id: 10604 },
//   'SOUTH_UMBRAL_ISLES': { area: Area.WESTERN_LA_NOSCEA, name: 'Isles of Umbra Southshore', _id: 10605 },
//   'THE_BREWERS_BEACON': { area: Area.WESTERN_LA_NOSCEA, name: 'The Brewer\'s Beacon', _id: 10606 },
//   'THE_SHIP_GRAVEYARD': { area: Area.WESTERN_LA_NOSCEA, name: 'The Ship Graveyard', _id: 10607 },
//   'SAPSA_SPAWNING_GROUNDS': { area: Area.WESTERN_LA_NOSCEA, name: 'Sapsa Spawning Grounds', _id: 10608 },
//   'REAVER_HIDE': { area: Area.WESTERN_LA_NOSCEA, name: 'Reaver Hide', _id: 10609 },
//
//   // Upper La Noscea
//   'OAKWOOD': { area: Area.UPPER_LA_NOSCEA, name: 'Oakwood', _id: 10701 },
//   'FOOL_FALLS': { area: Area.UPPER_LA_NOSCEA, name: 'Fool Falls', _id: 10702 },
//   'NORTH_BRONZE_LAKE': { area: Area.UPPER_LA_NOSCEA, name: 'North Bronze Lake', _id: 10703 },
//   'BRONZE_LAKE_SHALLOWS': { area: Area.UPPER_LA_NOSCEA, name: 'Bronze Lake Shallows', _id: 10704 },
//
//   // Outer La Noscea
//   'THE_LONG_CLIMB': { area: Area.OUTER_LA_NOSCEA, name: 'The Long Climb', _id: 10801 },
//
//   // Mist
//   'MIST': { area: Area.MIST, name: 'Mist', _id: 10901 },
//
//   // New Gridania
//   'JADEITE_FLOOD': { area: Area.NEW_GRIDANIA, name: 'Jadeite Flood', _id: 20101 },
//   'LOWER_BLACK_TEA_BROOK': { area: Area.NEW_GRIDANIA, name: 'Lower Black Tea Brook', _id: 20102 },
//
//   // Old Gridania
//   'WHISPERING_GORGE': { area: Area.OLD_GRIDANIA, name: 'Whispering Gorge', _id: 20201 },
//   'UPPER_BLACK_TEA_BROOK': { area: Area.OLD_GRIDANIA, name: 'Upper Black Tea Brook', _id: 20202 },
//
//   // Central Shroud
//   'THE_VEIN': { area: Area.CENTRAL_SHROUD, name: 'The Vein', _id: 20301 },
//   'THE_MIRROR': { area: Area.CENTRAL_SHROUD, name: 'The Mirror', _id: 20302 },
//   'EVERSCHADE': { area: Area.CENTRAL_SHROUD, name: 'Everschade', _id: 20303 },
//   'HOPESEED_POND': { area: Area.CENTRAL_SHROUD, name: 'Hopeseed Pond', _id: 20304 },
//   'HAUKKE_MANOR': { area: Area.CENTRAL_SHROUD, name: 'Haukke Manor', _id: 20305 },
//
//   // East Shroud
//   'SWEETBLOOM_PIER': { area: Area.EAST_SHROUD, name: 'Sweetbloom Pier', _id: 20401 },
//   'VERDANT_DROP': { area: Area.EAST_SHROUD, name: 'Verdant Drop', _id: 20402 },
//   'SPRINGGRIPPLE_BROOK': { area: Area.EAST_SHROUD, name: 'Springgripple Brook', _id: 20403 },
//   'SYLPHLANDS': { area: Area.EAST_SHROUD, name: 'Sylphlands', _id: 20404 },
//   'SANCTUM_OF_THE_TWELVE': { area: Area.EAST_SHROUD, name: 'Sanctum Of The Twelve', _id: 20405 },
//
//   // South Shroud
//   'UPPER_HATHOEVA_RIVER': { area: Area.SOUTH_SHROUD, name: 'Upper Hathoeva River', _id: 20501 },
//   'MIDDLE_HATHOEVA_RIVER': { area: Area.SOUTH_SHROUD, name: 'Middle Hathoeva River', _id: 20502 },
//   'LOWER_HATHOEVA_RIVER': { area: Area.SOUTH_SHROUD, name: 'Lower Hathoeva River', _id: 20503 },
//   'EAST_HATHOEVA_RIVER': { area: Area.SOUTH_SHROUD, name: 'East Hathoeva River', _id: 20504 },
//   'GOBLINBLOOD': { area: Area.SOUTH_SHROUD, name: 'Goblinblood', _id: 20505 },
//   'ROOTSLAKE': { area: Area.SOUTH_SHROUD, name: 'Rootslake', _id: 20506 },
//   'URTHS_GIFT': { area: Area.SOUTH_SHROUD, name: 'Urth\'s Gift', _id: 20507 },
//
//   // North Shroud
//   'MURMUR_RILLS': { area: Area.NORTH_SHROUD, name: 'Murmur Rills', _id: 20601 },
//   'FALLGOURD_FLOAT': { area: Area.NORTH_SHROUD, name: 'Fallgourd Float', _id: 20602 },
//   'PROUD_CREEK': { area: Area.NORTH_SHROUD, name: 'Proud Creek', _id: 20603 },
//   'LAKE_TAHTOTL': { area: Area.NORTH_SHROUD, name: 'Lake Tahtotl', _id: 20604 },
//
//   // Lavender Beds
//   'LAVENDER_BEDS': { area: Area.LAVENDER_BEDS, name: 'Lavender Beds', _id: 20701 },
//
//   // Western Thanalan
//   'THE_SILVER_BAZAAR': { area: Area.WESTERN_THANALAN, name: 'The Silver Bazaar', _id: 30101 },
//   'VESPER_BAY': { area: Area.WESTERN_THANALAN, name: 'Vesper Bay', _id: 30102 },
//   'CRESCENT_COVE': { area: Area.WESTERN_THANALAN, name: 'Crescent Cove', _id: 30103 },
//   'NOPHICAS_WELLS': { area: Area.WESTERN_THANALAN, name: 'Nophica\'s Wells', _id: 30104 },
//   'THE_FOOTFALLS': { area: Area.WESTERN_THANALAN, name: 'The Footfalls', _id: 30105 },
//   'CAPE_WESTWIND': { area: Area.WESTERN_THANALAN, name: 'Cape Westwind', _id: 30106 },
//   'PARATAS_PEACE': { area: Area.WESTERN_THANALAN, name: 'Parata\'s Peace', _id: 30107 },
//   'MOONDRIP': { area: Area.WESTERN_THANALAN, name: 'Moondrip', _id: 30108 },
//
//   // Central Thanalan
//   'UPPER_SOOT_CREEK': { area: Area.CENTRAL_THANALAN, name: 'Upper Soot Creek', _id: 30201 },
//   'LOWER_SOOT_CREEK': { area: Area.CENTRAL_THANALAN, name: 'Lower Soot Creek', _id: 30202 },
//   'THE_UNHOLY_HEIR': { area: Area.CENTRAL_THANALAN, name: 'The Unholy Heir', _id: 30203 },
//   'THE_CLUTCH': { area: Area.CENTRAL_THANALAN, name: 'The Clutch', _id: 30204 },
//
//   // Eastern Thanalan
//   'NORTH_DRYBONE': { area: Area.EASTERN_THANALAN, name: 'North Drybone', _id: 30301 },
//   'SOUTH_DRYBONE': { area: Area.EASTERN_THANALAN, name: 'South Drybone', _id: 30302 },
//   'YUGRAM_RIVER': { area: Area.EASTERN_THANALAN, name: 'Yugr\'am River', _id: 30303 },
//   'THE_BURNING_WALL': { area: Area.EASTERN_THANALAN, name: 'The Burning Wall', _id: 30304 },
//
//   // Southern Thanalan
//   'BURNT_LIZARD_CREEK': { area: Area.SOUTHERN_THANALAN, name: 'Burnt Lizard Creek', _id: 30401 },
//   'ZAHARAK': { area: Area.SOUTHERN_THANALAN, name: 'Zahar\'ak', _id: 30402 },
//   'FORGOTTEN_SPRINGS': { area: Area.SOUTHERN_THANALAN, name: 'Forgotten Springs', _id: 30403 },
//   'SAGOLII_DESERT': { area: Area.SOUTHERN_THANALAN, name: 'Sagolii Desert', _id: 30404 },
//   'SAGOLII_DUNES': { area: Area.SOUTHERN_THANALAN, name: 'Sagolii Dunes', _id: 30405 },
//
//   // Northern Thanalan
//   'CERULEUM_FIELD': { area: Area.NORTHERN_THANALAN, name: 'Ceruleum Field', _id: 30501 },
//   'BLUEFOG': { area: Area.NORTHERN_THANALAN, name: 'Bluefog', _id: 30502 },
//
//   // The Goblet
//   'THE_GOBLET': { area: Area.THE_GOBLET, name: 'The Goblet', _id: 30601 },
//
//   // Coerthas Central Highlands
//   'COERTHAS_RIVER': { area: Area.COERTHAS_CENTRAL_HIGHLANDS, name: 'Coerthas River', _id: 40101 },
//   'WITCHDROP': { area: Area.COERTHAS_CENTRAL_HIGHLANDS, name: 'Witchdrop', _id: 40102 },
//   'THE_NAIL': { area: Area.COERTHAS_CENTRAL_HIGHLANDS, name: 'The Nail', _id: 40103 },
//   'THE_WEEPING_SAINT': { area: Area.COERTHAS_CENTRAL_HIGHLANDS, name: 'The Weeping Saint', _id: 40104 },
//   'DRAGONHEAD_LATRINES': { area: Area.COERTHAS_CENTRAL_HIGHLANDS, name: 'Dragonhead Latrines', _id: 40105 },
//   'DANIFFEN_PASS': { area: Area.COERTHAS_CENTRAL_HIGHLANDS, name: 'Daniffen Pass', _id: 40106 },
//   'EXPLORATORY_ICE_HOLE': { area: Area.COERTHAS_CENTRAL_HIGHLANDS, name: 'Exploratory Ice Hole', _id: 40107 },
//   'SNOWCLOAK': { area: Area.COERTHAS_CENTRAL_HIGHLANDS, name: 'Snowcloak', _id: 40108 },
//   'SEA_OF_CLOUDS': { area: Area.COERTHAS_CENTRAL_HIGHLANDS, name: 'Sea Of Clouds', _id: 40109 },
//
//   // Mor Dhona
//   'NORTH_SILVERTEAR': { area: Area.MOR_DHONA, name: 'North Silvertear', _id: 50101 },
//   'RATHEFROST': { area: Area.MOR_DHONA, name: 'Rathefrost', _id: 50102 },
//   'THE_TANGLE': { area: Area.MOR_DHONA, name: 'The Tangle', _id: 50103 },
//   'THE_DEEP_TANGLE': { area: Area.MOR_DHONA, name: 'The Deep Tangle', _id: 50104 },
//   'SINGING_SHARDS': { area: Area.MOR_DHONA, name: 'Singing Shards', _id: 50105 },
//   'THE_NORTH_SHARDS': { area: Area.MOR_DHONA, name: 'The North Shards', _id: 50106 },
//
// 	// Heavensward
// 	'THE_FLAGSHIP': { area: Area.AZYS_LLA, name: 'The Flagship', _id: 60207 },
// 	'THE_IRON_FEAST': { area: Area.DRAVANIAN_FORELANDS, name: 'The Iron Feast', _id: 70104 },
// 	'VOOR_SIAN_SIRAN': { area: Area.SEA_OF_CLOUDS, name: 'Voor Sian Siran', _id: 60101 },
// 	'CLEARPOOL': { area: Area.COERTHAS_WESTERN_HIGHLANDS, name: 'Clearpool', _id: 40204 },
// 	'WEST_BANEPOOL': { area: Area.COERTHAS_WESTERN_HIGHLANDS, name: 'West Banepool', _id: 40208 },
// 	'WHILOM_RIVER': { area: Area.DRAVANIAN_FORELANDS, name: 'Whilom River', _id: 70102 },
// 	'THE_HUNDRED_THROES': { area: Area.DRAVANIAN_FORELANDS, name: 'The Hundred Throes', _id: 70101 },
// 	'WESTON_WATERS': { area: Area.CHURNING_MISTS, name: 'Weston Waters', _id: 70303 },
// 	'GREYTAIL_FALLS': { area: Area.COERTHAS_WESTERN_HIGHLANDS, name: 'Greytail Falls', _id: 40202 },
// 	'UNFROZEN_POND': { area: Area.COERTHAS_WESTERN_HIGHLANDS, name: 'Unfrozen Pond', _id: 40203 },
// 	'THALIAK_RIVER': { area: Area.DRAVANIAN_HINTERLANDS, name: 'Thaliak River', _id: 70201 },
// 	'UPPER_THALIAK_RIVER': { area: Area.DRAVANIAN_HINTERLANDS, name: 'Upper Thaliak River', _id: 70203 },
// 	'THARL_OOM_KHASH': { area: Area.CHURNING_MISTS, name: 'Tharl Oom Khash', _id: 70306 },
// 	'EIL_TOHM': { area: Area.CHURNING_MISTS, name: 'Eil Tohm', _id: 70301 },
// 	'SOHM_AL_SUMMIT': { area: Area.CHURNING_MISTS, name: 'Sohm Al Summit', _id: 70305 },
// 	'THE_HABISPHERE': { area: Area.AZYS_LLA, name: 'The Habisphere', _id: 60206 },
// 	'MIDDLE_THALIAK_RIVER': { area: Area.DRAVANIAN_HINTERLANDS, name: 'Middle Thaliak River', _id: 70204 },
// 	'THE_PAPPUS_TREE': { area: Area.AZYS_LLA, name: 'The Pappus Tree', _id: 60205 },
// 	'THE_SMOLDERING_WASTES': { area: Area.DRAVANIAN_FORELANDS, name: 'The Smoldering Wastes', _id: 70103 },
//   'MOK_OOGL_ISLAND': { area: Area.SEA_OF_CLOUDS, name: 'Mok Oogl Island', _id: 60105 },
//   'HALO': { area: Area.DRAVANIAN_FORELANDS, name: 'Halo', _id: 70108 },
//   'ALPHA_QUADRANT': { area: Area.AZYS_LLA, name: 'Alpha Quadrant', _id: 60201 },
//   'DELTA_QUADRANT': { area: Area.AZYS_LLA, name: 'Delta Quadrant', _id: 60204 },
//   'SOUTH_BANEPOOL': { area: Area.COERTHAS_WESTERN_HIGHLANDS, name: 'South Banepool', _id: 40206 },
//   'HYPERSTELLAR_DOWNCONVERTER': { area: Area.AZYS_LLA, name: 'Hyperstellar Downconverter', _id: 60203 },
//   'CLOUDTOP': { area: Area.SEA_OF_CLOUDS, name: 'Cloudtop', _id: 60103 },
//   'QUICKSPILL_DELTA': { area: Area.DRAVANIAN_HINTERLANDS, name: 'Quickspill Delta', _id: 70202 },
//   'LANDLORD_COLONY': { area: Area.CHURNING_MISTS, name: 'Landlord Colony', _id: 70304 },
//   'THE_EDDIES': { area: Area.SEA_OF_CLOUDS, name: 'The Eddies', _id: 60102 },
//   'THE_BLUE_WINDOW': { area: Area.SEA_OF_CLOUDS, name: 'The Blue Window', _id: 60104 },
//   'RIVERSMEET': { area: Area.COERTHAS_WESTERN_HIGHLANDS, name: 'Riversmeet', _id: 40201 },
//   'ANYX_OLD': { area: Area.DRAVANIAN_FORELANDS, name: 'Anyx Old', _id: 70107 },
// };
