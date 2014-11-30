var querystring = require('querystring');

angular.module('audioPlayer-directive', [])
    .filter('minutesSeconds', function() {
        return function(seconds) {
            if (!seconds) {
                return '00:00';
            }
            var seconds = Math.round(+seconds);

            var minutes = Math.floor(seconds / 60);
            seconds = seconds - minutes*60;

            if (minutes < 10) { minutes = '0' + minutes; }
            if (seconds < 10) { seconds = '0' + seconds; }

            return minutes + ':' + seconds;
        }
    })
    .directive('audioPlayer', ['$rootScope', '$window', function($rootScope, $window) {
        return {
            restrict: 'E',
            scope: {},
            controller: function($scope, $element) {
                $scope.audio = new Audio();

                $scope.audio.volume = localStorage.volume || 1;
                $scope.volume = $scope.audio.volume;

                $scope.loopStates = [
                    {text: 'off'},
                    {text: 'all'},
                    {text: 'single'}
                ];
                $scope.loopState = 1;

                $scope.currentTime = 0;

                $scope.next = function(triggeredByEndEvent) {
                    if (triggeredByEndEvent && $scope.loopState == 2) {
                        // Repeat
                        $scope.audio.currentTime = 0;
                        $scope.audio.play();
                    }
                    else {
                        $rootScope.$broadcast('audio:next', triggeredByEndEvent, $scope.loopStates[$scope.loopState].text);
                    }
                };
                $scope.prev = function() {
                    $rootScope.$broadcast('audio:prev');
                };

                $scope.playpause = function() { var a = $scope.audio.paused ? $scope.audio.play() : $scope.audio.pause(); };

                $scope.cycleLoopState = function() {
                    $scope.loopState = ($scope.loopState+1) % $scope.loopStates.length;
                }

                $scope.updateCurrentTime = function() {
                    $scope.audio.currentTime = $scope.currentTime;
                }
                $scope.updateVolume = function() {
                    localStorage.volume = $scope.volume;
                    $scope.audio.volume = $scope.volume;
                }

                angular.element($window).on('keydown', function(e) {
                    if (e.keyCode == 32 && e.target == document.body) {
                        $scope.playpause();
                        $scope.$apply();

                        e.preventDefault();
                    }
                });

                $scope.audio.addEventListener('play', function(){ $rootScope.$broadcast('audio:play', this); });
                $scope.audio.addEventListener('pause', function(){ $rootScope.$broadcast('audio:pause', this); });
                $scope.audio.addEventListener('timeupdate', function(){ $rootScope.$broadcast('audio:time', this); });
                $scope.audio.addEventListener('ended', function(){
                    $rootScope.$broadcast('audio:ended', this);

                    console.debug("Song ended; moving to next track");
                    $scope.next(true);
                });

                $rootScope.$on('audio:set', function(event, data) {
                    var url = data.url;
                    var info = data.info;
                    var context = data.context;

                    $scope.audio.src = "http://localhost:" + (MusicStreamServerPort || 8080) + "/?" + querystring.stringify({
                        songId: info.id,
                        songUrl: new Buffer(url).toString('base64')
                    });
                    $scope.audio.play();

                    $scope.info = info;
                    $scope.context = context;

                    $rootScope.currentSong = data;
                    $scope.$apply();
                });

                $scope.audio.addEventListener('timeupdate', function() {
                    $scope.currentTime = $scope.audio.currentTime;
                    $scope.volume = $scope.audio.volume;

                    $scope.$apply();
                });

                $scope.audio.addEventListener('error', function() {
                    var err = $scope.audio.error;
                    //if (errid == 2) {
                        var src = $scope.audio.src;
                        var time = $scope.audio.currentTime;

                        $scope.audio.src = src + "&cachek=" + new Date().getTime();

                        var setTimeFunc = function() {
                            $scope.audio.currentTime = time;
                            $scope.audio.play();

                            console.log("Set currentTime to ", time, " (real : ", $scope.audio.currentTime, "; dur: ", $scope.audio.duration, ")");
                            $scope.audio.removeEventListener('canplay', setTimeFunc);
                        };
                        $scope.audio.addEventListener('canplay', setTimeFunc);

                        console.log("Reloading audio due to error: ", err);
                    //}
                })

                // Seekbar stuff

                function updateDraggedTime(e) {
                    var seekbar = $(e.srcElement).closest(".seekbar");
                    var frac = (e.pageX - seekbar.offset().left) / seekbar.width();
                    $scope.currentDraggedTime = frac * $scope.audio.duration;
                }

                $scope.seekBarMouseDown = function(e) {
                    updateDraggedTime(e);
                }
                $scope.seekBarResetDrag = function(e) {
                    if ($scope.currentDraggedTime) {
                        $scope.currentTime = $scope.currentDraggedTime;
                        $scope.updateCurrentTime();
                    }
                    $scope.currentDraggedTime = undefined;
                }
                $scope.seekBarDragged = function(e) {
                    if (e.which == 1 && $scope.currentDraggedTime) {
                        updateDraggedTime(e);
                    }
                }
                $scope.range = function(n) {
                    return Array.apply(null, Array(n)).map(function (_, i) {return i;});
                };
            },

            templateUrl: 'views/audioPlayerView.html'
        };
    }]);
