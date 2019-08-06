chrome.runtime.onInstalled.addListener(function() {

});

chrome.webNavigation.onCompleted.addListener(function() {

	//chrome.tabs.executeScript(null, { file:'code2Inject.js'});

}, {url: [{urlMatches : 'https://code.earthengine.google.com/'}]});



/*
window.addEventListener('message',function(event){ 
if (event.origin != 'https://code.earthengine.google.com') {
    // something from an unknown domain, let's ignore it
    return;
  }
  eval(event.data);
},false)*/