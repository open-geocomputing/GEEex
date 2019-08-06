$(document).ready(function () {
	$('#planetLoginWithUserAndPwd').submit(function () {
		planetLogin($('#planetLogin').val(),$('#planetPassword').val());
		return false;
	});
	$('#planetLoginWithAPIKey').submit(function () {
		setPlanetApiKey($('#PlanetApiKey').val());
		return false;
	});
	$('#setPlanetGeePath').submit(function () {
		setPlanetGeePath($('#PlanetGeePath').val());
		return false;
	});

	$('#setDropAreaGeePath').submit(function () {
		setDropAreaGeePath($('#DropAreaGeePath').val());
		return false;
	});
	$('#setPlanetSetings').submit(function () {
		setPlanetSetings($('#numberMinOfTileToDisp').val(),$('#dispTunail').prop('checked'));
		return false;
	});

	$('#PlanetGeePath').val
	chrome.storage.local.get(["planet_api_key", "planetPathInGEE", "DropAreaPathInGEE","numberMinOfTileToDisp", "dispTunail"],function(vals){
		$('#PlanetApiKey').val(vals.planet_api_key);
		$('#PlanetGeePath').val(vals.planetPathInGEE);
		$('#DropAreaGeePath').val(vals.DropAreaPathInGEE);
		$('#numberMinOfTileToDisp').val(vals.numberMinOfTileToDisp);
		$('#dispTunail').prop('checked',vals.dispTunail);
	});
	
});

$( function() {
	$( "#accordion" ).accordion({
		heightStyle: "content",
		collapsible: true,
		active: false
	});
} );


/***  ***/

function setDropAreaGeePath(path){
	chrome.storage.local.set({ "DropAreaPathInGEE": path});
}


/*** Planet  ***/

function planetLoginWithUserAndPwd(){
	alert("planetLoginWithUserAndPwd");
}

function planetLoginWithAPIKey(){
	alert("planetLoginWithAPIKey");
}

function planetLogin( user, pwd){
	var body={"email": user, "password": pwd}
	var request={
		url:"https://api.planet.com/auth/v1/experimental/public/users/authenticate",
		type: "POST",
		dataType: "json",
		contentType: "application/json",
		data: JSON.stringify(body),
		success: function(result){
			console.debug('success');
			console.debug(result);
			var decodeOutput=JSON.parse(atob(result.token.split('.')[1]));
			setPlanetApiKey(decodeOutput.api_key);
			$('#PlanetApiKey').val(decodeOutput.api_key);
		},
		function(xhr, status, error) {
			var err = eval("(" + xhr.responseText + ")");
			console.debug('error');
			console.debug(err.Message);
		}
	}
	$.ajax(request);	
}

function setPlanetApiKey(key){
	chrome.storage.local.set({ "planet_api_key": key});
}

function setPlanetGeePath(path){
	chrome.storage.local.set({ "planetPathInGEE": path});
}

function setPlanetSetings(numberMinOfTileToDisp,dispTunail){
	chrome.storage.local.set({ "numberMinOfTileToDisp": numberMinOfTileToDisp});
	chrome.storage.local.set({ "dispTunail": dispTunail});
}




/*** End Planet  ***/
