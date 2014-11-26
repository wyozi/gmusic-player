
angular.module('gmusicPlayerApp')
    .controller('PlaylistsCtrl', ['$scope', '$rootScope', '$location', 'GMusic', function($scope, $rootScope, $location, GMusic) {
        $scope.playlists = [];

        $rootScope.$on('playlists:set', function(event, playlists) {
            $scope.playlists = playlists;

            $scope.$apply();
        })

        $scope.setPlaylistById = function(playlistId) {
            GMusic.getPlaylistSongs(playlistId, function(songs) {
                GMusic.getPlaylist(playlistId, function(pl) {
                    $rootScope.$broadcast('musicquery:setresults', {
                        query: 'songs in playlist "' + (pl ? pl.name : playlistId) + '"',

                        type: 'playlist',
                        playlistId: playlistId,
                        songs: songs
                    });
                });
            });
        }
        $scope.setPlaylist = function(playlist) {
            $scope.setPlaylistById(playlist.id);
        }

        $scope.songDropped = function(data, playlist) {
            GMusic.addSongToPlaylist(data, playlist.id);
        }

        $scope.$watch(function() {
            return $location.path();
        }, function() {
            var playlistRegex = /\/playlists\/([^ ]+)/;
            var match = $location.path().match(playlistRegex);

            if (match) {
                $scope.setPlaylistById(match[1]);
            }
        });

        // TODO move albums and artists watches somewhere else

        $scope.$watch(function() {
            return $location.path();
        }, function() {
            var albumRegex = /\/albums\/([^ ]+)/;
            var match = $location.path().match(albumRegex);

            if (match) {
                GMusic.getAlbum(match[1], function(data) {
                    $rootScope.$broadcast('musicquery:setresults', {
                        query: 'album "' + data.name + '"',

                        type: 'album',
                        songs: data.tracks
                    });
                });
            }
        });

        $scope.$watch(function() {
            return $location.path();
        }, function() {
            var artistRegex = /\/artists\/([^ ]+)/;
            var match = $location.path().match(artistRegex);

            if (match) {
                GMusic.getArtist(match[1], function(data) {
                    $rootScope.$broadcast('musicquery:setresults', {
                        query: 'artist "' + data.name + '"',

                        type: 'artist',
                        songs: data.tracks
                    });
                });
            }
        });

        /*$scope.$on('$locationChangeStart', function(event) {
            console.log("Location chagned: ", event);
        });*/
    }]);
