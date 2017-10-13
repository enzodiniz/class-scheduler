var auth = firebase.auth();

function login() {
	var provider = new firebase.auth.GoogleAuthProvider();
	auth.signInWithPopup(provider)
		.then(function (result) {
			// body...
		});
}

function logOut () {
	auth.signOut().then(function () {

	}, function (erro) {
		
	});
}

function onAuthStateChanged (user) {
	userInfo = document.getElementById("loggedUser");

	if (user) {
		userInfo.innerHTML = user.displayName;
	} else {
		userInfo.innerHTML = "Faça login";
	}
}

window.onload = function () {
	auth.onAuthStateChanged(onAuthStateChanged.bind(this));
}