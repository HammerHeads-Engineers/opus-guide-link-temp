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
function create_question_item(item_data) {
	card = document.createElement("div");
	card.className = "card";

	text = document.createElement("h3");
	text.className = "standard_h";
	text.innerText = item_data["name"];

	buttons_div = document.createElement("div");
	buttons_div.className = "no_card";

	card.appendChild(text);
	card.appendChild(buttons_div);

	item_data["answers"].forEach(function(answer_data){
		button = document.createElement("button");
		button.className = "button";
		button.innerText = answer_data["name"];

		buttons_div.appendChild(button);

		answer_data["list"].forEach(function(list_item_data) {
			if (list_item_data["type"] == "instruction") {
				elem = create_instruction_item(list_item_data);
			} else if (list_item_data["type"] == "question") {
				elem = create_question_item(list_item_data);
			}

			button_div.appendChild(elem)
		})
	});

	return card;

}


function set_data(data) {
	console.log(data);
	document.title = data["name"];

	header_name = document.querySelector(".header_text");
	header_name.innerText = data["name"];



	//data["instructions"]
	data["process"].forEach(function(item_data) {
		if (item_data["type"] == "instruction") {
			elem = create_instruction_item(item_data);
		} else if (item_data["type"] == "question") {
			elem = create_question_item(item_data);
		}
		container = document.querySelector("#instructions_content");
		container.appendChild(elem);

	})

}




function get_process(link) {
	data = {"name":"process 123",
	 "process":[
	 		{"name":"1", "type":"instruction", "uid":"123"},
	 		{"name":"2", "type":"instruction", "uid":"234"},
	 		{"name":"how?", "type":"question", "uid":"345", "answers":[{"name":"Yes", "list":[{"name":"Very nice", "type":"instruction", "uid":"12345"}]},{"name":"No", "list":[]}]},
	 	]
	};

	set_data(data);
	//link_uid = link;
	//fetch('https://app.opus.guide/_/api/get_role/' + link_uid, {credentials:"include"})
  	//	.then((response) =>
  	//		response.json()
  	//	)
  	//	.then((data) => {
  	//		if (data) {
  	//			set_data(data); /*if data is good*/
  	//		} else {
  	//			document.querySelector("#not_found_div").style.display = "inline";
  	//		}
 	//	});

}