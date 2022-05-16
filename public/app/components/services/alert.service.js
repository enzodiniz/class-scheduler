angular
.module("class-scheduler")
.service("$alertSvc", alertSvc)

function alertSvc($mdDialog, $rootScope) {
  const self = this

  self.showAlert = function (message) {
    console.log('enviando alert...');
    $rootScope.$broadcast('showAlert', {
      message: message
    })

    // $mdDialog.show(
    //   $mdDialog.alert()
    //     .parent(angular.element(document.querySelector('#popupContainer')))
    //     .clickOutsideToClose(true)
    //     .title('Ops! Ocorreu um erro!')
    //     .textContent(message)
    //     .ariaLabel('Alerta de erro')
    //     .ok('Fechar')
    // );
  }

  self.showError = function (error) {
    $rootScope.$broadcast('showError', {
      message: error
    })
  }
}
