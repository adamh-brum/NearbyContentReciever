generateRatingsUrl = function (contentId, rating) {
    return generateUrl("Ratings?contentId=" + contentId + "&rating=" + rating);
}

generateGroupsUrl = function () {
    return generateUrl("Metadata?key=ContentTags");
}

generateGetContentUrl = function (locationId){
    return generateUrl("Schedule/ByLocation?locationId=" + locationId);
}

generateUrl = function (partialUrl){
    return "http://nearbycontentapi.azurewebsites.net/api/" + partialUrl;
}