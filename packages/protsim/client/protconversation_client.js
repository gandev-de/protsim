Template.protconversation.helpers({
	protocol: function() {
		return Protdef.findOne({
			_id: Session.get("protocol_selected")
		});
	}
});

Template.protconversation.rendered = function() {
	var svg = this.find("svg");

	console.log("protconversation rendered");

	Deps.autorun(function() {
		var protocol = Protdef.findOne({
			_id: Session.get("protocol_selected")
		});

		if (protocol && protocol.conversation.length > 0) {
			var markerWidth = 6,
			    markerHeight = 6,
			    cRadius = 30, // play with the cRadius value
			    refX = cRadius + (markerWidth * 2),
			    refY = -Math.sqrt(cRadius),
			    drSub = cRadius + refY;

			var participants = [
				{name: "Initiator", x: 5, y: 5}, 
				{name: "Receiver", x: 300, y: 5}
			];

			//rect participants
			svg.append("svg:g").selectAll("test").data(participants).enter().append("svg:rect")
			    .attr("x", function(d) { return d.x;})
			    .attr("y", function(d) { return d.y;})
			    .attr("height", function() { return 50;})
			    .attr("width", function() { return 100;})

			//text participants
			var text = svg.append("svg:g").selectAll("g")
			    .data(participants)
			    .enter().append("svg:text").attr("x", function(d) { return d.x + 20; })
			    .attr("y", function(d) { return d.y + 30; })
			    .attr("fill", "white")
			    .text(function (d) {return d.name;});

			//horizontal lines for endpoints
			var lines = svg.append("svg:g")
			          .selectAll("lines")
			          .data(participants)
			          .enter()
			          .append("svg:line")
			          .attr("x1", function(d) {return d.x + 50;})
			          .attr("y1", function(d) {return d.y + 50;})
			          .attr("x2", function(d) {return d.x + 50;})
			          .attr("y2", function(d) {return d.y + 500;})
			          .attr("style", "stroke-dasharray: 9, 5;stroke: blue; stroke-width: 3");

			//path between participants

			// Per-type markers, as they don't inherit styles.
			svg.append("svg:defs").selectAll("marker")
			.data(["send", "receive"])
			.enter().append("svg:marker")
			.attr("id", String)
			.attr("viewBox", "0 -5 10 10")
			.attr("markerWidth", markerWidth)
			.attr("markerHeight", markerHeight)
			.attr("orient", "auto")
			.append("svg:path")
			.attr("d", "M0,-5L10,0L0,5")
			.attr("style", "fill: red;");

			//add conversation path
			var path_y_offset = 0;
			var path = svg.append("svg:g").selectAll("path")
			.data(protocol.conversation)
			.enter()
			.append("svg:path")
			.attr("class", function (d) {return "link " + d.type;})
			.attr("marker-end", function (d) {return "url(#" + d.type + ")";})
			.attr("d", function(d) {
			    var y = 100 + path_y_offset;
			    path_y_offset += 20;
			    
			    if(d.type == "send") {
			        return "M 55 " + y + " L 340 " + y;
			    } else {
			        return "M 350 " + y + " L 65 " + y;
			}})
			.attr("style", 'stroke:red; stroke-width: 2; fill: none');

			//text telegram name
			var path_text_y_offset = 0;			
			var text = svg.append("svg:g").selectAll("g")
			    .data(protocol.conversation)
			    .enter()
			    .append("svg:text")
			    .attr("x", function(d) {
			    	return 150; //TODO calculate
			 	})
			    .attr("y", function(d) {
			    	var y = 100 + path_text_y_offset;			    	
			    	path_text_y_offset += 15;
			    	return y; })
			    .attr("fill", "white")
			    .text(function (d) { return d.telegram.name; });			
		}
	});
};