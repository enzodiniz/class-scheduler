angular
	.module("class-scheduler")
	.controller("profCtrl", profCtrl)

function profCtrl ($scope, $firebaseArray, $mdDialog, $mdClassSchedulerToast) {
	var self = this;
	self.profs = [];
	self.fab = {
		isOpen: false,
    	direction: "left",
    	selectedMode: "md-fling"
	};

	self.initFirebase = function () {
		self.db = firebase.firestore();
		self.getRealtimeUpdates();
	}

	self.getRealtimeUpdates =  function () {
		self.db.collection("professores").onSnapshot(function (querySnapshot) {
			$scope.$apply(function () {
				self.profs = [];
				querySnapshot.forEach(function (doc) {
					let data = doc.data();
					self.profs.push({
						id: doc.id,
						nome: data.nome,
						sobrenome: data.sobrenome,
						email: data.email,
						isAdmin: data.isAdmin
					});
				});			
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

  	self.editarProfessor = function (prof, ev) {
  		$mdDialog.show({
		    templateUrl: 'app/routes/edit-prof.tmpl.html',
		    clickOutsideToClose: true,
		    parent: angular.element(document.body),
		    targetEvent: ev,
		    fullscreen: $scope.customFullscreen,
		    locals: { prof: prof }, 
		    controller: ['$scope', '$mdClassSchedulerToast', 'prof', 
		    	function ($scope, $mdClassSchedulerToast, prof) {
		    		$scope.nome = prof.nome;
		    		$scope.sobrenome = prof.sobrenome;
		    		$scope.email = prof.email;

		    		$scope.salvar = function () {
		    			if ($scope.isAdmin == "true") 
		    				$scope.isAdm = true;
		    			else
		    				$scope.isAdm = false;
		    			let profRef = self.db.doc("professores/" + prof.id);

		    			profRef.update({
		    				nome: $scope.nome || prof.nome,
		    				sobrenome: $scope.sobrenome || prof.sobrenome,
		    				email: $scope.email || prof.email,
		    				isAdmin: $scope.isAdm
		    			}).then(function () {
		    				$mdClassSchedulerToast.show("O professor foi modificado");
		    				$scope.hide();
		    			}).catch(function (error) {
		    				console.log("Ocorreu um erro: ", error);
		    			});
		    		}

		    		$scope.cancel = function () {
		    			$mdDialog.cancel();
		    		}

		    		$scope.hide = function () {
		    			$mdDialog.hide();
		    		}

		    		if (prof.isAdmin) {
		    			$scope.isAdmin = "true";
		    		} else {
		    			$scope.isAdmin = "false";
		    		}
		    	}]
		}).then(function (answer) {
	      console.log("answer", answer);
	    }, function () {
	      console.log("cancelled dialog");
	    });
  	}

  	self.excluirProfessor = function (id) {
  		let profRef = self.db.doc("professores/" + id);

  		profRef.delete().then(function () {
  			$mdClassSchedulerToast.show("O professor foi removido");
  		}).catch(function (error) {
  			console.log("Ocorreu um erro: ", error);
  		});
  	}

  	self.openMenu = function (id) {
  		if (self.fab.isOpen) {
	      	self.fab.direction = "left";

	      	let btO = document.getElementById(id + "btO");
	      	btO.style.removeProperty("opacity");

	      	let btE = document.getElementById(id + "btE");
	      	btE.style.removeProperty("opacity");

	      	let btX = document.getElementById(id + "btX");
	      	btX.style.removeProperty("opacity");

	      	let listItem = document.getElementById(id + "item");
	      	listItem.style.removeProperty("font-size");
	      	listItem.style.removeProperty("background-color");

	    } else {
	      self.id = id;
	      self.fab.direction = "bottom";

	      let btO = document.getElementById(id + "btO");
	      btO.style.opacity = "1";

	      let btE = document.getElementById(id + "btE");
	      btE.style.opacity = "1";

	      let btX = document.getElementById(id + "btX");
	      btX.style.opacity = "1";

	      let listItem = document.getElementById(id + "item");
	      listItem.style.fontSize = "16px";
	      listItem.style.backgroundColor = "rgb(211, 217, 226)";
	    }
  	}

  	window.onclick = function () {
    	if (self.fab.isOpen && self.id != "") {
      		self.openMenu(self.id);
    	}
  	}
  	
	self.initFirebase();
}