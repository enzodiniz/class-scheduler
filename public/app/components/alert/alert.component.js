angular.
  module('alertEnzo').
  component('alertEnzo', {
    templateUrl: 'app/components/alert/alert.template.html',
    controller: function AlertController() {
      const self = this;

      self.teste = "Enzo teste"
    }
  });
