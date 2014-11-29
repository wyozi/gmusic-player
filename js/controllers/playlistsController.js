
angular.module('gmusicPlayerApp')
    .controller('PlaylistsCtrl', ['$scope', '$rootScope', '$location', 'GMusic', function($scope, $rootScope, $location, GMusic) {
        $scope.playlists = [];

        GMusic.on('loggedIn', function() {
            GMusic.getPlaylists(function(playlists) {
                $scope.$apply(function() {
                    $scope.playlists = playlists.map(function(pl) {
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
    }]);
