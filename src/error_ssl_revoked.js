document.addEventListener('DOMContentLoaded', function() {
	var background = chrome.extension.getBackgroundPage();
	
	var reloadButton = document.getElementById("primary-button");
	var detailsButton = document.getElementById("details-button");
	var textDiv = document.getElementById("details");
	
	detailsButton.addEventListener('click', function() {
		toggleHidden(detailsButton, textDiv);
	});
	
	reloadButton.addEventListener('click', function() {
		chrome.tabs.query( {currentWindow: true, active : true}, function(tabArray){ 	
			var url = background.cache[tabArray[0].id].url;
			delete background.cache[tabArray[0].id];
			chrome.tabs.update({url: url});
		});
	})

	
	chrome.tabs.query( {currentWindow: true, active : true}, function(tabArray){ 	
		var urlElements = ["main-message-url", "final-paragraph-url", "details-url", "details-url2"];
		urlElements.forEach(function(entry) {
			document.getElementById(entry).innerHTML = background.cache[tabArray[0].id].host;
		});		
	})
});

function toggleHidden(detailsButton, textDiv) {
	var isHidden = textDiv.classList.contains("hidden");
	
	if (isHidden) {
		textDiv.classList.remove("hidden");
		detailsButton.innerText = "Advanced"
	} else {
		textDiv.classList.add("hidden");
		detailsButton.innerText = "Hide advanced"
	}
}
