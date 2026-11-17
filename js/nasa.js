const apiKey = "TUTAJ_WKLEJ_KLUCZ_NASA";

fetch(
`https://api.nasa.gov/planetary/apod?api_key=${apiKey}`
)
.then(r => r.json())
.then(data => {

document.getElementById(
"apod-card"
).innerHTML = `

<img
src="${data.url}"
style="
width:100%;
border-radius:20px;
margin-bottom:20px;
">

<h3>${data.title}</h3>

<p>

${data.explanation}

</p>

`;

});


