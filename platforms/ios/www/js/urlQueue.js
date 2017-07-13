var urlType_Rating = "Rating";
var urlType_GetMessage = "Message";
var urlType_GetGroups = "Groups";
var urlQueue = [];
var deviceGuid = "";

/*
    Gets the device parameters from cache and stores them
*/
getDeviceParameters = function () {
    var cache = readCache();
    urlQueue = cache.urlQueue;
    deviceGuid = cache.deviceGuid;
}

/*
    Returns the device GUID, from memory if possible
*/
getDeviceGuid = function () {
    if (deviceGuid === "") {
        getDeviceParameters();
    }

    return deviceGuid;
}

/*
    Returns the URL queue, from memory if possiblew
*/
getUrlQueue = function () {
    if (urlQueue === []) {
        getDeviceParameters();
    }

    return urlQueue;
}

/*
    Removes a URL from the URL queue, and updates the cache
*/
removeUrlFromQueue = function(url)
{
    var newQueue = [];
    urlQueue.forEach(function (urlQueueItem) {
        if (urlQueueItem.url != url) {
            newQueue.push({ urlType: urlQueueItem.urlType, url: urlQueueItem.url });
        }
    });

    urlQueue = newQueue;
    writeCachedUrlQueue(urlQueue);
}