const cards = [

{
title:"Nowy model AI",
category:"ai"
},

{
title:"Misja na Marsa",
category:"space"
},

{
title:"Przełom w genetyce",
category:"biology"
},

{
title:"Komputery kwantowe",
category:"technology"
},

{
title:"Nowe dane klimatyczne",
category:"earth"
}

];

function renderCards(){

cards.forEach(card=>{

const element = document.createElement("div");

element.className="card";

element.innerHTML=`

<h3>${card.title}</h3>

`;

document
.getElementById(
card.category+"-content"
)
.appendChild(element);

});

}

renderCards();
