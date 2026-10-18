//! Licensed to the .NET Foundation under one or more agreements.
//! The .NET Foundation licenses this file to you under the MIT license.

var e=!1;const t=async()=>WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,4,1,96,0,0,3,2,1,0,10,8,1,6,0,6,64,25,11,11])),o=async()=>WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,15,1,13,0,65,1,253,15,65,2,253,15,253,128,2,11])),n=async()=>WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11])),r=Symbol.for("wasm promise_control");function i(e,t){let o=null;const n=new Promise((function(n,r){o={isDone:!1,promise:null,resolve:t=>{o.isDone||(o.isDone=!0,n(t),e&&e())},reject:e=>{o.isDone||(o.isDone=!0,r(e),t&&t())}}}));o.promise=n;const i=n;return i[r]=o,{promise:i,promise_control:o}}function s(e){return e[r]}function a(e){e&&function(e){return void 0!==e[r]}(e)||Be(!1,"Promise is not controllable")}const l="__mono_message__",c=["debug","log","trace","warn","info","error"],d="MONO_WASM: ";let u,f,m,g,p,h;function w(e){g=e}function b(e){if(Pe.diagnosticTracing){const t="function"==typeof e?e():e;console.debug(d+t)}}function y(e,...t){console.info(d+e,...t)}function v(e,...t){console.info(e,...t)}function E(e,...t){console.warn(d+e,...t)}function _(e,...t){if(t&&t.length>0&&t[0]&&"object"==typeof t[0]){if(t[0].silent)return;if(t[0].toString)return void console.error(d+e,t[0].toString())}console.error(d+e,...t)}function x(e,t,o){return function(...n){try{let r=n[0];if(void 0===r)r="undefined";else if(null===r)r="null";else if("function"==typeof r)r=r.toString();else if("string"!=typeof r)try{r=JSON.stringify(r)}catch(e){r=r.toString()}t(o?JSON.stringify({method:e,payload:r,arguments:n.slice(1)}):[e+r,...n.slice(1)])}catch(e){m.error(`proxyConsole failed: ${e}`)}}}function j(e,t,o){f=t,g=e,m={...t};const n=`${o}/console`.replace("https://","wss://").replace("http://","ws://");u=new WebSocket(n),u.addEventListener("error",A),u.addEventListener("close",S),function(){for(const e of c)f[e]=x(`console.${e}`,T,!0)}()}function R(e){let t=30;const o=()=>{u?0==u.bufferedAmount||0==t?(e&&v(e),function(){for(const e of c)f[e]=x(`console.${e}`,m.log,!1)}(),u.removeEventListener("error",A),u.removeEventListener("close",S),u.close(1e3,e),u=void 0):(t--,globalThis.setTimeout(o,100)):e&&m&&m.log(e)};o()}function T(e){u&&u.readyState===WebSocket.OPEN?u.send(e):m.log(e)}function A(e){m.error(`[${g}] proxy console websocket error: ${e}`,e)}function S(e){m.debug(`[${g}] proxy console websocket closed: ${e}`,e)}function D(){Pe.preferredIcuAsset=O(Pe.config);let e="invariant"==Pe.config.globalizationMode;if(!e)if(Pe.preferredIcuAsset)Pe.diagnosticTracing&&b("ICU data archive(s) available, disabling invariant mode");else{if("custom"===Pe.config.globalizationMode||"all"===Pe.config.globalizationMode||"sharded"===Pe.config.globalizationMode){const e="invariant globalization mode is inactive and no ICU data archives are available";throw _(`ERROR: ${e}`),new Error(e)}Pe.diagnosticTracing&&b("ICU data archive(s) not available, using invariant globalization mode"),e=!0,Pe.preferredIcuAsset=null}const t="DOTNET_SYSTEM_GLOBALIZATION_INVARIANT",o=Pe.config.environmentVariables;if(void 0===o[t]&&e&&(o[t]="1"),void 0===o.TZ)try{const e=Intl.DateTimeFormat().resolvedOptions().timeZone||null;e&&(o.TZ=e)}catch(e){y("failed to detect timezone, will fallback to UTC")}}function O(e){var t;if((null===(t=e.resources)||void 0===t?void 0:t.icu)&&"invariant"!=e.globalizationMode){const t=e.applicationCulture||(ke?globalThis.navigator&&globalThis.navigator.languages&&globalThis.navigator.languages[0]:Intl.DateTimeFormat().resolvedOptions().locale),o=e.resources.icu;let n=null;if("custom"===e.globalizationMode){if(o.length>=1)return o[0].name}else t&&"all"!==e.globalizationMode?"sharded"===e.globalizationMode&&(n=function(e){const t=e.split("-")[0];return"en"===t||["fr","fr-FR","it","it-IT","de","de-DE","es","es-ES"].includes(e)?"icudt_EFIGS.dat":["zh","ko","ja"].includes(t)?"icudt_CJK.dat":"icudt_no_CJK.dat"}(t)):n="icudt.dat";if(n)for(let e=0;e<o.length;e++){const t=o[e];if(t.virtualPath===n)return t.name}}return e.globalizationMode="invariant",null}(new Date).valueOf();const C=class{constructor(e){this.url=e}toString(){return this.url}};async function k(e,t){try{const o="function"==typeof globalThis.fetch;if(Se){const n=e.startsWith("file://");if(!n&&o)return globalThis.fetch(e,t||{credentials:"same-origin"});p||(h=Ne.require("url"),p=Ne.require("fs")),n&&(e=h.fileURLToPath(e));const r=await p.promises.readFile(e);return{ok:!0,headers:{length:0,get:()=>null},url:e,arrayBuffer:()=>r,json:()=>JSON.parse(r),text:()=>{throw new Error("NotImplementedException")}}}if(o)return globalThis.fetch(e,t||{credentials:"same-origin"});if("function"==typeof read)return{ok:!0,url:e,headers:{length:0,get:()=>null},arrayBuffer:()=>new Uint8Array(read(e,"binary")),json:()=>JSON.parse(read(e,"utf8")),text:()=>read(e,"utf8")}}catch(t){return{ok:!1,url:e,status:500,headers:{length:0,get:()=>null},statusText:"ERR28: "+t,arrayBuffer:()=>{throw t},json:()=>{throw t},text:()=>{throw t}}}throw new Error("No fetch implementation available")}function I(e){return"string"!=typeof e&&Be(!1,"url must be a string"),!M(e)&&0!==e.indexOf("./")&&0!==e.indexOf("../")&&globalThis.URL&&globalThis.document&&globalThis.document.baseURI&&(e=new URL(e,globalThis.document.baseURI).toString()),e}const U=/^[a-zA-Z][a-zA-Z\d+\-.]*?:\/\//,P=/[a-zA-Z]:[\\/]/;function M(e){return Se||Ie?e.startsWith("/")||e.startsWith("\\")||-1!==e.indexOf("///")||P.test(e):U.test(e)}let L,N=0;const $=[],z=[],W=new Map,F={"js-module-threads":!0,"js-module-runtime":!0,"js-module-dotnet":!0,"js-module-native":!0,"js-module-diagnostics":!0},B={...F,"js-module-library-initializer":!0},V={...F,dotnetwasm:!0,heap:!0,manifest:!0},q={...B,manifest:!0},H={...B,dotnetwasm:!0},J={dotnetwasm:!0,symbols:!0},Z={...B,dotnetwasm:!0,symbols:!0},Q={symbols:!0};function G(e){return!("icu"==e.behavior&&e.name!=Pe.preferredIcuAsset)}function K(e,t,o){null!=t||(t=[]),Be(1==t.length,`Expect to have one ${o} asset in resources`);const n=t[0];return n.behavior=o,X(n),e.push(n),n}function X(e){V[e.behavior]&&W.set(e.behavior,e)}function Y(e){Be(V[e],`Unknown single asset behavior ${e}`);const t=W.get(e);if(t&&!t.resolvedUrl)if(t.resolvedUrl=Pe.locateFile(t.name),F[t.behavior]){const e=ge(t);e?("string"!=typeof e&&Be(!1,"loadBootResource response for 'dotnetjs' type should be a URL string"),t.resolvedUrl=e):t.resolvedUrl=ce(t.resolvedUrl,t.behavior)}else if("dotnetwasm"!==t.behavior)throw new Error(`Unknown single asset behavior ${e}`);return t}function ee(e){const t=Y(e);return Be(t,`Single asset for ${e} not found`),t}let te=!1;async function oe(){if(!te){te=!0,Pe.diagnosticTracing&&b("mono_download_assets");try{const e=[],t=[],o=(e,t)=>{!Z[e.behavior]&&G(e)&&Pe.expected_instantiated_assets_count++,!H[e.behavior]&&G(e)&&(Pe.expected_downloaded_assets_count++,t.push(se(e)))};for(const t of $)o(t,e);for(const e of z)o(e,t);Pe.allDownloadsQueued.promise_control.resolve(),Promise.all([...e,...t]).then((()=>{Pe.allDownloadsFinished.promise_control.resolve()})).catch((e=>{throw Pe.err("Error in mono_download_assets: "+e),Xe(1,e),e})),await Pe.runtimeModuleLoaded.promise;const n=async e=>{const t=await e;if(t.buffer){if(!Z[t.behavior]){t.buffer&&"object"==typeof t.buffer||Be(!1,"asset buffer must be array-like or buffer-like or promise of these"),"string"!=typeof t.resolvedUrl&&Be(!1,"resolvedUrl must be string");const e=t.resolvedUrl,o=await t.buffer,n=new Uint8Array(o);pe(t),await Ue.beforeOnRuntimeInitialized.promise,Ue.instantiate_asset(t,e,n)}}else J[t.behavior]?("symbols"===t.behavior&&(await Ue.instantiate_symbols_asset(t),pe(t)),J[t.behavior]&&++Pe.actual_downloaded_assets_count):(t.isOptional||Be(!1,"Expected asset to have the downloaded buffer"),!H[t.behavior]&&G(t)&&Pe.expected_downloaded_assets_count--,!Z[t.behavior]&&G(t)&&Pe.expected_instantiated_assets_count--)},r=[],i=[];for(const t of e)r.push(n(t));for(const e of t)i.push(n(e));Promise.all(r).then((()=>{Ce||Ue.coreAssetsInMemory.promise_control.resolve()})).catch((e=>{throw Pe.err("Error in mono_download_assets: "+e),Xe(1,e),e})),Promise.all(i).then((async()=>{Ce||(await Ue.coreAssetsInMemory.promise,Ue.allAssetsInMemory.promise_control.resolve())})).catch((e=>{throw Pe.err("Error in mono_download_assets: "+e),Xe(1,e),e}))}catch(e){throw Pe.err("Error in mono_download_assets: "+e),e}}}let ne=!1;function re(){if(ne)return;ne=!0;const e=Pe.config,t=[];if(e.assets)for(const t of e.assets)"object"!=typeof t&&Be(!1,`asset must be object, it was ${typeof t} : ${t}`),"string"!=typeof t.behavior&&Be(!1,"asset behavior must be known string"),"string"!=typeof t.name&&Be(!1,"asset name must be string"),t.resolvedUrl&&"string"!=typeof t.resolvedUrl&&Be(!1,"asset resolvedUrl could be string"),t.hash&&"string"!=typeof t.hash&&Be(!1,"asset resolvedUrl could be string"),t.pendingDownload&&"object"!=typeof t.pendingDownload&&Be(!1,"asset pendingDownload could be object"),t.isCore?$.push(t):z.push(t),X(t);else if(e.resources){const o=e.resources;o.wasmNative||Be(!1,"resources.wasmNative must be defined"),o.jsModuleNative||Be(!1,"resources.jsModuleNative must be defined"),o.jsModuleRuntime||Be(!1,"resources.jsModuleRuntime must be defined"),K(z,o.wasmNative,"dotnetwasm"),K(t,o.jsModuleNative,"js-module-native"),K(t,o.jsModuleRuntime,"js-module-runtime"),o.jsModuleDiagnostics&&K(t,o.jsModuleDiagnostics,"js-module-diagnostics");const n=(e,t,o)=>{const n=e;n.behavior=t,o?(n.isCore=!0,$.push(n)):z.push(n)};if(o.coreAssembly)for(let e=0;e<o.coreAssembly.length;e++)n(o.coreAssembly[e],"assembly",!0);if(o.assembly)for(let e=0;e<o.assembly.length;e++)n(o.assembly[e],"assembly",!o.coreAssembly);if(0!=e.debugLevel&&Pe.isDebuggingSupported()){if(o.corePdb)for(let e=0;e<o.corePdb.length;e++)n(o.corePdb[e],"pdb",!0);if(o.pdb)for(let e=0;e<o.pdb.length;e++)n(o.pdb[e],"pdb",!o.corePdb)}if(e.loadAllSatelliteResources&&o.satelliteResources)for(const e in o.satelliteResources)for(let t=0;t<o.satelliteResources[e].length;t++){const r=o.satelliteResources[e][t];r.culture=e,n(r,"resource",!o.coreAssembly)}if(o.coreVfs)for(let e=0;e<o.coreVfs.length;e++)n(o.coreVfs[e],"vfs",!0);if(o.vfs)for(let e=0;e<o.vfs.length;e++)n(o.vfs[e],"vfs",!o.coreVfs);const r=O(e);if(r&&o.icu)for(let e=0;e<o.icu.length;e++){const t=o.icu[e];t.name===r&&n(t,"icu",!1)}if(o.wasmSymbols)for(let e=0;e<o.wasmSymbols.length;e++)n(o.wasmSymbols[e],"symbols",!1)}if(e.appsettings)for(let t=0;t<e.appsettings.length;t++){const o=e.appsettings[t],n=he(o);"appsettings.json"!==n&&n!==`appsettings.${e.applicationEnvironment}.json`||z.push({name:o,behavior:"vfs",cache:"no-cache",useCredentials:!0})}e.assets=[...$,...z,...t]}async function ie(e){const t=await se(e);return await t.pendingDownloadInternal.response,t.buffer}async function se(e){try{return await ae(e)}catch(t){if(!Pe.enableDownloadRetry)throw t;if(Ie||Se)throw t;if(e.pendingDownload&&e.pendingDownloadInternal==e.pendingDownload)throw t;if(e.resolvedUrl&&-1!=e.resolvedUrl.indexOf("file://"))throw t;if(t&&404==t.status)throw t;e.pendingDownloadInternal=void 0,await Pe.allDownloadsQueued.promise;try{return Pe.diagnosticTracing&&b(`Retrying download '${e.name}'`),await ae(e)}catch(t){return e.pendingDownloadInternal=void 0,await new Promise((e=>globalThis.setTimeout(e,100))),Pe.diagnosticTracing&&b(`Retrying download (2) '${e.name}' after delay`),await ae(e)}}}async function ae(e){for(;L;)await L.promise;try{++N,N==Pe.maxParallelDownloads&&(Pe.diagnosticTracing&&b("Throttling further parallel downloads"),L=i());const t=await async function(e){if(e.pendingDownload&&(e.pendingDownloadInternal=e.pendingDownload),e.pendingDownloadInternal&&e.pendingDownloadInternal.response)return e.pendingDownloadInternal.response;if(e.buffer){const t=await e.buffer;return e.resolvedUrl||(e.resolvedUrl="undefined://"+e.name),e.pendingDownloadInternal={url:e.resolvedUrl,name:e.name,response:Promise.resolve({ok:!0,arrayBuffer:()=>t,json:()=>JSON.parse(new TextDecoder("utf-8").decode(t)),text:()=>{throw new Error("NotImplementedException")},headers:{get:()=>{}}})},e.pendingDownloadInternal.response}const t=e.loadRemote&&Pe.config.remoteSources?Pe.config.remoteSources:[""];let o;for(let n of t){n=n.trim(),"./"===n&&(n="");const t=le(e,n);e.name===t?Pe.diagnosticTracing&&b(`Attempting to download '${t}'`):Pe.diagnosticTracing&&b(`Attempting to download '${t}' for ${e.name}`);try{e.resolvedUrl=t;const n=fe(e);if(e.pendingDownloadInternal=n,o=await n.response,!o||!o.ok)continue;return o}catch(e){o||(o={ok:!1,url:t,status:0,statusText:""+e});continue}}const n=e.isOptional||e.name.match(/\.pdb$/)&&Pe.config.ignorePdbLoadErrors;if(o||Be(!1,`Response undefined ${e.name}`),!n){const t=new Error(`download '${o.url}' for ${e.name} failed ${o.status} ${o.statusText}`);throw t.status=o.status,t}y(`optional download '${o.url}' for ${e.name} failed ${o.status} ${o.statusText}`)}(e);return t?(J[e.behavior]||(e.buffer=await t.arrayBuffer(),++Pe.actual_downloaded_assets_count),e):e}finally{if(--N,L&&N==Pe.maxParallelDownloads-1){Pe.diagnosticTracing&&b("Resuming more parallel downloads");const e=L;L=void 0,e.promise_control.resolve()}}}function le(e,t){let o;return null==t&&Be(!1,`sourcePrefix must be provided for ${e.name}`),e.resolvedUrl?o=e.resolvedUrl:(o=""===t?"assembly"===e.behavior||"pdb"===e.behavior?e.name:"resource"===e.behavior&&e.culture&&""!==e.culture?`${e.culture}/${e.name}`:e.name:t+e.name,o=ce(Pe.locateFile(o),e.behavior)),o&&"string"==typeof o||Be(!1,"attemptUrl need to be path or url string"),o}function ce(e,t){return Pe.modulesUniqueQuery&&q[t]&&(e+=Pe.modulesUniqueQuery),e}let de=0;const ue=new Set;function fe(e){try{e.resolvedUrl||Be(!1,"Request's resolvedUrl must be set");const t=function(e){let t=e.resolvedUrl;if(Pe.loadBootResource){const o=ge(e);if(o instanceof Promise)return o;"string"==typeof o&&(t=o)}const o={};return e.cache?o.cache=e.cache:Pe.config.disableNoCacheFetch||(o.cache="no-cache"),e.useCredentials?o.credentials="include":!Pe.config.disableIntegrityCheck&&e.hash&&(o.integrity=e.hash),Pe.fetch_like(t,o)}(e),o={name:e.name,url:e.resolvedUrl,response:t};return ue.add(e.name),o.response.then((()=>{"assembly"==e.behavior&&Pe.loadedAssemblies.push(e.name),de++,Pe.onDownloadResourceProgress&&Pe.onDownloadResourceProgress(de,ue.size)})),o}catch(t){const o={ok:!1,url:e.resolvedUrl,status:500,statusText:"ERR29: "+t,arrayBuffer:()=>{throw t},json:()=>{throw t}};return{name:e.name,url:e.resolvedUrl,response:Promise.resolve(o)}}}const me={resource:"assembly",assembly:"assembly",pdb:"pdb",icu:"globalization",vfs:"configuration",manifest:"manifest",dotnetwasm:"dotnetwasm","js-module-dotnet":"dotnetjs","js-module-native":"dotnetjs","js-module-runtime":"dotnetjs","js-module-threads":"dotnetjs"};function ge(e){var t;if(Pe.loadBootResource){const o=null!==(t=e.hash)&&void 0!==t?t:"",n=e.resolvedUrl,r=me[e.behavior];if(r){const t=Pe.loadBootResource(r,e.name,n,o,e.behavior);return"string"==typeof t?I(t):t}}}function pe(e){e.pendingDownloadInternal=null,e.pendingDownload=null,e.buffer=null,e.moduleExports=null}function he(e){let t=e.lastIndexOf("/");return t>=0&&t++,e.substring(t)}async function we(e){e&&await Promise.all((null!=e?e:[]).map((e=>async function(e){try{const t=e.name;if(!e.moduleExports){const o=ce(Pe.locateFile(t),"js-module-library-initializer");Pe.diagnosticTracing&&b(`Attempting to import '${o}' for ${e}`),e.moduleExports=await import(/*! webpackIgnore: true */o)}Pe.libraryInitializers.push({scriptName:t,exports:e.moduleExports})}catch(t){E(`Failed to import library initializer '${e}': ${t}`)}}(e))))}async function be(e,t){if(!Pe.libraryInitializers)return;const o=[];for(let n=0;n<Pe.libraryInitializers.length;n++){const r=Pe.libraryInitializers[n];r.exports[e]&&o.push(ye(r.scriptName,e,(()=>r.exports[e](...t))))}await Promise.all(o)}async function ye(e,t,o){try{await o()}catch(o){throw E(`Failed to invoke '${t}' on library initializer '${e}': ${o}`),Xe(1,o),o}}function ve(e,t){if(e===t)return e;const o={...t};return void 0!==o.assets&&o.assets!==e.assets&&(o.assets=[...e.assets||[],...o.assets||[]]),void 0!==o.resources&&(o.resources=_e(e.resources||{assembly:[],jsModuleNative:[],jsModuleRuntime:[],wasmNative:[]},o.resources)),void 0!==o.environmentVariables&&(o.environmentVariables={...e.environmentVariables||{},...o.environmentVariables||{}}),void 0!==o.runtimeOptions&&o.runtimeOptions!==e.runtimeOptions&&(o.runtimeOptions=[...e.runtimeOptions||[],...o.runtimeOptions||[]]),Object.assign(e,o)}function Ee(e,t){if(e===t)return e;const o={...t};return o.config&&(e.config||(e.config={}),o.config=ve(e.config,o.config)),Object.assign(e,o)}function _e(e,t){if(e===t)return e;const o={...t};return void 0!==o.coreAssembly&&(o.coreAssembly=[...e.coreAssembly||[],...o.coreAssembly||[]]),void 0!==o.assembly&&(o.assembly=[...e.assembly||[],...o.assembly||[]]),void 0!==o.lazyAssembly&&(o.lazyAssembly=[...e.lazyAssembly||[],...o.lazyAssembly||[]]),void 0!==o.corePdb&&(o.corePdb=[...e.corePdb||[],...o.corePdb||[]]),void 0!==o.pdb&&(o.pdb=[...e.pdb||[],...o.pdb||[]]),void 0!==o.jsModuleWorker&&(o.jsModuleWorker=[...e.jsModuleWorker||[],...o.jsModuleWorker||[]]),void 0!==o.jsModuleNative&&(o.jsModuleNative=[...e.jsModuleNative||[],...o.jsModuleNative||[]]),void 0!==o.jsModuleDiagnostics&&(o.jsModuleDiagnostics=[...e.jsModuleDiagnostics||[],...o.jsModuleDiagnostics||[]]),void 0!==o.jsModuleRuntime&&(o.jsModuleRuntime=[...e.jsModuleRuntime||[],...o.jsModuleRuntime||[]]),void 0!==o.wasmSymbols&&(o.wasmSymbols=[...e.wasmSymbols||[],...o.wasmSymbols||[]]),void 0!==o.wasmNative&&(o.wasmNative=[...e.wasmNative||[],...o.wasmNative||[]]),void 0!==o.icu&&(o.icu=[...e.icu||[],...o.icu||[]]),void 0!==o.satelliteResources&&(o.satelliteResources=function(e,t){if(e===t)return e;for(const o in t)e[o]=[...e[o]||[],...t[o]||[]];return e}(e.satelliteResources||{},o.satelliteResources||{})),void 0!==o.modulesAfterConfigLoaded&&(o.modulesAfterConfigLoaded=[...e.modulesAfterConfigLoaded||[],...o.modulesAfterConfigLoaded||[]]),void 0!==o.modulesAfterRuntimeReady&&(o.modulesAfterRuntimeReady=[...e.modulesAfterRuntimeReady||[],...o.modulesAfterRuntimeReady||[]]),void 0!==o.extensions&&(o.extensions={...e.extensions||{},...o.extensions||{}}),void 0!==o.vfs&&(o.vfs=[...e.vfs||[],...o.vfs||[]]),Object.assign(e,o)}function xe(){const e=Pe.config;if(e.environmentVariables=e.environmentVariables||{},e.runtimeOptions=e.runtimeOptions||[],e.resources=e.resources||{assembly:[],jsModuleNative:[],jsModuleWorker:[],jsModuleRuntime:[],wasmNative:[],vfs:[],satelliteResources:{}},e.assets){Pe.diagnosticTracing&&b("config.assets is deprecated, use config.resources instead");for(const t of e.assets){const o={};switch(t.behavior){case"assembly":o.assembly=[t];break;case"pdb":o.pdb=[t];break;case"resource":o.satelliteResources={},o.satelliteResources[t.culture]=[t];break;case"icu":o.icu=[t];break;case"symbols":o.wasmSymbols=[t];break;case"vfs":o.vfs=[t];break;case"dotnetwasm":o.wasmNative=[t];break;case"js-module-threads":o.jsModuleWorker=[t];break;case"js-module-runtime":o.jsModuleRuntime=[t];break;case"js-module-native":o.jsModuleNative=[t];break;case"js-module-diagnostics":o.jsModuleDiagnostics=[t];break;case"js-module-dotnet":break;default:throw new Error(`Unexpected behavior ${t.behavior} of asset ${t.name}`)}_e(e.resources,o)}}e.debugLevel,e.applicationEnvironment||(e.applicationEnvironment="Production"),e.applicationCulture&&(e.environmentVariables.LANG=`${e.applicationCulture}.UTF-8`),Ue.diagnosticTracing=Pe.diagnosticTracing=!!e.diagnosticTracing,Ue.waitForDebugger=e.waitForDebugger,Pe.maxParallelDownloads=e.maxParallelDownloads||Pe.maxParallelDownloads,Pe.enableDownloadRetry=void 0!==e.enableDownloadRetry?e.enableDownloadRetry:Pe.enableDownloadRetry}let je=!1;async function Re(e){var t;if(je)return void await Pe.afterConfigLoaded.promise;let o;try{if(e.configSrc||Pe.config&&0!==Object.keys(Pe.config).length&&(Pe.config.assets||Pe.config.resources)||(e.configSrc="dotnet.boot.js"),o=e.configSrc,je=!0,o&&(Pe.diagnosticTracing&&b("mono_wasm_load_config"),await async function(e){const t=e.configSrc,o=Pe.locateFile(t);let n=null;void 0!==Pe.loadBootResource&&(n=Pe.loadBootResource("manifest",t,o,"","manifest"));let r,i=null;if(n)if("string"==typeof n)n.includes(".json")?(i=await s(I(n)),r=await Ae(i)):r=(await import(I(n))).config;else{const e=await n;"function"==typeof e.json?(i=e,r=await Ae(i)):r=e.config}else o.includes(".json")?(i=await s(ce(o,"manifest")),r=await Ae(i)):r=(await import(ce(o,"manifest"))).config;function s(e){return Pe.fetch_like(e,{method:"GET",credentials:"include",cache:"no-cache"})}Pe.config.applicationEnvironment&&(r.applicationEnvironment=Pe.config.applicationEnvironment),ve(Pe.config,r)}(e)),xe(),await we(null===(t=Pe.config.resources)||void 0===t?void 0:t.modulesAfterConfigLoaded),await be("onRuntimeConfigLoaded",[Pe.config]),e.onConfigLoaded)try{await e.onConfigLoaded(Pe.config,Le),xe()}catch(e){throw _("onConfigLoaded() failed",e),e}xe(),Pe.afterConfigLoaded.promise_control.resolve(Pe.config)}catch(t){const n=`Failed to load config file ${o} ${t} ${null==t?void 0:t.stack}`;throw Pe.config=e.config=Object.assign(Pe.config,{message:n,error:t,isError:!0}),Xe(1,new Error(n)),t}}function Te(){return!!globalThis.navigator&&(Pe.isChromium||Pe.isFirefox)}async function Ae(e){const t=Pe.config,o=await e.json();t.applicationEnvironment||o.applicationEnvironment||(o.applicationEnvironment=e.headers.get("Blazor-Environment")||e.headers.get("DotNet-Environment")||void 0),o.environmentVariables||(o.environmentVariables={});const n=e.headers.get("DOTNET-MODIFIABLE-ASSEMBLIES");n&&(o.environmentVariables.DOTNET_MODIFIABLE_ASSEMBLIES=n);const r=e.headers.get("ASPNETCORE-BROWSER-TOOLS");return r&&(o.environmentVariables.__ASPNETCORE_BROWSER_TOOLS=r),o}"function"!=typeof importScripts||globalThis.onmessage||(globalThis.dotnetSidecar=!0);const Se="object"==typeof process&&"object"==typeof process.versions&&"string"==typeof process.versions.node,De="function"==typeof importScripts,Oe=De&&"undefined"!=typeof dotnetSidecar,Ce=De&&!Oe,ke="object"==typeof window||De&&!Se,Ie=!ke&&!Se;let Ue={},Pe={},Me={},Le={},Ne={},$e=!1;const ze={},We={config:ze},Fe={mono:{},binding:{},internal:Ne,module:We,loaderHelpers:Pe,runtimeHelpers:Ue,diagnosticHelpers:Me,api:Le};function Be(e,t){if(e)return;const o="Assert failed: "+("function"==typeof t?t():t),n=new Error(o);_(o,n),Ue.nativeAbort(n)}function Ve(){return void 0!==Pe.exitCode}function qe(){return Ue.runtimeReady&&!Ve()}function He(){Ve()&&Be(!1,`.NET runtime already exited with ${Pe.exitCode} ${Pe.exitReason}. You can use runtime.runMain() which doesn't exit the runtime.`),Ue.runtimeReady||Be(!1,".NET runtime didn't start yet. Please call dotnet.create() first.")}function Je(){ke&&(globalThis.addEventListener("unhandledrejection",et),globalThis.addEventListener("error",tt))}let Ze,Qe;function Ge(e){Qe&&Qe(e),Xe(e,Pe.exitReason)}function Ke(e){Ze&&Ze(e||Pe.exitReason),Xe(1,e||Pe.exitReason)}function Xe(t,o){var n,r;const i=o&&"object"==typeof o;t=i&&"number"==typeof o.status?o.status:void 0===t?-1:t;const s=i&&"string"==typeof o.message?o.message:""+o;(o=i?o:Ue.ExitStatus?function(e,t){const o=new Ue.ExitStatus(e);return o.message=t,o.toString=()=>t,o}(t,s):new Error("Exit with code "+t+" "+s)).status=t,o.message||(o.message=s);const a=""+(o.stack||(new Error).stack);try{Object.defineProperty(o,"stack",{get:()=>a})}catch(e){}const l=!!o.silent;if(o.silent=!0,Ve())Pe.diagnosticTracing&&b("mono_exit called after exit");else{try{We.onAbort==Ke&&(We.onAbort=Ze),We.onExit==Ge&&(We.onExit=Qe),ke&&(globalThis.removeEventListener("unhandledrejection",et),globalThis.removeEventListener("error",tt)),Ue.runtimeReady?(Ue.jiterpreter_dump_stats&&Ue.jiterpreter_dump_stats(!1),0===t&&(null===(n=Pe.config)||void 0===n?void 0:n.interopCleanupOnExit)&&Ue.forceDisposeProxies(!0,!0),e&&0!==t&&(null===(r=Pe.config)||void 0===r||r.dumpThreadsOnNonZeroExit)):(Pe.diagnosticTracing&&b(`abort_startup, reason: ${o}`),function(e){Pe.allDownloadsQueued.promise_control.reject(e),Pe.allDownloadsFinished.promise_control.reject(e),Pe.afterConfigLoaded.promise_control.reject(e),Pe.wasmCompilePromise.promise_control.reject(e),Pe.runtimeModuleLoaded.promise_control.reject(e),Ue.dotnetReady&&(Ue.dotnetReady.promise_control.reject(e),Ue.afterInstantiateWasm.promise_control.reject(e),Ue.beforePreInit.promise_control.reject(e),Ue.afterPreInit.promise_control.reject(e),Ue.afterPreRun.promise_control.reject(e),Ue.beforeOnRuntimeInitialized.promise_control.reject(e),Ue.afterOnRuntimeInitialized.promise_control.reject(e),Ue.afterPostRun.promise_control.reject(e))}(o))}catch(e){E("mono_exit A failed",e)}try{l||(function(e,t){if(0!==e&&t){const e=Ue.ExitStatus&&t instanceof Ue.ExitStatus?b:_;"string"==typeof t?e(t):(void 0===t.stack&&(t.stack=(new Error).stack+""),t.message?e(Ue.stringify_as_error_with_stack?Ue.stringify_as_error_with_stack(t.message+"\n"+t.stack):t.message+"\n"+t.stack):e(JSON.stringify(t)))}!Ce&&Pe.config&&(Pe.config.logExitCode?Pe.config.forwardConsoleLogsToWS?R("WASM EXIT "+e):v("WASM EXIT "+e):Pe.config.forwardConsoleLogsToWS&&R())}(t,o),function(e){if(ke&&!Ce&&Pe.config&&Pe.config.appendElementOnExit&&document){const t=document.createElement("label");t.id="tests_done",0!==e&&(t.style.background="red"),t.innerHTML=""+e,document.body.appendChild(t)}}(t))}catch(e){E("mono_exit B failed",e)}Pe.exitCode=t,Pe.exitReason||(Pe.exitReason=o),!Ce&&Ue.runtimeReady&&We.runtimeKeepalivePop()}if(Pe.config&&Pe.config.asyncFlushOnExit&&0===t)throw(async()=>{try{await async function(){try{const e=await import(/*! webpackIgnore: true */"process"),t=e=>new Promise(((t,o)=>{e.on("error",o),e.end("","utf8",t)})),o=t(e.stderr),n=t(e.stdout);let r;const i=new Promise((e=>{r=setTimeout((()=>e("timeout")),1e3)}));await Promise.race([Promise.all([n,o]),i]),clearTimeout(r)}catch(e){_(`flushing std* streams failed: ${e}`)}}()}finally{Ye(t,o)}})(),o;Ye(t,o)}function Ye(e,t){if(Ue.runtimeReady&&Ue.nativeExit)try{Ue.nativeExit(e)}catch(e){!Ue.ExitStatus||e instanceof Ue.ExitStatus||E("set_exit_code_and_quit_now failed: "+e.toString())}if(0!==e||!ke)throw Se&&Ne.process?Ne.process.exit(e):Ue.quit&&Ue.quit(e,t),t}function et(e){ot(e,e.reason,"rejection")}function tt(e){ot(e,e.error,"error")}function ot(e,t,o){e.preventDefault();try{t||(t=new Error("Unhandled "+o)),void 0===t.stack&&(t.stack=(new Error).stack),t.stack=t.stack+"",t.silent||(_("Unhandled error:",t),Xe(1,t))}catch(e){}}!function(e){if($e)throw new Error("Loader module already loaded");$e=!0,Ue=e.runtimeHelpers,Pe=e.loaderHelpers,Me=e.diagnosticHelpers,Le=e.api,Ne=e.internal,Object.assign(Le,{INTERNAL:Ne,invokeLibraryInitializers:be}),Object.assign(e.module,{config:ve(ze,{environmentVariables:{}})});const r={mono_wasm_bindings_is_ready:!1,config:e.module.config,diagnosticTracing:!1,nativeAbort:e=>{throw e||new Error("abort")},nativeExit:e=>{throw new Error("exit:"+e)}},l={gitHash:"4099f83977f4d29604a9aeb971fb0a7bc1d5f699",config:e.module.config,diagnosticTracing:!1,maxParallelDownloads:16,enableDownloadRetry:!0,_loaded_files:[],loadedFiles:[],loadedAssemblies:[],libraryInitializers:[],workerNextNumber:1,actual_downloaded_assets_count:0,actual_instantiated_assets_count:0,expected_downloaded_assets_count:0,expected_instantiated_assets_count:0,afterConfigLoaded:i(),allDownloadsQueued:i(),allDownloadsFinished:i(),wasmCompilePromise:i(),runtimeModuleLoaded:i(),loadingWorkers:i(),is_exited:Ve,is_runtime_running:qe,assert_runtime_running:He,mono_exit:Xe,createPromiseController:i,getPromiseController:s,assertIsControllablePromise:a,mono_download_assets:oe,resolve_single_asset_path:ee,setup_proxy_console:j,set_thread_prefix:w,installUnhandledErrorHandler:Je,retrieve_asset_download:ie,invokeLibraryInitializers:be,isDebuggingSupported:Te,exceptions:t,simd:n,relaxedSimd:o};Object.assign(Ue,r),Object.assign(Pe,l)}(Fe);let nt,rt,it,st=!1,at=!1;async function lt(e){if(!at){if(at=!0,ke&&Pe.config.forwardConsoleLogsToWS&&void 0!==globalThis.WebSocket&&j("main",globalThis.console,globalThis.location.origin),We||Be(!1,"Null moduleConfig"),Pe.config||Be(!1,"Null moduleConfig.config"),"function"==typeof e){const t=e(Fe.api);if(t.ready)throw new Error("Module.ready couldn't be redefined.");Object.assign(We,t),Ee(We,t)}else{if("object"!=typeof e)throw new Error("Can't use moduleFactory callback of createDotnetRuntime function.");Ee(We,e)}await async function(e){if(Se){const e=await import(/*! webpackIgnore: true */"process"),t=14;if(e.versions.node.split(".")[0]<t)throw new Error(`NodeJS at '${e.execPath}' has too low version '${e.versions.node}', please use at least ${t}. See also https://aka.ms/dotnet-wasm-features`)}const t=/*! webpackIgnore: true */import.meta.url,o=t.indexOf("?");var n;if(o>0&&(Pe.modulesUniqueQuery=t.substring(o)),Pe.scriptUrl=t.replace(/\\/g,"/").replace(/[?#].*/,""),Pe.scriptDirectory=(n=Pe.scriptUrl).slice(0,n.lastIndexOf("/"))+"/",Pe.locateFile=e=>"URL"in globalThis&&globalThis.URL!==C?new URL(e,Pe.scriptDirectory).toString():M(e)?e:Pe.scriptDirectory+e,Pe.fetch_like=k,Pe.out=console.log,Pe.err=console.error,Pe.onDownloadResourceProgress=e.onDownloadResourceProgress,ke&&globalThis.navigator){const e=globalThis.navigator,t=e.userAgentData&&e.userAgentData.brands;t&&t.length>0?Pe.isChromium=t.some((e=>"Google Chrome"===e.brand||"Microsoft Edge"===e.brand||"Chromium"===e.brand)):e.userAgent&&(Pe.isChromium=e.userAgent.includes("Chrome"),Pe.isFirefox=e.userAgent.includes("Firefox"))}Ne.require=Se?await import(/*! webpackIgnore: true */"module").then((e=>e.createRequire(/*! webpackIgnore: true */import.meta.url))):Promise.resolve((()=>{throw new Error("require not supported")})),void 0===globalThis.URL&&(globalThis.URL=C)}(We)}}async function ct(e){return await lt(e),Ze=We.onAbort,Qe=We.onExit,We.onAbort=Ke,We.onExit=Ge,We.ENVIRONMENT_IS_PTHREAD?async function(){(function(){const e=new MessageChannel,t=e.port1,o=e.port2;t.addEventListener("message",(e=>{var n,r;n=JSON.parse(e.data.config),r=JSON.parse(e.data.monoThreadInfo),st?Pe.diagnosticTracing&&b("mono config already received"):(ve(Pe.config,n),Ue.monoThreadInfo=r,xe(),Pe.diagnosticTracing&&b("mono config received"),st=!0,Pe.afterConfigLoaded.promise_control.resolve(Pe.config),ke&&n.forwardConsoleLogsToWS&&void 0!==globalThis.WebSocket&&Pe.setup_proxy_console("worker-idle",console,globalThis.location.origin)),t.close(),o.close()}),{once:!0}),t.start(),self.postMessage({[l]:{monoCmd:"preload",port:o}},[o])})(),await Pe.afterConfigLoaded.promise,function(){const e=Pe.config;e.assets||Be(!1,"config.assets must be defined");for(const t of e.assets)X(t),Q[t.behavior]&&z.push(t)}(),setTimeout((async()=>{try{await oe()}catch(e){Xe(1,e)}}),0);const e=dt(),t=await Promise.all(e);return await ut(t),We}():async function(){var e;await Re(We),re();const t=dt();(async function(){try{const e=ee("dotnetwasm");await se(e),e&&e.pendingDownloadInternal&&e.pendingDownloadInternal.response||Be(!1,"Can't load dotnet.native.wasm");const t=await e.pendingDownloadInternal.response,o=t.headers&&t.headers.get?t.headers.get("Content-Type"):void 0;let n;if("function"==typeof WebAssembly.compileStreaming&&"application/wasm"===o)n=await WebAssembly.compileStreaming(t);else{ke&&"application/wasm"!==o&&E('WebAssembly resource does not have the expected content type "application/wasm", so falling back to slower ArrayBuffer instantiation.');const e=await t.arrayBuffer();Pe.diagnosticTracing&&b("instantiate_wasm_module buffered"),n=Ie?await Promise.resolve(new WebAssembly.Module(e)):await WebAssembly.compile(e)}e.pendingDownloadInternal=null,e.pendingDownload=null,e.buffer=null,e.moduleExports=null,Pe.wasmCompilePromise.promise_control.resolve(n)}catch(e){Pe.wasmCompilePromise.promise_control.reject(e)}})(),setTimeout((async()=>{try{D(),await oe()}catch(e){Xe(1,e)}}),0);const o=await Promise.all(t);return await ut(o),await Ue.dotnetReady.promise,await we(null===(e=Pe.config.resources)||void 0===e?void 0:e.modulesAfterRuntimeReady),await be("onRuntimeReady",[Fe.api]),Le}()}function dt(){const e=ee("js-module-runtime"),t=ee("js-module-native");if(nt&&rt)return[nt,rt,it];"object"==typeof e.moduleExports?nt=e.moduleExports:(Pe.diagnosticTracing&&b(`Attempting to import '${e.resolvedUrl}' for ${e.name}`),nt=import(/*! webpackIgnore: true */e.resolvedUrl)),"object"==typeof t.moduleExports?rt=t.moduleExports:(Pe.diagnosticTracing&&b(`Attempting to import '${t.resolvedUrl}' for ${t.name}`),rt=import(/*! webpackIgnore: true */t.resolvedUrl));const o=Y("js-module-diagnostics");return o&&("object"==typeof o.moduleExports?it=o.moduleExports:(Pe.diagnosticTracing&&b(`Attempting to import '${o.resolvedUrl}' for ${o.name}`),it=import(/*! webpackIgnore: true */o.resolvedUrl))),[nt,rt,it]}async function ut(e){const{initializeExports:t,initializeReplacements:o,configureRuntimeStartup:n,configureEmscriptenStartup:r,configureWorkerStartup:i,setRuntimeGlobals:s,passEmscriptenInternals:a}=e[0],{default:l}=e[1],c=e[2];s(Fe),t(Fe),c&&c.setRuntimeGlobals(Fe),await n(We),Pe.runtimeModuleLoaded.promise_control.resolve(),l((e=>(Object.assign(We,{ready:e.ready,__dotnet_runtime:{initializeReplacements:o,configureEmscriptenStartup:r,configureWorkerStartup:i,passEmscriptenInternals:a}}),We))).catch((e=>{if(e.message&&e.message.toLowerCase().includes("out of memory"))throw new Error(".NET runtime has failed to start, because too much memory was requested. Please decrease the memory by adjusting EmccMaximumHeapSize. See also https://aka.ms/dotnet-wasm-features");throw e}))}const ft=new class{withModuleConfig(e){try{return Ee(We,e),this}catch(e){throw Xe(1,e),e}}withOnConfigLoaded(e){try{return Ee(We,{onConfigLoaded:e}),this}catch(e){throw Xe(1,e),e}}withConsoleForwarding(){try{return ve(ze,{forwardConsoleLogsToWS:!0}),this}catch(e){throw Xe(1,e),e}}withExitOnUnhandledError(){try{return ve(ze,{exitOnUnhandledError:!0}),Je(),this}catch(e){throw Xe(1,e),e}}withAsyncFlushOnExit(){try{return ve(ze,{asyncFlushOnExit:!0}),this}catch(e){throw Xe(1,e),e}}withExitCodeLogging(){try{return ve(ze,{logExitCode:!0}),this}catch(e){throw Xe(1,e),e}}withElementOnExit(){try{return ve(ze,{appendElementOnExit:!0}),this}catch(e){throw Xe(1,e),e}}withInteropCleanupOnExit(){try{return ve(ze,{interopCleanupOnExit:!0}),this}catch(e){throw Xe(1,e),e}}withDumpThreadsOnNonZeroExit(){try{return ve(ze,{dumpThreadsOnNonZeroExit:!0}),this}catch(e){throw Xe(1,e),e}}withWaitingForDebugger(e){try{return ve(ze,{waitForDebugger:e}),this}catch(e){throw Xe(1,e),e}}withInterpreterPgo(e,t){try{return ve(ze,{interpreterPgo:e,interpreterPgoSaveDelay:t}),ze.runtimeOptions?ze.runtimeOptions.push("--interp-pgo-recording"):ze.runtimeOptions=["--interp-pgo-recording"],this}catch(e){throw Xe(1,e),e}}withConfig(e){try{return ve(ze,e),this}catch(e){throw Xe(1,e),e}}withConfigSrc(e){try{return e&&"string"==typeof e||Be(!1,"must be file path or URL"),Ee(We,{configSrc:e}),this}catch(e){throw Xe(1,e),e}}withVirtualWorkingDirectory(e){try{return e&&"string"==typeof e||Be(!1,"must be directory path"),ve(ze,{virtualWorkingDirectory:e}),this}catch(e){throw Xe(1,e),e}}withEnvironmentVariable(e,t){try{const o={};return o[e]=t,ve(ze,{environmentVariables:o}),this}catch(e){throw Xe(1,e),e}}withEnvironmentVariables(e){try{return e&&"object"==typeof e||Be(!1,"must be dictionary object"),ve(ze,{environmentVariables:e}),this}catch(e){throw Xe(1,e),e}}withDiagnosticTracing(e){try{return"boolean"!=typeof e&&Be(!1,"must be boolean"),ve(ze,{diagnosticTracing:e}),this}catch(e){throw Xe(1,e),e}}withDebugging(e){try{return null!=e&&"number"==typeof e||Be(!1,"must be number"),ve(ze,{debugLevel:e}),this}catch(e){throw Xe(1,e),e}}withApplicationArguments(...e){try{return e&&Array.isArray(e)||Be(!1,"must be array of strings"),ve(ze,{applicationArguments:e}),this}catch(e){throw Xe(1,e),e}}withRuntimeOptions(e){try{return e&&Array.isArray(e)||Be(!1,"must be array of strings"),ze.runtimeOptions?ze.runtimeOptions.push(...e):ze.runtimeOptions=e,this}catch(e){throw Xe(1,e),e}}withMainAssembly(e){try{return ve(ze,{mainAssemblyName:e}),this}catch(e){throw Xe(1,e),e}}withApplicationArgumentsFromQuery(){try{if(!globalThis.window)throw new Error("Missing window to the query parameters from");if(void 0===globalThis.URLSearchParams)throw new Error("URLSearchParams is supported");const e=new URLSearchParams(globalThis.window.location.search).getAll("arg");return this.withApplicationArguments(...e)}catch(e){throw Xe(1,e),e}}withApplicationEnvironment(e){try{return ve(ze,{applicationEnvironment:e}),this}catch(e){throw Xe(1,e),e}}withApplicationCulture(e){try{return ve(ze,{applicationCulture:e}),this}catch(e){throw Xe(1,e),e}}withResourceLoader(e){try{return Pe.loadBootResource=e,this}catch(e){throw Xe(1,e),e}}async download(){try{await async function(){lt(We),await Re(We),re(),D(),oe(),await Pe.allDownloadsFinished.promise}()}catch(e){throw Xe(1,e),e}}async create(){try{return this.instance||(this.instance=await async function(){return await ct(We),Fe.api}()),this.instance}catch(e){throw Xe(1,e),e}}async run(){try{return We.config||Be(!1,"Null moduleConfig.config"),this.instance||await this.create(),this.instance.runMainAndExit()}catch(e){throw Xe(1,e),e}}},mt=Xe,gt=ct;Ie||"function"==typeof globalThis.URL||Be(!1,"This browser/engine doesn't support URL API. Please use a modern version. See also https://aka.ms/dotnet-wasm-features"),"function"!=typeof globalThis.BigInt64Array&&Be(!1,"This browser/engine doesn't support BigInt64Array API. Please use a modern version. See also https://aka.ms/dotnet-wasm-features"),ft.withConfig(/*json-start*/{
  "mainAssemblyName": "osu.Browser",
  "resources": {
    "hash": "sha256-SfrO3Ywik49JMU8bNS0f/gq+3QxFOyhbbmajmSS3Xxk=",
    "jsModuleNative": [
      {
        "name": "dotnet.native.ab7cvdvoxj.js"
      }
    ],
    "jsModuleRuntime": [
      {
        "name": "dotnet.runtime.azrfhwb804.js"
      }
    ],
    "wasmNative": [
      {
        "name": "dotnet.native.zlmrq61py8.wasm",
        "hash": "sha256-Ny3TVOV/i3oNxNBd5kCvIUS8Dy3CnHE0zni6phHHyd0=",
        "cache": "force-cache"
      }
    ],
    "icu": [
      {
        "virtualPath": "icudt_CJK.dat",
        "name": "icudt_CJK.tjcz0u77k5.dat",
        "hash": "sha256-SZLtQnRc0JkwqHab0VUVP7T3uBPSeYzxzDnpxPpUnHk=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "icudt_EFIGS.dat",
        "name": "icudt_EFIGS.tptq2av103.dat",
        "hash": "sha256-8fItetYY8kQ0ww6oxwTLiT3oXlBwHKumbeP2pRF4yTc=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "icudt_no_CJK.dat",
        "name": "icudt_no_CJK.lfu7j35m59.dat",
        "hash": "sha256-L7sV7NEYP37/Qr2FPCePo5cJqRgTXRwGHuwF5Q+0Nfs=",
        "cache": "force-cache"
      }
    ],
    "coreAssembly": [
      {
        "virtualPath": "AutoMapper.wasm",
        "name": "AutoMapper.wprof9o37n.wasm",
        "hash": "sha256-rOqGwP3m/9T8wX+duKWikSlr+go4Z4R5JNc+7Wo9JLs=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Commons.Music.Midi.wasm",
        "name": "Commons.Music.Midi.lilk1vrpgc.wasm",
        "hash": "sha256-E+kiuif9l/6hd/o3DAmdqfdQbozCbq8W5LUgEd9AWpg=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "DiffPlex.wasm",
        "name": "DiffPlex.31ty50f5ui.wasm",
        "hash": "sha256-ieOXxrfPxb+Uk/ya8yeHwlB+TsUoxvRjSrGP2Y3vNDI=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "FFmpeg.AutoGen.wasm",
        "name": "FFmpeg.AutoGen.w5gt3aa4cd.wasm",
        "hash": "sha256-FOJrrotcdaVyhK9HZNSpeVvn31/FCI9OeybcyslWMl4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "HidSharpCore.wasm",
        "name": "HidSharpCore.c6a3mco1wf.wasm",
        "hash": "sha256-RJypTH4iuncUrHmVOiWTYFC9ObDqnwYwE1qSDiktMo4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "HtmlAgilityPack.wasm",
        "name": "HtmlAgilityPack.950vivd1kf.wasm",
        "hash": "sha256-fVC/fiQeQF8VkdS22xxD2GpxWd3juVmDFBQFd8eQ9t8=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Humanizer.wasm",
        "name": "Humanizer.hp44b1k7zf.wasm",
        "hash": "sha256-1X+H9CpYHJEbOQWU4MmoblOLafg4ohOLCfyJqjqOQKI=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "JetBrains.Annotations.wasm",
        "name": "JetBrains.Annotations.g0rovi1oie.wasm",
        "hash": "sha256-wLV67W73QSh29CB+LnGA+GPBp1LmOV/bkYfpjq1Purk=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Markdig.wasm",
        "name": "Markdig.42a9e3ollz.wasm",
        "hash": "sha256-1OoMsONu1fr8S1YVzcKYhGWhngECSRnDtUCWfvTTCGk=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "MessagePack.Annotations.wasm",
        "name": "MessagePack.Annotations.c9soiu37e0.wasm",
        "hash": "sha256-8OByM4BSyAP8hhcqxogemOavBZHGPXwaa9b9z6Gv0n8=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "MessagePack.wasm",
        "name": "MessagePack.eicyfncfpn.wasm",
        "hash": "sha256-KuEy/u4KZfO0kdflPP4bLzt8sKfplVo60tN+ixzCrZQ=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.AspNetCore.Connections.Abstractions.wasm",
        "name": "Microsoft.AspNetCore.Connections.Abstractions.on6l2x48tq.wasm",
        "hash": "sha256-DEUrldJaehelctKkDSmszXPwM2tg8OOJawSXJoLfy2Y=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.AspNetCore.Http.Connections.Client.wasm",
        "name": "Microsoft.AspNetCore.Http.Connections.Client.61bbbm6zn2.wasm",
        "hash": "sha256-ZtAnMgsgV6mY4Lmz+Si57LZEFsH6A3aBCU3KqWxUad0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.AspNetCore.Http.Connections.Common.wasm",
        "name": "Microsoft.AspNetCore.Http.Connections.Common.2th1ek85jb.wasm",
        "hash": "sha256-Zm4LpPKSO75DIU6p3s93qwTbDVpVmXIa/1Vkm+Fk0zQ=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.AspNetCore.SignalR.Client.wasm",
        "name": "Microsoft.AspNetCore.SignalR.Client.4r6bonsst8.wasm",
        "hash": "sha256-EHU6VP98ml2PaOyiIBmlQwtxQXRfShYv/2MM6AEVJAQ=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.AspNetCore.SignalR.Client.Core.wasm",
        "name": "Microsoft.AspNetCore.SignalR.Client.Core.swfbdf0btn.wasm",
        "hash": "sha256-TK4q2ofBrkF5FPkqE0a3ZOQMnY55J22D3zwssl3w4Wc=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.AspNetCore.SignalR.Common.wasm",
        "name": "Microsoft.AspNetCore.SignalR.Common.0gigwjvc6t.wasm",
        "hash": "sha256-YP1hXua9VwVWzQdnZ/q1O8PfhF14JfcXNU9vfZzMuWw=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.AspNetCore.SignalR.Protocols.Json.wasm",
        "name": "Microsoft.AspNetCore.SignalR.Protocols.Json.2hlr7d0urh.wasm",
        "hash": "sha256-ih+07frH++O+OMZPLpHQnZ9KLhgJ0yGc86oAOScIAQ0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.AspNetCore.SignalR.Protocols.MessagePack.wasm",
        "name": "Microsoft.AspNetCore.SignalR.Protocols.MessagePack.bajlm8usct.wasm",
        "hash": "sha256-4yqL6q05n3k4RS7c+kePBR8qx10JfHMu6l2t3PnXTHQ=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.AspNetCore.SignalR.Protocols.NewtonsoftJson.wasm",
        "name": "Microsoft.AspNetCore.SignalR.Protocols.NewtonsoftJson.hlkfsq28qp.wasm",
        "hash": "sha256-BXqLaKPZ+RpIDohQV9QBkqoOQvZNRqlmX6TdLLzAjJk=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.CSharp.wasm",
        "name": "Microsoft.CSharp.1htk0csdm7.wasm",
        "hash": "sha256-y30gbYXlASfFVg5mzPjm5Vtjtfl8sd86KjYIARD65AA=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Data.Sqlite.wasm",
        "name": "Microsoft.Data.Sqlite.nyom8aux99.wasm",
        "hash": "sha256-37fuN96XKTYU2LOY38yuYnCOrRAEeBeufskQVKEnVA0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Diagnostics.NETCore.Client.wasm",
        "name": "Microsoft.Diagnostics.NETCore.Client.rkrdw3ndxu.wasm",
        "hash": "sha256-24jKlpNolEtYUH4tOfCylyY6DqSHBFMVlMC2EOnCytk=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Diagnostics.Runtime.wasm",
        "name": "Microsoft.Diagnostics.Runtime.yqiotfzazw.wasm",
        "hash": "sha256-FgJHi6vXJcarr1h+R9PJTFD3TOwbSgzbsIMm4dLa6qg=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Extensions.DependencyInjection.Abstractions.wasm",
        "name": "Microsoft.Extensions.DependencyInjection.Abstractions.4sny71krlo.wasm",
        "hash": "sha256-HEi2lh+kgGbfeNsF0bBMGVOVgolq/psDT5jJlznu6ps=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Extensions.DependencyInjection.wasm",
        "name": "Microsoft.Extensions.DependencyInjection.qcg67mq9k5.wasm",
        "hash": "sha256-SvcxMqBNvQZBJTdeVwrz5FnX6NAbQyHrqnhEUxhfpCU=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Extensions.Features.wasm",
        "name": "Microsoft.Extensions.Features.snom6iuip5.wasm",
        "hash": "sha256-qCuF7assrfjH7BVV5xQkiuOII/Nk9S0wn8Alw0R7C4M=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Extensions.Logging.Abstractions.wasm",
        "name": "Microsoft.Extensions.Logging.Abstractions.kaywzttwpi.wasm",
        "hash": "sha256-nNw670Ax/GQiD9bJgC/41LkN+UtbhBgLNZm5Qx40Exc=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Extensions.Logging.wasm",
        "name": "Microsoft.Extensions.Logging.154fssrex3.wasm",
        "hash": "sha256-S4GiVP4F03v3r/v8kGnoKN2wRgh0NkgxA+zmTSx7Vcw=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Extensions.ObjectPool.wasm",
        "name": "Microsoft.Extensions.ObjectPool.5kto110qef.wasm",
        "hash": "sha256-pXBiaEEEBHJTVlbOlz1RG8XYcYZiqy7g2GbUZZO4fsA=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Extensions.Options.wasm",
        "name": "Microsoft.Extensions.Options.masryq8vyp.wasm",
        "hash": "sha256-/hH4iwoxPUw+bdlv4t7c0E7cRHVNQYemut78B4wFuKo=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Extensions.Primitives.wasm",
        "name": "Microsoft.Extensions.Primitives.ozvi2uq5k5.wasm",
        "hash": "sha256-jDP5xnnOGPvk4rwnMp2gUhwjsvcgziYI78LDlnrbS9w=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.NET.StringTools.wasm",
        "name": "Microsoft.NET.StringTools.rg8qrbve0x.wasm",
        "hash": "sha256-pdv1fLzPQCWrjc2bRVjC+luHmvdsn8hQj+rQbplnGPU=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Toolkit.HighPerformance.wasm",
        "name": "Microsoft.Toolkit.HighPerformance.gpmlxw07vt.wasm",
        "hash": "sha256-zJi3ahBJNvyvb+Mi2FqvYGs7H+ITKxaud0H+mE9UTJw=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Win32.Primitives.wasm",
        "name": "Microsoft.Win32.Primitives.s3q4qjas76.wasm",
        "hash": "sha256-KIPMsG2k+4kHatKpMt7KkbGQgoYWO8f+b0JLvnMwxeo=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Microsoft.Win32.Registry.wasm",
        "name": "Microsoft.Win32.Registry.gb58vkewn4.wasm",
        "hash": "sha256-7PsmyCAdfacDu29i6qVww8f7NQi090SGCMfQ3Dmb7jo=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "MongoDB.Bson.wasm",
        "name": "MongoDB.Bson.ftf49pcbdu.wasm",
        "hash": "sha256-7allKpAsHQ3jEVdSpmUtgpQjbyPE/Ozwda0DDwvi9KE=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Newtonsoft.Json.wasm",
        "name": "Newtonsoft.Json.7nwps67rq0.wasm",
        "hash": "sha256-feprp68G4fjzgl8foBviyM7L09pKFutDzpqksES4xIE=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "OpenTabletDriver.Configurations.wasm",
        "name": "OpenTabletDriver.Configurations.98ps43dgc1.wasm",
        "hash": "sha256-ua6yfOo6eQNjdJrwxXx1mqDyh61WT2+rhd0lkjTkre8=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "OpenTabletDriver.Native.wasm",
        "name": "OpenTabletDriver.Native.pb3gba32hz.wasm",
        "hash": "sha256-1XfmB/cTS8d047LFqsXL/rXY0/Wr14hXvTYIIcJVTn4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "OpenTabletDriver.Plugin.wasm",
        "name": "OpenTabletDriver.Plugin.pskgw8to08.wasm",
        "hash": "sha256-tyKQg9OEKmyh8VxGA5CZ9U3hXDxGR3kVPNcvsvbb99A=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "OpenTabletDriver.wasm",
        "name": "OpenTabletDriver.eipar0a4m6.wasm",
        "hash": "sha256-WsVWuBwuXoORSFyF6ghrpx1yiwRybUPHZlM8dhS8NGs=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Realm.wasm",
        "name": "Realm.mjfyaeq029.wasm",
        "hash": "sha256-MmUbupXneMIyKQn8toMI77FgD076G3qKkkz/eMWmNtI=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Remotion.Linq.wasm",
        "name": "Remotion.Linq.n1mea1y1jx.wasm",
        "hash": "sha256-G7X6xD/Bew4yb7YQj9tqFH+WibaPPQvmmghuQdvg3FU=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "SDL2-CS.wasm",
        "name": "SDL2-CS.ot6agg504f.wasm",
        "hash": "sha256-DOFmy6D0E2dXF/WCX3aTxbi9jGHx41ms5IjvXOc1xKQ=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "SDL3-CS.wasm",
        "name": "SDL3-CS.bfwgwl2aln.wasm",
        "hash": "sha256-2cMiapdbJUHYF3L4ITpjcpD97DB8rJDYN/jZhZDLtBo=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "SQLitePCLRaw.batteries_v2.wasm",
        "name": "SQLitePCLRaw.batteries_v2.ps6yf84j1b.wasm",
        "hash": "sha256-6eWV05bRew8sP8F19s83Ls1+R/WsRicWUoJBoqraOE0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "SQLitePCLRaw.core.wasm",
        "name": "SQLitePCLRaw.core.en3nz220k3.wasm",
        "hash": "sha256-xiLbgx3SaP3J9v7cOMEz3NlkPXX779Uu4DzZ55L37XU=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "SQLitePCLRaw.provider.e_sqlite3.wasm",
        "name": "SQLitePCLRaw.provider.e_sqlite3.43duazkvm7.wasm",
        "hash": "sha256-wFNDHzVPO0he7qwPrPQU+NFKYqt86Xr+uh2/fIhUvo4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Sentry.wasm",
        "name": "Sentry.k56snlzih8.wasm",
        "hash": "sha256-KKnhZZMWBI5q5WCQ7YV1oywjqm7Jl0Du+pPvRXYC/cs=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "SharpCompress.wasm",
        "name": "SharpCompress.pp9uwsuf7z.wasm",
        "hash": "sha256-rTzAOVIKGSwz5Mugwim57MGoC0HfXy2G8PRUGsoxMTs=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "SharpFNT.wasm",
        "name": "SharpFNT.2ouyzor4op.wasm",
        "hash": "sha256-wuIkfcvIci07WhZBmkcPiSIDbpSaCxz/aikedaARa4U=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "SharpGen.Runtime.wasm",
        "name": "SharpGen.Runtime.pk0sii7fzx.wasm",
        "hash": "sha256-6fsmFMv616M46rsx3ptsqc5y1jMbG17JdRrhmR/Qetk=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "SharpGen.Runtime.COM.wasm",
        "name": "SharpGen.Runtime.COM.6d2tyrttxn.wasm",
        "hash": "sha256-Om86UqZpCJ4NvgyZeM7VP7yDUdlklbfvo8OOQD5QkF4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "SixLabors.ImageSharp.wasm",
        "name": "SixLabors.ImageSharp.730hvilduw.wasm",
        "hash": "sha256-TU6GSNJR03rvsxJX2CQE0E+C83jpSapU/tfd4geXK7g=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "StbiSharp.wasm",
        "name": "StbiSharp.74waovgc6j.wasm",
        "hash": "sha256-F7VmhuY640xiCsxEx8Vdj2qX52L8ULDfb/N845MMxW4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Collections.Concurrent.wasm",
        "name": "System.Collections.Concurrent.o8iw5jdc8b.wasm",
        "hash": "sha256-WEX0+Ow9pQQr6rIrrjW+shM7KCx8Xo71kySCIOxFx9U=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Collections.Immutable.wasm",
        "name": "System.Collections.Immutable.gzdl8ofi5f.wasm",
        "hash": "sha256-9O1gcgCXg+mQ8WHp/tONP7jofT95Cno4myO4ViptpgA=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Collections.NonGeneric.wasm",
        "name": "System.Collections.NonGeneric.k4oazzjh2r.wasm",
        "hash": "sha256-pHcrFRXBTNMGFIy9vP16852Mm0fXoyatJGYiUl2mMoc=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Collections.Specialized.wasm",
        "name": "System.Collections.Specialized.t3zafw2t32.wasm",
        "hash": "sha256-OR/zDWfzAZdpkMXCep0KuehYUJr++UTx/6ut1ZDxELM=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Collections.wasm",
        "name": "System.Collections.4w5vexw72t.wasm",
        "hash": "sha256-bB64qYro4vurwRCDkt1UazZABRnJk3b5RPwFMYOqDT0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.ComponentModel.Annotations.wasm",
        "name": "System.ComponentModel.Annotations.4bpnoacaxy.wasm",
        "hash": "sha256-IGARCuWfwx2dKKQlUeQ/NO/rhO3YZZgSf92pEIFVMTE=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.ComponentModel.Primitives.wasm",
        "name": "System.ComponentModel.Primitives.diootkbsnu.wasm",
        "hash": "sha256-FU+xybg9I2AIfqqj7/+rRYEx3DgWtK/E930YyW/juWo=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.ComponentModel.TypeConverter.wasm",
        "name": "System.ComponentModel.TypeConverter.y3ec968l9n.wasm",
        "hash": "sha256-bhOI1zYDEKYUXT0DHzg4Hf5uru0ybmdukdlRi4IC7yM=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.ComponentModel.wasm",
        "name": "System.ComponentModel.2lpuvkg07t.wasm",
        "hash": "sha256-+tNuyDZwqiy9xZyweHauypGvvavFKtWz/nCwkmVlu8M=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Console.wasm",
        "name": "System.Console.jjf4kq219s.wasm",
        "hash": "sha256-UTySAjmHuVyRBsTbRffnhyDcdE0gxSGRpwcZ3RYWZ9Q=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Data.Common.wasm",
        "name": "System.Data.Common.xwjcy3gzcd.wasm",
        "hash": "sha256-LwJMOjwaaWu6Jfu8G8KV51d0YeQjm+nfGu3Fzx6qDNY=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Diagnostics.Debug.wasm",
        "name": "System.Diagnostics.Debug.m85uf5ufso.wasm",
        "hash": "sha256-+kYfuamfwfqs/Gno5e+l9FENobR0dSHDnSRFSt44jWw=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Diagnostics.DiagnosticSource.wasm",
        "name": "System.Diagnostics.DiagnosticSource.vvmplrqual.wasm",
        "hash": "sha256-G+E8vjPl8TJ64ZFO6WGZItCdl5AOjwu4v6SiduGo2gc=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Diagnostics.Process.wasm",
        "name": "System.Diagnostics.Process.yd1agj2mia.wasm",
        "hash": "sha256-ev6S4DmOUKfIZc3tvK4tGwHi3S9KVNoaOudaNlQu/Ww=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Diagnostics.StackTrace.wasm",
        "name": "System.Diagnostics.StackTrace.2gauc2h32t.wasm",
        "hash": "sha256-YjSPZtheIvN20CJc9naNUx6N9gqGmK0ztJE90d9/Gag=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Diagnostics.TextWriterTraceListener.wasm",
        "name": "System.Diagnostics.TextWriterTraceListener.l5yhqotetn.wasm",
        "hash": "sha256-KdFLHTSYHbkdu2DsFatUjO2R14ctPI449Yi8j5pvi44=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Diagnostics.Tools.wasm",
        "name": "System.Diagnostics.Tools.h63hvx0asb.wasm",
        "hash": "sha256-p7JDS1/cPdiZlythHPuZyuu0qeGBPee4hnUPAwGuMC0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Diagnostics.TraceSource.wasm",
        "name": "System.Diagnostics.TraceSource.li23grcylt.wasm",
        "hash": "sha256-fcvtah1Fmjw3yN6o6q/UIGGZkRFCwASHlKkk0CUMm6o=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Diagnostics.Tracing.wasm",
        "name": "System.Diagnostics.Tracing.34i2edfun7.wasm",
        "hash": "sha256-zaV8ZDAqzQj0IiVzVRaYtLP+W0cq7Zwko+7Nv2SX9WM=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Drawing.Primitives.wasm",
        "name": "System.Drawing.Primitives.kbfmyr69vs.wasm",
        "hash": "sha256-8LpvJgETtpCklgCnOqv6F6MO5N7ABZsIYkg+zvq1OfY=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Drawing.wasm",
        "name": "System.Drawing.bquzof8wit.wasm",
        "hash": "sha256-U7pGfxw5D048q3pJfUynlq/AnwY9KVVAT8R8bFRgLpY=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.IO.wasm",
        "name": "System.IO.v27tfdsxsd.wasm",
        "hash": "sha256-F4wrSvegNX4pSJL55Nlhn/rlB4aC78wU6Yxr086TrZY=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.IO.Compression.wasm",
        "name": "System.IO.Compression.4ep3m7ymnx.wasm",
        "hash": "sha256-tGr6lWGZbWnD/TSuUfgW1LEyyOY3rP7iqTaKTxtsUoU=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.IO.FileSystem.wasm",
        "name": "System.IO.FileSystem.v5qan7hvfy.wasm",
        "hash": "sha256-DZp/b9DkFTu3XDm4sL42Dc1cFpGnnzW9bZ51SB5Q+8E=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.IO.FileSystem.DriveInfo.wasm",
        "name": "System.IO.FileSystem.DriveInfo.4qdn64419b.wasm",
        "hash": "sha256-PHvkt/rsYKhzyNXVT1Tj9/W6qy2F5b8KaK8fZrk2WRw=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.IO.MemoryMappedFiles.wasm",
        "name": "System.IO.MemoryMappedFiles.yec0ej1eqh.wasm",
        "hash": "sha256-2sil4pszMPxLLWz11dW/skl3lHGPDrgJ+NK8OJ0jPVg=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.IO.Pipelines.wasm",
        "name": "System.IO.Pipelines.hxtvx76n1t.wasm",
        "hash": "sha256-RQbG5bU5JxRM8a5x9jEhEK0kH9RWF0FozKcMBs2zrng=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.IO.Pipes.wasm",
        "name": "System.IO.Pipes.u5ila6r7ui.wasm",
        "hash": "sha256-zh7gPFKOCSWTQzDHpIPnJ9S3NyZwxlF9gfXeiHdlRok=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Linq.wasm",
        "name": "System.Linq.mjrkikp5xn.wasm",
        "hash": "sha256-jkVSTQnukgiQm+JY8mAksWIjom9LuU56IonW0JeWXXk=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Linq.AsyncEnumerable.wasm",
        "name": "System.Linq.AsyncEnumerable.txlbe9imgh.wasm",
        "hash": "sha256-L4pU851bnLXD3X/0Qt/EvYGO6apn4P7KJ0f49myqjsI=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Linq.Expressions.wasm",
        "name": "System.Linq.Expressions.8f1xu9xuf6.wasm",
        "hash": "sha256-jEg0cJ7oFOOiw/gPrGtmbRvijeNzta5KEhM2e33tv5I=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Linq.Queryable.wasm",
        "name": "System.Linq.Queryable.kddjtu5n4e.wasm",
        "hash": "sha256-iLD8EhC4B+autP3fiDaQwJCYZNCcwttijw0FpGRaJnQ=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Memory.wasm",
        "name": "System.Memory.3qxjxwbsz6.wasm",
        "hash": "sha256-hd3v+bBkYYOq+g6lAK4XGxDx2ISTHDPPWoUg7UtEOlg=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.Http.wasm",
        "name": "System.Net.Http.jf84lqih2a.wasm",
        "hash": "sha256-r0Cd1IzGYikRIPhSpaOx2yZ/KLxCPCakRPMhO76nVCk=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.HttpListener.wasm",
        "name": "System.Net.HttpListener.nyz4o3u1ty.wasm",
        "hash": "sha256-D7PRdWcwM20UZW9iXHQsDyla7bY3dq2FOhNMHdFnC5w=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.NameResolution.wasm",
        "name": "System.Net.NameResolution.y9fa7q9xqg.wasm",
        "hash": "sha256-1krnW4jLCWNRLzrMhjWWSmSajr9fE9Ue3dTecVkpFRs=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.NetworkInformation.wasm",
        "name": "System.Net.NetworkInformation.vq4qm07vpb.wasm",
        "hash": "sha256-eV/h9jMuhH7+MroX5bOyEL+E9iGs09I0g4xKXeuxA7s=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.Ping.wasm",
        "name": "System.Net.Ping.54alap13ji.wasm",
        "hash": "sha256-i7thV7Lx+yODIiKX+XMaUNXK/H59LnseX4jRQ5S+RNE=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.Primitives.wasm",
        "name": "System.Net.Primitives.3ucl3jqmhy.wasm",
        "hash": "sha256-xZwPGFUxfg6LaD3BoHdI5S8nQ3ZlZLQzEU1NdAlftig=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.Requests.wasm",
        "name": "System.Net.Requests.4fawqmsgdu.wasm",
        "hash": "sha256-QNFFVCB3TTyE+cSoRa0r0DKDtSbA3MGFVeaHOrg6DVI=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.Security.wasm",
        "name": "System.Net.Security.far1881qjp.wasm",
        "hash": "sha256-mQc0GSHB8wCTj5baUySizbvg4LK/HJlrBnWc1HYw9o4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.ServerSentEvents.wasm",
        "name": "System.Net.ServerSentEvents.f8p62e1al4.wasm",
        "hash": "sha256-P49/s6DGYekJqmUaI01cQRb9Iwz/5Ehnv9kI42QTKjI=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.Sockets.wasm",
        "name": "System.Net.Sockets.xnf4zlivje.wasm",
        "hash": "sha256-TX/3QmnPp5hPjiuKCIVpQjK76jTj0wWOYfuqRyhXBv4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.WebHeaderCollection.wasm",
        "name": "System.Net.WebHeaderCollection.mn6divoks4.wasm",
        "hash": "sha256-8hBT9msV0FpTWyklnhHUDdKOPH4xtV+khVmmbjE5NdM=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.WebProxy.wasm",
        "name": "System.Net.WebProxy.fb96ofh492.wasm",
        "hash": "sha256-Vcf6e16z61yymgvDDkDEGa+8vRBVkucOWsWo6qxpieg=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.WebSockets.Client.wasm",
        "name": "System.Net.WebSockets.Client.333ugi6p6w.wasm",
        "hash": "sha256-4VwcE3xM2mj/hQmlZAe1l1EaMtEXFL2Gx9okO5fRyx4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Net.WebSockets.wasm",
        "name": "System.Net.WebSockets.1rzog86nma.wasm",
        "hash": "sha256-/RrhK/DW0uEj2T22SWNfAV/bBZnfNoz6kx6oTTCffp4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Numerics.Tensors.wasm",
        "name": "System.Numerics.Tensors.2zzg6s7qns.wasm",
        "hash": "sha256-HsCyYAZgRxkoA2Cu6JQMnyjKyDJkr+egHJlxUgo+M18=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Numerics.Vectors.wasm",
        "name": "System.Numerics.Vectors.96vuv4xsmc.wasm",
        "hash": "sha256-URhBgHhN3XljZDUd3vhwdwUmJp8l50rkvnfONRXkVMc=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.ObjectModel.wasm",
        "name": "System.ObjectModel.g7c2ugmbpq.wasm",
        "hash": "sha256-tBdKBpvfYk+/sNWFToYx46VXoIWXbNUvOYz3danElUU=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Private.CoreLib.wasm",
        "name": "System.Private.CoreLib.lt7qo8o4hj.wasm",
        "hash": "sha256-550BCoiKhuz4B4+P/PlNG8MHJ8W2IGq9Ui0SPSXEI6I=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Private.DataContractSerialization.wasm",
        "name": "System.Private.DataContractSerialization.sx3dojmiq1.wasm",
        "hash": "sha256-MHm0LNoX0J1PGdbrT5iSQGDsldB9DKY39UNyMWkhS0U=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Private.Uri.wasm",
        "name": "System.Private.Uri.uee1p865j5.wasm",
        "hash": "sha256-NniPl9KsWoMY8NGkxspEfL7sg601JXLysdG0vdxxBGU=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Private.Xml.wasm",
        "name": "System.Private.Xml.1u1uh63v4x.wasm",
        "hash": "sha256-yd1XaU+e1DoOrS2gEGoYXNnClQqxVsG+ghQgkdvSaUo=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Private.Xml.Linq.wasm",
        "name": "System.Private.Xml.Linq.j6p7zibvho.wasm",
        "hash": "sha256-xYn5lLt4z2bSAU40LtAQ1IXSUECKlOe7d7z8eNrt73U=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Reflection.Emit.ILGeneration.wasm",
        "name": "System.Reflection.Emit.ILGeneration.e2qao4aape.wasm",
        "hash": "sha256-ipVwff69+/T0a4i4jC4xtkxmZlPPfPxDasXCUbBD3ro=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Reflection.Emit.Lightweight.wasm",
        "name": "System.Reflection.Emit.Lightweight.rw0ndq1nho.wasm",
        "hash": "sha256-pfYl100n5Jz+IgbrSklvh4SpRhVINka/XVK7N2Ye3C8=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Reflection.Emit.wasm",
        "name": "System.Reflection.Emit.09mbq6i7g3.wasm",
        "hash": "sha256-nKhudwZ92maeIaE+VlhW9O5uM37bmCHzIyAxGdMqQRw=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Reflection.Extensions.wasm",
        "name": "System.Reflection.Extensions.w83g684qis.wasm",
        "hash": "sha256-cBpLq+HgzcQNcww4wLBDSRoXtk+g1JsrxAskmzpfrW0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Reflection.Metadata.wasm",
        "name": "System.Reflection.Metadata.st2ctck04t.wasm",
        "hash": "sha256-sDkrMHOmnnuw3ID1JmpyWqNmLM4jCBMD+Yl1dXFfnbc=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Reflection.Primitives.wasm",
        "name": "System.Reflection.Primitives.hmy0kpissv.wasm",
        "hash": "sha256-SWeRPKwDtWxyig7JBCL+1hWqS7L8PYV3kfT0XfIDozE=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Reflection.wasm",
        "name": "System.Reflection.37u8ww0gyk.wasm",
        "hash": "sha256-IRWbZJCEKQi30LFV4N7/jfX1aGewUz6mJylWa9YvIzE=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Resources.ResourceManager.wasm",
        "name": "System.Resources.ResourceManager.c4rm4ryajt.wasm",
        "hash": "sha256-zKILTiTVLp405TXrNZcVzlVpvTBD+UfuPLSYAc+SxXk=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.wasm",
        "name": "System.Runtime.f2828bl6wr.wasm",
        "hash": "sha256-qYZeAepgXojtgGZu8ZkpTIlHUby0COmuLPtQARp0Ub0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.CompilerServices.Unsafe.wasm",
        "name": "System.Runtime.CompilerServices.Unsafe.yozus1vz0b.wasm",
        "hash": "sha256-zv8fFKOa2lamcsGH4LkitzpDzu5nBUGIfWT9KJx4+CA=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.Extensions.wasm",
        "name": "System.Runtime.Extensions.8agi32tb1c.wasm",
        "hash": "sha256-8N1xnUPCyS1pUUulpXQIPWwVNBXG953INRPLXZcp7Uc=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.InteropServices.wasm",
        "name": "System.Runtime.InteropServices.bn7ljn20lu.wasm",
        "hash": "sha256-CRf6W/1FbFL1QKZ/UH40exRL8nWXiJhp3UFjGoDgcX4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.InteropServices.JavaScript.wasm",
        "name": "System.Runtime.InteropServices.JavaScript.d85zmsiz0b.wasm",
        "hash": "sha256-Pat0HdRuXCEm0f+xBaZ2OVF0xaezmO0DA68IiKof0Sw=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.InteropServices.RuntimeInformation.wasm",
        "name": "System.Runtime.InteropServices.RuntimeInformation.dlz60uxub6.wasm",
        "hash": "sha256-scFDycwTjNUggjbbLQyRbIS4zl8YYNkhqIvr43YST1k=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.Intrinsics.wasm",
        "name": "System.Runtime.Intrinsics.vjq64tukdj.wasm",
        "hash": "sha256-68PpfoXp4yQyXk3eggjzfaxT7buH8muNyYZZO5a5L6Q=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.Loader.wasm",
        "name": "System.Runtime.Loader.hl1292r79p.wasm",
        "hash": "sha256-ayrbIZq6ihuqYSTepJm2hWyVDSJp6XtcoTATGxIew7k=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.Numerics.wasm",
        "name": "System.Runtime.Numerics.zzmryi06dj.wasm",
        "hash": "sha256-0ejGeTTozRiyNXtxa3bXYgfS0f+B/n+uDO/yK9yQ0NY=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.Serialization.Formatters.wasm",
        "name": "System.Runtime.Serialization.Formatters.z0hkjpltej.wasm",
        "hash": "sha256-Mxqj7a0GOesjsTVRVyn8a89arxXgzMGerURQNFL4gtg=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.Serialization.Json.wasm",
        "name": "System.Runtime.Serialization.Json.vf2rsm2zdb.wasm",
        "hash": "sha256-5SaboRrnB6KDQbgWjo3JucJ2aiNXDiJtfxIhA8+xPGo=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.Serialization.Primitives.wasm",
        "name": "System.Runtime.Serialization.Primitives.ylmmundqcy.wasm",
        "hash": "sha256-9gXwWByagecd6zlJqoPdV2t0KSF4lzzneQYhcLBbXYU=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Runtime.Serialization.Xml.wasm",
        "name": "System.Runtime.Serialization.Xml.meycywz2r1.wasm",
        "hash": "sha256-0jQAjt85+l6XUSV4BNl4A2IW574KozToGG+NiDrqurI=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Security.Claims.wasm",
        "name": "System.Security.Claims.jr3wjfw3qe.wasm",
        "hash": "sha256-Dyrsx98juEcuNKYkeqskk6Uxjtlr5s28sVCfC5aSS6E=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Security.Cryptography.wasm",
        "name": "System.Security.Cryptography.juy6gb8d23.wasm",
        "hash": "sha256-69Hj5/GneJMj3x9TGyZ94b7OOPt6AsbdxG17r675iUk=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Security.Principal.wasm",
        "name": "System.Security.Principal.jq9lkxwffw.wasm",
        "hash": "sha256-i5yl2sU5sEFGD9MGQVdF32pMP9hhkeYFyIdWlzb1o18=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Text.Encoding.wasm",
        "name": "System.Text.Encoding.qywg2zpzkr.wasm",
        "hash": "sha256-HvewT97fvSPrTgAC44s+sS4XueG2YYPSfMLmmJz45Ns=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Text.Encoding.CodePages.wasm",
        "name": "System.Text.Encoding.CodePages.hfz1romwcw.wasm",
        "hash": "sha256-Y9urGPrbcZ60dQ2dtbfC6ZBnJdY5r08A7uMvrPQckEw=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Text.Encoding.Extensions.wasm",
        "name": "System.Text.Encoding.Extensions.eqmwc8rpd2.wasm",
        "hash": "sha256-6ijg3R1p5sX/vx2d3a4jnCmYwfoAp24zW1T12SGJ2/8=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Text.Encodings.Web.wasm",
        "name": "System.Text.Encodings.Web.0xzn669enl.wasm",
        "hash": "sha256-bDyruuSDaVH4Iv1sHuKy8FDpjz1vD3AW0R3vOhoi1+g=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Text.Json.wasm",
        "name": "System.Text.Json.p9zyr1swog.wasm",
        "hash": "sha256-DUbN7kv+PHtMP3Vvhvq9reRMlyiCKq/PSPKbtMcvEg8=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Text.RegularExpressions.wasm",
        "name": "System.Text.RegularExpressions.8qaaomevs2.wasm",
        "hash": "sha256-MNt2IoCQ4R3FkKFGWTdHkb3/USnjB5r/dquazeaVCH8=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Threading.Channels.wasm",
        "name": "System.Threading.Channels.asc8qsc0uc.wasm",
        "hash": "sha256-uvzsX25o5WhNhKl7dXfZXKnKBplTue4m9SPJWMYQOBo=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Threading.Overlapped.wasm",
        "name": "System.Threading.Overlapped.p1sklghh22.wasm",
        "hash": "sha256-A3AQYq5Y7lTStB3OXElzMIyF4Q0MdNKNi+5FJAYr06E=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Threading.Tasks.Parallel.wasm",
        "name": "System.Threading.Tasks.Parallel.uiy96hvwkw.wasm",
        "hash": "sha256-+k5rI00DXsX5UXQFEJLw0HYdhPd1YPi+pzgVKzlojm0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Threading.Thread.wasm",
        "name": "System.Threading.Thread.0zsq5rmnnm.wasm",
        "hash": "sha256-1Fm7s4mpS2CTfJ7XKw45oqd7pxM19cvBbqBkMNktnM0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Threading.ThreadPool.wasm",
        "name": "System.Threading.ThreadPool.b9zp03mcbl.wasm",
        "hash": "sha256-QTV431n8eq+4TMBciLen4V16kpRXC48XAkQUPdzIGVc=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Threading.wasm",
        "name": "System.Threading.lzbi22yn28.wasm",
        "hash": "sha256-z4igVbqxKgm7hCnyXfhX7qJlQ3TqUOS7/sYzVmo/2D4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Web.HttpUtility.wasm",
        "name": "System.Web.HttpUtility.mzw8fimdp0.wasm",
        "hash": "sha256-/g98iUZfj020WVyOMG2qyctcjhR9nicmMAkgwrYtTkM=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Xml.Linq.wasm",
        "name": "System.Xml.Linq.mf2xcoy9rz.wasm",
        "hash": "sha256-binOW1w231SV4HaSWhW/NpNt2hcVaRpvXDk5F1if90k=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Xml.ReaderWriter.wasm",
        "name": "System.Xml.ReaderWriter.ejslfyopb0.wasm",
        "hash": "sha256-unpyIe9dAJFdJIoMC+qFtVBfsO0bX75Hk8OS7P4fkMo=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Xml.XDocument.wasm",
        "name": "System.Xml.XDocument.exutkcpta3.wasm",
        "hash": "sha256-LqoeS6FZuJ2Y9eI4STwPViizHSBpqOXM8IF6IMOqhkU=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Xml.XPath.wasm",
        "name": "System.Xml.XPath.mbd4jbzowi.wasm",
        "hash": "sha256-ckt8GrtTyysT54zLNaHPbeLdgyLl8Ocd+I40Q4+adEU=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.Xml.XmlSerializer.wasm",
        "name": "System.Xml.XmlSerializer.yea7csdbh2.wasm",
        "hash": "sha256-ejzMI9h3Jix7ABfMXNOKmVGGhG0eEQ2UIjAmXmxbsPI=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "System.wasm",
        "name": "System.qf9o9thhcz.wasm",
        "hash": "sha256-Oi2ZVXkw2JmP+MBLYf56Z9QoZPjrC9vYuyU2cUrA7EM=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "TagLibSharp.wasm",
        "name": "TagLibSharp.ml76rjiutb.wasm",
        "hash": "sha256-+jJWkad4NfIZNVcfa+bg85/Sm/XlR9HhZO4c0BeDZ+w=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Vortice.D3DCompiler.wasm",
        "name": "Vortice.D3DCompiler.86nrrtyugx.wasm",
        "hash": "sha256-EN2LmqJdf24Vn+hcberYXS1zL89pBS+Db1B/RANQ2QI=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Vortice.DXGI.wasm",
        "name": "Vortice.DXGI.dufpripwnu.wasm",
        "hash": "sha256-i9CaSgeqe8GrkZ5MpX0kbbmxD3QP7pqUd0RpEMM5Ch0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Vortice.Direct3D11.wasm",
        "name": "Vortice.Direct3D11.8c4iyeta48.wasm",
        "hash": "sha256-iG+/mNqBNPCExh3xvv/Dkwq8YQ/F5nWY/h+G6OlrznA=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Vortice.DirectX.wasm",
        "name": "Vortice.DirectX.61xnad2otb.wasm",
        "hash": "sha256-+sRY/Ankkfx6nrjbvL6m9hkRxPFIFuAycPYrt03E1NY=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "Vortice.Mathematics.wasm",
        "name": "Vortice.Mathematics.gaq5yfl7kz.wasm",
        "hash": "sha256-WCILIMgqR31AYC4WxB4bj4Yijlcnyt1FNY9g/Mhg1lE=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "alsa-sharp.wasm",
        "name": "alsa-sharp.k7p380uroc.wasm",
        "hash": "sha256-YEqcxIo1RsMC8jER3+PdV/ztDbz/bxI3uYaDoIhPHV0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "netstandard.wasm",
        "name": "netstandard.lpu0mnc99l.wasm",
        "hash": "sha256-h9JEsOShWL+aZxXyBXduBS3RUs5nZR3VtAvGkAGgThg=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "nunit.framework.wasm",
        "name": "nunit.framework.r3jbqb4l0w.wasm",
        "hash": "sha256-ieTAybQmhIXjaeUWDumhRbg8AIaiZZl2daKGzHStxwE=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "nunit.framework.legacy.wasm",
        "name": "nunit.framework.legacy.6vz1m7vuu7.wasm",
        "hash": "sha256-0i24I5iRh/FfuH/ts4nk88V6FT/xiQjR7roPKnD+sZo=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "osu.Browser.wasm",
        "name": "osu.Browser.xl0yb9yxfu.wasm",
        "hash": "sha256-a7mA6bBr4haSdBipGldZDZf8FgkV3rCCPja47AhpB2Q=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "osu.Framework.wasm",
        "name": "osu.Framework.afb6rmw0tu.wasm",
        "hash": "sha256-qm3WLkFZwa2Emky9mQd3dZ1Amaw8EusZHUv39sD+6b8=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "osu.Game.Resources.wasm",
        "name": "osu.Game.Resources.8h29z1dy49.wasm",
        "hash": "sha256-zGtyscs5gP5gVlSJnT4WpPTR+UAGeNvZ9NP2MtHoo74=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "osu.Game.Rulesets.Osu.wasm",
        "name": "osu.Game.Rulesets.Osu.0d1rfpxpd1.wasm",
        "hash": "sha256-pALEMoEkNR4e9nhkz7kCImr+lRFpv42UrEyOeZGjLKA=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "osu.Game.wasm",
        "name": "osu.Game.5ctjimbe7b.wasm",
        "hash": "sha256-RbUF0I0u1TsxiXvWoODlrkRqAA7Rmu8VP0k9fpI50sI=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "osuTK.wasm",
        "name": "osuTK.3s68tmincx.wasm",
        "hash": "sha256-rfahYu+aIi2TouZIP2QXK5WO/6l9gNVkUYqzBn45Tbg=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "ppy.ManagedBass.Fx.wasm",
        "name": "ppy.ManagedBass.Fx.qohopyyr50.wasm",
        "hash": "sha256-di9e2kR/HwTMqaNN0tHlN8tCpkU09c96LwUtiseraAg=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "ppy.ManagedBass.Mix.wasm",
        "name": "ppy.ManagedBass.Mix.2u51q5oyum.wasm",
        "hash": "sha256-ymF0b07kGQdZJe3STJg6mKR/5GSo8of95RD2B8DNpc0=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "ppy.ManagedBass.Wasapi.wasm",
        "name": "ppy.ManagedBass.Wasapi.mvaig5agfx.wasm",
        "hash": "sha256-bhSGTYnCrXGJLZHmlAkxyQ+L8aXnggHFeqk7nrA1Vhg=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "ppy.ManagedBass.wasm",
        "name": "ppy.ManagedBass.6w0l7of375.wasm",
        "hash": "sha256-xm45KD6AdURp8NSDsaiQ7Iry84EIMIMTBlLfmwhN6GU=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "ppy.Veldrid.wasm",
        "name": "ppy.Veldrid.j3oeh5drs8.wasm",
        "hash": "sha256-gRls9/GO0vqL4C0UK0+VuetlD6Lc7RgIP0gCT7iVkg4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "ppy.Veldrid.MetalBindings.wasm",
        "name": "ppy.Veldrid.MetalBindings.a7tnoaqpnb.wasm",
        "hash": "sha256-llOhR2Rb9QYVossiPbt3/wKN25E5Qd00QNiQKorNcy4=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "ppy.Veldrid.OpenGLBindings.wasm",
        "name": "ppy.Veldrid.OpenGLBindings.ie1fxot0df.wasm",
        "hash": "sha256-JloaJEzlM2GHi0Va1oF7t/10gq4GSocc8Lyz62MINLg=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "ppy.Veldrid.SPIRV.wasm",
        "name": "ppy.Veldrid.SPIRV.vraunh0wmk.wasm",
        "hash": "sha256-9RJKe+1S1lKwvAP7+PHuvMje3XATMECE9pp600/RYsA=",
        "cache": "force-cache"
      },
      {
        "virtualPath": "vk.wasm",
        "name": "vk.uhb4b05oub.wasm",
        "hash": "sha256-Mk7IXhnNlsxQIjhxJ+O02uuqEg7Mg+nZqRHxlEzg2iw=",
        "cache": "force-cache"
      }
    ],
    "assembly": [],
    "satelliteResources": {
      "af": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.jdn6yrzxh5.wasm",
          "hash": "sha256-19nFhBPfHHZ8q2TJTT+DOEYzEfxw+vKE3lBCYENIIqU=",
          "cache": "force-cache"
        }
      ],
      "ar": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.m2q15mljuk.wasm",
          "hash": "sha256-wnjLOLXKD0GkkaVb5r2rkOGUbzpv8rYkS8T6+KjZmuA=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.de24tcxu7o.wasm",
          "hash": "sha256-251CmZBRAaTXaEV23SaderEytTbBK+pGcJRfPVYghNg=",
          "cache": "force-cache"
        }
      ],
      "az": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.lib4nykf0w.wasm",
          "hash": "sha256-s63SdYtKHd+HfezcXE2sJfq2EQA+GtGxzip1MQhKKDg=",
          "cache": "force-cache"
        }
      ],
      "be": [
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.9dcj34w1f5.wasm",
          "hash": "sha256-o4eHPTlXB6ml9v1cEOtycgSCxC4fW8LSrhd1SMIakhA=",
          "cache": "force-cache"
        }
      ],
      "bg": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.mrgi6ndaz0.wasm",
          "hash": "sha256-YvfQv6vVtEk8zaw2okfMjbKDanbEFaoG6FIB2HAad/M=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.zfk7uzonfv.wasm",
          "hash": "sha256-P+12Vou1wxNTLpBvXS/cIGdBLfzEbZsUtpptrMy2ceY=",
          "cache": "force-cache"
        }
      ],
      "bn": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.2y30d6xbja.wasm",
          "hash": "sha256-+ug1yCy38UUUGqGAe8uagIJ+9bqg/kGHoSOCkJheRa8=",
          "cache": "force-cache"
        }
      ],
      "ca": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.1klb6banz5.wasm",
          "hash": "sha256-H4zjEOnmJjfmJNYJdXNf8ZU/Du6ozo2h7DEh72MgIKw=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.avd7jwtkm8.wasm",
          "hash": "sha256-CnuXReBsQvSj7vFsxINBxmLC3nLVEkKlaG2ruz5/Q/o=",
          "cache": "force-cache"
        }
      ],
      "cs": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.c6tpks8an8.wasm",
          "hash": "sha256-9ONKpZP4Czl7TcykTkroNkDqe/6+E0/iBXSjw/iSAWw=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.a86r74igvd.wasm",
          "hash": "sha256-Sm+3Eey4cfI+duiYCyVXvoN+lGzjh2oXt0W9Fm8Mn2s=",
          "cache": "force-cache"
        }
      ],
      "da": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.0mc54hsf3q.wasm",
          "hash": "sha256-GLeFLupweXQVOAZR9pputiS069y84oCIYobPgdJBnUU=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.8spm4vgiiz.wasm",
          "hash": "sha256-CAxQTV3RxvdHhab1hnZshT/1UtR9MzVxdH0KbxWDA3I=",
          "cache": "force-cache"
        }
      ],
      "de": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.604odd4mwd.wasm",
          "hash": "sha256-upStYK6VuEy3Ss1plOexw48vLkczGFgFmrLzcnQOG3U=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.26nrjfh7s5.wasm",
          "hash": "sha256-9vJRLPFpYj65fE1NcJOGOa0Ib76cHx+QU0lA5vOHisQ=",
          "cache": "force-cache"
        }
      ],
      "el": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.ufcydoiley.wasm",
          "hash": "sha256-hp/qv7cfaGXTXgvAsFReeVkK6DmUgu5ZkC78OA1Rw1g=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.am0rs2rhbn.wasm",
          "hash": "sha256-HvD5SajYVoDcjJHz4lQRJJfPRU4J5NLknn0DJBZO9N8=",
          "cache": "force-cache"
        }
      ],
      "es-419": [
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.hu3gr7o0fi.wasm",
          "hash": "sha256-eW7qypbRuCZlv0QsW28wDTzg6S6cD288CkOMAMIOEn0=",
          "cache": "force-cache"
        }
      ],
      "es": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.k59f81z5ni.wasm",
          "hash": "sha256-GPiXTe4uBJEOBI35Q+y5+Z9rYEfkG4iM+1R7ppa4AgE=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.ablbgt5ep9.wasm",
          "hash": "sha256-WkspOQW9rpOAWpLjmCqo5lDlW7TZTfw55zKOk3xzkAg=",
          "cache": "force-cache"
        }
      ],
      "fa-IR": [
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.2r2eiouztz.wasm",
          "hash": "sha256-bld2vDnogaxVGgnz8qMwv4XWrMx3rm6qhXye9MNWTas=",
          "cache": "force-cache"
        }
      ],
      "fa": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.5e6c4i16bo.wasm",
          "hash": "sha256-o7jxjqEef1DU+bNIGFOnLl6aSyZOCZOSGk5UvzAYoxE=",
          "cache": "force-cache"
        }
      ],
      "fi": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.mepg9tcpvo.wasm",
          "hash": "sha256-niHPMJgPwRUFS78saQe2hi9JSErgWMJuR5C0d11T9N4=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.me1m2segg0.wasm",
          "hash": "sha256-nsLjcg4KAFkFv3pxtDik7OKEvgBK29YZOBvOkJQAZ9k=",
          "cache": "force-cache"
        }
      ],
      "fil": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.7e19hggyb7.wasm",
          "hash": "sha256-sR//gDKaZNnQJjz6OSeWOs/RWlKxlBjo4GhLCi4ReUQ=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.yt947vxdtm.wasm",
          "hash": "sha256-xp3f+09fedNPks1z7hMXO+7thvnjShqIl7dV2L6U/OI=",
          "cache": "force-cache"
        }
      ],
      "fr": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.xkld73c32p.wasm",
          "hash": "sha256-gYGi3mhqtbwbW1hCOazFBj0sLKMGzSWEvSX4FJRRESI=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.xig7qr3umr.wasm",
          "hash": "sha256-l1p2PnrN/YGDwkd//6EzOiiY6o/6aOotEOC3ECVjuW0=",
          "cache": "force-cache"
        }
      ],
      "he": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.ifsqwknkt6.wasm",
          "hash": "sha256-ko2nMyNvibCT5o/i6nXt82GMnUpixpl6d3cvy426x9g=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.behcnld1mp.wasm",
          "hash": "sha256-7SEutmqqP1/S0jM8tr36utVJ4sq1KG48n9xmY8KiDNs=",
          "cache": "force-cache"
        }
      ],
      "hr-HR": [
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.izenhyg72w.wasm",
          "hash": "sha256-nuQUvv99j8Y/AlK5yc3eYzfX67vZBuYX0cph6CiyK80=",
          "cache": "force-cache"
        }
      ],
      "hr": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.79hbyyyap5.wasm",
          "hash": "sha256-G/akfl1X/GB9Mb8i2BZnfD08kij59xQCmXLumknmByg=",
          "cache": "force-cache"
        }
      ],
      "hu": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.7xaixct9el.wasm",
          "hash": "sha256-NXfueIkeEPC7fzoRK6R6ExQRdreyKCLtXT5PsZctFPA=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.4kx09cjqx1.wasm",
          "hash": "sha256-HE3Tpo4mgxrqoq7zbUlv7h58ueE4P1+2bNJnhmFEXQE=",
          "cache": "force-cache"
        }
      ],
      "hy": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.7a9l838cmp.wasm",
          "hash": "sha256-P5Zpggf/xI57TXFVFjkXYUob5m0CDKfR9NzdqJB+Mpc=",
          "cache": "force-cache"
        }
      ],
      "id": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.0u1xmyvx8i.wasm",
          "hash": "sha256-iFXOuoV6Gjp306xvZErmvV7Nvs7sHlibubQ5Aq25Acs=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.bywinsno4w.wasm",
          "hash": "sha256-U04ZU1lv6XIs5lmHMbzXPeBDo/HBETEXdxYuMFy1BIY=",
          "cache": "force-cache"
        }
      ],
      "is": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.qd8nyryyy8.wasm",
          "hash": "sha256-Lti9XwVicL80hDSn7vS68If3WSyDXxLpzuCGUPaTNDY=",
          "cache": "force-cache"
        }
      ],
      "it": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.ao88to7rf0.wasm",
          "hash": "sha256-6qoFkb+Lagk3dDD5fdo16j8czanZIt1xysPJNAEcy10=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.bntqvloly1.wasm",
          "hash": "sha256-aTT4TkLWVVrJeSIe+lI/X0HfwPYqs7UNFDHYgmw1Dkc=",
          "cache": "force-cache"
        }
      ],
      "ja": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.ljilqzpin6.wasm",
          "hash": "sha256-ISfmPOPRgmhy5g9SqCIOb/R6jWSDRArDGOHSlekxXq8=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.nwsuog5yng.wasm",
          "hash": "sha256-KerBHioudPzpIdOZuBqzhKzgqaVBbystkL8S3BSsnfI=",
          "cache": "force-cache"
        }
      ],
      "kk-KZ": [
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.ht2boalztq.wasm",
          "hash": "sha256-+4wiyCH00OafjmDHlqSrUuAmspkCBaIW/qYbKuytKZU=",
          "cache": "force-cache"
        }
      ],
      "ko": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.xi8qttippi.wasm",
          "hash": "sha256-VyHdsZ/qvSbz7oPodZOqnt0AafVfKrL+ZfoJ4v7vIC4=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.wm51wo66ep.wasm",
          "hash": "sha256-yDLmDVdXV44qYvPZEK+5sqUgckyNqcb3vO2jRzTzPRM=",
          "cache": "force-cache"
        }
      ],
      "ku": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.rlhy18aq1d.wasm",
          "hash": "sha256-n25FzL3DiK9KQeh3QdxjBjVCcyy8B0w8xoPNokSK88o=",
          "cache": "force-cache"
        }
      ],
      "lb": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.l93eyypep6.wasm",
          "hash": "sha256-CUJcgzDb3vNcG8okWiiD0vMo0Jjld3Ze8HoisItQEk0=",
          "cache": "force-cache"
        }
      ],
      "lt": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.pixmtgky9p.wasm",
          "hash": "sha256-MZAAQavd7L0/NMfzo9H4KMc0Ox+98QiBUOyqm8pHTHg=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.rrsz21i71d.wasm",
          "hash": "sha256-mb3wpl2fMKmkCY1TEYlRDlXu/UVGkxk1yIULQREscKM=",
          "cache": "force-cache"
        }
      ],
      "lv-LV": [
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.n1dqawzhlu.wasm",
          "hash": "sha256-i/7FdFNaV6Ark4bIOVafmq0JcLNW0qC9rrop/ILOV+0=",
          "cache": "force-cache"
        }
      ],
      "lv": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.4cf66el357.wasm",
          "hash": "sha256-JGG7xk53lYochMhP9aFpzO86q3KGhRD6mPSYdO3UWpA=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.6z2iudaqfh.wasm",
          "hash": "sha256-bs5L3MCkwd2KuhlsAhKCLmyvN3ayc+lJH2HZajFklIM=",
          "cache": "force-cache"
        }
      ],
      "ms-MY": [
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.v53uewapje.wasm",
          "hash": "sha256-fWbpSqyHrYfbY9wZ7+0FMjSIKFDRbY0uUxfoobRWWxI=",
          "cache": "force-cache"
        }
      ],
      "ms": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.1vyxw0l4i9.wasm",
          "hash": "sha256-Q2H47JdHdAmLY7xA12/2ovKmvflDTZZS+lCQ/Lkv9GI=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.myw5p76o86.wasm",
          "hash": "sha256-4jTQ3JMEe5vgfD71YMnrnqne8/URozDeILl4chaiBl0=",
          "cache": "force-cache"
        }
      ],
      "mt": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.c3914s2kux.wasm",
          "hash": "sha256-SHguSReE76sGRlDosgWydmNxR+gcCH7/EDfHeKYuNkY=",
          "cache": "force-cache"
        }
      ],
      "nb": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.tnv7qd54or.wasm",
          "hash": "sha256-CZoSy5rQiTYKR3lnTdkEHFEwAr7eTm364PuJYrdhNUo=",
          "cache": "force-cache"
        }
      ],
      "nl": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.1m0adf1oi2.wasm",
          "hash": "sha256-ZwUdyyalTFXZDMmIfTLWzcXTREzwwnQTxfk29CSLB44=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.m8e48jqztd.wasm",
          "hash": "sha256-6koadCwDCPS7QS89rLKKC7J5/F3Nj+T8+0FDXb6fF4A=",
          "cache": "force-cache"
        }
      ],
      "no": [
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.kvdrzz2sqb.wasm",
          "hash": "sha256-APJD2OoVDCHdoHRoqGehcGjwRyR9tIJYPBMn2VTHxsE=",
          "cache": "force-cache"
        }
      ],
      "pl": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.g594rjfh9o.wasm",
          "hash": "sha256-VF7epIe87z9jPgXCoZmgqHN3CTPwptvqCC/MfbwEltM=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.62wzyn4naf.wasm",
          "hash": "sha256-8lTA2wc884qFTatVFoJ8NZRb80bLehLzXrbAN56thbs=",
          "cache": "force-cache"
        }
      ],
      "pt-BR": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.uyfu5odncn.wasm",
          "hash": "sha256-qj5X6h5kbS+JExp6KXZcRWCoGIb8eEZP2tswYbiSL6M=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.2yzc680luo.wasm",
          "hash": "sha256-+mYxzJE7CsF5FNTQ5f3JHfmkoNoBbT3eh4Niekv0B1o=",
          "cache": "force-cache"
        }
      ],
      "pt": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.dw4kbd51rr.wasm",
          "hash": "sha256-M9sccPq3ilfPy7yvr8pELdEYty3NaEAwRkWuiZumA9E=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.wiuwrb4l2n.wasm",
          "hash": "sha256-eBZ680TU746+o7V7aAWS9AsWbS7KRste6YNq/S/zA7s=",
          "cache": "force-cache"
        }
      ],
      "ro": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.xa07t5n9o5.wasm",
          "hash": "sha256-SR44di54E348X+nZ3RpNNXZKfg4+OMRryZntj62GF+E=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.dvxqu5cv8i.wasm",
          "hash": "sha256-B0AY1dcSu8fkOYnIZxopDp1EDSsS7iyww54NJYowyXg=",
          "cache": "force-cache"
        }
      ],
      "ru": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.wdj6gugi5f.wasm",
          "hash": "sha256-pG/wv+hFOk5HjdU1DpP7OwqitNnEabYpdXaeMjN/zIo=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.j37d2wxjz2.wasm",
          "hash": "sha256-0QjkSQQ9jRKDGoRErMkbhzQbqpqoUHYs4ctI0w7zgbI=",
          "cache": "force-cache"
        }
      ],
      "si-LK": [
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.8ij68o11wo.wasm",
          "hash": "sha256-wJ/ha1LtM5XMwFxfD/0gL4R31ptpVuhew3iDci1eW3g=",
          "cache": "force-cache"
        }
      ],
      "sk": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.9x28gy37kc.wasm",
          "hash": "sha256-M3cRUYxxjBuoQdvAKiRy960HrHYlLTr3S4xXC+wJwpU=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.5rzghyoi0f.wasm",
          "hash": "sha256-AZK/5tTS47QG4LAuem8i2BoCpl4eRaGkpiau5JIBVMo=",
          "cache": "force-cache"
        }
      ],
      "sl": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.e7md3wiry0.wasm",
          "hash": "sha256-VgvTtYI1xHO03SRKw15y/KcjbfYiALd2CeJ30j5u5DE=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.uofmzgxxly.wasm",
          "hash": "sha256-7otP0QmcYl9IWgkay0GyxPuGNJaGpTJsIL5dmcDRJEk=",
          "cache": "force-cache"
        }
      ],
      "sr-Latn": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.isqpt7qr6i.wasm",
          "hash": "sha256-4myaT3WO6nE82daRVAX+/Ax6EhCKba4xfcWjTguEnCA=",
          "cache": "force-cache"
        }
      ],
      "sr": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.cjpkl1pv6g.wasm",
          "hash": "sha256-SOfLAfV7TRk9njdTUM85wg9Ea5AgfYsyXwR0P90bZH0=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.amcoh5ok3b.wasm",
          "hash": "sha256-4rp/47wvHdtF08fIFsymk4UlhqZfvaU+6kJdMkM4hBA=",
          "cache": "force-cache"
        }
      ],
      "sv": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.f1krlsurya.wasm",
          "hash": "sha256-M2OWg3Aqhl0f1wXwfnh6R1zTEqbWT1hjlH05VeK5puM=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.dpw14dfpkr.wasm",
          "hash": "sha256-L5zHXgRZWuHUx0RY8BFIjf9wWeQeIBQtI8klCWB7ReI=",
          "cache": "force-cache"
        }
      ],
      "tg-TJ": [
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.di2of9lcgp.wasm",
          "hash": "sha256-S1rTkOGdGqW5cMTmA1SvOx7VHqXPhdGz2bZ5ylA7G5E=",
          "cache": "force-cache"
        }
      ],
      "th": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.zvqrnu3tc9.wasm",
          "hash": "sha256-39/a7nP0xsVlxovvLN7X62PA/TkWqQPaHHBOfJL/F60=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.5drunhledk.wasm",
          "hash": "sha256-CRFJ0iApfi1kkbqXzKma8rACnI51YDUtcjOZfXqLiVA=",
          "cache": "force-cache"
        }
      ],
      "tr": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.5d7au0kulq.wasm",
          "hash": "sha256-yeFtvpZsNRdBbQOxTG2ka3TSBG6dMZB5fpXhGIj53CU=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.yfsf0q63o5.wasm",
          "hash": "sha256-vgUBkHTYUaECME0MfUtAbUvFWhGdfXzwTD64SDTGHdY=",
          "cache": "force-cache"
        }
      ],
      "uk": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.tkorifj7mt.wasm",
          "hash": "sha256-02xTIJd0VS31a2sr9a8wrrop83z9NMNY/zSuGVxJx1E=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.kwyb1x4f58.wasm",
          "hash": "sha256-jLWn5VGe/YujVYuvMtS7+hvAkSTPVyyMFepBYm+eRYI=",
          "cache": "force-cache"
        }
      ],
      "uz-Cyrl-UZ": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.a4bspw263u.wasm",
          "hash": "sha256-tv+3utRUf4mDuKv8cchUzw3gNs3u31KLMDKVjsJAcAk=",
          "cache": "force-cache"
        }
      ],
      "uz-Latn-UZ": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.lij0v80ewo.wasm",
          "hash": "sha256-zYE3H5yNbsggkUemc8JhF7+T8jPCwTmJeJkq2jEskWA=",
          "cache": "force-cache"
        }
      ],
      "vi": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.6y6hi0l8mu.wasm",
          "hash": "sha256-kiBK+xb0SkCc9ZQXtFbnqPus6n7auLhxdeT51vbtu5U=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.8diosmrhmq.wasm",
          "hash": "sha256-BOm/hv4nlU6BP3Sz192dW9bOjvVxHgu2JKkfFhTGcoo=",
          "cache": "force-cache"
        }
      ],
      "zh-CN": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.qs9uwihv5z.wasm",
          "hash": "sha256-5vp7CFKZAFSGQFNtLp5G6jW7GwJRswR66RNZgdz/E7Q=",
          "cache": "force-cache"
        }
      ],
      "zh-Hans": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.gljyib8evy.wasm",
          "hash": "sha256-TAped9//SkL37GmFTKmBUZK/hiLfeBkq0HgXFiSHTfk=",
          "cache": "force-cache"
        }
      ],
      "zh-Hant": [
        {
          "virtualPath": "Humanizer.resources.wasm",
          "name": "Humanizer.resources.99c9jzyifr.wasm",
          "hash": "sha256-s1rynTDQArjoswop0z179XN8VtZaMHYEUlGVMCBfatU=",
          "cache": "force-cache"
        },
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.v2u8wtwcrr.wasm",
          "hash": "sha256-R/7Cw/NmuAknDFcLoGCNbPyuNtVPRk+YQBdS2kyWAeI=",
          "cache": "force-cache"
        }
      ],
      "zh": [
        {
          "virtualPath": "osu.Game.Resources.resources.wasm",
          "name": "osu.Game.Resources.resources.9woyv2wg8x.wasm",
          "hash": "sha256-iXnq7IEqt7ZuhCtyFjGMfdTKJrKJ7F8JiIpzhd/P/8E=",
          "cache": "force-cache"
        }
      ]
    }
  },
  "debugLevel": 0,
  "linkerEnabled": true,
  "globalizationMode": "sharded",
  "runtimeConfig": {
    "runtimeOptions": {
      "configProperties": {
        "System.GC.ConserveMemory": 5,
        "System.GC.RetainVM": false,
        "Microsoft.Extensions.DependencyInjection.VerifyOpenGenericServiceTrimmability": true,
        "System.ComponentModel.DefaultValueAttribute.IsSupported": false,
        "System.ComponentModel.Design.IDesignerHost.IsSupported": false,
        "System.ComponentModel.TypeConverter.EnableUnsafeBinaryFormatterInDesigntimeLicenseContextSerialization": false,
        "System.ComponentModel.TypeDescriptor.IsComObjectDescriptorSupported": false,
        "System.Data.DataSet.XmlSerializationIsSupported": false,
        "System.Diagnostics.Debugger.IsSupported": false,
        "System.Diagnostics.Metrics.Meter.IsSupported": false,
        "System.Diagnostics.Tracing.EventSource.IsSupported": false,
        "System.Globalization.Invariant": false,
        "System.TimeZoneInfo.Invariant": false,
        "System.Linq.Enumerable.IsSizeOptimized": true,
        "System.Net.Http.EnableActivityPropagation": false,
        "System.Net.Http.WasmEnableStreamingResponse": true,
        "System.Net.SocketsHttpHandler.Http3Support": false,
        "System.Reflection.Metadata.MetadataUpdater.IsSupported": false,
        "System.Resources.ResourceManager.AllowCustomResourceTypes": false,
        "System.Resources.UseSystemResourceKeys": true,
        "System.Runtime.CompilerServices.RuntimeFeature.IsDynamicCodeSupported": true,
        "System.Runtime.InteropServices.BuiltInComInterop.IsSupported": false,
        "System.Runtime.InteropServices.EnableConsumingManagedCodeFromNativeHosting": false,
        "System.Runtime.InteropServices.EnableCppCLIHostActivation": false,
        "System.Runtime.InteropServices.Marshalling.EnableGeneratedComInterfaceComImportInterop": false,
        "System.Runtime.Serialization.EnableUnsafeBinaryFormatterSerialization": false,
        "System.StartupHookProvider.IsSupported": false,
        "System.Text.Encoding.EnableUnsafeUTF7Encoding": false,
        "System.Text.Json.JsonSerializer.IsReflectionEnabledByDefault": true,
        "System.Threading.Thread.EnableAutoreleasePool": false
      }
    }
  }
}/*json-end*/);export{gt as default,ft as dotnet,mt as exit};
