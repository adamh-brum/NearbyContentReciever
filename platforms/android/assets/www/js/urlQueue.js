var urlType_Rating = "Rating";
var urlType_GetMessage = "Message";
var urlType_GetGroups = "Groups";
var urlQueue = [];
var deviceGuid = "";

/*
    Every time a URL is called, it is left on the queue for five minutes.
    This ensures the App does not repeatedly call the same API 

    Clean Queue removes URL's that have been:
    > in the queue for over five minutes after they were called successfully
*/
cleanUrlQueue = function () {
    var newQueue = [];

    // The oldest datetime time is the oldest permitted processed URL in the queue. If the processed URL is newer than the time, it stays in the queue. Older & it is removed.
    var oldestProcessedTime = new Date().getTime() - (60000 * 5);
    urlQueue.forEach(function (urlItem) {
        if (urlItem.processedTime != undefined) {
            var urlProcessedTime = new Date(urlItem.processedTime);
            if (urlProcessedTime.getTime() > oldestProcessedTime) {
                newQueue.push(urlItem);
            }
        }
        else {
            newQueue.push(urlItem);
        }

        urlQueue = newQueue;
        writeCachedUrlQueue(urlQueue);
    });
}

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
completeUrlQueueItem = function (url) {
    urlQueue.forEach(function (urlQueueItem) {
        if (urlQueueItem.url == url) {
            urlQueueItem.processedTime = new Date();
        }
    });

    writeCachedUrlQueue(urlQueue);
}