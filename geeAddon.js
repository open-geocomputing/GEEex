checkActivateInterval=1000;
checkDownloadInterval=2000;
activationInterval=1000;
downloadInterval=2000;

maxParallelDownload=10;
currentParallelDownload=0;
maxAmountActivated=30;

maxParallelUploadInGEE=10;
currentParallelUploadInGEE=0;

GeeExtenstionVersion='0.9';

authTokenGEE=null;

var port = chrome.runtime.connect();

window.addEventListener("message", function(event) {
  // We only accept messages from ourselves
  if (event.source != window)
	return;

  if (event.data.type && (event.data.type == "FROM_PAGE")) {
	//console.log(event.data.authTokenGEE)
	authTokenGEE=event.data.authTokenGEE;
  }
}, false);


function initGEEAddon(){

	
	/*chrome.runtime.onMessage.addListener(
	  function(request, sender, sendResponse) {
		if(request.isMeta){
			uploadRequest={meta:request.meta, data=new Uint8Array(request.size)};
		}console.log(request.meta.file)
		if(!request.isMeta)console.log(request.data)
		//localToUploadInGEE.push(request);
		//console.log(localToUploadInGEE);
		sendResponse({farewell: "goodbye"});
	  });
*/
	chrome.storage.onChanged.addListener(function(changes, namespace) {
		//console.log(namespace)
		//console.log(changes)
		/*for (var key in changes) {
			var storageChange = changes[key];
			console.log('Storage key "%s" in namespace "%s" changed. ' +
				'Old value was "%s", new value is "%s".',
				key,
				namespace,
				storageChange.oldValue,
				storageChange.newValue);
			}*/
			loadInformationFromGoogleStorage()
		});

	eval($("html head script:contains('window._ee_flag_initialData')")[0].innerHTML)
	authTokenGEE='Bearer ' + window._ee_flag_initialData.authToken;
	// setInterval("activateImageIfNeeded()",checkActivateInterval)
	// setInterval("uplaodInGeeIfPosible()",1000)
	// setInterval("ingestInGeeIfPosible()",1000)
	// setInterval("downloadIfPossible()",300)
	refreshIntervalId=setInterval("runNextStep()",100);
	loadInformationFromGoogleStorage();
	var MutationObserver    = window.MutationObserver || window.WebKitMutationObserver;
	var myObserver          = new MutationObserver(function(){
		$("pre.console > div:not(.geeAddonAnalysis)")/*.hide()*/.addClass('geeAddonAnalysis').each(analysisGeeAddon);
	});
	var obsConfig           = { childList: true/*, characterData: true, attributes: true, subtree: true */};

	$("pre.console").each (function () {
		myObserver.observe (this, obsConfig);
	});

	/**** add command+S to save under mac ****/  
	$(document).keydown(function(event) {
		if((event.metaKey) && event.which == 83) {
			$('button.save-button').click();
			event.preventDefault();
			return false;
		}
	});
	/**** init confrim manager ****/ 
	loadCode2inject();
	setTimeout("lookForSaved()",10*1000)
}

function parseURLParams(url) {
	var queryStart = url.indexOf("?") + 1,
		queryEnd   = url.indexOf("#") + 1 || url.length + 1,
		query = url.slice(queryStart, queryEnd - 1),
		pairs = query.replace(/\+/g, " ").split("&"),
		parms = {}, i, n, v, nv;

	if (query === url || query === "") return;

	for (i = 0; i < pairs.length; i++) {
		nv = pairs[i].split("=", 2);
		n = decodeURIComponent(nv[0]);
		v = decodeURIComponent(nv[1]);

		if (!parms.hasOwnProperty(n)) parms[n] = [];
		parms[n].push(nv.length === 2 ? v : null);
	}
	return parms;
}

function lookForSaved(){
	if(location.search && location.search.includes("savedTask")){
		urlParams = parseURLParams(location.search);
		id=urlParams["savedTask"].pop();
		console.log(urlParams);
		chrome.storage.local.get(["savedTask_"+id],function(result){
			var tab=JSON.parse(result["savedTask_"+id]);
			planetImageToDownloadAndUpload=tab.planetImageToDownloadAndUpload;
			planetImageToActivate=tab.planetImageToActivate;
			maxAmountActivated=tab.maxAmountActivated;
			//toIngestInGeeArray=tab.toIngestInGeeArray;
			//toDownloadFirstArray=tab.toDownloadFirstArray;
			var localToIngestInGEE=tab.toIngestInGEE;

			for (var i = 0; i < localToIngestInGEE.length; i++) {
				var val=localToIngestInGEE[i];
				exploreJson2Upload(val);
				toIngestInGeeArray.push(val);
			}

			var obj={};
			var tab2={};
			tab2.planetImageToDownloadAndUpload={};
			tab2.planetImageToActivate={};
			tab2.maxAmountActivated=tab.maxAmountActivated;
			tab2.toIngestInGeeArray={};
			tab2.toDownloadFirstArray={};
			obj["savedTask_"+id]=JSON.stringify(tab2);
			chrome.storage.local.set(obj);
		});
	}
}


function saveAndReload(id){
	//clearInterval(refreshIntervalId);
	lastDownloadStart=Infinity;
	lastAcivation=Infinity;
	setTimeout(function(){
		var newurl="";
		
		if(!location.search.includes("savedTask")){
			newurl+="savedTask="+id;
		}

		var obj={};
		var tab={};
		tab.planetImageToDownloadAndUpload=planetImageToDownloadAndUpload;
		tab.planetImageToActivate=planetImageToActivate;
		tab.maxAmountActivated=maxAmountActivated;
		tab.toIngestInGEE=toIngestInGeeArray;
		//tab.toIngestInGeeArray=toIngestInGeeArray;
		//tab.toDownloadFirstArray=toDownloadFirstArray;
		obj["savedTask_"+id]=JSON.stringify(tab);
		chrome.storage.local.set(obj);
		location.search+=newurl;
		location.reload();
	},1000*60*2);
}

function loadCode2inject(){
	var s = document.createElement('script');
	// TODO: add "script.js" to web_accessible_resources in manifest.json
	s.src = chrome.extension.getURL('code2Inject.js');
	/*s.onload = function() {
		this.remove();
	};*/
	(document.head || document.documentElement).appendChild(s);
}

function analysisGeeAddon(){
	var val=$(this);
	var consoleCode=val.find('.trivial').html();
	if(!consoleCode || typeof consoleCode != 'string' )return;
	//console.log(consoleCode);
	if(consoleCode.startsWith('GEE_Addon_PlanetSearch:')){
		runPlanetSearch(val);
		return;	
	}
	if(consoleCode.startsWith('GEE_Addon_confirmManger:')){
		confirmManager(val);
		return;	
	}
	//val.show();
}

/**  ------- data storage -----**/
numberMinOfTileToDisp=100;
dispTunail=true;

function loadInformationFromGoogleStorage(){
	chrome.storage.local.get(["planet_api_key", "planetPathInGEE", "DropAreaPathInGEE","numberMinOfTileToDisp", "dispTunail"],function(result){
		planetKey=result.planet_api_key;
		AuthorizationPlanet='api-key ' + planetKey ;
		AuthorizationPlanetGet='api_key=' + planetKey ;
		planetPath=result.planetPathInGEE;
		dropAreaPath=result.DropAreaPathInGEE;
		if(planetPath && planetPath.substr(-1)!='/')planetPath=planetPath+'/';
		if(dropAreaPath && dropAreaPath.substr(-1)!='/')dropAreaPath=dropAreaPath+'/';
		numberMinOfTileToDisp=result.numberMinOfTileToDisp;
		dispTunail=result.dispTunail;
	});
}

/***----------Code for GEE_Addon Asset Manager --------------***/
//GEE_Addon_confirmManger:removeConfirmOn:
//GEE_Addon_confirmManger:resetConfirmOn:
function confirmManager(val){
	var code=val.find('.trivial').clone().html();
	val.hide();//.show();
	var instructions=code.slice(24);
	if(instructions.startsWith('removeConfirmOn:')){
		var confirmToRemove=instructions.slice(16);
		self.postMessage('listOfAuthorized.push("'+confirmToRemove+'");');
	}
	if(instructions.startsWith('resetConfirmOn:')){
		var confirmToReset=instructions.slice(15);
		self.postMessage('listOfAuthorized=listOfAuthorized.filter(e => e !== "'+confirmToReset+'")');
	}
	//console.log(instructions);
	//listOfAuthorized
}

/***----------End code for GEE_Addon Asset Manager --------------***/


toUploadInGeeArray=[];
toIngestInGeeArray=[];
toDownloadFirstArray=[];

/***----------Code for local Upload--------------***/

$('div.tree-manager.asset-manager').on('dragover', function(event) {
	$(this).addClass('dragover');
	return false;
});

$('div.tree-manager.asset-manager').on('dragleave', function(event) {
	$(this).removeClass('dragover');
	return false;
});

$('div.tree-manager.asset-manager').on('drop', function(event) {
	$(this).removeClass('dragover');
	//console.log(event)
	if(event.originalEvent.dataTransfer && event.originalEvent.dataTransfer.files.length) {
		event.preventDefault();
		event.stopPropagation();
		console.log(event.originalEvent.dataTransfer.files);
		var items  = event.originalEvent.dataTransfer.items;      // -- Items

		for (var i = 0; i < items.length; i++) 
		{
			// Get the dropped item as a 'webkit entry'.
			var entry = items[i].webkitGetAsEntry();
			if(entry.isDirectory)
				uploadTreeFolder(entry)
		}
	}
});

function uploadTreeFolder(item,path){
	path = path || "";
	var dirReader = item.createReader();
	dirReader.readEntries(function(entries) {
		var manifest=null;
		var fileArray={};
		for (var i=0; i<entries.length; i++) {
			if(entries[i].isDirectory)
				uploadTreeFolder(entries[i], path + item.name + "/");
			if(entries[i].isFile){
				if(entries[i].name=="manifest.json"){
					console.log("find ones")
					manifest=entries[i];
				}else{
					fileArray[entries[i].name]=entries[i];
				}
			}
		}
		if(manifest)
		{
			uploadFolder(manifest,fileArray);
		}
	});
}

function uploadFolder(manifest,fileArray){
	manifest.file(function(manifestFile){
		fr = new FileReader();
		fr.onload = function(e){
			let lines = e.target.result;
			var newArr = JSON.parse(lines);
			exploreJson2Upload(newArr,fileArray);
			toIngestInGeeArray.push(newArr);
		};
		fr.readAsText(manifestFile);
	});
}

function exploreJson2Upload(jsonData,fileArray){
	if(Array.isArray(jsonData))
	{
		for (var i = 0; i < jsonData.length; i++) {
			exploreJson2Upload(jsonData[i],fileArray);
		}
	}else{
		if(typeof jsonData==='object') // is dictionary
		{
			for(k in jsonData){
				if(k=='uris')
					uploadFilesInGEE(jsonData[k],fileArray);
				else
					exploreJson2Upload(jsonData[k],fileArray);
			}
		}
	}
}

function uploadFromLocal(index,uris,fileEntry){
	var struct4GetUploadImage={
			url: 'https://code.earthengine.google.com/assets/upload/geturl',
			type: "GET",
			cache: false,
			dataType: "json",
			contentType: "application/json",
			success: function(uploadAddresObject){
				fileEntry.file(function(fileData){
					var uploadFormData = new FormData();
					uploadFormData.append("data", fileData);
					var struct4UpploadImageAjaxCall={
						url: uploadAddresObject.url,
						type: "POST",
						dataType: "json",
						contentType: false,
						cache : false,
						processData: false,
						data: uploadFormData,
						success: function(gsAddress){
							uris[index]=gsAddress[0];
							uplaodInGeeIfPosible(true);
						}
					}
					$.ajax(struct4UpploadImageAjaxCall);
				},function(e){console.error(e)});
			}
		}
		toUploadInGeeArray.push(struct4GetUploadImage)
}

function uploadFromRemote(index,uris){
	var struct4ImageDownloadAjaxCall;
	struct4ImageDownloadAjaxCall={
		url: uris[index],
		crossDomain : true,
		//cache:false,
		xhrFields:{
			responseType: 'blob'
		},
		retry:0,
		error: function(jqXHR, textStatus, errorThrown){
			if(jqXHR.status>=500)
			{
				lastDownloadStart=Date.now()+60*1000;
			}
			if(jqXHR.status<100)
			{
				saveAndReload(1);
			}
			currentParallelDownload--;
			if(this.retry<10) {
				struct4ImageDownloadAjaxCall.retry++;
				toDownloadFirstArray.push(struct4ImageDownloadAjaxCall);
			}else{
				uris[index]="";
			}
		},
		success: function(downloadImageData){
			currentParallelDownload--;
			var struct4GetUploadImage={
				url: 'https://code.earthengine.google.com/assets/upload/geturl',
				type: "GET",
				cache: false,
				dataType: "json",
				contentType: "application/json",
				success: function(uploadAddresObject){
					var uploadFormData = new FormData();
					uploadFormData.append("data", new Blob([downloadImageData], {type:"multipart/form-data"}),'uploadImage.tif');
					var struct4UpploadImageAjaxCall={
						url: uploadAddresObject.url,
						type: "POST",
						dataType: "json",
						contentType: false,
						cache : false,
						processData: false,
						data: uploadFormData,
						success: function(gsAddress){
							uris[index]=gsAddress[0];
							uplaodInGeeIfPosible(true);
						}
					}
					$.ajax(struct4UpploadImageAjaxCall);
				}
			}
			toUploadInGeeArray.push(struct4GetUploadImage);
		}
	}
	if(uris[index].includes('planet.com'))
		struct4ImageDownloadAjaxCall["headers"]={ "Authorization": AuthorizationPlanet };
	toDownloadFirstArray.push(struct4ImageDownloadAjaxCall)
}

function downloadIfPossible(){
	if(toDownloadFirstArray.length>0 && (currentParallelDownload<maxParallelDownload) && (toUploadInGeeArray.length<20) ){
		currentParallelDownload++;
		var request=toDownloadFirstArray.shift();
		$.ajax(request);
	}
}

function uploadFilesInGEE(arrayOfUris,fileArray){
	//console.log("uploadFilesInGEE")
	//console.log(arrayOfUris[localIndex]);
	for (var i = 0; i < arrayOfUris.length; i++) {
		var localIndex=i;
		if(arrayOfUris[localIndex].startsWith("gs://")) continue;
		if(arrayOfUris[localIndex].startsWith("http://") || arrayOfUris[localIndex].startsWith("https://"))
			uploadFromRemote(localIndex,arrayOfUris);
		else
			uploadFromLocal(localIndex,arrayOfUris,fileArray[arrayOfUris[localIndex]]);
	}
}

function uplaodInGeeIfPosible(uploadReturn){
	if(uploadReturn)currentParallelUploadInGEE--;
	if(toUploadInGeeArray.length>0){
		if(currentParallelUploadInGEE<maxParallelUploadInGEE){
			currentParallelUploadInGEE++;
			var request=toUploadInGeeArray.shift();
			$.ajax(request);
			uplaodInGeeIfPosible(false);
		}
	}
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

console.log(uuidv4());

function ingestInGEE(jsonData){
	var struct4IngestionAjaxCall={
		//url: 'https://earthengine.googleapis.com/v1/image:ingest?alt=json',
		url: 'https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/image:import?alt=json',
		type: "POST",
		dataType: "json",
		cache: false,
		contentType: "application/json",
		data: JSON.stringify({"imageManifest": jsonData,
					"requestId": uuidv4(),
					"overwrite": false
					}),
		headers: { "Authorization": authTokenGEE },
		error: function(){toIngestInGeeArray.unshift(jsonData)},
		success: function(result){
			// $('button .retrybutton').click()
			// setTimeout("$('button .retrybutton').click()",10000);

		}
	}
	$.ajax(struct4IngestionAjaxCall);
}

function isReadyToIngest(jsonData){
	var canBeIngested=1;
	if(Array.isArray(jsonData))
	{
		for (var i = 0; i < jsonData.length; i++) {
			canBeIngested*=isReadyToIngest(jsonData[i]);
		}
	}else{
		if(typeof jsonData==='object') // is dictionary
		{
			for(k in jsonData){
				if(k=='uris')
					for (var i = 0; i < jsonData[k].length; i++) {
						canBeIngested&=jsonData[k][i].startsWith("gs://");
						if(jsonData[k][i]=="") return -1;
					}
				else
					canBeIngested*=isReadyToIngest(jsonData[k]);
			}
		}
	}
	return canBeIngested;
}

function convertToIngest(jsonData){
	if(Array.isArray(jsonData))
	{
		for (var i = 0; i < jsonData.length; i++) {
			convertToIngest(jsonData[i]);
		}
	}else{
		if(typeof jsonData==='object') // is dictionary
		{
			for(k in jsonData){
				if(k=='uris'){
					jsonData['primaryPath']=jsonData['uris'];
					delete jsonData['uris'];
					continue;
				}
				if(k=='name' && jsonData['name'].startsWith('projects/earthengine-legacy/assets/')){				
					jsonData['id']=jsonData['name'].substring('projects/earthengine-legacy/assets/'.length);
					delete jsonData['name'];
					continue;
				}
				convertToIngest(jsonData[k]);
			}
		}
	}
	return jsonData;
}

function ingestInGeeIfPosible(){
	if(toIngestInGeeArray.length >0){
		var jsonData=toIngestInGeeArray.shift();
		var status=isReadyToIngest(jsonData);
		if(status==1) {
		//ingestInGEE(convertToIngest(toIngestInGeeArray.shift()))
			ingestInGEE(jsonData)
		}else if(status==0){
			toIngestInGeeArray.push(jsonData);
		}
	}
}

/***----------End code for local Upload --------------***/

lastDownloadStart=0;
lastIngestion=0;
lastUpload=0;
lastAcivation=0;

deltaDownload=800;
deltaIngestion=400;
deltaUpload=400;
deltaAcivation=1200;

done=true;

function runNextStep(){
	if(done)
	{
		done=false;
		var now=Date.now();
		if(lastIngestion + deltaIngestion < now){
			ingestInGeeIfPosible();
			lastIngestion=Date.now();
		}
		if(lastUpload + deltaUpload < now){
			uplaodInGeeIfPosible();
			lastUpload=Date.now();
		}
		if(lastAcivation + deltaAcivation < now){
			activateImageIfNeeded();
			lastAcivation=Date.now();
		}
		if(lastDownloadStart + deltaDownload < now){
			downloadIfPossible();
			lastDownloadStart=Date.now();
		}
		
		done=true;
	}
}

/***----------Code for Planet --------------***/

planetImageToActivate=[];
planetImageToDownloadAndUpload=[];

function genreateFilter(filter){
	var result=null;
	switch(filter.functionName){
		case "Filter.dateRangeContains" :
		result={
			"type": "DateRangeFilter",
			"field_name": "acquired",
			"config": {
				"gte": filter.arguments.leftValue.arguments.start+"T21:44:08.703Z",
				"lte": filter.arguments.leftValue.arguments.end+"T21:44:08.703Z"
			}
		}
		break;
		case "Filter.intersects" :
		result= {
			"type": "GeometryFilter",
			"field_name": "geometry",
			"config": filter.arguments.rightValue.arguments.geometry
		};
		break;
		case "Filter.lessThan" :
		result= {
			"type": "RangeFilter",
			"field_name": filter.arguments.leftField,
			"config": {
				//"gt": -Number.MAX_VALUE,
				"lt": filter.arguments.rightValue
			}
		}
		break;
		case "Filter.greaterThan" :
		result= {
			"type": "RangeFilter",
			"field_name": filter.arguments.leftField,
			"config": {
				"gt": filter.arguments.rightValue,
				//"lt": Number.MAX_VALUE
			}
		}
		break;
		case "Filter.rangeContains" :
		result= {
			"type": "RangeFilter",
			"field_name": filter.arguments.field,
			"config": {
				"gt": filter.arguments.minValue,
				"lt": filter.arguments.maxValue
			}
		}
		break;
		case "Filter.equals" :
		result= {
			"type": "NumberInFilter",
			"field_name": filter.arguments.leftField,
			"config":[ filter.arguments.rightValue ]
		}
		break;
		case "Filter.listContains" :
		listString=[];
		listNumber=[];
		for (var i = 0; i < filter.arguments.leftValue.length; i++) {
			if(typeof filter.arguments.leftValue[i] === 'string'){
				listString.push(filter.arguments.leftValue[i])
			}else{
				listNumber.push(filter.arguments.leftValue[i])
			}
		}

		result={  
			"type":"OrFilter",
			"config":[  
			{
				"type":"StringInFilter",
				"field_name":filter.arguments.rightField,
				"config":listString
			},
			{
				"type":"NumberInFilter",
				"field_name":filter.arguments.rightField,
				"config":listNumber
			}
			]
		}
		break;
		case "Filter.not" :
		result= {
			"type":"NotFilter",
			"config":[genreateFilter(filter.arguments.filter)]
		}
		break;
		case "Filter.or" :
		subFilter=[];
		for (var i = 0; i < filter.arguments.filters.length; i++) {
			subFilter.push(genreateFilter(filter.arguments.filters[i]))
		}
		result= {
			"type":"OrFilter",
			"config":subFilter
		}
		break;
		case "Filter.and" :
		subFilter=[];
		for (var i = 0; i < filter.arguments.filters.length; i++) {
			subFilter.push(genreateFilter(filter.arguments.filters[i]))
		}
		result= {
			"type":"AndFilter",
			"config":subFilter
		}
		break;
		default:
		console.error(filter.functionName+ 'is not supported !')
		
	}	
	return result;
}

function downloadImageIfReady(){
	if(planetImageToDownloadAndUpload.length>0)
	{
		var obj = planetImageToDownloadAndUpload.shift();
		var strucur4AjaxCall={
			headers: { "Authorization": AuthorizationPlanet },
			url: obj.assetLink,
			dataType: "json",
			contentType: "application/json",

			success: function(result){
				if((result[obj.assetType]["status"]=="active")&&(result["udm"]["status"]=="active")){
					generateManifestForPlanetImage(obj,result)
				}else{
					addPlanetImageToDownloadAndUpload(obj);
				}
			}
		}
		$.ajax(strucur4AjaxCall);
	}
}

function generateManifestForPlanetImage(obj,planetManifest){
	//console.log("generateManifestForPlanetImage")
	var bandsName=null;
	switch(obj.itemType) {
		case "PSScene3Band":
			bandsName=[	{ "id": "Blue","tileset_band_index": 2,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "Green","tileset_band_index": 1,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "Red","tileset_band_index": 0,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"}];
			break;
		case "PSScene4Band":
			bandsName=[	{ "id": "Blue","tileset_band_index": 0,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "Green","tileset_band_index": 1,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "Red","tileset_band_index": 2,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "NIR","tileset_band_index": 3,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"}];
			break;
		case "PSOrthoTile":
			bandsName=[	{ "id": "Blue","tileset_band_index": 0,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "Green","tileset_band_index": 1,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "Red","tileset_band_index": 2,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "NIR","tileset_band_index": 3,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"}];
			break;
		case "REOrthoTile":
			bandsName=[	{ "id": "Blue","tileset_band_index": 0,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "Green","tileset_band_index": 1,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "Red","tileset_band_index": 2,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "RedEdge","tileset_band_index": 3,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"},
						{ "id": "NIR","tileset_band_index": 4,"tileset_id":"colorImage","pyramidingPolicy": "MEAN"}];
			break;
		//to add
		// case "REScene":
		// case "SkySatScene":
		// case "SkySatCollect":
		default:
			break;
	}

	obj.downloadLink=planetManifest[obj.assetType]["location"];
	if(obj.assetType.endsWith('_sr')){
		obj.downloadLink_XML=planetManifest[obj.assetType.slice(0,-3)+"_xml"]["location"];
	}else{
		obj.downloadLink_XML=planetManifest[obj.assetType+"_xml"]["location"];
	}
	obj.udmType='udm';
	if(obj.assetType.startsWith('basic'))obj.udmType='basic_udm';
	obj.downloadLink_udm=planetManifest[obj.udmType]["location"];
	var loadXmlData={
		headers: { "Authorization": AuthorizationPlanet },
		url: obj.assetLink.slice(0,-8), //obj.downloadLink_XML,
		dataType: "json",
		contentType: "application/json",
		//success: function(xmlData){
		success: function(jsonMeta){
			var meta=jsonMeta.properties;
			meta.id=jsonMeta.id;
			meta.ingestedwith='GEE chrome extenstion, version:'+GeeExtenstionVersion;
			meta.ingestionTime=Date.now;
			meta.assetType=obj.assetType;
			var keys =Object.keys(meta);
			for (var i = 0; i < keys.length; i++) {
				if(typeof meta[keys[i]] == typeof true){
					meta[keys[i]]=Number(meta[keys[i]]);
				}
			}
			var geeUploadManifest=
			{
				"name": "projects/earthengine-legacy/assets/"+planetPath+jsonMeta.id+"_"+obj.assetType,
				"tilesets": [
					{
						"id": "colorImage", 
						"sources": [
							{
								"uris": [
									obj.downloadLink
								]
							}
						]
					},
					{
						"id": "udm", 
						"sources": [
							{
								"uris": [
									obj.downloadLink_udm
								]
							}
						]
					}
				],
				/*"mask_bands": {
					"tileset_id": "udm"
				},*/
				"start_time": {
					"seconds": Math.round(Date.parse(jsonMeta.properties.acquired)/1000)
				},
				"end_time": {
					"seconds": Math.round(Date.parse(jsonMeta.properties.acquired)/1000)+1
				},
				"properties":meta
			};
			if(bandsName)
			{
				geeUploadManifest["bands"]=bandsName;
			}
			bandsName.push({ "id": "UDM","tileset_band_index": 0,"tileset_id":"udm","pyramidingPolicy": "SAMPLE"})
			exploreJson2Upload(geeUploadManifest);
			toIngestInGeeArray.push(geeUploadManifest);	
		}
	}
	$.ajax(loadXmlData);
}

function addPlanetImageToDownloadAndUpload(obj){
	for (var i = 0; i < planetImageToDownloadAndUpload.length; i++) {
		if(planetImageToDownloadAndUpload[i].assetLink==obj.assetLink)
			return;
	}
	// console.log(toUploadInGeeArray)
	// console.log(toIngestInGeeArray)
	// console.log(toDownloadFirstArray)
	// console.log(planetImageToDownloadAndUpload)
	planetImageToDownloadAndUpload.push(obj);
}



function activatePlanetImages(obj){
	//console.log(activatePlanetImages)
	var strucur4AjaxCall={
		headers: { "Authorization": AuthorizationPlanet },
		url: obj.assetLink,
		dataType: "json",
		contentType: "application/json",
		
		success: function(result){
			var udmType='udm';
			if(obj.assetType.startsWith('basic'))udmType='basic_udm';
			if((result[obj.assetType]["status"]!="inactive") && (result[udmType]["status"]!="inactive")){
				addPlanetImageToDownloadAndUpload(obj)
			}
			else
			{
				var activationURL=result[obj.assetType]["_links"]["activate"];
				var activateAjaxCall={
					headers: { "Authorization": AuthorizationPlanet },
					url: activationURL,
					dataType: "json",
					contentType: "application/json",
					error: function(jqXHR, textStatus, errorThrown){
						if(jqXHR.status==202) return;
						planetImageToActivate.unshift(obj);
					},
					statusCode: {
						202: function(){
							addPlanetImageToDownloadAndUpload(obj);
						}
					}
				}
				$.ajax(activateAjaxCall);

				var activationURL_UDM=result[udmType]["_links"]["activate"];
				var activateAjaxCall2={
					headers: { "Authorization": AuthorizationPlanet },
					url: activationURL_UDM,
					dataType: "json",
					contentType: "application/json",
					error: function(jqXHR, textStatus, errorThrown){
						if(jqXHR.status==202) return;
						planetImageToActivate.unshift(obj);
					}
				}
				
				setTimeout(function(){$.ajax(activateAjaxCall2);},600);
			}
		}
	}
	$.ajax(strucur4AjaxCall);
}


toUploadInGeeArray
toIngestInGeeArray
toDownloadFirstArray
planetImageToDownloadAndUpload

function activateImageIfNeeded(){
	if(planetImageToActivate.length>0){
		if((planetImageToDownloadAndUpload.length+toDownloadFirstArray.length/2)<maxAmountActivated){ // improve condition
			activatePlanetImages(planetImageToActivate.shift())
		}
	}
	downloadImageIfReady();
}

function satckToActivatePlanetImages(id){
	$('#randId_'+id+' div.sceneId.selected').each(function(){
		var assetLink=$(this).attr('assetLink');
		var assetType=$(this).attr('assetType');
		var itemType=assetLink.split("/")[6];
		//console.log("planetImageToActivate")
		planetImageToActivate.push({
			assetLink:assetLink,
			assetType:assetType,
			itemType:itemType
		});
		
	});

	$('#randId_'+id+' div.sceneId.selected').each(function(){
		$(this).removeClass('selected').addClass('avoid-clicks').hide();//slideUp();
	});
	updateCountSelected(id);

}

function selectAllImages(id){
	$('#randId_'+id+' div.sceneId:not(.avoid-clicks)').addClass('selected');
	updateCountSelected(id);
}

function toggleAllImages(id){
	$('#randId_'+id+' div.sceneId:not(.avoid-clicks)').toggleClass('selected');
	updateCountSelected(id);
}

function addSceneInConsole(randomId,features,assetConfig){
	var head=$('#randId_'+randomId+' .planetScenesList')
	for (var i = 0; i < features.length; i++) {
		htmlCode='<div class="sceneId avoid-clicks" assetType="'+assetConfig+'" assetLink="'+features[i]._links.assets+'" value="'
		+features[i].id+'">';
		// image
		//+'<div class="planet-thumbnail hidden" style="background-image:url('+features[i]._links.thumbnail+'?'+AuthorizationPlanetGet+')"> </div>'
		if(dispTunail) htmlCode +='<img class="planet-thumbnail" src="'+features[i]._links.thumbnail+"?"+AuthorizationPlanetGet+'" loading="lazy" />'
		htmlCode+='<div class="infobox">'
				+'<span>Id: '+features[i].id+'</span><br>'
				+'<span>Date:'+features[i].properties.acquired+'</span><br>'
				+'<span>Cloud:'+features[i].properties.cloud_cover*100+'%</span><br>'
				+'<span>Resoution: '+features[i].properties.pixel_resolution+' m</span><br>'
			+'</div>'
		+'</div>'
		head.append(htmlCode);
	}

	// var dataJson='{"type":"CompoundValue","scope":[["0",'+JSON.stringify(features.map(e=>{return e.id}))+'],["1",{"type":"Invocation","arguments":{"id":"'+planetPath.slice(0,-1)+'"},"functionName":"ImageCollection.load"}],'+
	// 	'["2",{"type":"Invocation","arguments":{"rightField":"id","leftValue":{"type":"ValueRef","value":"0"}},"functionName":"Filter.listContains"}],["3",{"type":"Invocation","arguments":{"leftField":"assetType","rightValue":"'+assetConfig+'"}'+
	// 	',"functionName":"Filter.equals"}],["4",[{"type":"ValueRef","value":"2"},{"type":"ValueRef","value":"3"}]],["5",{"type":"Invocation","arguments":{"filters":{"type":"ValueRef","value":"4"}},"functionName":"Filter.and"}],'+
	// 	'["6",{"type":"Invocation","arguments":{"collection":{"type":"ValueRef","value":"1"},"filter":{"type":"ValueRef","value":"5"}},"functionName":"Collection.filter"}],["7",{"type":"Invocation",'+
	// 	'"arguments":{"collection":{"type":"ValueRef","value":"6"}},"functionName":"Collection.size"}],["8",{"type":"Invocation","arguments":{"left":{"type":"ValueRef","value":"7"},"right":1},"functionName":"Number.add"}],'+
	// 	'["9",{"type":"Invocation","arguments":{"collection":{"type":"ValueRef","value":"6"},"count":{"type":"ValueRef","value":"8"}},"functionName":"Collection.toList"}],["10",{"type":"Invocation","arguments":'+
	// 	'{"object":{"type":"ArgumentRef","value":"_MAPPING_VAR_0_0"},"property":"id"},"functionName":"Element.get"}],["11",{"type":"Function","argumentNames":["_MAPPING_VAR_0_0"],"body":{"type":"ValueRef","value":"10"}}],'+
	// 	'["12",{"type":"Invocation","arguments":{"list":{"type":"ValueRef","value":"9"},"baseAlgorithm":{"type":"ValueRef","value":"11"}},"functionName":"List.map"}],["13",{"type":"Invocation","arguments":{"list":{"type":"ValueRef","value":"0"},'+
	// 	'"other":{"type":"ValueRef","value":"12"}},"functionName":"List.removeAll"}]],"value":{"type":"ValueRef","value":"13"}}'

	var dataJson=JSON.stringify({"expression":{"result":"0","values":{"0":{"functionInvocationValue":{"arguments":{"list":{"valueReference":"1"},"other":{"functionInvocationValue":{"arguments":{"list":{"functionInvocationValue":{"arguments":{"collection":{"valueReference":"2"},"count":{"functionInvocationValue":
	{"arguments":{"left":{"functionInvocationValue":{"arguments":{"collection":{"valueReference":"2"}},"functionName":"Collection.size"}},"right":{"constantValue":1}},"functionName":"Number.add"}}},"functionName":"Collection.toList"}},"baseAlgorithm":{"functionDefinitionValue":
	{"argumentNames":["_MAPPING_VAR_0_0"],"body":"4"}}},"functionName":"List.map"}}},"functionName":"List.removeAll"}},"1":{"constantValue":features.map(e=>{return e.id})},"2":{"functionInvocationValue":{"arguments":{"collection":{"functionInvocationValue":{"arguments":
	{"id":{"constantValue":planetPath.slice(0,-1)}},"functionName":"ImageCollection.load"}},"filter":{"functionInvocationValue":{"arguments":{"filters":{"arrayValue":{"values":[{"functionInvocationValue":{"arguments":{"rightField":{"valueReference":"3"},
	"leftValue":{"valueReference":"1"}},"functionName":"Filter.listContains"}},{"functionInvocationValue":{"arguments":{"leftField":{"constantValue":"assetType"},"rightValue":{"constantValue":assetConfig}},"functionName":"Filter.equals"}}]}}},"functionName":"Filter.and"}}},
	"functionName":"Collection.filter"}},"3":{"constantValue":"id"},"4":{"functionInvocationValue":{"arguments":{"object":{"argumentReference":"_MAPPING_VAR_0_0"},"property":{"valueReference":"3"}},"functionName":"Element.get"}}}}});
	
	/*var dataJson=
		'{"type":"CompoundValue","scope":[["0",'+JSON.stringify(features.map(e=>{return e.id}))+'],["1",{"type":"Invocation","arguments":{"id":"'+planetPath.slice(0,-1)+'"},"functionName":"ImageCollection.load"}],'+
		'["2",{"type":"Invocation","arguments":{"rightField":"id","leftValue":{"type":"ValueRef","value":"0"}},"functionName":"Filter.listContains"}],["3",{"type":"Invocation","arguments":{"leftField":"type","rightValue":"udm"},'+
		'"functionName":"Filter.stringContains"}],["4",{"type":"Invocation","arguments":{"filter":{"type":"ValueRef","value":"3"}},"functionName":"Filter.not"}],["5",[{"type":"ValueRef","value":"2"},{"type":"ValueRef","value":"4"}]],'+
		'["6",{"type":"Invocation","arguments":{"filters":{"type":"ValueRef","value":"5"}},"functionName":"Filter.and"}],["7",{"type":"Invocation","arguments":{"collection":{"type":"ValueRef","value":"1"},"filter":'+
		'{"type":"ValueRef","value":"6"}},"functionName":"Collection.filter"}],["8",{"type":"Invocation","arguments":{"collection":{"type":"ValueRef","value":"7"}},"functionName":"Collection.size"}],["9",{"type":"Invocation",'+
		'"arguments":{"left":{"type":"ValueRef","value":"8"},"right":1},"functionName":"Number.add"}],["10",{"type":"Invocation","arguments":{"collection":{"type":"ValueRef","value":"7"},"count":{"type":"ValueRef","value":"9"}},'+
		'"functionName":"Collection.toList"}],["11",{"type":"Invocation","arguments":{"object":{"type":"ArgumentRef","value":"_MAPPING_VAR_0_0"},"property":"id"},"functionName":"Element.get"}],["12",{"type":"Function",'+
		'"argumentNames":["_MAPPING_VAR_0_0"],"body":{"type":"ValueRef","value":"11"}}],["13",{"type":"Invocation","arguments":{"list":{"type":"ValueRef","value":"10"},"baseAlgorithm":{"type":"ValueRef","value":"12"}},'+
		'"functionName":"List.map"}],["14",{"type":"Invocation","arguments":{"list":{"type":"ValueRef","value":"0"},"other":{"type":"ValueRef","value":"13"}},"functionName":"List.removeAll"}]],"value":{"type":"ValueRef","value":"14"}}'
*/
	var IdPresneteInGEE4AjaxCall={
		// url: "https://earthengine.googleapis.com/api/value",
		url: "https://content-earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/value:compute?key="+window._ee_flag_initialData.mapsApiKey,
		type: "POST",
		data: dataJson,
		dataType: "json",
		cache: false,
		contentType: "application/json; charset=UTF-8",
		headers: { "Authorization": authTokenGEE },
		success: function(result){
			$('#randId_'+randomId+' .planetScenesList div.sceneId.avoid-clicks').each(function(){
				if(result.result.indexOf($(this).attr('value'))>=0){
					$(this).removeClass('avoid-clicks');
				}else{
					$(this).slideUp();
				}
			})
			for (var i = 0; i < result.result.length; i++) {
				result.result[i];
			}
			updateCountSelected(randomId);
		}
	}
	$.ajax(IdPresneteInGEE4AjaxCall);

	updateCountSelected(randomId);
}

function updateCountSelected(randomId){
	$('#selectAmount_'+randomId).html("Selected "+$('#randId_'+randomId+' div.sceneId.selected:not(.avoid-clicks)').length+'/'+$('#randId_'+randomId+' div.sceneId:not(.avoid-clicks)').length);
	if($('#randId_'+randomId+' div.sceneId:not(.avoid-clicks)').length<numberMinOfTileToDisp && !$('#loadMore_'+randomId).prop("disabled")  && autoUpdate){
		$('#loadMore_'+randomId).click();
	}
}

autoUpdate=true;

function runPlanetSearch(val){
	autoUpdate=true;
	var code=val.find('.trivial').clone().html();
	val.html('Planet search').addClass('loading');//.show();
	var jsonData=JSON.parse(code.slice(19+23,-1));
	var assetConfig;
	var jsonVal=jsonData;
	var listFilter=[];
	var item_type;
	while(jsonVal){
		switch(jsonVal.functionName) {
			case "Collection.filter":
			listFilter.push(genreateFilter(jsonVal.arguments.filter))
			jsonVal=jsonVal.arguments.collection;
			break;
			case "ImageCollection.load":
			var listParameter=jsonVal.arguments.id.split('/');
			if(listParameter[0]!='PlanetLab')
				console.error('Unexistant dataset !')
			else
			{
				item_type=listParameter[1];
				if(listParameter.length>2)
					assetConfig=listParameter[2];
			}
			jsonVal=undefined;
			break;
			default:
			console.error(jsonVal.functionName+ 'is not supported !')
		}
	}


	listFilter.push({  
		"type":"PermissionFilter",
		"config":[ "assets"+( typeof assetConfig !== 'undefined' ? "."+assetConfig : "")+":download"]
	});
	assetConfig=( typeof assetConfig !== 'undefined' ? assetConfig : "");

	researchData={
		"filter": {
			"type": "AndFilter",
			"config": listFilter
		},
		"item_types": [
		item_type
		],
	};

	//console.log(JSON.stringify(researchData))

	var randomId=Math.floor((Math.random() * 100000) + 1);

	var strucur4AjaxCall={
		url: "https://api.planet.com/data/v1/quick-search",
		type: "POST",
		dataType: "json",
		contentType: "application/json",
		headers: { "Authorization": AuthorizationPlanet },
		data: JSON.stringify(researchData),
		success: function(result){
			val.html('');
			var htmlCode='<div class="planetSearch" id="randId_'+randomId+'">';
			htmlCode+='<button type="button" id="satckToActivatePlanetImages_'+randomId+'">Download selected</button>'
			htmlCode+='<button type="button" id="selectAllImages_'+randomId+'">Select all</button>'
			htmlCode+='<button type="button" id="toggleAllImages_'+randomId+'">Toggle</button>'
			htmlCode+='<button type="button" id="loadMore_'+randomId+'">Load more</button>'
			htmlCode+='<span id="selectAmount_'+randomId+'" style="white-space:nowrap;"></span>'
			htmlCode+='<div class="planetScenesList">'
			htmlCode+='</div>'
			htmlCode+='</div>'
			val.append(htmlCode);
			addSceneInConsole(randomId,result.features,assetConfig);
			val.removeClass('loading');
			$('#satckToActivatePlanetImages_'+randomId).click(function(){autoUpdate=false; satckToActivatePlanetImages(randomId);});
			$('#selectAllImages_'+randomId).click(function(){selectAllImages(randomId);});
			$('#toggleAllImages_'+randomId).click(function(){toggleAllImages(randomId);});
			$('#randId_'+randomId+' div.sceneId').click(function(e){
				if(e.shiftKey){
					var idx1=$(this).parent().find('lastSelected').toggleClass('selected').index();
					var idx2=$(this).index();
					$(this).parent().children().slice(Math.min(idx1,idx2),Math.max(idx1,idx2)).toggleClass('selected');
				}else{
					$(this).toggleClass('selected');
				}
				$(this).siblings().removeClass('lastSelected')
				$(this).add('lastSelected')
				updateCountSelected(randomId);
			});
			$('#loadMore_'+randomId).attr('linkMore',result._links._next)
			$('#loadMore_'+randomId).click(function(e){
				autoUpdate=true;
				$(this).prop("disabled", true);
				var moreScene4AjaxCall={
					url: $(this).attr('linkMore'),
					type: "GET",
					dataType: "json",
					contentType: "application/json",
					headers: { "Authorization": AuthorizationPlanet },
					retry:0,
					success: function(localResult){
						//console.log(localResult)
						if(localResult._links._next){
							$('#loadMore_'+randomId).attr('linkMore',localResult._links._next).prop("disabled", false)
						}
						addSceneInConsole(randomId,localResult.features,assetConfig);
					},
					error: function(jqXHR, textStatus, errorThrown){
						if(this.retry<10) {
							moreScene4AjaxCall.retry++;
							setTimeout(function(){
								$.ajax(moreScene4AjaxCall);
							},Math.ceil(Math.random()*5000));
						}
					}
				}
				$.ajax(moreScene4AjaxCall);
			});	

		}
	}
	$.ajax(strucur4AjaxCall);
}

/***----------End code for Planet --------------***/

initGEEAddon();
//setTimeout("initGEEAddon()",100);


