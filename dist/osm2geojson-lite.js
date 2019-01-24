!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).osm2geojson=e()}}(function(){var define,module,exports;return function(){return function e(t,s,r){function n(o,a){if(!s[o]){if(!t[o]){var l="function"==typeof require&&require;if(!a&&l)return l(o,!0);if(i)return i(o,!0);var d=new Error("Cannot find module '"+o+"'");throw d.code="MODULE_NOT_FOUND",d}var f=s[o]={exports:{}};t[o][0].call(f.exports,function(e){return n(t[o][1][e]||e)},f,f.exports,e,t,s,r)}return s[o].exports}for(var i="function"==typeof require&&require,o=0;o<r.length;o++)n(r[o]);return n}}()({1:[function(require,module,exports){const{Node:Node,Way:Way,Relation:Relation}=require("./osmobjs.js"),{purgeProps:purgeProps,RefElements:RefElements}=require("./utils.js"),XmlParser=require("./xmlparser.js");module.exports=((osm,opts)=>{let completeFeature=!1,renderTagged=!1,excludeWay=!0,parseOpts=e=>{if(e){completeFeature=!(!e.completeFeature&&!e.allFeatures),renderTagged=!!e.renderTagged;let t=e.suppressWay||e.excludeWay;void 0===t||t||(excludeWay=!1)}};parseOpts(opts);let detectFormat=e=>e.elements?"json":e.indexOf("<osm")>=0?"xml":e.trim().startsWith("{")?"json-raw":"invalid",format=detectFormat(osm),refElements=new RefElements,featureArray=[],analyzefeaturesFromJson=osm=>{for(let elem of osm.elements)switch(elem.type){case"node":let node=new Node(elem.id,refElements);elem.tags&&node.addTags(elem.tags),node.addProps(purgeProps(elem,["id","type","tags","lat","lon"])),node.setLatLng(elem);break;case"way":let way=new Way(elem.id,refElements);if(elem.tags&&way.addTags(elem.tags),way.addProps(purgeProps(elem,["id","type","tags","nodes","geometry"])),elem.nodes)for(let e of elem.nodes)way.addNodeRef(e);else elem.geometry&&way.setLatLngArray(elem.geometry);break;case"relation":let relation=new Relation(elem.id,refElements);if(elem.bounds)with(elem.bounds)relation.setBounds([parseFloat(minlon),parseFloat(minlat),parseFloat(maxlon),parseFloat(maxlat)]);if(elem.tags&&relation.addTags(elem.tags),relation.addProps(purgeProps(elem,["id","type","tags","bounds","members"])),elem.members)for(let member of elem.members)relation.addMember(member)}},analyzefeaturesFromXml=osm=>{const xmlParser=new XmlParser({progressive:!0});xmlParser.on("</osm.node>",node=>{with(node){let nd=new Node(id,refElements);for(let[k,v]of Object.entries(node))!k.startsWith("$")&&["id","lon","lat"].indexOf(k)<0&&nd.addProp(k,v);if(nd.setLatLng(node),node.$innerNodes)for(let ind of $innerNodes)"tag"===ind.$tag&&nd.addTag(ind.k,ind.v)}}),xmlParser.on("</osm.way>",node=>{with(node){let way=new Way(id,refElements);for(let[k,v]of Object.entries(node))!k.startsWith("$")&&["id"].indexOf(k)<0&&way.addProp(k.substring(1),v);if(node.$innerNodes)for(let ind of $innerNodes)"nd"===ind.$tag&&(ind.lon&&ind.lat?way.addLatLng(ind):ind.ref?way.addNodeRef(ind.ref):"tag"===ind.$tag&&way.addTag(ind.k,ind.v))}}),xmlParser.on("<osm.relation>",e=>{new Relation(e.id,refElements)}),xmlParser.on("</osm.relation.member>",(node,parent)=>{with(node){let relation=refElements[parent.id],member={type:type,role:node.role?role:"",ref:ref};if(node.lat&&node.lon){member.lat=lat,member.lon=lon,member.tags={};for(let[k,v]of Object.entries(node))!k.startsWith("$")&&["type","lat","lon"].indexOf(k)<0&&(member[k]=v)}if(node.$innerNodes){let geometry=[],nodes=[];for(let ind of $innerNodes)ind.lat&&ind.lon?geometry.push(ind):nodes.push(ind.ref);geometry.length>0?member.geometry=geometry:nodes.length>0&&(member.nodes=nodes)}relation.addMember(member)}}),xmlParser.on("</osm.relation.bounds>",(node,parent)=>{with(node)refElements[parent.id].setBounds([parseFloat(minlon),parseFloat(minlat),parseFloat(maxlon),parseFloat(maxlat)])}),xmlParser.on("</osm.relation.tag>",(e,t)=>{refElements[t.id].addTag(e.k,e.v)}),xmlParser.parse(osm)};"json-raw"===format&&(osm=JSON.parse(osm),format="json"),"json"===format?analyzefeaturesFromJson(osm):"xml"===format&&analyzefeaturesFromXml(osm);for(let v of Object.values(refElements))if(v.refCount<=0||v.hasTag&&renderTagged&&!(v instanceof Way&&excludeWay)){let features=v.toFeatureArray();if(v instanceof Relation&&!completeFeature&&features.length>0)return refElements.cleanup(),features[0].geometry;featureArray=featureArray.concat(features)}return refElements.cleanup(),{type:"FeatureCollection",features:featureArray}})},{"./osmobjs.js":2,"./utils.js":4,"./xmlparser.js":5}],2:[function(e,t,s){t.exports=(()=>{"use strict";const{first:t,last:s,coordsToKey:r,addToMap:n,removeFromMap:i,getFirstFromMap:o,isRing:a,ringDirection:l,ptInsidePolygon:d,strToFloat:f,LateBinder:u,WayCollection:h}=e("./utils.js"),p=e("./polytags.json");class m{constructor(e,t,s){this.type=e,this.id=t,this.refElems=s,this.tags={},this.props={id:this.getCompositeId()},this.refCount=0,this.hasTag=!1,s&&s.add(t,this)}addTags(e){this.tags=Object.assign(this.tags,e),this.hasTag=!!e}addTag(e,t){this.tags[e]=t,this.hasTag=!!e}addProp(e,t){this.props[e]=t}addProps(e){this.props=Object.assign(this.props,e)}getCompositeId(){return`${this.type}/${this.id}`}getProps(){return Object.assign(this.props,this.tags)}unlinkRef(){this.refElems=null}toFeatureArray(){return[]}}class g extends m{constructor(e,t){super("node",e,t),this.latLng=null}setLatLng(e){this.latLng=e}toFeatureArray(){return this.latLng?[{type:"Feature",id:this.getCompositeId(),properties:this.getProps(),geometry:{type:"Point",coordinates:f([this.latLng.lon,this.latLng.lat])}}]:[]}getLatLng(){return this.latLng}}class c extends m{constructor(e,t){super("way",e,t),this.latLngArray=[],this.isPolygon=!1,this.isBound=!1}addLatLng(e){this.latLngArray.push(e)}setLatLngArray(e){this.latLngArray=e}addNodeRef(e){this.latLngArray.push(new u(this.latLngArray,function(e){let t=this.refElems[e];if(t)return t.refCount++,t.getLatLng()},this,[e]))}analyzeTag(e,t){let s=p[e];s&&(this.isPolygon=!0,s.whitelist?this.isPolygon=s.whitelist.indexOf(t)>=0:s.blacklist&&(this.isPolygon=!(s.blacklist.indexOf(t)>=0)))}addTags(e){super.addTags(e);for(let[t,s]of Object.entries(e))this.analyzeTag(t,s)}addTag(e,t){super.addTag(e,t),this.analyzeTag(e,t)}bindRefs(){this.isBound||(this.latLngArray.reduce((e,t)=>t instanceof u?e.concat([t]):e,[]).forEach(e=>e.bind()),this.isBound=!0)}toCoordsArray(){return this.bindRefs(),this.latLngArray.map(e=>[e.lon,e.lat])}toFeatureArray(){this.bindRefs();let e=this.toCoordsArray();if(e.length>1){e=f(e);let t={type:"Feature",id:this.getCompositeId(),properties:this.getProps(),geometry:{type:"LineString",coordinates:e}};return this.isPolygon&&a(e)?("counterclockwise"!==l(e)&&e.reverse(),t.geometry={type:"Polygon",coordinates:[e]},[t]):[t]}return[]}}return{Node:g,Way:c,Relation:class extends m{constructor(e,t){super("relation",e,t),this.relations=[],this.nodes=[],this.bounds=null,this.isBound=!1}setBounds(e){this.bounds=e}addMember(e){switch(e.type){case"relation":this.relations.push(new u(this.relations,function(e){let t=this.refElems[e];if(t)return t.refCount++,t},this,[e.ref]));break;case"way":e.role||e.role;let t=this[e.role];if(t||(t=this[e.role]=[]),e.geometry){let s=new c(e.ref,this.refElems);s.setLatLngArray(e.geometry),s.refCount++,t.push(s)}else if(e.nodes){let s=new c(e.ref,this.refElems);for(let e of nodes)s.addNodeRef(e);s.refCount++,t.push(s)}else t.push(new u(t,function(e){let t=this.refElems[e];if(t)return t.refCount++,t},this,[e.ref]));break;case"node":let s=null;if(e.lat&&e.lon){(s=new g(e.ref,this.refElems)).setLatLng({lon:e.lon,lat:e.lat}),e.tags&&s.addTags(e.tags);for(let[t,r]of Object.entries(e))"id"!==t&&"type"!==t&&"lat"!==t&&"lon"!==t&&s.addProp(t,r);s.refCount++,this.nodes.push(s)}else this.nodes.push(new u(this.nodes,function(e){let t=this.refElems[e];if(t)return t.refCount++,t},this,[e.ref]))}}bindRefs(){if(!this.isBound){const e=["relations","nodes","outer","inner",""];for(let t of e){let e=this[t];if(e&&e.length>0){let t=e.slice(0);for(let e of t)e instanceof u?e.bind():e.bindRefs&&e.bindRefs()}}this.isBound=!0}}toFeatureArray(){this.bindRefs();let e=[],s=[],r=[];const n=["outer","inner",""];for(let e of this.relations)if(e){e.bindRefs();for(let t of n){let s=e[t];if(s){let e=this[t];e?[].splice.apply(e,[e.length,0].concat(s)):this[t]=s}}}for(let e of n){let t=this[e];if(t){this[e]=new h;for(let s of t)this[e].addWay(s)}}let i=null,o={type:"Feature",id:this.getCompositeId(),bbox:this.bounds,properties:this.getProps()};this.bounds||delete o.bbox,this.outer?(i=((e,s)=>{let r=e?e.toRings("counterclockwise"):[],n=s?s.toRings("clockwise"):[];if(r.length>0){let e=[],s=null;for(s of r)e.push([s]);for(;s=n.shift();)for(let n in r)if(d(t(s),r[n])){e[n].push(s);break}return 1===e.length?{type:"Polygon",coordinates:e[0]}:{type:"MultiPolygon",coordinates:e}}return null})(this.outer,this.inner))&&(o.geometry=i,e.push(o)):this[""]&&(i=(e=>{let t=e?e.toStrings():[];return t.length>0?1===t.length?{type:"LineString",coordinates:t[0]}:{type:"MultiLineString",coordinates:t}:null})(this[""]))&&(o.geometry=i,s.push(o));for(let e of this.nodes)r=r.concat(e.toFeatureArray());return e.concat(s).concat(r)}}}})()},{"./polytags.json":3,"./utils.js":4}],3:[function(e,t,s){t.exports={building:{},highway:{whitelist:["services","rest_area","escape","elevator"]},natural:{blacklist:["coastline","cliff","ridge","arete","tree_row"]},landuse:{},waterway:{whitelist:["riverbank","dock","boatyard","dam"]},amenity:{},leisure:{},barrier:{whitelist:["city_wall","ditch","hedge","retaining_wall","wall","spikes"]},railway:{whitelist:["station","turntable","roundhouse","platform"]},area:{},boundary:{},man_made:{blacklist:["cutline","embankment","pipeline"]},power:{whitelist:["plant","substation","generator","transformer"]},place:{},shop:{},aeroway:{blacklist:["taxiway"]},tourism:{},historic:{},public_transport:{},office:{},"building:part":{},military:{},ruins:{},"area:highway":{},craft:{},golf:{},indoor:{}}},{}],4:[function(e,t,s){t.exports=(()=>{"use strict";let e=e=>e[0],t=e=>e[e.length-1],s=e=>e.join(","),r=(e,t,s)=>{let r=e[t];r?r.push(s):e[t]=[s]},n=(e,t,s)=>{let r=e[t];r&&r.splice(r.indexOf(s),1)},i=(e,t)=>{let s=e[t];return s&&s.length>0?s[0]:null},o=r=>r.length>3&&s(e(r))===s(t(r)),a=(e,t,s)=>{t=t||0,s=s||1;let r=e.reduce((s,r,n)=>e[s][t]>r[t]?s:n,0),n=r<=0?e.length-2:r-1,i=r>=e.length-1?1:r+1,o=e[n][t],a=e[r][t],l=e[i][t],d=e[n][s],f=e[r][s];return(a-o)*(e[i][s]-d)-(l-o)*(f-d)<0?"clockwise":"counterclockwise"},l=e=>e instanceof Array?e.map(l):parseFloat(e);return{purgeProps:(e,t)=>{if(e){let s=Object.assign({},e);for(let e of t)delete s[e];return s}return{}},mergeProps:(e,t)=>(e=e||{},t=t||{},Object.assign(e,t)),first:e,last:t,coordsToKey:s,addToMap:r,removeFromMap:n,getFirstFromMap:i,isRing:o,ringDirection:a,ptInsidePolygon:(e,t,s,r)=>{s=s||0,r=r||1;let n=!1;for(let i=0,o=t.length-1;i<t.length;o=i++)(t[i][s]<=e[s]&&e[s]<t[o][s]||t[o][s]<=e[s]&&e[s]<t[i][s])&&e[r]<(t[o][r]-t[i][r])*(e[s]-t[i][s])/(t[o][s]-t[i][s])+t[i][r]&&(n=!n);return n},strToFloat:l,RefElements:class{add(e,t){this[e]=t}cleanup(){for(let[e,t]of Object.entries(this))t&&t.unlinkRef&&t.unlinkRef(),delete this[e]}},LateBinder:class{constructor(e,t,s,r){this.container=e,this.valueFunc=t,this.ctx=s,this.args=r}bind(){let e=this.valueFunc.apply(this.ctx,this.args);if(this.container instanceof Array){let t=[this.container.indexOf(this),1];e&&t.push(e),[].splice.apply(this.container,t)}else if("object"==typeof this.container){let t=Object.keys(this.container).find(e=>this.container[e]===this);t&&(e?this.container[t]=e:delete this.container[t])}}},WayCollection:class extends Array{constructor(){super(),this.firstMap={},this.lastMap={}}addWay(n){(n=n.toCoordsArray()).length>0&&(this.push(n),r(this.firstMap,s(e(n)),n),r(this.lastMap,s(t(n)),n))}toStrings(){let r=[],o=null;for(;o=this.shift();){n(this.firstMap,s(e(o)),o),n(this.lastMap,s(t(o)),o);let a=o,d=null;do{let r=s(t(a)),o=!1;(d=i(this.firstMap,r))||(d=i(this.lastMap,r),o=!0),d&&(this.splice(this.indexOf(d),1),n(this.firstMap,s(e(d)),d),n(this.lastMap,s(t(d)),d),o&&(d.length>a.length&&([a,d]=[d,a]),d.reverse()),a=a.concat(d.slice(1)))}while(d);r.push(l(a))}return r}toRings(e){let t=this.toStrings(),s=[],r=null;for(;r=t.shift();)o(r)&&(a(r)!==e&&r.reverse(),s.push(r));return s}}}})()},{}],5:[function(e,t,s){t.exports=(()=>{"use strict";function e(e){return null!=e.match(/^(.+?)\[(.+?)\]>$/g)}function t(e){let t=/^(.+?)\[(.+?)\]>$/g.exec(e);return t?{evt:t[1]+">",exp:t[2]}:{evt:e}}return class{constructor(e){e&&(this.queryParent=!!e.queryParent,this.progressive=e.progressive,this.queryParent&&(this.parentMap=new WeakMap)),this.evtListeners={}}parse(e,t,s){s=s?s+".":"";let r=/<([^ >\/]+)(.*?)>/gm,n=null,i=[];for(;n=r.exec(e);){let o=n[1],a={$tag:o},l=s+o,d=n[2].trim(),f=!1;(d.endsWith("/")||o.startsWith("?")||o.startsWith("!"))&&(f=!0);let u=/([^ ]+?)="(.+?)"/g,h=/([^ ]+?)='(.+?)'/g,p=null,m=!1;for(;p=u.exec(d);)m=!0,a[p[1]]=p[2];if(!m)for(;p=h.exec(d);)m=!0,a[p[1]]=p[2];if(m||""===d||(a.text=d),this.progressive&&this.emit(`<${l}>`,a,t),!f){let t=new RegExp(`([^]+?)</${o}>`,"g");t.lastIndex=r.lastIndex;let s=t.exec(e);if(s&&s[1]){r.lastIndex=t.lastIndex;let e=this.parse(s[1],a,l);e.length>0?a.$innerNodes=e:a.$innerText=s[1]}}this.queryParent&&t&&this.parentMap.set(a,t),this.progressive&&this.emit(`</${l}>`,a,t),i.push(a)}return i}getParent(e){return this.queryParent?this.parentMap.get(e):null}$addListener(e,t){let s=this.evtListeners[e];s?s.push(t):this.evtListeners[e]=[t]}addListener(s,r){e(s)&&(s=t(s),r.condition=function(e){let t="return "+e.replace(/(\$.+?)(?=[=!.])/g,"node.$&")+";";return new Function("node",t)}(s.exp),s=s.evt),this.$addListener(s,r)}$removeListener(e,t){let s=this.evtListeners[e];s&&s.splice(s.indexOf(t),1)}removeListener(s,r){e(s)&&(s=(s=t(s)).evt),this.$removeListener(s,r)}emit(e,...t){let s=this.evtListeners[e];if(s)for(let e of s)e.condition?!0===e.condition.apply(null,t)&&e.apply(null,t):e.apply(null,t)}on(e,t){this.addListener(e,t)}off(e,t){this.removeListener(e,t)}}})()},{}]},{},[1])(1)});