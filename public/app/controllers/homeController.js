angular
  .module('class-scheduler')
  .controller('homeCtrl', homeCtrl)

function homeCtrl ($scope, $location, $firebaseArray, $mdDialog) {
  var self = this;
  self.nome = "";
  self.sobrenome = "";
  self.pessoaId = "";
  self.pessoas = [];
  self.adicionando = false;

  self.initFirebase = function () {
    self.auth = firebase.auth();
    self.database = firebase.database();
    self.carregarPessoas();
    // self.auth.onAuthStateChanged(self.quandoEstadoDeAutenticacaoMudar
      //.bind(self.auth.currentUser));
  }

  // self.quandoEstadoDeAutenticacaoMudar = function (user) {
  //   if (!user) {
  //     $location.path('login');
  //   }
  // }

  self.carregarPessoas = function () {
    var ref = self.database.ref().child('pessoas');
    self.pessoas = $firebaseArray(ref);

    // self.pessoasRef = self.database.ref('pessoas');
  }

  self.salvarPessoa = function () {
    if (self.nome == "" || self.sobrenome == "")
      return;

    //var pessoasRef = self.database.ref('pessoas');
    self.pessoas.$add({
      nome: self.nome,
      sobrenome: self.sobrenome
    }).then(function () {
      self.limparInputs();
      //self.mostrarForm();
      self.cancel();
      console.log("uma pessoa foi salva");
    }.bind(this)).catch(function (erro) {
      console.log("falha ao salvar uma pessoa", erro);
    });
  }

  self.mostrarForm = function () {
    if (self.adicionando) {
      self.adicionando = false;
    } else {
      self.adicionando = true;
    }
    $mdDialog.show({
      controller: homeCtrl,
      templateUrl: 'app/routes/addPessoa.tmpl.html',
      clickOutsideToClose: true
    }).then(function (answer) {
      console.log("answer", answer);
      self.adicionando = false;
    }, function () {
      console.log("cancelled dialog");
      self.adicionando = false;
    })
  }

  self.limparInputs = function () {
    self.nome = "";
    self.sobrenome = "";
  }

  self.editarPessoa = function (ev, _pessoa) {
    console.log("event:", ev);
    console.log("pessoa:", _pessoa);
    self.pessoaId = _pessoa.$id;
    console.log("self pessoaId:", self.pessoaId);
    $mdDialog.show({
      locals: {
        pessoa: _pessoa
      },
      controller: ['$scope', 'pessoa', '$mdClassSchedulerToast',
        function($scope, pessoa, $mdClassSchedulerToast) {

          $scope.pessoa = pessoa;

          $scope.removerPessoa = function () {
            self.pessoas.$remove(pessoa).then(function(reference) {
              if (reference.key == pessoa.$id) {
                $mdClassSchedulerToast.show("Pessoa removida.");
                $scope.cancel();
              } else {
                $mdClassSchedulerToast.show("Erro ao remover pessoa.");
              }
            });
          };

          $scope.cancel = function () {
            $mdDialog.cancel();
          }
      }],
      templateUrl: 'app/routes/editPessoa.tmpl.html',
      parent: angular.element(document.body),
      targetEvent: ev,
      clickOutsideToClose:true,
      fullscreen: $scope.customFullscreen
    })
    .then(function(answer) {
      console.log(answer);
    }, function() {
      console.log("cancelled dialog")
    })
  }

  // self.removerPessoa = function () {
  //     console.log('remover pessoa: ' + pessoinha);

  //     // var pessoasRef = self.database.ref('pessoas');
  //     // for (var i = 0; i < pessoasRef.length; i++) {
  //     //   if (pessoasRef[i].$id == self.pessoa.$id) {
  //     //     pessoasRef.splice(i, 1).then(function () {
  //     //       console.log("pessoa removida");
  //     //     }.bind(this)).catch(function (erro) {
  //     //       console.log("erro ao remover pessoa", erro);
  //     //     });
  //     //   }
  //     // }
  //
  //
  //     for (var i = 0; i < self.pessoas.length; i++) {
  //       console.log("self.pessoa(remover):", self.pessoaId);
  //       if (self.pessoas[i].$id == self.pessoaId) {
  //         self.pessoas.splice(i, 1);
  //         var pessoasRef = self.database.ref("pessoas");
  //         pessoasRef = self.pessoas;
  //         return;
  //       }
  //     }
  // }


  self.hide = function () {
    $mdDialog.hide();
  }

  self.initFirebase();
}
