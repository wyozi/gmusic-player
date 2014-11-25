angular.module('gmusicPlayerApp')
    .controller('MusicQueryCtrl', ['$scope', '$rootScope', 'GMusic', '$timeout', '$location', function($scope, $rootScope, GMusic, $timeout, $location) {
        $scope.queries = [];
        $scope.results = [];

        $rootScope.$on('musicquery:setresults', function(event, query, results, shouldAppend) {
            $timeout(function() {
                if (!shouldAppend) {
                    $scope.queries = [];
                    $scope.results = [];
                }
                $scope.queries.push(query);
                $scope.results = $scope.results.concat(results);

                var playlistRef = $scope.results.slice();
                $scope.results.forEach(function(res) {
                    res.playlistRef = playlistRef;
                });

                $scope.$apply();

                $scope.$broadcast('music_query_updated');
            })
        });

        $scope.setCurrentSong = function(song) {
            GMusic.getStreamUrl(song.id, function(url) {
                $rootScope.$broadcast('audio:set', url, song);
            })
        }

        $scope.go = function(path) {
            $location.path(path);
        }

        $scope.moveInPlaylist = function(delta, dontLoopThrough) {
            var song = $rootScope.currentSong;
            if (!song) {
                return;
            }

            var plref = song.playlistRef;
            if (!plref) {
                return;
            }

            var thisIndex = plref.findIndex(function(s) {
                return s.id == song.id;
            })

            if (thisIndex != -1) {
                var nextIndex = (thisIndex+delta)%plref.length;
                if (dontLoopThrough && nextIndex != (thisIndex+delta)) {
                    return;
                }

                var nextSong = plref[nextIndex];

                GMusic.getStreamUrl(nextSong.id, function(url) {
                    $rootScope.$broadcast('audio:set', url, nextSong);
                })
            }
        }

        $rootScope.$on('audio:next', function(event, triggeredByEndEvent, loopStateText) {
            $scope.moveInPlaylist(+1, triggeredByEndEvent && loopStateText != "all");
        });
        $rootScope.$on('audio:prev', function() {
            $scope.moveInPlaylist(-1);
        });
    }]);
