var link_uid = ""

function create_instruction_item(item_data) {
    let text = document.createElement("h3");
    text.className = "standard_h";
    text.innerText = item_data["name"];

    let card = document.createElement("div");
    card.className = "card instruction_item";

    let text_div = document.createElement("div");
    text_div.className = "instruction_item_text";
    text_div.appendChild(text);
    card.appendChild(text_div);

    // Check if 'uid' is present and not empty
    if (item_data["uid"] && item_data["uid"].trim() !== "") {
        let ahref = document.createElement("a");
        ahref.href = "https://link.opus.guide/p/" + link_uid + "/" + item_data["uid"];

        let button_div = document.createElement("div");
        button_div.className = "instruction_item_button";

        let button = document.createElement("button");
        button.className = "button";
        button.innerHTML = "<i class='fa fa-arrow-right'></i>";

        button_div.appendChild(button);
        card.appendChild(button_div);
        ahref.appendChild(card);

        return ahref;
    } else {
        // Return only the card if 'uid' is empty or absent
        return card;
    }
}

function create_question_item(item_data) {
	let overall_div = document.createElement("div");

	let card = document.createElement("div");
	card.className = "card";

	let text = document.createElement("div"); // using div to allow any type of HTML
	text.className = "standard_h";
	text.innerHTML = item_data["name"]; // set innerHTML, not innerText

	let buttons_div = document.createElement("div");
	buttons_div.className = "no_card";

	let answers_div = document.createElement("div");

	card.appendChild(text);
	card.appendChild(buttons_div);
	overall_div.appendChild(card);
	overall_div.appendChild(answers_div);

	item_data["answers"].forEach(function(answer_data){
		let button = document.createElement("button");
		button.className = "button";
		button.innerText = answer_data["name"];

		let list_div = document.createElement("div")

		button.onclick = function() {
			buttons_div.childNodes.forEach(function(other_button){
				other_button.className = "button"
			})
			button.className = "button_pressed"
			answers_div.innerHTML = "";
			answers_div.appendChild(list_div);
		};

		buttons_div.appendChild(button);

		answer_data["list"].forEach(function(list_item_data) {
			if (list_item_data["type"] == "instruction") {
				let elem = create_instruction_item(list_item_data);
				list_div.appendChild(elem)
			} else if (list_item_data["type"] == "question") {
				let elem = create_question_item(list_item_data);
				list_div.appendChild(elem)
			}
		})
	});

	return overall_div;
}



function set_data(data) {
	//console.log(data);
	document.title = data["name"];

	let header_name = document.querySelector(".header_text");
	header_name.innerText = data["name"];


	container = document.querySelector("#instructions_content");
	//data["instructions"]
	data["process"].forEach(function(item_data) {
		if (item_data["type"] == "instruction") {
			let elem = create_instruction_item(item_data);
			container.appendChild(elem);
		} else if (item_data["type"] == "question") {
			let elem = create_question_item(item_data);
			container.appendChild(elem);
		}


	})

}




function get_process(link) {
	link_uid = link;
	fetch('https://app.opus.guide/_/api/get_process/' + link_uid, {credentials:"include"})
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