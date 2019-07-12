var TAB_NOT_REVOKED = 0;
var TAB_REVOKED = 1;
var TAB_NOT_HTTPS = 2;
var TAB_STATE_UNKNOWN = 3

var OCSP_STATE_GOOD = "GOOD";
var OCSP_STATE_REVOKED = "REVOKED";
var OCSP_STATE_UNKNOWN = "UNKNOWN";

var POLICY_DEFAULT = "DEFAULT";
var POLICY_ALWAYS_FAIL = "FAIL";
var POLICY_ONLY_WARN = "WARN";

var SERVER_URL = "https://ocspchecker.com/api/check"
var CACHE_EXPIRATION = 240;


var cache = {};
var policy = POLICY_DEFAULT;
var serverUrl = SERVER_URL;
var cacheExpiration = CACHE_EXPIRATION;

  
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	var host = "";
	var protocol = "";
	if (tab.url != undefined) {
		var url = new URL(tab.url);
		host = url.host;
		protocol = url.protocol;
	}

	if (changeInfo.status == "loading") {
		
		loadSettings();
		purgeCache();

		console.log("Tab " + tabId + ": changeInfo.url=" + changeInfo.url + ", tab.url=" + tab.url + ", cache " + (tabId in cache) + ", host " + host + ", protocol: " + protocol);	
		console.log(cache);
		
		if (tabId in cache && cache[tabId].host == host && cache[tabId].state != TAB_STATE_UNKNOWN) {
			console.log("set from cache " + cache[tabId].state);
			if (cache[tabId].state == TAB_NOT_HTTPS)
				setNotHttpsTabState(tabId, host, tab.url);
			else if (cache[tabId].state == TAB_NOT_REVOKED) {
				setNotRevokedTabState(tabId, host, tab.url, cache[tabId].serverResponse);
			} 
			else if (cache[tabId].state == TAB_REVOKED) {
				setRevokedTabState(tabId, host, tab.url, cache[tabId].serverResponse);
				if (policy != POLICY_ONLY_WARN) {
					chrome.tabs.update(tabId, { url: chrome.extension.getURL("error_ssl_revoked.html") });
				}
			}
			else {
				console.log("unknown state in cache " + cache[tabId].state);
			}
		} 
		else if (protocol == "https:")
			request(serverUrl, tabId, host, tab.url);
		else if (protocol == "http:")
			setNotHttpsTabState(tabId, host, tab.url);
		else if (protocol != "chrome-extension:")
			clearTabState(tabId);
		else if (protocol == "chrome-extension:" && host == chrome.runtime.id && tabId in cache) {
			if (cache[tabId].state == TAB_REVOKED)
				setRevokedTabState(tabId, cache[tabId].host, cache[tabId].url, cache[tabId].serverResponse);
			else if (cache[tabId].state == TAB_STATE_UNKNOWN)
				setUnknownTabState(tabId, cache[tabId].host, cache[tabId].url);
			else
				clearTabState(tabId);
			
		}
	}
});



function request(serverUrl, tabId, host, url) {
	console.log("Make request for host " + host);	
	
	var request = new XMLHttpRequest();
	request.onreadystatechange = function() {
		
		if (request.readyState !== 4) {
			return;
		}

		if (this.responseText.length === 0) {
			if (policy == POLICY_ALWAYS_FAIL) {
				cache[tabId] = {"host":host, "url":url, "state":TAB_STATE_UNKNOWN, "serverResponse": "", "creationTime": (new Date().getTime())};
				chrome.tabs.update(tabId, { url: chrome.extension.getURL("error_ssl_unknown.html") });
			} else
				setUnknownTabState(tabId, host, url);

			return;
		}

		// Parse
		try {
			console.log("response: " + this.responseText);		
			var responseJson = JSON.parse(this.responseText);
			var containsRevokedCert = false;
			var containsUnknownCert = false;
		  
			responseJson.certificates.forEach(function(cert) {
				if (cert["ocspRevocationState"] == OCSP_STATE_REVOKED) {
					console.log("found revoked state cert " + cert);
					containsRevokedCert = true;					
				} else if (cert["ocspRevocationState"] == OCSP_STATE_UNKNOWN) {
					console.log("found unknown state cert " + cert);
					containsUnknownCert = true;					
				}
			});	
		
			if (containsRevokedCert) {
				if (policy == POLICY_ONLY_WARN)
					setRevokedTabState(tabId, host, url, responseJson);
				else {
					cache[tabId] = {"host":host, "url":url, "state":TAB_REVOKED, "serverResponse": responseJson, "creationTime": (new Date().getTime())};
					chrome.tabs.update(tabId, { url: chrome.extension.getURL("error_ssl_revoked.html") });
				}
			}
			else if (containsUnknownCert && policy == POLICY_ALWAYS_FAIL) {
				cache[tabId] = {"host":host, "url":url, "state":TAB_STATE_UNKNOWN, "serverResponse": "", "creationTime": (new Date().getTime())};
				chrome.tabs.update(tabId, { url: chrome.extension.getURL("error_ssl_unknown.html") });
			}
			else
				setNotRevokedTabState(tabId, host, url, responseJson);		
		  
		} catch(e) {
			console.log("response error " + e);		
		}
  };

  request.open("POST", serverUrl, true);
  request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  request.send(JSON.stringify({ "domain": host }));
}


function clearTabState(tabId) {
	console.log("clearTabState for tab " + tabId);
	
	chrome.browserAction.setBadgeText({text: "", tabId: tabId});
	chrome.browserAction.setTitle({title: "", tabId: tabId});
	chrome.browserAction.disable();
	
	delete cache[tabId];
}

function setNotHttpsTabState(tabId, host, url) {
	console.log("setNotHttpsTabState for tab " + tabId);
	
	chrome.browserAction.setBadgeBackgroundColor({color: "#666666", tabId: tabId});
	chrome.browserAction.setBadgeText({text: "HTTP", tabId: tabId});
	chrome.browserAction.setTitle({title: "No TLS/SSL Certificate used", tabId: tabId});
	chrome.browserAction.enable();
	
	cache[tabId] = {"host":host, "url":url, "state":TAB_NOT_HTTPS, "serverResponse": "", "creationTime": new Date().getTime()};
}

function setNotRevokedTabState(tabId, host, url, serverResponse) {
	console.log("setNotRevokedTabState for tab " + tabId);
	
	chrome.browserAction.setBadgeBackgroundColor({color: "#4BB543", tabId: tabId});
	chrome.browserAction.setBadgeText({text: "OK", tabId: tabId});
	chrome.browserAction.setTitle({title: "TLS/SSL Certificate not revoked", tabId: tabId});
	chrome.browserAction.enable();
	
	cache[tabId] = {"host":host, "url":url, "state":TAB_NOT_REVOKED, "serverResponse": serverResponse, "creationTime": new Date().getTime()};
}

function setRevokedTabState(tabId, host, url, serverResponse) {
	console.log("setRevokedTabState for tab " + tabId);

	chrome.browserAction.setBadgeBackgroundColor({color: "#DB4437", tabId: tabId});
	chrome.browserAction.setBadgeText({text: "REV", tabId: tabId});
	chrome.browserAction.setTitle({title: "TLS/SSL Certificate has been revoked", tabId: tabId});
	chrome.browserAction.enable();
	
	cache[tabId] = {"host":host, "url":url, "state":TAB_REVOKED, "serverResponse": serverResponse, "creationTime": new Date().getTime()};
}

function setUnknownTabState(tabId, host, url) {
	console.log("setUnknownTabState for tab " + tabId);

	chrome.browserAction.setBadgeBackgroundColor({color: "#666666", tabId: tabId});
	chrome.browserAction.setBadgeText({text: "UKN", tabId: tabId});
	chrome.browserAction.setTitle({title: "Unknown TLS/SSL Certificate Revocation State", tabId: tabId});
	chrome.browserAction.disable();
	
	cache[tabId] = {"host":host, "url":url, "state":TAB_STATE_UNKNOWN, "serverResponse": "", "creationTime": new Date().getTime()};
}

function loadSettings() {
	chrome.storage.sync.get({policy: POLICY_DEFAULT, serverUrl: SERVER_URL, cacheExpiration: CACHE_EXPIRATION}, function(items) { 
		policy = items.policy; 
		serverUrl = items.serverUrl;
		cacheExpiration = items.cacheExpiration;
	});
}

function purgeCache() {
	
	console.log("purge cache expiration " + cacheExpiration);
	var currentTime = new Date().getTime();
	
	for (var key in cache) {
		
		
		var diff = currentTime - cache[key].creationTime;
		if (diff > (cacheExpiration * 60000)) {
			console.log("clear cache tabId " + key);
			delete cache[key];
		}
	}
}

