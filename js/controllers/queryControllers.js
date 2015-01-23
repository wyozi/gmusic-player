var gui = require('nw.gui');


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

        $scope.$on('addSongMenuItems', function(event, song, menu) {
            menu.append(new gui.MenuItem({
                label: 'Playlist ' + $scope.playlistId,
                click: function() {
                    gui.Clipboard.get().set($scope.playlistId, 'text');
                    var notification = new Notification("Copied!", {body: "Playlist id has been copied to clipboard."});
                }
            }));

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
        });

        $scope.$parent.loading = true;
        GMusic.getPlaylistSongs(playlistId, function(songs) {
            $timeout(function() {
                $scope.$apply(function() {
                    $scope.songs = songs;
                    $scope.songContext = {songs: songs, path: '#/playlists/' + playlistId};

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

        $scope.showTopTrackCount = 0;

        $scope.hasMoreToShow = function() {
            if ($scope.allSongs == undefined) return false;

            return $scope.showTopTrackCount < $scope.allSongs.length;
        }
        $scope.showMore = function() {
            $scope.showTopTrackCount += 5;

            $timeout(function() {
                $scope.$apply(function() {
                    $scope.songs = $scope.allSongs.slice(0, $scope.showTopTrackCount);
                });
            });
        }

        if (artistId.indexOf('custom-') == 0) {
            GMusic._getCachedLibrary(function(lib) {
                $timeout(function() {
                    $scope.$apply(function() {
                        $scope.artist = {name: decodeURIComponent(artistId).substr(7)};
                        $scope.albums = [];

                        var tracks = _.chain(lib).filter(function(t) {
                            return t.artist == $scope.artist.name;
                        }).map(function(t) {
                            return GMusic._parseTrackObject(t, t.id);
                        }).sortBy(function(t) {
                            return -t.playCount; // make sort descending
                        }).value();

                        _.chain(tracks).groupBy('album').map(_.first).sortBy(function(t) {
                            return -t.year; // make sort descending
                        }).each(function(firstTrack) {
                            $scope.albums.push({
                                id: encodeURIComponent('custom-' + firstTrack.album),
                                name: firstTrack.album,
                                art: firstTrack.albumart,
                                year: firstTrack.year
                            });
                        });

                        $scope.showMore();

                        $scope.allSongs = tracks;
                        $scope.songContext = {songs: tracks, path: '#/artists/' + artistId};

                        $scope.$parent.loading = false;
                    });
                });
            });
        }
        else {
            GMusic.getArtist(artistId, function(artist) {
                $timeout(function() {
                    $scope.artist = artist;
                    $scope.albums = artist.albums;

                    $scope.allSongs = artist.topTracks;

                    $scope.showMore();

                    $scope.songContext = {songs: artist.topTracks, path: '#/artists/' + artistId};

                    $scope.$parent.loading = false;
                })
            });
        }
    }])
    .controller('QueryAlbumCtrl', ['$rootScope', '$scope', '$routeParams', '$timeout', '$route', 'GMusic', function($rootScope, $scope, $routeParams, $timeout, $route, GMusic) {
        var albumId = $routeParams.album;

        $scope.albumId = albumId;
        $scope.album = undefined;
        $scope.$parent.loading = true;

        if (albumId.indexOf('custom-') == 0) {
            GMusic._getCachedLibrary(function(lib) {
                $timeout(function() {
                    $scope.$apply(function() {
                        $scope.album = {name: decodeURIComponent(albumId).substr(7)};

                        var tracks = lib.filter(function(t) {
                            return t.album == $scope.album.name;
                        }).map(function(t) {
                            return GMusic._parseTrackObject(t, t.id);
                        });

                        $scope.songs = tracks;
                        $scope.songContext = {songs: tracks, path: '#/albums/' + albumId};

                        $scope.$parent.loading = false;
                    });
                });
            });
        }
        else {
            GMusic.getAlbum(albumId, function(album) {
                $timeout(function() {
                    $scope.$apply(function() {
                        $scope.album = album;
                        $scope.songs = album.tracks;
                        $scope.songContext = {songs: album.tracks, path: '#/albums/' + albumId};

                        $scope.$parent.loading = false;
                    });
                })
            });
        }
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
                    $scope.songContext = {songs: onlyTracks, path: '#/search/' + query};

                    $scope.$parent.loading = false;
                });
            });
        });
    }])
