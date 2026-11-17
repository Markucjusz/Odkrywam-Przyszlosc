const themeButton =
document.getElementById("theme-toggle");

themeButton.addEventListener("click", () => {

document.body.classList.toggle("light");

});
const toggle =
document.getElementById("theme-toggle");

if(toggle){

    toggle.addEventListener(
    "click",
    ()=>{

        document.body.classList
        .toggle("light");

        localStorage.theme =
        document.body.classList
        .contains("light")

        ? "light"
        : "dark";

    });

}
