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

		//todo evaluate if really neccessary to delete all conversations first
		d3.select(svg).select(".path").selectAll("path").remove();
		d3.select(svg).select(".endpoints").selectAll("rect").remove();

		// var callout = d3.select(svg)
		// 	.select("circle.callout")
		// 	.transition()
		// 	.duration(250)
		// 	.ease("cubic-out");

		if (protocol && protocol.conversation.length > 0) {
			// Draw a circle for each connection
			var posIdx = -1;
			var updatePositions = function(group) {
				group.attr("id", function(pos) {
					return pos.hasOwnProperty("idx") ? pos.idx : -1;
				})
					.attr("x", function(pos) {
					return pos.x;
				})
					.attr("y", function(pos) {
					return pos.y;
				})
					.attr("class", function(pos) {
					return "pos";
				})
					.style('opacity', function(pos) {
					return 1;
				});
			};

			var protocolPoints = [];
			for (var i = 0; i < protocol.conversation.length; i++) {
				var conn = protocol.conversation[i];
				if (i === 0)
					protocolPoints.push(conn.from);
				protocolPoints.push(_.extend(conn.to, {
					idx: conn.idx
				}));
			}

			var endpoints = d3.select(svg)
				.select(".endpoints")
				.selectAll("endpoints")
				.data(protocolPoints, function(conn) {
				return conn.idx;
			});

			updatePositions(endpoints.enter().append("svg:rect")
				.attr("width", function(d, i) {
				return 100;
			})
				.attr("height", function(d, i) {
				return 40;
			}));


			// updatePositions(connections.transition().duration(250).ease("cubic-out"));
			// connections.exit().transition().duration(250).attr("r", 0).remove();

			//Draw a conversation
			var updatePath = function(group) {
				var line = d3.svg.line()
					.x(function(d) {
					return d.x + 50;
				})
					.y(function(d) {
					return d.y + 25;
				})
					.interpolate("linear");

				group.attr("d", function(d) {
					return line(d);
				});
			};

			var protocolConversation = [];
			var currentEndPos;
			protocol.conversation.forEach(function(conn) {
				var conversationPoints = [conn.from, conn.to];
				currentEndPos = _.extend(conn.to, {
					idx: conn.idx
				});
				protocolConversation.push(conversationPoints);
			});

			//selection based last tmp connection
			// if(currentPos) {
			//   protocolConversation.push([currentEndPos, currentPos]);
			// }

			var path = d3.select(svg)
				.select(".flow")
				.selectAll("flow")
				.data(protocolConversation);

			updatePath(path.enter().append("svg:path"));
			path.exit();

			// Draw a dashed circle around the currently selected pos, if any, or at the end pos
			// var calloutX, calloutY;
			// if(protocol.conversation[selectedPos]) {
			//   calloutX = protocol.conversation[selectedPos].to.x;
			//   calloutY = protocol.conversation[selectedPos].to.y;
			// } else {
			//   calloutX = currentEndPos.x;
			//   calloutY = currentEndPos.y;
			//   Session.set("selectedPos", currentEndPos.idx);
			// }

			// callout.attr("cx", calloutX)
			// .attr("cy", calloutY)
			// .attr("r", 20)
			// .attr("class", "callout")
			// .attr("display", '');
		} else
			callout.attr("display", 'none');
	});
};