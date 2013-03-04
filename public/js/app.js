var User = function(user) {
  this.facebookId = user.id;
  this.fullName   = user.name;
  this.firstName  = user.first_name;
  this.fbInfo     = user;
  this.checkins   = null;
};

var currentUser = null;

$(document).ready(function() {
  var rootRef  = new Firebase('https://steampunk.firebaseIO.com/');
  var usersRef = new Firebase('https://steampunk.firebaseIO.com/users');
  
  /*
  window.authClient = new FirebaseAuthClient(rootRef, function(error, user) {
    if (error) {
      // an error occurred while attempting login
      console.log(error);
    } else if (user) {
      // user authenticated with Firebase
      console.log('User ID: ' + user.id + ', Provider: ' + user.provider);
      
    } else {
      // user is logged out
    }
  });
  */
  
  $('#fb_login').click(function(){
    FB.login(function(response) {
       if (response.authResponse) {
         console.log('Welcome!  Fetching your information.... ');
         FB.api('/me', function(response) {
           console.log('Good to see you, ' + response.name + '.');
           console.log(response);
           currentUser = new User(response);
           var currentUserRef = usersRef.child(currentUser.facebookId);
           currentUserRef.child('fb_info').set(response);
           
           FB.api('/me/checkins?fields=from,message,place,coordinates,created_time&limit=30', function(response) {
             currentUser.checkins = response.data;
             currentUserRef.child('checkins').set(currentUser.checkins);
           });
         });
       } else {
         console.log('User cancelled login or did not fully authorize.');
       }
     });
  });

  
  function importCheckIns(markerLayer, checkins, userId) {
    for (var i=0; i < checkins.length; i++) {
      var checkin = checkins[i];
      var description = checkin.place.location.city + ', ' + checkin.place.location.country;
      var feature = {
        geometry: {
          coordinates: [checkin.coordinates.longitude, checkin.coordinates.latitude]
        },
        properties: {
          //'marker-color': '#000',
          //'marker-symbol': 'star-stroked',
          'user-id': userId,
          'image': 'https://graph.facebook.com/'+userId+'/picture',
          title: checkin.place.name,
          description: description
        }
      }
      markerLayer.add_feature(feature);
    }
  }

  var map = mapbox.map('map');
  map.addLayer(mapbox.layer().id('chawei.map-85tzbb2w'));

  // Create an empty markers layer
  var markerLayer = mapbox.markers.layer();

  // Add interaction to this marker layer. This
  // binds tooltips to each marker that has title
  // and description defined.
  mapbox.markers.interaction(markerLayer);
  map.addLayer(markerLayer);

  map.zoom(10).center({ lat: 37.626, lon: -122.397 });

  importCheckIns(markerLayer, CHECK_INS['david'].checkins.data, CHECK_INS['david'].checkins.id);
  importCheckIns(markerLayer, CHECK_INS['jackie'].checkins.data, CHECK_INS['jackie'].checkins.id);
  importCheckIns(markerLayer, CHECK_INS['wei'].checkins.data, CHECK_INS['wei'].checkins.id);
  
  $('.filter').click(function(){
    var thisElem = $(this);
    var userId   = thisElem.attr('user-id');
    if (thisElem.hasClass('active')) {
      thisElem.removeClass('active');
    } else {
      thisElem.addClass('active');
    } 
    
    var activeUserIds = [];
    $.each($('#friend_filter .active'), function(index, item) {
      activeUserIds.push($(item).attr('user-id'));
    });
    markerLayer.filter(function(f) {
      return ($.inArray(f.properties['user-id'], activeUserIds) !== -1);
    }); 
    return false;
  });
        
  markerLayer.factory(function(f) {
      // Define a new factory function. This takes a GeoJSON object
      // as its input and returns an element - in this case an image -
      // that represents the point.
          var img = document.createElement('img');
          img.className = 'marker-image';
          img.setAttribute('src', f.properties.image);
          return img;
      });
  
  map.ui.zoomer.add();
  map.ui.zoombox.add();
  
  // Attribute map
  map.ui.attribution.add()
      .content('<a href="http://mapbox.com/about/maps">Terms &amp; Feedback</a>');
});