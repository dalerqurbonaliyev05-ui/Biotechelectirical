import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

// Google tugmasini bosganda
const googleBtn = document.querySelector('.fa-google-plus-g').parentElement; 
googleBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            alert("Google orqali kirdingiz!");
            window.location.href = "signup.html";
        }).catch((error) => {
            console.error(error.message);
        });
});

const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
	container.classList.add("right-panel-active");
});

signInButton.addEventListener('click', () => {
	container.classList.remove("right-panel-active");
});
