
angular.module('gmusicPlayerApp')
    .controller('QueryPlaylistCtrl', ['$rootScope', '$scope', '$routeParams', '$timeout', '$route', 'GMusic', function($rootScope, $scope, $routeParams, $timeout, $route, GMusic) {
        var playlistId = $routeParams.playlist;

        $scope.playlistId = playlistId;
        $scope.playlist = undefined;
        GMusic.getPlaylist(playlistId, function(pl) {
            $timeout(function() {
                $scope.$apply(function() {
                    $scope.playlist = pl;
                });
            })
        });

        $scope.openSongMenu = function(song, menu) {
            menu.append(new gui.MenuItem({ label: 'Song ' + song.id }));

            menu.append(new gui.MenuItem({ label: 'Playlist ' + $scope.playlistId }));
            menu.append(new gui.MenuItem({ type: 'separator' }));
            menu.append(new gui.MenuItem({
                label: 'Remove from playlist',
                click: function() {
                    GMusic.removeSongFromPlaylist(song.id, $scope.playlistId, function(wasRemoved) {

                        if (wasRemoved) {
                            // Refresh the route; which refreshes the playlist and doesnt show the removed song anymore
                            $timeout(function() {
                                $route.reload();
                            });
                        }
                    });
                }
            }));
        }

        $scope.$parent.loading = true;
        GMusic.getPlaylistSongs(playlistId, function(songs) {
            $timeout(function() {
                $scope.$apply(function() {
                    $scope.songs = songs;
                    $scope.songContext = {songs: songs};

                    $scope.$parent.loading = false;
                });
            });
        });
    }])
    .controller('QueryArtistCtrl', ['$rootScope', '$scope', '$routeParams', '$timeout', '$route', 'GMusic', function($rootScope, $scope, $routeParams, $timeout, $route, GMusic) {
        var artistId = $routeParams.artist;

        $scope.artistId = artistId;
        $scope.artist = undefined;
        $scope.$parent.loading = true;

        GMusic.getArtist(artistId, function(artist) {
            $timeout(function() {
                $scope.$apply(function() {
                    $scope.artist = artist;
                    $scope.songs = artist.tracks;
                    $scope.songContext = {songs: artist.tracks};

                    $scope.$parent.loading = false;
                });
            })
        });
    }])
    .controller('QueryAlbumCtrl', ['$rootScope', '$scope', '$routeParams', '$timeout', '$route', 'GMusic', function($rootScope, $scope, $routeParams, $timeout, $route, GMusic) {
        var albumId = $routeParams.album;

        $scope.albumId = albumId;
        $scope.album = undefined;
        $scope.$parent.loading = true;

        GMusic.getAlbum(albumId, function(album) {
            $timeout(function() {
                $scope.$apply(function() {
                    $scope.album = album;
                    $scope.songs = album.tracks;
                    $scope.songContext = {songs: album.tracks};

                    $scope.$parent.loading = false;
                });
            })
        });
    }])
    .controller('QuerySearchCtrl', ['$rootScope', '$scope', '$routeParams', '$timeout', '$route', 'GMusic', function($rootScope, $scope, $routeParams, $timeout, $route, GMusic) {
        var query = $routeParams.query;

        $scope.query = query;

        $scope.$parent.loading = true;

        GMusic.search(query, function(results) {
            var onlyTracks = results.filter(function(obj) {
                return obj.type == "track";
            }).map(function(obj) {
                return obj.track;
            });

            $timeout(function() {
                $scope.$apply(function() {
                    $scope.songs = onlyTracks;
                    $scope.songContext = {songs: onlyTracks};

                    $scope.$parent.loading = false;
                });
            });
        });
    }])
