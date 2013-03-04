var currentUser = null;

var App = function() {
  this.Config = {
    FirebaseURL : "https://steampunk.firebaseIO.com"
  };
  
  //this.currentUser = null;
  //var checkinsRef = new Firebase("https://steampunk.firebaseIO.com/users/685681169/checkins");
  //var checkinsQuery = checkinsRef.startAt(10151347716696170);
  //checkinsQuery.on('child_added', function(childSnapshot) { /* handle child add */ });
};

App.prototype = {
  init: function(currentUserId) {
    var that = this;
    this.Config.usersRef       = new Firebase(App.Config.FirebaseURL + '/users');
    this.Config.currentUserRef = new Firebase(App.Config.FirebaseURL + '/users' + '/' + currentUserId);
    this.Config.currentUserRef.on('value', function(snapshot) {
      currentUser = snapshot.val();
      that.renderUI(currentUserId);
      that.renderBookmarks(currentUser.bookmarks);
      that.renderMap();
    });
    
    this.Config.bookmarksRef = new Firebase(App.Config.FirebaseURL + '/users' + '/' + currentUserId + '/bookmarks');
  },
  
  renderUI : function(currentUserId) {
    $('#map-ui').removeClass('hidden');
    $('#me_btn').attr('user-id', currentUserId);
    
    var that = this;
    $(document).on("click", '.marker-title .save_btn', function(){
      var markerTooltip = $(this).parents('.marker-tooltip');
      var markerTitle   = markerTooltip.find('.marker-title');
      var checkinId     = markerTitle.attr('checkin-id');
      console.log('Save '+markerTitle.text());
      console.log(checkinId);
      
      var checkin = that.findCheckin(checkinId);
      if (checkin !== null) {
        var checkinId = parseFloat(checkinId);
        var bookmarksRef = new Firebase("https://steampunk.firebaseIO.com/users/"+currentUserId+"/bookmarks");
        var bookmarksQuery = bookmarksRef.startAt(checkinId).endAt(checkinId);
        bookmarksQuery.on('value', function(snapshot) {
          if (snapshot.val() === null) {
            var newBookmarkRef = App.Config.bookmarksRef.push();
            newBookmarkRef.setWithPriority(checkin, checkinId);
          }
        });
      }
      return false;
    });
  },
  
  removeBookmark : function(bookmarkId) {
    var currentUserId = currentUser.fb_info.id;
    var bookmarkRef   = new Firebase("https://steampunk.firebaseIO.com/users/"+currentUserId+"/bookmarks/"+bookmarkId);
    bookmarkRef.remove();
  },
  
  fetchAndRenderBookmarks : function(userId) {
    var that = this;
    var bookmarksRef = new Firebase("https://steampunk.firebaseIO.com/users/"+userId+"/bookmarks");
    var bookmarksQuery = bookmarksRef.limit(10);
    bookmarksQuery.on('value', function(snapshot) {
      var bookmarks = snapshot.val();
      that.renderBookmarks(bookmarks);
    });
  },
  
  renderBookmarks : function(bookmarks) {
    var bookmarksElem = $('#bookmarks');
    bookmarksElem.empty();
    for (bookmarkId in bookmarks) {
      var bookmark = bookmarks[bookmarkId];
      bookmarksElem.prepend('<div class="bookmark" bookmark-id="'+bookmarkId+'">'+bookmark.place.name+'<a class="remove_btn" href="#">remove</a></div>');
    }
    
    var that = this;
    $('.remove_btn').click(function(e){
      e.preventDefault();
      
      var btn          = $(this);
      var bookmarkElem = btn.parents('.bookmark');
      var bookmarkId   = bookmarkElem.attr('bookmark-id');
      that.removeBookmark(bookmarkId);
      bookmarkElem.remove();
    });
  },
  
  findCheckin : function(checkinId) {
    var targetCheckin = null;
    $.each(currentUser.checkins, function(index, checkin) {
      if (checkin.id === checkinId.toString()) {
        targetCheckin = checkin;
        return false;
      }
    });
    return targetCheckin;
  },
  
  renderMap : function() {
    var map = mapbox.map('map');
    map.addLayer(mapbox.layer().id('chawei.map-85tzbb2w'));
    
    var markerLayer = mapbox.markers.layer();
    var interaction = mapbox.markers.interaction(markerLayer);
    map.addLayer(markerLayer);
    
    interaction.formatter(function(feature) {
      var o = ['<div class="marker-title" checkin-id="', feature.properties["checkin-id"], '">',
                  feature.properties.title,
                  '<a class="save_btn" href="#">save</a>',
                '</div>',
                '<div class="marker-description">',
                  feature.properties.description,
                '</div>'].join('');
      return o;
    });

    map.zoom(10).center({ lat: 37.626, lon: -122.397 });
    
    this.importCheckIns(markerLayer, currentUser.checkins, currentUser.fb_info.id);
    //this.importCheckIns(markerLayer, CHECK_INS['jackie'].checkins.data, CHECK_INS['jackie'].checkins.id);
    //this.importCheckIns(markerLayer, CHECK_INS['wei'].checkins.data, CHECK_INS['wei'].checkins.id);

    $('.filter').click(function(e){
      e.preventDefault();
      
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
  },
  
  importCheckIns : function(markerLayer, checkins, userId) {
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
          'checkin-id': checkin.id,
          title: checkin.place.name,
          description: description
        }
      }
      markerLayer.add_feature(feature);
    }
  },
  
  refreshCheckins : function() {
    
  }
};

var App = new App();

var User = function(user) {
  this.facebookId = user.id;
  this.fullName   = user.name;
  this.firstName  = user.first_name;
  this.fbInfo     = user;
  this.checkins   = null;
};

$(document).ready(function() {
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
          var currentUserRef = App.Config.usersRef.child(currentUser.facebookId);
          currentUserRef.child('fb_info').set(response);
       
          FB.api('/me/checkins?fields=from,message,place,coordinates,created_time&limit=30', function(response) {
            currentUser.checkins = response.data;
            currentUserRef.child('checkins').set(currentUser.checkins);
          });
        });
      } else {
        console.log('User cancelled login or did not fully authorize.');
      }
    }, {scope: 'email,user_status'});
    
    return false;
  });

});