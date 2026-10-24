/* ES5 compatibility for Tizen 3 / Chromium 47. No timers, blur or image processing. */
(function () {
  'use strict';
  var forced = /(?:\?|&)legacy=1(?:&|$)/.test(location.search);
  var active = forced || !(window.CSS && window.CSS.supports && window.CSS.supports('color', 'var(--cf-test)'));
  var rules = window.CleanFrameLegacyRules || [], nextId = 1, pseudoStyle, lastPseudo = '', stats = {updates:0,ms:0};
  var matches = Element.prototype.matches || Element.prototype.webkitMatchesSelector;
  function copy(o) { var n={}; Object.keys(o||{}).forEach(function(k){n[k]=o[k];}); return n; }
  function resolve(value, variables, stack) {
    if (value === undefined || value === null) return null;
    value=String(value); stack=stack||[];
    var at=value.indexOf('var(');
    while(at>=0) {
      var depth=1, end=at+4, comma=-1;
      for(;end<value.length;end++){
        var c=value.charAt(end);
        if(c==='(')depth++; else if(c===')'){depth--;if(!depth)break;}
        else if(c===','&&depth===1&&comma<0)comma=end;
      }
      if(depth)return null;
      var name=value.slice(at+4,comma<0?end:comma).trim();
      var replacement=null;
      if(stack.indexOf(name)<0 && Object.prototype.hasOwnProperty.call(variables,name)){
        replacement=resolve(variables[name],variables,stack.concat([name]));
      }
      if(replacement===null && comma>=0)replacement=resolve(value.slice(comma+1,end).trim(),variables,stack);
      if(replacement===null)return null;
      value=value.slice(0,at)+replacement+value.slice(end+1);at=value.indexOf('var(');
    }
    return value;
  }
  function win(old, candidate) {
    return !old || (candidate.important!==old.important ? candidate.important :
      candidate.specificity!==old.specificity ? candidate.specificity>old.specificity : candidate.order>=old.order);
  }
  function indexRules(all, enabledRules) {
    var epoch=stats.updates+1;
    all.forEach(function(el){el.__cfEpoch=epoch;el.__cfBuckets={};});
    enabledRules.forEach(function(r){
      var nodes;try{nodes=document.querySelectorAll(r.selector);}catch(e){return;}
      for(var i=0;i<nodes.length;i++){
        var el=nodes[i];if(el.__cfEpoch!==epoch)continue;
        var out=el.__cfBuckets[r.pseudo]||(el.__cfBuckets[r.pseudo]={});
        for(var j=0;j<r.declarations.length;j++){
          var d=r.declarations[j],c={value:d[1],important:d[2],specificity:r.specificity,order:d[3]};
          if(win(out[d[0]],c))out[d[0]]=c;
        }
      }
    });
  }
  function collect(el,pseudo) { return el.__cfBuckets[pseudo]||{}; }
  function variableMap(el, inherited, declarations) {
    var raw=copy(inherited), own={};
    Object.keys(declarations).forEach(function(p){if(p.indexOf('--')===0){raw[p]=declarations[p].value;own[p]=true;}});
    Object.keys(el.__cfVars||{}).forEach(function(p){
      if(!declarations[p]||!declarations[p].important){raw[p]=el.__cfVars[p];own[p]=true;}
    });
    var resolved=copy(inherited);
    Object.keys(own).forEach(function(p){var v=resolve(raw[p],raw,[p]);if(v!==null)resolved[p]=v;else delete resolved[p];});
    return resolved;
  }
  function restoreGap(el) {
    var old=el.__cfGap;
    if(old){Object.keys(old).forEach(function(p){if(el.style.getPropertyValue(p)===old[p].applied)el.style.setProperty(p,old[p].before,old[p].priority);});el.__cfGap=null;}
  }
  function declarations(el, chosen, vars) {
    var previous=el.__cfApplied||{}, external=el.__cfExternal||{}, applied={};
    Object.keys(previous).forEach(function(p){
      if(el.style.getPropertyValue(p)!==previous[p].value || el.style.getPropertyPriority(p)!==previous[p].priority){
        external[p]={value:el.style.getPropertyValue(p),priority:el.style.getPropertyPriority(p)};
      }
    });
    Object.keys(chosen).forEach(function(p){
      if(p.indexOf('--')===0 || p==='row-gap'||p==='column-gap')return;
      var d=chosen[p],v=resolve(d.value,vars);
      if(v===null)return;
      if(!Object.prototype.hasOwnProperty.call(external,p)&&!previous[p]&&el.style.getPropertyValue(p)){
        external[p]={value:el.style.getPropertyValue(p),priority:el.style.getPropertyPriority(p)};
      }
      if(external[p]&&external[p].value&&(!d.important||external[p].priority==='important'))return;
      el.style.setProperty(p,v,d.important?'important':'');
      applied[p]={value:el.style.getPropertyValue(p),priority:el.style.getPropertyPriority(p)};
    });
    Object.keys(previous).forEach(function(p){
      if(!applied[p] && el.style.getPropertyValue(p)===previous[p].value){
        if(external[p])el.style.setProperty(p,external[p].value,external[p].priority);
        else el.style.removeProperty(p);
      }
    });
    el.__cfApplied=applied;el.__cfExternal=external;
  }
  function setGap(el, chosen, vars) {
    var row=chosen['row-gap'], col=chosen['column-gap'];
    if(!row&&!col)return;
    var style=window.getComputedStyle(el),direction=style.flexDirection||'row',isColumn=direction.indexOf('column')===0;
    var value=resolve(((isColumn?row:col)||row||col||{}).value,vars);
    if(!value||value==='normal'||parseFloat(value)===0)return;
    var prop=isColumn?(direction==='column-reverse'?'margin-bottom':'margin-top'):(direction==='row-reverse'?'margin-right':'margin-left');
    var children=el.children,seen=0;
    for(var i=0;i<children.length;i++){
      var child=children[i],cs=window.getComputedStyle(child);
      if(cs.display==='none'||cs.position==='absolute'||cs.position==='fixed')continue;
      if(seen++){
        var base=cs.getPropertyValue(prop);if(base==='auto')continue;
        var before=child.style.getPropertyValue(prop),priority=child.style.getPropertyPriority(prop);
        child.style.setProperty(prop,'calc('+ (base||'0px') +' + '+value+')');
        child.__cfGap=child.__cfGap||{};child.__cfGap[prop]={before:before,priority:priority,applied:child.style.getPropertyValue(prop)};
      }
    }
  }
  function apply() {
    if(!active || !document.body)return;
    var start=Date.now(), all=[document.documentElement,document.body], stage=document.getElementById('stage'),css=[];
    if(!stage)return;
    all.push(stage);var descendants=stage.querySelectorAll('*');
    for(var n=0;n<descendants.length;n++)all.push(descendants[n]);
    var enabled=rules.filter(function(r){return r.media.every(function(m){return window.matchMedia&&window.matchMedia(m).matches;});});
    indexRules(all, enabled);
    all.forEach(restoreGap);
    all.forEach(function(el){
      var parent=el.parentElement,vars=parent&&parent.__cfResolved||{}, chosen=collect(el,'',enabled);
      vars=variableMap(el,vars,chosen);el.__cfResolved=vars;el.__cfChosen=chosen;
      declarations(el,chosen,vars);
      ['::before','::after'].forEach(function(pseudo){
        var decl=collect(el,pseudo,enabled),body='';
        var pseudoVars=copy(vars);
        Object.keys(decl).forEach(function(p){if(p.indexOf('--')===0)pseudoVars[p]=decl[p].value;});
        Object.keys(decl).forEach(function(p){
          if(p.indexOf('--')===0||p==='row-gap'||p==='column-gap')return;
          var value=resolve(decl[p].value,pseudoVars);if(value!==null)body+=p+':'+value+'!important;';
        });
        if(body){if(!el.__cfId)el.__cfId=nextId++;el.setAttribute('data-cf-legacy',el.__cfId);css.push('[data-cf-legacy="'+el.__cfId+'"]'+pseudo+'{'+body+'}');}
      });
    });
    all.forEach(function(el){setGap(el,el.__cfChosen,el.__cfResolved);});
    if(!pseudoStyle){pseudoStyle=document.createElement('style');pseudoStyle.id='cf-legacy-pseudo';document.head.appendChild(pseudoStyle);}
    var text=css.join('\n');if(lastPseudo!==text){pseudoStyle.textContent=text;lastPseudo=text;}
    document.documentElement.classList.add('cf-tizen3-ready');
    stats.updates++;stats.ms=Date.now()-start;
  }
  function set(el,name,value) {
    if(!active){if(value===null)el.style.removeProperty(name);else el.style.setProperty(name,String(value));return;}
    el.__cfVars=el.__cfVars||{};
    if(value===null)delete el.__cfVars[name];else el.__cfVars[name]=String(value);
  }
  if(active){
    document.documentElement.classList.add('cf-tizen3');
    var link=document.getElementById('cf-runtime-style');if(link)link.href='style-tizen3.css';
  }
  window.CleanFrameLegacy={active:active,apply:apply,set:set,resolve:resolve,stats:stats};
})();
