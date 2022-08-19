

function set_data(data) {
	console.log(data);
	document.title = data["name"];
	header_name = document.querySelector(".header_text");
	header_name.innerText = data["name"];

}




function get_role_folder(link_uid) {
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