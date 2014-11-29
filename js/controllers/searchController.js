angular.module('gmusicPlayerApp')
    .controller('SearchCtrl', ['$scope', '$rootScope', '$location', 'GMusic', function($scope, $rootScope, $location, GMusic) {
        $scope.search = function() {
            var query = $scope.query;
            $location.path('/search/' + query);

            // If you're interested in how search results are handled, see queryControllers.js
        }
    }]);
