angular.module('gmusicPlayerApp', [
    'ngRoute',
    'ang-drag-drop',
    'nw-menu-directive',
    'audioPlayer-directive',
    'scrollToTopWhen-directive',
    'gmusicService'
])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider
            .when('/playlists/:playlist', {
                controller: 'QueryPlaylistCtrl',
                templateUrl: 'views/musicQueryPlaylist.html'
            })
            .when('/artists/:artist', {
                controller: 'QueryArtistCtrl',
                templateUrl: 'views/musicQueryArtist.html'
            })
            .when('/albums/:album', {
                controller: 'QueryAlbumCtrl',
                templateUrl: 'views/musicQueryAlbum.html'
            })
            .when('/search/:query', {
                controller: 'QuerySearchCtrl',
                templateUrl: 'views/musicQuerySearch.html'
            })
            .when('/auth', {
            })
            .when('/', {
            }).
            otherwise({
                redirectTo: '/'
            });
    }])
    .run(function($rootScope, $location, GMusic) {
        $rootScope.$on('$routeChangeStart', function(event, next, current) {
            if (!GMusic.loggedIn && next.$$route.originalPath != '/auth') {
                $rootScope.preAuthPath = $location.path();
                $location.path('/auth');
            }
        });
    });
