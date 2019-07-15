document.addEventListener('DOMContentLoaded', function () {

	var background = chrome.extension.getBackgroundPage();
	
	chrome.tabs.query( {currentWindow: true, active : true}, function(tabArray){ 	
		var cacheItem = background.cache[tabArray[0].id];
		
		if (cacheItem != undefined) {
			if (cacheItem.state == background.TAB_NOT_HTTPS) {
				document.getElementById("http").classList.remove("hidden");
			}
			else {
				var ocsp = document.getElementById("ocsp");
				ocsp.classList.remove("hidden");
			
				var certBoxTemplate = document.getElementsByName("certificate_box_template")[0];
				
				if (cacheItem.serverResponse.certificates != undefined) {
					for (var i = 0; i < cacheItem.serverResponse.certificates.length; i++) {
						
						var certificate = cacheItem.serverResponse.certificates[i];

						var certBox = certBoxTemplate.cloneNode(true)
						certBox.classList.remove("hidden");
						ocsp.appendChild(certBox);
						
						
						setRowData("certificate_box_subject", certificate.subject); 
						setRowData("certificate_box_issuer", certificate.issuer); 
						setRowData("certificate_box_serial", certificate.serialNumber); 
						setRowData("certificate_box_ocsp_responder", certificate.ocspResponderUrl); 
						
						var divTitle = setRowData("certificate_box_title", (i+1) + "# Certificate"); 
						var divRevocationState = setRowData("certificate_box_ocsp_status", certificate.ocspRevocationState); 
						
						if (certificate.ocspRevocationState == background.OCSP_STATE_GOOD) {
							divTitle.classList.add("ok-bg");
							divRevocationState.classList.add("ok");
						}
						else if (certificate.ocspRevocationState == background.OCSP_STATE_REVOKED) {
							divTitle.classList.add("revoked-bg");
							divRevocationState.classList.add("revoked");
						}
						else {
							divTitle.classList.add("gray-bg");
							divRevocationState.classList.add("gray");
						}
					}
				}
			}
		}

	})
});

function setRowData(elementName, data) {
	var divs = document.getElementsByName(elementName);
	var div = divs[divs.length - 1];
	div.innerHTML = data;
	
	return div;
}
