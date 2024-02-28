///////////////////////////////////////////////////////////////////////////////
// Extra Data
//
// NOTE: Requires extra manual validation!
//
// When testing, run the following in the console

function _validate_extra_data() {
    const known_names = _(DATA.ITEMS).map(x => x.name_en);
    const extra_data_names = _(EXTRA_DATA.FISH).keys();
    // Remove known names first, then remove any IDs...
    let unknown_names = _(extra_data_names).chain().difference(known_names).difference(_(DATA.ITEMS).keys()).value();

    if (unknown_names.length > 0) {
        console.warn("EXTRA_DATA.FISH Validation Failed! Unknown keys:", unknown_names);
    } else {
        console.info("EXTRA_DATA.FISH Validation Passed!");
    }
}

const EXTRA_DATA = {
    WORLDS: {
        "Aether": ["Adamantoise","Cactuar","Faerie","Gilgamesh","Jenova","Midgardsormr","Sargatanas","Siren"],
        "Chaos":["Cerberus","Louisoix","Moogle","Omega","Phantom","Ragnarok","Sagittarius","Spriggan"],
        "Crystal":["Balmung","Brynhildr","Coeurl","Diabolos","Goblin","Malboro","Mateus","Zalera"],
        "Dynamis":["Halicarnassus","Maduin","Marilith","Seraph"],
        "Elemental":["Aegis","Atomos","Carbuncle","Garuda","Gungnir","Kujata","Tonberry","Typhon"],
        "Gaia":["Alexander","Bahamut","Durandal","Fenrir","Ifrit","Ridill","Tiamat","Ultima"],
        "Korea":["\ucd08\ucf54\ubcf4","\ubaa8\uadf8\ub9ac","\uce74\ubc99\ud074","\ud1a4\ubca0\ub9ac","\ud39c\ub9ac\ub974"],
        "Light":["Alpha","Lich","Odin","Phoenix","Raiden","Shiva","Twintania","Zodiark"],
        "Mana":["Anima","Asura","Chocobo","Hades","Ixion","Masamune","Pandaemonium","Titan"],
        "Materia":["Bismarck","Ravana","Sephirot","Sophia","Zurvan"],
        "Meteor":["Belias","Mandragora","Ramuh","Shinryu","Unicorn","Valefor","Yojimbo","Zeromus"],
        "Primal":["Behemoth","Excalibur","Exodus","Famfrit","Hyperion","Lamia","Leviathan","Ultros"]
    },
    FISH: {
        /* NOTE: Video guides have been moved to gh-pages branch under site data */
    }
};
