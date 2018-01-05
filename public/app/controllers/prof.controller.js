angular
	.module("class-scheduler")
	.controller("profCtrl", profCtrl)

function profCtrl ($scope, $firebaseArray, $mdDialog) {
	var self = this;
	self.profs = [];
	self.fab = {
		isOpen: false,
    	direction: "left",
    	selectedMode: "md-fling"
	}

	self.initFirebase = function () {
		self.db = firebase.firestore();
		self.getRealtimeUpdates();
	}

	self.getRealtimeUpdates =  function () {
		self.db.collection("professores").onSnapshot(function (querySnapshot) {
			let teachers = [];
			querySnapshot.forEach(function (doc) {
				teachers.push(doc);
			});
			$scope.$apply(function () {
				self.profs = teachers;		
			});
		});
	}

  	self.salvarProf = function (ev) {
  		$mdDialog.show({
	    templateUrl: 'app/routes/add-prof.tmpl.html',
	    clickOutsideToClose: true,
	    parent: angular.element(document.body),
	    targetEvent: ev,
	    fullscreen: $scope.customFullscreen,
	    controller: ['$scope', '$mdClassSchedulerToast',
	      function ($scope, $mdClassSchedulerToast) {

	      	$scope.isAdmin = "false";
	      	
	        $scope.salvarProf = function () {
	        	if ($scope.isAdmin == "true") {
	        		$scope.isAdm = true;
	        	} else {
	        		$scope.isAdm = false;
	        	}
				self.db.collection("professores").add({
					nome: $scope.nome,
				  	sobrenome: $scope.sobrenome,
				  	isAdmin: $scope.isAdm,
				  	email: $scope.email
				}).then(function (docRef) {
				  	$mdClassSchedulerToast.show("Um novo professor foi salvo");
				  	$scope.hide();
				}).catch(function (error) {
					console.log("Ocorreu um erro ao salvar professor: ", error);
				});
	        }

	        $scope.hide = function () {
	        	$mdDialog.hide();
	        }

	        $scope.cancel = function () {
	          $mdDialog.cancel();
	        }
	      }]
	    }).then(function (answer) {
	      console.log("answer", answer);
	    }, function () {
	      console.log("cancelled dialog");
	    })
  	}

	self.initFirebase();
}