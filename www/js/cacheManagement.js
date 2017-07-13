var cardsKey = "cards";
var groupsKey = "groups";
var urlQueueKey = "urlQueue";
var beaconsKey = "beacons";
var deviceIdKey = "deviceId";

readCache = function (key) {
  if (typeof (Storage) != "undefined") {
    var cacheString = localStorage.getItem(key);
    if (cacheString != null) {
      return JSON.parse(cacheString);
    }
  }
}

writeCache = function (key, cache) {
  // Cards are added to array and storage now
  localStorage.setItem(key, JSON.stringify(cache));
}

readCachedArray = function(key) {
  var items = readCache(key);
  if(items === undefined){
    items = [];
  }

  return items;
}

readCachedCards = function () {
  return readCachedArray(cardsKey);
}

writeCachedCards = function (cards) {
  writeCache(cardsKey, cards);
}

readCachedGroups = function () {
  return readCachedArray(groupsKey);
}

writeCachedGroups = function (groups) {
  writeCache(groupsKey, groups);
}

readCachedUrlQueue = function () {
  return readCachedArray(urlQueueKey);
}

writeCachedUrlQueue = function (urlQueue) {
  writeCache(urlQueueKey, urlQueue);
}

readCachedBeacons = function () {
  return readCachedArray(beaconsKey);
}

writeCachedBeacons = function (beacons) {
  writeCache(beaconsKey, beacons);
}

readCachedDeviceId = function () {
  return readCache(deviceIdKey);
}

writeCachedDeviceId = function (deviceId) {
  writeCache(deviceIdKey, deviceId);
}