var addListner=function(){
	window.addEventListener('message',function(event){ 
	if (event.origin != 'https://code.earthengine.google.com' || (event.data.type=='FROM_PAGE')) {
	    return;
	  }
	  console.log(event.data)
	  eval(event.data);
	},false)
}

Function.prototype.clone = function() {
    var that = this;
    var temp = function temporary() { return that.apply(this, arguments); };
    for(var key in this) {
        if (this.hasOwnProperty(key)) {
            temp[key] = this[key];
        }
    }
    return temp;
};

listOfAuthorized=[];
var confirmBackup;
var code2Run=function(){
	if(!confirmBackup)confirmBackup=window.confirm.clone();
	window.confirm=function(e){
		console.log(e)
		var noForward=false;
		for (var i = 0; i < listOfAuthorized.length; i++) {
			noForward|=e.includes(listOfAuthorized[i])
		}
		if(noForward){
			return true;
		}else{
			return confirmBackup(e);
		}
	}
}

sendGEEauthToken=function(){
  window.postMessage({ type: "FROM_PAGE", authTokenGEE:ee.data.getAuthToken() }, "*");
};

setInterval("sendGEEauthToken()",60*1000);
sendGEEauthToken();

addListner();
code2Run();
