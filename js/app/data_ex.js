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
    FISH: {
        "Navigator's Brand": { video: { youtube: "d8AM8-vkLOc" } },
        "Titanic Sawfish": { video: { youtube: "5KKdB9TGjPk" } },
        "Giant Aetherlouse": { video: { youtube: "LKRstQ4qFTE" } },
        "Othardian Lumpsucker": { video: { youtube: "qAudlN20LuY" } },
        "Namitaro": { video: { youtube: "P67TIWOK6So" } },
        "Lunar Deathworm": { video: { youtube: "DGKwbWEdO3s" } },
        "Nepto Dragon": { video: { youtube: "AGL8XN87a5U" } },
        "Endoceras": { video: { youtube: "dCEMM6Lken0" } },
        "Ealad Skaan": { video: { youtube: "bX9eOTayZBA" } },
        "The Ruby Dragon": { video: { youtube: "F3bz7LG4AlQ" } },
        "The Unconditional": { video: { youtube: "ryL0LcKYjKM" } },
        "Helicoprion": { video: { youtube: "NI_eCIn4uoE" } },
        "Stethacanthus": { video: { youtube: "02btuCpUpiU" } },
        "Fleeting Brand": { video: { youtube: "G7hHN5NnN0s" } },
        "Lancetfish": { video: { youtube: "q2tlJvcN6A4" } },
        "Mora Tecta": { video: { youtube: "q2tlJvcN6A4" } },
        "Greater Serpent of Ronka": { video: { youtube: "t3q1VNhweJc" } },
        "Priest of Yx'Lokwa": { video: { youtube: "t3q1VNhweJc" } },
        "Warden of the Seven Hues": { video: { youtube: "_tSbRKjum54" } },
        "Gilled Topknot": { video: { youtube: "bbLSUxOrBJs" } },
        "Garjana Wrasse": { video: { youtube: "ZDvGdnaja_U" } },
        "Thavnairian Calamari": { video: { youtube: "So7h1pBw8tc" } },
        "Cinder Surprise": { video: { youtube: "2S1OHYIcZrk" } },
        "Shonisaurus": { video: { youtube: "SWpVtVvrCTo" } },
        "Tebqeyiq Smelt": { video: { youtube: "ORMy9NntwhE" } },
        "Ninja Betta": { video: { youtube: "dpcINZEA2Y4" } },
        "Smaragdos": { video: { youtube: "_ITgW5s3P8Q" } },
        "Foun Myhk": { video: { youtube: "4gSGeh2KVo0" } },
        "Garlean Clam": { video: { youtube: "NtqYO4-p4bU" } },
        "Aquamaton": { video: { youtube: "VdbZNOYRKbQ" } },
        "Shadeshifter": { video: { youtube: "VdbZNOYRKbQ" } },
        "Aapoak": { video: { youtube: "xg1QtYIuF5g" } },
        // "Alnairan Salmon": { video: { youtube: "08ajs0JE-cE" } }, /* omitted, quest fish, not included in tracker or guide */
        36521: { video: { youtube: "tD0E7nQLq18" } }, /* Phallaina: DATs have an extra space in the name... messes EVERYTHING up... */
        "Sea Butterfly": { video: { youtube: "0fhLgkPTtcQ" } },
        "Cupfish": { video: { youtube: "8Smzp2u2m44" } },
        "Kuno the Killer": { video: { youtube: "mWsoPslH90I" } },
        "Canavan": { video: { youtube: "mWsoPslH90I" } },
        "Listracanthus": { video: { youtube: "gQUbgScFOYU" } },
        "The Jaws of Undeath": { video: { youtube: "gQUbgScFOYU" } },
        "Mangar": { video: { youtube: "goy8ztqckMQ" } },
        // "Lunar Lamenter": { video: { youtube: "hdkBV2-rCjs" } }, /* omitted, quest fish, not included in tracker or guide */
        "Ponderer": { video: { youtube: "lmG_rVuWADc" } },
        "Opabinia": { video: { youtube: "R4-BVctjX3g" } },
        // "Placodus": { video: { youtube: "ysGZ0IBZ-v4" } }, /* omitted, ocean fishing */
        "Pearl Pipira": { video: { youtube: "zTYy8diQDao" } },
        "Raimdellopterus": { video: { youtube: "N9CAsGXVBvU" } },
        "Basilosaurus": { video: { youtube: "4DflDXXZeP0" } },
        "Aster Trivi": { video: { youtube: "ifRPcjV4i3w" } },
        "Problematicus": { video: { youtube: "pWQbh47dThg" } },
        "Henodus Grandis": { video: { youtube: "K14DQ4eZGvM" } },
        "Deephaunt": { video: { youtube: "W_Wcvu5HdXo" } },
        "Magic Carpet": { video: { youtube: "AiLZkB6TyDU" } },
        "Nabaath Saw": { video: { youtube: "sFkJ3V-WUHU" } },
        "Octomammoth": { video: { youtube: "iX3oSCX1FsI" } },
        "The Mother of All Pancakes": { video: { youtube: "t7KgGicZWyY" } },
        "Armor Fish": { video: { youtube: "nmltaqnPbXY" } },
        "Celestial": { video: { youtube: "Q4cVeBfupyA" } },
        "Maru Crab": { video: { youtube: "nor__VGBkFM" } },
        "The Salter": { video: { youtube: "snWqOHysfgA" } },
        "Twitchbeard": { video: { youtube: "fMPI6JlXghc" } },
        "Charibenet": { video: { youtube: "fI6DhGY-BqY" } },
        "Loose Pendant": { video: { youtube: "LjwJHmR4x40" } },
        "Red Bowfin": { video: { youtube: "v0sdSGYjNkY" } },
        "Merlthor Goby": { video: { youtube: "ShAxKAjxtH4" } },
        "Steel Razor": { video: { youtube: "VUN4dkhL9AQ" } },
        "Labyrinthos Tilapia": { video: { youtube: "_ub2AihmNSU" } },
        "Rimepike": { video: { youtube: "s55BuOveMSI" } },
        "Python Discus": { video: { youtube: "nBDBfK9_8ts" } },
        "Bobgoblin Bass": { video: { youtube: "Q-YcAcXsz9w" } },
        "Aetherolectric Guitarfish": { video: { youtube: "gZUhT4k0hb0" } },
        "Glarramundi": { video: { youtube: "hHvQa-ifFWU" } },
        "The Sinsteeped": { video: { youtube: "91kA82wd2O4" } },
        "Rakshasa": { video: { youtube: "COrTexMOscU" } },
        "Madam Butterfly": { video: { youtube: "Ajg7o_gBxgQ" } },
        "Forbiddingway": { video: { youtube: "8oLcTi53xbU" } },
    },
};
