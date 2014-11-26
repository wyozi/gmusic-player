angular.module('gmusicPlayerApp', [
    'ngRoute',
    'audioPlayer-directive',
    'scrollToTopWhen-directive',
    'gmusicService'
])
    .config(['$routeProvider', function($routeProvider) {
        $routeProvider.
            when('/auth', {
                templateUrl: 'views/auth.html',
                controller: 'AuthCtrl'
            }).
            otherwise({
                templateUrl: 'views/player.html',
                controller: 'PlayerCtrl',
                reloadOnSearch: false
            });
    }])
    .run(function($rootScope, $location, GMusic) {
        $rootScope.$on('$routeChangeStart', function(event, next, current) {
            if (!GMusic.loggedIn && next.templateUrl != 'views/auth.html') {
                $rootScope.preAuthPath = $location.path();
                $location.path('/auth');
            }
        });
    });
