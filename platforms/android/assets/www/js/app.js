// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('contentReceiver', ['ionic', 'ionic.contrib.ui.cards'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Don't remove this line unless you know what you are doing. It stops the viewport
      // from snapping when text inputs are focused. Ionic handles this internally for
      // a much nicer keyboard experience.
      cordova.plugins.Keyboard.disableScroll(true);
    }

    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

.controller('CardsCtrl', function($scope, $http, $ionicSwipeCardDelegate) {
  $scope.cards = [];

  $scope.getSavedCards = function(){
    if(typeof(Storage) != "undefined") {
        var cardsString = localStorage.getItem("cards");
        if(cardsString === null){
          var cards = [];
        }
        else{
          var cards = JSON.parse(cardsString);
        }

        return cards;
    }

    return null;
  }

  $scope.loadSavedCards = function(){
    // Retrieve the saved cards from device
    var cards = $scope.getSavedCards();
    for(cardIndex in cards){
      $scope.displayCard(cards[cardIndex]);
    }
  }

  $scope.saveCard = function(card){
    // Save the card
    if(typeof(Storage) != "undefined") {
        var cards = $scope.getSavedCards();
        cards.unshift(angular.extend({}, card));
        localStorage.setItem("cards", JSON.stringify(cards));
    } else {
        alert("Sorry, your browser does not support Web Storage...");
    }
  }

  $scope.getCardFromServer = function(beaconId){
    beaconId = "1";
    var url = "http://localhost:5000/api/Content?locationId=" + beaconId;
    $http.get(url).success( function(response) {
      response.forEach(function(element) {
        var newCard = {id: Math.random(), htmlContent: element.content, title: element.contentShortDescription};
        $scope.displayCard(newCard);
      }, this);
    });
  }

  $scope.displayCard = function(card){
      $scope.cards.unshift(angular.extend({}, card));
  }

  $scope.addStubData = function(content, name){
      var newCard = {id: Math.random(), htmlContent: content, title: name};
      $scope.displayCard(newCard);
      $scope.saveCard(newCard);
  }

  $scope.getCardFromServer("1");
  //$scope.addStubData("<h3>Some ideas for your stand up!</h3><ul><li>1: Stand up</li><li>2: Use a ball!</li><li>3: Dance & Sing</li></ul>", "Some more save data");
  $scope.loadSavedCards();


  $scope.cardDestroyed = function(index) {
    $scope.cards.splice(index, 1);
  };
})

.controller('CardCtrl', function($scope, $ionicSwipeCardDelegate) {
  $scope.doAnything = function() {
    var card = $ionicSwipeCardDelegate.getSwipeableCard($scope);
    card.swipe();
  };
})