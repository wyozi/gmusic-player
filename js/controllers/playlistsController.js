
angular.module('gmusicPlayerApp')
    .controller('PlaylistsCtrl', ['$scope', '$rootScope', '$route', '$timeout', '$location', 'GMusic', function($scope, $rootScope, $route, $timeout, $location, GMusic) {
        $scope.playlists = [];

        GMusic.on('loggedIn', function() {
            GMusic.getPlaylists(function(playlists) {
                $scope.$apply(function() {
                    $scope.playlists = _(playlists).map(function(pl) {
                        return {name: pl.name, id: pl.id};
                    });
                })
            });
        });

        $scope.setPlaylistById = function(playlistId) {
            $location.path('/playlists/' + playlistId);
        }
        $scope.setPlaylist = function(playlist) {
            $scope.setPlaylistById(playlist.id);
        }

        $scope.songDropped = function(data, playlist) {
            GMusic.addSongToPlaylist(data, playlist.id);
        }

        $rootScope.$on("$routeChangeSuccess", function() {
            $timeout(function() {
                $scope.$apply(function() {
                    var newPlId = $route.current.controller == "QueryPlaylistCtrl" ? $route.current.locals.$scope.playlistId : undefined;
                    $scope.activePlaylistId = newPlId;
                });
            });
        });

    }]);
