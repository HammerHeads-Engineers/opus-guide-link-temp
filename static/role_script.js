var link_uid = ""

function create_instruction_item(item_data) {
	text = document.createElement("h3")
	text.className = "standard_h"
	text.innerText = item_data["name"]

	ahref = document.createElement("a")
	ahref.href = "https://link.opus.guide/r/" + link_uid +"/" + item_data["uid"]
	card = document.createElement("div")
	card.className = "card instruction_item"

	text_div = document.createElement("div")
	text_div.className = "instruction_item_text"
	button_div = document.createElement("div")
	button_div.className = "instruction_item_button"

	button = document.createElement("button")
	button.className = "button"
	button.innerHTML = "<i class='fa fa-arrow-right'></i>"

	text_div.appendChild(text);
	card.appendChild(text_div);
	button_div.appendChild(button);
	card.appendChild(button_div);
	ahref.appendChild(card);

	return ahref

}

function set_data(data) {
	console.log(data);
	document.title = data["name"];
	header_name = document.querySelector(".header_text");
	header_name.innerText = data["name"];

	data["instructions"].forEach(function(item_data) {
		elem = create_instruction_item(item_data);
		container = document.querySelector("#instructions_content");
		container.appendChild(elem);

	})

}




function get_role_folder(link) {
	link_uid = link;
	fetch('https://app.opus.guide/_/api/get_role/' + link_uid, {credentials:"include"})
  		.then((response) =>
  			response.json()
  		)
  		.then((data) => {
  			if (data) {
  				set_data(data); /*if data is good*/
  			} else {
  				document.querySelector("#not_found_div").style.display = "inline";
  			}
 		});

}