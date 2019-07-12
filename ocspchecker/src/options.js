
// Saves options to chrome.storage
function saveOptions() {
  var policy = document.getElementById('policy').value;
  var serverUrl = document.getElementById('serverUrl').value;
  var cacheExpiration = document.getElementById('cacheExpiration').value;
  
  chrome.storage.sync.set({
    policy: policy,
    serverUrl: serverUrl,
	cacheExpiration: cacheExpiration
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 1000);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
	
	var background = chrome.extension.getBackgroundPage();
	
	chrome.storage.sync.get({policy: background.POLICY_DEFAULT, serverUrl: background.SERVER_URL, cacheExpiration: background.CACHE_EXPIRATION}, function(items) { 
		document.getElementById('policy').value = items.policy; 
		document.getElementById('serverUrl').value = items.serverUrl;
		document.getElementById('cacheExpiration').value = items.cacheExpiration;
	});	
		
}
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);