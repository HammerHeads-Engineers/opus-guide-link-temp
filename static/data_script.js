
var step_number = 0;
var instruction_json = null;
var url_dict = null;

const OPUS_GUIDE_API_BASE = "https://test-opusguide.anvil.app/_/api";

var checklist_mode = false;
var checklist_token = null;
var checklist_assignment = null;
var checklist_progress = {};
var checklist_readonly = false;
var checklist_save_timeout = null;
var checklist_pending_progress = {};

const PERSONAL_SPACE_FALLBACK = {
	primary_font_color: "#FFFFFF",
	primary_background_color: "#14A8CC",
	background_color: "#DDF3F9",
	accent_color: "#0096B8",
	logo_url: "/static/og_favicon_monochrome.png",
	logo_alt: "Opus.Guide"
};


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

const ARABIC = {
    "next":"الخطوة التالية",
    "finish":"تعليمات الإنهاء"
}
const JAPANESE = {
	"next":"次のステップ",
	"finish":"読了"
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
	"JA":JAPANESE,
    "AR":ARABIC
}

function get_link(link_text) {
	if (link_text.includes("http")) {
		return link_text
	} else {
		return "http://" + link_text
	}
}

function is_checklist_readonly_status(status_code) {
	return status_code == "submitted" || status_code == "expired";
}

function get_step_id(step_data, step_index) {
	if (step_data && step_data["id"] !== undefined && step_data["id"] !== null) {
		return step_data["id"].toString();
	}
	if (step_index !== undefined && step_index !== null) {
		return step_index.toString();
	}
	return "";
}

function get_step_progress(step_id) {
	if (!checklist_progress[step_id]) {
		checklist_progress[step_id] = {"checked": false};
	}
	return checklist_progress[step_id];
}

function set_checklist_save_status(status_text) {
	const save_status = document.querySelector("#checklist_save_status");
	if (save_status) {
		save_status.innerText = status_text || "";
	}
}

function show_checklist_banner(message, is_error) {
	const banner = document.querySelector("#checklist_banner");
	if (!banner) {
		return;
	}
	banner.innerText = message;
	banner.classList.toggle("checklist_banner_error", Boolean(is_error));
	banner.style.display = "block";
}

function hide_checklist_banner() {
	const banner = document.querySelector("#checklist_banner");
	if (banner) {
		banner.style.display = "none";
	}
}

function format_checklist_date(value) {
	if (!value) {
		return "";
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
}

function set_checklist_assignment(assignment) {
	checklist_assignment = assignment || {};
	checklist_progress = Object.assign({}, checklist_assignment["progress"] || {});
	checklist_readonly = is_checklist_readonly_status(checklist_assignment["status_code"]);

	Object.entries(checklist_pending_progress).forEach(function(progress_item) {
		checklist_progress[progress_item[0]] = progress_item[1];
	});
}

function update_checklist_ui_state() {
	if (!checklist_mode) {
		return;
	}

	const panel = document.querySelector("#checklist_panel");
	if (panel) {
		panel.style.display = "block";
	}

	const submit_button = document.querySelector("#submit_checklist_button");
	if (submit_button) {
		submit_button.onclick = submit_checklist;
		submit_button.disabled = checklist_readonly;
		submit_button.style.display = checklist_readonly ? "none" : "inline-block";
	}

	document.querySelectorAll(".checklist_checkbox").forEach(function(checkbox) {
		checkbox.disabled = checklist_readonly;
	});

	if (checklist_assignment && checklist_assignment["status_code"] == "expired") {
		show_checklist_banner("Link expired — contact sender", true);
	} else if (checklist_assignment && checklist_assignment["status_code"] == "submitted") {
		const submitted_at = format_checklist_date(checklist_assignment["submitted_at"]);
		show_checklist_banner(submitted_at ? "Submitted on " + submitted_at : "Submitted", false);
	} else {
		hide_checklist_banner();
	}
}

function create_checklist_checkbox(step_data, step_index) {
	const step_id = get_step_id(step_data, step_index);
	const step_progress = get_step_progress(step_id);
	const checkbox = document.createElement("input");

	checkbox.type = "checkbox";
	checkbox.className = "checklist_checkbox";
	checkbox.checked = Boolean(step_progress["checked"]);
	checkbox.disabled = checklist_readonly;
	checkbox.setAttribute("aria-label", "Mark step complete");
	checkbox.onchange = function() {
		handle_checklist_checkbox_change(step_id, checkbox.checked);
	};

	return checkbox;
}

function handle_checklist_checkbox_change(step_id, checked) {
	if (checklist_readonly) {
		return;
	}

	checklist_progress[step_id] = Object.assign({}, checklist_progress[step_id] || {}, {"checked": checked});
	checklist_pending_progress[step_id] = {"checked": checked};
	set_checklist_save_status("Saving...");

	if (checklist_save_timeout) {
		clearTimeout(checklist_save_timeout);
	}

	checklist_save_timeout = setTimeout(save_checklist_progress, 400);
}

function parse_json_response(response) {
	return response.text().then(function(response_text) {
		if (!response_text) {
			return null;
		}
		try {
			return JSON.parse(response_text);
		} catch (error) {
			return null;
		}
	});
}

function save_checklist_progress(should_throw) {
	if (!checklist_token || checklist_readonly || Object.keys(checklist_pending_progress).length == 0) {
		return Promise.resolve();
	}

	const progress_to_save = Object.assign({}, checklist_pending_progress);
	checklist_pending_progress = {};
	set_checklist_save_status("Saving...");

	return fetch(OPUS_GUIDE_API_BASE + "/save_checklist_progress/" + checklist_token, {
		method: "POST",
		credentials: "include",
		headers: {"Content-Type": "application/json"},
		body: JSON.stringify({"progress": progress_to_save})
	})
	.then(function(response) {
		if (!response.ok) {
			throw new Error("Checklist progress could not be saved");
		}
		return parse_json_response(response);
	})
	.then(function(data) {
		if (data && data["assignment"]) {
			set_checklist_assignment(data["assignment"]);
			update_checklist_ui_state();
		}
		set_checklist_save_status("Saved");
	})
	.catch(function(error) {
		console.error(error);
		checklist_pending_progress = Object.assign({}, progress_to_save, checklist_pending_progress);
		set_checklist_save_status("Unable to save");
		if (should_throw) {
			throw error;
		}
	});
}

function submit_checklist() {
	if (!checklist_token || checklist_readonly) {
		return;
	}

	const submit_button = document.querySelector("#submit_checklist_button");
	if (submit_button) {
		submit_button.disabled = true;
	}
	const save_before_submit = Object.keys(checklist_pending_progress).length > 0
		? save_checklist_progress(true)
		: Promise.resolve();

	save_before_submit.then(function() {
		set_checklist_save_status("Submitting...");
		return fetch(OPUS_GUIDE_API_BASE + "/submit_checklist/" + checklist_token, {
			method: "POST",
			credentials: "include",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({})
		});
	})
	.then(function(response) {
		if (!response.ok) {
			throw new Error("Checklist could not be submitted");
		}
		return parse_json_response(response);
	})
	.then(function(data) {
		if (data && data["assignment"]) {
			set_checklist_assignment(data["assignment"]);
		} else {
			checklist_assignment = Object.assign({}, checklist_assignment || {}, {
				"status_code": "submitted",
				"submitted_at": new Date().toISOString()
			});
			checklist_readonly = true;
		}
		update_checklist_ui_state();
		set_checklist_save_status("");
	})
	.catch(function(error) {
		console.error(error);
		if (submit_button) {
			submit_button.disabled = false;
		}
		set_checklist_save_status("Unable to submit");
	});
}

function show_checklist_not_found(message) {
	const panel = document.querySelector("#checklist_panel");
	if (panel) {
		panel.style.display = "none";
	}

	const not_found_div = document.querySelector("#not_found_div");
	if (!not_found_div) {
		return;
	}

	not_found_div.innerHTML = "";
	const heading = document.createElement("h1");
	heading.innerText = message || "Page not found";
	not_found_div.appendChild(heading);
	not_found_div.style.display = "inline";
}

function create_step(stepData, urlData, stepIndex) {
    // Create a card container for the step
    let textCard = document.createElement("div");
    textCard.className = "card";

    // Create a title for the step
    let stepName = document.createElement("h2");
    stepName.innerText = stepData["name"];
	if (checklist_mode) {
		let stepHeader = document.createElement("div");
		stepHeader.className = "checklist_step_header";
		stepHeader.appendChild(create_checklist_checkbox(stepData, stepIndex));
		stepHeader.appendChild(stepName);
		textCard.appendChild(stepHeader);
	} else {
		textCard.appendChild(stepName);
	}

	// Add the text for the step
	let stepText = document.createElement("div");
	stepText.innerHTML = stepData["text"] || "";
	textCard.appendChild(stepText);

    // Create a container for the links
    let linksContainer = document.createElement("div");
    linksContainer.className = "no_card";

    // Create each link and add to the container
    stepData["links"].forEach(function(linkItem){
        let linkElement = document.createElement("a");
        linkElement.href = get_link(linkItem);
        linkElement.className = "link";
        linkElement.target = "_blank";
        linkElement.innerHTML = "<i class='fa fa-link icon_left'></i>" + linkItem;
        linksContainer.appendChild(linkElement);
    });

    // Add links container to the card
    textCard.appendChild(linksContainer);

    // Create a container for the files
    let filesContainer = document.createElement("div");
    filesContainer.className = "no_card";

    // Create each file link and add to the container
    stepData["files"].forEach(function(fileItem){
        let fileLinkElement = document.createElement("a");
        let fileUrl = urlData[fileItem]["url"];
        let fileName = urlData[fileItem]["name"];

        fileLinkElement.href = fileUrl;
        fileLinkElement.className = "link";
        fileLinkElement.target = "_blank";
        fileLinkElement.innerHTML = "<i class='fa fa-file icon_left'></i>" + fileName;

        filesContainer.appendChild(fileLinkElement);
    });

    // Add files container to the card
    textCard.appendChild(filesContainer);

    return textCard;
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

function create_step_component(step_data, url_data, step_index) {
	card = create_step(step_data, url_data, step_index);
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

	document.querySelector("#finish_button").style.display = "none"
	if (!checklist_mode && step_number == instruction_json["steps"].length) {
		document.querySelector("#finish_button").style.display = "inline"
	}
}

function show_step() {
	main_content = document.querySelector("#step_content");
	main_content.innerHTML = ""
	main_content.appendChild(create_step_component(instruction_json["steps"][step_number - 1], url_dict, step_number - 1))

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

function clear_header_logo() {
	const header_logo = document.querySelector("#header_logo");
	header_logo.hidden = true;
	header_logo.onerror = null;
	header_logo.removeAttribute("src");
	header_logo.alt = "";
}

function normalize_brand_color(color, fallback) {
	if (typeof color !== "string") {
		return fallback;
	}

	const trimmed_color = color.trim();
	if (/^#[0-9a-fA-F]{6}$/.test(trimmed_color)) {
		return trimmed_color.toUpperCase();
	}

	return fallback;
}

function hex_to_rgb_components(color) {
	const normalized_color = color.slice(1);
	const red = parseInt(normalized_color.slice(0, 2), 16);
	const green = parseInt(normalized_color.slice(2, 4), 16);
	const blue = parseInt(normalized_color.slice(4, 6), 16);
	return red + ", " + green + ", " + blue;
}

function apply_brand_colors(instruction_data) {
	const is_personal_space_instruction = !instruction_data["organization_name"];
	const primary_font_color = normalize_brand_color(
		is_personal_space_instruction
			? PERSONAL_SPACE_FALLBACK.primary_font_color
			: instruction_data["organization_primary_font_color"] || instruction_data["organization_primary_color"],
		PERSONAL_SPACE_FALLBACK.primary_font_color
	);
	const primary_background_color = normalize_brand_color(
		is_personal_space_instruction
			? PERSONAL_SPACE_FALLBACK.primary_background_color
			: instruction_data["organization_primary_background_color"],
		PERSONAL_SPACE_FALLBACK.primary_background_color
	);
	const background_color = normalize_brand_color(
		is_personal_space_instruction
			? PERSONAL_SPACE_FALLBACK.background_color
			: instruction_data["organization_background_color"],
		PERSONAL_SPACE_FALLBACK.background_color
	);
	const accent_color = normalize_brand_color(
		is_personal_space_instruction
			? PERSONAL_SPACE_FALLBACK.accent_color
			: instruction_data["organization_accent_color"],
		PERSONAL_SPACE_FALLBACK.accent_color
	);
	const root_style = document.documentElement.style;

	root_style.setProperty("--brand-primary", primary_font_color);
	root_style.setProperty("--brand-primary-rgb", hex_to_rgb_components(primary_font_color));
	root_style.setProperty("--brand-header-background", primary_background_color);
	root_style.setProperty("--brand-header-border", "rgba(" + hex_to_rgb_components(primary_background_color) + ", 0.36)");
	root_style.setProperty("--brand-card-background", background_color);
	root_style.setProperty("--brand-accent", accent_color);
	root_style.setProperty("--brand-accent-rgb", hex_to_rgb_components(accent_color));
}

function set_data(data) {
	instruction_json = data["instruction"];
	url_dict = data["url_dict"] || {};

	console.log(instruction_json);
	apply_brand_colors(instruction_json);

	/*set the name */
	document.title = instruction_json["name"];
	header_name = document.querySelector(".header_text");
	header_name.innerText = data["instruction"]["name"];

	const organization_logo_url = instruction_json["organization_logo_url"];
	const organization_name = instruction_json["organization_name"];
	const header_logo = document.querySelector("#header_logo");
	const is_personal_space_instruction = !organization_name;

	if (is_personal_space_instruction) {
		header_logo.onerror = function() {
			clear_header_logo();
		};
		header_logo.src = PERSONAL_SPACE_FALLBACK.logo_url;
		header_logo.alt = PERSONAL_SPACE_FALLBACK.logo_alt;
		header_logo.hidden = false;
	} else if (organization_logo_url) {
		header_logo.onerror = function() {
			clear_header_logo();
		};
		header_logo.src = organization_logo_url;
		header_logo.alt = organization_name || "Organization logo";
		header_logo.hidden = false;
	} else {
		clear_header_logo();
	}

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
			step_comp = create_step_component(step_item, url_dict, index);
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
		if (!checklist_mode) {
			document.querySelector("#finish_button_other").style.display = "block"
		}

	}

	Object.entries(url_dict).forEach(function(url_item) {
		preload_image = new Image()
		preload_image.src = url_item[1].url
	})





	}

function get_checklist(token) {
	checklist_mode = true;
	checklist_token = token;
	set_checklist_save_status("");

	fetch(OPUS_GUIDE_API_BASE + "/get_checklist/" + token, {credentials:"include"})
		.then(function(response) {
			if (!response.ok) {
				throw new Error("Checklist could not be loaded");
			}
			return parse_json_response(response);
		})
		.then(function(data) {
			if (data && data["assignment"] && data["instruction"]) {
				set_checklist_assignment(data["assignment"]);
				set_data(data);
				update_checklist_ui_state();
			} else {
				show_checklist_not_found("Page not found");
			}
		})
		.catch(function(error) {
			console.error(error);
			show_checklist_not_found("Page not found");
		});
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
