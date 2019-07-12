document.addEventListener('DOMContentLoaded', function() {
	var background = chrome.extension.getBackgroundPage();
	
	var reloadButton = document.getElementById("primary-button");
	var optionsButton = document.getElementById("options-button");
	
	optionsButton.addEventListener('click', function() {
		chrome.runtime.openOptionsPage();
	});
	
	reloadButton.addEventListener('click', function() {
		chrome.tabs.query( {currentWindow: true, active : true}, function(tabArray){ 	
			var url = background.cache[tabArray[0].id].url;
			delete background.cache[tabArray[0].id];
			chrome.tabs.update({url: url});
		});
	});
	
	chrome.tabs.query( {currentWindow: true, active : true}, function(tabArray){ 	
			document.getElementById("main-message-url").innerHTML = background.cache[tabArray[0].id].host;
	});
});
