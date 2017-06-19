generateRatingsUrl = function (contentId, rating) {
    return "http://localhost:5000/api/Ratings?contentId=" + contentId + "&rating=" + rating;
}

generateGroupsUrl = function () {
    return "http://localhost:5000/api/Metadata?key=Teams";
}