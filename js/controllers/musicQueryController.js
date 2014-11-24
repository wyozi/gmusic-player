// TODO get rid of this ugly polyfill
if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function(predicate) {
        if (this == null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return i;
            }
        }
        return -1;
    };
}

angular.module('gmusicPlayerApp')
    .controller('MusicQueryCtrl', ['$scope', '$rootScope', 'GMusic', function($scope, $rootScope, GMusic) {
        $scope.queries = [];
        $scope.results = [];

        $rootScope.$on('musicquery:setresults', function(event, query, results, shouldAppend) {
            if (!shouldAppend) {
                $scope.queries = [];
                $scope.results = [];
            }
            $scope.queries.push(query);
            $scope.results = $scope.results.concat(results);

            var playlistRef = $scope.results.slice();
            $scope.results.forEach(function(res) {
                res.playlistRef = playlistRef;
            })
        });

        $scope.setCurrentSong = function(song) {
            GMusic.getStreamUrl(song.id, function(url) {
                $rootScope.$broadcast('audio:set', url, song);
            })
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
