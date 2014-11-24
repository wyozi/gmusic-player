angular.module('audioPlayer-directive', ['ngCookies'])
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
    .directive('audioPlayer', ['$rootScope', '$cookies', '$window', function($rootScope, $cookies, $window) {
        return {
            restrict: 'E',
            scope: {},
            controller: function($scope, $element) {
                $scope.audio = new Audio();

                $scope.audio.volume = $cookies.playervolume || 1;
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

                // tell audio element to play/pause, you can also use $scope.audio.play() or $scope.audio.pause();
                $scope.playpause = function() { var a = $scope.audio.paused ? $scope.audio.play() : $scope.audio.pause(); };

                $scope.cycleLoopState = function() {
                    $scope.loopState = ($scope.loopState+1) % $scope.loopStates.length;
                }

                $scope.updateCurrentTime = function() {
                    $scope.audio.currentTime = $scope.currentTime;
                }
                $scope.updateVolume = function() {
                    $cookies.playervolume = $scope.volume;
                    $scope.audio.volume = $scope.volume;
                }

                angular.element($window).on('keydown', function(e) {
                    if (e.keyCode == 32 && e.target == document.body) {
                        $scope.playpause();
                        e.preventDefault();
                    }
                });


                // listen for audio-element events, and broadcast stuff
                $scope.audio.addEventListener('play', function(){ $rootScope.$broadcast('audio:play', this); });
                $scope.audio.addEventListener('pause', function(){ $rootScope.$broadcast('audio:pause', this); });
                $scope.audio.addEventListener('timeupdate', function(){ $rootScope.$broadcast('audio:time', this); });
                $scope.audio.addEventListener('ended', function(){ $rootScope.$broadcast('audio:ended', this); $scope.next(true); });

                // set track & play it
                $rootScope.$on('audio:set', function(event, url, info) {
                    $scope.audio.src = url;
                    $scope.audio.play();

                    $scope.info = info;

                    $rootScope.currentSong = info;
                    $scope.$apply();
                });

                $scope.audio.addEventListener('timeupdate', function() {
                    $scope.currentTime = $scope.audio.currentTime;
                    $scope.volume = $scope.audio.volume;

                    $scope.$apply();
                });

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
