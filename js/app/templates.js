// Common doT JS templates and sub-templates used throughout the site.

let Templates = function(){

  var rawTemplates = {
    expansionSelector:
     `<div class="row">
        <div class="ui mini very compact buttons">
          <div class="ui {{?it.patches.length > 0}}active{{??}}disabled{{?}} primary patch-set button" style="width: 12.5em;" data-filter="{{=it.num}}">{{=it.name}} ({{=it.num}}.x)</div>
          <div class="ui {{?it.patches.includes(0)}}active{{??}}disabled{{?}} button" data-filter="{{=it.num}}">{{=it.num}}.0</div>
          <div class="ui {{?it.patches.includes(1)}}active{{??}}disabled{{?}} button" data-filter="{{=it.num}}.1">{{=it.num}}.1</div>
          <div class="ui {{?it.patches.includes(2)}}active{{??}}disabled{{?}} button" data-filter="{{=it.num}}.2">{{=it.num}}.2</div>
          <div class="ui {{?it.patches.includes(3)}}active{{??}}disabled{{?}} button" data-filter="{{=it.num}}.3">{{=it.num}}.3</div>
          <div class="ui {{?it.patches.includes(4)}}active{{??}}disabled{{?}} button" data-filter="{{=it.num}}.4">{{=it.num}}.4</div>
          <div class="ui {{?it.patches.includes(5)}}active{{??}}disabled{{?}} button" data-filter="{{=it.num}}.5">{{=it.num}}.5</div>
        </div>
      </div>`,
    expansionSelectors: 
     `<expansionSelector data-num="2" data-name="ARR" data-patches="[0,1,2,3,4,5,55]"></expansionSelector>
      <expansionSelector style="padding-top: 6px;" data-num="3" data-name="Heavensward" data-patches="[0,1,2,3,4,5,55]"></expansionSelector>
      <expansionSelector style="padding-top: 6px;" data-num="4" data-name="Stormblood" data-patches="[0,1,2,3,4,5,55]"></expansionSelector>
      <expansionSelector style="padding-top: 6px;" data-num="5" data-name="Shadowbringers" data-patches="[0,1,2,3,4,5,55]"></expansionSelector>
      <expansionSelector style="padding-top: 6px;" data-num="6" data-name="Endwalker" data-patches="[0,1,2,3,4,5,55]"></expansionSelector>
      <expansionSelector style="padding-top: 6px;" data-num="7" data-name="Dawntrail" data-patches="[0]"></expansionSelector>`,
    materialsFooter:
     `<div class="ui container">
        <p>
          FINAL FANTASY is a registered trademark of Square Enix Holdings Co., Ltd.<br/>
          FINAL FANTASY XIV © 2010 - 2024 SQUARE ENIX CO., LTD. All Rights Reserved.
        </p>
      </div>`,
    siteFooterLinks:
     `<div class="right menu">
        <a class="icon item" href="https://discord.gg/fishcord" data-tooltip="Fisherman's Horizon Discord" data-position="top right" target="_blank">
          <i class="discord icon"></i>
        </a>
        <a class="icon item" href="https://twitter.com/CarbunclePlushy" data-tooltip="Twitter" data-position="top right" target="_blank">
          <i class="twitter icon"></i>
        </a>
        <a class="icon item" href="https://github.com/icykoneko/ff14-fish-tracker-app" data-tooltip="Github" data-position="top right" target="_blank">
          <i class="github icon"></i>
        </a>
      </div>`,
  }


  class _Templates {
    constructor() {
      // Fix bug in doT.js template regex.
      doT.templateSettings.use = /\{\{#([\s\S\}]+?)\}\}/g;

      // Compile the templates.
      this.expansionSelectors = doT.template(rawTemplates.expansionSelectors);
      this.expansionSelector = doT.template(rawTemplates.expansionSelector);
      this.materialsFooter = doT.template(rawTemplates.materialsFooter);
      this.siteFooterLinks = doT.template(rawTemplates.siteFooterLinks);
    }

    applyTemplates() {
      // ORDER MATTERS!!!
      this.applyTemplate($("expansionSelectors"), this.expansionSelectors);
      this.applyTemplate($("expansionSelector"), this.expansionSelector);
      this.applyTemplate($("materialsFooter"), this.materialsFooter);
      this.applyTemplate($("siteFooterLinks"), this.siteFooterLinks);
    }

    applyTemplate(query, func) {
      query.replaceWith(function() {
        let originalStyle = $(this).attr("style");
        return $(func($(this).data())).attr("style", originalStyle);
      });
    }
  }

  return new _Templates();
}();