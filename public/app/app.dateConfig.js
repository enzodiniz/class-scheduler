angular
  .module('class-scheduler')
  .config(function ($mdDateLocaleProvider) {

    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const shortMonths = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const shortDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    $mdDateLocaleProvider.months = months;
    $mdDateLocaleProvider.shortMonths = shortMonths;
    $mdDateLocaleProvider.days = days;
    $mdDateLocaleProvider.shortDays = shortDays;

    // $mdDateLocaleProvider.isDateComplete = function(dateString) {
    //   dateString = dateString.trim();
    //
    //   // Look for two chunks of content (either numbers or text) separated by delimiters.
    //   var re = /^(([a-zA-Z]{3,}|[0-9]{1,4})([ .,]+|[/-]))([a-zA-Z]{3,}|[0-9]{1,4})/;
    //   return re.test(dateString);
    // };

    $mdDateLocaleProvider.formatDate = function(date) {
      return date ? moment(date).format('DD/MM/YYYY') : '';
    };

    $mdDateLocaleProvider.parseDate = function(dateString) {
      var m = moment(dateString, 'DD/MM/YYYY', true);
      return m.isValid() ? m.toDate() : new Date(NaN);
    };

    $mdDateLocaleProvider.isDateComplete = function(dateString) {
      dateString = dateString.trim();
      // Look for two chunks of content (either numbers or text) separated by delimiters.
      var re = /^(([a-zA-Z]{3,}|[0-9]{1,4})([ .,]+|[/-]))([a-zA-Z]{3,}|[0-9]{1,4})/;
      return re.test(dateString);
    };


  })
