// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('contentReceiver', ['ionic', 'ionic.contrib.ui.cards'])

  .run(function ($ionicPlatform, $rootScope, $http) {
    $ionicPlatform.ready(function () {
      if (window.cordova && window.cordova.plugins) {
        if (window.cordova.plugins.Keyboard) {
          console.log("Updating keyboard settings (Hide keyboard, disable scroll)")

          // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
          // for form inputs)
          cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

          // Don't remove this line unless you know what you are doing. It stops the viewport
          // from snapping when text inputs are focused. Ionic handles this internally for
          // a much nicer keyboard experience.
          cordova.plugins.Keyboard.disableScroll(true);
        }

        if (window.cordova.plugins.notification) {
          console.log("Requesting notification permission");
          window.cordova.plugins.notification.local.promptForPermission();
        }

        if (window.cordova.plugins.locationManager) {
          console.log("Requesting Location Permission");
          cordova.plugins.locationManager.requestAlwaysAuthorization();
        }
      }

      if (window.StatusBar) {
        StatusBar.styleDefault();
      }
    });
  })

  .controller('CardsCtrl', function ($ionicPlatform, $scope, $http) {
    $scope.cards = [];
    $scope.settingsClass = "invisible";
    $scope.messagesClass = "visible";
    $scope.groups = [];

    var emptyThumbsDown = "fa fa-3x fa-thumbs-o-down";
    var thumbsDown = "fa fa-3x fa-thumbs-down";
    var emptyThumbsUp = "fa fa-3x fa-thumbs-o-up";
    var thumbsUp = "fa fa-3x fa-thumbs-up";

    // Start ranging for beacons
    $ionicPlatform.ready(function () {
      var delegate = new window.cordova.plugins.locationManager.Delegate();

      // delegate.didDetermineStateForRegion = function (pluginResult) {
      //   console.log("Determined state for a beacon. Details: " + JSON.stringify(pluginResult));

      //   // if we are inside the beacon region, go grab content
      //   if (pluginResult.state && pluginResult.state === "CLRegionStateInside") {
      //     console.log("Inside region for beacon: " + pluginResult.region.uuid);

      //     // Refresh the groups
      //     $scope.addUrlToQueue(urlType_GetGroups, generateGroupsUrl());

      //     // Get the content
      //     $scope.addUrlToQueue(urlType_GetMessage, generateGetContentUrl(pluginResult.region.uuid));
      //   }
      // };

      delegate.didRangeBeaconsInRegion = function (pluginResult) {
        pluginResult.beacons.forEach(function (beacon) {
          if (beacon.proximity != undefined && beacon.proximity != "ProximityUnknown") {
            var uuid = beacon.uuid;

            console.log("Inside region for beacon: " + uuid);

            // Refresh the groups
            $scope.addUrlToQueue(urlType_GetGroups, generateGroupsUrl());

            // Get the content
            $scope.addUrlToQueue(urlType_GetMessage, generateGetContentUrl(uuid));
          }
        });
      }

      // delegate.didStartMonitoringForRegion = function (pluginResult) {
      // };

      cordova.plugins.locationManager.setDelegate(delegate);

      var url = "http://nearbycontentapi.azurewebsites.net/api/Beacon";
      $http.get(url).success(function (response) {
        response.forEach(function (element) {
          var id = element.beaconId;
          var uuid = element.uuid;

          $scope.monitorBeaconRegion(id, uuid);
        }, this);
      });
    });

    $scope.monitorBeaconRegion = function (id, uuid) {
      try {
        var region = new cordova.plugins.locationManager.BeaconRegion(id, uuid);
      }
      catch (ex) {
        console.log("An error occured while creating a beacon region: " + JSON.stringify(ex));
        console.log("Error message:" + ex.message);
      }

      cordova.plugins.locationManager.startMonitoringForRegion(region)
        .fail(console.error)
        .done();

      cordova.plugins.locationManager.startRangingBeaconsInRegion(region)
        .fail(console.error)
        .done();
    }

    $scope.clickGroup = function (groupName) {
      $scope.groups.forEach(function (group) {
        if (groupName === group.name) {
          if (group.class === "fa fa-check-circle") {
            group.class = "fa fa-check-circle-o";
          }
          else {
            group.class = "fa fa-check-circle";
          }
        }
      });

      // save changes
      writeCachedGroups($scope.groups);
    }

    $scope.openMessages = function () {
      $scope.messagesClass = "visible";
      $scope.settingsClass = "invisible";
    }

    $scope.openSettings = function () {
      $scope.settingsClass = "visible";
      $scope.messagesClass = "invisible";
    }

    /*
      Adds a card to the UI
    */
    $scope.displayCard = function (card) {
      $scope.cards.unshift(angular.extend({}, card));
    }

    /*
      Displays a notification 
    */
    $scope.notify = function (notification) {
      console.log(notification);
    }

    /*
      Adds groups from the API to the UI
    */
    $scope.addGroups = function (groups) {
      groups.forEach(function (group) {
        var exists = false;
        $scope.groups.forEach(function (existingGroup) {
          if (existingGroup.name === group) {
            exists = true;
          }
        });

        if (!exists) {
          $scope.groups.push({ name: group, class: "fa fa-check-circle" });
        }
      });
    }

    /*
      Adds cards from a raw state from the API to the UI and cache
    */
    $scope.addCards = function (response) {
      // Convert new cards to view models 
      var newCards = [];
      response.forEach(function (content) {
        // check if user is subscribed to any of the tags, otherwise skip
        var displayCard = false;
        if (content.tags != undefined && content.tags != null && content.tags.length > 0) {
          content.tags.forEach(function (messageTag) {
            $scope.groups.forEach(function (knownTag) {
              // If tag is known and subscribed, get the message
              if (knownTag.name === messageTag && knownTag.class == "fa fa-check-circle") {
                displayCard = true;
              }
            });
          });
        }
        else {
          displayCard = true;
        }

        if (displayCard) {
          newCards.push({
            id: content.id,
            htmlContent:
            content.content,
            title: content.contentShortDescription,
            dateTime: content.requestDateTime,
            location: content.location,
            tags: content.tags,
            thumbUpClass: emptyThumbsUp,
            thumbDownClass: emptyThumbsDown
          })
        }
      });

      // Check if we already have this content, and if we should update it.
      var cards = readCachedCards();
      newCards.forEach(function (newCard) {
        var card = null;
        cards.forEach(function (existingCard) {
          if (existingCard.id === newCard.id) {
            card = newCard;
          }
        });

        if (card != null) {
          // As the card already exists, it may be on the UI already
          var displayedCard = $scope.getCardById(card.id);
          if (displayedCard) {
            // If it is different to the UI version, update it and send a notification if it has changed (Otherwise do nothing)
            if (displayedCard.htmlContent != card.htmlContent) {
              $scope.notify(card.title);

              displayedCard.htmlContent = card.htmlContent;
            }
          }
          else {
            // Card not yet on UI, so just reload it (NO notification, as the user will have already been notified)
            $scope.displayCard(newCard);
          }
        }
        else {
          $scope.notify(newCard.title);
          $scope.displayCard(newCard);
        }
      });

      updateCards($scope.cards);
    }

    /*
      Down rates the card, submitting a rating to the server and updating thumbs down class
    */
    $scope.downRateCard = function (id) {
      var card = $scope.getCardById(id);

      // Also, if card is uprated, down rate
      if (card.thumbUpClass == thumbsUp) {
        $scope.upRateCard(id);
      }

      var rating = 0;
      if (card.thumbDownClass == emptyThumbsDown) {
        rating = -1;
        card.thumbDownClass = thumbsDown;
      }
      else {
        rating = 1;
        card.thumbDownClass = emptyThumbsDown;
      }

      var url = generateRatingsUrl(id, rating);
      $scope.addUrlToQueue(urlType_Rating, url);
    }

    /*
      Up rates the card, submitting a rating to the server and updating thumbs up class
    */
    $scope.upRateCard = function (id) {
      var card = $scope.getCardById(id);

      // Also, if card is downrated, up rate
      if (card.thumbDownClass == thumbsDown) {
        $scope.downRateCard(id);
      }

      var url = generateRatingsUrl(id, rating);
      var rating = 0;
      if (card.thumbUpClass == emptyThumbsUp) {
        rating = 1;
        card.thumbUpClass = thumbsUp;
      }
      else if (card.thumbUpClass == thumbsUp) {
        rating = -1; // downrate
        card.thumbUpClass = emptyThumbsUp;
      }

      var url = generateRatingsUrl(id, rating);
      $scope.addUrlToQueue(urlType_Rating, url);
    }

    /*
      Adds a URL to the queue, and attempts to process it
    */
    $scope.addUrlToQueue = function (urlType, url) {
      console.log("Adding an item to the URL queue. Type = " + urlType + " and URL = " + url);

      // Clean up the URL queue by removing URL's that were processed over five minutes ago
      cleanUrlQueue();

      // Add the item to the queue, if it does not already exist
      var exists = false;
      urlQueue.forEach(function (urlItem) {
        if (urlItem.url === url) {
          exists = true;
        }
      });

      // Only update the queue (both in memory and on file) and try to process the queue if the URL does not already exist.
      if (!exists) {
        urlQueue.push({ urlType: urlType, url: url });
        writeCachedUrlQueue(urlQueue);
        $scope.processUrlQueue();
      }
    }


    /*
      Gets a card from teh UI by ID
    */
    $scope.getCardById = function (contentId) {
      var card = null;
      $scope.cards.forEach(function (possibleCard) {
        if (possibleCard.id == contentId) {
          card = possibleCard;
        }
      });

      return card;
    }

    /*
      Processes the URL queue, iterating through each item and attempting to post it to the server
    */
    $scope.processUrlQueue = function () {
      // Before we process it, make sure only items that need processing are on the queue in the first place
      cleanUrlQueue();

      // Now, go crazy and process each remaining URL in the queue.
      readCachedUrlQueue().forEach(function (urlQueueItem) {
        console.log("Processing URL queue item. Type = " + urlQueueItem.urlType + " and URL = " + urlQueueItem.url);

        if (urlQueueItem.urlType === urlType_Rating) {
          $scope.submitRating(urlQueueItem.url);
        }
        else if (urlQueueItem.urlType === urlType_GetGroups) {
          $scope.getGroups(urlQueueItem.url);
        }
        else if (urlQueueItem.urlType === urlType_GetMessage) {
          $scope.getCards(urlQueueItem.url)
        }
      });
    }

    /*
      Gets all the groups from the server
      If success, removes the URL from the queue
      If error, leaves it on the queue so it will be posted again in future
    */
    $scope.getGroups = function (url) {
      $http.get(url).success(function (response) {
        $scope.addGroups(response);

        completeUrlQueueItem(url);
      });
    }

    /*
      Submits a rating to the server
      If success, removes the URL from the queue
      If error, leaves it on the queue so it will be posted again in future
    */
    $scope.submitRating = function (url) {
      $http.post(url)
        .success(function (response) {
          completeUrlQueueItem(url);
        })
        .error(function (response) {
        });;
    }

    /*
      Gets the cards from the server
      If success, removes the URL from the queue
      If error, leaves it on the queue so it will be posted again in future
    */
    $scope.getCards = function (url) {
      $http.get(url).success(function (response) {
        if (response != "") {
          console.log("Retrieved cards from URL: " + JSON.stringify(response));
          $scope.addCards(response);
        }

        // Remove URL from cache
        completeUrlQueueItem(url);
      });
    }

    $scope.updateGroups = function () {
      var groupsUrl = generateGroupsUrl();
      $scope.addUrlToQueue(urlType_GetGroups, groupsUrl);
    }

    // Add some stub data
    // $scope.getCardFromServer("84addf9c-649f-11e7-907b-a6006ad3dba0");
    $scope.cardDestroyed = function (index) {
      $scope.cards.splice(index, 1);
    };

    // Update the groups, which will also process the URL queue
    $scope.updateGroups();
  })

  .controller('CardCtrl', function ($scope, $ionicSwipeCardDelegate) {
    $scope.doAnything = function () {
      var card = $ionicSwipeCardDelegate.getSwipeableCard($scope);
      card.swipe();
    };
  })