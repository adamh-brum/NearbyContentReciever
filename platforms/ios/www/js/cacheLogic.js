updateCards = function (cards) {
  console.log("ordering cards before save. Cards before order: " + JSON.stringify(cards));

  console.log("Sorting cards by date");
  cards = cards.sort(function (a, b) {
    a = new Date(a.dateTime);
    b = new Date(b.dateTime);
    return a > b ? -1 : a < b ? 1 : 0;
  });

  writeCachedCards(cards);
}

/*
  Gets the uniqueu device ID 
*/
getDeviceId = function () {
  var deviceId = readCachedDeviceId();
  if(deviceId === undefined || deviceId === ""){
    deviceId = guid();
    writeCachedDeviceId(deviceId);
  }

  return deviceId;
}

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}