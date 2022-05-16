angular
  .module('class-scheduler')
  .controller('homeCtrl', homeCtrl)

function homeCtrl ($scope, authSvc, $rootScope, $pessoaSvc, $profSvc, $coordSvc, temaSvc) {
  var self = this;

  self.user;
  self.aulasVagas;
  self.carregando;

  $scope.$on('shareUser', function(ev, user) {
    self.setUser(user);
  });

  self.setUser = function(user) {
    $scope.$apply(function () {
      self.user = user;
      self.carregando = false;
      console.log('usuário obtido através da consulta no mainCtrl');
    });
  }

  self.initFirebase = function () {
    self.atualizarBarraMenu();
    self.user = authSvc.getUsuario();
    authSvc.observarUsuario((usuario) => {
        $scope.$apply(() => {
            self.user = usuario;
        });
    });
    self.themeSelected = temaSvc.getTema();
    temaSvc.observarTema(gotTema);
  }

  function gotTema(tema) {
    self.themeSelected = tema;
  }

  self.atualizarBarraMenu = function () {
    $rootScope.$broadcast('tituloPagina', {
      titulo: "Início",
    });
  }

  // self.verificarCoord = function(id) {
  //   let refPessoa = self.db.doc("pessoas/" + id);
  //   self.buscandoCoord = true;
  //   $coordSvc.getCoordenador(refPessoa).then(query => {
  //     let doc = query.docs[0];
  //     if (doc.exists) {
  //       self.user.refCoord = doc.ref;
  //       self.buscandoCoord = false;
  //     } else {
  //       self.buscandoCoord = false;
  //     }
  //   }).catch(e => console.error("Ocorreu um erro ao verificar coordenador: ", e));
  // }

  // self.verificarProf = function(id) {
  //   self.buscandoProf = true;
  //   $profSvc.getProfessor(id).then(query => {
  //     let doc = query.docs[0];
  //     if (doc.exists) {
  //       self.user.refProfessor = doc.ref;
  //       self.buscandoProf = false;
  //     } else {
  //       self.buscandoProf = false;
  //     }
  //   }).catch(e => console.error("Ocorreu um erro ao verificar professor: ", e));
  // }

  self.backToTop = function () {
    window.scroll(0, 0)
  }

  self.listenScroll = function () {
    const button = document.getElementById('button-2')
    // button.classList.add('hidden');

    document.addEventListener('scroll', event => {
      $scope.$apply(() => {
        console.log('lastKnownScrollPosition:', window.scrollY);
        if (window.scrollY > 10) {
          self.showButton()
          // button.classList.remove('hidden')
          // button.classList.add('show')

          button.classList.add('scrooling')
        } else {
          self.hideButton()

          // button.classList.remove('show')
          // button.classList.add('hidden')

          button.classList.remove('scrooling')
        }
      })
    })
  }

  self.showButton = function () {
    if (!self.buttonVisible) {
      self.buttonVisible = true
      self.buttonClass = 'show'
      console.log('deveria tá mostrando');
    }
  }

  self.hideButton = function () {
    if (self.buttonVisible) {
      self.buttonVisible = false
      self.buttonClass = 'hidden'
      console.log('deveria esconder');
    }
  }

  self.listenScroll()

  // Get faltas

  self.initFirebase();
}
