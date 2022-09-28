
var step_number = 0;
var instruction_json = null;
var url_dict = null;


const SPANISH = {
    "next":"siguiente",
    "finish":"terminado"
}
const FRENCH = {
    "next":"suivant",
    "finish":"terminer"
}
const DUTCH = {
    "next":"volgende",
    "finish":"voltooid"
}
const GERMAN = {
    "next":"nächste",
    "finish":"beenden"
}
const SWEDISH = {
    "next":"nästa",
    "finish":"avsluta"
}
const DANISH = {
    "next":"næste",
    "finish":"afslutte"
}

const LITHUANIAN = {
    "next":"kitas",
    "finish":"baigti"
}
const LATVIAN = {
    "next":"nākamais",
    "finish":"apdare"
}
const POLISH = {
    "next":"następny",
    "finish":"zakończyć"
}

const locale_dicts = {
    "ES":SPANISH,
    "NL":DUTCH,
    "SV":SWEDISH,
    "DA":DANISH,
    "PL":POLISH,
    "LT":LITHUANIAN,
    "LV":LATVIAN,
    "DE":GERMAN,
    "FR":FRENCH,
}

function get_link(link_text) {
	if (link_text.includes("http")) {
		return link_text
	} else {
		return "http://" + link_text
	}
}

function create_step(step_data, url_data) {
	text_card = document.createElement("div")
	text_card.className = "card"

	step_name = document.createElement("h2");
	step_name.innerText = step_data["name"];
	text_card.appendChild(step_name);

	text_card.innerHTML += step_data["text"]

	link_div = document.createElement("div")
	link_div.className = "no_card"
	step_data["links"].forEach(function(step_link){
		link = document.createElement("a");
		link.href = get_link(step_link);
		link.className = "link"
		link.innerHTML = "<i class='fa fa-link icon_left'></i>"
		link.innerHTML += step_link;
		link_div.appendChild(link);
	})
	text_card.appendChild(link_div);

	file_div = document.createElement("div")
	file_div.className = "no_card"
	step_data["files"].forEach(function(step_link){
		link = document.createElement("a");
		link.href = url_data[step_link]["url"];
		link.className = "link"
		link.innerHTML = "<i class='fa fa-file icon_left'></i>"
		link.innerHTML += url_data[step_link]["name"];
		file_div.appendChild(link);
	})
	text_card.appendChild(file_div);

	return text_card

}

function create_image_grid(step_data, url_data) {
	image_grid = document.createElement("div");
	image_grid.className = "images_grid"
	if (step_data["images"].length == 1) {
		image_grid.style.gridTemplateColumns = "1fr"; /*quick fix */
	}

	step_data["images"].forEach(function(image_uid){
		div = document.createElement("div");
		div.className = "no_card";
		image = document.createElement("img")
		image.src = url_data[image_uid]["url"]

		div.appendChild(image);
		image_grid.appendChild(div);
	})

	return image_grid

}

function create_step_component(step_data, url_data) {
	card = create_step(step_data, url_data);
	images = create_image_grid(step_data, url_data);

	elem = document.createElement("div");
	elem.appendChild(card);
	elem.appendChild(images);
	return elem
}
function create_sidebar_component(step_data) {
	let sidebar_item = document.createElement("div");
	sidebar_item.className = "sidebar_item"
	sidebar_item.innerText = step_data["name"]
	let side_link = document.createElement('a');
	side_link.appendChild(sidebar_item);

	return side_link

}

function set_counter() {
	counter_text = document.querySelector("#counter_text");
	counter_text.innerText = step_number.toString() + " / " + instruction_json["steps"].length.toString()

}
function show_next_previous_buttons() {
	if (instruction_json["steps"].length == step_number) {
		document.querySelector("#next_button").style.display = "none"
	} else {
		document.querySelector("#next_button").style.display = "inline"
	}

	if (step_number == 1) {
		document.querySelector("#previous_button").style.display = "none"
	} else {
		document.querySelector("#previous_button").style.display = "inline"
	}

	if (step_number == instruction_json["steps"].length) {
		document.querySelector("#finish_button").style.display = "inline"
	}
}

function show_step() {
	main_content = document.querySelector("#step_content");
	main_content.innerHTML = ""
	main_content.appendChild(create_step_component(instruction_json["steps"][step_number - 1], url_dict))

}
function show_any_step(new_step_number) {
	step_number = new_step_number;
	set_counter();
	show_next_previous_buttons();
	show_step();
}
function next_step() {
	if (instruction_json["steps"].length > step_number) {
		step_number = step_number + 1
		set_counter();
		show_next_previous_buttons();
		show_step()
	}
}

function previous_step() {
	if (step_number > 1) {
		step_number = step_number - 1
		set_counter();
		show_next_previous_buttons();
		show_step();
	}
}



function bind_buttons() {
	document.querySelector("#next_button").onclick = next_step
	document.querySelector("#previous_button").onclick = previous_step
}

function set_finish_url(instruction_data) {
	if (instruction_data["redirect_url"]) {
		document.querySelector("#finish_button").onclick = function(){window.location.href = get_link(instruction_data["redirect_url"])};
		document.querySelector("#finish_button_other").onclick = function(){window.location.href = get_link(instruction_data["redirect_url"])};
	} else {
		document.querySelector("#finish_button").onclick = function(){window.location.href = "https://opus.guide"};
		document.querySelector("#finish_button_other").onclick = function(){window.location.href = "https://opus.guide"};
	}

}

function set_data(data) {
	instruction_json = data["instruction"];
	url_dict = data["url_dict"];

	console.log(instruction_json);
	/*set the name */
	document.title = instruction_json["name"];
	header_name = document.querySelector(".header_text");
	header_name.innerText = data["instruction"]["name"];

	counter_text = document.querySelector("#counter_text");
	counter_text.innerText = step_number.toString() + " / " + data["instruction"]["steps"].length.toString()

	if ( Object.keys(locale_dicts).includes(instruction_json["language"]) ) {
		document.documentElement.setAttribute("lang", instruction_json["language"]);
		document.querySelector("#next_text").textContent = locale_dicts[instruction_json["language"]]["next"]
		document.querySelector("#finish_text").textContent = locale_dicts[instruction_json["language"]]["finish"]
		document.querySelector("#finish_text_other").textContent = locale_dicts[instruction_json["language"]]["finish"]
	}


	if (instruction_json["show_steps"] == null || instruction_json["show_steps"] == true) {
		/*set the sidebar*/
		instruction_json["steps"].forEach(function(step_item, index) {
			side_link = create_sidebar_component(step_item);
			side_link.onclick = function () {
				toggle_sidebar();
				show_any_step( index + 1 );
			}
			document.querySelector("#sidebar").appendChild(side_link)
		})
		document.querySelector("#steps_control_div").style.display = "grid"
		next_step();
		bind_buttons();
	} else {
		main_content = document.querySelector("#step_content");
		instruction_json["steps"].forEach(function(step_item, index) {
			step_comp = create_step_component(step_item, url_dict);
			step_comp.id = "step_" + index.toString();
			console.log("#" + step_comp.id);
			main_content.appendChild(step_comp);

			side_link = create_sidebar_component(step_item);
			side_link.onclick = function () {
				toggle_sidebar();
				document.querySelector("#" + "step_" + index.toString()).scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"})
			};
			document.querySelector("#sidebar").appendChild(side_link);

		})
		document.querySelector("#finish_button_other").style.display = "block"

	}

	Object.entries(url_dict).forEach(function(url_item) {
		preload_image = new Image()
		preload_image.src = url_item[1].url
	})





}

function get_instruction(link_uid) {
	fetch('https://app.opus.guide/_/api/get_instruction/' + link_uid, {credentials:"include"})
  		.then((response) =>
  			response.json()
  		)
  		.then((data) => {
  			if (data) {
  				set_finish_url(data["instruction"])
  				set_data(data); /*if data is good*/
  			} else {
  				document.querySelector("#not_found_div").style.display = "inline";
  			}
 		});

}

function get_instruction_by_role(role_link, instruction_uid) {
	fetch('https://app.opus.guide/_/api/get_instruction_by_role/'+role_link+"/"+instruction_uid, {credentials:"include"})
  		.then((response) =>
  			response.json()
  		)
  		.then((data) => {
  			if (data) {
  				document.querySelector("#finish_button").onclick = function(){window.location.href = "https://link.opus.guide/r/" + role_link};
				document.querySelector("#finish_button_other").onclick = function(){window.location.href = "https://link.opus.guide/r/" + role_link};
  				set_data(data); /*if data is good*/
  			} else {
  				document.querySelector("#not_found_div").style.display = "inline";
  			}
 		});

}

function get_instruction_by_process(process_link, instruction_uid) {
	fetch('https://app.opus.guide/_/api/get_instruction_by_process/'+process_link+"/"+instruction_uid, {credentials:"include"})
  		.then((response) =>
  			response.json()
  		)
  		.then((data) => {
  			if (data) {
  				document.querySelector("#finish_button").onclick = function(){window.location.href = "https://link.opus.guide/p/" + process_link};
				document.querySelector("#finish_button_other").onclick = function(){window.location.href = "https://link.opus.guide/p/" + process_link};
  				set_data(data); /*if data is good*/
  			} else {
  				document.querySelector("#not_found_div").style.display = "inline";
  			}
 		});

}