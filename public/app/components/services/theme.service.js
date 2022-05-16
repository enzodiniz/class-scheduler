angular.
  module('class-scheduler').
  service('temaSvc', themeService);

function themeService(authSvc) {
  const self = this;
 
  self.observadores = [];
  self.observarTema = observarTema;
  self.getTema = getTema;

  function observarTema(observador) {
    self.observadores.push(observador);
  }

  function init() {
    authSvc.observarUsuario((usuario) => {
        if(!usuario) return;
        const temaUsuario = usuario.theme; 
        if (temaUsuario !== 'system') {
            notificar(temaUsuario);
            self.tema = temaUsuario;
            return;
        }
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        self.tema = mediaQuery.matches ? 'dark' : 'default';
        notificar(self.tema);
        mediaQuery.addListener(event => {
            const tema = event.matches ? 'dark' : 'default';
            notificar(tema);
        });
    });
  }

  function notificar(tema) {
    for (let indice = 0; indice < self.observadores.length; indice++) {
        self.observadores[indice](tema);
    }
  }

  function getTema() {
    return self.tema;
  }

  self.verificarTema = function(user) {
    console.log('contexto em themeSVc:', this);
    contextoCtrl = this;
    if (user.theme !== 'system') {
        contextoCtrl.themeSelected = user.theme;
    } else {
        self._adicionarListenerTema(contextoCtrl);
    }
  }

  self._adicionarListenerTema = function(contextoCtrl) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    contextoCtrl.themeSelected = mediaQuery.matches ? 'dark' : 'default';
    //contextoCtrl._apply();
    mediaQuery.addListener(event => {
        contextoCtrl.themeSelected = event.matches ? 'dark' : 'default'
        //contextoCtrl._apply();
    });
  }


  self.observers = [];

  self.init = function () {
    self.listenSystemThemeChanges();
  }

  self.subscribe = function(observerFunction) {
    self.observers.push(observerFunction);
  }

  self.notifyAll = function (isDarkMode) {
    console.log('themeSvc -> nofificando todo mundo...');

    for (let i = 0; i < self.observers.length; i++) {
      const observerFunction = self.observers[i];
      observerFunction(isDarkMode);
    }
  }

  self.listenSystemThemeChanges = function (observerFunction) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', (ev) => {
      // console.log('themeService -> ev:', ev);
      // self.notifyAll(ev.matches);

      observerFunction(ev.matches);
    });
  }

  self.isDarkMode = function () {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    return mediaQuery.matches;
  }

  init();
}
